// =====================================================================
// FINALE, INTERAKTIVE VERSION
// =====================================================================

// --- 1. GRUNDEINSTELLUNGEN & VARIABLEN ---

// =====================================================================
// In Abschnitt 1: GRUNDEINSTELLUNGEN & VARIABLEN
// =====================================================================




const statusText = document.getElementById('statusText' );
const videoElement = document.getElementById('videoElement');
const videoContainer = document.getElementById('videoContainer');
const photoCanvas = document.getElementById('photoCanvas');
const photoCtx = photoCanvas.getContext('2d');
const photoContainer = document.getElementById('photoContainer');
const quickResults = document.getElementById('quickResults');
const measureButton = document.getElementById('measureButton');
const resetButton = document.getElementById('resetButton');
const interactionContainer = document.getElementById('interactionContainer');
const calculateButton = document.getElementById('calculateButton');
const distanceInput = document.getElementById('distanceInput');

let cvReady = false;
let capturedCircles = [];
let calibrationLine = {
    start: { x: 100, y: 100 },
    end: { x: 400, y: 100 },
    dragging: null // 'start', 'end', or null   
};

// =====================================================================
// NEU: Variablen für den zweistufigen Messprozess
// =====================================================================

// Definiert den aktuellen Modus: 'diameter' (Standard) oder 'height'
let measurementMode = 'diameter'; 

// Speicher für die Daten der ersten Messung
let firstMeasurementData = {
    imageData: null, // Hier speichern wir das erste Bild (die runde Dichtung)
    outerDiameter: 0,
    innerDiameter: 0,
    ringWidth: 0
};

// Am Anfang bei den anderen let-Variablen einfügen
let rectangleDragging = {
    handle: null, // z.B. 'topLeft', 'bottomRight', 'body'
    startX: 0,
    startY: 0
};


let capturedRectangle = null;

// --- NEU: Responsive Größe für die Anfasser-Punkte ---
const isMobile = window.innerWidth <= 768;
const handleRadius = isMobile ? 20 : 8; 

// --- NEU & WICHTIG: Responsive Greif-Bereiche definieren ---
const grabRadius = isMobile ? 50 : 40; // 50px für Touch, 40px für Maus (etwas größer als vorher)


// --- 2. INITIALISIERUNG ---
function onOpenCvReady() {
    cvReady = true;
    statusText.textContent = 'Computer Vision bereit. Starte Kamera...';
    startCamera();
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
            statusText.textContent = 'Richten Sie die Kamera auf Dichtung und Lineal.';
        };
    } catch (error) {
        statusText.textContent = 'Kamerazugriff fehlgeschlagen.';
        console.error(error);
    }
}

// --- 3. HAUPTFUNKTION: FOTO AUFNEHMEN & KREISE FINDEN ---
// =====================================================================
// ERSETZEN SIE NUR DIESE EINE FUNKTION
// =====================================================================
// =====================================================================
// ANPASSUNG: takePhotoAndAnalyze wird zur Weiche
// =====================================================================
function takePhotoAndAnalyze() {
    if (!cvReady || videoElement.paused || videoElement.ended) return;

    // Gemeinsame Vorbereitung für beide Modi
    videoContainer.style.display = 'none';
    photoContainer.style.display = 'block';
    measureButton.style.display = 'none';

    photoCanvas.width = videoElement.videoWidth;
    photoCanvas.height = videoElement.videoHeight;
    photoCtx.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);
    videoElement.pause();

    // Weiche: Welchen Modus haben wir?
    if (measurementMode === 'diameter') {
        analyzeForCircles(); // Die bisherige Logik
    } else {
        analyzeForRectangle(); // Die neue Logik
    }
}


