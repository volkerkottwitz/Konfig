// =====================================================================
// FINALE, INTERAKTIVE VERSION
// =====================================================================

// --- 1. GRUNDEINSTELLUNGEN & VARIABLEN ---
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
function takePhotoAndAnalyze() {
    if (!cvReady || videoElement.paused || videoElement.ended) return;

    statusText.textContent = 'Dichtung wird gesucht...';
    videoContainer.style.display = 'none';
    photoContainer.style.display = 'block';
    measureButton.style.display = 'none';

    photoCanvas.width = videoElement.videoWidth;
    photoCanvas.height = videoElement.videoHeight;
    photoCtx.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);
    videoElement.pause();

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
            drawAnalysis(); // Zeichnet Kreise und die Kalibrierungslinie
        } else {
            statusText.textContent = 'Keine Dichtung gefunden. Bitte versuchen Sie es erneut.';
            resetButton.style.display = 'block';
        }

    } catch (error) {
        console.error("Fehler während der OpenCV-Analyse:", error);
        statusText.textContent = 'Analyse fehlgeschlagen.';
    }
}

// --- 4. ZEICHEN- & INTERAKTIONSFUNKTIONEN ---
function drawAnalysis() {
    photoCtx.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);
    
    // Zeichne gefundene Kreise
    photoCtx.lineWidth = 4;
    photoCtx.strokeStyle = '#00e1a1';
    capturedCircles.forEach(circle => {
        photoCtx.beginPath();
        photoCtx.arc(circle.x, circle.y, circle.radius, 0, 2 * Math.PI);
        photoCtx.stroke();
    });

    // Zeichne Kalibrierungslinie
    photoCtx.lineWidth = 3;
    photoCtx.strokeStyle = 'red';
    photoCtx.beginPath();
    photoCtx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
    photoCtx.lineTo(calibrationLine.end.x, calibrationLine.end.y);
    photoCtx.stroke();

    // Zeichne Anfasser-Punkte
    photoCtx.fillStyle = 'red';
    photoCtx.beginPath();
    photoCtx.arc(calibrationLine.start.x, calibrationLine.start.y, 10, 0, 2 * Math.PI);
    photoCtx.fill();
    photoCtx.beginPath();
    photoCtx.arc(calibrationLine.end.x, calibrationLine.end.y, 10, 0, 2 * Math.PI);
    photoCtx.fill();
}

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (evt.clientX - rect.left) * (canvas.width / rect.width),
        y: (evt.clientY - rect.top) * (canvas.height / rect.height)
    };
}

photoCanvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(photoCanvas, e);
    if (Math.hypot(pos.x - calibrationLine.start.x, pos.y - calibrationLine.start.y) < 15) {
        calibrationLine.dragging = 'start';
    } else if (Math.hypot(pos.x - calibrationLine.end.x, pos.y - calibrationLine.end.y) < 15) {
        calibrationLine.dragging = 'end';
    }
});

photoCanvas.addEventListener('mousemove', (e) => {
    if (!calibrationLine.dragging) return;
    const pos = getMousePos(photoCanvas, e);
    calibrationLine[calibrationLine.dragging] = pos;
    drawAnalysis();
});

photoCanvas.addEventListener('mouseup', () => {
    calibrationLine.dragging = null;
});
photoCanvas.addEventListener('mouseleave', () => {
    calibrationLine.dragging = null;
});


// =====================================================================
// ERWEITERN SIE DIESEN BLOCK AM ENDE VON ABSCHNITT 4
// =====================================================================

// --- Bestehende Maus-Events (bleiben unverändert) ---
photoCanvas.addEventListener('mousedown', (e) => {
    const pos = getMousePos(photoCanvas, e);
    
    // Prüfe zuerst, ob ein Kreis-Anfasser bewegt wird
    for (let i = 0; i < capturedCircles.length; i++) {
        const circle = capturedCircles[i];
        if (Math.hypot(pos.x - (circle.x + circle.radius), pos.y - circle.y) < 12) {
            draggingCircle = { index: i, type: 'radius' };
            return;
        }
        if (Math.hypot(pos.x - circle.x, pos.y - circle.y) < 12) {
            draggingCircle = { index: i, type: 'position' };
            return;
        }
    }

    if (Math.hypot(pos.x - calibrationLine.start.x, pos.y - calibrationLine.start.y) < 15) {
        calibrationLine.dragging = 'start';
    } else if (Math.hypot(pos.x - calibrationLine.end.x, pos.y - calibrationLine.end.y) < 15) {
        calibrationLine.dragging = 'end';
    }
});

photoCanvas.addEventListener('mousemove', (e) => {
    const pos = getMousePos(photoCanvas, e);

    if (draggingCircle.index !== -1) {
        const circle = capturedCircles[draggingCircle.index];
        if (draggingCircle.type === 'position') {
            circle.x = pos.x;
            circle.y = pos.y;
        } else if (draggingCircle.type === 'radius') {
            circle.radius = Math.hypot(pos.x - circle.x, pos.y - circle.y);
        }
        drawAnalysis();
        return;
    }

    if (calibrationLine.dragging) {
        calibrationLine[calibrationLine.dragging] = pos;
        drawAnalysis();
    }
});

