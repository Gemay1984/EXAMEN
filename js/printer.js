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
                @page { 
                    size: letter portrait; 
                    margin: 0; 
                }
                
                html, body { 
                    margin: 0; 
                    padding: 0; 
                    background: white;
                    width: 215.9mm;
                    height: 279.4mm;
                    overflow: hidden;
                }

                /* Main Sheet Container */
                .sheet {
                    width: 215.9mm;
                    height: 279.3mm; /* 0.1mm shorter to prevent browser rounding-up page break */
                    box-sizing: border-box;
                    padding: 10mm;
                    background: white;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-start;
                    page-break-inside: avoid;
                    break-inside: avoid;
                }
                
                @media print {
                    @page { margin: 0; }
                    body { margin: 0; }
                    body * {
                        visibility: hidden;
                    }
                    .sheet, .sheet * {
                        visibility: visible;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .sheet {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 215.9mm;
                        height: 279.3mm;
                    }
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
                    top: 20mm;
                    left: 20mm;
                    width: 35mm;
                    height: 35mm;
                }
                .qr-container img { width: 100%; height: 100%; }

                /* Header */
                header {
                    position: absolute;
                    top: 20mm;
                    left: 0;
                    width: 100%;
                    text-align: center;
                    font-family: Arial, sans-serif;
                }
                h1 { margin: 0; font-size: 20pt; }
                p { margin: 2mm 0; color: #666; font-size: 10pt; }

                /* Safe Area (Eliminates risk of page breaks) */
                .safe-area {
                    position: absolute;
                    top: 80mm;
                    left: 20mm;
                    width: 175.9mm;
                    height: 170mm;
                    overflow: hidden;
                }

                /* Questions Container */
                .questions {
                    width: 100%;
                    height: 100%;
                    border: 2mm solid black;
                    padding: 6mm;
                    box-sizing: border-box;
                }

                .question-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 4mm;
                }
                .q-num {
                    font-weight: bold;
                    font-size: 12pt;
                    width: 10mm;
                }
                .bubble-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1mm;
                }
                .bubble {
                    width: 5.5mm;
                    height: 5.5mm;
                    border: 0.4mm solid black;
                    border-radius: 50%;
                }
                .bubble-label {
                    font-size: 8pt;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="sheet">
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

                <div class="safe-area">
                    <div class="questions">
                        ${questionsHtml}
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
}
