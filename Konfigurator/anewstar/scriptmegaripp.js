/* ==========================================================================
   Globale Konfiguration: Variablen und Konstanten
   ========================================================================== */

// Speichert die Auswahl des Benutzers
let userSelection = {
    produktgruppe: '',
    schacht: '',
    rohrdeckung: '',
    deckel: '',
    wasserzaehler: '',
    peVerschraubung: '',
    peGroesse: '',
    schachtabdeckung: '',
    wasserzaehlerSchluessel: '',
};

// Speichert die letzten 10 Auswahlen (für die Zusammenfassung)
let lastSelections = {
    selection1: '', selection2: '', selection3: '', selection4: '',
    selection5: '', selection6: '', selection7: '', selection8: '',
    selection9: '', selection10: '',
};

// Mappt die Screen-IDs zu den entsprechenden Vorschaubildern
const screenImages = {
    screen2: 'images/sensus.jpg',
    screen3: 'images/Kugel freistrom Eingang.jpg',
    screen4: 'images/ausgangksr.JPG',
    screen5: 'images/wz_freistrom.jpg',
    screen6: 'images/pe-rohr-eingang.jpg',
    screen7: 'images/pe-rohr-eingang.jpg',
    screen7b: 'images/schachtabdeckung.jpg',
    screen8: 'images/schluessel6kant.jpg'
};

// Speichert die Teile der Artikelnummer
let articleNumberParts = {
    part1: '', part2: '', part3: '', part4: '', part5: '', part6: '',
};

// Fortschrittsanzeige-Variablen
let currentStep = 1;
const totalSteps = 8;


/* ==========================================================================
   DOM-Initialisierung (wird ausgeführt, sobald die Seite geladen ist)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", function() {
    initializeButtonGroups();
    updateProgressBar(currentStep, totalSteps);
    initializeFormValidation();
});


/* ==========================================================================
   Navigation & Auswahl-Logik (Kernfunktionen)
   ========================================================================== */

/**
 * Wechselt zum nächsten Bildschirm mit Animation.
 * Beim Auswählen gleitet nur der aktuelle Bildschirm nach links raus.
 * @param {string} nextScreenId - Die ID des nächsten Bildschirms.
 * @param {string} selectionText - Der Text der getroffenen Auswahl.
 */
function nextScreen(nextScreenId, selectionText = null) {
    const currentScreen = document.querySelector('.screen.active');
    const currentScreenId = currentScreen.id;
    const nextScreen = document.getElementById(nextScreenId);

    // Animations-Logik: Alter Screen geht nach links raus. Neuer erscheint sofort.
    currentScreen.classList.add('exit-to-left');
    currentScreen.classList.remove('active');

    currentScreen.addEventListener('transitionend', function handler() {
        currentScreen.classList.remove('exit-to-left');
        nextScreen.classList.add('active'); // Neuer Screen wird aktiv, ohne eigene Animation
        currentScreen.removeEventListener('transitionend', handler);
    }, { once: true });

    // UI-Logik
    currentStep++;
    updateProgressBar(currentStep, totalSteps);
    addVisualNavStep(currentScreenId, currentStep - 1, selectionText);
    
    // Logik für das Ausblenden von Buttons auf Screen 5
    if (nextScreenId === "screen5") {
        updateScreen5Buttons();
    }
    
    if (nextScreenId === 'summaryScreen') {
        updateSummary();
    }
}

/**
 * Wechselt zum vorherigen Bildschirm mit Animation.
 * Beim Zurückgehen gleitet nur der neue Bildschirm von links herein.
 * @param {string} prevScreenId - Die ID des vorherigen Bildschirms.
 */
