/**
 * App Module - ZipCastellano v2.1
 * Controller for the UI and Scanner lifecycle.
 */
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video-preview');
    const canvas = document.getElementById('hidden-canvas');
    const btnStart = document.getElementById('btn-start');
    const btnStop = document.getElementById('btn-stop');
    const statusText = document.getElementById('status-text');
    const statusBadge = document.getElementById('status-indicator');
    const resultContainer = document.getElementById('result-container');
    const qrData = document.getElementById('qr-data');

    let scanner = null;
    let stream = null;

    /**
     * Update UI Status
     */
    const setStatus = (type, text) => {
        statusBadge.className = `status-badge status-${type}`;
        statusText.innerText = text;
    };

    /**
     * Start Camera and Scanner
     */
    const startApp = async () => {
        try {
            setStatus('searching', 'Solicitando cámara...');
            
            // Camera Constraints
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            };

            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            
            // Initialize Scanner
            if (!scanner) {
                scanner = new Scanner(video, canvas);
                scanner.onQRDetected((data) => {
                    handleQRDetected(data);
                });
            }

            scanner.start();

            // UI Adjustments
            btnStart.style.display = 'none';
            btnStop.style.display = 'block';
            setStatus('searching', 'Buscando hoja...');
            
        } catch (err) {
            console.error("App Error:", err);
            let message = "Error al acceder a la cámara";
            if (err.name === 'NotAllowedError') message = "Sin acceso a cámara (Permiso denegado)";
            if (err.name === 'NotFoundError') message = "No se encontró cámara";
            
            setStatus('error', message);
        }
    };

    /**
     * Stop Camera and Scanner
     */
    const stopApp = () => {
        if (scanner) scanner.stop();
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        video.srcObject = null;
        btnStart.style.display = 'block';
        btnStop.style.display = 'none';
        setStatus('idle', 'Cámara no iniciada');
        resultContainer.style.display = 'none';
    };

    /**
     * Handle Detected QR
     */
    const handleQRDetected = (data) => {
        setStatus('detected', 'QR detectado');
        resultContainer.style.display = 'block';
        qrData.innerText = data;
        
        // Brief pulse effect on detection
        resultContainer.style.animation = 'none';
        resultContainer.offsetHeight; // trigger reflow
        resultContainer.style.animation = 'pulse 0.3s ease-out';
    };

    /**
     * Generate and Print Test Sheet
     */
    const printSheet = () => {
        const html = generateTestSheet();
        const printWindow = window.open('', '_blank');
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Give some time for images (QR) to load before printing
        printWindow.onload = () => {
            printWindow.print();
        };
    };

    // Event Listeners
    btnStart.addEventListener('click', startApp);
    btnStop.addEventListener('click', stopApp);
    const btnPrint = document.getElementById('btn-print');
    if (btnPrint) btnPrint.addEventListener('click', printSheet);
});

// Add pulse animation to CSS dynamically or via style.css
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.02); border-color: var(--success); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);
