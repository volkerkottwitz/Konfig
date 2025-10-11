// =====================================================================
// FINALES, KOMPLETTES SKRIPT (Stand: 11. Oktober 2025)
// =====================================================================

// --- 1. GRUNDEINSTELLUNGEN & VARIABLEN ---
const statusText = document.getElementById('statusText');
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
const measureHeightButton = document.getElementById('measureHeightButton');

let showMagnifier = false;
let cvReady = false;
let capturedCircles = [];
let calibrationLine = {
    start: { x: 100, y: 100 },
    end: { x: 400, y: 100 },
    dragging: null
};

// Variablen für den zweistufigen Messprozess
let measurementMode = 'diameter';
let firstMeasurementData = {
    imageData: null,
    outerDiameter: 0,
    innerDiameter: 0,
    ringWidth: 0
};

// Variablen für das interaktive Rechteck
let capturedRectangle = null;
let rectangleDragging = {
    handle: null,
    startX: 0,
    startY: 0
};

// Responsive Größen für Anfasser und Greif-Bereich
const isMobile = window.innerWidth <= 768;
const handleRadius = isMobile ? 20 : 10;
const grabRadius = isMobile ? 50 : 40;

// --- 2. INITIALISIERUNG ---
function onOpenCvReady() {
    cvReady = true;
    statusText.textContent = 'Computer Vision bereit. Starte Kamera...';
    startCamera();
}

// =====================================================================
// ERSETZEN: startCamera mit dynamischer Kamera-Steuerung
// =====================================================================
// =====================================================================
// ERSETZEN: startCamera mit Zoom, Fokus UND Tap-to-Focus
// =====================================================================
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'environment', 
                width: { ideal: 1280 }, 
                height: { ideal: 720 } 
            } 
        });
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
            statusText.textContent = 'Richten Sie die Kamera auf Dichtung und Lineal.';

            const videoTrack = stream.getVideoTracks()[0];
            const capabilities = videoTrack.getCapabilities();
            const controlsContainer = document.getElementById('cameraControls');
            controlsContainer.innerHTML = '';

            let controlsAdded = false;

            // 1. ZOOM-Regler
            if (capabilities.zoom) {
                controlsAdded = true;
                const zoomControl = createSliderControl('Zoom', capabilities.zoom.min, capabilities.zoom.max, capabilities.zoom.step, videoTrack.getSettings().zoom || capabilities.zoom.min, (value) => videoTrack.applyConstraints({ advanced: [{ zoom: value }] }));
                controlsContainer.appendChild(zoomControl);
            }

            // 2. FOKUS-Regler (falls manuell unterstützt)
            if (capabilities.focusMode && capabilities.focusMode.includes('manual')) {
                controlsAdded = true;
                const focusControl = createSliderControl('Fokus', capabilities.focusDistance.min, capabilities.focusDistance.max, capabilities.focusDistance.step, videoTrack.getSettings().focusDistance || capabilities.focusDistance.min, (value) => videoTrack.applyConstraints({ advanced: [{ focusMode: 'manual', focusDistance: value }] }));
                controlsContainer.appendChild(focusControl);
            } 
            // 3. TAP-TO-FOCUS (falls 'continuous' und 'pointsOfInterest' unterstützt werden)
            else if (capabilities.focusMode && capabilities.focusMode.includes('continuous') && capabilities.pointsOfInterest) {
                videoElement.addEventListener('click', (event) => {
                    const rect = videoElement.getBoundingClientRect();
                    // Klick-Position auf 0-1 normalisieren
                    const x = (event.clientX - rect.left) / rect.width;
                    const y = (event.clientY - rect.top) / rect.height;

                    // Constraints anwenden
                    videoTrack.applyConstraints({
                        advanced: [{
                            pointsOfInterest: [{ x, y }],
                            focusMode: 'continuous'
                        }]
                    }).catch(e => console.error("Tap-to-focus fehlgeschlagen:", e));
                    
                    // Visuelles Feedback für den Klick
                    showFocusIndicator(x * rect.width, y * rect.height);
                });
                // Hinweis für den Nutzer hinzufügen
                statusText.textContent += ' (Tippen zum Fokussieren)';
            }

            if (controlsAdded) {
                controlsContainer.style.display = 'flex';
            }
        };
    } catch (error) {
        statusText.textContent = 'Kamerazugriff fehlgeschlagen.';
        console.error(error);
    }
}



