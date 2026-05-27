-- Gold Challenge: persistent action logging and admin observation list.
CREATE TABLE "ActionLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "actionInformation" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ObservationUser" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "suspicionScore" INTEGER NOT NULL DEFAULT 0,
    "lastActionInfo" TEXT NOT NULL,
    "lastActionAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObservationUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ObservationUser_userId_key" ON "ObservationUser"("userId");
CREATE INDEX "ActionLog_userId_createdAt_idx" ON "ActionLog"("userId", "createdAt");
CREATE INDEX "ActionLog_groupId_createdAt_idx" ON "ActionLog"("groupId", "createdAt");
CREATE INDEX "ActionLog_statusCode_createdAt_idx" ON "ActionLog"("statusCode", "createdAt");
CREATE INDEX "ObservationUser_groupId_idx" ON "ObservationUser"("groupId");
CREATE INDEX "ObservationUser_suspicionScore_idx" ON "ObservationUser"("suspicionScore");
CREATE INDEX "ObservationUser_lastActionAt_idx" ON "ObservationUser"("lastActionAt");

ALTER TABLE "ActionLog"
ADD CONSTRAINT "ActionLog_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ObservationUser"
ADD CONSTRAINT "ObservationUser_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