// =====================================================================
// NEU: Die Kreisanalyse in einer eigenen Funktion
// (Dies ist der Code, der vorher in takePhotoAndAnalyze stand)
// =====================================================================
function analyzeForCircles() {
    statusText.textContent = 'Dichtung wird gesucht...';

    try {
        let src = cv.imread(photoCanvas);
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        let circles = new cv.Mat();
        cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 80, 100, 35, 15, 150);
        
        capturedCircles = [];
        if (circles.cols > 0) {
            let outerCircle = { x: circles.data32F[0], y: circles.data32F[1], radius: circles.data32F[2] };
            capturedCircles.push(outerCircle);

            let roiRect = new cv.Rect(outerCircle.x - outerCircle.radius, outerCircle.y - outerCircle.radius, outerCircle.radius * 2, outerCircle.radius * 2);
            let roiGray = gray.roi(roiRect);
            let innerCirclesMat = new cv.Mat();
            cv.HoughCircles(roiGray, innerCirclesMat, cv.HOUGH_GRADIENT, 1, 40, 80, 20, 5, outerCircle.radius * 0.8);
            if (innerCirclesMat.cols > 0) {
                capturedCircles.push({ x: innerCirclesMat.data32F[0] + roiRect.x, y: innerCirclesMat.data32F[1] + roiRect.y, radius: innerCirclesMat.data32F[2] });
            }
            roiGray.delete();
            innerCirclesMat.delete();
        }
        
        src.delete(); gray.delete(); circles.delete();
        
        if (capturedCircles.length > 0) {
            statusText.textContent = 'Dichtung gefunden! Bitte kalibrieren Sie die Messung.';
            interactionContainer.style.display = 'flex';
            resetButton.style.display = 'block';
            drawAnalysis();
        } else {
            statusText.textContent = 'Keine Dichtung gefunden. Bitte versuchen Sie es erneut.';
            resetButton.style.display = 'block';
        }

    } catch (error) {
        console.error("Fehler während der OpenCV-Kreisanalyse:", error);
        statusText.textContent = 'Analyse fehlgeschlagen.';
    }
}