// =====================================================================
// HINZUFÜGEN: Hilfsfunktion zum Erstellen eines Schiebereglers
// =====================================================================
function createSliderControl(label, min, max, step, current, onChange) {
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'space-between';
    container.style.gap = '10px'; // Kleiner Abstand zwischen Label und Slider

    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.style.flexBasis = '50px'; // Feste Breite für das Label

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = min;
    slider.max = max;
    slider.step = step;
    slider.value = current;
    slider.style.flexGrow = '1'; // Slider füllt den restlichen Platz

    slider.oninput = () => {
        onChange(slider.value);
    };

    container.appendChild(labelElement);
    container.appendChild(slider);
    return container;
}

// --- 3. HAUPTFUNKTIONEN & ANALYSE ---
function takePhotoAndAnalyze() {
    if (!cvReady || videoElement.paused || videoElement.ended) return;

    document.getElementById('cameraControls').style.display = 'none';

    videoContainer.style.display = 'none';
    photoContainer.style.display = 'block';
    measureButton.style.display = 'none';

    photoCanvas.width = videoElement.videoWidth;
    photoCanvas.height = videoElement.videoHeight;
    photoCtx.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);
    videoElement.pause();

    if (measurementMode === 'diameter') {
        analyzeForCircles();
    } else {
        analyzeForRectangle();
    }
}

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
            roiGray.delete(); innerCirclesMat.delete();
        }
        
        src.delete(); gray.delete(); circles.delete();
        
        if (capturedCircles.length > 0) {
            statusText.textContent = 'Dichtung gefunden! Bitte kalibrieren Sie die Messung.';
            interactionContainer.style.display = 'flex';
            resetButton.style.display = 'block';
            drawAnalysis();
        } else {
            // --- NEUER FEHLERFALL ---
            statusText.textContent = 'Keine Dichtung gefunden. Bitte versuchen Sie es erneut.';
            // Wir zeigen nicht mehr den Reset-Button, sondern kehren zur Kamera zurück,
            // aber mit einer kleinen Verzögerung, damit der Nutzer die Nachricht lesen kann.
            setTimeout(() => {
                returnToCamera();
            }, 1500); // 2 Sekunden warten, dann zurück zur Kamera
        }

    } catch (error) { // Die catch-Klammer für den try-Block
        console.error("Fehler während der OpenCV-Kreisanalyse:", error);
        statusText.textContent = 'Analyse fehlgeschlagen.';
        // Auch hier sollten wir zur Kamera zurückkehren!
        setTimeout(() => {
            returnToCamera();
        }, 1500);
    } // <<--- DIESE SCHLIESSENDE KLAMMER FÜR DEN try/catch-BLOCK HAT GEFEHLT
} // <<--- UND DIESE SCHLIESSENDE KLAMMER FÜR DIE GANZE FUNKTION HAT GEFEHLT


    

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

        let M = cv.Mat.ones(5, 5, cv.CV_8U);
        let iterations = 3;
        cv.erode(thresholded, thresholded, M, new cv.Point(-1, -1), iterations);
        M.delete();

        cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

        if (contours.size() > 0) {
            let maxArea = 0;
            let bestContour = null;
            const minArea = 100;
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

        drawAnalysis();
        src.delete(); roiSrc.delete(); gray.delete(); thresholded.delete(); contours.delete(); hierarchy.delete();

        if (capturedRectangle) {
            statusText.textContent = 'Rechteck gefunden! Bitte korrigieren und kalibrieren.';
            interactionContainer.style.display = 'flex';
            resetButton.style.display = 'block';

} else {
    // --- NEUER FEHLERFALL ---
    statusText.textContent = 'Kein passendes Rechteck gefunden. Bitte versuchen Sie es erneut.';
    setTimeout(() => {
        returnToCamera();
    }, 2000);
}

    } catch (error) {
        console.error("Fehler während der OpenCV-Rechteckanalyse:", error);
        statusText.textContent = 'Analyse fehlgeschlagen.';
    }
}

