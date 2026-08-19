-- Partial unique index: a user can have at most one open (not checked-out) attendance record
-- at a time. Prevents a race condition (double-click / two tabs) from creating two active
-- check-in records for the same user simultaneously.
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_open_user_idx" ON "Attendance"("userId") WHERE "checkOutAt" IS NULL;
