import { api } from './modules/api.js';
import { ui } from './modules/ui.js';

const CONFIG = { MIN_CATEGORIES: 1, DELAY_CORRECT: 0, DELAY_WRONG: 0 };
let currentTaskId = null, currentCategory = null, selectedCategories = [];
let isDrillActive = false, usedHelpThisRound = false;
let currentStudent = JSON.parse(localStorage.getItem('math_session'));

async function refreshUI() {
    // Ensure we have a student and they are assigned to a class
    if (!currentStudent || !currentStudent.class_id) {
        console.warn("Student has no class assigned.");
        return;
    }

    // Pass the class_id to the API call
    const curriculum = await api.getCurriculum(currentStudent.id, currentStudent.class_id);
    
    // We already decided to drop the "activeCategory" highlight
    ui.renderMasteryCards(curriculum, selectedCategories);
    
    const startBtn = document.getElementById('start-drill-btn');
    const instr = document.getElementById('instruction-text');
    const isReady = selectedCategories.length >= CONFIG.MIN_CATEGORIES;

    if (startBtn) startBtn.disabled = !isReady;
    if (instr) instr.innerText = isReady ? "Ready to start! 🚀" : `Select a category:`;
}

async function showTeacherDashboard() {
    ui.toggleAuth(true);
    const sv = document.getElementById('student-view');
    const tp = document.getElementById('teacher-panel');
    if (sv) sv.style.display = 'none';
    if (tp) tp.style.display = 'block';
    
    // 1. Load Classes into the dropdown
    const classes = await api.adminGetClasses();
    const classSelect = document.getElementById('new-student-class');
    if (classSelect) {
        classSelect.innerHTML = '<option value="">Select Class...</option>' + 
            classes.map(c => `<option value="${c.id}">Class ${c.class_name}</option>`).join('');
    }

    // 2. Load Students with their Class Name
    const students = await api.adminGetStudents();
    const list = document.getElementById('admin-student-list');
    if (list) {
        list.innerHTML = students.map(s => `
            <div class="card" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 12px; border: 1px solid #e2e8f0;">
                <div style="text-align: left;">
                    <strong>${s.display_name}</strong> 
                    <span style="font-size: 0.7rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; margin-left: 5px;">
                        Class ${s.class_name || 'Unassigned'}
                    </span>
                    <br><small>${s.username}</small>
                </div>
                <button class="secondary-btn" onclick="window.triggerReset('${s.username}')" 
                    style="${s.must_reset ? 'opacity: 0.5' : 'background: #fee2e2; color: #ef4444;'}">
                    ${s.must_reset ? 'Reset Pending' : 'Force Reset'}
                </button>
            </div>
        `).join('');
    }
}

window.triggerReset = async (username) => {
    const tempPass = prompt(`Enter temp password for ${username}:`, "math123");
    if (tempPass) {
        await api.adminTriggerReset(username, tempPass);
        showTeacherDashboard();
    }
};

/** --- LISTENERS --- **/

document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userVal = document.getElementById('username-input').value;
    const passVal = document.getElementById('password-input').value;
    try {
        const user = await api.login(userVal, passVal);
        if (user.must_reset) {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('setup-form').style.display = 'block';
            document.getElementById('setup-username').value = userVal;
        } else {
            localStorage.setItem('math_session', JSON.stringify(user));
            location.reload(); 
        }
    } catch (err) { alert(err.message); }
});

document.getElementById('answer-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAnswer();
});

document.getElementById('setup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('setup-username').value;
    const p = document.getElementById('setup-password').value;
    const success = await api.setPassword(u, p);
    if (success) { alert("Password updated!"); location.reload(); }
});

document.getElementById('add-student-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const success = await api.adminAddStudent(
        document.getElementById('new-student-username').value,
        document.getElementById('new-student-name').value,
        document.getElementById('new-student-pass').value,
        document.getElementById('new-student-class').value // Added this
    );
    if (success) { 
        document.getElementById('add-student-form').reset(); 
        showTeacherDashboard(); 
    }
});

document.getElementById('upload-csv-btn')?.addEventListener('click', async () => {
    const fileInput = document.getElementById('csv-file-input');
    const classId = document.getElementById('new-student-class').value; // Borrow the class selection

    if (!fileInput.files.length || !classId) {
        alert("Please select a file AND a class first!");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => {
        const text = e.target.result;
        const rows = text.split('\n').filter(row => row.trim().length > 0);
        
        const studentArray = rows.map(row => {
            const [name, username, password] = row.split(',').map(item => item.trim());
            return {
                display_name: name,
                username: username,
                password: password,
                class_id: classId
            };
        });

        try {
            // CHANGE THIS LINE: Use api instead of supabase
            await api.adminBulkAddStudents(studentArray); 
            
            alert(`Successfully added ${studentArray.length} students!`);
            showTeacherDashboard(); 
        } catch (err) {
            console.error("Bulk Import Error:", err);
            alert("Error importing CSV. Check the console for details.");
        }
    };

    reader.readAsText(file);
});

async function handleAnswer() {
    const input = document.getElementById('answer-input');
    const guess = input.value;
    if (!guess) return;
    ui.setLoading(true, "Checking...");
    try {
        const res = await api.checkAnswer(currentTaskId, guess, currentStudent.id, usedHelpThisRound);
        ui.showFeedback(res.is_correct);
        await refreshUI();
        setTimeout(startRound, res.is_correct ? CONFIG.DELAY_CORRECT : CONFIG.DELAY_WRONG);
    } catch (e) { ui.setLoading(false, "Error!"); }
}

async function startRound() {
    if (!isDrillActive) return;
    usedHelpThisRound = false;
    ui.clearFeedback();
    const q = await api.getRandomQuestion(selectedCategories);
    if (q) {
        currentTaskId = q.id; currentCategory = q.category;
        ui.renderQuestion(q);
        const tag = document.getElementById('category-tag');
        if (tag) tag.innerText = q.category;
        ui.setLoading(false, "Ready!");
    }
}

// Button wiring
const sBtn = document.getElementById('start-drill-btn');
if (sBtn) sBtn.onclick = () => { isDrillActive = true; ui.setMode('drill'); startRound(); };

const stopBtn = document.getElementById('stop-drill-btn');
if (stopBtn) stopBtn.onclick = () => { isDrillActive = false; ui.setMode('selection'); refreshUI(); };

const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) logoutBtn.onclick = () => { localStorage.removeItem('math_session'); location.reload(); };

const tLogout = document.getElementById('teacher-logout');
if (tLogout) tLogout.onclick = () => { localStorage.removeItem('math_session'); location.reload(); };

document.getElementById('mastery-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.mastery-card');
    if (!card || isDrillActive) return;
    const cat = card.dataset.cat;
    selectedCategories = selectedCategories.includes(cat) ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat];
    refreshUI();
});

document.getElementById('question')?.addEventListener('click', (e) => {
    if (e.target.id === 'help-btn') { usedHelpThisRound = true; ui.showHelpContent(currentCategory); }
    if (e.target.dataset.action) ui.handleCustomAction(e.target.dataset.action);
});

// INITIALIZE
if (currentStudent) {
    if (currentStudent.role === 'teacher') showTeacherDashboard();
    else { ui.toggleAuth(true, currentStudent); refreshUI(); }
} else { 
    ui.toggleAuth(false); 
}