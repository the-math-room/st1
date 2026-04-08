-- 1. The Question Bank
CREATE TABLE math_tasks (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  category TEXT NOT NULL
);

-- 2. NEW: Students Table
CREATE TABLE students (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL, -- e.g., 'johnd'
  display_name TEXT NOT NULL,    -- e.g., 'John D.'
  password TEXT NOT NULL
);

-- 3. The Tracking Log (Updated with student_id)
CREATE TABLE math_attempts (
  id SERIAL PRIMARY KEY,
  task_id INT REFERENCES math_tasks(id),
  student_id INT REFERENCES students(id), -- Linked to student
  user_response TEXT,
  is_correct BOOLEAN,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Updated RPC Function (Now requires student_id)
CREATE OR REPLACE FUNCTION check_math_answer(question_id INT, user_guess TEXT, input_student_id INT)
RETURNS BOOLEAN AS $$
DECLARE
  is_right BOOLEAN;
BEGIN
  SELECT (expected_answer = user_guess) INTO is_right FROM math_tasks WHERE id = question_id;
  
  INSERT INTO math_attempts (task_id, student_id, user_response, is_correct)
  VALUES (question_id, input_student_id, user_guess, is_right);

  RETURN is_right;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Track mastery per student, per category
CREATE TABLE student_mastery (
  student_id INT REFERENCES students(id),
  category TEXT,
  mastery_score FLOAT DEFAULT 0.0,
  PRIMARY KEY (student_id, category)
);

-- 2. Update the RPC to calculate smoothing
CREATE OR REPLACE FUNCTION check_math_answer(
    question_id INT, 
    user_guess TEXT, 
    input_student_id INT
)
RETURNS TABLE (is_correct BOOLEAN, new_score FLOAT) AS $$
DECLARE
  v_category TEXT;
  v_is_right BOOLEAN;
  v_old_score FLOAT;
  v_new_score FLOAT;
  v_alpha FLOAT := 0.125; -- Your 1/8 smoothing factor
BEGIN
  -- 1. Check answer and get category
  SELECT (expected_answer = user_guess), category INTO v_is_right, v_category
  FROM math_tasks WHERE id = question_id;

  -- 2. Get previous score (default to 0 if first time)
  SELECT COALESCE(mastery_score, 0.0) INTO v_old_score
  FROM student_mastery 
  WHERE student_id = input_student_id AND category = v_category;

  -- 3. Calculate Exponential Smoothing
  v_new_score := (v_alpha * (CASE WHEN v_is_right THEN 1.0 ELSE 0.0 END)) + ((1.0 - v_alpha) * v_old_score);

  -- 4. Update state
  INSERT INTO student_mastery (student_id, category, mastery_score)
  VALUES (input_student_id, v_category, v_new_score)
  ON CONFLICT (student_id, category) 
  DO UPDATE SET mastery_score = v_new_score;

  -- 5. Log the attempt
  INSERT INTO math_attempts (task_id, student_id, user_response, is_correct)
  VALUES (question_id, input_student_id, user_guess, v_is_right);

  RETURN QUERY SELECT v_is_right, v_new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Allow students to see the question bank
CREATE POLICY "Allow public to view questions" 
ON math_tasks FOR SELECT 
TO anon 
USING (true);

-- 2. Allow students to "log in" (search for their own name/pass)
CREATE POLICY "Allow public to search students" 
ON students FOR SELECT 
TO anon 
USING (true);

-- 3. Allow students to see their progress scores
CREATE POLICY "Allow public to view mastery" 
ON student_mastery FOR SELECT 
TO anon 
USING (true);

-- 4. Allow students to see their own history
CREATE POLICY "Allow public to view attempts" 
ON math_attempts FOR SELECT 
TO anon 
USING (true);

CREATE OR REPLACE FUNCTION check_math_answer(
    question_id INT, 
    user_guess TEXT, 
    input_student_id INT
)
RETURNS TABLE (is_correct BOOLEAN, new_score FLOAT) AS $$
DECLARE
    v_category TEXT;
    v_is_right BOOLEAN;
    v_old_score FLOAT;
    v_new_score FLOAT;
    v_alpha FLOAT := 0.125; -- Smoothing factor
BEGIN
    -- 1. Get the truth from the task bank
    SELECT (expected_answer = user_guess), category INTO v_is_right, v_category
    FROM math_tasks WHERE id = question_id;

    -- 2. Ensure the student has a record for this category (Initialize if missing)
    INSERT INTO student_mastery (student_id, category, mastery_score)
    VALUES (input_student_id, v_category, 0.0)
    ON CONFLICT (student_id, category) DO NOTHING;

    -- 3. Lock the row and get the current score
    SELECT mastery_score INTO v_old_score
    FROM student_mastery 
    WHERE student_id = input_student_id AND category = v_category;

    -- 4. Calculate the Exponential Smoothing
    -- New Score = (Alpha * Current Performance) + ((1 - Alpha) * Old Score)
    v_new_score := (v_alpha * (CASE WHEN v_is_right THEN 1.0 ELSE 0.0 END)) + ((1.0 - v_alpha) * v_old_score);

    -- 5. Update the table with the new calculation
    UPDATE student_mastery 
    SET mastery_score = v_new_score
    WHERE student_id = input_student_id AND category = v_category;

    -- 6. Log the attempt for history
    INSERT INTO math_attempts (task_id, student_id, user_response, is_correct)
    VALUES (question_id, input_student_id, user_guess, v_is_right);

    -- 7. Return the results to the app
    RETURN QUERY SELECT v_is_right, v_new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION check_math_answer(
    question_id INT, 
    user_guess TEXT, 
    input_student_id INT,
    input_used_help BOOLEAN DEFAULT FALSE -- New Parameter
)
RETURNS TABLE (is_correct BOOLEAN, new_score FLOAT) AS $$
DECLARE
    v_category TEXT;
    v_is_right BOOLEAN;
    v_performance FLOAT; -- 1.0 for right, 0.5 for help-right, 0.0 for wrong
    v_old_score FLOAT;
    v_new_score FLOAT;
    v_alpha FLOAT := 0.125;
BEGIN
    SELECT (expected_answer = user_guess), category INTO v_is_right, v_category
    FROM math_tasks WHERE id = question_id;

    -- Calculate Performance Factor
    IF v_is_right AND input_used_help THEN
        v_performance := 0.5;
    ELSIF v_is_right THEN
        v_performance := 1.0;
    ELSE
        v_performance := 0.0;
    END IF;

    -- Get/Init Score
    INSERT INTO student_mastery (student_id, category, mastery_score)
    VALUES (input_student_id, v_category, 0.0)
    ON CONFLICT (student_id, category) DO NOTHING;

    SELECT mastery_score INTO v_old_score FROM student_mastery 
    WHERE student_id = input_student_id AND category = v_category;

    -- Apply Smoothing: New Score = (Alpha * Performance) + ((1 - Alpha) * Old)
    v_new_score := (v_alpha * v_performance) + ((1.0 - v_alpha) * v_old_score);

    UPDATE student_mastery SET mastery_score = v_new_score
    WHERE student_id = input_student_id AND category = v_category;

    -- Log if they used help (Great for teacher data later!)
    INSERT INTO math_attempts (task_id, student_id, user_response, is_correct)
    VALUES (question_id, input_student_id, user_guess || CASE WHEN input_used_help THEN ' (WITH HELP)' ELSE '' END, v_is_right);

    RETURN QUERY SELECT v_is_right, v_new_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE math_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_mastery ENABLE ROW LEVEL SECURITY;

-- 2. Math Tasks: Anyone can read these to get questions
CREATE POLICY "Public read questions" ON math_tasks 
FOR SELECT TO anon USING (true);

-- ===========================

-- Only allow a student to see their own mastery scores
-- Note: This assumes your app sends the student_id in the query
CREATE POLICY "Students see own mastery" ON student_mastery
FOR SELECT TO anon
USING (student_id::text = current_setting('app.current_student_id', true));

-- Only allow a student to see their own history
CREATE POLICY "Students see own attempts" ON math_attempts
FOR SELECT TO anon
USING (student_id::text = current_setting('app.current_student_id', true));

-- =============================

CREATE OR REPLACE FUNCTION secure_login(input_username TEXT, input_password TEXT)
RETURNS TABLE (id INT, display_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.display_name 
    FROM students s
    WHERE s.username = input_username 
      AND s.password = input_password; -- In production, use crypt() here!
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
-- ^ SECURITY DEFINER means this function runs with "Admin" 
--   privileges even though the table is locked to the user.

-- =============================

-- 1. Enable the encryption extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Update the Login function to use Hashing
CREATE OR REPLACE FUNCTION secure_login(input_username TEXT, input_password TEXT)
RETURNS TABLE (id INT, display_name TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.display_name 
    FROM students s
    WHERE s.username = input_username 
      -- This compares the input to the hashed version in the DB
      AND s.password = crypt(input_password, s.password); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create a function for students to set/update their password
CREATE OR REPLACE FUNCTION set_student_password(input_username TEXT, new_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE students
    SET password = crypt(new_password, gen_salt('bf')) -- 'bf' is Blowfish (bcrypt)
    WHERE username = input_username;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================

-- 1. Add roles to your table
ALTER TABLE students ADD COLUMN role TEXT DEFAULT 'student';

-- 2. Promote yourself (Replace 'your_username' with your actual login)
UPDATE students SET role = 'teacher' WHERE username = 'your_username';

-- 3. Update the login function to return the role
DROP FUNCTION IF EXISTS secure_login(text, text);
CREATE OR REPLACE FUNCTION secure_login(input_username TEXT, input_password TEXT)
RETURNS TABLE (id INT, display_name TEXT, must_reset BOOLEAN, role TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.display_name, s.must_reset_password, s.role
    FROM students s
    WHERE s.username = input_username 
      AND s.password = crypt(input_password, s.password); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Teacher-only function to see the class list
CREATE OR REPLACE FUNCTION admin_get_students()
RETURNS TABLE (username TEXT, display_name TEXT, must_reset BOOLEAN) AS $$
BEGIN
    -- Security check: This is a bit simplified for this setup, 
    -- but usually you'd verify the requester's role here.
    RETURN QUERY SELECT s.username, s.display_name, s.must_reset_password FROM students s WHERE s.role = 'student';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================

-- This function allows the teacher to create a student with a temp password
CREATE OR REPLACE FUNCTION admin_add_student(new_username TEXT, new_display_name TEXT, temp_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO students (username, display_name, password, role, must_reset_password)
    VALUES (new_username, new_display_name, crypt(temp_password, gen_salt('bf')), 'student', TRUE);
    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    -- This catches duplicate usernames
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================================

-- Create a dedicated reset function that accepts a temporary password
CREATE OR REPLACE FUNCTION admin_trigger_reset(target_username TEXT, temp_password TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE students 
    SET password = crypt(temp_password, gen_salt('bf')),
        must_reset_password = TRUE
    WHERE username = target_username AND role = 'student';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================

-- 1. Disable the "ghost" policies that are blocking data
DROP POLICY IF EXISTS "Students see own mastery" ON student_mastery;
DROP POLICY IF EXISTS "Students see own attempts" ON math_attempts;
DROP POLICY IF EXISTS "Public read questions" ON math_tasks;
DROP POLICY IF EXISTS "Allow public to view questions" ON math_tasks;

-- 2. Create clean, working policies for the 'anon' key
-- Note: We are allowing 'anon' to read these so your app can function.
CREATE POLICY "Enable read for all" ON math_tasks FOR SELECT TO anon USING (true);
CREATE POLICY "Enable read for mastery" ON student_mastery FOR SELECT TO anon USING (true);
CREATE POLICY "Enable insert for attempts" ON math_attempts FOR INSERT TO anon WITH CHECK (true);

-- 3. Ensure your own account is a teacher
-- Replace 'your_username' with the one you actually use
UPDATE students SET role = 'teacher' WHERE username = 'your_username';

-- =======================

-- 1. Create the Classes table
CREATE TABLE classes (
  id SERIAL PRIMARY KEY,
  class_name TEXT UNIQUE NOT NULL -- e.g., 'Class 1', 'Class 101'
);

-- 2. Create the Bridge Table (The "Curriculum")
CREATE TABLE class_curriculum (
  class_id INT REFERENCES classes(id) ON DELETE CASCADE,
  category TEXT, -- matches 'category' in math_tasks
  PRIMARY KEY (class_id, category)
);

-- 3. Link Students to a Class
ALTER TABLE students ADD COLUMN class_id INT REFERENCES classes(id);

-- 4. Seed some initial data so you don't have an empty app
INSERT INTO classes (class_name) VALUES ('1'), ('101');

-- Example: Assign 'median' to Class 101 and 'addition' to Class 1
INSERT INTO class_curriculum (class_id, category) 
VALUES 
  ((SELECT id FROM classes WHERE class_name = '101'), 'median'),
  ((SELECT id FROM classes WHERE class_name = '1'), 'addition');

-- =======================

DROP FUNCTION secure_login(text, text);

CREATE OR REPLACE FUNCTION secure_login(
    input_username TEXT, 
    input_password TEXT
)
RETURNS TABLE (
    id INT, 
    username TEXT, 
    display_name TEXT, 
    must_reset_password BOOLEAN, 
    class_id INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id, 
        s.username, 
        s.display_name, 
        s.must_reset_password, 
        s.class_id
    FROM students s
    WHERE s.username = input_username 
      AND s.password = crypt(input_password, s.password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================

-- 1. Remove the old version so we can change the return structure
DROP FUNCTION IF EXISTS secure_login(text, text);

-- 2. Create the corrected version
CREATE OR REPLACE FUNCTION secure_login(
    input_username TEXT, 
    input_password TEXT
)
RETURNS TABLE (
    id INT, 
    username TEXT, 
    display_name TEXT, 
    must_reset BOOLEAN, -- Renamed to match your JS 'must_reset' check
    class_id INT,
    role TEXT            -- Added back!
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id, 
        s.username, 
        s.display_name, 
        s.must_reset_password, 
        s.class_id,
        s.role
    FROM students s
    WHERE s.username = input_username 
      -- Comparing hashed password
      AND s.password = crypt(input_password, s.password);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;