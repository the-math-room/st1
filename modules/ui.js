import { defaultRenderer } from './renderers/default.js';
import { medianRenderer } from './renderers/median.js';

const QuestionRenderers = {
    median: medianRenderer,
    addition: defaultRenderer,
    subtraction: defaultRenderer,
    default: defaultRenderer 
};

// Helper to grab elements safely
const getEl = (id) => document.getElementById(id);

export const ui = {
    activeRenderer: null,

    // Core UI logic
    toggleAuth(isLoggedIn, student = null) {
        const loginScreen = getEl('login-screen');
        const mainApp = getEl('app');
        const studentName = getEl('student-name');

        if (loginScreen) loginScreen.style.display = isLoggedIn ? 'none' : 'flex';
        if (mainApp) mainApp.style.display = isLoggedIn ? 'block' : 'none';
        if (student && studentName) studentName.innerText = student.display_name;
    },

    setMode(mode) {
        const isDrill = mode === 'drill';
        const qContainer = getEl('question-container');
        const footer = getEl('status-footer');
        const startBtn = getEl('start-drill-btn');
        const stopBtn = getEl('stop-drill-btn');
        const instr = getEl('instruction-text');

        if (qContainer) qContainer.style.display = isDrill ? 'block' : 'none';
        if (footer) footer.style.display = isDrill ? 'block' : 'none';
        if (startBtn) startBtn.style.display = isDrill ? 'none' : 'inline-block';
        if (stopBtn) stopBtn.style.display = isDrill ? 'inline-block' : 'none';
        if (instr) instr.style.visibility = isDrill ? 'hidden' : 'visible';
    },

    renderMasteryCards(curriculum, selectedCategories = []) {
        const grid = getEl('mastery-grid');
        if (!grid) return;

        grid.innerHTML = curriculum.map(item => {
            const pct = Math.round(item.mastery_score * 100);
            // Removed activeClass logic entirely
            const selectedClass = selectedCategories.includes(item.category) ? 'is-selected' : '';
            return `
                <div class="mastery-card ${selectedClass}" data-cat="${item.category}">
                    <span class="label">${item.category}</span>
                    <div class="mini-bar-bg"><div class="mini-bar-fill" style="width: ${pct}%"></div></div>
                    <span class="percent">${pct}%</span>
                </div>`;
        }).join('');
    },

    renderQuestion(questionObj) {
        this.activeRenderer = QuestionRenderers[questionObj.category] || QuestionRenderers.default;
        const problemHtml = this.activeRenderer.render(questionObj);
        const qBox = getEl('question');
        if (qBox) {
            qBox.innerHTML = `
                ${problemHtml}
                <button id="help-btn" class="secondary-btn" style="margin-top: 10px;">How do I do this?</button>
                <div id="help-display" style="display: none;" class="help-box"></div>
            `;
        }
    },

    showHelpContent(category) {
        const display = getEl('help-display');
        const btn = getEl('help-btn');
        if (this.activeRenderer && display) {
            display.innerHTML = this.activeRenderer.getHelp(category);
            display.style.display = 'block';
            if (btn) btn.style.display = 'none';
        }
    },

    handleCustomAction(actionType) {
        if (this.activeRenderer && typeof this.activeRenderer.handleAction === 'function') {
            this.activeRenderer.handleAction(actionType);
        }
    },

    setLoading(isLoading, msg = "") {
        const btn = getEl('submit-btn');
        const input = getEl('answer-input');
        const status = getEl('status-msg');

        if (btn) btn.disabled = isLoading;
        if (input) input.disabled = isLoading;
        if (msg && status) status.innerText = msg;
        if (!isLoading && input) input.focus();
    },

    showFeedback(isCorrect) {
        const app = getEl('app');
        const status = getEl('status-msg');
        if (app) {
            app.classList.remove('is-correct', 'is-wrong');
            app.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
        }
        if (status) status.innerText = isCorrect ? "Correct! 🎉" : "Try again! ❌";
    },

    clearFeedback() {
        const app = getEl('app');
        const input = getEl('answer-input');
        if (app) app.classList.remove('is-correct', 'is-wrong');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
};