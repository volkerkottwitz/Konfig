// Speichert die Auswahl des Benutzers
let userSelection = {
    produktgruppe: 'Flexoripp',
    schacht: '',
    rohrdeckung: '',
    deckel: '',
    wasserzaehler: '',
    peVerschraubung: '',
    groesseVerbindung: '',
    peGroesse: '',
    verbinder: '',
    peVerbindung: '',  // 1" / 5/4" Auswahl
    wasserzaehlerSchluessel: '',  // Wasserzählerschachtschlüssel
};

// Neue Variablen für die letzten 10 Auswahlen
let lastSelections = {
    selection1: '',
    selection2: '',
    selection3: '',
    selection4: '',
    selection5: '',
    selection6: '',
    selection7: '',
    selection8: '',
    selection9: '',
    selection10: '',
};

// Mappt die Screen-IDs zu den entsprechenden Vorschaubildern
// === KORRIGIERTE Zuordnung der Bilder zu den Screens ===
const screenImages = {
    screen2: 'images/sensus.jpg',
    screen3: 'images/Rohrdeckungschacht.JPG', // Beispielbild, bitte anpassen
    screen4: 'images/B125_tif.png', // Beispielbild, bitte anpassen
    screen4a: 'images/mitoderohne.png', // Beispielbild, bitte anpassen
    'screen5-mit': 'images/swzanlageohnedruckminderer.JPG', // Wichtig: ID mit Bindestrich in Anführungszeichen
    'screen5-ohne': 'images/swzanlagemitdruckminderer.JPG',// Wichtig: ID mit Bindestrich in Anführungszeichen
    screen6: 'images/4verbinder.JPG',
    screen8: 'images/PERohrGrklein.JPG',
    screen9: 'images/4Verbinder.jpg',
    screen10: 'images/schluessel.jpg' // Beispielbild, bitte anpassen
};


// Steuerung, ob die nächsten Bildschirme übersprungen werden sollen
let skipNextSteps = false;

// Funktion zum Speichern der Auswahl in den neuen Variablen
/**
 * Speichert die Auswahl in der 'lastSelections'-Variable für die Zusammenfassung.
 * @param {string} selection - Der ausgewählte Wert.
 * @param {number} number - Die Schrittnummer (1-10).
 */
function saveLastSelection(selection, number) {
    if (number >= 1 && number <= 10) {
        lastSelections[`selection${number}`] = selection;
    }
}


// Wechselt zum nächsten Bildschirm und speichert die Auswahl
// NEUE nextScreen Funktion (mit Animation)
// ===================================================================
//      FINALE, KORRIGIERTE NAVIGATION (EXAKT WIE MEGARIPP)
// ===================================================================

// ===================================================================
//      FINALE NAVIGATION (1:1-KOPIE DER MEGARIPP-LOGIK)
// ===================================================================

// ===================================================================
//      FINALE nextScreen-Funktion (1:1-KOPIE DER MEGARIPP-LOGIK)
// ===================================================================
function nextScreen(nextScreenId, selectionText = null) { // 1. Parameter für den Text hinzugefügt
    const currentScreen = document.querySelector('.screen.active');
    const currentScreenId = currentScreen ? currentScreen.id : null; // 2. ID des aktuellen Screens merken
    const nextScreenElement = document.getElementById(nextScreenId);

    if (currentScreen && nextScreenElement) {
        // Animation auslösen: Alter Screen wird entfernt
        currentScreen.classList.add('exit-to-left');
        currentScreen.classList.remove('active');

        // WICHTIG: Wir warten, bis die CSS-Transition des alten Screens beendet ist.
        currentScreen.addEventListener('transitionend', function handler() {
            // Aufräumen: Animationsklasse vom alten Screen entfernen
            currentScreen.classList.remove('exit-to-left');
            
            // Erst JETZT den neuen Screen sichtbar machen
            nextScreenElement.classList.add('active');
            
            // Den Event-Listener entfernen, damit er nicht mehrfach ausgelöst wird
            currentScreen.removeEventListener('transitionend', handler);
        }, { once: true });
    }

    // =================================================================
    // === HIER IST DIE KORREKTE STELLE FÜR DIE UI-LOGIK ===
    // =================================================================
    // Dieser Block wird sofort ausgeführt, damit die UI nicht auf die Animation wartet.
    
    // 3. Nur einen Nav-Step hinzufügen, wenn es eine Auswahl gab
    // === KORRIGIERTE UI-Logik ===
        
// Zähle erst JETZT zum nächsten Schritt hoch.
const isStepForward = nextScreenId.startsWith('screen'); // Prüft, ob es ein regulärer Schritt ist

// Wir fügen ein Bild hinzu, wenn es ein normaler Schritt ist ODER
// wenn wir vom letzten Screen (screen10) kommen.
if (isStepForward || (currentScreenId === 'screen10' && nextScreenId === 'summaryScreen')) {
    if (selectionText && currentScreenId) {
        addVisualNavStep(currentScreenId, currentStep, selectionText);
    }
}

// Wir erhöhen den Zähler nur bei einem echten Schritt vorwärts.
if (isStepForward) {
    currentStep++;
    updateProgressBar(currentStep, totalSteps);
}

    // === HIER IST DIE KORREKTUR ===
    // Setze den Schritt explizit, wenn wir zur Zusammenfassung oder zum User-Daten-Screen gehen.
    if (nextScreenId === 'summaryScreen' || nextScreenId === 'userDataScreen') {
        currentStep = totalSteps + 1; // Setzt den Schritt auf 10
        updateProgressBar(currentStep, totalSteps); // Aktualisiert die Leiste, die sich dann ausblendet
    }

if (nextScreenId === 'summaryScreen') {
    updateSummary();
}
}

