-- =========================
-- TOY SEED DATA
-- =========================

insert into classes (class_name)
values ('Test Class')
on conflict (class_name) do nothing;

-- Teacher
insert into students (
  username,
  display_name,
  password,
  must_reset_password,
  role,
  class_id
)
select
  'teacher1',
  'Test Teacher',
  crypt('teach123', gen_salt('bf')),
  false,
  'teacher',
  null
where not exists (
  select 1 from students where username = 'teacher1'
);

-- Students
insert into students (
  username,
  display_name,
  password,
  must_reset_password,
  role,
  class_id
)
select
  'alice1',
  'Alice E.',
  crypt('math123', gen_salt('bf')),
  true,
  'student',
  c.id
from classes c
where c.class_name = 'Test Class'
  and not exists (
    select 1 from students where username = 'alice1'
  );

insert into students (
  username,
  display_name,
  password,
  must_reset_password,
  role,
  class_id
)
select
  'bobby1',
  'Bobby E.',
  crypt('math123', gen_salt('bf')),
  true,
  'student',
  c.id
from classes c
where c.class_name = 'Test Class'
  and not exists (
    select 1 from students where username = 'bobby1'
  );

-- Curriculum
insert into class_curriculum (class_id, category)
select c.id, 'addition'
from classes c
where c.class_name = 'Test Class'
on conflict do nothing;

insert into class_curriculum (class_id, category)
select c.id, 'median'
from classes c
where c.class_name = 'Test Class'
on conflict do nothing;

-- Questions
insert into math_tasks (question, expected_answer, category)
select *
from (
  values
    ('1 + 1', '2', 'addition'),
    ('2 + 3', '5', 'addition'),
    ('4, 1, 7', '4', 'median'),
    ('3, 9, 2, 8', '5.5', 'median')
) as v(question, expected_answer, category)
where not exists (
  select 1
  from math_tasks mt
  where mt.question = v.question
    and mt.category = v.category
);