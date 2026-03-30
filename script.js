import { api } from './modules/api.js';
import { ui } from './modules/ui.js';

/**
 * APPLICATION CONFIGURATION
 * Centralizing rules here makes the app easy to tune later.
 */
const CONFIG = {
    MIN_CATEGORIES: 1, // Change to 2 or 3 to force variety
    DELAY_CORRECT: 1500,
    DELAY_WRONG: 1000
};

// --- Application State ---
let currentTaskId = null;
let currentCategory = null;
let currentStudent = JSON.parse(localStorage.getItem('math_session'));
let selectedCategories = [];
let isDrillActive = false;
let usedHelpThisRound = false;

/**
 * SYNC DASHBOARD
 * Updates mastery cards, start button state, and instruction text.
 */
async function refreshUI() {
    if (!currentStudent) return;
    
    try {
        const curriculum = await api.getCurriculum(currentStudent.id);
        ui.renderMasteryCards(curriculum, currentCategory, selectedCategories);
        
        // --- Unified Requirement Logic ---
        const count = selectedCategories.length;
        const isReady = count >= CONFIG.MIN_CATEGORIES;
        
        // Update Button
        ui.elements.startBtn.disabled = !isReady;
        
        // Update Instruction Text dynamically
        if (isReady) {
            ui.elements.instructionText.innerText = "Ready to start your drill! 🚀";
            ui.elements.instructionText.style.color = "#3ecf8e"; 
        } else {
            const remaining = CONFIG.MIN_CATEGORIES - count;
            const unit = remaining === 1 ? "category" : "categories";
            ui.elements.instructionText.innerText = `Select at least ${remaining} more ${unit} to start:`;
            ui.elements.instructionText.style.color = "#64748b";
        }
        
    } catch (err) {
        console.error("UI Refresh failed:", err);
    }
}

/**
 * DRILL ENGINE: Question Management
 */
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
    } else {
        ui.setLoading(true, "No questions found for these categories.");
    }
}

/**
 * DRILL ENGINE: Submission Logic
 */
async function handleAnswer() {
    const guess = ui.elements.input.value;
    if (!guess || ui.elements.button.disabled) return;

    ui.setLoading(true, "Checking...");
    
    try {
        const res = await api.checkAnswer(
            currentTaskId, 
            guess, 
            currentStudent.id, 
            usedHelpThisRound
        );

        ui.showFeedback(res.is_correct);
        await refreshUI();

        // Use configuration for timing
        const delay = res.is_correct ? CONFIG.DELAY_CORRECT : CONFIG.DELAY_WRONG;
        setTimeout(startRound, delay);
        
    } catch (e) { 
        console.error("Submission Error:", e);
        ui.setLoading(false, "Connection Error!"); 
    }
}

/**
 * --- GLOBAL EVENT LISTENERS ---
 */

// 1. Category Selection Logic
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

// 2. Question Area Interaction (Delegated to Renderer)
ui.elements.question.addEventListener('click', (e) => {
    // Standard Help
    if (e.target.id === 'help-btn') {
        usedHelpThisRound = true;
        ui.showHelpContent(currentCategory);
        return;
    }
    
    // Renderer-Specific Actions (like 'sort')
    const action = e.target.dataset.action;
    if (action) {
        ui.handleCustomAction(action);
    }
});

// 3. Drill Lifecycle
ui.elements.startBtn.addEventListener('click', () => {
    isDrillActive = true;
    ui.setMode('drill');
    startRound();
});

ui.elements.stopBtn.addEventListener('click', () => {
    isDrillActive = false;
    ui.setMode('selection');
    currentCategory = null; // Clear active card highlight
    refreshUI();
});

// 4. Authentication
ui.elements.loginBtn.addEventListener('click', async () => {
    const user = ui.elements.usernameInput.value;
    const pass = ui.elements.passwordInput.value;
    
    try {
        currentStudent = await api.login(user, pass);
        localStorage.setItem('math_session', JSON.stringify(currentStudent));
        ui.toggleAuth(true, currentStudent);
        refreshUI();
    } catch (e) { 
        alert("Login failed. Check your name or password."); 
    }
});

ui.elements.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('math_session');
    location.reload();
});

// 5. User Input
ui.elements.button.addEventListener('click', handleAnswer);
ui.elements.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAnswer();
});

/**
 * --- INITIALIZATION ---
 */
if (currentStudent) { 
    ui.toggleAuth(true, currentStudent); 
    refreshUI(); 
} else { 
    ui.toggleAuth(false); 
}