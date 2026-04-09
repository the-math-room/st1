import { session } from './session.js';
import { state } from './state.js';
import { ui } from './ui.js';
import { initStudentApp } from './student-controller.js';
import { initTeacherApp } from './teacher-controller.js';
import { supabase } from './supabase-client.js';

export async function initApp() {
    const { data: { session: teacherSession } } = await supabase.auth.getSession();

    if (teacherSession) {
        await initTeacherApp();
        return;
    }

    const student = session.getStudent();
    state.setStudent(student);

    if (!student) {
        ui.toggleAuth(false);
        return;
    }

    await initStudentApp(student);
}

export async function logout() {
    await supabase.auth.signOut();
    session.clear();
    state.clearStudent();
    window.location.reload();
}