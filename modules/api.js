import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { SUPABASE_CONFIG } from '../config.js';

if (!SUPABASE_CONFIG || !SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.KEY) {
    throw new Error("App halted: Missing API credentials.");
}

const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

export const api = {
    async checkAnswer(id, guess, studentId, usedHelp = false) {
        const { data, error } = await supabase.rpc('check_math_answer', {
            question_id: id, 
            user_guess: guess, 
            input_student_id: studentId,
            input_used_help: usedHelp 
        });
        if (error) throw error;
        return data[0];
    },

    async getCurriculum(studentId) {
        try {
            const { data: allTasks } = await supabase.from('math_tasks').select('category');
            if (!allTasks) return [];
            
            const uniqueCategories = [...new Set(allTasks.map(t => t.category))].sort();

            const { data: scores } = await supabase.from('student_mastery')
                .select('category, mastery_score')
                .eq('student_id', studentId);

            return uniqueCategories.map(cat => {
                const match = scores?.find(s => s.category === cat);
                return { 
                    category: cat, 
                    mastery_score: match ? match.mastery_score : 0 
                };
            });
        } catch (err) {
            console.error("Curriculum Fetch Error:", err);
            return [];
        }
    },

    async getRandomQuestion(selectedCategories = []) {
        if (!selectedCategories.length) return null;
        const { data: questions, error } = await supabase
            .from('math_tasks')
            .select('*')
            .in('category', selectedCategories);

        if (error || !questions?.length) return null;
        return questions[Math.floor(Math.random() * questions.length)];
    },

    async login(username, password) { 
        const { data, error } = await supabase.rpc('secure_login', {
            input_username: username,
            input_password: password
        });
        if (error || !data.length) throw new Error("Invalid credentials.");
        return data[0]; 
    },

    async setPassword(username, password) {
        const { data, error } = await supabase.rpc('set_student_password', {
            input_username: username,
            new_password: password
        });
        if (error) throw error;
        return data;
    }
};