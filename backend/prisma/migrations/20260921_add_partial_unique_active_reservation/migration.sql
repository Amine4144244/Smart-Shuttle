-- Create partial unique index on active reservations (excluding cancelled/rejected/no_show)
CREATE UNIQUE INDEX IF NOT EXISTS "unique_active_event_participant" 
ON "reservations"("eventId", "participantId") 
WHERE "status" NOT IN ('CANCELLED', 'REJECTED', 'NO_SHOW');
