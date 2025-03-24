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
    if (nextScreenId === 'summaryScreen') {
        stepNumber = 9;
    }
    currentStep = stepNumber;
    updateProgressBar(currentStep, totalSteps);


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
    

          // Prüft, ob screen5 aktiviert wurde und der Schacht "300mm Q3 16 6/4“" ist
          if (nextScreenId === "screen5") {
            if (userSelection['schacht'] === "300mm Q3 16 6/4“") {
            const wzButtons = document.querySelectorAll("#screen5 button:not(.back-btn)");
    
            if (userSelection['deckel'] === "Kugelhahn" || userSelection['deckel'] === "KSR-Ventil" || userSelection['deckel'] === "Schrägsitz") {
                // Blendet die Buttons 3 bis 5 aus
                wzButtons.forEach(button => button.style.display = "inline-block");
                wzButtons.forEach((button, index) => {
                    if (index >= 2) button.style.display = "none";
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

    let stepNumber = parseInt(prevScreenId.replace('screen', ''));
    currentStep = stepNumber;
    updateProgressBar(currentStep, totalSteps);



    // Wenn man zu screen1 zurückkehrt, wird die Überschrift geändert
    if (prevScreenId === "screen1") {
        document.querySelector("header h1").textContent = "Wasserzählerschacht-Konfigurator";
    }

    if (prevScreenId === "screen4") {
        wzButtons.forEach(button => button.style.display = "inline-block");
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

    const eweLogo = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/logo.png";
    const flexorippImage = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/megaripp.png";

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

    doc.setFontSize(10);
    doc.text(`Anfragenummer: ${requestNumber}`, 20, 75);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Sehr geehrte Damen und Herren,", 20, 85);
    doc.text("anbei sende ich Ihnen meine Konfiguration des EWE-Produktes:", 20, 94);
    doc.text("Bitte bieten Sie mir folgende Zusammenstellung an:", 20, 101);

 // "MEGARIPP" fett und kursiv setzen
 doc.setFont("helvetica", "bold"); // Diese Zeile macht den Text fett 
 doc.text("MEGARIPP", 122, 94);

    // Horizontale Linie
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, 108, 190, 108);

    // Auswahlpunkte
    let yOffset = 118;
    let selections = [
        `Ein MegaRipp ${lastSelections.selection1 || "Nicht ausgewählt"}`,
        `mit ${lastSelections.selection4} Wasserzähleranlage(n) ${lastSelections.selection2} / ${lastSelections.selection3}.`,
        `Eingangsseitig:  1 x ${lastSelections.selection5}.`,
        `Ausgangsseitig: ${lastSelections.selection4} x Stutzen ${lastSelections.selection5}.`,
        `Wasserzählerschachtschlüssel 15mm: ${lastSelections.selection7}`
    ];
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text("Zusammenstellung:", 20, yOffset);

    yOffset += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    selections.forEach((item) => {
        doc.text(`- ${item}`, 25, yOffset);
        yOffset += 8;
    });

    // Bild auf Höhe der Zusammenstellung ziehen
    doc.addImage(flexorippImage, 'JPEG', 140, 112, 40, 50);

    // Trennlinie
    doc.setLineWidth(0.5);
    doc.line(20, yOffset + 4, 190, yOffset + 4);

    // Benutzer-Daten einfügen
    yOffset += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text("Benutzerdaten:", 20, yOffset);

    yOffset += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${name}`, 25, yOffset);
    yOffset += 8;
    doc.text(`Straße: ${street}`, 25, yOffset);
    yOffset += 8;
    doc.text(`PLZ: ${postalCode}`, 25, yOffset);
    yOffset += 8;
    doc.text(`Ort: ${city}`, 25, yOffset);
    yOffset += 8;
    doc.text(`E-Mail: ${email}`, 25, yOffset);
    yOffset += 8;
    doc.text(`Telefon: ${phone}`, 25, yOffset);
    yOffset += 8;
    doc.text(`Bemerkungen: ${comments}`, 25, yOffset);

    // Abschluss
    doc.text("Mit freundlichen Grüßen,", 20, yOffset + 20);
    doc.text("[Ihr Name]", 20, yOffset + 30);

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

    
    if (!(currentStep >= 2 && currentStep <= 8)) {
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
let currentStep = 2;
const totalSteps = 8; // Anzahl der Auswahlseiten



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

