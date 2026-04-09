import { defaultRenderer } from './renderers/default.js';
import { medianRenderer } from './renderers/median.js';

const QuestionRenderers = {
    median: medianRenderer,
    addition: defaultRenderer,
    subtraction: defaultRenderer,
    default: defaultRenderer
};

const getEl = (id) => document.getElementById(id);

const showEl = (el) => {
    if (el) el.classList.remove('is-hidden');
};

const hideEl = (el) => {
    if (el) el.classList.add('is-hidden');
};

const setText = (el, value) => {
    if (el) el.innerText = value;
};

export const ui = {
    activeRenderer: null,

    toggleAuth(isLoggedIn, student = null) {
        const loginScreen = getEl('login-screen');
        const mainApp = getEl('app');
        const studentName = getEl('student-name');

        if (isLoggedIn) {
            hideEl(loginScreen);
            showEl(mainApp);
        } else {
            showEl(loginScreen);
            hideEl(mainApp);
        }

        if (student && studentName) {
            studentName.innerText = student.display_name;
        }
    },

    showTeacherView() {
        const studentView = getEl('student-view');
        const teacherPanel = getEl('teacher-panel');

        hideEl(studentView);
        showEl(teacherPanel);
    },

    showStudentView() {
        const studentView = getEl('student-view');
        const teacherPanel = getEl('teacher-panel');

        showEl(studentView);
        hideEl(teacherPanel);
    },

    setMode(mode) {
        const isDrill = mode === 'drill';

        const questionContainer = getEl('question-container');
        const statusFooter = getEl('status-footer');
        const startBtn = getEl('start-drill-btn');
        const stopBtn = getEl('stop-drill-btn');
        const instructionText = getEl('instruction-text');

        if (isDrill) {
            showEl(questionContainer);
            hideEl(startBtn);
            showEl(stopBtn);

            if (statusFooter) showEl(statusFooter);
            if (instructionText) instructionText.style.visibility = 'hidden';
            return;
        }

        hideEl(questionContainer);
        showEl(startBtn);
        hideEl(stopBtn);

        if (statusFooter) hideEl(statusFooter);
        if (instructionText) instructionText.style.visibility = 'visible';
    },

    setInstructionText(text) {
        const instructionText = getEl('instruction-text');
        setText(instructionText, text);
    },

    setStartButtonEnabled(isEnabled) {
        const startBtn = getEl('start-drill-btn');
        if (startBtn) startBtn.disabled = !isEnabled;
    },

    renderMasteryCards(curriculum, selectedCategories = []) {
        const grid = getEl('mastery-grid');
        if (!grid) return;

        grid.innerHTML = curriculum.map((item) => {
            const pct = Math.round(item.mastery_score * 100);
            const selectedClass = selectedCategories.includes(item.category) ? 'is-selected' : '';

            return `
                <div class="mastery-card ${selectedClass}" data-cat="${item.category}">
                    <span class="label">${item.category}</span>
                    <div class="mini-bar-bg">
                        <div class="mini-bar-fill" style="width: ${pct}%"></div>
                    </div>
                    <span class="percent">${pct}%</span>
                </div>
            `;
        }).join('');
    },

    renderQuestion(questionObj) {
        this.activeRenderer =
            QuestionRenderers[questionObj.category] || QuestionRenderers.default;

        const problemHtml = this.activeRenderer.render(questionObj);
        const questionBox = getEl('question');

        if (!questionBox) return;

        questionBox.innerHTML = `
            ${problemHtml}
            <button id="help-btn" class="secondary-btn button-block" type="button">
                How do I do this?
            </button>
            <div id="help-display" class="help-box is-hidden"></div>
        `;
    },

    setCategoryTag(category) {
        const tag = getEl('category-tag');
        setText(tag, category ?? '--');
    },

    showHelpContent(category) {
        const display = getEl('help-display');
        const button = getEl('help-btn');

        if (!this.activeRenderer || !display) return;

        display.innerHTML = this.activeRenderer.getHelp(category);
        showEl(display);
        hideEl(button);
    },

    handleCustomAction(actionType) {
        if (
            this.activeRenderer &&
            typeof this.activeRenderer.handleAction === 'function'
        ) {
            this.activeRenderer.handleAction(actionType);
        }
    },

    setLoading(isLoading, message = '') {
        const submitBtn = getEl('submit-btn');
        const answerInput = getEl('answer-input');
        const statusMsg = getEl('status-msg');

        if (submitBtn) submitBtn.disabled = isLoading;
        if (answerInput) answerInput.disabled = isLoading;
        if (message && statusMsg) statusMsg.innerText = message;

        if (!isLoading && answerInput) {
            answerInput.focus();
        }
    },

    showFeedback(isCorrect, message = null) {
        const app = getEl('app');
        const statusMsg = getEl('status-msg');

        if (app) {
            app.classList.remove('is-correct', 'is-wrong');
            app.classList.add(isCorrect ? 'is-correct' : 'is-wrong');
        }

        if (statusMsg) {
            statusMsg.innerText = message ?? (isCorrect ? 'Correct! 🎉' : 'Try again! ❌');
        }
    },

    clearFeedback() {
        const app = getEl('app');
        const input = getEl('answer-input');
        const statusMsg = getEl('status-msg');
        const helpDisplay = getEl('help-display');
        const helpBtn = getEl('help-btn');

        if (app) {
            app.classList.remove('is-correct', 'is-wrong');
        }

        if (statusMsg) {
            statusMsg.innerText = '';
        }

        if (helpDisplay) {
            helpDisplay.innerHTML = '';
            hideEl(helpDisplay);
        }

        if (helpBtn) {
            showEl(helpBtn);
        }

        if (input) {
            input.value = '';
            input.focus();
        }
    },

    setStatusMessage(message) {
        const statusMsg = getEl('status-msg');
        if (statusMsg) statusMsg.innerText = message;
    },

    showCorrectAnswer(answer) {
        const display = getEl('help-display');
        const button = getEl('help-btn');

        if (!display) return;

        display.innerHTML = `
            <h4>Correct Answer</h4>
            <p>${answer}</p>
            <p>Type the correct answer to continue.</p>
        `;

        showEl(display);
        hideEl(button);
    },

};