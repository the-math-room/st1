-- =========================
-- TEACHER / ADMIN FUNCTIONS
-- =========================

create or replace function public.admin_get_classes()
returns table (
  id int,
  class_name text
)
language plpgsql
security definer
as $$
begin
  return query
  select
    c.id,
    c.class_name
  from classes c
  order by c.class_name;
end;
$$;

grant execute on function public.admin_get_classes() to anon;

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
  select
    s.username,
    s.display_name,
    s.must_reset_password,
    c.class_name
  from students s
  left join classes c on s.class_id = c.id
  where coalesce(s.role, 'student') = 'student'
  order by c.class_name asc nulls last, s.display_name asc;
end;
$$;

grant execute on function public.admin_get_students() to anon;

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
  insert into students (
    username,
    display_name,
    password,
    role,
    must_reset_password,
    class_id
  )
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

grant execute on function public.admin_add_student(text, text, text, int) to anon;

create or replace function public.admin_bulk_add_students(
  student_data jsonb
)
returns boolean
language plpgsql
security definer
as $$
begin
  insert into students (
    username,
    display_name,
    password,
    role,
    must_reset_password,
    class_id
  )
  select
    obj->>'username',
    obj->>'display_name',
    crypt(obj->>'password', gen_salt('bf')),
    'student',
    true,
    (obj->>'class_id')::int
  from jsonb_array_elements(student_data) as obj;

  return true;
end;
$$;

grant execute on function public.admin_bulk_add_students(jsonb) to anon;

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

grant execute on function public.admin_trigger_reset(text, text) to anon;