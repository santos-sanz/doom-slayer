/**
 * Doom Slayer - Main Application Controller
 * Handles webcam access, detection loop, and UI state management
 */

import { DoomscrollDetector } from './detector.js';
import { getRandomRoast, getRandomEncouragement } from './roasts.js';

class App {
    constructor() {
        // DOM Elements
        this.landingSection = document.getElementById('landing');
        this.monitorSection = document.getElementById('monitor');
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('overlay');
        this.ctx = this.canvas.getContext('2d');

        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.pipBtn = document.getElementById('pipBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.closeSettingsBtn = document.getElementById('closeSettings');

        this.statusOverlay = document.getElementById('statusOverlay');
        this.statusIcon = document.getElementById('statusIcon');
        this.statusMessage = document.getElementById('statusMessage');
        this.roastText = document.getElementById('roastText');

        this.rickrollContainer = document.getElementById('rickrollContainer');
        this.rickrollIframe = document.getElementById('rickrollIframe');

        this.fpsDisplay = document.getElementById('fpsDisplay');
        this.sensitivitySlider = document.getElementById('sensitivity');
        this.sensitivityValue = document.getElementById('sensitivityValue');

        // Statistics DOM elements
        this.focusedTimeDisplay = document.getElementById('focusedTime');
        this.distractedTimeDisplay = document.getElementById('distractedTime');
        this.alertCountDisplay = document.getElementById('alertCount');
        this.resetStatsBtn = document.getElementById('resetStatsBtn');

        // State
        this.detector = null;
        this.stream = null;
        this.isRunning = false;
        this.detectionInterval = null; // Changed from animationId
        this.isRickrolling = false;

        // Custom video URL
        this.customVideoUrl = localStorage.getItem('doomslayer_video_url') || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

        // Roast timing
        this.lastRoastTime = 0;
        this.roastCooldown = 3000; // 3 seconds between roasts
        this.currentRoast = '';

        // Statistics tracking
        this.focusedSeconds = 0;
        this.distractedSeconds = 0;
        this.alertCount = 0;
        this.lastAlertState = false;
        this.statsInterval = null;
        this.currentTrackingState = null;

        // Bind methods
        this.runDetectionLoop = this.runDetectionLoop.bind(this);

        // Initialize
        this.init();
    }

    init() {
        // Event listeners
        this.startBtn.addEventListener('click', () => this.start());
        this.stopBtn.addEventListener('click', () => this.stop());
        this.pipBtn.addEventListener('click', () => this.togglePictureInPicture());
        this.settingsBtn.addEventListener('click', () => this.toggleSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.toggleSettings());
        this.resetStatsBtn.addEventListener('click', () => this.resetStats());

        this.sensitivitySlider.addEventListener('input', (e) => {
            const value = e.target.value / 100;
            this.sensitivityValue.textContent = `${e.target.value}%`;
            if (this.detector) {
                this.detector.setSensitivity(value);
            }
            localStorage.setItem('doomslayer_sensitivity', value);
        });

        // Load saved settings
        this.loadSettings();

        // Preload video (buffer)
        this.preloadVideo();

        console.log('Doom Slayer initialized!');
    }

    loadSettings() {
        const savedSensitivity = localStorage.getItem('doomslayer_sensitivity');
        if (savedSensitivity) {
            const value = parseFloat(savedSensitivity);
            this.sensitivitySlider.value = Math.round(value * 100);
            this.sensitivityValue.textContent = `${Math.round(value * 100)}%`;
        }

        // Load custom video URL
        const videoUrlInput = document.getElementById('videoUrl');
        if (videoUrlInput) {
            videoUrlInput.value = this.customVideoUrl;
            videoUrlInput.addEventListener('change', (e) => this.setCustomVideoUrl(e.target.value));
        }
    }

    setCustomVideoUrl(url) {
        if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
            this.customVideoUrl = url;
            localStorage.setItem('doomslayer_video_url', url);
            this.preloadVideo();
        }
    }