// =====================================================================
// NEU: Funktion zur Erkennung des Rechtecks (für die Höhenmessung)
// =====================================================================
// =====================================================================
// VERBESSERUNG: analyzeForRectangle mit Region of Interest (ROI)
// =====================================================================
// =====================================================================
// VERBESSERUNG 2: analyzeForRectangle mit Thresholding gegen Schatten
// =====================================================================
// =====================================================================
// DEBUGGING-VERSION: Zeigt das Threshold-Bild an, um zu sehen, was OpenCV sieht
// =====================================================================
// =====================================================================
// FINALE VERSION: analyzeForRectangle mit Adaptive Thresholding
// =====================================================================
// =====================================================================
// FINALE OPTIMIERUNG: Stärkeres Erodieren, um den Schatten zu entfernen
// =====================================================================
// =====================================================================
// BASIS FÜR TEIL 1: analyzeForRectangle mit Adaptive Thresholding
// =====================================================================
function analyzeForRectangle() {
    statusText.textContent = 'Rechteck wird gesucht...';
    capturedRectangle = null;

    try {
        let src = cv.imread(photoCanvas);
        let roiRect = new cv.Rect(0, 0, src.cols, src.rows * 0.80);
        let roiSrc = src.roi(roiRect);

        let gray = new cv.Mat();
        let thresholded = new cv.Mat();
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();

        cv.cvtColor(roiSrc, gray, cv.COLOR_RGBA2GRAY);
        cv.adaptiveThreshold(gray, thresholded, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

        let M = cv.Mat.ones(3, 3, cv.CV_8U);
        cv.dilate(thresholded, thresholded, M, new cv.Point(-1, -1), 1);
        cv.erode(thresholded, thresholded, M, new cv.Point(-1, -1), 1);
        M.delete();

        cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        if (contours.size() > 0) {
            let maxArea = 0;
            let bestContour = null;
            const minArea = 500;

            for (let i = 0; i < contours.size(); ++i) {
                let cnt = contours.get(i);
                let area = cv.contourArea(cnt, false);
                if (area > maxArea && area > minArea) {
                    maxArea = area;
                    bestContour = cnt;
                }
            }

            if (bestContour) {
                let rect = cv.boundingRect(bestContour);
                capturedRectangle = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
            }
        }

        // WICHTIG: Wir zeichnen das Rechteck jetzt in der drawAnalysis Funktion
        drawAnalysis(); 

        src.delete(); roiSrc.delete(); gray.delete(); thresholded.delete(); contours.delete(); hierarchy.delete();

        if (capturedRectangle) {
            statusText.textContent = 'Rechteck gefunden! Bitte korrigieren und kalibrieren.';
            interactionContainer.style.display = 'flex';
            resetButton.style.display = 'block';
        } else {
            // Fallback, falls nichts gefunden wird: Leeres Rechteck zum manuellen Aufziehen
            capturedRectangle = { x: 100, y: 100, width: 200, height: 50 };
            statusText.textContent = 'Kein Rechteck gefunden. Bitte manuell aufziehen und kalibrieren.';
            interactionContainer.style.display = 'flex';
            resetButton.style.display = 'block';
            drawAnalysis();
        }

    } catch (error) {
        console.error("Fehler während der OpenCV-Rechteckanalyse:", error);
        statusText.textContent = 'Analyse fehlgeschlagen.';
    }
}






// --- 4. ZEICHEN- & INTERAKTIONSFUNKTIONEN ---
// =====================================================================
// ERSETZEN SIE NUR DIESE EINE FUNKTION
// =====================================================================
// =====================================================================
// ANPASSUNG: drawAnalysis zeichnet Kreise nur im Durchmesser-Modus
// =====================================================================
// =====================================================================
// ANPASSUNG FÜR TEIL 1: drawAnalysis zeichnet jetzt alles
// =====================================================================
function drawAnalysis() {
    // Originalbild immer als Hintergrund zeichnen
    photoCtx.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);
    
    // Zeichne gefundene Kreise (nur im Durchmesser-Modus)
    if (measurementMode === 'diameter' && capturedCircles.length > 0) {
        photoCtx.lineWidth = 4;
        photoCtx.strokeStyle = '#00e1a1';
        capturedCircles.forEach(circle => {
            photoCtx.beginPath();
            photoCtx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
            photoCtx.stroke();
        });
    }

    // Zeichne gefundenes Rechteck (nur im Höhen-Modus)
    if (measurementMode === 'height' && capturedRectangle) {
        photoCtx.strokeStyle = '#00e1a1'; // Grün
        photoCtx.lineWidth = 3;
        photoCtx.strokeRect(capturedRectangle.x, capturedRectangle.y, capturedRectangle.width, capturedRectangle.height);
    }

    // Innerhalb der drawAnalysis-Funktion, nach dem Zeichnen des Rechtecks:
if (measurementMode === 'height' && capturedRectangle) {
    photoCtx.strokeStyle = '#00e1a1';
    photoCtx.lineWidth = 3;
    photoCtx.strokeRect(capturedRectangle.x, capturedRectangle.y, capturedRectangle.width, capturedRectangle.height);

    // --- NEU: Anfasser für das Rechteck zeichnen ---
    const handles = {
        topLeft: { x: capturedRectangle.x, y: capturedRectangle.y },
        topRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y },
        bottomLeft: { x: capturedRectangle.x, y: capturedRectangle.y + capturedRectangle.height },
        bottomRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y + capturedRectangle.height }
    };

    photoCtx.fillStyle = '#00e1a1'; // Grüne Füllung
    for (const key in handles) {
        photoCtx.beginPath();
        photoCtx.arc(handles[key].x, handles[key].y, handleRadius, 0, 2 * Math.PI);
        photoCtx.fill();
    }
}

    // Zeichne Kalibrierungslinie (immer, wenn Interaktion aktiv ist)
    photoCtx.lineWidth = 3;
    photoCtx.strokeStyle = 'red';
    photoCtx.beginPath();
    photoCtx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
    photoCtx.lineTo(calibrationLine.end.x, calibrationLine.end.y);
    photoCtx.stroke();

    // Zeichne Anfasser-Punkte für Kalibrierungslinie (immer)
    photoCtx.fillStyle = 'red';
    photoCtx.beginPath();
    photoCtx.arc(calibrationLine.start.x, calibrationLine.start.y, handleRadius, 0, 2 * Math.PI);
    photoCtx.fill();
    photoCtx.beginPath();
    photoCtx.arc(calibrationLine.end.x, calibrationLine.end.y, handleRadius, 0, 2 * Math.PI);
    photoCtx.fill();
}


