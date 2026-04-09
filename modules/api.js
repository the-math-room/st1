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
        return data?.[0] ?? null;
    },

    async getCurriculum(studentId, classId) {
        const { data, error } = await supabase.rpc('get_student_curriculum', {
            input_student_id: studentId,
            input_class_id: classId
        });

        if (error) {
            console.error("Curriculum RPC Error:", error);
            return [];
        }

        return data ?? [];
    },

    async getRandomQuestion(selectedCategories = []) {
        if (!selectedCategories.length) return null;

        const { data, error } = await supabase.rpc('get_random_question_for_categories', {
            selected_categories: selectedCategories
        });

        if (error) {
            console.error("Question RPC Error:", error);
            return null;
        }

        return data?.[0] ?? null;
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

    async adminGetClasses() {
        const { data, error } = await supabase.rpc('admin_get_classes');
        if (error) throw error;
        return data;
    },

    async adminAddStudent(username, displayName, tempPass, classId) {
        const { data, error } = await supabase.rpc('admin_add_student', {
            new_username: username,
            new_display_name: displayName,
            temp_password: tempPass,
            target_class_id: parseInt(classId)
        });
        if (error) throw error;
        return data;
    },

    async adminBulkAddStudents(studentArray) {
        const { data, error } = await supabase.rpc('admin_bulk_add_students', {
            student_data: studentArray
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