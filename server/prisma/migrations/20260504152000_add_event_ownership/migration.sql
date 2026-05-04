ALTER TABLE "Event" ADD COLUMN "createdByUserId" INTEGER;

CREATE INDEX "Event_createdByUserId_idx" ON "Event"("createdByUserId");

ALTER TABLE "Event"
ADD CONSTRAINT "Event_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."name" = 'USER'
  AND p."action" IN ('event:update', 'event:delete')
ON CONFLICT DO NOTHING;
