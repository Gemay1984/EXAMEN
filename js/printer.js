/**
 * Printer Module - ZipCastellano v2.1
 * Generates simple test sheets for OMR validation.
 */

/**
 * Generates a simple test sheet HTML.
 * @returns {string} HTML string ready for printing.
 */
function generateTestSheet() {
    const questionsCount = 10;
    const options = ['A', 'B', 'C', 'D'];
    const qrContent = "ZC|TEST|123456|4";
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrContent)}`;

    let questionsHtml = '';
    for (let i = 1; i <= questionsCount; i++) {
        questionsHtml += `
            <div class="question-row">
                <span class="q-num">${i}</span>
                ${options.map(opt => `<div class="bubble-container"><div class="bubble"></div><span class="bubble-label">${opt}</span></div>`).join('')}
            </div>
        `;
    }

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page { size: letter; margin: 0; }
                body { 
                    margin: 0; 
                    padding: 0; 
                    font-family: Arial, sans-serif; 
                    background: white; 
                    color: black;
                }
                .sheet-container {
                    width: 215.9mm;
                    height: 279.4mm;
                    position: relative;
                    padding: 15mm;
                    box-sizing: border-box;
                }
                
                /* Anchors */
                .anchor {
                    width: 10mm;
                    height: 10mm;
                    background: black;
                    position: absolute;
                }
                .top-left { top: 10mm; left: 10mm; }
                .top-right { top: 10mm; right: 10mm; }
                .bottom-left { bottom: 10mm; left: 10mm; }
                .bottom-right { bottom: 10mm; right: 10mm; }

                /* QR Code */
                .qr-container {
                    position: absolute;
                    top: 25mm;
                    left: 25mm;
                    width: 40mm;
                    height: 40mm;
                    border: 1px solid #eee;
                }
                .qr-container img { width: 100%; height: 100%; }

                /* Header */
                header {
                    text-align: center;
                    margin-top: 10mm;
                    margin-bottom: 35mm;
                }
                h1 { margin: 0; font-size: 24pt; }
                p { margin: 5px 0; color: #666; }

                /* Response Area */
                .response-area {
                    border: 2mm solid black;
                    padding: 10mm;
                    margin: 0 auto;
                    width: 140mm;
                }
                .question-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8mm;
                }
                .q-num {
                    font-weight: bold;
                    font-size: 14pt;
                    width: 10mm;
                }
                .bubble-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 2mm;
                }
                .bubble {
                    width: 8mm;
                    height: 8mm;
                    border: 0.5mm solid black;
                    border-radius: 50%;
                }
                .bubble-label {
                    font-size: 9pt;
                    font-weight: bold;
                }

                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="sheet-container">
                <!-- 4 Anchors -->
                <div class="anchor top-left"></div>
                <div class="anchor top-right"></div>
                <div class="anchor bottom-left"></div>
                <div class="anchor bottom-right"></div>

                <!-- QR Code -->
                <div class="qr-container">
                    <img src="${qrUrl}" alt="QR">
                </div>

                <header>
                    <h1>HOJA DE PRUEBA OMR</h1>
                    <p>ZipCastellano v2.1 - Validación de Visión</p>
                </header>

                <div class="response-area">
                    ${questionsHtml}
                </div>
            </div>
        </body>
        </html>
    `;
}
