-- 1. The Question Bank
CREATE TABLE math_tasks (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  category TEXT NOT NULL
);

-- 2. NEW: Students Table (FERPA-friendly)
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