// --- 4. ZEICHEN- & INTERAKTIONSFUNKTIONEN ---
function drawAnalysis() {
    photoCtx.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);
    
    if (measurementMode === 'diameter' && capturedCircles.length > 0) {
        photoCtx.lineWidth = 4;
        photoCtx.strokeStyle = '#00e1a1';
        capturedCircles.forEach(circle => {
            photoCtx.beginPath();
            photoCtx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
            photoCtx.stroke();
        });
    }

    if (measurementMode === 'height' && capturedRectangle) {
        photoCtx.strokeStyle = '#00e1a1';
        photoCtx.lineWidth = 3;
        photoCtx.strokeRect(capturedRectangle.x, capturedRectangle.y, capturedRectangle.width, capturedRectangle.height);

        const handles = {
            topLeft: { x: capturedRectangle.x, y: capturedRectangle.y },
            topRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y },
            bottomLeft: { x: capturedRectangle.x, y: capturedRectangle.y + capturedRectangle.height },
            bottomRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y + capturedRectangle.height }
        };
        photoCtx.fillStyle = '#00e1a1';
        for (const key in handles) {
            photoCtx.beginPath();
            photoCtx.arc(handles[key].x, handles[key].y, handleRadius, 0, 2 * Math.PI);
            photoCtx.fill();
        }
    }

    photoCtx.lineWidth = 3;
    photoCtx.strokeStyle = 'red';
    photoCtx.beginPath();
    photoCtx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
    photoCtx.lineTo(calibrationLine.end.x, calibrationLine.end.y);
    photoCtx.stroke();

    photoCtx.fillStyle = 'red';
    photoCtx.beginPath();
    photoCtx.arc(calibrationLine.start.x, calibrationLine.start.y, handleRadius, 0, 2 * Math.PI);
    photoCtx.fill();
    photoCtx.beginPath();
    photoCtx.arc(calibrationLine.end.x, calibrationLine.end.y, handleRadius, 0, 2 * Math.PI);
    photoCtx.fill();
    // =====================================================================
// HINZUFÜGEN: Code zum Zeichnen der Lupe am Ende von drawAnalysis
// =====================================================================
function drawAnalysis() {
    // ... (der gesamte bisherige Code der Funktion zum Zeichnen von Bild, Kreisen, Rechteck, Linien) ...

    // NEUER CODE FÜR DIE LUPE:
    if (showMagnifier && calibrationLine.dragging) {
        // Position des aktuell gezogenen Punktes bestimmen
        const draggedPoint = calibrationLine[calibrationLine.dragging];

        // Parameter für die Lupe definieren
        const magnifierSize = 120; // Größe der Lupe in Pixeln (etwas größer für bessere Sicht)
        const zoomFactor = 3.0;    // Wie stark wird vergrößert?
        const sourceSize = magnifierSize / zoomFactor; // Größe des Bildausschnitts, der vergrößert wird

        // Position der Lupe (schwebt über dem gezogenen Punkt)
        const magnifierX = draggedPoint.x - (magnifierSize / 2);
        const magnifierY = draggedPoint.y - magnifierSize - 30; // 30px Abstand über dem Punkt

        // --- Lupe zeichnen ---
        photoCtx.save(); // Aktuellen Zeichenzustand (Stile, etc.) speichern

        // 1. Runden Clip-Bereich für die Lupe erstellen
        photoCtx.beginPath();
        photoCtx.arc(magnifierX + magnifierSize / 2, magnifierY + magnifierSize / 2, magnifierSize / 2, 0, 2 * Math.PI);
        photoCtx.lineWidth = 5; // Dickerer Rand für bessere Sichtbarkeit
        photoCtx.strokeStyle = 'red';
        photoCtx.stroke();
        photoCtx.clip(); // Wichtig: Alles, was jetzt gezeichnet wird, erscheint nur innerhalb dieses Kreises

        // 2. Vergrößerten Bildausschnitt in die Lupe zeichnen
        photoCtx.drawImage(
            photoCanvas, // Das Quell-Canvas, von dem wir den Ausschnitt nehmen
            draggedPoint.x - sourceSize / 2, draggedPoint.y - sourceSize / 2, // Quell-Position (unter dem Punkt)
            sourceSize, sourceSize,                                           // Quell-Größe
            magnifierX, magnifierY,                                           // Ziel-Position (die Lupe selbst)
            magnifierSize, magnifierSize                                      // Ziel-Größe (vergrößerte Darstellung)
        );

        // 3. Fadenkreuz in der Mitte der Lupe zeichnen
        photoCtx.beginPath();
        photoCtx.strokeStyle = 'rgba(0, 255, 225, 0.8)'; // Cyan, leicht transparent
        photoCtx.lineWidth = 2;
        // Horizontale Linie
        photoCtx.moveTo(magnifierX, magnifierY + magnifierSize / 2);
        photoCtx.lineTo(magnifierX + magnifierSize, magnifierY + magnifierSize / 2);
        // Vertikale Linie
        photoCtx.moveTo(magnifierX + magnifierSize / 2, magnifierY);
        photoCtx.lineTo(magnifierX + magnifierSize / 2, magnifierY + magnifierSize);
        photoCtx.stroke();

        photoCtx.restore(); // Ursprünglichen Zeichenzustand (ohne Clip-Bereich) wiederherstellen
    }
}

}

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) * (canvas.width / rect.width),
        y: (evt.clientY - rect.top) * (canvas.height / rect.height)
    };
}

