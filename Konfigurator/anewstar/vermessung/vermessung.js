// =====================================================================
// FINALE VERSION MIT VERBESSERTER ZAHLEN-GRUPPIERUNG
// =====================================================================

const statusText = document.getElementById('statusText');
const videoElement = document.getElementById('videoElement');
const videoContainer = document.getElementById('videoContainer');
const photoCanvas = document.getElementById('photoCanvas');
const photoCtx = photoCanvas.getContext('2d');
const quickResults = document.getElementById('quickResults');
const measureButton = document.getElementById('measureButton');
const resetButton = document.getElementById('resetButton');

let cvReady = false;

function onOpenCvReady() {
    cvReady = true;
    statusText.textContent = 'Computer Vision bereit. Starte Kamera...';
    startCamera();
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        videoElement.srcObject = stream;
        videoElement.onloadedmetadata = () => {
            statusText.textContent = 'Richten Sie die Kamera auf Dichtung und Lineal.';
        };
    } catch (error) {
        statusText.textContent = 'Kamerazugriff fehlgeschlagen.';
        console.error(error);
    }
}

measureButton.addEventListener('click', takePhotoAndAnalyze);
resetButton.addEventListener('click', resetApp);

function takePhotoAndAnalyze() {
    if (!cvReady || videoElement.paused || videoElement.ended) return;

    statusText.textContent = 'Analysiere Bild...';
    videoContainer.style.display = 'none';
    photoCanvas.style.display = 'block';
    measureButton.style.display = 'none';
    resetButton.style.display = 'block';

    photoCanvas.width = videoElement.videoWidth;
    photoCanvas.height = videoElement.videoHeight;
    photoCtx.drawImage(videoElement, 0, 0, photoCanvas.width, photoCanvas.height);
    videoElement.pause();

    try {
        let src = cv.imread(photoCanvas);
        let gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        // --- 1. Dichtungs-Erkennung (zweistufig) ---
        let circles = new cv.Mat();
        cv.HoughCircles(gray, circles, cv.HOUGH_GRADIENT, 1, 80, 100, 35, 15, 150);
        
        let outerCircle = null;
        if (circles.cols > 0) {
            outerCircle = { x: circles.data32F[0], y: circles.data32F[1], radius: circles.data32F[2] };
            photoCtx.beginPath();
            photoCtx.arc(outerCircle.x, outerCircle.y, outerCircle.radius, 0, 2 * Math.PI, false);
            photoCtx.lineWidth = 4;
            photoCtx.strokeStyle = '#00e1a1';
            photoCtx.stroke();
        }

        let innerCircle = null;
        if (outerCircle) {
            let roiRect = new cv.Rect(outerCircle.x - outerCircle.radius, outerCircle.y - outerCircle.radius, outerCircle.radius * 2, outerCircle.radius * 2);
            let roiGray = gray.roi(roiRect);
            let innerCirclesMat = new cv.Mat();
            cv.HoughCircles(roiGray, innerCirclesMat, cv.HOUGH_GRADIENT, 1, 40, 80, 20, 5, outerCircle.radius * 0.8);
            if (innerCirclesMat.cols > 0) {
                innerCircle = { x: innerCirclesMat.data32F[0] + roiRect.x, y: innerCirclesMat.data32F[1] + roiRect.y, radius: innerCirclesMat.data32F[2] };
                photoCtx.beginPath();
                photoCtx.arc(innerCircle.x, innerCircle.y, innerCircle.radius, 0, 2 * Math.PI, false);
                photoCtx.lineWidth = 4;
                photoCtx.strokeStyle = '#00e1a1';
                photoCtx.stroke();
            }
            roiGray.delete();
            innerCirclesMat.delete();
        }

        // --- 2. Skalen-Erkennung (mit Zahlen-Gruppierung) ---
        let pixelsPerCm = 0;
        let scaleFound = false;
        let thresh = new cv.Mat();
        cv.adaptiveThreshold(gray, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
        
        let numberPositions = [];
        for (let i = 0; i < contours.size(); ++i) {
            let rect = cv.boundingRect(contours.get(i));
            let aspectRatio = rect.height / rect.width;
            if (rect.height > 20 && rect.height < 80 && aspectRatio > 1.0 && aspectRatio < 3.5) {
                numberPositions.push(rect.x + rect.width / 2);
            }
        }
        numberPositions.sort((a, b) => a - b);

        // NEU: Zahlen gruppieren, die zu nah beieinander liegen
        let groupedPositions = [];
        if (numberPositions.length > 0) {
            let currentGroup = [numberPositions[0]];
            for (let i = 1; i < numberPositions.length; i++) {
                if (numberPositions[i] - currentGroup[currentGroup.length - 1] < 25) { // Schwellenwert: 25px
                    currentGroup.push(numberPositions[i]);
                } else {
                    groupedPositions.push(currentGroup.reduce((a, b) => a + b) / currentGroup.length);
                    currentGroup = [numberPositions[i]];
                }
            }
            groupedPositions.push(currentGroup.reduce((a, b) => a + b) / currentGroup.length);
        }

        if (groupedPositions.length > 2) {
            let distances = [];
            for (let i = 1; i < groupedPositions.length; i++) {
                let dist = groupedPositions[i] - groupedPositions[i-1];
                if (dist > 30 && dist < 150) {
                    distances.push(dist);
                }
            }
            if (distances.length > 0) {
                distances.sort((a, b) => a - b);
                pixelsPerCm = distances[Math.floor(distances.length / 2)];
                scaleFound = true;
                console.log(`Gruppierte Zahlen-Skala gefunden! Maßstab: ${pixelsPerCm.toFixed(2)} px/cm.`);
            }
        }

        // --- 3. Messung ---
// --- 3. Messung (MIT FINALER KALIBRIERUNG) ---
let resultHTML = '';
if (outerCircle && scaleFound) {
    // Manuell ermittelter Kalibrierungsfaktor, um systematische Fehler auszugleichen.
    // Passen Sie diesen Wert bei Bedarf leicht an (z.B. 1.65 oder 1.75).
    const CALIBRATION_FACTOR = 1.0;

    resultHTML = `<p><strong>Messung abgeschlossen:</strong></p>`;
    
    const outerDiameterCm = (outerCircle.radius * 2) / (pixelsPerCm * CALIBRATION_FACTOR);
    resultHTML += `<p>Außendurchmesser: ~${outerDiameterCm.toFixed(2)} cm</p>`;

    if (innerCircle) {
        const innerDiameterCm = (innerCircle.radius * 2) / (pixelsPerCm * CALIBRATION_FACTOR);
        resultHTML += `<p>Innendurchmesser: ~${innerDiameterCm.toFixed(2)} cm</p>`;
    } else {
        resultHTML += `<p>Innendurchmesser: nicht gefunden.</p>`;
    }
} else if (outerCircle) {
    resultHTML = `<p>Dichtung gefunden, aber keine Skala zur Messung.</p>`;
} else {
    resultHTML = `<p>Keine Dichtung gefunden.</p>`;
}
quickResults.innerHTML = resultHTML;


        // Speicher freigeben
        src.delete(); gray.delete(); circles.delete(); thresh.delete(); contours.delete(); hierarchy.delete();

    } catch (error) {
        console.error("Fehler während der OpenCV-Analyse:", error);
        statusText.textContent = 'Analyse fehlgeschlagen.';
    }
}

function resetApp() {
    videoContainer.style.display = 'block';
    photoCanvas.style.display = 'none';
    measureButton.style.display = 'block';
    resetButton.style.display = 'none';
    quickResults.innerHTML = '';
    statusText.textContent = 'Richten Sie die Kamera auf Dichtung und Lineal.';
    videoElement.play();
}

var cvCheckInterval = setInterval(() => {
    if (window.cv) {
        clearInterval(cvCheckInterval);
        onOpenCvReady();
    }
}, 100);
