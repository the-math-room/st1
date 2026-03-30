import { defaultRenderer } from './renderers/default.js';
import { medianRenderer } from './renderers/median.js';

/**
 * Strategy Registry
 * Add new question types here to expand the app's capabilities.
 */
const QuestionRenderers = {
    median: medianRenderer,
    addition: defaultRenderer,
    subtraction: defaultRenderer,
    default: defaultRenderer 
};

export const ui = {
    // Tracks which specialized module is currently "on stage"
    activeRenderer: null,

    elements: {
        loginScreen: document.getElementById('login-screen'),
        loginForm: document.getElementById('login-form'),
        answerForm: document.getElementById('answer-form'),
        mainApp: document.getElementById('app'),
        studentName: document.getElementById('student-name'),
        usernameInput: document.getElementById('username-input'),
        passwordInput: document.getElementById('password-input'),
        loginBtn: document.getElementById('login-btn'),
        logoutBtn: document.getElementById('logout-btn'),
        question: document.getElementById('question'),
        category: document.getElementById('category-tag'),
        input: document.getElementById('answer-input'),
        button: document.getElementById('submit-btn'),
        status: document.getElementById('status-msg'),
        masteryGrid: document.getElementById('mastery-grid'),
        startBtn: document.getElementById('start-drill-btn'),
        stopBtn: document.getElementById('stop-drill-btn'),
        questionContainer: document.getElementById('question-container'),
        statusFooter: document.getElementById('status-footer'),
        instructionText: document.getElementById('instruction-text')
    },

    /**
     * AUTH & NAVIGATION
     */
    toggleAuth(isLoggedIn, student = null) {
        this.elements.loginScreen.style.display = isLoggedIn ? 'none' : 'flex';
        this.elements.mainApp.style.display = isLoggedIn ? 'block' : 'none';
        if (student) this.elements.studentName.innerText = student.display_name;
    },

    setMode(mode) {
        const isDrill = mode === 'drill';
        this.elements.questionContainer.style.display = isDrill ? 'block' : 'none';
        this.elements.statusFooter.style.display = isDrill ? 'block' : 'none';
        this.elements.startBtn.style.display = isDrill ? 'none' : 'inline-block';
        this.elements.stopBtn.style.display = isDrill ? 'inline-block' : 'none';
        this.elements.instructionText.style.visibility = isDrill ? 'hidden' : 'visible';
    },

    /**
     * DASHBOARD RENDERING
     */
    renderMasteryCards(curriculum, activeCategory, selectedCategories = []) {
        this.elements.masteryGrid.innerHTML = curriculum.map(item => {
            const pct = Math.round(item.mastery_score * 100);
            const activeClass = item.category === activeCategory ? 'is-active' : '';
            const selectedClass = selectedCategories.includes(item.category) ? 'is-selected' : '';
            return `
                <div class="mastery-card ${activeClass} ${selectedClass}" data-cat="${item.category}">
                    <span class="label">${item.category}</span>
                    <div class="mini-bar-bg"><div class="mini-bar-fill" style="width: ${pct}%"></div></div>
                    <span class="percent">${pct}%</span>
                </div>`;
        }).join('');
    },

    /**
     * QUESTION SYSTEM (The Strategy Bridge)
     */
    renderQuestion(questionObj) {
        // 1. Assign the renderer based on category
        this.activeRenderer = QuestionRenderers[questionObj.category] || QuestionRenderers.default;

        // 2. Get the HTML from the renderer
        const problemHtml = this.activeRenderer.render(questionObj);

        // 3. Inject standard wrappers around the custom problem HTML
        this.elements.question.innerHTML = `
            ${problemHtml}
            <button id="help-btn" class="secondary-btn" style="margin-top: 10px;">How do I do this?</button>
            <div id="help-display" style="display: none;" class="help-box"></div>
        `;
    },

    showHelpContent(category) {
        const display = document.getElementById('help-display');
        const btn = document.getElementById('help-btn');

        if (this.activeRenderer && display) {
            display.innerHTML = this.activeRenderer.getHelp(category);
            display.style.display = 'block';
            if (btn) btn.style.display = 'none';
        }
    },

    /**
     * CUSTOM ACTION DISPATCHER
     * Forwards events (like "sort" or "draw") to the active renderer
     */
    handleCustomAction(actionType) {
        if (this.activeRenderer && typeof this.activeRenderer.handleAction === 'function') {
            this.activeRenderer.handleAction(actionType);
        }
    },

    /**
     * FEEDBACK & UTILITIES
     */
    setLoading(isLoading, msg = "") {
        this.elements.button.disabled = isLoading;
        this.elements.input.disabled = isLoading;
        if (msg) this.elements.status.innerText = msg;
        if (!isLoading) this.elements.input.focus();
    },

    showFeedback(isCorrect) {
        this.elements.mainApp.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
        this.elements.status.innerText = isCorrect ? "Correct! 🎉" : "Try again! ❌";
    },

    clearFeedback() {
        this.elements.mainApp.classList.remove('is-correct', 'is-wrong');
        this.elements.input.value = '';
        this.elements.input.focus();
    }
};