// --- 5. FINALE BERECHNUNG & RESET ---
function calculateFinalMeasurement() {
    const distanceCm = parseFloat(distanceInput.value);
    if (!distanceCm || distanceCm <= 0) {
        alert('Bitte geben Sie eine gültige Distanz in cm ein.');
        return;
    }
    const lineLengthPx = Math.hypot(calibrationLine.end.x - calibrationLine.start.x, calibrationLine.end.y - calibrationLine.start.y);
    const pixelsPerCm = lineLengthPx / distanceCm;

    if (measurementMode === 'diameter') {
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
        firstMeasurementData.imageData = photoCanvas.toDataURL('image/jpeg');
        firstMeasurementData.outerDiameter = finalOuterDiameter;
        firstMeasurementData.innerDiameter = finalInnerDiameter;
        firstMeasurementData.ringWidth = finalRingWidth;
        document.getElementById('heightMeasurementControls').style.display = 'block';
        interactionContainer.style.display = 'none';
    } else if (measurementMode === 'height') {
        // HIER IST DIE FINALE KORREKTUR EINGEBAUT
        const rectangleLineWidth = 3;
        const correctedHeightPx = capturedRectangle.height - rectangleLineWidth;
        const measuredHeight = correctedHeightPx / pixelsPerCm;
        const correctedWidthPx = capturedRectangle.width - rectangleLineWidth;
        const controlOuterDiameter = correctedWidthPx / pixelsPerCm;

        const finalImageContainer = document.getElementById('finalImagesContainer');
        const finalCanvas1 = document.getElementById('finalImage1');
        const finalCanvas2 = document.getElementById('finalImage2');
        const ctx1 = finalCanvas1.getContext('2d');
        const ctx2 = finalCanvas2.getContext('2d');
        let img1 = new Image();
        img1.onload = function() {
            finalCanvas1.width = img1.width;
            finalCanvas1.height = img1.height;
            ctx1.drawImage(img1, 0, 0);
        };
        img1.src = firstMeasurementData.imageData;
        let img2 = new Image();
        img2.onload = function() {
            finalCanvas2.width = img2.width;
            finalCanvas2.height = img2.height;
            ctx2.drawImage(img2, 0, 0);
        };
        img2.src = photoCanvas.toDataURL('image/jpeg');
        finalImageContainer.style.display = 'flex';
        let resultHTML = `<p><strong>Komplettes Messergebnis:</strong></p>`;
        resultHTML += `<p>Außendurchmesser: ~${firstMeasurementData.outerDiameter.toFixed(2)} cm</p>`;
        if (firstMeasurementData.innerDiameter > 0) {
            resultHTML += `<p>Innendurchmesser: ~${firstMeasurementData.innerDiameter.toFixed(2)} cm</p>`;
        }
        resultHTML += `<p><strong>Höhe: ~${measuredHeight.toFixed(2)} cm</strong></p>`;
        resultHTML += `<hr style="margin: 10px 0;">`;
        if (firstMeasurementData.ringWidth > 0) {
            resultHTML += `<p style="opacity: 0.8;">Schnurstärke (aus 1. Messung): ~${firstMeasurementData.ringWidth.toFixed(2)} cm</p>`;
        }
// NEUE, KLARE ZEILE
resultHTML += `<p style="opacity: 0.8;">Breite (aus 2. Messung): ~${controlOuterDiameter.toFixed(2)} cm</p>`;
        quickResults.innerHTML = resultHTML;
        photoContainer.style.display = 'none';
        interactionContainer.style.display = 'none';
        document.getElementById('heightMeasurementControls').style.display = 'none';
        resetButton.style.display = 'block';
    }
}


