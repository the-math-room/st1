-- =========================
-- AUTH + STUDENT FUNCTIONS
-- =========================

-- LOGIN
create or replace function public.secure_login(
  input_username text,
  input_password text
)
returns table (
  id int,
  username text,
  display_name text,
  must_reset boolean,
  class_id int,
  role text
)
language plpgsql
security definer
as $$
begin
  return query
  select
    s.id,
    s.username,
    s.display_name,
    s.must_reset_password,
    s.class_id,
    s.role
  from students s
  where s.username = input_username
    and s.password = crypt(input_password, s.password);
end;
$$;

grant execute on function public.secure_login(text, text) to anon;

-- FORCE-FIRST-LOGIN PASSWORD SET
create or replace function public.set_student_password(
  input_username text,
  new_password text
)
returns boolean
language plpgsql
security definer
as $$
begin
  update students
  set password = crypt(new_password, gen_salt('bf')),
      must_reset_password = false
  where username = input_username
    and must_reset_password = true;

  return found;
end;
$$;

grant execute on function public.set_student_password(text, text) to anon;

-- STUDENT CURRICULUM + MASTERY
create or replace function public.get_student_curriculum(
  input_student_id int,
  input_class_id int
)
returns table (
  category text,
  mastery_score double precision
)
language sql
security definer
as $$
  with assigned_categories as (
    select cc.category
    from class_curriculum cc
    where cc.class_id = input_class_id
  )
  select
    ac.category,
    coalesce(sm.mastery_score, 0.0) as mastery_score
  from assigned_categories ac
  left join student_mastery sm
    on sm.student_id = input_student_id
   and sm.category = ac.category
  order by ac.category;
$$;

grant execute on function public.get_student_curriculum(int, int) to anon;

-- RANDOM QUESTION
create or replace function public.get_random_question_for_categories(
  selected_categories text[]
)
returns table (
  id int,
  question text,
  expected_answer text,
  category text
)
language sql
security definer
as $$
  select
    mt.id,
    mt.question,
    mt.expected_answer,
    mt.category
  from math_tasks mt
  where mt.category = any(selected_categories)
  order by random()
  limit 1;
$$;

grant execute on function public.get_random_question_for_categories(text[]) to anon;

-- CHECK ANSWER + UPDATE MASTERY
create or replace function public.check_math_answer(
  question_id int,
  user_guess text,
  input_student_id int,
  input_used_help boolean default false
)
returns table (is_correct boolean, new_score float)
language plpgsql
security definer
as $$
declare
  v_category text;
  v_is_right boolean;
  v_performance float;
  v_old_score float;
  v_new_score float;
  v_alpha float := 0.125;
begin
  select (mt.expected_answer = user_guess), mt.category
  into v_is_right, v_category
  from math_tasks mt
  where mt.id = question_id;

  if v_is_right and input_used_help then
    v_performance := 0.5;
  elsif v_is_right then
    v_performance := 1.0;
  else
    v_performance := 0.0;
  end if;

  insert into student_mastery (student_id, category, mastery_score)
  values (input_student_id, v_category, 0.0)
  on conflict (student_id, category) do nothing;

  select sm.mastery_score
  into v_old_score
  from student_mastery sm
  where sm.student_id = input_student_id
    and sm.category = v_category;

  v_new_score := (v_alpha * v_performance) + ((1.0 - v_alpha) * v_old_score);

  update student_mastery
  set mastery_score = v_new_score
  where student_id = input_student_id
    and category = v_category;

  insert into math_attempts (task_id, student_id, user_response, is_correct)
  values (
    question_id,
    input_student_id,
    user_guess || case when input_used_help then ' (HELPED)' else '' end,
    v_is_right
  );

  return query
  select v_is_right, v_new_score;
end;
$$;

grant execute on function public.check_math_answer(int, text, int, boolean) to anon;