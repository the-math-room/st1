-- =========================
-- 1. EXTENSIONS
-- =========================
create extension if not exists pgcrypto;

-- =========================
-- 2. TABLES
-- =========================

create table if not exists classes (
  id serial primary key,
  class_name text unique not null
);

create table if not exists students (
  id serial primary key,
  username text unique not null,
  display_name text not null,
  password text not null,
  must_reset_password boolean default true,
  role text default 'student',
  class_id integer references classes(id)
);

create table if not exists class_curriculum (
  class_id integer references classes(id) on delete cascade,
  category text not null,
  primary key (class_id, category)
);

create table if not exists math_tasks (
  id serial primary key,
  question text not null,
  expected_answer text not null,
  category text not null
);

create table if not exists math_attempts (
  id serial primary key,
  task_id integer references math_tasks(id),
  student_id integer references students(id),
  user_response text,
  is_correct boolean,
  submitted_at timestamptz default now()
);

create table if not exists student_mastery (
  student_id integer references students(id),
  category text,
  mastery_score double precision default 0.0,
  primary key (student_id, category)
);

-- =========================
-- 3. INDEXES
-- =========================

create index if not exists idx_attempts_student_category
on math_attempts (student_id);

create index if not exists idx_mastery_lookup
on student_mastery (student_id, category);

-- =========================
-- 4. RLS
-- =========================

alter table students enable row level security;
alter table math_tasks enable row level security;
alter table math_attempts enable row level security;
alter table student_mastery enable row level security;
alter table classes enable row level security;
alter table class_curriculum enable row level security;

-- =========================
-- 5. POLICIES (SAFE MVP)
-- =========================

-- Public read for questions & curriculum
create policy "read tasks"
on math_tasks for select to anon using (true);

create policy "read classes"
on classes for select to anon using (true);

create policy "read curriculum"
on class_curriculum for select to anon using (true);

-- Attempts: allow insert only
create policy "insert attempts"
on math_attempts for insert to anon with check (true);

-- Mastery: allow read (needed for current frontend)
create policy "read mastery"
on student_mastery for select to anon using (true);

-- Students: allow lookup for login ONLY (temporary)
create policy "read students for login"
on students for select to anon using (true);

-- =========================
-- 6. FUNCTIONS
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

-- SET PASSWORD
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

-- CHECK ANSWER (FINAL VERSION ONLY)
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
  select (expected_answer = user_guess), category
  into v_is_right, v_category
  from math_tasks
  where id = question_id;

  if v_is_right and input_used_help then
    v_performance := 0.5;
  elsif v_is_right then
    v_performance := 1.0;
  else
    v_performance := 0.0;
  end if;

  insert into student_mastery (student_id, category, mastery_score)
  values (input_student_id, v_category, 0.0)
  on conflict do nothing;

  select mastery_score into v_old_score
  from student_mastery
  where student_id = input_student_id
    and category = v_category;

  v_new_score := (v_alpha * v_performance) + ((1 - v_alpha) * v_old_score);

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

  return query select v_is_right, v_new_score;
end;
$$;

-- =========================
-- ADMIN FUNCTIONS
-- =========================

create or replace function public.admin_get_classes()
returns table (id int, class_name text)
language plpgsql
security definer
as $$
begin
  return query select id, class_name from classes;
end;
$$;

create or replace function public.admin_get_students()
returns table (
  username text,
  display_name text,
  must_reset boolean,
  class_name text
)
language plpgsql
security definer
as $$
begin
  return query
  select s.username, s.display_name, s.must_reset_password, c.class_name
  from students s
  left join classes c on s.class_id = c.id
  where s.role = 'student'
  order by c.class_name, s.display_name;
end;
$$;

create or replace function public.admin_add_student(
  new_username text,
  new_display_name text,
  temp_password text,
  target_class_id int
)
returns boolean
language plpgsql
security definer
as $$
begin
  insert into students (username, display_name, password, role, must_reset_password, class_id)
  values (
    new_username,
    new_display_name,
    crypt(temp_password, gen_salt('bf')),
    'student',
    true,
    target_class_id
  );
  return true;
end;
$$;

create or replace function public.admin_bulk_add_students(student_data jsonb)
returns boolean
language plpgsql
security definer
as $$
begin
  insert into students (username, display_name, password, role, must_reset_password, class_id)
  select
    obj->>'username',
    obj->>'display_name',
    crypt(obj->>'password', gen_salt('bf')),
    'student',
    true,
    (obj->>'class_id')::int
  from jsonb_array_elements(student_data) obj;

  return true;
end;
$$;

create or replace function public.admin_trigger_reset(
  target_username text,
  temp_password text
)
returns boolean
language plpgsql
security definer
as $$
begin
  update students
  set password = crypt(temp_password, gen_salt('bf')),
      must_reset_password = true
  where username = target_username
    and role = 'student';

  return found;
end;
$$;