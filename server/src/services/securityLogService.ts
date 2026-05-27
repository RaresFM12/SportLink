import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { SessionUser } from './authService.js';
import { anomalyDetectionService, type BehaviourFeatures } from './anomalyDetectionService.js';

type LogActionInput = {
  req: Request;
  user: SessionUser;
  statusCode: number;
  actionInformation?: string;
};

const HIGH_FREQUENCY_WINDOW_MS = 60 * 1000;
const REPEATED_FORBIDDEN_WINDOW_MS = 10 * 60 * 1000;
const HIGH_FREQUENCY_THRESHOLD = 30;
const REPEATED_FORBIDDEN_THRESHOLD = 3;
const FAILED_AUTH_THRESHOLD = 3;

function buildActionInformation(req: Request, explicit?: string): string {
  if (explicit) return explicit;

  if (req.path === '/graphql') {
    const body = req.body as { operationName?: string; query?: string } | undefined;
    if (body?.operationName) return `GraphQL ${body.operationName}`;
    const operation = body?.query?.match(/\b(query|mutation)\s+([A-Za-z0-9_]+)/);
    if (operation) return `GraphQL ${operation[1]} ${operation[2]}`;
    return 'GraphQL operation';
  }

  return `${req.method} ${req.originalUrl}`;
}

function getClientIp(req: Request): string | undefined {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0]?.trim();
  }
  return req.ip;
}

async function placeUnderObservation(
  user: SessionUser,
  reason: string,
  lastActionInfo: string,
  scoreIncrease: number
): Promise<void> {
  await prisma.observationUser.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      groupId: user.role,
      reason,
      suspicionScore: scoreIncrease,
      lastActionInfo,
      lastActionAt: new Date(),
    },
    update: {
      groupId: user.role,
      reason,
      suspicionScore: { increment: scoreIncrease },
      lastActionInfo,
      lastActionAt: new Date(),
    },
  });
}

async function detectSuspiciousBehaviour(user: SessionUser, actionInfo: string, statusCode: number): Promise<void> {
  const now = Date.now();
  const highFrequencySince = new Date(now - HIGH_FREQUENCY_WINDOW_MS);
  const forbiddenSince = new Date(now - REPEATED_FORBIDDEN_WINDOW_MS);

  if (statusCode === 403) {
    await placeUnderObservation(
      user,
      'Repeated or forbidden permission attempt',
      actionInfo,
      3
    );
  }

  const [recentActionCount, recentForbiddenCount, failedAuthCount, recentPaths] = await Promise.all([
    prisma.actionLog.count({
      where: {
        userId: user.id,
        createdAt: { gte: highFrequencySince },
      },
    }),
    prisma.actionLog.count({
      where: {
        userId: user.id,
        statusCode: 403,
        createdAt: { gte: forbiddenSince },
      },
    }),
    prisma.actionLog.count({
      where: {
        userId: user.id,
        statusCode: { in: [401, 403] },
        createdAt: { gte: forbiddenSince },
      },
    }),
    prisma.actionLog.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: highFrequencySince },
      },
      select: { path: true },
      distinct: ['path'],
    }),
  ]);

  const features: BehaviourFeatures = {
    recentActionCount,
    recentForbiddenCount,
    failedAuthCount,
    distinctPathCount: recentPaths.length,
    statusCode,
  };
  const prediction = anomalyDetectionService.predict(features);

  if (prediction.label !== 'normal') {
    await placeUnderObservation(
      user,
      `AI ${prediction.label} (${prediction.score}): ${prediction.reasons.join(', ')}`,
      actionInfo,
      prediction.label === 'critical' ? 8 : 4
    );
  }

  if (recentActionCount >= HIGH_FREQUENCY_THRESHOLD) {
    await placeUnderObservation(
      user,
      `High request frequency: ${recentActionCount} actions in 60 seconds`,
      actionInfo,
      2
    );
  }

  if (recentForbiddenCount >= REPEATED_FORBIDDEN_THRESHOLD) {
    await placeUnderObservation(
      user,
      `Repeated forbidden actions: ${recentForbiddenCount} denied attempts in 10 minutes`,
      actionInfo,
      5
    );
  }

  if (failedAuthCount >= FAILED_AUTH_THRESHOLD) {
    await placeUnderObservation(
      user,
      `AI detected repeated authentication/authorization failures: ${failedAuthCount} in 10 minutes`,
      actionInfo,
      5
    );
  }
}

export const securityLogService = {
  async logAction({ req, user, statusCode, actionInformation }: LogActionInput): Promise<void> {
    const actionInfo = buildActionInformation(req, actionInformation);

    await prisma.actionLog.create({
      data: {
        userId: user.id,
        groupId: user.role,
        actionInformation: actionInfo,
        method: req.method,
        path: req.originalUrl,
        statusCode,
        ipAddress: getClientIp(req),
        userAgent: req.get('user-agent'),
        metadata: {
          params: req.params,
          query: req.query,
        },
      },
    });

    await detectSuspiciousBehaviour(user, actionInfo, statusCode);
  },

  async getAiStatus() {
    const now = Date.now();
    const since = new Date(now - HIGH_FREQUENCY_WINDOW_MS);
    const [actionsLastMinute, usersUnderObservation, latestObservation] = await Promise.all([
      prisma.actionLog.count({ where: { createdAt: { gte: since } } }),
      prisma.observationUser.count(),
      prisma.observationUser.findFirst({
        orderBy: { lastActionAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, displayName: true } },
        },
      }),
    ]);

    return {
      model: 'sportlink-local-anomaly-v1',
      status: 'active',
      actionsLastMinute,
      usersUnderObservation,
      latestObservation,
    };
  },

  async markSuspicious(user: SessionUser, reason: string, actionInformation: string): Promise<void> {
    await placeUnderObservation(user, reason, actionInformation, 4);
  },

  async logUserAction(
    user: SessionUser,
    actionInformation: string,
    metadata?: Prisma.InputJsonObject
  ): Promise<void> {
    await prisma.actionLog.create({
      data: {
        userId: user.id,
        groupId: user.role,
        actionInformation,
        method: 'WEBSOCKET',
        path: '/ws/chat',
        statusCode: 200,
        metadata,
      },
    });

    await detectSuspiciousBehaviour(user, actionInformation, 200);
  },

  async listObservationUsers() {
    return prisma.observationUser.findMany({
      orderBy: [{ suspicionScore: 'desc' }, { lastActionAt: 'desc' }],
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
  },

  async listRecentLogs(limit = 100) {
    return prisma.actionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });
  },
};
