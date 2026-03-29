import { api } from './modules/api.js';
import { ui } from './modules/ui.js';

let currentTaskId = null;
let currentCategory = null;
let currentStudent = JSON.parse(localStorage.getItem('math_session'));
let selectedCategories = [];
let isDrillActive = false;
let usedHelpThisRound = false;

async function refreshUI() {
    if (!currentStudent) return;
    const curriculum = await api.getCurriculum(currentStudent.id);
    ui.renderMasteryCards(curriculum, currentCategory, selectedCategories);
    ui.elements.startBtn.disabled = selectedCategories.length < 2;
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
        setTimeout(startRound, res.new_score >= 0.8 ? 1500 : 800);
    } catch (e) { ui.setLoading(false, "Error!"); }
}

// Events
ui.elements.masteryGrid.addEventListener('click', (e) => {
    if (isDrillActive) return;
    const card = e.target.closest('.mastery-card');
    if (!card) return;
    const cat = card.dataset.cat;
    selectedCategories = selectedCategories.includes(cat) 
        ? selectedCategories.filter(c => c !== cat) 
        : [...selectedCategories, cat];
    refreshUI();
});

ui.elements.question.addEventListener('click', (e) => {
    if (e.target.id === 'help-btn') {
        usedHelpThisRound = true;
        ui.showHelpContent(currentCategory);
    }
    if (e.target.id === 'sort-btn') ui.showSortedData();
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

ui.elements.loginBtn.addEventListener('click', async () => {
    try {
        currentStudent = await api.login(ui.elements.usernameInput.value, ui.elements.passwordInput.value);
        localStorage.setItem('math_session', JSON.stringify(currentStudent));
        ui.toggleAuth(true, currentStudent);
        refreshUI();
    } catch (e) { alert(e.message); }
});

ui.elements.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('math_session');
    location.reload();
});

ui.elements.button.addEventListener('click', handleAnswer);
ui.elements.input.addEventListener('keydown', (e) => e.key === 'Enter' && handleAnswer());

if (currentStudent) { ui.toggleAuth(true, currentStudent); refreshUI(); } 
else { ui.toggleAuth(false); }