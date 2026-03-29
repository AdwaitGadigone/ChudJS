// This file does the hard math to calculate facial traits like Symmetry, Canthal Tilt, and FWHR!

import { getPixelCoords, calculateDistance, getInterpupillaryDistance, normalizeFaceRotation } from './geometry.js';

// Here we define the "Average" (mean) and the "Spread" (standard deviation) for a normal human dataset.
// This helps us calculate if someone is in the top 1%, 10%, etc.
export const REFERENCE_STATS = {
    'canthal_tilt': { mean: 4.0, std: 3.0 },
    'fwhr': { mean: 1.9, std: 0.15 },
    'midface_ratio': { mean: 1.0, std: 0.1 },
    'facial_symmetry': { mean: 92.0, std: 4.0 },
    'golden_ratio': { mean: 85.0, std: 5.0 }
};

// 1. Canthal Tilt: Measures the upward or downward slant of your eyes
export function calculateCanthalTilt(landmarks, w, h) {
    // First, subtract the tilt of the head itself so we don't get fake results if they lean!
    const faceRotation = normalizeFaceRotation(landmarks, w, h);
    
    // Get the inner and outer corners of both eyes
    const lInner = getPixelCoords(landmarks, 133, w, h);
    const lOuter = getPixelCoords(landmarks, 33, w, h);
    const rInner = getPixelCoords(landmarks, 362, w, h);
    const rOuter = getPixelCoords(landmarks, 263, w, h);
    
    // Calculate the physical slant angle of the left eye and the right eye
    const lAngle = (Math.atan2(lInner[1] - lOuter[1], lOuter[0] - lInner[0]) * 180) / Math.PI;
    const rAngle = (Math.atan2(rInner[1] - rOuter[1], rOuter[0] - rInner[0]) * 180) / Math.PI;
    
    // Find the average tilt of both eyes, and subtract the head rotation
    const avgTilt = (lAngle + rAngle) / 2;
    return Number((avgTilt - faceRotation).toFixed(2));
}

// 2. FWHR (Facial Width to Height Ratio): How broad the face is compared to its height
export function calculateFwhr(landmarks, w, h) {
    const cheekLeft = getPixelCoords(landmarks, 234, w, h);
    const cheekRight = getPixelCoords(landmarks, 454, w, h);
    const width = calculateDistance(cheekLeft, cheekRight); // Ear-to-ear width
    
    const brow = getPixelCoords(landmarks, 168, w, h);
    const upperLip = getPixelCoords(landmarks, 0, w, h);
    const height = calculateDistance(brow, upperLip); // Brow-to-lip height
    
    // Return Width divided by Height
    return height > 0 ? Number((width / height).toFixed(2)) : 0;
}

// 3. Midface Ratio: The compactness of the face between the eyes and the mouth
export function calculateMidfaceRatio(landmarks, w, h) {
    const ipd = getInterpupillaryDistance(landmarks, w, h); // Distance between eyes
    
    const lPupil = getPixelCoords(landmarks, 468, w, h);
    const rPupil = getPixelCoords(landmarks, 473, w, h);
    const pupilY = (lPupil[1] + rPupil[1]) / 2; // Average eye height
    
    const upperLip = getPixelCoords(landmarks, 0, w, h);
    const midfaceHeight = Math.abs(upperLip[1] - pupilY); // Distance from eyes to lip
    
    return ipd > 0 ? Number((midfaceHeight / ipd).toFixed(2)) : 0;
}