function prevScreen(prevScreenId) {
    const currentScreen = document.querySelector('.screen.active');
    const prevScreen = document.getElementById(prevScreenId);
    
    // Logik für die Navigationsleiste
    if (currentScreen.id !== 'userDataScreen') {
        removeLastVisualNavStep();
    }

    // UI-Logik
    currentStep--;
    updateProgressBar(currentStep, totalSteps);
    
    // Buttons auf Screen 5 wieder anzeigen
    if (prevScreenId === "screen4") {
        const wzButtons = document.querySelectorAll("#screen5 .button-group > button:not(.back-btn)");
        wzButtons.forEach(button => button.style.display = "block");
    }

    // Animations-Logik: Alter Screen verschwindet sofort, neuer kommt von links.
    currentScreen.classList.remove('active');
    prevScreen.classList.add('enter-from-left');
    
    // Kurze Verzögerung, damit die Klasse erkannt wird und die Transition starten kann
    setTimeout(() => {
        prevScreen.classList.add('active');
    }, 10);
    
    prevScreen.addEventListener('transitionend', function handler() {
        prevScreen.classList.remove('enter-from-left');
        prevScreen.removeEventListener('transitionend', handler);
    }, { once: true });
}

/**
 * Zentrale Funktion zum Speichern der Auswahl und Wechseln des Bildschirms.
 * @param {string} key - Der Schlüssel im userSelection-Objekt.
 * @param {string} value - Der ausgewählte Wert.
 * @param {string} articlePartKey - Der Schlüssel im articleNumberParts-Objekt.
 * @param {number} selectionNumber - Die Nummer für das lastSelections-Objekt.
 * @param {string} nextScreenId - Die ID des nächsten Bildschirms.
 */
function saveSelection(key, value, articlePartKey, selectionNumber, nextScreenId) {
    userSelection[key] = value;
    lastSelections[`selection${selectionNumber}`] = value;
    
    // Bestimmt den Artikelnummer-Code basierend auf der Auswahl
    let articleCode = '';
    switch(key) {
        case 'schacht':
            articleCode = (value === '190mm Q3 2,5|4 1“') ? 'A' : (value === '260mm Q3 6,3|10 x 5/4“') ? 'B' : 'C';
            break;
        case 'rohrdeckung':
            articleCode = (value === 'Kugelhahn') ? 'A' : 'B';
            break;
        case 'deckel':
            articleCode = (value === 'Kugelhahn') ? 'A' : (value === 'Schrägsitz') ? 'B' : (value === 'KSR-Ventil') ? 'C' : (value === 'KMR – Kugelhahn*') ? 'D' : 'E';
            break;
        case 'wasserzähleranlage':
            articleCode = value;
            break;
        case 'peVerschraubung':
        case 'peGroesse':
            articleCode = (value === 'PE-Größe 32') ? 'A' : (value === 'PE-Größe 40') ? 'B' : (value === 'PE-Größe 50') ? 'C' : 'D';
            break;
    }
    articleNumberParts[articlePartKey] = articleCode;
    
    nextScreen(nextScreenId, value);
}

// Individuelle Wrapper-Funktionen für sauberen Code
function saveSchacht(schacht) {
    saveSelection('schacht', schacht, 'part1', 1, 'screen3');
}
function saveRohrdeckung(rohrdeckung) {
    saveSelection('rohrdeckung', rohrdeckung, 'part2', 2, 'screen4');
}
function saveDeckel(deckel) {
    saveSelection('deckel', deckel, 'part3', 3, 'screen5');
}
function saveWasserzaehleranlage(anlage) {
    saveSelection('wasserzaehleranlage', anlage, 'part4', 4, 'screen6');
}
function savePEVerschraubung(verschraubung) {
    saveSelection('peVerschraubung', verschraubung, 'part5', 5, 'screen7');
}
function savePEGroesse(groesse) {
    saveSelection('peGroesse', groesse, 'part6', 6, 'screen7b');
}
function saveSchachtabdeckung(abdeckung) {
    saveSelection('schachtabdeckung', abdeckung, 'part7', 7, 'screen8');
}
function saveWasserzaehlerSchluessel(schluessel) {
    if (schluessel === 'Ja' || schluessel === 'Nein') {
        saveSelection('wasserzaehlerSchluessel', schluessel, 'part8', 8, 'summaryScreen');
    } else {
        alert("Bitte wählen Sie Ja oder Nein.");
    }
}