// =====================================================================
// KORREKTUR: Event Listener für Maus- und Touch-Interaktion
// =====================================================================

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) * (canvas.width / rect.width),
        y: (evt.clientY - rect.top) * (canvas.height / rect.height)
    };
}

// --- Maus-Events ---
// Ersetzen Sie den kompletten mousedown-Listener
photoCanvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(photoCanvas, e);
    
    // Reset dragging states
    calibrationLine.dragging = null;
    rectangleDragging.handle = null;

    if (measurementMode === 'height' && capturedRectangle) {
        // Logik für Rechteck-Interaktion
        const handles = {
            topLeft: { x: capturedRectangle.x, y: capturedRectangle.y },
            topRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y },
            bottomLeft: { x: capturedRectangle.x, y: capturedRectangle.y + capturedRectangle.height },
            bottomRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y + capturedRectangle.height }
        };

        // Prüfe, ob ein Anfasser gegriffen wird
        for (const key in handles) {
            if (Math.hypot(pos.x - handles[key].x, pos.y - handles[key].y) < grabRadius) {
                rectangleDragging.handle = key;
                return; // Wichtig: Interaktion hier beenden
            }
        }

        // Prüfe, ob der Körper des Rechtecks gegriffen wird (zum Verschieben)
        if (pos.x > capturedRectangle.x && pos.x < capturedRectangle.x + capturedRectangle.width &&
            pos.y > capturedRectangle.y && pos.y < capturedRectangle.y + capturedRectangle.height) {
            rectangleDragging.handle = 'body';
            rectangleDragging.startX = pos.x - capturedRectangle.x;
            rectangleDragging.startY = pos.y - capturedRectangle.y;
            return;
        }
    }

    // Fallback: Logik für Kalibrierungslinie (wenn nichts anderes gegriffen wurde)
    if (Math.hypot(pos.x - calibrationLine.start.x, pos.y - calibrationLine.start.y) < grabRadius) {
        calibrationLine.dragging = 'start';
    } else if (Math.hypot(pos.x - calibrationLine.end.x, pos.y - calibrationLine.end.y) < grabRadius) {
        calibrationLine.dragging = 'end';
    }
});

// Ersetzen Sie den kompletten mousemove-Listener
photoCanvas.addEventListener('mousemove', (e) => {
    if (!calibrationLine.dragging && !rectangleDragging.handle) return;

    const pos = getMousePos(photoCanvas, e);

    if (calibrationLine.dragging) {
        calibrationLine[calibrationLine.dragging] = pos;
    } else if (rectangleDragging.handle) {
        // Logik zum Anpassen des Rechtecks
        switch (rectangleDragging.handle) {
            case 'body':
                capturedRectangle.x = pos.x - rectangleDragging.startX;
                capturedRectangle.y = pos.y - rectangleDragging.startY;
                break;
            case 'topLeft':
                capturedRectangle.width += capturedRectangle.x - pos.x;
                capturedRectangle.height += capturedRectangle.y - pos.y;
                capturedRectangle.x = pos.x;
                capturedRectangle.y = pos.y;
                break;
            case 'bottomRight':
                capturedRectangle.width = pos.x - capturedRectangle.x;
                capturedRectangle.height = pos.y - capturedRectangle.y;
                break;
            case 'topRight':
                capturedRectangle.height += capturedRectangle.y - pos.y;
                capturedRectangle.y = pos.y;
                capturedRectangle.width = pos.x - capturedRectangle.x;
                break;
            case 'bottomLeft':
                capturedRectangle.width += capturedRectangle.x - pos.x;
                capturedRectangle.x = pos.x;
                capturedRectangle.height = pos.y - capturedRectangle.y;
                break;
        }
    }
    
    drawAnalysis();
});

// Ersetzen Sie den kompletten mouseup-Listener
photoCanvas.addEventListener('mouseup', () => {
    calibrationLine.dragging = null;
    rectangleDragging.handle = null;
});


photoCanvas.addEventListener('mouseleave', () => {
    calibrationLine.dragging = null;
});

// =====================================================================
// FINALE ANPASSUNG: Touch-Events für Kalibrierung UND Rechteck
// =====================================================================

