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

    let stepNumber = parseInt(nextScreenId.replace('screen', ''));
    if (nextScreenId === 'screen4a') {
        stepNumber = 5;
    } else if (nextScreenId === 'screen5-mit') {
        stepNumber = 6;  // Falls screen5-mit ausgewählt wird, wird stepNumber auf 6 gesetzt
    } else if (nextScreenId === 'screen5-ohne') {
        stepNumber = 6;  // Wenn screen5-ohne ausgewählt wird, ist der wert auch6
    } else if (nextScreenId === 'screen6') {
        stepNumber = 7;  // Für screen6 wird stepNumber 7
    }  else if (nextScreenId === 'summaryScreen') {
        stepNumber = 11;  // Für summaryscreen wird stepNumber 11
    
}


    currentStep = stepNumber;
    updateProgressBar(currentStep, totalSteps);


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

    let stepNumber = parseInt(prevScreenId.replace('screen', ''));
    if (prevScreenId === 'screen4a') {
        stepNumber = 5;
    } else if (prevScreenId === 'screen5-mit') {
        stepNumber = 6;  // Falls screen5-mit ausgewählt wird, wird stepNumber auf 6 gesetzt
    } else if (prevScreenId === 'screen5-ohne') {
        stepNumber = 6;  // Wenn screen5-ohne ausgewählt wird, ist der wert auch6
    } else if (prevScreenId === 'screen6') {
        stepNumber = 7;  // Für screen6 wird stepNumber 7
    } 
    currentStep = stepNumber;
    updateProgressBar(currentStep, totalSteps);



    // Wenn man zu screen1 zurückkehrt, wird die Überschrift geändert
    if (prevScreenId === "screen1") {
        document.querySelector("header h1").textContent = "Wasserzählerschacht-Konfigurator";
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
    nextScreen('screen4a');  // Geht zum nächsten Bildschirm
}

// Speichert die Auswahl der Wasserzähleranlage und geht zum nächsten Bildschirm
function saveWasserzaehleranlage(anlage) {
    userSelection['wasserzähleranlage'] = anlage;  // Speichert die Auswahl der Wasserzähleranlage
    saveLastSelection(userSelection['wasserzähleranlage'], 5);  // Speichert in der neuen Auswahl-Variable
    nextScreen('screen6');  // Geht zum nächsten Bildschirm
}


function chooseDruckminderer(option) {
    sessionStorage.setItem("druckminderer", option);
    document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
    if (option === "mit") {
        document.getElementById("screen5-mit").classList.add("active");
    } else {
        document.getElementById("screen5-ohne").classList.add("active");
    }
    
    let stepNumber = 6;
    currentStep = stepNumber;
    updateProgressBar(currentStep, totalSteps);
    
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
    let currentStep = 1;
    updateProgressBar(currentStep, totalSteps);

    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    document.getElementById('screen1').classList.add('active');
    document.getElementById('summary').innerText = '';

    document.querySelector("header h1").textContent = "Wasserzählerschacht-Konfigurator";
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
        <p>Typ :         ${lastSelections.selection1} ${lastSelections.selection2}</p>
        <p>RD :          ${lastSelections.selection3}</p>
        <p>Abdeckung :   ${lastSelections.selection4}</p>
        <p>WZ-Anlage :   ${lastSelections.selection5}</p>
        ${lastSelections.selection7 && lastSelections.selection7 !== '0' ? `<p>Anzahl PE-V: ${lastSelections.selection6}</p>` : ''}
        ${lastSelections.selection7 && lastSelections.selection7 !== '0' ? `<p>Typ :        ${lastSelections.selection7} ${lastSelections.selection9} x ${lastSelections.selection8}</p>` : ''}
        <p>Schachtschlüssel 15mm : ${lastSelections.selection10}</p>
    `;
    summaryContainer.appendChild(lastSelectionsDiv);


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

    // Abschluss
    doc.setFontSize(10);
    doc.text("Mit freundlichen Grüßen,", 20, yOffset + 20);
    doc.text("[Ihr Name]", 20, yOffset + 28);

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
function updateProgressBar(step, totalSteps) {
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    const progressContainer = document.querySelector('.progress-container'); // Der Container für die Fortschrittsanzeige


    // Wenn die Zusammenstellung angezeigt wird, Fortschrittsanzeige ausblenden

    // Prozent berechnen und Fortschrittsleiste setzen
    let progressPercent = (step / totalSteps) * 100;
    progressBar.style.width = progressPercent + "%";

    // Fortschrittstext aktualisieren
    progressText.textContent = `Schritt ${step} von ${totalSteps}`;

    
    if (!(currentStep >= 2 && currentStep <= 10)) {
        // Wenn screen1 aktiv ist, Fortschrittsanzeige ausblenden
        progressBar.style.display = 'none';
        progressText.style.display = 'none';
        progressContainer.style.display = 'none';

    } else {
        // Ansonsten Fortschrittsanzeige anzeigen und aktualisieren
        progressBar.style.display = 'block';
        progressText.style.display = 'block';
        progressContainer.style.display = 'block';
        
        const progress = (currentStep / totalSteps) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `Schritt ${currentStep} von ${totalSteps}`;
    }

}

// Beispiel: Fortschritt beim Wechseln der Screens aktualisieren
let currentStep = 1;
const totalSteps = 10; // Anzahl der Auswahlseiten



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


