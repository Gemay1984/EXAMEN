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
        this.processInterval = 1000 / 12; // ~12 FPS for robustness and battery life
        
        this.qrCallback = null;
        this.maxRes = 1280; // Max resolution for processing
    }

    /**
     * Set the callback for when a QR code is detected
     * @param {Function} callback 
     */
    onQRDetected(callback) {
        this.qrCallback = callback;
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
        const { videoWidth, videoHeight } = this.video;
        
        // Calculate scaling to maintain aspect ratio within maxRes
        let scale = 1;
        if (videoWidth > this.maxRes) {
            scale = this.maxRes / videoWidth;
        }

        const width = videoWidth * scale;
        const height = videoHeight * scale;

        // Set canvas size for processing
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        // Draw frame to hidden canvas
        this.ctx.drawImage(this.video, 0, 0, width, height);

        // Scan for QR
        try {
            const imageData = this.ctx.getImageData(0, 0, width, height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (code && this.qrCallback) {
                this.qrCallback(code.data);
            }
        } catch (err) {
            console.error("Scanner Error:", err);
        }
    }
}