function prevScreen(prevScreenId) {
    const currentScreen = document.querySelector('.screen.active');
    
    // === DIE ENTSCHEIDENDE KORREKTUR ===
    // Prüfen, ob wir uns auf einem regulären Schritt-Screen befinden.
    const isStepBackward = currentScreen && currentScreen.id.startsWith('screen');

    if (isStepBackward) {
        // Nur bei einem echten Schritt zurück:
        currentStep--; // Zähler verringern
        removeLastVisualNavStep(); // Und das Bild aus der Leiste entfernen
    }
    // === ENDE DER KORREKTUR ===
    // 2. Die Fortschrittsanzeige SOFORT für den neuen, aktuellen Schritt aktualisieren.
    updateProgressBar(currentStep, totalSteps);



    // 4. Das Ziel für den "Zurück"-Sprung bestimmen (Sonderlogik für "Ohne Verschraubung").
    // Dieser Teil bleibt unverändert.
    let targetScreenId = prevScreenId;
    if (currentScreen && currentScreen.id === 'screen10' && !lastSelections.selection7) {
        targetScreenId = 'screen6';
    }
    const prevScreenElement = document.getElementById(targetScreenId);

    // 5. Die Animation auslösen.
    // Dieser Teil bleibt unverändert.
    if (currentScreen && prevScreenElement) {
        currentScreen.classList.remove('active');
        prevScreenElement.classList.add('enter-from-left');
        
        setTimeout(() => {
            prevScreenElement.classList.add('active');
        }, 10);

        prevScreenElement.addEventListener('transitionend', function handler() {
            prevScreenElement.classList.remove('enter-from-left');
            prevScreenElement.removeEventListener('transitionend', handler);
        }, { once: true });
    }
}



function openProduktInfo() {
    document.getElementById('screen1').classList.remove('active');
    document.getElementById('produktInfoScreen').classList.add('active');
}

function goBack() {
    document.getElementById('produktInfoScreen').classList.remove('active');
    document.getElementById('screen1').classList.add('active');
}




// Speichert die Verbinder-Auswahl und geht zur nächsten Seite
/**
 * Speichert die Anzahl der Verbinder und wechselt zu Screen 10.
 * @param {string} verbinder - Die Anzahl ('1' oder '2').
 */
/**
 * Speichert die Anzahl der Verbinder und wechselt zu Screen 10.
 * @param {string} verbinder - Die Anzahl ('1' oder '2').
 * @param {string} buttonText - Der Text des geklickten Buttons.
 */
function saveVerbinderAndNext(verbinder, buttonText) {
    userSelection.verbinder = (verbinder === '1') ? "Ein Verbinder" : "Zwei Verbinder";
    saveLastSelection(userSelection.verbinder, 6);
    nextScreen('screen10', buttonText);
}

/**
 * Speichert die Auswahl zum Wasserzählerschlüssel und wechselt zur Zusammenfassung.
 * @param {string} schluessel - Die Auswahl ('Ja' oder 'Nein').
 * @param {string} buttonText - Der Text des geklickten Buttons.
 */
