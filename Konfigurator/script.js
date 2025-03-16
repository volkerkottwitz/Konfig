// Speichert die Auswahl des Benutzers
let userSelection = {
    produktgruppe: '',
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

// Steuerung, ob die nächsten Bildschirme übersprungen werden sollen
let skipNextSteps = false;

// Funktion zum Speichern der Auswahl in den neuen Variablen
function saveLastSelection(selection, number) {
    switch (number) {
        case 1: lastSelections.selection1 = selection; break;
        case 2: lastSelections.selection2 = selection; break;
        case 3: lastSelections.selection3 = selection; break;
        case 4: lastSelections.selection4 = selection; break;
        case 5: lastSelections.selection5 = selection; break;
        case 6: lastSelections.selection6 = selection; break;
        case 7: lastSelections.selection7 = selection; break;
        case 8: lastSelections.selection8 = selection; break;
        case 9: lastSelections.selection9 = selection; break;
        case 10: lastSelections.selection10 = selection; break;
    }
}

// Wechselt zum nächsten Bildschirm und speichert die Auswahl
function nextScreen(nextScreenId, selectionKey = null) {
    const currentScreen = document.querySelector('.screen.active');
    currentScreen.classList.remove('active');

    const nextScreen = document.getElementById(nextScreenId);
    nextScreen.classList.add('active');


    if (skipNextSteps) {
        skipNextSteps = false;  // Zurücksetzen der Logik, nachdem sie verwendet wurde
    
           
        if (nextScreenId === 'screen6') { // Wenn der nächste Bildschirm die PE-Verschraubung ist
            nextScreen('screen9'); // Springe zu PE-Größen
            return;
        }
        if (nextScreenId === 'screen9') { // Wenn der nächste Bildschirm die PE-Größe ist
            nextScreen('screen10'); // Springe direkt zum Wasserzählerschachtschlüssel
            return;
        }
    }


    // Speicherung der Auswahl
    if (selectionKey) {
        userSelection[selectionKey] = event.target.innerText;
        // Speichert die Auswahl auch in den neuen Variablen
        saveLastSelection(event.target.innerText, Object.keys(userSelection).indexOf(selectionKey) + 1);
    }

    if (nextScreenId === 'summaryScreen') {
        updateSummary();
    }
}

// Wechselt zurück zum vorherigen Bildschirm mit spezieller Logik für PE-Verschraubung
function prevScreen(prevScreenId) {
    if (prevScreenId === 'screen9' && !userSelection['verbinder']) {
        prevScreenId = 'screen6'; // Springt zur PE-Verschraubung zurück, falls kein Verbinder ausgewählt wurde
    }
    
    const currentScreen = document.querySelector('.screen.active');
    currentScreen.classList.remove('active');

    const prevScreen = document.getElementById(prevScreenId);
    prevScreen.classList.add('active');
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

function saveVerbinderAndNext(verbinder) {
    // Überprüfen, welchen Verbinder der Benutzer gewählt hat
    if (verbinder === '1') {
        userSelection['verbinder'] = "Ein Verbinder";
    } else if (verbinder === '2') {
        userSelection['verbinder'] = "Zwei Verbinder";
    }

    saveLastSelection(userSelection['verbinder'], 6);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen10');  // Geht zum nächsten Bildschirm
}


// Speichert die Auswahl des Wasserzählerschachtschlüssels
function saveWasserzaehlerSchluessel(schluessel) {
    if (schluessel === 'Ja' || schluessel === 'Nein') {
        userSelection['wasserzaehlerSchluessel'] = schluessel;
        saveLastSelection(userSelection['wasserzaehlerSchluessel'], 10);  // Speichert in der neuen Auswahl-Variable
        nextScreen('summaryScreen');  // Geht zum nächsten Bildschirm
    } else {
        alert("Bitte wählen Sie Ja oder Nein.");
    }
}

// Speichert die Auswahl der Produktgruppe und geht zum nächsten Bildschirm
function saveProduktgruppe(produktgruppe) {
    userSelection['produktgruppe'] = produktgruppe;  // Speichert die Auswahl der Produktgruppe
    saveLastSelection(userSelection['produktgruppe'], 1);  // Speichert in der neuen Auswahl-Variable
        // Ändert die Überschrift basierend auf der Auswahl
        if (produktgruppe === "Flexoripp") {
            document.querySelector("h1").textContent = "Flexoripp-Konfigurator";
        }
    nextScreen('screen2');  // Geht zum nächsten Bildschirm
}


// Speichert die Auswahl der Rohrdeckung und geht zum nächsten Bildschirm
function saveRohrdeckung(rohrdeckung) {
    userSelection['rohrdeckung'] = rohrdeckung;  // Speichert die Auswahl der Rohrdeckung
    saveLastSelection(userSelection['rohrdeckung'], 3);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen4');  // Geht zum nächsten Bildschirm
}


// Speichert die Auswahl des Schachts und geht zum nächsten Bildschirm
function saveSchacht(schacht) {
    userSelection['schacht'] = schacht;  // Speichert die Schachtauswahl
    saveLastSelection(schacht, 2);  // Speichert die Auswahl in der richtigen Variablen

    // PE-Größe basierend auf der Schachtauswahl setzen
    let peGroesse = "1“"; // Standardwert bleibt 1"

    if (schacht.includes("260mm")) {
        peGroesse = "5/4“";  // Falls der Schacht 260mm ist
    }

    userSelection['peGroesse'] = peGroesse; // Speichert die PE-Größe
    saveLastSelection(peGroesse, 8);  // Speichert die Auswahl in der richtigen Variablen

    nextScreen('screen3');  // Geht zur nächsten Auswahl
}

// Speichert die Auswahl des Deckels und geht zum nächsten Bildschirm
function saveDeckel(deckel) {
    userSelection['deckel'] = deckel;  // Speichert die Auswahl des Deckels
    saveLastSelection(userSelection['deckel'], 4);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen5');  // Geht zum nächsten Bildschirm
}

// Speichert die Auswahl der Wasserzähleranlage und geht zum nächsten Bildschirm
function saveWasserzaehleranlage(anlage) {
    userSelection['wasserzähleranlage'] = anlage;  // Speichert die Auswahl der Wasserzähleranlage
    saveLastSelection(userSelection['wasserzähleranlage'], 5);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen6');  // Geht zum nächsten Bildschirm
}




// Speichert die Auswahl der PE-Verschraubung und geht zum nächsten Bildschirm
function savePEVerschraubung(verschraubung) {
    userSelection['peVerschraubung'] = verschraubung;  // Speichert die Auswahl der PE-Verschraubung
    saveLastSelection(userSelection['peVerschraubung'], 7);  // Speichert in der neuen Auswahl-Variable

    // Prüfen, ob die PE-Größe bereits gesetzt wurde
    if (!userSelection['peGroesse']) {
        // Wenn nicht, PE-Größe gemäß der Schachtauswahl setzen
        let peGroesse = "1“"; // Standardwert bleibt 1"

        // Überprüfen, ob die Schachtauswahl '260mm' enthält
        if (lastSelections.selection2 && lastSelections.selection2.includes("260mm")) {
            peGroesse = "5/4“";  // Falls der Schacht 260mm ist
        }

        userSelection['peGroesse'] = peGroesse;  // Speichert die PE-Größe
        saveLastSelection(peGroesse, 8);  // Speichert die Auswahl in der richtigen Variablen
    }

    nextScreen('screen8');  // Geht zum nächsten Bildschirm
}

// Überspringt die Auswahl und geht direkt zum nächsten Bildschirm
function skipNextScreens() {
    userSelection['peVerschraubung'] = 'Ohne Verschraubung';  // Speichert, dass keine Verschraubung gewählt wurde
    saveLastSelection(userSelection['peVerschraubung'], 6);  // Speichert in der neuen Auswahl-Variable
    
    // Setze auch alle relevanten Werte auf null
    userSelection['peVerschraubung'] = null;
    userSelection['groesseVerbindung'] = null;
    userSelection['peGroesse'] = null;
    userSelection['verbinder'] = null;

    // Setze auch lastSelections.selection6, selection7, selection8 und selection9 auf null
    lastSelections.selection6 = null;
    lastSelections.selection7 = null;
    lastSelections.selection8 = null;
    lastSelections.selection9 = null;

    nextScreen('screen10');  // Geht zum nächsten Bildschirm
}

// Speichert die Auswahl der PE-Größe und geht zum nächsten Bildschirm
function savePEGroesseVerbindung(groesse) {
    userSelection['peGroesseVerbindung'] = groesse;  // Speichert die Auswahl der PE-Größe
    saveLastSelection(userSelection['peGroesseVerbindung'], 9);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen9');  // Geht zum nächsten Bildschirm
}

// Speichert die Auswahl der PE-Größe und geht zum nächsten Bildschirm
function savePEGroesse(groesse) {
    userSelection['peGroesse'] = groesse;  // Speichert die Auswahl der PE-Größe
    saveLastSelection(userSelection['peGroesse'], 8);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen8');  // Geht zum nächsten Bildschirm
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

    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('screen1').classList.add('active');
    document.getElementById('summary').innerText = '';
}

// Zeigt die Zusammenfassung der Auswahl an
function updateSummary() {
    const summaryContainer = document.getElementById('summary');
    summaryContainer.innerHTML = '';  // Leere den aktuellen Inhalt

    const selectionOrder = [];
    for (const [key, value] of Object.entries(userSelection)) {
        if (value) {
            selectionOrder.push({ key, value });
        }
    }

    // Ausgabe der letzten 10 Auswahlen
    const lastSelectionsDiv = document.createElement('div');
    lastSelectionsDiv.classList.add('last-selections-summary');
    lastSelectionsDiv.innerHTML = `
        <h2></h2>
        <p>1. ${lastSelections.selection1}</p>
        <p>2. ${lastSelections.selection2}</p>
        <p>3. ${lastSelections.selection3}</p>
        <p>4. ${lastSelections.selection4}</p>
        <p>5. ${lastSelections.selection5}</p>
        ${lastSelections.selection7 && lastSelections.selection7 !== '0' ? `<p>6. ${lastSelections.selection6}</p>` : ''}
        ${lastSelections.selection7 && lastSelections.selection7 !== '0' ? `<p>7. ${lastSelections.selection7}</p>` : ''}
        ${lastSelections.selection7 && lastSelections.selection7 !== '0' ? `<p>8. ${lastSelections.selection8}</p>` : ''}
        ${lastSelections.selection7 && lastSelections.selection7 !== '0' ? `<p>9. ${lastSelections.selection9}</p>` : ''}
        <p>Wasserzählerschachtschlüssel : ${lastSelections.selection10}</p>
    `;
    summaryContainer.appendChild(lastSelectionsDiv);
}






function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Bilder-URLs (externes Verzeichnis, z.B. GitHub)
    const eweLogo = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/logo.png"; // EWE-Logo
    const flexorippImage = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/flexoripp.jpg"; // Flexoripp-Bild

    // Firmenname und Adresse oben
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);  // Blau für den Firmennamen
    doc.text("Wilhelm EWE GmbH & Co.KG", 100, 20); // Firma oben

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9); // Kleinere Schriftgröße für Straße und PLZ
    doc.setTextColor(0, 0, 0);  // Standardfarbe für die Adresse
    doc.text("Volkmaroder Str. 19, 38104 Braunschweig", 100, 25); // Adresse unter dem Firmennamen etwas dichter dran

    // EWE-Logo einfügen (nach links verschoben)
    doc.addImage(eweLogo, 'PNG', 20, 6, 50, 40); // Logo nach links verschoben

    // Datum einfügen
    const currentDate = new Date().toLocaleDateString();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Datum: ${currentDate}`, 160, 40);

    // Betreff fett und größer, weiter nach unten verschoben
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Ihre Anfrage", 20, 70);  // Weiter nach unten verschoben

    // Einleitungstext
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10); // Kleinere Schriftgröße
    doc.text("Sehr geehrte Damen und Herren,", 20, 80);
    doc.text("anbei sende ich Ihnen meine Konfiguration des EWE-Produktes:", 20, 87);

    // Abstand zwischen Einleitungstext und der Auflistung
    let yOffset = 98;

    // Hier kommen die echten Werte aus der Auswahl rein
    let selections = [
        `1. ${lastSelections.selection1 || "Nicht ausgewählt"}`,
        `2. ${lastSelections.selection2 || "Nicht ausgewählt"}`,
        `3. ${lastSelections.selection3 || "Nicht ausgewählt"}`,
        `4. ${lastSelections.selection4 || "Nicht ausgewählt"}`,
        `5. ${lastSelections.selection5 || "Nicht ausgewählt"}`,
        `6. ${lastSelections.selection6 || "Nicht ausgewählt"}`,
        `7. ${lastSelections.selection7 || "Nicht ausgewählt"}`,
        `8. ${lastSelections.selection8 || "Nicht ausgewählt"}`,
        `9. ${lastSelections.selection9 || "Nicht ausgewählt"}`,
        `Wasserzählerschachtschlüssel: ${lastSelections.selection10 || "Nicht ausgewählt"}`
    ];

    selections.forEach((item) => {
        doc.text(item, 20, yOffset);
        yOffset += 10;
    });

    // Flexoripp-Bild auf Höhe der 4. Auswahl, mittig rechts
    doc.addImage(flexorippImage, 'JPEG', 140, 100, 15, 30); // Hier wird das Bild auf der 4. Auswahlhöhe eingefügt

    // Horizontale Linie nach den Auswahlpunkten
    doc.setDrawColor(0, 0, 0);  // Schwarz
    doc.setLineWidth(0.5);
    doc.line(20, yOffset + 10, 180, yOffset + 10);  // Linie nach den Auswahlpunkten

    // Eine zweite horizontale Linie unter der Auswahl
    doc.setLineWidth(0.5);
    doc.line(20, yOffset + 20, 180, yOffset + 20);  // Weitere Linie zur Trennung

    // Abschluss
    doc.text("Mit freundlichen Grüßen,", 20, yOffset + 30);
    doc.text("[Ihr Name]", 20, yOffset + 40);

    // Weitere horizontale Linie vor dem Abschluss
    doc.setLineWidth(0.5);
    doc.line(20, yOffset + 70, 180, yOffset + 70);  // Weitere Linie nach der Firmenadresse

    // PDF im neuen Tab öffnen
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


