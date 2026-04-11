export const defaultRenderer = {
    render(data) {
        return `<div>${data.text}</div>`;
    },
    getHelp(category) {
        return `<p>Not Applicable</p>`;
    }
};