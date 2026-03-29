import '../style.css'; // Load our website's visual styles
import { inject } from '@vercel/analytics'; // Load Vercel traffic tracking

inject(); // Start tracking visitors behind the scenes

import { 
    calculateCanthalTilt, calculateFwhr, calculateMidfaceRatio, 
    calculateFacialSymmetry, calculateGoldenRatio, assessPhotoQuality, 
    calculatePercentile 
} from './analysis.js';
import { getPixelCoords } from './geometry.js';

// Grab the HTML elements where the webcam and drawing board (canvas) live
const videoElement = document.getElementById('webcam-video');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');

// Variables to keep track of the 10-second scan process
let isScanning = false;
let scanStartTime = 0;
let scanDuration = 10000; // 10,000 milliseconds = 10 seconds
let scanBuffer = { canthal_tilt: [], fwhr: [], midface_ratio: [], facial_symmetry: [], golden_ratio: [] };
let finalResults = null;

// This function runs EVERY TIME a new frame from the webcam is completely analyzed (approx 60 times a second)!
function onResults(results) {
    // Make sure the drawing canvas is the exact same size as the webcam video so lines don't get misaligned
    canvasElement.width = videoElement.videoWidth || 640;
    canvasElement.height = videoElement.videoHeight || 480;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height); // Wipe the previous frame's drawings

    const w = canvasElement.width;
    const h = canvasElement.height;

    let metrics = {};
    let warnings = [];

    // If the AI actually detects a face in the camera...
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0]; // Grab the 468 dots on the first face

        // Draw the silver spiderweb dot-mesh over the entire face
        window.drawConnectors(canvasCtx, landmarks, window.FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });

        // Draw our custom neon geometric hacker lines (the blue/green boxes)
        drawVisualGuides(canvasCtx, landmarks, w, h);

        // Calculate all their facial statistics
        metrics = {
            canthal_tilt: calculateCanthalTilt(landmarks, w, h),
            fwhr: calculateFwhr(landmarks, w, h),
            midface_ratio: calculateMidfaceRatio(landmarks, w, h),
            facial_symmetry: calculateFacialSymmetry(landmarks, w, h),
            golden_ratio: calculateGoldenRatio(landmarks, w, h)
        };
        
        // Check if their lighting or distance is bad
        warnings = assessPhotoQuality(landmarks, w, h);
    }
    
    // Update the numbers and text on the screen
    updateUI(metrics, warnings);
    canvasCtx.restore();
}

// Function to draw the cool tech lines on top of the webcam feed
function drawVisualGuides(ctx, landmarks, w, h) {
    const lCheek = getPixelCoords(landmarks, 234, w, h);
    const rCheek = getPixelCoords(landmarks, 454, w, h);
    const brow = getPixelCoords(landmarks, 168, w, h);
    const lip = getPixelCoords(landmarks, 0, w, h);
    
    // Draw the Cyan line for Face Width (Cheek to Cheek)
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ffff'; 
    ctx.beginPath();
    ctx.moveTo(lCheek[0], lCheek[1]);
    ctx.lineTo(rCheek[0], rCheek[1]);
    ctx.stroke();

    // Draw the Cyan line for Face Height (Brow to Lip)
    const centerX = (lCheek[0] + rCheek[0]) / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, brow[1]);
    ctx.lineTo(centerX, lip[1]);
    ctx.stroke();

    // Draw Blue lines for the Eye Tilts
    ctx.strokeStyle = '#0064ff'; 
    const lIn = getPixelCoords(landmarks, 133, w, h);
    const lOut = getPixelCoords(landmarks, 33, w, h);
    const rIn = getPixelCoords(landmarks, 362, w, h);
    const rOut = getPixelCoords(landmarks, 263, w, h);
    ctx.beginPath();
    ctx.moveTo(lIn[0], lIn[1]); ctx.lineTo(lOut[0], lOut[1]);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rIn[0], rIn[1]); ctx.lineTo(rOut[0], rOut[1]);
    ctx.stroke();
    
    // Draw the Green line for perfect Center Symmetry
    ctx.strokeStyle = '#32ff32'; 
    const nose = getPixelCoords(landmarks, 2, w, h);
    const chin = getPixelCoords(landmarks, 152, w, h);
    ctx.beginPath();
    ctx.moveTo(nose[0], nose[1]);
    ctx.lineTo(chin[0], chin[1]);
    ctx.stroke();
}

