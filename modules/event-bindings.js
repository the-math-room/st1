import { api } from './api.js';
import { session } from './session.js';
import { logout } from './app-controller.js';
import { supabase } from './supabase-client.js';
import {
    toggleCategory,
    startDrill,
    stopDrill,
    submitAnswer,
    revealHelp,
    handleQuestionAction
} from './student-controller.js';
import {
    addStudent,
    bulkImportStudents,
    triggerReset
} from './teacher-controller.js';

const getEl = (id) => document.getElementById(id);

export function bindEvents() {
    bindLoginForm();
    bindSetupForm();
    bindAnswerForm();
    bindStudentControls();
    bindTeacherControls();
    bindDelegatedClicks();
}

function bindLoginForm() {
    getEl('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = getEl('username-input')?.value?.trim();
        const password = getEl('password-input')?.value ?? '';

        if (!username || !password) return;

        // Try teacher auth first
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: username,
            password
        });

        if (!authError && authData?.session) {
            session.clear();
            window.location.reload();
            return;
        }

        // Fallback to student login
        try {
            const user = await api.login(username, password);

            if (user.must_reset) {
                const loginForm = getEl('login-form');
                const setupForm = getEl('setup-form');
                const setupUsername = getEl('setup-username');

                if (loginForm) loginForm.classList.add('is-hidden');
                if (setupForm) setupForm.classList.remove('is-hidden');
                if (setupUsername) setupUsername.value = username;
                return;
            }

            session.save(user);
            window.location.reload();
        } catch (error) {
            alert('Invalid username/email or password.');
        }
    });
}

function bindSetupForm() {
    getEl('setup-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = getEl('setup-username')?.value?.trim();
        const password = getEl('setup-password')?.value ?? '';

        try {
            const success = await api.setPassword(username, password);
            if (success) {
                alert('Password updated!');
                window.location.reload();
            }
        } catch (error) {
            console.error('Password setup failed:', error);
            alert(`Could not update password: ${error.message}`);
        }
    });
}

function bindAnswerForm() {
    getEl('answer-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await submitAnswer();
    });
}

function bindStudentControls() {
    getEl('start-drill-btn')?.addEventListener('click', async () => {
        await startDrill();
    });

    getEl('stop-drill-btn')?.addEventListener('click', async () => {
        await stopDrill();
    });

    getEl('logout-btn')?.addEventListener('click', () => {
        logout();
    });
}

function bindTeacherControls() {
    getEl('teacher-logout')?.addEventListener('click', () => {
        logout();
    });

    getEl('add-student-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await addStudent();
    });

    getEl('upload-csv-btn')?.addEventListener('click', async () => {
        await bulkImportStudents();
    });
}

function bindDelegatedClicks() {
    getEl('mastery-grid')?.addEventListener('click', (e) => {
        const card = e.target.closest('.mastery-card');
        if (!card) return;
        toggleCategory(card.dataset.cat);
    });

    getEl('question')?.addEventListener('click', (e) => {
        if (e.target.id === 'help-btn') {
            revealHelp();
        }

        if (e.target.dataset.action) {
            handleQuestionAction(e.target.dataset.action);
        }
    });

    getEl('admin-student-list')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action="trigger-reset"]');
        if (!btn) return;

        const username = btn.dataset.username;
        if (username) {
            await triggerReset(username);
        }
    });
}