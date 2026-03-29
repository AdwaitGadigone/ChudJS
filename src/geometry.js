export function getPixelCoords(landmarks, index, w, h) {
    const landmark = landmarks[index];
    return [Math.round(landmark.x * w), Math.round(landmark.y * h)];
}

export function calculateDistance(p1, p2) {
    return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
}

export function getInterpupillaryDistance(landmarks, w, h) {
    const lPupil = getPixelCoords(landmarks, 468, w, h);
    const rPupil = getPixelCoords(landmarks, 473, w, h);
    return calculateDistance(lPupil, rPupil);
}

export function normalizeFaceRotation(landmarks, w, h) {
    const lEye = getPixelCoords(landmarks, 33, w, h);
    const rEye = getPixelCoords(landmarks, 263, w, h);
    const dx = rEye[0] - lEye[0];
    const dy = rEye[1] - lEye[1];
    return (Math.atan2(dy, dx) * 180.0) / Math.PI;
}
