UPDATE "Event"
SET "createdByUserId" = (SELECT "id" FROM "User" WHERE "username" = 'rares')
WHERE "title" = 'Football Meetup'
  AND "createdByUserId" IS NULL;

UPDATE "Event"
SET "createdByUserId" = (SELECT "id" FROM "User" WHERE "username" = 'alex')
WHERE "title" = 'Basketball Session'
  AND "createdByUserId" IS NULL;