/* ==========================================================================
   Zusammenfassung & PDF-Generierung
   ========================================================================== */

/**
 * Aktualisiert die Zusammenfassung mit den getroffenen Auswahlen.
 */
function updateSummary() {
    const summaryContainer = document.getElementById('summary');
    summaryContainer.innerHTML = '';

    const summaryItems = [
        { label: 'Anlagengröße', value: lastSelections.selection1, target: 'screen2' },
        { label: 'WZ-Anlage Eingang', value: lastSelections.selection2, target: 'screen3' },
        { label: 'WZ-Anlage Ausgang', value: lastSelections.selection3, target: 'screen4' },
        { label: 'Anzahl WZ-Anlagen', value: lastSelections.selection4, target: 'screen5' },
        { label: 'PE-Größe Eingang', value: lastSelections.selection5, target: 'screen6' },
        { label: 'PE-Größe Ausgang', value: lastSelections.selection6, target: 'screen7' },
        { label: 'Abdeckung', value: lastSelections.selection7, target: 'screen7b' },
        { label: 'Schachtschlüssel', value: lastSelections.selection8, target: 'screen8' }
    ];

    summaryItems.forEach((item, index) => {
        if (item.value) {
            const summaryButton = document.createElement('button');
            summaryButton.className = 'summary-item-btn';
            summaryButton.innerHTML = `<span class="summary-label">${item.label}:</span> <span class="summary-value">${item.value}</span>`;
            summaryButton.dataset.targetScreen = item.target;
            summaryButton.dataset.stepNumber = index + 1;
            summaryButton.addEventListener('click', jumpToScreenFromNav);
            summaryContainer.appendChild(summaryButton);
        }
    });
    
    document.getElementById('summaryArticleNumber').textContent = getArticleNumber();
}

/**
 * Generiert die Artikelnummer basierend auf den Auswahlen.
 * @returns {string} Die finale Artikelnummer.
 */
function getArticleNumber() {
    const dynamicPart = Object.values(articleNumberParts).filter(part => part !== '').join(' ');
    return `0392-${dynamicPart}`;
}

/**
 * Generiert eine eindeutige Anfragenummer.
 * @returns {string} Die Anfragenummer.
 */
function generateRequestNumber() {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, "");
    const timePart = now.toTimeString().slice(0, 5).replace(/:/g, "");
    const randomNum = Math.floor(100 + Math.random() * 900);
    return `${datePart}${timePart}${randomNum}`;
}

/**
 * Generiert ein PDF mit den Konfigurationsdaten und Benutzerinformationen.
 */
