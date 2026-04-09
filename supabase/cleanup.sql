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

-- ======================

revoke execute on function public.admin_get_classes() from anon;
revoke execute on function public.admin_get_students() from anon;
revoke execute on function public.admin_add_student(text, text, text, int) from anon;
revoke execute on function public.admin_bulk_add_students(jsonb) from anon;
revoke execute on function public.admin_trigger_reset(text, text) from anon;

grant execute on function public.admin_get_classes() to authenticated;
grant execute on function public.admin_get_students() to authenticated;
grant execute on function public.admin_add_student(text, text, text, int) to authenticated;
grant execute on function public.admin_bulk_add_students(jsonb) to authenticated;
grant execute on function public.admin_trigger_reset(text, text) to authenticated;