// Set up Google's MediaPipe AI model (loaded directly from the internet so it doesn't crash)
const faceMesh = new window.FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});

// Configure the AI settings
faceMesh.setOptions({
    maxNumFaces: 1, // Only track 1 person at a time
    refineLandmarks: true, // Needed for accurate pupil/eye tracking
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

// Tell the AI to run `onResults` whenever it is done processing a frame
faceMesh.onResults(onResults);

// --- Custom Webcam Engine ---
let lastVideoTime = -1;
// This creates an infinite loop that constantly pushes the webcam video to the AI
async function processVideo() {
    if (videoElement.readyState >= 2) { // If video is actually loaded
        if (videoElement.currentTime !== lastVideoTime) { // If it's a new frame
            lastVideoTime = videoElement.currentTime;
            await faceMesh.send({ image: videoElement }); // Send frame to AI
        }
    }
    requestAnimationFrame(processVideo); // Loop again as fast as the screen can refresh
}

// Start the webcam! { video: true } ensures it works on all devices without crashing on weird laptop sizes.
navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
            videoElement.play(); // Turn on the video
            requestAnimationFrame(processVideo); // Start the infinite loop
        };
    })
    .catch((err) => { // If they reject the camera or don't have one
        document.getElementById('metrics-container').innerHTML = `<div class="loading" style="color:red; margin-top: 40px;">Error: Camera access blocked. ${err.message}</div>`;
        console.error("Camera error:", err);
    });

// --- User Interface Controller ---

// Helper function to find the "median" (middle) value of an array of numbers
function getMedian(arr) {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a,b) => a - b);
    return s[Math.floor(s.length/2)];
}

// Updates the HTML text and progress bars on the right side of the screen
function updateUI(metrics, warnings) {
    const container = document.getElementById('metrics-container');
    const btn = document.getElementById('scan-btn');
    const overlay = document.getElementById('scan-overlay');
    const qualityMsg = document.getElementById('quality-msg');
    const liveDot = document.getElementById('live-dot');
    const liveText = document.getElementById('live-text');
    
    // If they clicked the Scan button, we start saving all the metrics every frame
    if (isScanning) {
        const elapsed = Date.now() - scanStartTime;
        const progress = Math.min(100, Math.floor((elapsed / scanDuration) * 100)); // Calculate 0-100%
        
        // Save the metrics into our memory buffer
        if (metrics && Object.keys(metrics).length > 0) {
            scanBuffer.canthal_tilt.push(metrics.canthal_tilt);
            scanBuffer.fwhr.push(metrics.fwhr);
            scanBuffer.midface_ratio.push(metrics.midface_ratio);
            scanBuffer.facial_symmetry.push(metrics.facial_symmetry);
            scanBuffer.golden_ratio.push(metrics.golden_ratio);
        }
        
        btn.innerText = `SCANNING ${progress}%`;
        btn.classList.add('active'); // Make button glow
        overlay.style.display = 'flex'; // Show the "ANALYZING" movie effect
        
        // When 10 seconds is up...
        if (elapsed >= scanDuration) {
            isScanning = false;
            btn.innerText = "START 10s SCAN";
            btn.classList.remove('active');
            overlay.style.display = 'none';
            
            // Average all the frames together to get the most accurate, jitter-free results!
            finalResults = {
                canthal_tilt: getMedian(scanBuffer.canthal_tilt),
                fwhr: getMedian(scanBuffer.fwhr),
                midface_ratio: getMedian(scanBuffer.midface_ratio),
                facial_symmetry: getMedian(scanBuffer.facial_symmetry),
                golden_ratio: getMedian(scanBuffer.golden_ratio),
            };
        }
    }
    
    // Decide whether to show the Live jittery data or the Locked frozen data
    let displayData = finalResults ? finalResults : metrics;
    
    if (finalResults) {
        liveDot.style.background = 'cyan';
        liveDot.style.boxShadow = '0 0 8px cyan';
        liveText.innerText = 'LOCKED RESULT';
        liveText.style.color = 'cyan';
    } else {
        liveDot.style.background = 'var(--accent-good)';
        liveDot.style.boxShadow = '0 0 8px var(--accent-good)';
        liveText.innerText = 'LIVE';
        liveText.style.color = 'var(--accent-good)';
    }
    
    // If nobody is in front of the camera
    if (!displayData || Object.keys(displayData).length === 0) {
        if (!finalResults) {
            container.innerHTML = '<div class="loading">No face detected</div>';
        }
        return;
    }
    
    // Display our warnings
    if (warnings && warnings.length > 0) {
        qualityMsg.innerText = "⚠ " + warnings[0];
        qualityMsg.style.color = "#ff4444";
    } else {
        qualityMsg.innerText = "✔ Excellent Conditions";
        qualityMsg.style.color = "#00ff88"; // Green!
    }
    
    // Construct the HTML for the score cards!
    let html = '';
    const fields = [
        { key: 'canthal_tilt', label: 'Canthal Tilt', unit: '°' },
        { key: 'fwhr', label: 'FWHR', unit: '' },
        { key: 'midface_ratio', label: 'Midface Ratio', unit: '' },
        { key: 'facial_symmetry', label: 'Symmetry', unit: '%' },
        { key: 'golden_ratio', label: 'Golden Ratio', unit: '%' }
    ];

    fields.forEach(field => {
        const valstr = (displayData[field.key] || 0).toFixed(2); // Fix to 2 decimals
        const val = parseFloat(valstr);
        const rating = getRating(field.key, val); // Convert score into text ("HUNTER", "BROAD", etc)
        const percentileNum = calculatePercentile(field.key, val); // Convert score into Top 10%, etc
        const percentileStr = `You're in the ${percentileNum}th percentile`;

        // Add the physical HTML card for this trait
        html += `
            <div class="metric-card">
                <div class="metric-header">
                    <span class="metric-label">${field.label}</span>
                    <span class="metric-rating ${rating.className}">${rating.text}</span>
                </div>
                <div class="metric-value">
                    ${valstr}<span class="unit">${field.unit}</span>
                </div>
                <div class="metric-percentile" style="font-size: 0.8rem; color: #888; margin-top: 4px;">
                    ${percentileStr}
                </div>
                <div class="progress-bg">
                    <div class="progress-bar ${rating.className}" style="width: ${getPercent(field.key, val)}%"></div>
                </div>
            </div>
        `;
    });

    // Push the HTML to the website
    container.innerHTML = html;
}