function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const eweLogo = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/logo.png";
    const flexorippImage = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/megaripp.png";
    
    // Benutzerdaten aus dem Formular holen
    const name = document.getElementById('name').value;
    const street = document.getElementById('street').value;
    const postalCode = document.getElementById('postalCode').value;
    const city = document.getElementById('city').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value || "Nicht angegeben";
    const comments = document.getElementById('comments').value || "Keine Bemerkungen";

    // Inhalt des PDFs erstellen (gekürzt für die Übersicht)
    
    // Firmenname und Adresse
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("Wilhelm Ewe GmbH & Co.KG", 105, 34, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Volkmaroder Str. 19, 38104 Braunschweig", 105, 40, { align: "right" });

    // Logo einfügen
    doc.addImage(eweLogo, 'PNG', 156, 5, 30, 30);

    // Datum
    const currentDate = new Date().toLocaleDateString();
    doc.setFontSize(10);
    doc.text(`Datum: ${currentDate}`, 158, 40);

    // Betreff
    
    doc.setTextColor(0, 51, 102);
    
    const requestNumber = generateRequestNumber();
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(`Anfragenummer: ${requestNumber}`, 20, 75);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text("Sehr geehrte Damen und Herren,", 20, 85);
    doc.text("anbei sende ich Ihnen meine Konfiguration des EWE-Produktes:", 20, 94);
    doc.setFont("helvetica", "bold"); doc.text("MEGARIPP", 122, 94);
    doc.text("Bitte bieten Sie mir folgende Zusammenstellung an:", 20, 101);
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.5); doc.line(20, 108, 190, 108);

    let yOffset = 118;
    const articleNumber = getArticleNumber();
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0, 51, 102);
    doc.text(`Artikelnummer: ${articleNumber}`, 20, yOffset);
    yOffset += 10;
    
    let selections = [
        `Ein MegaRipp ${lastSelections.selection1}`,
        `mit ${lastSelections.selection4} Wasserzähleranlage(n) ${lastSelections.selection2} / ${lastSelections.selection3}.`,
        `Eingangsseitig:  1 x ${lastSelections.selection5}.`,
        `Ausgangsseitig: ${lastSelections.selection4} x Stutzen ${lastSelections.selection6}.`,
        `Die gewählte Abdeckung ist : ${lastSelections.selection7}`,
        `Schachtschlüssel : ${lastSelections.selection8}`,
    ];

    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0, 51, 102);
    doc.text("Zusammenstellung:", 20, yOffset);
    yOffset += 8;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
    selections.forEach(item => { doc.text(`${item}`, 25, yOffset); yOffset += 8; });
    doc.addImage(flexorippImage, 'JPEG', 140, 116, 40, 50);

    yOffset += 12;
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0, 51, 102); doc.text("Benutzerdaten:", 20, yOffset);
    yOffset += 8;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
    doc.text(`Name: ${name}`, 25, yOffset); yOffset += 8;
    doc.text(`Straße: ${street}`, 25, yOffset); yOffset += 8;
    doc.text(`PLZ: ${postalCode}`, 25, yOffset); yOffset += 8;
    doc.text(`Ort: ${city}`, 25, yOffset); yOffset += 8;
    doc.text(`E-Mail: ${email}`, 25, yOffset); yOffset += 8;
    doc.text(`Telefon: ${phone}`, 25, yOffset); yOffset += 8;
    doc.text(`Bemerkungen: ${comments}`, 25, yOffset);

    const pdfData = doc.output('blob');
    const url = URL.createObjectURL(pdfData);
    window.open(url);
}

/**
 * Sendet die Zusammenstellung per E-Mail.
 */
function sendEmail() {
    let emailBody = `
Sehr geehrte Damen und Herren,

ich hoffe, es geht Ihnen gut. Anbei sende ich Ihnen die Konfiguration, die ich über Ihren Konfigurator erstellt habe:

---------------------------------------------------------
Artikelnummer: ${getArticleNumber()}
1. ${lastSelections.selection1}
2. ${lastSelections.selection2}
3. ${lastSelections.selection3}
4. ${lastSelections.selection4}
5. ${lastSelections.selection5}
6. ${lastSelections.selection6}
7. ${lastSelections.selection7}
8. ${lastSelections.selection8}
---------------------------------------------------------

Ich wäre Ihnen dankbar, wenn Sie mir ein Angebot auf Basis dieser Konfiguration unterbreiten könnten.

Vielen Dank im Voraus für Ihre Mühe. Ich freue mich auf Ihre Rückmeldung.

Mit freundlichen Grüßen,
[Ihr Name]
[Ihr Unternehmen]
`;
    const mailtoLink = `mailto:volker.kottwitzo@ewe-armaturen.de?subject=Anfrage für ein Angebot&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
}


/* ==========================================================================
   Hilfsfunktionen: UI, Daten und Animationen
   ========================================================================== */

/**
 * Aktualisiert die Fortschrittsanzeige.
 * @param {number} step - Der aktuelle Schritt.
 * @param {number} totalSteps - Die Gesamtzahl der Schritte.
 */
function updateProgressBar(step, totalSteps) {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    const progressContainer = document.querySelector('.progress-container');
    
    if (step >= 1 && step <= totalSteps) {
        progressContainer.style.display = 'block';
        progressText.style.display = 'block';
        const progress = ((step - 1) / (totalSteps - 1)) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Schritt ${step} von ${totalSteps}`;
    } else {
        progressContainer.style.display = 'none';
        progressText.style.display = 'none';
    }
}

