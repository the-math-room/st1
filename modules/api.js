import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { SUPABASE_CONFIG } from '../config.js';

const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

export const api = {
    async checkAnswer(id, guess, studentId, usedHelp = false) {
        const { data, error } = await supabase.rpc('check_math_answer', {
            question_id: id, 
            user_guess: guess, 
            input_student_id: studentId,
            input_used_help: usedHelp 
        });
        if (error) { console.error("RPC Error:", error); throw error; }
        return data[0];
    },

    async getCurriculum(studentId) {
        // Fetch categories
        const { data: allTasks, error: taskErr } = await supabase.from('math_tasks').select('category');
        if (taskErr) { console.error("Task Fetch Error:", taskErr); return []; }
        
        const uniqueCategories = [...new Set(allTasks.map(t => t.category))].sort();

        // Fetch scores
        const { data: scores, error: scoreErr } = await supabase.from('student_mastery')
            .select('category, mastery_score').eq('student_id', studentId);
        if (scoreErr) console.warn("Score Fetch Warning:", scoreErr);

        return uniqueCategories.map(cat => {
            const match = scores?.find(s => s.category === cat);
            return { category: cat, mastery_score: match ? match.mastery_score : 0 };
        });
    },

    async getRandomQuestion(selectedCategories = []) {
        if (!selectedCategories.length) return null;
        const { data: questions, error } = await supabase.from('math_tasks')
            .select('*').in('category', selectedCategories);
        
        if (error) { console.error("Question Fetch Error:", error); return null; }
        if (!questions?.length) return null;
        
        return questions[Math.floor(Math.random() * questions.length)];
    },

    async login(username, password) { 
        const { data, error } = await supabase.rpc('secure_login', {
            input_username: username,
            input_password: password
        });
        if (error || !data.length) throw new Error("Invalid username or password.");
        return data[0]; 
    },

    async setPassword(username, password) {
        const { data, error } = await supabase.rpc('set_student_password', {
            input_username: username,
            new_password: password
        });
        if (error) throw error;
        return data;
    },

    async adminGetStudents() {
        const { data, error } = await supabase.rpc('admin_get_students');
        if (error) throw error;
        return data;
    },

    async adminAddStudent(username, displayName, tempPass) {
        const { data, error } = await supabase.rpc('admin_add_student', {
            new_username: username,
            new_display_name: displayName,
            temp_password: tempPass
        });
        if (error) throw error;
        return data;
    },

    async adminTriggerReset(username, tempPass) {
        const { data, error } = await supabase.rpc('admin_trigger_reset', {
            target_username: username,
            temp_password: tempPass
        });
        if (error) throw error;
        return data;
    }
};