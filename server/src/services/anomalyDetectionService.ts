import type { Prisma } from '@prisma/client';

export type BehaviourFeatures = {
  recentActionCount: number;
  recentForbiddenCount: number;
  failedAuthCount: number;
  distinctPathCount: number;
  statusCode: number;
};

export type AnomalyPrediction = {
  score: number;
  label: 'normal' | 'suspicious' | 'critical';
  reasons: string[];
};

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

export const anomalyDetectionService = {
  predict(features: BehaviourFeatures): AnomalyPrediction {
    const weighted =
      -3.2 +
      features.recentActionCount * 0.075 +
      features.recentForbiddenCount * 0.9 +
      features.failedAuthCount * 0.55 +
      features.distinctPathCount * 0.18 +
      (features.statusCode === 403 ? 1.2 : 0) +
      (features.statusCode >= 500 ? 0.8 : 0);

    const score = Number(sigmoid(weighted).toFixed(3));
    const reasons: string[] = [];

    if (features.recentActionCount >= 30) reasons.push('high request frequency');
    if (features.recentForbiddenCount >= 2) reasons.push('repeated forbidden actions');
    if (features.failedAuthCount >= 3) reasons.push('repeated failed authentication');
    if (features.distinctPathCount >= 8) reasons.push('broad endpoint probing');
    if (features.statusCode === 403) reasons.push('permission boundary probing');

    return {
      score,
      label: score >= 0.85 ? 'critical' : score >= 0.6 ? 'suspicious' : 'normal',
      reasons: reasons.length ? reasons : ['baseline behaviour'],
    };
  },

  toMetadata(features: BehaviourFeatures, prediction: AnomalyPrediction): Prisma.InputJsonObject {
    return {
      model: 'sportlink-local-anomaly-v1',
      features,
      prediction,
    };
  },
};
