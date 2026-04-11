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

    // Guard clause: Ensure we have a guess and active task data
    if (!guess || !state.currentTaskId || !state.currentStudent) return;

    // 1. Calculate the Credit Multiplier based on your rules:
    // Start with the penalty from wrong attempts (1.0, 0.5, 0.25, or 0.125)
    let finalMultiplier = state.maxCreditThisQuestion;

    // If they used help at any point, the current credit is halved
    if (state.usedHelpThisRound) {
        finalMultiplier *= 0.5;
    }

    ui.setLoading(true, 'Checking...');

    try {
        // 2. Call the Database RPC
        const result = await api.checkAnswer(
            state.currentTaskId,
            guess,
            state.currentStudent.id,
            finalMultiplier
        );

        if (!result) {
            ui.setLoading(false, 'Connection Error!');
            return;
        }

        // 3. Handle SUCCESS
        if (result.is_correct) {
            const feedbackMsg = state.isCorrectionMode 
                ? 'Correction accepted. (1/8 credit)' 
                : 'Correct! 🎉';

            ui.showFeedback(true, feedbackMsg);
            
            // Refresh mastery bars on the dashboard
            await refreshStudentDashboard();

            // Short delay so they see the green "Correct" state before the next question
            setTimeout(() => {
                startRound();
            }, 800);

            return;
        }

        // 4. Handle FAILURE
        // If they are in Correction Mode and still getting it wrong, don't change state
        if (state.isCorrectionMode) {
            ui.showFeedback(false, 'Type the correct answer to move on.');
            ui.setLoading(false, '');
            return;
        }

        // Standard Failure Path: Update state for the next attempt
        state.registerWrongAttempt();

        if (state.wrongAttemptsThisQuestion === 1) {
            // Wrong once: Penalty applied in state, ask again
            ui.showFeedback(false, 'Not quite—try again. (Max credit: 50%)');
            ui.setLoading(false, '');
        } 
        else if (state.wrongAttemptsThisQuestion === 2) {
            // Wrong twice: Force show help/hint
            state.markHelpUsed(); 
            ui.showHelpContent(state.currentCategory);
            ui.showFeedback(false, 'Still not quite. Look at the hint! (Max credit: 25%)');
            ui.setLoading(false, '');
        } 
        else {
            // Wrong 3 times: Correction Mode (Show answer)
            ui.showCorrectAnswer(state.currentExpectedAnswer);
            ui.showFeedback(false, 'Type the answer shown to continue. (Max credit: 12.5%)');
            ui.setLoading(false, '');
        }

    } catch (error) {
        console.error('Answer submission failed:', error);
        ui.setLoading(false, 'Error reaching server.');
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