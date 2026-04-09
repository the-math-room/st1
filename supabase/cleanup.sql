-- =========================
-- CLEANUP OF DEAD / LEGACY SQL
-- =========================

drop function if exists public.check_math_answer(integer, text);
drop function if exists public.check_math_answer(integer, text, integer);

drop function if exists public.record_and_smooth(uuid, integer, text);
drop function if exists public.reset_attendance();

drop policy if exists "Public Read Tasks" on math_tasks;
drop policy if exists "Allow public to view attempts" on math_attempts;
drop policy if exists "Public Read Attempts" on math_attempts;
drop policy if exists "Allow public to view mastery" on student_mastery;
drop policy if exists "Public Read Mastery" on student_mastery;
drop policy if exists "Allow public to search students" on students;
drop policy if exists "Public Read Students" on students;