// =====================================================================
// NEU: Funktion, um zur Live-Kamera zurückzukehren
// =====================================================================
function returnToCamera() {
    photoContainer.style.display = 'none';
    videoContainer.style.display = 'block';
    
    // Kamera-Steuerung wieder anzeigen, falls vorhanden
    const controlsContainer = document.getElementById('cameraControls');
    if (controlsContainer.innerHTML !== '') {
        controlsContainer.style.display = 'flex';
    }
    
    videoElement.play();
    statusText.textContent = 'Richten Sie die Kamera neu aus und versuchen Sie es erneut.';
    
    // Wichtig: Buttons für einen neuen Versuch bereit machen
    measureButton.style.display = 'block';
    resetButton.style.display = 'none'; // "Neue Messung" hier ausblenden
    interactionContainer.style.display = 'none';
}


function resetApp() {
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
    measurementMode = 'diameter';
    capturedCircles = [];
    capturedRectangle = null;
    firstMeasurementData = { imageData: null, outerDiameter: 0, innerDiameter: 0, ringWidth: 0 };

        // NEUE LOGIK: Kamera-Steuerung wieder anzeigen, aber nur wenn sie Inhalt hat
    const controlsContainer = document.getElementById('cameraControls');
    if (controlsContainer.innerHTML !== '') {
        controlsContainer.style.display = 'flex';
    }

    videoElement.play();
}

function setupHeightMeasurement() {
    measurementMode = 'height';
    statusText.textContent = 'Dichtung aufrecht stellen und von oben fotografieren.';
    videoContainer.style.display = 'block';
    photoContainer.style.display = 'none';
    interactionContainer.style.display = 'none';
    document.getElementById('heightMeasurementControls').style.display = 'none';
    quickResults.innerHTML = '';
    measureButton.style.display = 'block';
    resetButton.style.display = 'none';

        // NEUE LOGIK: Kamera-Steuerung wieder anzeigen, aber nur wenn sie Inhalt hat
    const controlsContainer = document.getElementById('cameraControls');
    if (controlsContainer.innerHTML !== '') {
        controlsContainer.style.display = 'flex';
    }

    videoElement.play();
}

// --- 6. EVENT LISTENERS & START ---
measureButton.addEventListener('click', takePhotoAndAnalyze);
resetButton.addEventListener('click', resetApp);
calculateButton.addEventListener('click', calculateFinalMeasurement);
measureHeightButton.addEventListener('click', setupHeightMeasurement);

