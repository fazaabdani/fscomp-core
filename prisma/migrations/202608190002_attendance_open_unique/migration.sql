-- Partial unique index: a user can have at most one open (not checked-out) attendance record
-- per calendar day (Asia/Jakarta). Prevents a race condition (double-click / two tabs) from
-- creating two active check-in records for the same user on the same day.
--
-- Scoped per-day (not globally) because staff routinely leave a check-in open across many past
-- days without ever using the checkout button -- that is expected, pre-existing data, not a bug.
-- "checkInAt"/"checkOutAt" are stored as naive `timestamp` columns holding UTC instants, so the
-- Jakarta calendar day requires tagging the value as UTC first before shifting to Asia/Jakarta.
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_open_user_day_idx"
  ON "Attendance" ("userId", ((("checkInAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta')::date))
  WHERE "checkOutAt" IS NULL;
