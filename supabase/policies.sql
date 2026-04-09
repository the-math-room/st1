-- =========================
-- POLICIES
-- Option 1: practical current-architecture setup
-- Keep direct table reads mostly closed.
-- App should use RPCs for data access.
-- =========================

-- Clear out old duplicate / permissive policies if present
drop policy if exists "Enable read access for all users" on class_curriculum;
drop policy if exists "Enable read access for all users" on classes;
drop policy if exists "Enable read for all" on math_tasks;
drop policy if exists "Public Read Tasks" on math_tasks;
drop policy if exists "Allow public to view attempts" on math_attempts;
drop policy if exists "Enable insert for attempts" on math_attempts;
drop policy if exists "Public Read Attempts" on math_attempts;
drop policy if exists "Allow public to view mastery" on student_mastery;
drop policy if exists "Enable read for mastery" on student_mastery;
drop policy if exists "Public Read Mastery" on student_mastery;
drop policy if exists "Allow public to search students" on students;
drop policy if exists "Public Read Students" on students;

-- No broad direct-read policies needed for the main app flow,
-- because reads/writes now go through SECURITY DEFINER RPCs.

-- If you ever decide the browser needs direct table reads again,
-- add narrowly scoped policies here on purpose.