function saveWasserzaehlerSchluessel(schluessel, buttonText) {
    userSelection.wasserzaehlerSchluessel = schluessel;
    saveLastSelection(schluessel, 10);
    nextScreen('summaryScreen', buttonText);
}

/**
 * Speichert die Produktgruppe und wechselt zu Screen 2.
 * (Diese Funktion wird aktuell nicht verwendet, ist aber für Vollständigkeit hier).
 * @param {string} produktgruppe - Die ausgewählte Produktgruppe.
 * @param {string} buttonText - Der Text des geklickten Buttons.
 */
function saveProduktgruppe(produktgruppe, buttonText) {
    userSelection.produktgruppe = produktgruppe;
    saveLastSelection(produktgruppe, 1);
    if (produktgruppe === "Flexoripp") {
        document.querySelector("h1").textContent = "Flexoripp-Konfigurator";
    }
    nextScreen('screen2', buttonText);
}

/**
 * Speichert die Rohrdeckung und wechselt zu Screen 4.
 * @param {string} rohrdeckung - Die ausgewählte Rohrdeckung.
 * @param {string} buttonText - Der Text des geklickten Buttons.
 */
function saveRohrdeckung(rohrdeckung, buttonText) {
    userSelection.rohrdeckung = rohrdeckung;
    saveLastSelection(rohrdeckung, 3);
    nextScreen('screen4', buttonText);
}

/**
 * Speichert die Schachtgröße und wechselt zu Screen 3.
 * @param {string} schacht - Der ausgewählte Schacht.
 * @param {string} buttonText - Der Text des geklickten Buttons.
 */
function saveSchacht(schacht, buttonText) {
    userSelection.schacht = schacht;
    saveLastSelection(schacht, 2);
    userSelection.peGroesse = schacht.includes("260mm") ? "5/4“" : "1“";
    saveLastSelection(userSelection.peGroesse, 8);
    nextScreen('screen3', buttonText);
}

/**
 * Speichert den Deckel und wechselt zur Druckminderer-Abfrage (Screen 4a).
 * @param {string} deckel - Der ausgewählte Deckel.
 * @param {string} buttonText - Der Text des geklickten Buttons.
 */
function saveDeckel(deckel, buttonText) {
    userSelection.deckel = deckel;
    saveLastSelection(deckel, 4);
    nextScreen('screen4a', buttonText);
}

/**
 * Speichert die Wasserzähleranlage und wechselt zu Screen 6.
 * @param {string} anlage - Die ausgewählte Anlage.
 * @param {string} buttonText - Der Text des geklickten Buttons.
 */
function saveWasserzaehleranlage(anlage, buttonText) {
    userSelection.wasserzaehleranlage = anlage;
    saveLastSelection(anlage, 5);
    nextScreen('screen6', buttonText);
}

/**
 * Speichert die PE-Verschraubung und wechselt zu Screen 8.
 * @param {string} verschraubung - Die ausgewählte Verschraubung.
 * @param {string} buttonText - Der Text des geklickten Buttons.
 */
function savePEVerschraubung(verschraubung, buttonText) {
        // === WICHTIGE ERGÄNZUNG ===
    // Wir stellen sicher, dass die "übersprungen"-Markierung entfernt wird.
    sessionStorage.removeItem('skippedVerschraubung');
    userSelection.peVerschraubung = verschraubung;
    saveLastSelection(verschraubung, 7);
    nextScreen('screen8', buttonText);
}


// === NEUE HILFSFUNKTION ===
function goBackFromSchluessel() {
    // Prüfen, ob die "übersprungen"-Markierung gesetzt ist.
    if (sessionStorage.getItem('skippedVerschraubung') === 'true') {
        // Wenn ja, springe direkt zu screen6.
        sessionStorage.removeItem('skippedVerschraubung'); // Markierung für den nächsten Durchlauf aufräumen
        prevScreen('screen6');
    } else {
        // Wenn nein, gehe den normalen Weg zurück zu screen9.
        prevScreen('screen9');
    }
}

// HINWEIS: Sie benötigen auch eine angepasste savePEGroesseVerbindung-Funktion.
// Ich habe sie hier zur Vollständigkeit hinzugefügt.
/**
 * Speichert die Größe der PE-Verbindung und wechselt zu Screen 9.
 * @param {string} groesse - Die ausgewählte Größe.
 * @param {string} buttonText - Der Text des geklickten Buttons.
 */
