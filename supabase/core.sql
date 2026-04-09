-- =========================
-- CORE DB STRUCTURE
-- Extensions, tables, indexes, and RLS
-- =========================

create extension if not exists pgcrypto;

-- =========================
-- TABLES
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
  category text not null,
  mastery_score double precision default 0.0,
  primary key (student_id, category)
);

-- =========================
-- INDEXES
-- =========================

create index if not exists idx_attempts_student_category
on math_attempts (student_id);

create index if not exists idx_mastery_lookup
on student_mastery (student_id, category);

-- =========================
-- RLS
-- =========================

alter table students enable row level security;
alter table math_tasks enable row level security;
alter table math_attempts enable row level security;
alter table student_mastery enable row level security;
alter table classes enable row level security;
alter table class_curriculum enable row level security;