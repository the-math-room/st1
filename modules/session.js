export const session = {
    key: 'math_session',

    getStudent() {
        const data = localStorage.getItem(this.key);
        return data ? JSON.parse(data) : null;
    },

    save(studentData) {
        localStorage.setItem(this.key, JSON.stringify(studentData));
    },

    clear() {
        localStorage.removeItem(this.key);
    }
};