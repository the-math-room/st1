export const medianRenderer = {
    render(data) {
        // data.numbers is already an array! No more .split(',')
        return `
            <div class="dataset-table">
                ${data.numbers.map(n => `<div class="dataset-cell">${n}</div>`).join('')}
            </div>
        `;
    },

    getHelp() {
        return `<h4>Finding the Median</h4>
                    <p>1. Sort the numbers</p>
                    <p>2. Choose the middle number. (If there are 5 numbers, choose the third. If there are 6 numbers, choose the third and fourth</p>
                    <p>3. If you have two "middle numbers", add them together and divide by 2</p>
        `;
    },

    // This is the new "specialized logic" bucket
    handleAction(actionType) {
        if (actionType === 'sort') {
            const cells = Array.from(document.querySelectorAll('#original-dataset .dataset-cell'));
            if (!cells.length) return;
            
            const sortedValues = cells.map(c => parseFloat(c.innerText)).sort((a, b) => a - b);
            document.getElementById('sorted-dataset').innerHTML = sortedValues
                .map(n => `<div class="dataset-cell sorted-cell">${n}</div>`).join('');
            document.getElementById('sorted-container').style.display = 'block';
            document.getElementById('sort-btn').style.display = 'none';
        }
    }
};