photoCanvas.addEventListener('mouseup', () => {
    calibrationLine.dragging = null;
    draggingCircle = { index: -1, type: null };
});
photoCanvas.addEventListener('mouseleave', () => {
    calibrationLine.dragging = null;
    draggingCircle = { index: -1, type: null };
});


// --- NEU: Touch-Events für mobile Geräte hinzufügen ---
photoCanvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // WICHTIG: Verhindert das Browser-Menü ("Bild speichern")
    const touch = e.touches[0];
    const pos = getMousePos(photoCanvas, touch);

    for (let i = 0; i < capturedCircles.length; i++) {
        const circle = capturedCircles[i];
        if (Math.hypot(pos.x - (circle.x + circle.radius), pos.y - circle.y) < 20) { // Größerer Greifbereich für Touch
            draggingCircle = { index: i, type: 'radius' };
            return;
        }
        if (Math.hypot(pos.x - circle.x, pos.y - circle.y) < 20) {
            draggingCircle = { index: i, type: 'position' };
            return;
        }
    }

    if (Math.hypot(pos.x - calibrationLine.start.x, pos.y - calibrationLine.start.y) < 25) { // Größerer Greifbereich
        calibrationLine.dragging = 'start';
    } else if (Math.hypot(pos.x - calibrationLine.end.x, pos.y - calibrationLine.end.y) < 25) {
        calibrationLine.dragging = 'end';
    }
}, { passive: false }); // Notwendig, damit preventDefault funktioniert

photoCanvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getMousePos(photoCanvas, touch);

    if (draggingCircle.index !== -1) {
        const circle = capturedCircles[draggingCircle.index];
        if (draggingCircle.type === 'position') {
            circle.x = pos.x;
            circle.y = pos.y;
        } else if (draggingCircle.type === 'radius') {
            circle.radius = Math.hypot(pos.x - circle.x, pos.y - circle.y);
        }
        drawAnalysis();
        return;
    }

    if (calibrationLine.dragging) {
        calibrationLine[calibrationLine.dragging] = pos;
        drawAnalysis();
    }
}, { passive: false });

photoCanvas.addEventListener('touchend', () => {
    calibrationLine.dragging = null;
    draggingCircle = { index: -1, type: null };
});


// --- 5. FINALE BERECHNUNG & RESET ---
// =====================================================================
// ERSETZEN SIE NUR DIESE EINE FUNKTION
// =====================================================================
function calculateFinalMeasurement() {
    const distanceCm = parseFloat(distanceInput.value);
    if (!distanceCm || distanceCm <= 0) {
        alert('Bitte geben Sie eine gültige Distanz in cm ein.');
        return;
    }

    const lineLengthPx = Math.hypot(calibrationLine.end.x - calibrationLine.start.x, calibrationLine.end.y - calibrationLine.start.y);
    const pixelsPerCm = lineLengthPx / distanceCm;

    let resultHTML = `<p><strong>Messergebnis (Kalibriert):</strong></p>`;
    capturedCircles.sort((a, b) => b.radius - a.radius);

    const outerDiameterCm = (capturedCircles[0].radius * 2) / pixelsPerCm;
    resultHTML += `<p>Außendurchmesser: ~${outerDiameterCm.toFixed(2)} cm</p>`;

    if (capturedCircles.length > 1) {
        const innerDiameterCm = (capturedCircles[1].radius * 2) / pixelsPerCm;
        resultHTML += `<p>Innendurchmesser: ~${innerDiameterCm.toFixed(2)} cm</p>`;

        // NEU: Berechnung der Ringbreite
        const ringWidthCm = (outerDiameterCm - innerDiameterCm) / 2;
        resultHTML += `<p><strong>Ringbreite (Stärke): ~${ringWidthCm.toFixed(2)} cm</strong></p>`;

    }
    
    quickResults.innerHTML = resultHTML;
}

function resetApp() {
    videoContainer.style.display = 'block';
    photoContainer.style.display = 'none';
    measureButton.style.display = 'block';
    resetButton.style.display = 'none';
    interactionContainer.style.display = 'none';
    quickResults.innerHTML = '';
    distanceInput.value = '';
    statusText.textContent = 'Richten Sie die Kamera auf Dichtung und Lineal.';
    videoElement.play();
}

// --- 6. EVENT LISTENERS & START ---
measureButton.addEventListener('click', takePhotoAndAnalyze);
resetButton.addEventListener('click', resetApp);
calculateButton.addEventListener('click', calculateFinalMeasurement);

var cvCheckInterval = setInterval(() => {
    if (window.cv) {
        clearInterval(cvCheckInterval);
        onOpenCvReady();
    }
}, 100);
