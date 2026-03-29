import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import { SUPABASE_CONFIG } from '../config.js';

// DEBUG CHECK: If this prints "undefined", your config.js path is wrong
console.log("API Module Loading. Config detected:", SUPABASE_CONFIG);

if (!SUPABASE_CONFIG || !SUPABASE_CONFIG.URL || !SUPABASE_CONFIG.KEY) {
    console.error("CRITICAL ERROR: Supabase Config is missing or undefined!");
    // This stops the app from making the bad /undefined fetch
    throw new Error("App halted: Missing API credentials.");
}

const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.KEY);

export const api = {
    // ... rest of your code ...
    
    // Ensure this has the new parameter for the help feature
    async checkAnswer(id, guess, studentId, usedHelp = false) {
        const { data, error } = await supabase.rpc('check_math_answer', {
            question_id: id, 
            user_guess: guess, 
            input_student_id: studentId,
            input_used_help: usedHelp 
        });
        if (error) {
            console.error("RPC Error:", error);
            throw error;
        }
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

        const randomIndex = Math.floor(Math.random() * questions.length);
        return questions[randomIndex];
    }
};