function savePEGroesseVerbindung(groesse, buttonText) {
    userSelection.groesseVerbindung = groesse;
    saveLastSelection(groesse, 9);
    nextScreen('screen9', buttonText);
}


/**
 * Leitet den Benutzer basierend auf der Druckminderer-Auswahl
 * zum entsprechenden nächsten Bildschirm weiter.
 * @param {string} option - Die Auswahl ('mit' oder 'ohne').
 * @param {string} buttonText - Der Text des geklickten Buttons.
 */
function chooseDruckminderer(option, buttonText) {
    sessionStorage.setItem("druckminderer", option);
    
    let nextScreenId = '';
    if (option === "mit") {
        nextScreenId = "screen5-mit";
    } else {
        nextScreenId = "screen5-ohne";
    }
    
    // === DIE ENTSCHEIDENDE KORREKTUR ===
    // Wir merken uns, zu welchem Screen wir als nächstes springen.
    // Das ist der Screen, zu dem wir von screen6 aus zurückkehren müssen.
    sessionStorage.setItem('previousScreenAfterDruckminderer', nextScreenId);
    // === ENDE DER KORREKTUR ===

    saveLastSelection(buttonText, 5);
    nextScreen(nextScreenId, buttonText);
}


// === NEUE HILFSFUNKTION ===
function goBackFromPEVerschraubung() {
    // Hole den gemerkten Screen aus dem Speicher.
    // Fallback auf 'screen4a', falls nichts gespeichert ist.
    const targetScreen = sessionStorage.getItem('previousScreenAfterDruckminderer') || 'screen4a';
    prevScreen(targetScreen);
}








// Überspringt die Auswahl und geht direkt zum nächsten Bildschirm
// KORRIGIERTE skipNextScreens Funktion
/**
 * Überspringt die Verschraubungs-Auswahl und geht direkt zu Screen 10.
 * @param {string} buttonText - Der Text des geklickten Buttons.
 */
function skipNextScreens(buttonText) { // <-- Neuer Parameter

     // Wir merken uns, dass der Benutzer die Verschraubungen übersprungen hat.
    sessionStorage.setItem('skippedVerschraubung', 'true');

    // Setze die relevanten Auswahlen auf "nicht gewählt" oder null
    userSelection.peVerschraubung = null;
    userSelection.verbinder = null;
    userSelection.groesseVerbindung = null;

    // Aktualisiere die 'lastSelections' für die Anzeige
    saveLastSelection('Ohne Verschraubung', 7); // Speichert die Auswahl für die Zusammenfassung

    // WICHTIG: Die peGroesse (Auswahl 8) bleibt unberührt!

    nextScreen('screen10', buttonText); // <-- Übergabe des buttonText
}




// Setzt den gesamten Konfigurator zurück
function resetConfig() {
    userSelection = {
        produktgruppe: '',
        schacht: '',
        rohrdeckung: '',
        deckel: '',
        wasserzaehler: '',
        peVerschraubung: '',
        groesseVerbindung: '',
        peGroesse: '',
        verbinder: '',
        peVerbindung: '',
        wasserzaehlerSchluessel: ''
    };

    lastSelections = {
        selection1: '',
        selection2: '',
        selection3: '',
        selection4: '',
        selection5: '',
        selection6: '',
        selection7: '',
        selection8: '',
        selection9: '',
        selection10: ''
    };
    currentStep = 1;
    updateProgressBar(currentStep, totalSteps);

    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('screen1').classList.add('active');
    document.getElementById('summary').innerText = '';

    document.querySelector("header h1").textContent = "Wasserzählerschacht-Konfigurator";
}



