import { api } from './api.js';
import { ui } from './ui.js';
import { supabase } from './supabase-client.js';

const getEl = (id) => document.getElementById(id);

export async function initTeacherApp() {
    const { data: { session } } = await supabase.auth.getSession();

    console.log('Teacher session:', session);
    console.log('Teacher UID:', session?.user?.id);

    if (!session) {
        alert('No teacher session found.');
        return;
    }

    ui.toggleAuth(true);
    ui.showTeacherView();

    await refreshTeacherDashboard();
}

export async function refreshTeacherDashboard() {
    try {
        const [classes, students] = await Promise.all([
            api.adminGetClasses(),
            api.adminGetStudents()
        ]);

        renderClassOptions(classes ?? []);
        renderStudentList(students ?? []);
    } catch (error) {
        console.error('Teacher dashboard load failed:', error);
        alert(`Teacher dashboard load failed: ${error.message}`);
    }
}

function renderClassOptions(classes) {
    const classSelect = getEl('new-student-class');
    if (!classSelect) return;

    classSelect.innerHTML =
        '<option value="">Select Class...</option>' +
        classes.map(c => `<option value="${c.id}">Class ${c.class_name}</option>`).join('');
}

function renderStudentList(students) {
    const list = getEl('admin-student-list');
    if (!list) return;

    list.innerHTML = students.map(student => `
        <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 12px; border: 1px solid #e2e8f0;">
            <div style="text-align: left;">
                <strong>${student.display_name}</strong>
                <span style="font-size: 0.7rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">
                    Class ${student.class_name || 'Unassigned'}
                </span>
                <br><small>${student.username}</small>
            </div>
            <button
                class="secondary-btn"
                data-action="trigger-reset"
                data-username="${student.username}"
                style="${student.must_reset ? 'opacity: 0.5' : 'background: #fee2e2; color: #ef4444;'}"
            >
                ${student.must_reset ? 'Reset Pending' : 'Force Reset'}
            </button>
        </div>
    `).join('');
}

export async function addStudent() {
    const username = getEl('new-student-username')?.value?.trim();
    const displayName = getEl('new-student-name')?.value?.trim();
    const tempPass = getEl('new-student-pass')?.value?.trim();
    const classId = getEl('new-student-class')?.value;

    if (!username || !displayName || !tempPass || !classId) {
        alert('Please fill out all fields.');
        return;
    }

    try {
        const success = await api.adminAddStudent(username, displayName, tempPass, classId);
        if (success) {
            getEl('add-student-form')?.reset();
            await refreshTeacherDashboard();
        }
    } catch (error) {
        console.error('Add student failed:', error);
        alert(`Could not add student: ${error.message}`);
    }
}

export async function bulkImportStudents() {
    const fileInput = getEl('csv-file-input');
    const classId = getEl('new-student-class')?.value;

    if (!fileInput?.files?.length || !classId) {
        alert('Please select a file AND a class first!');
        return;
    }

    const file = fileInput.files[0];
    const text = await file.text();

    const rows = text
        .split('\n')
        .map(row => row.trim())
        .filter(Boolean);

    const studentArray = rows.map(row => {
        const [name, username, password] = row.split(',').map(item => item.trim());
        return {
            display_name: name,
            username,
            password,
            class_id: classId
        };
    });

    try {
        await api.adminBulkAddStudents(studentArray);
        alert(`Successfully added ${studentArray.length} students!`);
        await refreshTeacherDashboard();
    } catch (error) {
        console.error('Bulk Import Error:', error);
        alert('Error importing CSV. Check the console for details.');
    }
}

export async function triggerReset(username) {
    const tempPass = prompt(`Enter temp password for ${username}:`, 'math123');
    if (!tempPass) return;

    try {
        await api.adminTriggerReset(username, tempPass);
        await refreshTeacherDashboard();
    } catch (error) {
        console.error('Trigger reset failed:', error);
        alert(`Could not reset password: ${error.message}`);
    }
}