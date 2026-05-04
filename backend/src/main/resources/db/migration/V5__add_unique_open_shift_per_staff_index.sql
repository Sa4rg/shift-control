CREATE UNIQUE INDEX shifts_one_open_shift_per_staff
ON shifts (staff_id)
WHERE status = 'OPEN';