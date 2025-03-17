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

    // Speicherung der Auswahl
    if (selectionKey) {
        userSelection[selectionKey] = event.target.innerText;
        // Speichert die Auswahl auch in den neuen Variablen
        saveLastSelection(event.target.innerText, Object.keys(userSelection).indexOf(selectionKey) + 1);
    }

    // Prüft, ob screen5 aktiviert wurde und der Schacht "300mm Q3 16 6/4“" ist
    if (nextScreenId === "screen5") {
        const wzButtons = document.querySelectorAll("#screen5 button:not(.back-btn)");

        if (userSelection['schacht'] === "300mm Q3 16 6/4“") {
            // Blendet die Buttons 3 bis 5 aus
            wzButtons.forEach((button, index) => {
                if (index >= 2) button.style.display = "none";
            });
        } else {
            // Zeigt alle Buttons wieder an, falls ein anderer Schacht gewählt wird
            wzButtons.forEach(button => button.style.display = "inline-block");
        }
    }

        // Prüft, ob screen5 aktiviert wurde und der Schacht "300mm Q3 16 6/4“" ist
        if (nextScreenId === "screen5") {
            if (userSelection['schacht'] === "300mm Q3 16 6/4“") {
            const wzButtons = document.querySelectorAll("#screen5 button:not(.back-btn)");
    
            if (userSelection['deckel'] === "KMR – Kugelhahn*" || userSelection['deckel'] === "KMR – Schrägsitzventil*") {
                // Blendet die Buttons 3 bis 5 aus
                wzButtons.forEach((button, index) => {
                    if (index >= 1) button.style.display = "none";
                });
            } 

        }

    }
    
 
    if (nextScreenId === 'summaryScreen') {
        updateSummary();
    }
}

// Wechselt zurück zum vorherigen Bildschirm 
function prevScreen(prevScreenId) {
    
    const currentScreen = document.querySelector('.screen.active');
    currentScreen.classList.remove('active');

    const prevScreen = document.getElementById(prevScreenId);
    prevScreen.classList.add('active');

    // Wenn man zu screen1 zurückkehrt, wird die Überschrift geändert
    if (prevScreenId === "screen1") {
        document.querySelector("header h1").textContent = "Wasserzählerschacht-Konfigurator";
    }
}



// Speichert die Auswahl des Schachts und geht zum nächsten Bildschirm
function saveSchacht(schacht) {
    userSelection['schacht'] = schacht;  // Speichert die Schachtauswahl
    saveLastSelection(schacht, 1);  // Speichert die Auswahl in der richtigen Variablen
    nextScreen('screen3');  // Geht zur nächsten Auswahl
}

// Speichert die Auswahl der Eingangsventile
function saveRohrdeckung(rohrdeckung) {
    userSelection['rohrdeckung'] = rohrdeckung;  
    saveLastSelection(userSelection['rohrdeckung'], 2);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen4');  // Geht zum nächsten Bildschirm
}


// Speichert die Auswahl der Ausgangsbaugruppe
function saveDeckel(deckel) {
    userSelection['deckel'] = deckel;  // Speichert die Auswahl der Ausgangsbaugruppe
    saveLastSelection(userSelection['deckel'], 3);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen5');  // Geht zum nächsten Bildschirm
}

// Speichert die Auswahl der Wasserzähleranlage und geht zum nächsten Bildschirm
function saveWasserzaehleranlage(anlage) {
    userSelection['wasserzähleranlage'] = anlage;  // Speichert die Auswahl der Wasserzähleranlage
    saveLastSelection(userSelection['wasserzähleranlage'], 4);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen6');  // Geht zum nächsten Bildschirm
}

// Speichert die Auswahl der PE-Verschraubung und geht zum nächsten Bildschirm
function savePEVerschraubung(verschraubung) {
    userSelection['peVerschraubung'] = verschraubung;  // Speichert die Auswahl der PE-Verschraubung
    saveLastSelection(userSelection['peVerschraubung'], 5);  // Speichert in der neuen Auswahl-Variable

    nextScreen('screen7');  // Geht zum nächsten Bildschirm
}

// Speichert die Auswahl der PE-Größe und geht zum nächsten Bildschirm
function savePEGroesse(groesse) {
    userSelection['peGroesse'] = groesse;  // Speichert die Auswahl der PE-Größe
    saveLastSelection(userSelection['peGroesse'], 6);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen8');  // Geht zum nächsten Bildschirm
}


// Speichert die Auswahl des Wasserzählerschachtschlüssels
function saveWasserzaehlerSchluessel(schluessel) {
    if (schluessel === 'Ja' || schluessel === 'Nein') {
        userSelection['wasserzaehlerSchluessel'] = schluessel;
        saveLastSelection(userSelection['wasserzaehlerSchluessel'], 7);  // Speichert in der neuen Auswahl-Variable
        nextScreen('summaryScreen');  // Geht zum nächsten Bildschirm
    } else {
        alert("Bitte wählen Sie Ja oder Nein.");
    }
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
    document.getElementById('screen2').classList.add('active');
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
        <p>6. ${lastSelections.selection6}</p>
        <p>Wasserzählerschachtschlüssel : ${lastSelections.selection7}</p>
       
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