/**
 * Fügt ein Vorschaubild zur Navigationsleiste hinzu.
 * @param {string} screenId - Die ID des Screens.
 * @param {number} step - Die Schrittnummer.
 * @param {string} selectionText - Der Text der Auswahl.
 */
function addVisualNavStep(screenId, step, selectionText) {
    const navContainer = document.getElementById('visual-nav-container');
    const imageSrc = screenImages[screenId];
    const tooltipElement = document.getElementById('custom-tooltip');

    // NEU: Prüft, ob es sich um ein Gerät mit Touchscreen handelt.
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (imageSrc && selectionText) {
        const navImage = document.createElement('img');
        navImage.src = imageSrc;
        navImage.className = 'visual-nav-step';
        navImage.dataset.targetScreen = screenId;
        navImage.dataset.stepNumber = step;

        // NEU: Die Tooltip-Events werden NUR hinzugefügt, wenn es KEIN Touch-Gerät ist.
        if (!isTouchDevice) {
            navImage.addEventListener('mouseenter', function(event) {
                tooltipElement.textContent = `Ihre Auswahl: "${selectionText}"`;
                tooltipElement.style.display = 'block';
                const rect = navImage.getBoundingClientRect();
                tooltipElement.style.left = `${rect.left + window.scrollX + rect.width / 2 - tooltipElement.offsetWidth / 2}px`;
                tooltipElement.style.top = `${rect.top + window.scrollY - tooltipElement.offsetHeight - 10}px`;
                setTimeout(() => { tooltipElement.style.opacity = '1'; }, 10);
            });

            navImage.addEventListener('mouseleave', function() {
                tooltipElement.style.opacity = '0';
                setTimeout(() => { tooltipElement.style.display = 'none'; }, 200);
            });
        }

        // Der Klick-Event zum Springen bleibt für alle Geräte erhalten.
        navImage.addEventListener('click', jumpToScreenFromNav);
        navContainer.appendChild(navImage);
    }
}

/**
 * Entfernt das letzte Vorschaubild aus der Navigationsleiste.
 */
function removeLastVisualNavStep() {
    const navContainer = document.getElementById('visual-nav-container');
    if (navContainer.lastChild) {
        navContainer.removeChild(navContainer.lastChild);
    }
}

/**
 * Springt von der Navigationsleiste aus zu einem bestimmten Bildschirm mit Animation.
 * Beim Navigieren gleitet nur der Zielbildschirm von links herein.
 * @param {Event} event - Das Klick-Ereignis.
 */
function jumpToScreenFromNav(event) {
    const targetScreenId = event.currentTarget.dataset.targetScreen;
    const targetStep = parseInt(event.currentTarget.dataset.stepNumber);

    const navContainer = document.getElementById('visual-nav-container');
    while (navContainer.lastChild && parseInt(navContainer.lastChild.dataset.stepNumber) >= targetStep) {
        navContainer.removeChild(navContainer.lastChild);
    }

    const currentScreen = document.querySelector('.screen.active');
    const targetScreen = document.getElementById(targetScreenId);

    // Animations-Logik: Alter Screen verschwindet sofort, neuer kommt von links.
    currentScreen.classList.remove('active');
    targetScreen.classList.add('enter-from-left');
    
    // Kurze Verzögerung, damit die Klasse erkannt wird und die Transition starten kann
    setTimeout(() => {
        targetScreen.classList.add('active');
    }, 10);

    targetScreen.addEventListener('transitionend', function handler() {
        targetScreen.classList.remove('enter-from-left');
        targetScreen.removeEventListener('transitionend', handler);
    }, { once: true });

    currentStep = targetStep;
    updateProgressBar(currentStep, totalSteps);
}