// 4. Facial Symmetry: How identical the left side is to the right side
export function calculateFacialSymmetry(landmarks, w, h) {
    // We check Pairs of points: [Outer Eyes], [Inner Eyes], [Cheeks], [Mouth corners]
    const pairs = [[33, 263], [133, 362], [234, 454], [61, 291], [58, 288]];
    const top = getPixelCoords(landmarks, 168, w, h); // Forehead
    const bottom = getPixelCoords(landmarks, 152, w, h); // Chin
    
    // Draw an invisible line down the center of the face
    const axisVec = [bottom[0] - top[0], bottom[1] - top[1]];
    const axisLen = Math.hypot(axisVec[0], axisVec[1]);
    if (axisLen === 0) return 0;
    const axisUnit = [axisVec[0] / axisLen, axisVec[1] / axisLen];
    
    let scores = [];
    for (const [lId, rId] of pairs) {
        // Find how far the left point and right point are from the center line
        const lPt = getPixelCoords(landmarks, lId, w, h);
        const rPt = getPixelCoords(landmarks, rId, w, h);
        const lVec = [lPt[0] - top[0], lPt[1] - top[1]];
        const rVec = [rPt[0] - top[0], rPt[1] - top[1]];
        
        const lProj = (lVec[0] * axisUnit[0]) + (lVec[1] * axisUnit[1]);
        const rProj = (rVec[0] * axisUnit[0]) + (rVec[1] * axisUnit[1]);
        
        const lDist = Math.hypot(lVec[0] - lProj * axisUnit[0], lVec[1] - lProj * axisUnit[1]);
        const rDist = Math.hypot(rVec[0] - rProj * axisUnit[0], rVec[1] - rProj * axisUnit[1]);
        
        // Calculate the percentage difference. 100% means perfectly mirrored!
        const denom = (lDist + rDist) / 2;
        if (denom > 0) {
            const diff = Math.abs(lDist - rDist) / denom;
            scores.push(Math.max(0, 1 - diff));
        }
    }
    
    if (scores.length === 0) return 0;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    return Number((mean * 100).toFixed(1));
}

// 5. Golden Ratio (1.618): The "divine proportion" found in nature and art
export function calculateGoldenRatio(landmarks, w, h) {
    const p1 = getPixelCoords(landmarks, 168, w, h); // Forehead
    const p2 = getPixelCoords(landmarks, 2, w, h); // Nose bridge
    const p3 = getPixelCoords(landmarks, 152, w, h); // Chin
    
    const midFace = calculateDistance(p1, p2);
    const lowerFace = calculateDistance(p2, p3);
    
    if (lowerFace === 0) return 0;
    const ratio = midFace / lowerFace;
    const deviation = Math.abs(1.0 - ratio); // How far it is from the perfect ratio
    
    return Number((Math.max(0, 100 * (1 - deviation))).toFixed(1));
}

// 6. Photo Quality: Checks if the user is too close, too far, or looking away
export function assessPhotoQuality(landmarks, w, h) {
    const warnings = [];
    const faceWidth = calculateDistance(
        getPixelCoords(landmarks, 234, w, h),
        getPixelCoords(landmarks, 454, w, h)
    );
    const faceWidthRatio = faceWidth / w;
    
    // Tell them to move closer or further for the most accurate scan
    if (faceWidthRatio < 0.20) warnings.push("Move closer");
    else if (faceWidthRatio > 0.70) warnings.push("Too close");
    
    // Check if their head is in the middle of the screen
    const faceCenterX = landmarks[1].x;
    if (Math.abs(faceCenterX - 0.5) > 0.15) warnings.push("Center face");
    
    // Check if they are tilting their head too much
    const rotation = Math.abs(normalizeFaceRotation(landmarks, w, h));
    if (rotation > 10) warnings.push("Look straight");
    
    return warnings;
}

// A complex math function (Error Function) used to calculate Bell-Curve Percentiles
function erf(x) {
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    let sign = (x < 0) ? -1 : 1;
    x = Math.abs(x);
    const t = 1.0 / (1.0 + p * x);
    // Turns a raw score into a smooth percentage
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
}

// 7. Percentile Calculator: Figures out if you are in the 10th percentile or 99th percentile!
export function calculatePercentile(metric, value) {
    const stats = REFERENCE_STATS[metric]; // Grab the average stats
    if (!stats) return 50; // Default to average
    
    // Find how many "Standard Deviations" away from the average they are
    const zScore = (value - stats.mean) / stats.std;
    
    // Use the error function to map that deviation onto a 1-100 percentage
    const percentile = ((1.0 + erf(zScore / Math.sqrt(2.0))) / 2.0) * 100;
    
    return Math.round(percentile);
}
