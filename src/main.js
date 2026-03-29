import '../style.css';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors } from '@mediapipe/drawing_utils';
import { FACEMESH_TESSELATION } from '@mediapipe/face_mesh';
import { 
    calculateCanthalTilt, calculateFwhr, calculateMidfaceRatio, 
    calculateFacialSymmetry, calculateGoldenRatio, assessPhotoQuality, 
    calculatePercentile 
} from './analysis.js';
import { getPixelCoords } from './geometry.js';

const videoElement = document.getElementById('webcam-video');
const canvasElement = document.getElementById('output-canvas');
const canvasCtx = canvasElement.getContext('2d');

let isScanning = false;
let scanStartTime = 0;
let scanDuration = 10000;
let scanBuffer = { canthal_tilt: [], fwhr: [], midface_ratio: [], facial_symmetry: [], golden_ratio: [] };
let finalResults = null;

function onResults(results) {
    // Set matching dimensions
    canvasElement.width = videoElement.videoWidth || 640;
    canvasElement.height = videoElement.videoHeight || 480;
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    const w = canvasElement.width;
    const h = canvasElement.height;

    let metrics = {};
    let warnings = [];

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Draw basic tesselation via mediapipe utility
        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });

        // Draw custom geometric overlay lines manually just like the python logic
        drawVisualGuides(canvasCtx, landmarks, w, h);

        metrics = {
            canthal_tilt: calculateCanthalTilt(landmarks, w, h),
            fwhr: calculateFwhr(landmarks, w, h),
            midface_ratio: calculateMidfaceRatio(landmarks, w, h),
            facial_symmetry: calculateFacialSymmetry(landmarks, w, h),
            golden_ratio: calculateGoldenRatio(landmarks, w, h)
        };
        
        warnings = assessPhotoQuality(landmarks, w, h);
    }
    
    // Process UI update
    updateUI(metrics, warnings);
    canvasCtx.restore();
}

function drawVisualGuides(ctx, landmarks, w, h) {
    const lCheek = getPixelCoords(landmarks, 234, w, h);
    const rCheek = getPixelCoords(landmarks, 454, w, h);
    const brow = getPixelCoords(landmarks, 168, w, h);
    const lip = getPixelCoords(landmarks, 0, w, h);
    
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#00ffff'; 
    ctx.beginPath();
    ctx.moveTo(lCheek[0], lCheek[1]);
    ctx.lineTo(rCheek[0], rCheek[1]);
    ctx.stroke();

    const centerX = (lCheek[0] + rCheek[0]) / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, brow[1]);
    ctx.lineTo(centerX, lip[1]);
    ctx.stroke();

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
    
    ctx.strokeStyle = '#32ff32'; 
    const nose = getPixelCoords(landmarks, 2, w, h);
    const chin = getPixelCoords(landmarks, 152, w, h);
    ctx.beginPath();
    ctx.moveTo(nose[0], nose[1]);
    ctx.lineTo(chin[0], chin[1]);
    ctx.stroke();
}

// MediaPipe FaceMesh Initialization
const faceMesh = new FaceMesh({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
}});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

faceMesh.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await faceMesh.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
camera.start().catch(err => {
    document.getElementById('metrics-container').innerHTML = '<div class="loading" style="color:red;">Error starting webcam. Allow permissions.</div>';
});

// UI Logic
function getMedian(arr) {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a,b) => a - b);
    return s[Math.floor(s.length/2)];
}

function updateUI(metrics, warnings) {
    const container = document.getElementById('metrics-container');
    const btn = document.getElementById('scan-btn');
    const overlay = document.getElementById('scan-overlay');
    const qualityMsg = document.getElementById('quality-msg');
    const liveDot = document.getElementById('live-dot');
    const liveText = document.getElementById('live-text');
    
    if (isScanning) {
        const elapsed = Date.now() - scanStartTime;
        const progress = Math.min(100, Math.floor((elapsed / scanDuration) * 100));
        
        if (metrics && Object.keys(metrics).length > 0) {
            scanBuffer.canthal_tilt.push(metrics.canthal_tilt);
            scanBuffer.fwhr.push(metrics.fwhr);
            scanBuffer.midface_ratio.push(metrics.midface_ratio);
            scanBuffer.facial_symmetry.push(metrics.facial_symmetry);
            scanBuffer.golden_ratio.push(metrics.golden_ratio);
        }
        
        btn.innerText = `SCANNING ${progress}%`;
        btn.classList.add('active');
        overlay.style.display = 'flex';
        
        if (elapsed >= scanDuration) {
            isScanning = false;
            btn.innerText = "START 10s SCAN";
            btn.classList.remove('active');
            overlay.style.display = 'none';
            
            finalResults = {
                canthal_tilt: getMedian(scanBuffer.canthal_tilt),
                fwhr: getMedian(scanBuffer.fwhr),
                midface_ratio: getMedian(scanBuffer.midface_ratio),
                facial_symmetry: getMedian(scanBuffer.facial_symmetry),
                golden_ratio: getMedian(scanBuffer.golden_ratio),
            };
        }
    }
    
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
    
    if (!displayData || Object.keys(displayData).length === 0) {
        if (!finalResults) {
            container.innerHTML = '<div class="loading">No face detected</div>';
        }
        return;
    }
    
    if (warnings && warnings.length > 0) {
        qualityMsg.innerText = "⚠ " + warnings[0];
        qualityMsg.style.color = "#ff4444";
    } else {
        qualityMsg.innerText = "✔ Excellent Conditions";
        qualityMsg.style.color = "#00ff88";
    }
    
    let html = '';
    const fields = [
        { key: 'canthal_tilt', label: 'Canthal Tilt', unit: '°' },
        { key: 'fwhr', label: 'FWHR', unit: '' },
        { key: 'midface_ratio', label: 'Midface Ratio', unit: '' },
        { key: 'facial_symmetry', label: 'Symmetry', unit: '%' },
        { key: 'golden_ratio', label: 'Golden Ratio', unit: '%' }
    ];

    fields.forEach(field => {
        const valstr = (displayData[field.key] || 0).toFixed(2);
        const val = parseFloat(valstr);
        const rating = getRating(field.key, val);
        const percentileNum = calculatePercentile(field.key, val);
        const percentileStr = `You're in the ${percentileNum}th percentile`;

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

    container.innerHTML = html;
}

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

function getPercent(key, val) {
    if (key === 'canthal_tilt') return Math.min(100, Math.max(0, (val + 10) * 5));
    if (key === 'fwhr') return Math.min(100, Math.max(0, (val - 1.5) * 100));
    if (key === 'midface_ratio') return Math.min(100, Math.max(0, (1.2 - val) * 200));
    return val; 
}

document.getElementById('scan-btn').addEventListener('click', () => {
    if (isScanning) return;
    scanBuffer = { canthal_tilt: [], fwhr: [], midface_ratio: [], facial_symmetry: [], golden_ratio: [] };
    finalResults = null;
    scanStartTime = Date.now();
    isScanning = true;
});
