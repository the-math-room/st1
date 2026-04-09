import { api } from './api.js';
import { ui } from './ui.js';
import { state } from './state.js';

const CONFIG = {
    MIN_CATEGORIES: 1,
    DELAY_CORRECT: 0,
    DELAY_WRONG: 0
};

const getEl = (id) => document.getElementById(id);

export async function initStudentApp(student) {
    state.setStudent(student);
    ui.toggleAuth(true, student);
    ui.setMode('selection');
    await refreshStudentDashboard();
}

export async function refreshStudentDashboard() {
    const student = state.currentStudent;

    if (!student || !student.class_id) {
        console.warn('Student has no class assigned.');
        return;
    }

    const curriculum = await api.getCurriculum(student.id, student.class_id);
    ui.renderMasteryCards(curriculum, state.selectedCategories);

    const startBtn = getEl('start-drill-btn');
    const instr = getEl('instruction-text');
    const isReady = state.selectedCategories.length >= CONFIG.MIN_CATEGORIES;

    ui.setStartButtonEnabled(isReady);
    ui.setInstructionText(isReady ? 'Ready to start! 🚀' : 'Select a category:');
}

export function toggleCategory(category) {
    if (state.isDrillActive) return;
    state.toggleCategory(category);
    refreshStudentDashboard();
}

export async function startDrill() {
    state.startDrill();
    ui.setMode('drill');
    await startRound();
}

export async function stopDrill() {
    state.stopDrill();
    ui.setMode('selection');
    await refreshStudentDashboard();
}

export async function startRound() {
    if (!state.isDrillActive) return;

    state.usedHelpThisRound = false;
    ui.clearFeedback();

    const question = await api.getRandomQuestion(state.selectedCategories);
    if (!question) {
        ui.setLoading(false, 'No questions found.');
        return;
    }

    state.setCurrentQuestion(question);
    ui.renderQuestion(question);

    const tag = getEl('category-tag');
    if (tag) tag.innerText = question.category;

    ui.setLoading(false, 'Ready!');
}

export async function submitAnswer() {
    const input = getEl('answer-input');
    const guess = input?.value?.trim();

    if (!guess || !state.currentTaskId || !state.currentStudent) return;

    ui.setLoading(true, 'Checking...');

    try {
        const result = await api.checkAnswer(
            state.currentTaskId,
            guess,
            state.currentStudent.id,
            state.usedHelpThisRound
        );

        if (!result) {
            ui.setLoading(false, 'Error!');
            return;
        }

        ui.showFeedback(result.is_correct);
        await refreshStudentDashboard();

        setTimeout(() => {
            startRound();
        }, result.is_correct ? CONFIG.DELAY_CORRECT : CONFIG.DELAY_WRONG);
    } catch (error) {
        console.error('Answer submission failed:', error);
        ui.setLoading(false, 'Error!');
    }
}

export function revealHelp() {
    if (!state.currentCategory) return;
    state.markHelpUsed();
    ui.showHelpContent(state.currentCategory);
}

export function handleQuestionAction(actionType) {
    ui.handleCustomAction(actionType);
}