// Zeigt die Zusammenfassung der Auswahl an
// ===================================================================
//      FINALE, NEUE updateSummary-Funktion (wie Megaripp)
// ===================================================================
function updateSummary() {
    const summaryContainer = document.getElementById('summary');
    summaryContainer.innerHTML = ''; // Alten Inhalt leeren

    // Definieren, welche Auswahl in welcher Reihenfolge angezeigt wird
    const summaryItems = [
        { label: 'Zählergröße', value: lastSelections.selection2, step: 1, screen: 'screen2' },
        { label: 'Rohrdeckung', value: lastSelections.selection3, step: 2, screen: 'screen3' },
        { label: 'Deckel', value: lastSelections.selection4, step: 3, screen: 'screen4' },
        { label: 'WZ-Anlage', value: lastSelections.selection5, step: 4, screen: 'screen4a' },
        // Auswahl 6 (Anzahl Verbinder) und 7 (Typ) werden zusammengefasst
        { label: 'PE-Verschraubung', value: lastSelections.selection7 ? `${lastSelections.selection7} (${lastSelections.selection6})` : 'Ohne Verschraubung', step: 6, screen: 'screen6' },
        { label: 'PE-Größe', value: lastSelections.selection9, step: 7, screen: 'screen8' },
        { label: 'Schachtschlüssel', value: lastSelections.selection10, step: 9, screen: 'screen10' }
    ];

    summaryItems.forEach(item => {
        // Nur Elemente anzeigen, für die ein Wert existiert
        if (item.value) {
            const summaryButton = document.createElement('button');
            summaryButton.className = 'summary-item-btn';
            
            // Label und Wert in separate <span>-Tags packen für das Styling
            summaryButton.innerHTML = `<span class="summary-label">${item.label}:</span> <span class="summary-value">${item.value}</span>`;
            
            // Daten für den Sprung zurück speichern (noch nicht aktiv)
            summaryButton.dataset.targetScreen = item.screen;
            summaryButton.dataset.stepNumber = item.step;
            
            // Hier könnte man einen Event-Listener für das Zurückspringen hinzufügen
            // summaryButton.addEventListener('click', jumpToScreenFromNav);
            
            summaryContainer.appendChild(summaryButton);
        }
    });
}


function generateRequestNumber() {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
    const timePart = now.toTimeString().slice(0, 5).replace(/:/g, ""); // HHMM
    const randomNum = Math.floor(100 + Math.random() * 900); // 3-stellige Zufallszahl

    return `${datePart}${timePart}${randomNum}`;
}


function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Bilder-URLs
    const eweLogo = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/logo.png";
    const flexorippImage = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/flexoripp.jpg";
    
    // Generiere die Anfragenummer
    const requestNumber = generateRequestNumber();

    // Holen der Benutzerdaten aus dem Formular
    const name = document.getElementById('name').value;
    const street = document.getElementById('street').value;
    const postalCode = document.getElementById('postalCode').value;
    const city = document.getElementById('city').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value || "Nicht angegeben";
    const comments = document.getElementById('comments').value || "Keine Bemerkungen";

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

        // Abschnitt Anfragenummer
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(0, 51, 102);
        doc.text(`Anfragenummer: ${requestNumber}`, 20, 75);


    // Einleitungstext
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Sehr geehrte Damen und Herren,", 20, 85);
    doc.text("anbei sende ich Ihnen meine Konfiguration des EWE-Produktes:", 20, 94);
    doc.text("Bitte bieten Sie mir folgende Zusammenstellung an:", 20, 101);

    // "FLEXORIPP" fett setzen
    doc.setFont("helvetica", "bold");
    doc.text("FLEXORIPP", 122, 94);

    // Horizontale Linie
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, 108, 190, 108);

    // Auswahlpunkte
    let yOffset = 118;
    let selections = [
        `Ein Flexoripp ${lastSelections.selection2} in ${lastSelections.selection3}.`,
        `Mit dem ${lastSelections.selection4}.`,
        `Die Wasserzähleranlage ist ${lastSelections.selection5}.`
    ];
    
    // Wenn selection6 nicht leer ist, füge die entsprechenden Zeilen hinzu
    if (lastSelections.selection6) {
        selections.push(`${lastSelections.selection6} ist/sind gewünscht und zwar:`);
        selections.push(`Die ${lastSelections.selection7} in ${lastSelections.selection9} x ${lastSelections.selection8}.`);
    }
    
    // Die Wasserzählerschachtschlüssel Zeile immer hinzufügen
    selections.push(`Wasserzählerschachtschlüssel 15mm: ${lastSelections.selection10}`);
    
    // Abschnitt Zusammenstellung
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text("Zusammenstellung:", 20, yOffset);

    yOffset += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    selections.forEach((item) => {
        doc.text(`${item}`, 25, yOffset);
        yOffset += 8;
    });

    // Bild auf Höhe der Zusammenstellung ziehen
    doc.addImage(flexorippImage, 'JPEG', 160, 122, 20, 35);

    // Trennlinie
    doc.setLineWidth(0.5);
    doc.line(20, yOffset + 1, 190, yOffset + 1);

    // Benutzer-Daten einfügen
    yOffset += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text("Benutzerdaten:", 20, yOffset);

    yOffset += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Name:", 25, yOffset);
    doc.text(name, 60, yOffset);
    yOffset += 8;
    doc.text("Straße:", 25, yOffset);
    doc.text(street, 60, yOffset);
    yOffset += 8;
    doc.text("PLZ:", 25, yOffset);
    doc.text(postalCode, 60, yOffset);
    yOffset += 8;
    doc.text("Ort:", 25, yOffset);
    doc.text(city, 60, yOffset);
    yOffset += 8;
    doc.text("E-Mail:", 25, yOffset);
    doc.text(email, 60, yOffset);
    yOffset += 8;
    doc.text("Telefon:", 25, yOffset);
    doc.text(phone, 60, yOffset);
    yOffset += 8;
    doc.text("Bemerkungen:", 25, yOffset);
    doc.text(comments, 60, yOffset);


    // PDF öffnen
    const pdfData = doc.output('blob');
    const url = URL.createObjectURL(pdfData);
    window.open(url);
}