// Maps numerical scores to English words
function getRating(key, val) {
    if (key === 'canthal_tilt') {
        if (val >= 4) return { text: 'HUNTER', className: 'good' };
        if (val >= 0) return { text: 'NEUTRAL', className: 'avg' };
        return { text: 'NEGATIVE', className: 'bad' };
    }
    if (key === 'fwhr') {
        if (val >= 1.9) return { text: 'BROAD', className: 'good' };
        if (val >= 1.7) return { text: 'AVERAGE', className: 'avg' };
        return { text: 'NARROW', className: 'bad' };
    }
    if (key === 'midface_ratio') {
        if (val <= 0.95) return { text: 'COMPACT', className: 'good' };
        if (val <= 1.05) return { text: 'BALANCED', className: 'avg' };
        return { text: 'LONG', className: 'bad' };
    }
    if (key === 'facial_symmetry') {
        if (val >= 90) return { text: 'EXCELLENT', className: 'good' };
        if (val >= 80) return { text: 'GOOD', className: 'avg' };
        return { text: 'ASYMMETRY', className: 'bad' };
    }
    if (key === 'golden_ratio') {
        if (val >= 90) return { text: 'DIVINE', className: 'good' };
        if (val >= 80) return { text: 'GOOD', className: 'avg' };
        return { text: 'AVERAGE', className: 'bad' };
    }
    return { text: '', className: '' };
}

// Used to visually animate the little progress-bars under each stat
function getPercent(key, val) {
    if (key === 'canthal_tilt') return Math.min(100, Math.max(0, (val + 10) * 5));
    if (key === 'fwhr') return Math.min(100, Math.max(0, (val - 1.5) * 100));
    if (key === 'midface_ratio') return Math.min(100, Math.max(0, (1.2 - val) * 200));
    return val; 
}

// Waits for the user to hit the big "START SCAN" button
document.getElementById('scan-btn').addEventListener('click', () => {
    if (isScanning) return; // Prevent clicking it twice
    scanBuffer = { canthal_tilt: [], fwhr: [], midface_ratio: [], facial_symmetry: [], golden_ratio: [] };
    finalResults = null;
    scanStartTime = Date.now();
    isScanning = true;
});
