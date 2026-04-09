export const state = {
    currentTaskId: null,
    currentCategory: null,
    currentExpectedAnswer: null,
    selectedCategories: [],
    isDrillActive: false,
    usedHelpThisRound: false,
    currentStudent: null,

    wrongAttemptsThisQuestion: 0,
    maxCreditThisQuestion: 1.0,
    isCorrectionMode: false,

    setStudent(student) {
        this.currentStudent = student;
    },

    clearStudent() {
        this.currentStudent = null;
    },

    resetRound() {
        this.currentTaskId = null;
        this.currentCategory = null;
        this.currentExpectedAnswer = null;
        this.usedHelpThisRound = false;
        this.wrongAttemptsThisQuestion = 0;
        this.maxCreditThisQuestion = 1.0;
        this.isCorrectionMode = false;
    },

    setCurrentQuestion(question) {
        this.currentTaskId = question?.id ?? null;
        this.currentCategory = question?.category ?? null;
        this.currentExpectedAnswer = question?.expected_answer ?? null;
        this.usedHelpThisRound = false;
        this.wrongAttemptsThisQuestion = 0;
        this.maxCreditThisQuestion = 1.0;
        this.isCorrectionMode = false;
    },

    toggleCategory(category) {
        if (this.selectedCategories.includes(category)) {
            this.selectedCategories = this.selectedCategories.filter(c => c !== category);
        } else {
            this.selectedCategories = [...this.selectedCategories, category];
        }
    },

    clearSelectedCategories() {
        this.selectedCategories = [];
    },

    startDrill() {
        this.isDrillActive = true;
    },

    stopDrill() {
        this.isDrillActive = false;
        this.resetRound();
    },

    markHelpUsed() {
        this.usedHelpThisRound = true;
    },

    registerWrongAttempt() {
        this.wrongAttemptsThisQuestion += 1;

        if (this.wrongAttemptsThisQuestion === 1) {
            this.maxCreditThisQuestion = 0.5;
        } else if (this.wrongAttemptsThisQuestion === 2) {
            this.maxCreditThisQuestion = 0.25;
        } else {
            this.maxCreditThisQuestion = 0.125;
            this.isCorrectionMode = true;
        }
    }
};