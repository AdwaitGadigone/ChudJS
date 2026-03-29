// This file handles all the basic 2D math for finding where parts of the face are on the screen!

// 1. Converts the AI's decimal coordinates (like 0.5) into actual screen pixels (like 320px)
export function getPixelCoords(landmarks, index, w, h) {
    const landmark = landmarks[index]; // Get the specific face dot (e.g. index 33 for the eye)
    return [Math.round(landmark.x * w), Math.round(landmark.y * h)];
}

// 2. Calculates the straight-line distance between two points using the Pythagorean theorem (a^2 + b^2 = c^2)
export function calculateDistance(p1, p2) {
    return Math.hypot(p1[0] - p2[0], p1[1] - p2[1]);
}

// 3. Gets the distance between the left pupil (468) and right pupil (473)
export function getInterpupillaryDistance(landmarks, w, h) {
    const lPupil = getPixelCoords(landmarks, 468, w, h);
    const rPupil = getPixelCoords(landmarks, 473, w, h);
    return calculateDistance(lPupil, rPupil);
}

// 4. Finds out if the user's head is tilted sideways by drawing an imaginary line between the two eyes
export function normalizeFaceRotation(landmarks, w, h) {
    const lEye = getPixelCoords(landmarks, 33, w, h);
    const rEye = getPixelCoords(landmarks, 263, w, h);
    
    // Find the difference in X and Y
    const dx = rEye[0] - lEye[0];
    const dy = rEye[1] - lEye[1];
    
    // Math.atan2 gives us the angle in radians, so we convert it to degrees (0 to 360)
    return (Math.atan2(dy, dx) * 180.0) / Math.PI;
}
