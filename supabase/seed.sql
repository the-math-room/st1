-- Create a test class
insert into classes (class_name)
values ('Test Class')
on conflict (class_name) do nothing;

-- Create a toy teacher
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

-- Create toy students assigned to Test Class
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
  'Alice Example',
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
  'Bobby Example',
  crypt('math123', gen_salt('bf')),
  true,
  'student',
  c.id
from classes c
where c.class_name = 'Test Class'
  and not exists (
    select 1 from students where username = 'bobby1'
  );

-- Add curriculum for the class
insert into class_curriculum (class_id, category)
select id, 'addition'
from classes
where class_name = 'Test Class'
on conflict do nothing;

insert into class_curriculum (class_id, category)
select id, 'median'
from classes
where class_name = 'Test Class'
on conflict do nothing;

-- Sample questions
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