    preloadVideo() {
        // Extract video ID and preload iframe
        const videoId = this.extractVideoId(this.customVideoUrl);
        if (videoId) {
            // Create hidden preload iframe
            let preloader = document.getElementById('videoPreloader');
            if (!preloader) {
                preloader = document.createElement('iframe');
                preloader.id = 'videoPreloader';
                preloader.style.display = 'none';
                document.body.appendChild(preloader);
            }
            preloader.src = `https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1`;
        }
    }

    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/,
            /youtube\.com\/embed\/([\w-]{11})/
        ];
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    }

    async start() {
        try {
            // Show loading state
            this.startBtn.textContent = 'Loading AI Model...';
            this.startBtn.disabled = true;

            // Initialize detector
            this.detector = new DoomscrollDetector({
                sensitivity: parseFloat(localStorage.getItem('doomslayer_sensitivity')) || 0.55
            });

            const modelLoaded = await this.detector.initialize();
            if (!modelLoaded) {
                throw new Error('Failed to load face detection model');
            }

            // Request webcam access
            this.startBtn.textContent = 'Requesting Camera...';
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            });

            // Set up video
            this.video.srcObject = this.stream;
            await this.video.play();

            // Set canvas size to match video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            // Show monitor section
            this.landingSection.classList.add('hidden');
            this.monitorSection.classList.remove('hidden');

            // Start detection loop with setInterval (works in background tabs)
            this.isRunning = true;
            this.detectionInterval = setInterval(() => this.runDetectionLoop(), 100); // ~10 FPS

            // Start statistics timer (1 second interval)
            this.statsInterval = setInterval(() => this.updateStatsTimer(), 1000);

            console.log('Doom Slayer started!');
        } catch (error) {
            console.error('Failed to start:', error);
            this.startBtn.textContent = 'Start Monitoring';
            this.startBtn.disabled = false;

            if (error.name === 'NotAllowedError') {
                alert('Camera permission denied. Please allow camera access to use Doom Slayer.');
            } else {
                alert(`Error: ${error.message}`);
            }
        }
    }

    stop() {
        this.isRunning = false;

        // Clear interval
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }

        // Clear stats timer
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }

        // Stop webcam
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // Stop rickroll
        this.stopRickroll();

        // Reset detector
        if (this.detector) {
            this.detector.reset();
        }

        // Show landing section
        this.monitorSection.classList.add('hidden');
        this.landingSection.classList.remove('hidden');

        // Reset button
        this.startBtn.textContent = 'Start Monitoring';
        this.startBtn.disabled = false;

        console.log('Doom Slayer stopped!');
    }

    async runDetectionLoop() {
        if (!this.isRunning) return;

        // Run detection
        const result = await this.detector.detectDoomscroll(this.video);

        // Update FPS display
        if (result.debug) {
            this.fpsDisplay.textContent = `${result.debug.fps} FPS`;
        }

        // Draw overlays on canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (result.faceBox) {
            this.drawFaceBox(result.faceBox, result.state, result);
        }
        if (result.phoneBox) {
            this.drawPhoneBox(result.phoneBox);
        }

        // Update UI based on state
        this.updateUI(result);
    }

    drawFaceBox(box, state, result = {}) {
        const colors = {
            'normal': '#10b981',      // Green
            'doomscrolling': '#f43f5e', // Red
            'monitoring': '#f59e0b',   // Yellow
            'no-face': '#6b7280'       // Gray
        };

        const color = colors[state] || colors['monitoring'];

        // Main face box
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([]);
        this.ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Corner accents
        const cornerSize = 15;
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = color;

        // Top-left
        this.ctx.beginPath();
        this.ctx.moveTo(box.x, box.y + cornerSize);
        this.ctx.lineTo(box.x, box.y);
        this.ctx.lineTo(box.x + cornerSize, box.y);
        this.ctx.stroke();

        // Top-right
        this.ctx.beginPath();
        this.ctx.moveTo(box.x + box.width - cornerSize, box.y);
        this.ctx.lineTo(box.x + box.width, box.y);
        this.ctx.lineTo(box.x + box.width, box.y + cornerSize);
        this.ctx.stroke();

        // Bottom-left
        this.ctx.beginPath();
        this.ctx.moveTo(box.x, box.y + box.height - cornerSize);
        this.ctx.lineTo(box.x, box.y + box.height);
        this.ctx.lineTo(box.x + cornerSize, box.y + box.height);
        this.ctx.stroke();

        // Bottom-right
        this.ctx.beginPath();
        this.ctx.moveTo(box.x + box.width - cornerSize, box.y + box.height);
        this.ctx.lineTo(box.x + box.width, box.y + box.height);
        this.ctx.lineTo(box.x + box.width, box.y + box.height - cornerSize);
        this.ctx.stroke();

        // Eye tracking boxes (estimated positions)
        const eyeWidth = box.width * 0.25;
        const eyeHeight = box.height * 0.12;
        const eyeY = box.y + box.height * 0.30;

        this.ctx.strokeStyle = '#a855f7'; // Purple for eyes
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([4, 4]);

        // Left eye
        this.ctx.strokeRect(box.x + box.width * 0.15, eyeY, eyeWidth, eyeHeight);
        // Right eye
        this.ctx.strokeRect(box.x + box.width * 0.60, eyeY, eyeWidth, eyeHeight);

        // Nose position indicator
        const noseX = box.x + box.width * 0.5;
        const noseY = box.y + box.height * 0.55;

        this.ctx.setLineDash([]);
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(noseX, noseY, 6, 0, Math.PI * 2);
        this.ctx.fill();

        // Debug info overlay - flip text so it's readable
        if (result.debug) {
            // Save context and flip horizontally to undo mirror effect for text
            this.ctx.save();
            this.ctx.scale(-1, 1);

            // Calculate flipped X position
            const textX = -(box.x + 180);
            const textY = box.y + box.height + 10;

            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(textX, textY, 180, 70);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Inter, sans-serif';
            this.ctx.fillText(`Head: ${result.debug.noseOffset}`, textX + 8, textY + 16);
            this.ctx.fillText(`Eyes: ${result.debug.eyeGaze}`, textX + 8, textY + 30);
            this.ctx.fillText(`Away: ${result.debug.lookAway || '0'}`, textX + 8, textY + 44);
            this.ctx.fillText(`Score: ${result.debug.score} ${result.debug.phone || ''}`, textX + 8, textY + 58);

            this.ctx.restore();
        }
    }

    drawPhoneBox(phoneBox) {
        // COCO-SSD detects on un-mirrored video, but canvas CSS is mirrored
        // So we need to mirror the x coordinate
        const mirroredX = this.video.videoWidth - phoneBox.x - phoneBox.width;

        // Draw phone detection box in magenta with alert style
        this.ctx.strokeStyle = '#ec4899';
        this.ctx.lineWidth = 4;
        this.ctx.setLineDash([10, 5]);
        this.ctx.strokeRect(mirroredX, phoneBox.y, phoneBox.width, phoneBox.height);

        // Label background
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = '#ec4899';
        this.ctx.fillRect(mirroredX, phoneBox.y - 25, 100, 22);

        // Phone label
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 14px Inter, sans-serif';
        this.ctx.fillText('📱 PHONE', mirroredX + 8, phoneBox.y - 8);
    }

    updateUI(result) {
        const { state, message } = result;

        // Update status overlay
        this.statusOverlay.className = `status-overlay ${state}`;
        this.statusMessage.textContent = message;

        // Update icon
        const icons = {
            'normal': '✅',
            'doomscrolling': '🚨',
            'monitoring': '👀',
            'no-face': '❓',
            'error': '⚠️'
        };
        this.statusIcon.textContent = icons[state] || '👀';

        // Handle doomscrolling state
        if (state === 'doomscrolling') {
            this.currentTrackingState = 'distracted';
            // Count new alert when transitioning to doomscrolling
            if (!this.lastAlertState) {
                this.alertCount++;
                this.alertCountDisplay.textContent = this.alertCount;
                this.lastAlertState = true;
            }
            this.handleDoomscrolling();
        } else if (state === 'normal') {
            this.currentTrackingState = 'focused';
            this.lastAlertState = false;
            this.handleNormalPosture();
        } else {
            // Clear roast text for other states
            this.roastText.textContent = '';
            this.lastAlertState = false;
        }
    }

    updateStatsTimer() {
        if (this.currentTrackingState === 'focused') {
            this.focusedSeconds++;
            this.focusedTimeDisplay.textContent = this.formatTime(this.focusedSeconds);
        } else if (this.currentTrackingState === 'distracted') {
            this.distractedSeconds++;
            this.distractedTimeDisplay.textContent = this.formatTime(this.distractedSeconds);
        }
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    resetStats() {
        this.focusedSeconds = 0;
        this.distractedSeconds = 0;
        this.alertCount = 0;
        this.focusedTimeDisplay.textContent = '0:00';
        this.distractedTimeDisplay.textContent = '0:00';
        this.alertCountDisplay.textContent = '0';

        // Also recalibrate detector baseline
        if (this.detector) {
            this.detector.recalibrate();
        }
    }

    handleDoomscrolling() {
        const now = Date.now();

        // Show new roast if cooldown passed
        if (now - this.lastRoastTime > this.roastCooldown) {
            this.currentRoast = getRandomRoast();
            this.lastRoastTime = now;
        }

        this.roastText.textContent = this.currentRoast;

        // Trigger rickroll
        this.triggerRickroll();
    }

    handleNormalPosture() {
        // Show encouragement
        this.roastText.textContent = getRandomEncouragement();

        // Stop rickroll
        this.stopRickroll();
    }

    triggerRickroll() {
        if (this.isRickrolling) return;

        this.isRickrolling = true;
        this.rickrollContainer.classList.remove('hidden');

        // Extract video ID from custom URL
        const videoId = this.extractVideoId(this.customVideoUrl);
        if (videoId) {
            this.rickrollIframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`;
        }
    }

    stopRickroll() {
        if (!this.isRickrolling) return;

        this.isRickrolling = false;
        this.rickrollContainer.classList.add('hidden');

        // Clear iframe src to stop video
        this.rickrollIframe.src = '';
    }

    toggleSettings() {
        this.settingsPanel.classList.toggle('hidden');
    }

    async togglePictureInPicture() {
        try {
            if (document.pictureInPictureElement) {
                // Exit PiP mode
                await document.exitPictureInPicture();
                this.pipBtn.textContent = '📌';
                this.pipBtn.title = 'Enable Picture-in-Picture (keeps working in background)';
            } else if (this.video && document.pictureInPictureEnabled) {
                // Enter PiP mode
                await this.video.requestPictureInPicture();
                this.pipBtn.textContent = '🔙';
                this.pipBtn.title = 'Exit Picture-in-Picture';
            } else {
                alert('Picture-in-Picture is not supported in this browser');
            }
        } catch (error) {
            console.error('PiP error:', error);
            alert('Could not toggle Picture-in-Picture: ' + error.message);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
