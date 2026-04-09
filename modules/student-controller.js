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
    ui.showStudentView();
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

    ui.clearFeedback();

    const question = await api.getRandomQuestion(state.selectedCategories);
    if (!question) {
        ui.setLoading(false, 'No questions found.');
        return;
    }

    state.setCurrentQuestion(question);
    ui.renderQuestion(question);
    ui.setCategoryTag(question.category);
    ui.setLoading(false, 'Ready!');
}

export async function submitAnswer() {
    const input = getEl('answer-input');
    const guess = input?.value?.trim();

    if (!guess || !state.currentTaskId || !state.currentStudent) return;

    if (state.isCorrectionMode) {
        if (guess === state.currentExpectedAnswer) {
            ui.setLoading(true, 'Saving...');

            try {
                const result = await api.checkAnswer(
                    state.currentTaskId,
                    guess,
                    state.currentStudent.id,
                    state.maxCreditThisQuestion
                );

                if (!result) {
                    ui.setLoading(false, 'Error!');
                    return;
                }

                ui.showFeedback(true, 'Corrected — moving on.');
                await refreshStudentDashboard();

                setTimeout(() => {
                    startRound();
                }, 250);
            } catch (error) {
                console.error('Correction submission failed:', error);
                ui.setLoading(false, 'Error!');
            }

            return;
        }

        ui.showFeedback(false, 'Type the correct answer to continue.');
        ui.setLoading(false, '');
        return;
    }

    ui.setLoading(true, 'Checking...');

    try {
        const result = await api.checkAnswer(
            state.currentTaskId,
            guess,
            state.currentStudent.id,
            state.maxCreditThisQuestion
        );

        if (!result) {
            ui.setLoading(false, 'Error!');
            return;
        }

        if (result.is_correct) {
            ui.showFeedback(true, 'Correct! 🎉');
            await refreshStudentDashboard();

            setTimeout(() => {
                startRound();
            }, result.is_correct ? CONFIG.DELAY_CORRECT : CONFIG.DELAY_WRONG);

            return;
        }

        state.registerWrongAttempt();

        if (state.wrongAttemptsThisQuestion === 1) {
            ui.showFeedback(false, 'Not quite — try again. Max credit is now 50%.');
            ui.setLoading(false, '');
            return;
        }

        if (state.wrongAttemptsThisQuestion === 2) {
            state.markHelpUsed();
            ui.showHelpContent(state.currentCategory);
            ui.showFeedback(false, 'Still not quite — here’s a hint. Max credit is now 25%.');
            ui.setLoading(false, '');
            return;
        }

        ui.showCorrectAnswer(state.currentExpectedAnswer);
        ui.showFeedback(false, 'Type the correct answer to continue. Max credit is now 12.5%.');
        ui.setLoading(false, '');
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