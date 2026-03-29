INSERT INTO math_tasks (question, expected_answer, category) VALUES 
('1 + 1', '2', 'addition'),
('1 + 2', '3', 'addition'),
('1 - 1', '0', 'subtraction'),
('2 - 1', '1', 'subtraction');

INSERT INTO math_tasks (question, expected_answer, category) VALUES 
('4, 1, 7', '4', 'median'),
('10, 2, 5, 8, 1', '5', 'median'),
('3, 9, 2, 8', '5.5', 'median'),
('12, 15, 12, 18, 20, 25', '16.5', 'median');

INSERT INTO students (username, display_name, password) VALUES 
('johnd', 'John D.', 'math123'),
('johns', 'John S.', 'math123');