// Sendet die Zusammenstellung per E-Mail ohne HTML-Tags
function sendEmail() {
    let recipient = "volker.kottwitzo@ewe-armaturen.de";
    let emailBody = `
Sehr geehrte Damen und Herren,

ich hoffe, es geht Ihnen gut. Anbei sende ich Ihnen die Konfiguration, die ich über Ihren Konfigurator erstellt habe:

---------------------------------------------------------
1. ${lastSelections.selection1}
2. ${lastSelections.selection2}
3. ${lastSelections.selection3}
4. ${lastSelections.selection4}
5. ${lastSelections.selection5}
6. ${lastSelections.selection6}
7. ${lastSelections.selection7}
8. ${lastSelections.selection8}
9. ${lastSelections.selection9}
---------------------------------------------------------

Ich wäre Ihnen dankbar, wenn Sie mir ein Angebot auf Basis dieser Konfiguration unterbreiten könnten.

Vielen Dank im Voraus für Ihre Mühe. Ich freue mich auf Ihre Rückmeldung.

Mit freundlichen Grüßen,
[Ihr Name]
[Ihr Unternehmen]
`;

    // Gmail-Link erzeugen
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=&su=Anfrage%20für%20ein%20Angebot&body=${encodeURIComponent(emailBody)}`;
    window.location.href = gmailLink;
}



// Sendet die Zusammenstellung per E-Mail ohne HTML-Tags
function sendEmail1() {
    let emailBody = `Sehr geehrte Damen und Herren,%0D%0A%0D%0A
ich hoffe, es geht Ihnen gut. Anbei sende ich Ihnen die Konfiguration, die ich über Ihren Konfigurator erstellt habe:%0D%0A%0D%0A
---------------------------------------------------------%0D%0A
1. ${lastSelections.selection1}%0D%0A
2. ${lastSelections.selection2}%0D%0A
3. ${lastSelections.selection3}%0D%0A
4. ${lastSelections.selection4}%0D%0A
5. ${lastSelections.selection5}%0D%0A
6. ${lastSelections.selection6}%0D%0A
7. ${lastSelections.selection7}%0D%0A
8. ${lastSelections.selection8}%0D%0A
9. ${lastSelections.selection9}%0D%0A
---------------------------------------------------------%0D%0A%0D%0A
Ich wäre Ihnen dankbar, wenn Sie mir ein Angebot auf Basis dieser Konfiguration unterbreiten könnten.%0D%0A%0D%0A
Vielen Dank im Voraus für Ihre Mühe. Ich freue mich auf Ihre Rückmeldung.%0D%0A%0D%0A
Mit freundlichen Grüßen,%0D%0A
[Ihr Name]%0D%0A
[Ihr Unternehmen]`;

    // Mailto-Link erzeugen
    const mailtoLink = `mailto:?subject=Anfrage für ein Angebot&body=${emailBody}`;
    window.location.href = mailtoLink;
}


function sendEmail2() {
    let emailBody = `
Sehr geehrte Damen und Herren,

ich hoffe, es geht Ihnen gut. Hier sende ich Ihnen die Konfiguration, die ich über Ihren Konfigurator erstellt habe:

---------------------------------------------------------
1. ${lastSelections.selection1}
2. ${lastSelections.selection2}
3. ${lastSelections.selection3}
4. ${lastSelections.selection4}
5. ${lastSelections.selection5}
6. ${lastSelections.selection6}
7. ${lastSelections.selection7}
8. ${lastSelections.selection8}
9. ${lastSelections.selection9}
---------------------------------------------------------

Ich wäre Ihnen dankbar, wenn Sie mir ein Angebot auf Basis dieser Konfiguration unterbreiten könnten.

Vielen Dank im Voraus für Ihre Mühe. Ich freue mich auf Ihre Rückmeldung.

Mit freundlichen Grüßen,
[Ihr Name]
[Ihr Unternehmen]
`;

    const emailSubject = "Anfrage für ein Angebot";

    // Versucht, die E-Mail zu öffnen
    const emailLink = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    // Öffnet die E-Mail-Anwendung direkt
    window.location.href = emailLink;
}



// Fortschrittsanzeige aktualisieren
// === KORRIGIERTE Fortschrittsanzeige ===
// === FINALE, KORRIGIERTE Fortschrittsanzeige ===
// ===================================================================
//      FINALE, KORRIGIERTE updateProgressBar-Funktion
// ===================================================================
function updateProgressBar(step, total) {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    const progressContainer = document.querySelector('.progress-container');

    // Die Leiste wird nur für die Schritte 1 bis 9 angezeigt.
    // Bei Schritt 10 (Zusammenfassung) oder höher wird sie ausgeblendet.
    if (step >= 1 && step <= total) {
        progressContainer.style.display = 'block';
        progressText.style.display = 'block';
        
        // Korrigierte Berechnung für den Fortschritt
        let progressPercent = (total === 1) ? 100 : ((step - 1) / (total - 1)) * 100;

        progressBar.style.width = progressPercent + "%";
        progressText.textContent = `Schritt ${step} von ${total}`;
    } else {
        // Leiste für alle anderen Fälle (z.B. Zusammenfassung) ausblenden.
        progressContainer.style.display = 'none';
        progressText.style.display = 'none';
    }
}




// Beispiel: Fortschritt beim Wechseln der Screens aktualisieren
let currentStep = 1;
const totalSteps = 9; // Anzahl der Auswahlseiten



// Initiale Anzeige beim Laden der Seite
updateProgressBar(currentStep, totalSteps);


// Benutzerdaten

document.querySelector('.submit-btn').addEventListener('click', function(event) {
    // Formulardaten validieren
    var form = document.getElementById('userDataForm');
    if (form.checkValidity()) {  // Überprüft, ob alle Pflichtfelder ausgefüllt sind
        event.preventDefault();  // Verhindert das automatische Absenden des Formulars
        generatePDF();  // PDF-Generierung auslösen
    } 
});


function showUserDataScreen() {



   

    // Blende den Zusammenfassungs-Bildschirm aus
    document.getElementById('summaryScreen').classList.remove('active');
    
    // Zeige den Benutzer-Daten-Bildschirm an
    document.getElementById('userDataScreen').classList.add('active');




}


// === NEU: Funktionen zur Steuerung des Info-Bildschirms ===

// Speichert die ID des Screens, von dem aus das Info-Fenster geöffnet wurde.
let lastActiveScreenId = '';

/**
 * Öffnet den Info-Bildschirm und lädt die korrekte PDF.
 * @param {HTMLElement} imageElement - Das angeklickte Bild-Element.
 */
function openInfoScreen(imageElement) {
    const pdfPath = imageElement.getAttribute('data-pdf');
    if (!pdfPath) {
        console.error("Kein 'data-pdf'-Attribut auf dem Bild gefunden.");
        return;
    }

    // Den aktuellen Screen merken
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) {
        lastActiveScreenId = currentScreen.id;
    }

    // PDF in den iframe laden und Info-Screen anzeigen
    document.getElementById('infoScreenPdf').src = pdfPath;
    nextScreen('infoScreen'); // Nutzt unsere bestehende Animations-Logik
}

/**
 * Schließt den Info-Bildschirm und kehrt zum vorherigen Screen zurück.
 */
function closeInfoScreen() {
    if (lastActiveScreenId) {
        // Kehrt zum gemerkten Screen zurück
        prevScreen(lastActiveScreenId);
    } else {
        // Fallback, falls etwas schiefgeht
        prevScreen('screen2');
    }
}




// === NEU: Funktionen für die visuelle Navigationsleiste ===

function addVisualNavStep(screenId, step, selectionText) {
    const navContainer = document.getElementById('visual-nav-container');
    const imageSrc = screenImages[screenId];
    const tooltipElement = document.getElementById('custom-tooltip');
    
    if (imageSrc && selectionText) {
        const navImage = document.createElement('img');
        navImage.src = imageSrc;
        navImage.className = 'visual-nav-step';
        navImage.dataset.targetScreen = screenId;
        navImage.dataset.stepNumber = step;

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

        navImage.addEventListener('click', jumpToScreenFromNav);
        navContainer.appendChild(navImage);
    }
}

function removeLastVisualNavStep() {
    const navContainer = document.getElementById('visual-nav-container');
    if (navContainer.lastChild) {
        navContainer.removeChild(navContainer.lastChild);
    }
}

// ===================================================================
//      FINALE, KORRIGIERTE jumpToScreenFromNav-Funktion
// ===================================================================
// ===================================================================
//      FINALE, ROBUSTE jumpToScreenFromNav-Funktion (v3)
// ===================================================================
// ===================================================================
//      FINALE, VEREINFACHTE jumpToScreenFromNav-Funktion
// ===================================================================
// ===================================================================
//      FINALE, ROBUSTE jumpToScreenFromNav-Funktion (v5 - Anti-Ghost-Node)
// ===================================================================
// ===================================================================
//      FINALE, ROBUSTE jumpToScreenFromNav-Funktion (v6 - mit Daten-Reset)
// ===================================================================
// ===================================================================
//      FINALE, KORRIGIERTE jumpToScreenFromNav-Funktion (v7)
// ===================================================================
function jumpToScreenFromNav(event) {
    const targetElement = event.currentTarget;
    const targetScreenId = targetElement.dataset.targetScreen;
    const targetStep = parseInt(targetElement.dataset.stepNumber);
    const currentScreen = document.querySelector('.screen.active');

    if (currentScreen.id === targetScreenId) {
        return;
    }

    // === DIE ENTSCHEIDENDE KORREKTUR ===
    // Die Schleife startet jetzt bei targetStep, nicht bei targetStep + 1.
    // Das stellt sicher, dass auch die Auswahl des Ziel-Schritts gelöscht wird.
    for (let i = targetStep; i <= 10; i++) {
        if (lastSelections[`selection${i}`]) {
            lastSelections[`selection${i}`] = null;
        }
    }
    // === ENDE DER KORREKTUR ===

    const navContainer = document.getElementById('visual-nav-container');
    while (navContainer.lastChild && parseInt(navContainer.lastChild.dataset.stepNumber) >= targetStep) {
        navContainer.removeChild(navContainer.lastChild);
    }

    currentStep = targetStep;
    updateProgressBar(currentStep, totalSteps);

    const targetScreen = document.getElementById(targetScreenId);
    if (currentScreen && targetScreen) {
        currentScreen.classList.remove('active');
        targetScreen.classList.add('enter-from-left');
        
        setTimeout(() => {
            targetScreen.classList.add('active');
        }, 10);

        targetScreen.addEventListener('transitionend', function handler() {
            targetScreen.classList.remove('enter-from-left');
            targetScreen.removeEventListener('transitionend', handler);
        }, { once: true });
    }
}


// ===================================================================
//      DOMContentLoaded am Ende Ihrer Datei
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // === HIER IST DIE KORREKTUR ===
    // Fügt den Event-Listener für alle Info-Bilder wieder hinzu.
    const infoImages = document.querySelectorAll('.info-image');
    infoImages.forEach(image => {
        image.addEventListener('click', () => {
            // Ruft die bereits existierende Funktion auf, wenn ein Bild geklickt wird.
            openInfoScreen(image);
        });
    });
    // === ENDE DER KORREKTUR ===

    // Event-Listener für den Submit-Button (bereits vorhanden)
    document.querySelector('.submit-btn').addEventListener('click', function(event) {
        var form = document.getElementById('userDataForm');
        if (form.checkValidity()) {
            event.preventDefault();
            generatePDF();
        } 
    });

    // Initialen Zustand der Fortschrittsanzeige hier setzen (bereits vorhanden)
    updateProgressBar(currentStep, totalSteps);
});