// --- Touch-Events ---
photoCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getMousePos(photoCanvas, touch);

    // Reset dragging states
    calibrationLine.dragging = null;
    rectangleDragging.handle = null;

    if (measurementMode === 'height' && capturedRectangle) {
        const handles = {
            topLeft: { x: capturedRectangle.x, y: capturedRectangle.y },
            topRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y },
            bottomLeft: { x: capturedRectangle.x, y: capturedRectangle.y + capturedRectangle.height },
            bottomRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y + capturedRectangle.height }
        };

        // Prüfe, ob ein Anfasser gegriffen wird
        for (const key in handles) {
            if (Math.hypot(pos.x - handles[key].x, pos.y - handles[key].y) < grabRadius) { // grabRadius ist hier größer für Touch
                rectangleDragging.handle = key;
                return;
            }
        }

        // Prüfe, ob der Körper des Rechtecks gegriffen wird
        if (pos.x > capturedRectangle.x && pos.x < capturedRectangle.x + capturedRectangle.width &&
            pos.y > capturedRectangle.y && pos.y < capturedRectangle.y + capturedRectangle.height) {
            rectangleDragging.handle = 'body';
            rectangleDragging.startX = pos.x - capturedRectangle.x;
            rectangleDragging.startY = pos.y - capturedRectangle.y;
            return;
        }
    }

    // Fallback: Logik für Kalibrierungslinie
    if (Math.hypot(pos.x - calibrationLine.start.x, pos.y - calibrationLine.start.y) < grabRadius) {
        calibrationLine.dragging = 'start';
    } else if (Math.hypot(pos.x - calibrationLine.end.x, pos.y - calibrationLine.end.y) < grabRadius) {
        calibrationLine.dragging = 'end';
    }
}, { passive: false });

photoCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!calibrationLine.dragging && !rectangleDragging.handle) return;

    const touch = e.touches[0];
    const pos = getMousePos(photoCanvas, touch);

    if (calibrationLine.dragging) {
        calibrationLine[calibrationLine.dragging] = pos;
    } else if (rectangleDragging.handle) {
        switch (rectangleDragging.handle) {
            case 'body':
                capturedRectangle.x = pos.x - rectangleDragging.startX;
                capturedRectangle.y = pos.y - rectangleDragging.startY;
                break;
            case 'topLeft':
                capturedRectangle.width += capturedRectangle.x - pos.x;
                capturedRectangle.height += capturedRectangle.y - pos.y;
                capturedRectangle.x = pos.x;
                capturedRectangle.y = pos.y;
                break;
            case 'bottomRight':
                capturedRectangle.width = pos.x - capturedRectangle.x;
                capturedRectangle.height = pos.y - capturedRectangle.y;
                break;
            case 'topRight':
                capturedRectangle.height += capturedRectangle.y - pos.y;
                capturedRectangle.y = pos.y;
                capturedRectangle.width = pos.x - capturedRectangle.x;
                break;
            case 'bottomLeft':
                capturedRectangle.width += capturedRectangle.x - pos.x;
                capturedRectangle.x = pos.x;
                capturedRectangle.height = pos.y - capturedRectangle.y;
                break;
        }
    }
    
    drawAnalysis();
}, { passive: false });

photoCanvas.addEventListener('touchend', () => {
    calibrationLine.dragging = null;
    rectangleDragging.handle = null;
});


