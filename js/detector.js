/**
 * Doom Slayer - Face Detection & Doomscroll Detection Module
 * Uses MediaPipe FaceMesh for face/gaze tracking + COCO-SSD for phone detection
 * Detects: looking down, looking away (left/right), not looking at screen
 */

export class DoomscrollDetector {
    constructor(options = {}) {
        this.faceMesh = null;
        this.phoneDetector = null;
        this.isInitialized = false;

        // Detection parameters
        this.sensitivity = options.sensitivity || 0.55;
        this.detectionThreshold = options.detectionThreshold || 3;

        // State tracking
        this.doomscrollCount = 0;
        this.normalCount = 0;
        this.currentState = 'monitoring';

        // Phone detection
        this.phoneDetected = false;
        this.lastPhoneCheck = 0;
        this.phoneCheckInterval = 500;

        // Performance
        this.lastDetectionTime = 0;
        this.fps = 0;

        // Baseline calibration
        this.baseline = null;
        this.calibrationFrames = 0;
        this.calibrationData = [];
    }

    async initialize() {
        try {
            console.log('Loading AI models...');

            // Check if mobile device
            this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

            if (this.isMobile) {
                console.log('Mobile device detected - using simplified detection');
            }

            // Try to load FaceMesh with error handling
            try {
                this.faceMesh = new FaceMesh({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                });

                this.faceMesh.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: !this.isMobile, // Disable refineLandmarks on mobile for stability
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });

                this.latestResults = null;
                this.faceMesh.onResults((results) => {
                    this.latestResults = results;
                });

                console.log('FaceMesh loaded!');
                this.faceMeshReady = true;
            } catch (faceError) {
                console.warn('FaceMesh failed to load:', faceError);
                this.faceMeshReady = false;
            }

            // Load COCO-SSD for phone detection (works better on mobile)
            try {
                console.log('Loading phone detector...');
                this.phoneDetector = await cocoSsd.load();
                console.log('Phone detector loaded!');
            } catch (phoneError) {
                console.warn('Phone detector failed to load:', phoneError);
                this.phoneDetector = null;
            }

            this.isInitialized = this.faceMeshReady || this.phoneDetector;

            if (!this.isInitialized) {
                throw new Error('No detection models could be loaded');
            }

