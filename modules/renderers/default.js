export const defaultRenderer = {
    render(questionObj) {
        return `<div>${questionObj.question}</div>`;
    },
    getHelp(category) {
        return `<p>Not Applicable</p>`;
    }
};