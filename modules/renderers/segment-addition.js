/**
 * segment_addition.js
 * Expected JSON data structure: 
 * { "ab": 7, "bc": "2x+1", "ac": 20, "unknown": "ab" }
 */

export const segmentAdditionRenderer = {
    render(data) {
        // We use data.target because that's what your JSON has!
        const unknownKey = data.target || data.unknown || 'ac'; 
        
        const display = {
            ab: unknownKey === 'ab' ? 'x' : data.ab,
            bc: unknownKey === 'bc' ? 'x' : data.bc,
            ac: unknownKey === 'ac' ? 'x' : data.ac
        };

        return `
            <div class="segment-problem-container">
                <div class="segment-diagram">
                    <div class="segment-label-row">
                        <div class="label-part" style="flex: 40%;">${display.ab}</div>
                        <div class="label-part" style="flex: 60%;">${display.bc}</div>
                    </div>
                    <div class="segment-line-base">
                        <div class="point-marker marker-a"><span>A</span></div>
                        <div class="line-segment" style="flex: 40%;"></div>
                        <div class="point-marker marker-b"><span>B</span></div>
                        <div class="line-segment" style="flex: 60%;"></div>
                        <div class="point-marker marker-c"><span>C</span></div>
                    </div>
                    <div class="segment-total-row">
                        <div class="total-value">Total ($AC$): ${display.ac}</div>
                    </div>
                </div>
                <p class="question-prompt">
                    Find the value of <strong>${unknownKey.toUpperCase()}</strong>.
                </p>
            </div>
        `;
    },

    getHelp() {
        const videoUrl = "https://ergnepineyloreezwqym.supabase.co/storage/v1/object/public/math_captures/segment_addition_postulate.mp4";
        const vttUrl = "https://ergnepineyloreezwqym.supabase.co/storage/v1/object/public/math_captures/segment_addition_postulate.vtt";

        return `
            <h4>Segment Addition Help</h4>
            <div class="video-container">
                <video id="help-video" controls width="100%" crossorigin="anonymous">
                    <source src="${videoUrl}" type="video/mp4">
                    <track 
                        label="English" 
                        kind="subtitles" 
                        srclang="en" 
                        src="${vttUrl}" 
                        default>
                    Your browser does not support the video tag.
                </video>
            </div>
            <p class="help-text">
                <strong>Postulate:</strong> If point B is on line segment AC, then:
                <br><center>AB + BC = AC</center>
            </p>
        `;
    }
};