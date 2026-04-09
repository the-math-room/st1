export const state = {
    currentTaskId: null,
    currentCategory: null,
    selectedCategories: [],
    isDrillActive: false,
    usedHelpThisRound: false,
    currentStudent: null,

    setStudent(student) {
        this.currentStudent = student;
    },

    clearStudent() {
        this.currentStudent = null;
    },

    resetRound() {
        this.currentTaskId = null;
        this.currentCategory = null;
        this.usedHelpThisRound = false;
    },

    setCurrentQuestion(question) {
        this.currentTaskId = question?.id ?? null;
        this.currentCategory = question?.category ?? null;
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
    }
};