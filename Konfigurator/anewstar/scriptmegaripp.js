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

    // In Ihrem DOMContentLoaded-Listener
const duoViewerBtn = document.getElementById('closeToDuoViewerBtn');
if (duoViewerBtn) {
    duoViewerBtn.addEventListener('click', () => {
        window.close();
    });
}
    // Info-Bilder: Info-Badge + Tooltip + alte Pulse-Animation entfernen
    document.querySelectorAll('.info-image').forEach(image => {
        image.classList.remove('pulse');
        const container = image.closest('.info-image-container');
        if (container && !container.querySelector('.info-badge')) {
            const badge = document.createElement('span');
            badge.className = 'info-badge';
            badge.innerHTML = '<i class="bi bi-info-lg"></i>';
            container.appendChild(badge);
            container.setAttribute('data-tooltip', 'Für Produktinfos klicken');
        }
    });

    // Button-Tooltips setzen
    const tooltips = {
        'screen2': [
            'Kompakter Zähler für Einfamilienhaus, DN 25',
            'Standard für größere Durchflussmengen, DN 32',
            'Großzähler für Mehrfamilien-/Gewerbeanschluss, DN 40'
        ],
        'screen3': [
            'Voller Durchgang, geringer Druckverlust, 90°-Absperrung',
            'Feinfühlige Regelung, bewährt im Trinkwasserbereich'
        ],
        'screen4': [
            'Voller Durchgang, geringer Druckverlust',
            'Feinfühlige Regelung, klassische Absperrung',
            'Kegelmembran-Rückflussverhinderer mit Kugelhahn',
            'Kegelmembran-Rückflussverhinderer mit Schrägsitzventil',
            'Kombinierte Sicherungsarmatur, prüfbar nach DIN EN 1717'
        ],
        'screen5': [
            'Einfamilienhaus, Einzelanschluss',
            'Zweifamilienhaus, Haus + Garten',
            'Mehrfamilienhaus, mehrere Versorgungsbereiche',
            'Gewerbe, getrennte Versorgungsbereiche',
            'Großanlage, max. Ausbaustufe'
        ],
        'screen6': [
            'Standard Einzelanschluss, DN 25',
            'Größere Durchflussmenge, DN 32',
            'Mehrfamilienhaus/Gewerbe, DN 40',
            'Großanschluss, DN 50'
        ],
        'screen7': [
            'Standard Hausinstallation, DN 25',
            'Größere Durchflussmenge, DN 32',
            'Mehrfamilienhaus/Gewerbe, DN 40',
            'Großanschluss, DN 50'
        ],
        'screen7b': [
            'Belastungsklasse 12,5t — Gehwege, Einfahrten, Grünflächen',
            'Für Einbau in bestehende Betonschächte',
            'Wenn bereits eine Abdeckung vorhanden ist'
        ],
        'screen8': [
            'Sechskantschlüssel SW24 (Art. 0398001)',
            'Kein Schlüssel benötigt'
        ]
    };
    Object.entries(tooltips).forEach(([screenId, tips]) => {
        const screen = document.getElementById(screenId);
        if (!screen) return;
        const buttons = screen.querySelectorAll('button:not(.back-btn)');
        buttons.forEach((btn, i) => {
            if (tips[i]) btn.setAttribute('data-tooltip', tips[i]);
        });
    });

    // Universelles Tooltip-System (wie DuoViewer)
    let activeTooltip = null;
    document.addEventListener('mouseenter', function(e) {
        const target = e.target.closest('[data-tooltip]');
        if (!target || target.classList.contains('info-image-container')) return;
        const text = target.getAttribute('data-tooltip');
        if (!text) return;
        activeTooltip = document.createElement('div');
        activeTooltip.className = 'custom-tooltip';
        activeTooltip.textContent = text;
        document.body.appendChild(activeTooltip);
        const rect = target.getBoundingClientRect();
        const ttRect = activeTooltip.getBoundingClientRect();
        let top = rect.top - ttRect.height - 8;
        let left = rect.left + (rect.width / 2) - (ttRect.width / 2);
        if (left < 5) left = 5;
        if (left + ttRect.width > window.innerWidth) left = window.innerWidth - ttRect.width - 5;
        if (top < 0) top = rect.bottom + 8;
        activeTooltip.style.left = left + 'px';
        activeTooltip.style.top = top + 'px';
        setTimeout(() => { if (activeTooltip) { activeTooltip.style.opacity = '1'; activeTooltip.style.transform = 'translateY(0)'; } }, 10);
    }, true);
    document.addEventListener('mouseleave', function(e) {
        const target = e.target.closest('[data-tooltip]');
        if (!target || !activeTooltip) return;
        activeTooltip.remove();
        activeTooltip = null;
    }, true);

    initializeButtonGroups();
    updateProgressBar(currentStep, totalSteps);
    initializeFormValidation();
         // NEU: Höhe direkt beim ersten Laden der Seite anpassen
    // Wir brauchen hier eine minimale Verzögerung, damit der Browser
    // alle Elemente korrekt gerendert hat, bevor wir messen.
    
    setTimeout(adjustMainContainerHeight, 50);

   
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

    // NEU: Höhe des Containers anpassen
    setTimeout(adjustMainContainerHeight, 400);
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

    // NEU: Höhe des Containers anpassen
    setTimeout(adjustMainContainerHeight, 400);

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
        case 'wasserzaehleranlage':
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
    const productImage = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/megaripp.png";
    const schachtImage = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/schachtausgang.jpg";
    
    // Benutzerdaten aus dem Formular holen
    const fullName = document.getElementById('fullName').value;
    const company = document.getElementById('company').value || "";
    const street = document.getElementById('street').value;
    const postalCode = document.getElementById('postalCode').value;
    const city = document.getElementById('city').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value || "Nicht angegeben";
    const comments = document.getElementById('comments').value || "Keine Bemerkungen";
    const requestNumber = generateRequestNumber();
    const currentDate = new Date().toLocaleDateString('de-DE');
    const articleNumber = getArticleNumber();

    const pageW = 210, marginL = 15, marginR = 15, contentW = pageW - marginL - marginR;
    const eweBlue = [0, 90, 140];
    const eweLightBlue = [0, 161, 225];
    const eweDark = [0, 51, 102];

    // === HEADER: EWE Gradient Bar ===
    doc.setFillColor(eweBlue[0], eweBlue[1], eweBlue[2]);
    doc.rect(0, 0, 70, 6, 'F');
    doc.setFillColor(0, 125, 180);
    doc.rect(70, 0, 70, 6, 'F');
    doc.setFillColor(eweLightBlue[0], eweLightBlue[1], eweLightBlue[2]);
    doc.rect(140, 0, 70, 6, 'F');

    // Logo
    doc.addImage(eweLogo, 'PNG', 160, 10, 30, 30);

    // Firmenname
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(eweDark[0], eweDark[1], eweDark[2]);
    doc.text("Wilhelm Ewe GmbH & Co.KG", marginL, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Volkmaroder Str. 19 | 38104 Braunschweig | Tel. 0531 / 3 80 08-0", marginL, 24);

    // Titel
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(eweDark[0], eweDark[1], eweDark[2]);
    doc.text("MEGARIPP-Konfiguration", marginL, 38);

    // Info-Zeile
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(marginL, 42, contentW, 10, 2, 2, 'F');
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Anfrage-Nr.: ${requestNumber}`, marginL + 4, 48.5);
    doc.text(`Datum: ${currentDate}`, marginL + 70, 48.5);
    doc.text(`Art.-Nr.: ${articleNumber}`, marginL + 130, 48.5);

    // === KUNDENDATEN-BOX (2-spaltig) ===
    let y = 58;
    doc.setFillColor(245, 250, 255);
    doc.setDrawColor(200, 220, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginL, y, contentW, 32, 2, 2, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(eweDark[0], eweDark[1], eweDark[2]);
    doc.text("Kundendaten", marginL + 4, y + 6);
    doc.setDrawColor(200, 220, 240);
    doc.line(marginL + 4, y + 8, marginL + contentW - 4, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const col1X = marginL + 4, col2X = marginL + contentW / 2 + 4;
    const labelW = 20;
    doc.setFont("helvetica", "bold"); doc.text("Name:", col1X, y + 14);
    doc.setFont("helvetica", "normal"); doc.text(fullName, col1X + labelW, y + 14);
    doc.setFont("helvetica", "bold"); doc.text("Firma:", col1X, y + 20);
    doc.setFont("helvetica", "normal"); doc.text(company || "\u2013", col1X + labelW, y + 20);
    doc.setFont("helvetica", "bold"); doc.text("Adresse:", col1X, y + 26);
    doc.setFont("helvetica", "normal"); doc.text(`${street}, ${postalCode} ${city}`, col1X + labelW, y + 26);
    doc.setFont("helvetica", "bold"); doc.text("E-Mail:", col2X, y + 14);
    doc.setFont("helvetica", "normal"); doc.text(email, col2X + labelW, y + 14);
    doc.setFont("helvetica", "bold"); doc.text("Telefon:", col2X, y + 20);
    doc.setFont("helvetica", "normal"); doc.text(phone, col2X + labelW, y + 20);

    // === KONFIGURATIONSTABELLE + PRODUKTBILD ===
    y = 96;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(eweDark[0], eweDark[1], eweDark[2]);
    doc.text("Ihre Konfiguration", marginL, y);
    y += 4;
    
    // Tabelle (linke 2/3)
    const tableW = contentW * 0.63;
    const imgAreaX = marginL + tableW + 4;
    const imgAreaW = contentW - tableW - 4;
    const rowH = 9;
    const colLabelW = 50;
    const configRows = [
        { label: 'Anlagengröße', value: lastSelections.selection1 || '\u2013' },
        { label: 'WZ-Anlage Eingang', value: lastSelections.selection2 || '\u2013' },
        { label: 'WZ-Anlage Ausgang', value: lastSelections.selection3 || '\u2013' },
        { label: 'Anzahl WZ-Anlagen', value: lastSelections.selection4 || '\u2013' },
        { label: 'PE-Größe Eingang', value: lastSelections.selection5 || '\u2013' },
        { label: 'PE-Größe Ausgang', value: lastSelections.selection6 || '\u2013' },
        { label: 'Abdeckung', value: lastSelections.selection7 || '\u2013' },
        { label: 'Schachtschlüssel', value: lastSelections.selection8 || '\u2013' }
    ];
    const tableStartY = y;
    doc.setFillColor(eweBlue[0], eweBlue[1], eweBlue[2]);
    doc.rect(marginL, y, tableW, rowH, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Merkmal", marginL + 3, y + 6);
    doc.text("Auswahl", marginL + colLabelW + 3, y + 6);
    y += rowH;
    configRows.forEach((row, i) => {
        if (i % 2 === 0) { doc.setFillColor(245, 250, 255); doc.rect(marginL, y, tableW, rowH, 'F'); }
        doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(40, 40, 40);
        doc.text(row.label, marginL + 3, y + 6);
        const valLines = doc.splitTextToSize(row.value, tableW - colLabelW - 6);
        doc.text(valLines[0], marginL + colLabelW + 3, y + 6);
        y += rowH;
    });
    const tableEndY = y;
    doc.setDrawColor(200, 210, 220); doc.setLineWidth(0.3);
    doc.rect(marginL, tableStartY, tableW, tableEndY - tableStartY);
    doc.line(marginL + colLabelW, tableStartY + rowH, marginL + colLabelW, tableEndY);
    // Produktbild rechts
    const imgBoxH = tableEndY - tableStartY;
    doc.setDrawColor(200, 220, 240); doc.setFillColor(250, 252, 255);
    doc.roundedRect(imgAreaX, tableStartY, imgAreaW, imgBoxH, 2, 2, 'FD');
    const imgW = imgAreaW - 8, imgH = imgW * 1.25;
    const imgX = imgAreaX + 4, imgY = tableStartY + (imgBoxH - imgH) / 2 - 5;
    try { doc.addImage(productImage, 'PNG', imgX, imgY > tableStartY + 2 ? imgY : tableStartY + 2, imgW, imgH); } catch(e) {}
    doc.setFont("helvetica", "italic"); doc.setFontSize(7); doc.setTextColor(120, 120, 120);
    doc.text("MegaRipp Wasserzählerschacht", imgAreaX + imgAreaW / 2, tableStartY + imgBoxH - 3, { align: "center" });
    // Zusammenfassung
    y = tableEndY + 6;
    doc.setFillColor(245, 250, 255);
    doc.roundedRect(marginL, y, contentW, 24, 2, 2, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(eweDark[0], eweDark[1], eweDark[2]);
    doc.text("Zusammenfassung", marginL + 4, y + 6);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(40, 40, 40);
    const summaryText = `Ein MegaRipp ${lastSelections.selection1 || ''} mit ${lastSelections.selection4 || ''} WZ-Anlage(n) ${lastSelections.selection2 || ''} / ${lastSelections.selection3 || ''}. Eingang: 1 x ${lastSelections.selection5 || ''}. Ausgang: ${lastSelections.selection4 || ''} x ${lastSelections.selection6 || ''}. Abdeckung: ${lastSelections.selection7 || ''}. Schlüssel: ${lastSelections.selection8 || ''}.`;
    doc.text(doc.splitTextToSize(summaryText, contentW - 8), marginL + 4, y + 12);
    // Bemerkungen
    y += 30;
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(eweDark[0], eweDark[1], eweDark[2]);
    doc.text("Bemerkungen", marginL, y);
    y += 4;
    doc.setDrawColor(200, 220, 240); doc.setLineWidth(0.3);
    doc.roundedRect(marginL, y, contentW, 18, 2, 2, 'D');
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(60, 60, 60);
    doc.text(doc.splitTextToSize(comments, contentW - 8).slice(0, 3), marginL + 4, y + 6);
    // Footer
    const footerY = 280;
    doc.setDrawColor(0, 161, 225); doc.setLineWidth(0.5);
    doc.line(marginL, footerY, pageW - marginR, footerY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(130, 130, 130);
    doc.text("Wilhelm Ewe GmbH & Co.KG | Volkmaroder Str. 19 | 38104 Braunschweig | Tel. 0531 / 3 80 08-0 | www.ewe-armaturen.de", pageW / 2, footerY + 4, { align: "center" });
    doc.text("Seite 1 von 1", pageW / 2, footerY + 8, { align: "center" });
    // Speichern
    const datum = new Date().toISOString().split('T')[0];
    const filenameParts = [company, "Anfrage Megaripp", requestNumber, datum].filter(p => p);
    const cleanFilename = filenameParts.map(p => p.replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, "").trim()).join("_");
    doc.save(`${cleanFilename}.pdf`);
}

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

    // NEU: Höhe des Containers anpassen
    setTimeout(adjustMainContainerHeight, 400);
}

/**
 * Zeigt einen bestimmten Bildschirm an.
 * @param {string} id - Die ID des Bildschirms.
 */
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    // NEU: Höhe an den Info-Screen anpassen
    setTimeout(adjustMainContainerHeight, 50); // Kurze Verzögerung für stabiles Rendering
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
    // NEU: Höhe an den Info-Screen anpassen
    setTimeout(adjustMainContainerHeight, 50); // Kurze Verzögerung für stabiles Rendering
}

/**
 * Zeigt den Benutzerdaten-Screen an.
 */
function showUserDataScreen() {
    document.getElementById('summaryScreen').classList.remove('active');
    document.getElementById('userDataScreen').classList.add('active');
    setTimeout(adjustMainContainerHeight, 50);
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

function adjustMainContainerHeight() {
    const mainContainer = document.querySelector('main');
    const activeScreen = document.querySelector('.screen.active');

    if (mainContainer && activeScreen) {
        // Die tatsächliche Höhe des Inhalts des aktiven Screens ermitteln
        const contentHeight = activeScreen.scrollHeight;

        // Dem main-Container eine feste Höhe zuweisen, die dem Inhalt entspricht
        // Wir fügen etwas Puffer hinzu (z.B. 40px), damit es nicht zu gedrängt aussieht
        mainContainer.style.height = (contentHeight + 40) + 'px';
    }
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