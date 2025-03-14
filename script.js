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

    // Wenn "skipNextSteps" wahr ist, überspringe die nächsten beiden Bildschirme
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
    userSelection['schacht'] = schacht;  // Speichert die Auswahl des Schachts
    saveLastSelection(userSelection['schacht'], 2);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen3');  // Geht zum nächsten Bildschirm
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
    nextScreen('screen7');  // Geht zum nächsten Bildschirm
}

// Überspringt die Auswahl und geht direkt zum nächsten Bildschirm
function skipNextScreens() {
    userSelection['peVerschraubung'] = 'Ohne Verschraubung';  // Speichert, dass keine Verschraubung gewählt wurde
    saveLastSelection(userSelection['peVerschraubung'], 6);  // Speichert in der neuen Auswahl-Variable
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
        <p>6. ${lastSelections.selection6}</p>
        <p>7. ${lastSelections.selection7}</p>
        <p>8. ${lastSelections.selection8}</p>
        <p>9. ${lastSelections.selection9}</p>
        <p>Wasserzählerschachtschlüssel : ${lastSelections.selection10}</p>
    `;
    summaryContainer.appendChild(lastSelectionsDiv);
}







function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Beispiel-Inhalt
    doc.text("Hallo, das ist dein PDF!", 20, 20);
    
    // PDF in einem neuen Tab öffnen
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