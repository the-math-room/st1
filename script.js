import { api } from './modules/api.js';
import { ui } from './modules/ui.js';

const CONFIG = {
    MIN_CATEGORIES: 1,
    DELAY_CORRECT: 1500,
    DELAY_WRONG: 1000
};

let currentTaskId = null;
let currentCategory = null;
let currentStudent = JSON.parse(localStorage.getItem('math_session'));
let selectedCategories = [];
let isDrillActive = false;
let usedHelpThisRound = false;

// We need to add the new setup form to our UI elements manually if not in ui.js
ui.elements.setupForm = document.getElementById('setup-form');
ui.elements.loginForm = document.getElementById('login-form');
ui.elements.answerForm = document.getElementById('answer-form');

async function refreshUI() {
    if (!currentStudent) return;
    try {
        const curriculum = await api.getCurriculum(currentStudent.id);
        ui.renderMasteryCards(curriculum, currentCategory, selectedCategories);
        
        const count = selectedCategories.length;
        const isReady = count >= CONFIG.MIN_CATEGORIES;
        ui.elements.startBtn.disabled = !isReady;

        if (isReady) {
            ui.elements.instructionText.innerText = "Ready to start your drill! 🚀";
            ui.elements.instructionText.style.color = "#3ecf8e";
        } else {
            const remaining = CONFIG.MIN_CATEGORIES - count;
            const unit = remaining === 1 ? "category" : "categories";
            ui.elements.instructionText.innerText = `Select at least ${remaining} more ${unit} to start:`;
            ui.elements.instructionText.style.color = "#64748b";
        }
    } catch (err) { console.error(err); }
}

async function startRound() {
    if (!isDrillActive) return;
    usedHelpThisRound = false; 
    ui.clearFeedback();
    const question = await api.getRandomQuestion(selectedCategories);
    if (question) {
        currentTaskId = question.id;
        currentCategory = question.category;
        ui.renderQuestion(question);
        ui.elements.category.innerText = question.category;
        await refreshUI();
        ui.setLoading(false, "Ready!");
    }
}

async function handleAnswer() {
    const guess = ui.elements.input.value;
    if (!guess || ui.elements.button.disabled) return;
    ui.setLoading(true, "Checking...");
    try {
        const res = await api.checkAnswer(currentTaskId, guess, currentStudent.id, usedHelpThisRound);
        ui.showFeedback(res.is_correct);
        await refreshUI();
        setTimeout(startRound, res.is_correct ? CONFIG.DELAY_CORRECT : CONFIG.DELAY_WRONG);
    } catch (e) { ui.setLoading(false, "Error!"); }
}

/** --- EVENT LISTENERS --- **/

// Answer Submission (Enter or Click)
ui.elements.answerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    handleAnswer();
});

// Login Submission
ui.elements.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        currentStudent = await api.login(ui.elements.usernameInput.value, ui.elements.passwordInput.value);
        localStorage.setItem('math_session', JSON.stringify(currentStudent));
        ui.toggleAuth(true, currentStudent);
        refreshUI();
    } catch (err) { alert(err.message); }
});

// Password Setup Submission
ui.elements.setupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('setup-username').value;
    const pass = document.getElementById('setup-password').value;
    try {
        await api.setPassword(user, pass);
        alert("Password saved! You can now log in.");
        ui.elements.setupForm.style.display = 'none';
        ui.elements.loginForm.style.display = 'block';
    } catch (err) { alert("Error setting password."); }
});

// Toggle Setup/Login View
document.getElementById('show-setup-link').onclick = (e) => {
    e.preventDefault();
    ui.elements.loginForm.style.display = 'none';
    ui.elements.setupForm.style.display = 'block';
};

document.getElementById('show-login-link').onclick = (e) => {
    e.preventDefault();
    ui.elements.setupForm.style.display = 'none';
    ui.elements.loginForm.style.display = 'block';
};

ui.elements.masteryGrid.addEventListener('click', (e) => {
    if (isDrillActive) return;
    const card = e.target.closest('.mastery-card');
    if (!card) return;
    const cat = card.dataset.cat;
    selectedCategories = selectedCategories.includes(cat) 
        ? selectedCategories.filter(c => c !== cat) : [...selectedCategories, cat];
    refreshUI();
});

ui.elements.question.addEventListener('click', (e) => {
    if (e.target.id === 'help-btn') {
        usedHelpThisRound = true;
        ui.showHelpContent(currentCategory);
    }
    if (e.target.dataset.action) ui.handleCustomAction(e.target.dataset.action);
});

ui.elements.startBtn.addEventListener('click', () => {
    isDrillActive = true;
    ui.setMode('drill');
    startRound();
});

ui.elements.stopBtn.addEventListener('click', () => {
    isDrillActive = false;
    ui.setMode('selection');
    currentCategory = null;
    refreshUI();
});

ui.elements.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('math_session');
    location.reload();
});

// Init
if (currentStudent) { ui.toggleAuth(true, currentStudent); refreshUI(); } 
else { ui.toggleAuth(false); }