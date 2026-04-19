/**
 * Scanner Class - ZipCastellano v2.1
 * Encapsulates the vision pipeline for QR detection.
 */
class Scanner {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        this.active = false;
        this.requestId = null;
        this.lastProcessTime = 0;
        this.processInterval = 1000 / 12; // ~12 FPS
        
        this.qrCallback = null;
        this.maxRes = 1280;

        // Stability & Locking (ZipCastellano v2.1 Professional Pipeline)
        this.qrBuffer = [];
        this.qrLock = false;
        this.lastQRBox = null;
    }

    /**
     * Set the callback for when a QR code is detected
     * @param {Function} callback 
     */
    onQRDetected(callback) {
        this.qrCallback = callback;
    }

    /**
     * Reset the lock to allow new scans
     */
    resetLock() {
        this.qrLock = false;
        this.qrBuffer = [];
        this.lastQRBox = null;
    }

    /**
     * Start the scanning loop
     */
    start() {
        if (this.active) return;
        this.active = true;
        this.loop();
    }

    /**
     * Stop the scanning loop
     */
    stop() {
        this.active = false;
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
    }

    /**
     * Main processing loop using requestAnimationFrame
     */
    loop(time) {
        if (!this.active) return;

        this.requestId = requestAnimationFrame((t) => this.loop(t));

        // Throttle processing
        if (time - this.lastProcessTime < this.processInterval) {
            return;
        }
        this.lastProcessTime = time;

        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.processFrame();
        }
    }

    /**
     * Capture frame, scale, and scan for QR
     */
    processFrame() {
        // If locked, we don't process further (Freeze Visual)
        if (this.qrLock) return;

        const { videoWidth, videoHeight } = this.video;
        
        let scale = 1;
        if (videoWidth > this.maxRes) {
            scale = this.maxRes / videoWidth;
        }

        const width = videoWidth * scale;
        const height = videoHeight * scale;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        this.ctx.drawImage(this.video, 0, 0, width, height);

        try {
            const imageData = this.ctx.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code) {
                // Add to stability buffer
                this.qrBuffer.push(code.data);
                if (this.qrBuffer.length > 5) {
                    this.qrBuffer.shift();
                }

                // Check stability
                const isStable = this.qrBuffer.length === 5 && 
                                 this.qrBuffer.every(val => val === code.data);

                if (isStable && !this.qrLock) {
                    this.qrLock = true;
                    this.lastQRBox = code.location; // Save for Phase 2
                    if (this.qrCallback) {
                        this.qrCallback(code.data);
                    }
                }
            } else {
                // Clear buffer if QR disappears (only if not locked)
                if (!this.qrLock) {
                    this.qrBuffer = [];
                }
            }
        } catch (err) {
            console.error("Scanner Error:", err);
        }
    }
}
