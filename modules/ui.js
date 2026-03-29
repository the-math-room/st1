export const ui = {
    elements: {
        loginScreen: document.getElementById('login-screen'),
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

    renderQuestion(questionObj) {
        const helpBtnHtml = `<button id="help-btn" class="secondary-btn" style="margin-top: 10px;">How do I do this?</button>`;
        const helpBoxHtml = `<div id="help-display" style="display: none;" class="help-box"></div>`;

        if (questionObj.category === 'median') {
            const nums = questionObj.question.split(',').map(n => n.trim());
            this.elements.question.innerHTML = `
                <div class="median-wrapper">
                    <p class="table-label">Original Data</p>
                    <div class="dataset-table" id="original-dataset">
                        ${nums.map(n => `<div class="dataset-cell">${n}</div>`).join('')}
                    </div>
                    <div id="sorted-container" style="display: none;">
                        <p class="table-label">Sorted Data</p>
                        <div class="dataset-table" id="sorted-dataset"></div>
                    </div>
                    <button id="sort-btn" class="secondary-btn">Sort Numbers</button>
                    ${helpBtnHtml} ${helpBoxHtml}
                </div>`;
        } else {
            this.elements.question.innerHTML = `<div>${questionObj.question}</div> ${helpBtnHtml} ${helpBoxHtml}`;
        }
    },

    showHelpContent(category) {
        const display = document.getElementById('help-display');
        const btn = document.getElementById('help-btn');
        if (category === 'median') {
            display.innerHTML = `
                <h4>Finding the Median</h4>
                <p><strong>1. Sort</strong> numbers from least to greatest.</p>
                <p><strong>2. Odd Set:</strong> Pick the exact middle.</p>
                <p><strong>3. Even Set:</strong> Average the 2 middle numbers.</p>
            `;
        } else {
            display.innerHTML = `<p>Use your mental math strategies for ${category}!</p>`;
        }
        display.style.display = 'block';
        if (btn) btn.style.display = 'none';
    },

    showSortedData() {
        const cells = Array.from(document.querySelectorAll('#original-dataset .dataset-cell'));
        const sortedValues = cells.map(c => parseFloat(c.innerText)).sort((a,b) => a - b);
        document.getElementById('sorted-dataset').innerHTML = sortedValues
            .map(n => `<div class="dataset-cell sorted-cell">${n}</div>`).join('');
        document.getElementById('sorted-container').style.display = 'block';
        document.getElementById('sort-btn').style.display = 'none';
    },

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