/**
 * Zeigt einen bestimmten Bildschirm an.
 * @param {string} id - Die ID des Bildschirms.
 */
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

/**
 * Zeigt einen Info-Screen an.
 * @param {string} infoId - Die ID des Info-Screens.
 */
function showInfo(infoId) {
    const currentScreen = document.querySelector('.screen.active');
    const infoScreen = document.getElementById(`infoScreen-${infoId}`);
    
    currentScreen.classList.remove('active');
    infoScreen.classList.add('active');
}

/**
 * Zeigt den Benutzerdaten-Screen an.
 */
function showUserDataScreen() {
    document.getElementById('summaryScreen').classList.remove('active');
    document.getElementById('userDataScreen').classList.add('active');
}

/**
 * Wechselt vom Benutzerdaten-Bildschirm zurück zum Zusammenfassungsbildschirm.
 * Stellt sicher, dass die Fortschrittsanzeige nicht angezeigt wird.
 */
function hideUserDataScreen() {
    document.getElementById('userDataScreen').classList.remove('active');
    document.getElementById('summaryScreen').classList.add('active');
    
    // Die Fortschrittsanzeige ausblenden, da wir auf dem Zusammenfassungsbildschirm sind
    document.querySelector('.progress-container').style.display = 'none';
    document.querySelector('.progress-text').style.display = 'none';
}

/**
 * Setzt den Konfigurator auf den Anfangszustand zurück.
 */
function resetConfig() {
    userSelection = {
        produktgruppe: '', schacht: '', rohrdeckung: '', deckel: '',
        wasserzaehler: '', peVerschraubung: '', peGroesse: '',
        schachtabdeckung: '', wasserzaehlerSchluessel: ''
    };
    lastSelections = {
        selection1: '', selection2: '', selection3: '', selection4: '',
        selection5: '', selection6: '', selection7: '', selection8: '',
        selection9: '', selection10: ''
    };
    articleNumberParts = {
        part1: '', part2: '', part3: '', part4: '', part5: '', part6: ''
    };

    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('screen2').classList.add('active');
    document.getElementById('summary').innerText = '';
    
    // Setzt die Navigationsleiste zurück
    const navContainer = document.getElementById('visual-nav-container');
    navContainer.innerHTML = '';
    
    currentStep = 1;
    updateProgressBar(currentStep, totalSteps);
}


/* ==========================================================================
   Event-Listener und weitere Initialisierungsfunktionen
   ========================================================================== */

/**
 * Gruppiert die Buttons in den .screen-Containern.
 */
function initializeButtonGroups() {
    document.querySelectorAll('.screen').forEach(screen => {
        const buttons = Array.from(screen.children).filter(el => el.tagName === 'BUTTON');
        if (buttons.length > 0) {
            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group';
            buttons.forEach(button => buttonGroup.appendChild(button));
            screen.appendChild(buttonGroup);
        }
    });
}

/**
 * Initialisiert die Formularvalidierung.
 */
function initializeFormValidation() {
    document.querySelector('.submit-btn').addEventListener('click', function(event) {
        var form = document.getElementById('userDataForm');
        if (form.checkValidity()) {
            event.preventDefault();
            generatePDF();
        } 
    });
}

/**
 * Passt die Sichtbarkeit der Buttons auf Screen 5 an.
 */
function updateScreen5Buttons() {
    const wzButtons = document.querySelectorAll("#screen5 button:not(.back-btn)");
    wzButtons.forEach(button => button.style.display = "block");

    if (userSelection['schacht'] === "300mm Q3 16 6/4“") {
        if (userSelection['deckel'] === "KMR – Kugelhahn*" || userSelection['deckel'] === "KMR – Schrägsitzventil*") {
            wzButtons.forEach((button, index) => {
                if (index >= 1) button.style.display = "none";
            });
        } else {
            wzButtons.forEach((button, index) => {
                if (index >= 2) button.style.display = "none";
            });
        }
    }
}