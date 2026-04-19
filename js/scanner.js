/**
 * Scanner Class - ZipCastellano v2.1
 * Encapsulates the vision pipeline for QR detection.
 */
class Scanner {
    constructor(videoElement, canvasElement) {
        this.video = videoElement;
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
        
        // Warp Preview Canvas (Mini-preview)
        this.warpCanvas = document.getElementById('warp-preview');
        this.warpCtx = this.warpCanvas ? this.warpCanvas.getContext('2d') : null;

        this.active = false;
        this.requestId = null;
        this.lastProcessTime = 0;
        this.processInterval = 1000 / 12; // ~12 FPS
        
        this.qrCallback = null;
        this.maxRes = 1280;

        // Production Stability Pipeline (Traffic Light System)
        this.qrCandidate = null;
        this.qrCount = 0;
        this.qrLock = false;
        this.qrLastSeen = 0;
        this.lastQRBox = null;

        this.STABLE_THRESHOLD = 4;
        this.LOST_TIMEOUT = 800;

        // Phase 2 Data
        this.sheetCorners = null;
        this.warpedImage = null; // Store corrected image for Phase 3
    }

    /**
     * Set the callback for when a QR code is detected
     */
    onQRDetected(callback) {
        this.qrCallback = callback;
    }

    resetLock() {
        this.qrLock = false;
        this.qrCandidate = null;
        this.qrCount = 0;
        this.qrLastSeen = 0;
        this.lastQRBox = null;
        this.sheetCorners = null;
        if (this.warpCanvas) {
            this.warpCanvas.parentElement.style.display = 'none';
        }
    }

    start() {
        if (this.active) return;
        this.active = true;
        this.loop();
    }

    stop() {
        this.active = false;
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
            this.requestId = null;
        }
    }

    loop(time) {
        if (!this.active) return;
        this.requestId = requestAnimationFrame((t) => this.loop(t));

        if (time - this.lastProcessTime < this.processInterval) {
            return;
        }
        this.lastProcessTime = time;

        if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
            this.processFrame();
        }
    }

    /**
     * Phase 2: Sheet Detection and Perspective Correction
     */
    processFrame() {
        if (this.qrLock) return;
        if (typeof cv === 'undefined' || !cv.Mat) return; // Wait for OpenCV.js

        const now = Date.now();
        const { videoWidth, videoHeight } = this.video;
        let scale = this.maxRes / Math.max(videoWidth, videoHeight);
        if (scale > 1) scale = 1;

        const width = videoWidth * scale;
        const height = videoHeight * scale;

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }

        this.ctx.drawImage(this.video, 0, 0, width, height);

        // --- PHASE 1: QR DETECTION ---
        try {
            const imageData = this.ctx.getImageData(0, 0, width, height);
            const qr = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: "dontInvert",
            });

            if (qr) {
                if (this.qrCandidate === qr.data) {
                    this.qrCount++;
                } else {
                    this.qrCandidate = qr.data;
                    this.qrCount = 1;
                }
                this.qrLastSeen = now;

                if (this.qrCount >= this.STABLE_THRESHOLD) {
                    // --- PHASE 2: PERSPECTIVE CORRECTION ---
                    this.detectAndWarp(qr.data);
                }
            } else {
                if (now - this.qrLastSeen > this.LOST_TIMEOUT) {
                    this.qrCandidate = null;
                    this.qrCount = 0;
                }
            }
        } catch (err) {
            console.error("Scanner Pipeline Error:", err);
        }
    }

    /**
     * Detects sheet corners and warps the image
     */
    detectAndWarp(qrData) {
        let src = cv.imread(this.canvas);
        let dst = new cv.Mat();
        
        // Preprocessing
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0);
        cv.adaptiveThreshold(dst, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

        // Contour Detection
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        let maxArea = 0;
        let sheetContour = null;

        for (let i = 0; i < contours.size(); ++i) {
            let cnt = contours.get(i);
            let area = cv.contourArea(cnt);
            if (area > (src.rows * src.cols * 0.2)) { // Min 20% of screen
                let peri = cv.arcLength(cnt, true);
                let approx = new cv.Mat();
                cv.approxPolyDP(cnt, approx, 0.02 * peri, true);
                
                if (approx.rows === 4 && area > maxArea) {
                    maxArea = area;
                    sheetContour = approx;
                } else {
                    approx.delete();
                }
            }
        }

        if (sheetContour) {
            const corners = this.orderCorners(sheetContour);
            this.warpSheet(src, corners, qrData);
            sheetContour.delete();
        }

        src.delete();
        dst.delete();
        contours.delete();
        hierarchy.delete();
    }

    /**
     * Orders points: TL, TR, BR, BL
     */
    orderCorners(contour) {
        let pts = [];
        for (let i = 0; i < 4; i++) {
            pts.push({ x: contour.data32S[i * 2], y: contour.data32S[i * 2 + 1] });
        }

        // TL: Min (x+y), BR: Max (x+y)
        // TR: Min (y-x), BL: Max (y-x)
        const sortedSum = [...pts].sort((a, b) => (a.x + a.y) - (b.x + b.y));
        const sortedDiff = [...pts].sort((a, b) => (a.y - a.x) - (b.y - b.x));

        return [
            sortedSum[0],   // TL
            sortedDiff[0],  // TR
            sortedSum[3],   // BR
            sortedDiff[3]   // BL
        ];
    }

    /**
     * Warps the perspective to a flat A4-ratio rectangle
     */
    warpSheet(src, corners, qrData) {
        const width = 500;
        const height = 700; // ~1:1.4 aspect ratio (A4)

        let srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
            corners[0].x, corners[0].y,
            corners[1].x, corners[1].y,
            corners[2].x, corners[2].y,
            corners[3].x, corners[3].y
        ]);

        let dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0, 0,
            width, 0,
            width, height,
            0, height
        ]);

        let M = cv.getPerspectiveTransform(srcPts, dstPts);
        let warped = new cv.Mat();
        cv.warpPerspective(src, warped, M, new cv.Size(width, height));

        // Display in mini-preview
        if (this.warpCanvas) {
            cv.imshow(this.warpCanvas, warped);
            this.warpCanvas.parentElement.style.display = 'flex';
        }

        // LOCK AND FINISH PHASE 2
        this.qrLock = true;
        this.warpedImage = warped.clone(); // Keep for Phase 3
        
        if (this.qrCallback) {
            this.qrCallback(qrData);
        }

        srcPts.delete();
        dstPts.delete();
        M.delete();
        warped.delete();
    }
}
