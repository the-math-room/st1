export const medianRenderer = {
    render(questionObj) {
        const nums = questionObj.question.split(',').map(n => n.trim());
        return `
            <div class="median-wrapper">
                <p class="table-label">Original Data</p>
                <div class="dataset-table" id="original-dataset">
                    ${nums.map(n => `<div class="dataset-cell">${n}</div>`).join('')}
                </div>
                <div id="sorted-container" style="display: none;">
                    <p class="table-label">Sorted Data</p>
                    <div class="dataset-table" id="sorted-dataset"></div>
                </div>
                <button id="sort-btn" class="secondary-btn" data-action="sort">Sort Numbers</button>
            </div>`;
    },

    getHelp() {
        return `<h4>Finding the Median</h4><p>1. Sort numbers...</p>`;
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