// --- Maus-Events ---
photoCanvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(photoCanvas, e);
    calibrationLine.dragging = null;
    rectangleDragging.handle = null;
    if (measurementMode === 'height' && capturedRectangle) {
        const handles = {
            topLeft: { x: capturedRectangle.x, y: capturedRectangle.y },
            topRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y },
            bottomLeft: { x: capturedRectangle.x, y: capturedRectangle.y + capturedRectangle.height },
            bottomRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y + capturedRectangle.height }
        };
        for (const key in handles) {
            if (Math.hypot(pos.x - handles[key].x, pos.y - handles[key].y) < grabRadius) {
                rectangleDragging.handle = key;
                return;
            }
        }
        if (pos.x > capturedRectangle.x && pos.x < capturedRectangle.x + capturedRectangle.width &&
            pos.y > capturedRectangle.y && pos.y < capturedRectangle.y + capturedRectangle.height) {
            rectangleDragging.handle = 'body';
            rectangleDragging.startX = pos.x - capturedRectangle.x;
            rectangleDragging.startY = pos.y - capturedRectangle.y;
            return;
        }
    }
    if (Math.hypot(pos.x - calibrationLine.start.x, pos.y - calibrationLine.start.y) < grabRadius) {
        calibrationLine.dragging = 'start';
        showMagnifier = true; // LUPE AN
    } else if (Math.hypot(pos.x - calibrationLine.end.x, pos.y - calibrationLine.end.y) < grabRadius) {
        calibrationLine.dragging = 'end';
        showMagnifier = true; // LUPE AN
    }
});

photoCanvas.addEventListener('mousemove', (e) => {
    if (!calibrationLine.dragging && !rectangleDragging.handle) return;
    const pos = getMousePos(photoCanvas, e);
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
});

// Ersetzen Sie Ihren kompletten 'mouseup'-Listener hiermit:
photoCanvas.addEventListener('mouseup', () => {
    if (showMagnifier) {
        drawAnalysis(); // Ein letztes Mal ohne Lupe zeichnen
    }
    calibrationLine.dragging = null;
    rectangleDragging.handle = null;
    showMagnifier = false; // LUPE AUS
});


photoCanvas.addEventListener('mouseleave', () => {
    calibrationLine.dragging = null;
    rectangleDragging.handle = null;
});

// --- Touch-Events ---
photoCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getMousePos(photoCanvas, touch);
    calibrationLine.dragging = null;
    rectangleDragging.handle = null;
    if (measurementMode === 'height' && capturedRectangle) {
        const handles = {
            topLeft: { x: capturedRectangle.x, y: capturedRectangle.y },
            topRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y },
            bottomLeft: { x: capturedRectangle.x, y: capturedRectangle.y + capturedRectangle.height },
            bottomRight: { x: capturedRectangle.x + capturedRectangle.width, y: capturedRectangle.y + capturedRectangle.height }
        };
        for (const key in handles) {
            if (Math.hypot(pos.x - handles[key].x, pos.y - handles[key].y) < grabRadius) {
                rectangleDragging.handle = key;
                return;
            }
        }
        if (pos.x > capturedRectangle.x && pos.x < capturedRectangle.x + capturedRectangle.width &&
            pos.y > capturedRectangle.y && pos.y < capturedRectangle.y + capturedRectangle.height) {
            rectangleDragging.handle = 'body';
            rectangleDragging.startX = pos.x - capturedRectangle.x;
            rectangleDragging.startY = pos.y - capturedRectangle.y;
            return;
        }
    }
    if (Math.hypot(pos.x - calibrationLine.start.x, pos.y - calibrationLine.start.y) < grabRadius) {
        calibrationLine.dragging = 'start';
        showMagnifier = true; // LUPE AN
    } else if (Math.hypot(pos.x - calibrationLine.end.x, pos.y - calibrationLine.end.y) < grabRadius) {
        calibrationLine.dragging = 'end';
        showMagnifier = true; // LUPE AN
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

// Ersetzen Sie Ihren kompletten 'touchend'-Listener hiermit:
photoCanvas.addEventListener('touchend', () => {
    if (showMagnifier) {
        drawAnalysis(); // Ein letztes Mal ohne Lupe zeichnen
    }
    calibrationLine.dragging = null;
    rectangleDragging.handle = null;
    showMagnifier = false; // LUPE AUS
});

// Start der OpenCV-Initialisierung
var cvCheckInterval = setInterval(() => {
    if (window.cv) {
        clearInterval(cvCheckInterval);
        onOpenCvReady();
    }
}, 100);