// --- 5. FINALE BERECHNUNG & RESET ---
// =====================================================================
// =====================================================================
// FINALE VERSION BASIEREND AUF IHRER DEFINITIVEN KLARSTELLUNG
// Ersetzen Sie die calculateFinalMeasurement Funktion hiermit.
// =====================================================================
// =====================================================================
// ANPASSUNG: calculateFinalMeasurement
// Zeigt jetzt den "Höhe messen"-Button an und speichert die Ergebnisse.
// =====================================================================
// =====================================================================
// ANPASSUNG: calculateFinalMeasurement wird zur finalen Schaltzentrale
// =====================================================================
function calculateFinalMeasurement() {
    const distanceCm = parseFloat(distanceInput.value);
    if (!distanceCm || distanceCm <= 0) {
        alert('Bitte geben Sie eine gültige Distanz in cm ein.');
        return;
    }

    const lineLengthPx = Math.hypot(calibrationLine.end.x - calibrationLine.start.x, calibrationLine.end.y - calibrationLine.start.y);
    const pixelsPerCm = lineLengthPx / distanceCm;

    // Weiche: Welchen Modus haben wir?
    if (measurementMode === 'diameter') {
        // --- LOGIK FÜR STUFE 1: DURCHMESSER-MESSUNG ---
        
        capturedCircles.sort((a, b) => b.radius - a.radius);
        const greenLineWidth = 4; 
        const radiusCorrection = greenLineWidth / 2;

        const outerRadiusCorrected = capturedCircles[0].radius - radiusCorrection;
        const finalOuterDiameter = (outerRadiusCorrected * 2) / pixelsPerCm;

        let resultHTML = `<p><strong>Ergebnis (Stufe 1/2):</strong></p>`;
        resultHTML += `<p>Außendurchmesser: ~${finalOuterDiameter.toFixed(2)} cm</p>`;

        let finalInnerDiameter = 0;
        let finalRingWidth = 0;

        if (capturedCircles.length > 1) {
            const innerRadiusCorrected = capturedCircles[1].radius + radiusCorrection;
            finalInnerDiameter = (innerRadiusCorrected * 2) / pixelsPerCm;
            resultHTML += `<p>Innendurchmesser: ~${finalInnerDiameter.toFixed(2)} cm</p>`;

            finalRingWidth = (finalOuterDiameter - finalInnerDiameter) / 2;
            if (finalRingWidth > 0) {
                resultHTML += `<p><strong>Schnurstärke: ~${finalRingWidth.toFixed(2)} cm</strong></p>`;
            }
        }
        
        quickResults.innerHTML = resultHTML;

        // Daten der ersten Messung speichern
        firstMeasurementData.imageData = photoCanvas.toDataURL('image/jpeg');
        firstMeasurementData.outerDiameter = finalOuterDiameter;
        firstMeasurementData.innerDiameter = finalInnerDiameter;
        firstMeasurementData.ringWidth = finalRingWidth;

        // Button für die Höhenmessung anzeigen
        document.getElementById('heightMeasurementControls').style.display = 'block';
        interactionContainer.style.display = 'none'; // Eingabefeld nach Berechnung ausblenden

    } else if (measurementMode === 'height') {
        // --- LOGIK FÜR STUFE 2: HÖHEN-MESSUNG & FINALES ERGEBNIS ---

// =====================================================================
// FINALE KORREKTUR: Rechteck-Messung von Innenkante zu Innenkante
// =====================================================================

// Die Linienbreite des grünen Rechtecks (muss mit dem Wert in drawAnalysis übereinstimmen)
const rectangleLineWidth = 3; 

// Korrigierte Höhe: Gesamthöhe minus halbe Linienbreite oben und unten
const correctedHeightPx = capturedRectangle.height - rectangleLineWidth;
const measuredHeight = correctedHeightPx / pixelsPerCm;

// Korrigierte Breite: Gesamtbreite minus halbe Linienbreite links und rechts
const correctedWidthPx = capturedRectangle.width - rectangleLineWidth;
const controlOuterDiameter = correctedWidthPx / pixelsPerCm;


        // 2. Finale Bilder vorbereiten
        const finalImageContainer = document.getElementById('finalImagesContainer');
        const finalCanvas1 = document.getElementById('finalImage1');
        const finalCanvas2 = document.getElementById('finalImage2');
        const ctx1 = finalCanvas1.getContext('2d');
        const ctx2 = finalCanvas2.getContext('2d');

        // Bild 1 (Durchmesser) zeichnen
        let img1 = new Image();
        img1.onload = function() {
            finalCanvas1.width = img1.width;
            finalCanvas1.height = img1.height;
            ctx1.drawImage(img1, 0, 0);
        };
        img1.src = firstMeasurementData.imageData;

        // Bild 2 (Höhe) zeichnen
        let img2 = new Image();
        img2.onload = function() {
            finalCanvas2.width = img2.width;
            finalCanvas2.height = img2.height;
            ctx2.drawImage(img2, 0, 0);
        };
        img2.src = photoCanvas.toDataURL('image/jpeg');
        
        finalImageContainer.style.display = 'flex'; // Bilder-Container anzeigen

        // 3. Finales Gesamtergebnis zusammenstellen
        let resultHTML = `<p><strong>Komplettes Messergebnis:</strong></p>`;
        resultHTML += `<p>Außendurchmesser: ~${firstMeasurementData.outerDiameter.toFixed(2)} cm</p>`;
        resultHTML += `<p>Innendurchmesser: ~${firstMeasurementData.innerDiameter.toFixed(2)} cm</p>`;
        resultHTML += `<p><strong>Höhe: ~${measuredHeight.toFixed(2)} cm</strong></p>`;
        resultHTML += `<hr style="margin: 10px 0;">`;
        resultHTML += `<p style="opacity: 0.8;">Schnurstärke (aus 1. Messung): ~${firstMeasurementData.ringWidth.toFixed(2)} cm</p>`;
        resultHTML += `<p style="opacity: 0.8;">Kontrolle Außendurchmesser (aus 2. Messung): ~${controlOuterDiameter.toFixed(2)} cm</p>`;

        quickResults.innerHTML = resultHTML;

        // UI aufräumen
        photoContainer.style.display = 'none'; // Analyse-Canvas ausblenden
        interactionContainer.style.display = 'none';
        resetButton.style.display = 'block'; // Nur noch "Neue Messung" ist möglich
    }
}