            return true;
        } catch (error) {
            console.error('Failed to load models:', error);
            return false;
        }
    }

    async detectPhone(video) {
        if (!this.phoneDetector) return null;
        try {
            const predictions = await this.phoneDetector.detect(video);
            // Lower threshold for phone detection
            const phone = predictions.find(p => p.class === 'cell phone' && p.score > 0.25);
            if (phone) {
                console.log('📱 Phone detected!', phone.score.toFixed(2));
                return {
                    detected: true,
                    box: {
                        x: phone.bbox[0],
                        y: phone.bbox[1],
                        width: phone.bbox[2],
                        height: phone.bbox[3]
                    },
                    score: phone.score
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Calculate comprehensive gaze metrics
     */
    analyzeGaze(landmarks) {
        // Eye landmarks
        const leftEyeOuter = landmarks[33];
        const leftEyeInner = landmarks[133];
        const leftEyeTop = landmarks[159];
        const leftEyeBottom = landmarks[145];
        const leftIris = landmarks[468];

        const rightEyeOuter = landmarks[263];
        const rightEyeInner = landmarks[362];
        const rightEyeTop = landmarks[386];
        const rightEyeBottom = landmarks[374];
        const rightIris = landmarks[473];

        // Eye dimensions
        const leftEyeWidth = leftEyeInner.x - leftEyeOuter.x;
        const leftEyeHeight = leftEyeBottom.y - leftEyeTop.y;
        const rightEyeWidth = rightEyeOuter.x - rightEyeInner.x;
        const rightEyeHeight = rightEyeBottom.y - rightEyeTop.y;

        // Iris position within eye (0-1 scale)
        // Vertical: 0 = top, 1 = bottom
        // Horizontal: 0 = outer, 1 = inner
        const leftIrisVertical = leftEyeHeight > 0.005 ?
            (leftIris.y - leftEyeTop.y) / leftEyeHeight : 0.5;
        const rightIrisVertical = rightEyeHeight > 0.005 ?
            (rightIris.y - rightEyeTop.y) / rightEyeHeight : 0.5;

        const leftIrisHorizontal = leftEyeWidth > 0.01 ?
            (leftIris.x - leftEyeOuter.x) / leftEyeWidth : 0.5;
        const rightIrisHorizontal = rightEyeWidth > 0.01 ?
            (rightIris.x - rightEyeInner.x) / rightEyeWidth : 0.5;

        // Average both eyes
        const irisVertical = (leftIrisVertical + rightIrisVertical) / 2;
        const irisHorizontal = (leftIrisHorizontal + rightIrisHorizontal) / 2;

        // Eye openness (for detecting closed eyes or squinting)
        const avgEyeOpenness = (leftEyeHeight + rightEyeHeight) / 2;

        return {
            vertical: irisVertical,      // Higher = looking down
            horizontal: irisHorizontal,  // 0.5 = center, <0.4 = looking right, >0.6 = looking left
            openness: avgEyeOpenness,
            leftIris: { v: leftIrisVertical, h: leftIrisHorizontal },
            rightIris: { v: rightIrisVertical, h: rightIrisHorizontal }
        };
    }

    /**
     * Analyze head pose
     */
    analyzeHeadPose(landmarks) {
        const noseTip = landmarks[1];
        const chin = landmarks[152];
        const forehead = landmarks[10];
        const leftCheek = landmarks[234];
        const rightCheek = landmarks[454];

        // Vertical tilt (looking up/down)
        const noseY = noseTip.y;
        const noseToForehead = noseY - forehead.y;
        const noseToChin = chin.y - noseY;
        const faceRatio = noseToChin / (noseToForehead + 0.001);

        // Horizontal rotation (looking left/right)
        const faceWidth = rightCheek.x - leftCheek.x;
        const noseCenterOffset = (noseTip.x - leftCheek.x) / (faceWidth + 0.001);
        // 0.5 = centered, <0.45 = turned right, >0.55 = turned left

        // Face center in frame
        const faceCenterY = (forehead.y + chin.y) / 2;
        const faceCenterX = noseTip.x;

        return {
            noseY,
            faceRatio,
            horizontalRotation: noseCenterOffset,
            faceCenterY,
            faceCenterX
        };
    }

    async detectDoomscroll(video) {
        if (!this.isInitialized) {
            return { isLookingDown: false, state: 'error', message: 'Model not initialized' };
        }

        try {
            const now = performance.now();
            this.fps = Math.round(1000 / (now - this.lastDetectionTime));
            this.lastDetectionTime = now;

            // Phone detection (works on mobile)
            if (now - this.lastPhoneCheck > this.phoneCheckInterval) {
                this.phoneResult = await this.detectPhone(video);
                this.phoneDetected = this.phoneResult?.detected || false;
                this.lastPhoneCheck = now;
            }

            // Try FaceMesh if available
            let faceResults = null;
            if (this.faceMeshReady && this.faceMesh) {
                try {
                    await this.faceMesh.send({ image: video });
                    faceResults = this.latestResults;
                } catch (faceError) {
                    console.warn('FaceMesh detection error:', faceError.message);
                    // Continue with phone-only detection
                }
            }

            const results = faceResults;

            if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                if (this.phoneDetected) {
                    return this.updateState(true, {
                        state: 'doomscrolling',
                        message: '📱 Phone detected!',
                        phoneDetected: true,
                        fps: this.fps
                    });
                }
                return { isLookingDown: false, state: 'no-face', message: 'No face detected', fps: this.fps };
            }

            const landmarks = results.multiFaceLandmarks[0];
            const frameHeight = video.videoHeight;
            const frameWidth = video.videoWidth;

            // Analyze gaze and head pose
            const gaze = this.analyzeGaze(landmarks);
            const head = this.analyzeHeadPose(landmarks);

            // Calibration
            if (this.calibrationFrames < 30) {
                this.calibrationData.push({ gaze, head });
                this.calibrationFrames++;

                if (this.calibrationFrames === 30) {
                    this.baseline = {
                        gazeVertical: this.calibrationData.reduce((a, b) => a + b.gaze.vertical, 0) / 30,
                        gazeHorizontal: this.calibrationData.reduce((a, b) => a + b.gaze.horizontal, 0) / 30,
                        noseY: this.calibrationData.reduce((a, b) => a + b.head.noseY, 0) / 30,
                        faceRatio: this.calibrationData.reduce((a, b) => a + b.head.faceRatio, 0) / 30,
                        headRotation: this.calibrationData.reduce((a, b) => a + b.head.horizontalRotation, 0) / 30
                    };
                    console.log('Baseline calibrated:', this.baseline);
                }

                return {
                    isLookingDown: false,
                    state: 'monitoring',
                    message: `Calibrating... ${this.calibrationFrames}/30`,
                    fps: this.fps
                };
            }

            // === DETECTION ALGORITHM (MORE SENSITIVE) ===
            let detectionScore = 0;
            let reason = '';

            // 1. LOOKING DOWN (eyes + head) - Adjusted thresholds to avoid false positives
            // when looking at the bottom of the laptop screen
            const gazeDownOffset = gaze.vertical - this.baseline.gazeVertical;
            const headDownOffset = head.noseY - this.baseline.noseY;

            // Higher thresholds: only trigger when actually looking away from screen
            if (gazeDownOffset > 0.12 || headDownOffset > 0.08) {
                detectionScore += 4;
                reason = 'Looking down';
            } else if (gazeDownOffset > 0.09 || headDownOffset > 0.06) {
                detectionScore += 3;
                reason = 'Looking down';
            } else if (gazeDownOffset > 0.06 || headDownOffset > 0.04) {
                detectionScore += 2;
                reason = 'Looking down';
            }
            // Removed the lowest threshold that was causing false positives

            // 2. LOOKING AWAY (left/right) - LOWERED thresholds
            const gazeHorizontalOffset = Math.abs(gaze.horizontal - this.baseline.gazeHorizontal);
            if (gazeHorizontalOffset > 0.12) {
                detectionScore += 4;
                reason = reason || 'Looking away';
            } else if (gazeHorizontalOffset > 0.08) {
                detectionScore += 3;
                reason = reason || 'Looking away';
            } else if (gazeHorizontalOffset > 0.05) {
                detectionScore += 2;
            }

            // 3. HEAD TURNED (left/right) - LOWERED thresholds
            const headRotationOffset = Math.abs(head.horizontalRotation - this.baseline.headRotation);
            if (headRotationOffset > 0.08) {
                detectionScore += 3;
                reason = reason || 'Head turned';
            } else if (headRotationOffset > 0.05) {
                detectionScore += 2;
            } else if (headRotationOffset > 0.03) {
                detectionScore += 1;
            }

            // 4. PHONE DETECTED
            if (this.phoneDetected) {
                detectionScore += 5;
                reason = '📱 Phone detected';
            }

            // Sensitivity adjustment (stronger effect)
            const sensitivityBonus = (0.55 - this.sensitivity) * 8;
            detectionScore += sensitivityBonus;

            // Lower threshold: 3 instead of 4
            const rawDetection = detectionScore >= 3;

            const result = this.updateState(rawDetection, null, reason);

            // Face bounding box
            const minX = Math.min(...landmarks.map(l => l.x)) * frameWidth;
            const maxX = Math.max(...landmarks.map(l => l.x)) * frameWidth;
            const minY = Math.min(...landmarks.map(l => l.y)) * frameHeight;
            const maxY = Math.max(...landmarks.map(l => l.y)) * frameHeight;

            return {
                ...result,
                phoneDetected: this.phoneDetected,
                phoneBox: this.phoneResult?.box || null,
                faceBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
                debug: {
                    noseOffset: headDownOffset.toFixed(3),
                    eyeGaze: gazeDownOffset.toFixed(3),
                    lookAway: gazeHorizontalOffset.toFixed(3),
                    phone: this.phoneDetected ? '📱' : '-',
                    score: Math.round(detectionScore),
                    fps: this.fps
                }
            };

        } catch (error) {
            console.error('Detection error:', error);
            return { isLookingDown: false, state: 'error', message: error.message, fps: this.fps };
        }
    }

    updateState(rawDetection, overrideResult = null, reason = '') {
        if (rawDetection) {
            this.doomscrollCount++;
            this.normalCount = 0;
        } else {
            this.normalCount++;
            this.doomscrollCount = 0;
        }

        if (this.doomscrollCount >= this.detectionThreshold) {
            this.currentState = 'doomscrolling';
            return overrideResult || {
                isLookingDown: true,
                state: 'doomscrolling',
                message: reason || 'Not looking at screen!'
            };
        } else if (this.normalCount >= this.detectionThreshold) {
            this.currentState = 'normal';
            return { isLookingDown: false, state: 'normal', message: 'Good posture!' };
        } else {
            return { isLookingDown: false, state: 'monitoring', message: 'Monitoring...' };
        }
    }

    setSensitivity(value) {
        this.sensitivity = Math.max(0.4, Math.min(0.7, value));
    }

    reset() {
        this.doomscrollCount = 0;
        this.normalCount = 0;
        this.currentState = 'monitoring';
        this.phoneDetected = false;
        this.baseline = null;
        this.calibrationFrames = 0;
        this.calibrationData = [];
    }

    recalibrate() {
        this.baseline = null;
        this.calibrationFrames = 0;
        this.calibrationData = [];
        console.log('Recalibrating...');
    }

    getFPS() {
        return this.fps;
    }
}
