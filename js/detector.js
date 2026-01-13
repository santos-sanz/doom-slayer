/**
 * Doom Slayer - Face Detection & Doomscroll Detection Module
 * Uses MediaPipe FaceMesh for accurate face landmark detection
 */

export class DoomscrollDetector {
    constructor(options = {}) {
        this.faceMesh = null;
        this.isInitialized = false;

        // Detection parameters (adjustable via settings)
        this.sensitivity = options.sensitivity || 0.55;
        this.detectionThreshold = options.detectionThreshold || 3;

        // State tracking for stability
        this.doomscrollCount = 0;
        this.normalCount = 0;
        this.currentState = 'monitoring';

        // Performance tracking
        this.lastDetectionTime = 0;
        this.fps = 0;

        // Baseline calibration
        this.baselineNoseY = null;
        this.calibrationFrames = 0;
        this.calibrationSum = 0;
    }

    /**
     * Initialize MediaPipe FaceMesh
     */
    async initialize() {
        try {
            console.log('Loading MediaPipe FaceMesh...');

            // Create FaceMesh instance
            this.faceMesh = new FaceMesh({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
                }
            });

            // Configure for performance
            this.faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            // Set up results handler
            this.latestResults = null;
            this.faceMesh.onResults((results) => {
                this.latestResults = results;
            });

            this.isInitialized = true;
            console.log('MediaPipe FaceMesh loaded successfully!');
            return true;
        } catch (error) {
            console.error('Failed to load FaceMesh:', error);
            return false;
        }
    }

    /**
     * Detect faces and analyze if user is doomscrolling
     * @param {HTMLVideoElement} video - The video element with webcam feed
     * @returns {Object} Detection result with state and debug info
     */
    async detectDoomscroll(video) {
        if (!this.isInitialized || !this.faceMesh) {
            return {
                isLookingDown: false,
                state: 'error',
                message: 'Model not initialized'
            };
        }

        const startTime = performance.now();

        try {
            // Send frame to FaceMesh
            await this.faceMesh.send({ image: video });

            // Calculate FPS
            const now = performance.now();
            this.fps = Math.round(1000 / (now - this.lastDetectionTime));
            this.lastDetectionTime = now;

            const results = this.latestResults;

            if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                return {
                    isLookingDown: false,
                    state: 'no-face',
                    message: 'No face detected',
                    fps: this.fps
                };
            }

            // Get landmarks (468 points for FaceMesh)
            const landmarks = results.multiFaceLandmarks[0];
            const frameHeight = video.videoHeight;
            const frameWidth = video.videoWidth;

            // Key landmark indices for head pose
            // Nose tip: 1, Chin: 152, Forehead: 10
            // Left eye: 33, Right eye: 263
            // Left ear: 234, Right ear: 454

            const noseTip = landmarks[1];
            const chin = landmarks[152];
            const forehead = landmarks[10];
            const leftEye = landmarks[33];
            const rightEye = landmarks[263];

            // Calculate head pose indicators
            const noseY = noseTip.y;
            const chinY = chin.y;
            const foreheadY = forehead.y;

            // Calibrate baseline on first frames with good posture
            if (this.calibrationFrames < 30 && this.currentState !== 'doomscrolling') {
                this.calibrationSum += noseY;
                this.calibrationFrames++;
                if (this.calibrationFrames === 30) {
                    this.baselineNoseY = this.calibrationSum / 30;
                    console.log('Baseline calibrated:', this.baselineNoseY);
                }
            }

            // Detection scoring
            let detectionScore = 0;

            // 1. Head tilt - nose position relative to baseline
            const baselineY = this.baselineNoseY || 0.35;
            const noseOffset = noseY - baselineY;

            if (noseOffset > 0.12) {
                detectionScore += 3; // Significant head tilt down
            } else if (noseOffset > 0.08) {
                detectionScore += 2;
            } else if (noseOffset > 0.05) {
                detectionScore += 1;
            }

            // 2. Chin-to-forehead ratio (looking down = chin more visible)
            const faceVerticalSpan = chinY - foreheadY;
            const noseToForehead = noseY - foreheadY;
            const noseToChin = chinY - noseY;
            const faceRatio = noseToChin / (noseToForehead + 0.001);

            if (faceRatio > 1.4) {
                detectionScore += 2; // Chin very visible = looking down
            } else if (faceRatio > 1.2) {
                detectionScore += 1;
            }

            // 3. Eye vertical position (eyes lower in frame = looking down)
            const avgEyeY = (leftEye.y + rightEye.y) / 2;
            if (avgEyeY > this.sensitivity + 0.1) {
                detectionScore += 2;
            } else if (avgEyeY > this.sensitivity) {
                detectionScore += 1;
            }

            // 4. Face position in frame
            const faceCenterY = (foreheadY + chinY) / 2;
            if (faceCenterY > 0.6) {
                detectionScore += 1;
            }

            // Determine raw detection (threshold: 4)
            const rawDetection = detectionScore >= 4;

            // Stabilize detection with frame counting
            const result = this.updateState(rawDetection);

            // Calculate face bounding box for visualization
            const minX = Math.min(...landmarks.map(l => l.x)) * frameWidth;
            const maxX = Math.max(...landmarks.map(l => l.x)) * frameWidth;
            const minY = Math.min(...landmarks.map(l => l.y)) * frameHeight;
            const maxY = Math.max(...landmarks.map(l => l.y)) * frameHeight;

            return {
                ...result,
                faceBox: {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY
                },
                debug: {
                    noseOffset: noseOffset.toFixed(3),
                    faceRatio: faceRatio.toFixed(3),
                    detectionScore,
                    fps: this.fps
                }
            };

        } catch (error) {
            console.error('Detection error:', error);
            return {
                isLookingDown: false,
                state: 'error',
                message: error.message,
                fps: this.fps
            };
        }
    }

    /**
     * Update state with frame counting for stability
     */
    updateState(rawDetection) {
        if (rawDetection) {
            this.doomscrollCount++;
            this.normalCount = 0;
        } else {
            this.normalCount++;
            this.doomscrollCount = 0;
        }

        if (this.doomscrollCount >= this.detectionThreshold) {
            this.currentState = 'doomscrolling';
            return {
                isLookingDown: true,
                state: 'doomscrolling',
                message: 'Doomscrolling detected!'
            };
        } else if (this.normalCount >= this.detectionThreshold) {
            this.currentState = 'normal';
            return {
                isLookingDown: false,
                state: 'normal',
                message: 'Good posture!'
            };
        } else {
            return {
                isLookingDown: false,
                state: 'monitoring',
                message: 'Monitoring...'
            };
        }
    }

    /**
     * Update sensitivity setting
     */
    setSensitivity(value) {
        this.sensitivity = Math.max(0.4, Math.min(0.7, value));
    }

    /**
     * Reset detection state and calibration
     */
    reset() {
        this.doomscrollCount = 0;
        this.normalCount = 0;
        this.currentState = 'monitoring';
        this.baselineNoseY = null;
        this.calibrationFrames = 0;
        this.calibrationSum = 0;
    }

    /**
     * Force recalibration
     */
    recalibrate() {
        this.baselineNoseY = null;
        this.calibrationFrames = 0;
        this.calibrationSum = 0;
        console.log('Recalibrating baseline...');
    }

    getFPS() {
        return this.fps;
    }
}