// =====================================================================
// ANPASSUNG: resetApp setzt jetzt den gesamten Prozess zurück
// =====================================================================
function resetApp() {
    // UI-Elemente zurücksetzen
    videoContainer.style.display = 'block';
    photoContainer.style.display = 'none';
    measureButton.style.display = 'block';
    resetButton.style.display = 'none';
    interactionContainer.style.display = 'none';
    document.getElementById('heightMeasurementControls').style.display = 'none';
    document.getElementById('finalImagesContainer').style.display = 'none';
    quickResults.innerHTML = '';
    distanceInput.value = '';
    statusText.textContent = 'Richten Sie die Kamera auf Dichtung und Lineal.';
    
    // NEU: Zustandsvariablen zurücksetzen
    measurementMode = 'diameter';
    capturedCircles = [];
    capturedRectangle = null;
    firstMeasurementData = {
        imageData: null,
        outerDiameter: 0,
        innerDiameter: 0,
        ringWidth: 0
    };

    // Kamera starten
    videoElement.play();
}

// --- 6. EVENT LISTENERS & START ---
measureButton.addEventListener('click', takePhotoAndAnalyze);
resetButton.addEventListener('click', resetApp);
calculateButton.addEventListener('click', calculateFinalMeasurement);

// =====================================================================
// NEU: Logik für den Start der Höhenmessung
// =====================================================================

// Referenz auf den neuen Button holen
const measureHeightButton = document.getElementById('measureHeightButton');

// Event Listener für den Klick auf den Button
measureHeightButton.addEventListener('click', setupHeightMeasurement);

function setupHeightMeasurement() {
    // 1. Modus auf 'height' umschalten
    measurementMode = 'height';

    // 2. UI für die zweite Messung vorbereiten
    statusText.textContent = 'Dichtung aufrecht stellen und von oben fotografieren.';
    
    // UI-Elemente für die Messung wieder einblenden/ausblenden
    videoContainer.style.display = 'block';
    photoContainer.style.display = 'none';
    interactionContainer.style.display = 'none'; // Eingabefeld für Distanz ausblenden
    document.getElementById('heightMeasurementControls').style.display = 'none'; // "Höhe messen"-Button ausblenden
    
    // Alte Ergebnisse löschen, Platz für neue Anweisungen machen
    quickResults.innerHTML = ''; 
    
    // Haupt-Aufnahmeknopf ("Foto aufnehmen & Analysieren") wieder anzeigen
    measureButton.style.display = 'block';
    
    // "Neue Messung"-Button vorübergehend ausblenden
    resetButton.style.display = 'none';

    // 3. Kamera reaktivieren
    videoElement.play();
}



var cvCheckInterval = setInterval(() => {
    if (window.cv) {
        clearInterval(cvCheckInterval);
        onOpenCvReady();
    }
}, 100);
