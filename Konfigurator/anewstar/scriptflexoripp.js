// scriptflexoripp.js

// 1. Leeres Datenbank-Objekt initialisieren
const datenbank = {
    schaechte: [],
    zubehoer: [],
    verschraubungen: []
};

// 2. Funktion zum Laden EINER CSV-Datei
function ladeCsv(dateiPfad, datenbankSchluessel) {
    return new Promise(resolve => {
        Papa.parse(dateiPfad, {
            download: true,
            header: true, // WICHTIG: Erkennt die Spaltennamen aus der ersten Zeile
            skipEmptyLines: true,
            complete: (results) => {
                datenbank[datenbankSchluessel] = results.data;
                resolve();
            }
        });
    });
}

// 3. Alle CSV-Dateien laden, wenn die Seite startet
document.addEventListener('DOMContentLoaded', async () => {
    // Wir warten, bis alle drei Dateien geladen und verarbeitet sind.
    await Promise.all([
        ladeCsv('images/schaechte.csv', 'schaechte'),
        ladeCsv('images/zubehoer.csv', 'zubehoer'),
        ladeCsv('images/verschraubungen.csv', 'verschraubungen')
    ]);

    console.log("Datenbank erfolgreich geladen:", datenbank);

    // Hier können Sie den Rest Ihrer Initialisierungs-Logik platzieren,
    // z.B. den Event-Listener für den Submit-Button, falls nötig.
});


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

let gefundeneArtikelGlobal = {}; // NEU: Hier speichern wir das Ergebnis

// Mappt die Screen-IDs zu den entsprechenden Vorschaubildern
// === KORRIGIERTE Zuordnung der Bilder zu den Screens ===
const screenImages = {
    screen2: 'images/sensus.jpg',
    screen3: 'images/Rohrdeckungschacht.JPG', // Beispielbild, bitte anpassen
    screen4: 'images/B125_tif.png', // Beispielbild, bitte anpassen
    screen4a: 'images/mitoderohne.png', // Beispielbild, bitte anpassen
    'screen5-mit': 'images/swzanlageohnedruckminderer.JPG', // Wichtig: ID mit Bindestrich in Anführungszeichen
    'screen5-ohne': 'images/swzanlagemitdruckminderer.JPG',// Wichtig: ID mit Bindestrich in Anführungszeichen
    screen6: 'images/4verbinder.jpg',
    screen8: 'images/PERohrGrklein.JPG',
    screen9: 'images/4Verbinder.jpg',
    screen10: 'images/schluessel.jpg' // Beispielbild, bitte anpassen
};



function saveLastSelection(selection, number) {
    if (number >= 1 && number <= 10) {
        lastSelections[`selection${number}`] = selection;
    }
}

/**
 * Findet die passenden Artikelnummern (DEBUG-VERSION mit console.log).
 * Diese Version gibt detaillierte Vergleichsdaten in der Konsole aus.
 * @param {object} selection - Das 'userSelection'-Objekt aus dem Konfigurator.
 * @returns {object} - Ein Objekt mit den gefundenen Artikeln und deren Details.
 */
function findeArtikelnummern(selection) {
    const ergebnis = {
        schacht: null,
        deckel: null,
        verschraubung: null,
        schluessel: null,
        fehler: []
    };

    // =================================================================
    // +++ NEUE HILFSFUNKTION ZUR NORMALISIERUNG VON GEWINDEN +++
    // =================================================================
    const normalisiereGewinde = (gewindeText) => {
        if (!gewindeText) return null;
        let text = gewindeText.trim();
        
        // Ersetze Sonderzeichen
        text = text.replace('¼', '1/4').replace('½', '1/2');
        
        // Entferne ALLE Anführungszeichen
        text = text.replace(/["']/g, '');

        // Entferne alle Leerzeichen
        text = text.replace(/\s/g, '');
        
        return text;
    };
    // =================================================================

        
    // Hilfsfunktionen zum Parsen der Benutzereingaben
    const parseDezimalzahl = (text) => {
        if (!text) return null;
        const match = text.match(/(\d+([,.]\d+)?)/);
        return match ? match[0].replace(',', '.') : null;
    };
    const parseKlasse = (text) => {
        if (!text) return null;
        // Das "i" am Ende ignoriert Groß-/Kleinschreibung (z.B. findet "b125" in "B125")
        const match = text.match(/A15|B125/i); 
        return match ? match[0].toUpperCase() : null; // Gibt immer A15/B125 in Großbuchstaben 
    };
    
    const parseBaulaenge = (text) => {
        if (!text) return null;
        const match = text.match(/\d+\s*mm/);
        return match ? match[0] : null;
    };

    // =================================================================
    // +++ Schachtsuche (Ihre Version, unverändert) +++
    // =================================================================
    console.log(`%c--- Starte Schachtsuche ---`, 'color: orange; font-weight: bold;');
    if (selection.schacht && selection.rohrdeckung && selection.wasserzaehleranlage) {
        const suchBaulaenge = parseBaulaenge(selection.schacht);
        const suchRohrdeckung = parseDezimalzahl(selection.rohrdeckung); 
        const suchAnlage = selection.wasserzaehleranlage.trim().toLowerCase().replace(/[\s/-]/g, '');

        console.log(`Suchkriterien: Baulänge='${suchBaulaenge}', Rohrdeckung='${suchRohrdeckung}', Anlage enthält='${suchAnlage}'`);
        
        if (datenbank.schaechte && datenbank.schaechte.length > 0) {
            console.log(`Durchsuche ${datenbank.schaechte.length} Schacht-Artikel...`);
            ergebnis.schacht = datenbank.schaechte.find((s, index) => {
                if (!s.Baulaenge || !s.Rohrdeckung || !s.Wasserzaehleranlage) return false;

                const dbBaulaenge = s.Baulaenge.trim();
                const dbRohrdeckung = s.Rohrdeckung.trim();
                const dbAnlage = s.Wasserzaehleranlage.trim().toLowerCase().replace(/[\s–/-]/g, '');

                const isMatch = dbBaulaenge.replace(/\s/g, '') === suchBaulaenge.replace(/\s/g, '') &&
                                dbRohrdeckung === suchRohrdeckung &&
                                dbAnlage.includes(suchAnlage);

                if (isMatch) {
                    console.log(`  ==> TREFFER! Schacht gefunden:`, s);
                }
                return isMatch;
            });
        }
        if (!ergebnis.schacht) ergebnis.fehler.push(`Schacht nicht gefunden (Suche: Baulänge='${suchBaulaenge}', Rohrdeckung='${suchRohrdeckung}', Anlage='${suchAnlage}')`);
    } else {
        ergebnis.fehler.push("Schacht-Informationen unvollständig.");
    }
    console.log(`%c--- Schachtsuche beendet ---`, 'color: orange; font-weight: bold;');


// =================================================================
// +++ Deckelsuche (ANGEPASST FÜR SPEZIALFALL "ABDECKHAUBE") +++
// =================================================================
// =================================================================
// +++ Deckelsuche (DIAGNOSE-WERKZEUG) +++
// =================================================================
console.log(`%c--- Starte Deckelsuche ---`, 'color: blue; font-weight: bold;');
if (selection.deckel) {
    const benutzerAuswahlText = selection.deckel.toLowerCase();
    console.log(`Benutzerauswahl (roh): "${selection.deckel}" -> (lowercase): "${benutzerAuswahlText}"`);

    // Schritt 1: Leite die exakten Suchkriterien aus der Benutzerauswahl ab.
    let suchKlasse = parseKlasse(benutzerAuswahlText);
    let suchBefestigung;

    if (benutzerAuswahlText.includes('abdeckhaube')) {
        suchBefestigung = 'lose';
    } else if (benutzerAuswahlText.includes('+ stehbolzen')) {
        suchBefestigung = 'stehbolzen';
    } else if (benutzerAuswahlText.includes('mit su')) {
        suchBefestigung = 'schrauben';
    }

    console.log(`==> Abgeleitete Suchkriterien: Klasse='${suchKlasse}', Befestigung='${suchBefestigung}'`);

    // Schritt 2: Finde den passenden Artikel in der Datenbank.
    if (datenbank.zubehoer && datenbank.zubehoer.length > 0) {
        console.log(`Starte Suche in ${datenbank.zubehoer.length} Zubehör-Artikeln...`);
        ergebnis.deckel = datenbank.zubehoer.find((d, index) => {
            console.log(`--- [Check #${index}] Artikel: ${d.Artikelnummer} ---`);

            if (!d.Kategorie || !d.Befestigung || !d.Klasse) {
                console.log(`  -> FEHLER: Artikel hat unvollständige Daten (Kategorie/Befestigung/Klasse fehlt). Überspringe.`);
                return false;
            }

            const dbKategorie = d.Kategorie.trim().toLowerCase();
            if (dbKategorie !== 'deckel') {
                console.log(`  -> Falsche Kategorie ('${dbKategorie}'). Überspringe.`);
                return false;
            }

            const dbBefestigung = d.Befestigung.trim().toLowerCase();
            const dbKlasse = d.Klasse.trim();
            
            console.log(`  DB-Werte: Klasse='${dbKlasse}', Befestigung='${dbBefestigung}'`);

            let isMatch = false;
            if (suchBefestigung === 'lose') {
                isMatch = (dbBefestigung === 'lose');
                console.log(`  Vergleich (lose): '${dbBefestigung}' === 'lose'? -> ${isMatch}`);
            } else {
                const klasseMatch = (dbKlasse === suchKlasse);
                const befestigungMatch = (dbBefestigung === suchBefestigung);
                isMatch = klasseMatch && befestigungMatch;
                console.log(`  Vergleich (Standard):`);
                console.log(`    Klasse: '${dbKlasse}' === '${suchKlasse}'? -> ${klasseMatch}`);
                console.log(`    Befestigung: '${dbBefestigung}' === '${suchBefestigung}'? -> ${befestigungMatch}`);
                console.log(`    Gesamtergebnis -> ${isMatch}`);
            }
            
            if(isMatch) console.log(`  ==> TREFFER GEFUNDEN BEI CHECK #${index}!`);
            return isMatch;
        });
    }

    // Schritt 3: Fehlerbehandlung.
    if (!ergebnis.deckel) {
        ergebnis.fehler.push(`Deckel für Auswahl "${selection.deckel}" nicht gefunden.`);
    } else {
        console.log(`%c  ==> FINALER TREFFER! Deckel gefunden:`, 'background: #222; color: #bada55', ergebnis.deckel);
    }

} else {
    ergebnis.fehler.push("Kein Deckel ausgewählt.");
}
console.log(`%c--- Deckelsuche beendet ---`, 'color: blue; font-weight: bold;');





    // =================================================================
    // +++ Verschraubungssuche (ANGEPASST AN NEUE CSV-STRUKTUR) +++
    // =================================================================
    console.log(`%c--- Starte Verschraubungssuche ---`, 'color: green; font-weight: bold;');
    if (selection.peVerschraubung && !selection.peVerschraubung.toLowerCase().includes('ohne')) {
        const schachtFuerGewinde = ergebnis.schacht;
        
        if (schachtFuerGewinde && schachtFuerGewinde.Gewinde) {
            const peGroesse = parseDezimalzahl(selection.groesseVerbindung);
            const schachtGewindeNormalisiert = normalisiereGewinde(schachtFuerGewinde.Gewinde);
            const benutzerAuswahlText = selection.peVerschraubung.toLowerCase();
            const anzahl = selection.verbinder && selection.verbinder.toLowerCase().includes('zwei') ? 2 : 1;
            
            let gefundenerArtikel;

            if (datenbank.verschraubungen && datenbank.verschraubungen.length > 0) {
                gefundenerArtikel = datenbank.verschraubungen.find((v, index) => {
                    if (!v.Kategorie || !v.PE_Rohr_d || !v.Gewinde) return false;

                    const dbKategorie = v.Kategorie.trim().toLowerCase();
                    const dbPeRohr = v.PE_Rohr_d.trim();
                    const dbGewindeNormalisiert = normalisiereGewinde(v.Gewinde);

                    // KORREKTUR: Exakter Vergleich, da die CSV jetzt saubere Daten hat.
                    const basisKriterienPassen = dbPeRohr === peGroesse && dbGewindeNormalisiert === schachtGewindeNormalisiert;
                    if (!basisKriterienPassen) {
                        return false;
                    }

                    // Typ-Prüfung (bleibt gleich)
                    const userWantsMuffe = benutzerAuswahlText.includes('muffe');
                    const userWantsStutzen = benutzerAuswahlText.includes('stutzen');
                    
                    if (userWantsMuffe && dbKategorie.includes('muffe')) return true;
                    if (userWantsStutzen && dbKategorie.includes('stutzen')) return true;
                    
                    if (!userWantsMuffe && !userWantsStutzen && dbKategorie.includes('verschraubung')) {
                        if (!v.Material) return false;
                        const materialSuche = benutzerAuswahlText.includes('messing') ? 'messing' : 'polypropylen';
                        return v.Material.trim().toLowerCase().includes(materialSuche);
                    }
                    
                    return false;
                });
            }

            // Ergebnis verarbeiten... (unverändert)
            if (gefundenerArtikel) {
                ergebnis.verschraubung = { ...gefundenerArtikel, menge: anzahl };
            } else {
                ergebnis.fehler.push(`Verschraubung/Muffe/Stutzen nicht gefunden (Suche für PE-Größe='${peGroesse}', Gewinde='${schachtGewindeNormalisiert}')`);
            }

        } else {
            ergebnis.fehler.push("Verschraubungssuche übersprungen, da Schacht oder Schacht-Gewinde nicht gefunden wurde.");
        }
    }
    console.log(`%c--- Verschraubungssuche beendet ---`, 'color: green; font-weight: bold;');



    
    // =================================================================
    // +++ Schlüsselsuche (Ihre Version, unverändert) +++
    // =================================================================
    console.log(`%c--- Starte Schlüsselsuche ---`, 'color: purple; font-weight: bold;');
    if (selection.wasserzaehlerSchluessel && selection.wasserzaehlerSchluessel.toLowerCase() === 'ja') {
        console.log("Suchkriterium: Kategorie='schluessel'");
        if (datenbank.zubehoer && datenbank.zubehoer.length > 0) {
             ergebnis.schluessel = datenbank.zubehoer.find(z => z.Kategorie && z.Kategorie.trim().toLowerCase() === 'schluessel');
             if (ergebnis.schluessel) {
                 console.log(`  ==> TREFFER! Schlüssel gefunden:`, ergebnis.schluessel);
             } else {
                 ergebnis.fehler.push("Schachtschlüssel im Zubehör nicht gefunden.");
             }
        }
    } else {
        console.log("Kein Schlüssel vom Benutzer ausgewählt.");
    }
    console.log(`%c--- Schlüsselsuche beendet ---`, 'color: purple; font-weight: bold;');

    console.log("Funktion findeArtikelnummern beendet. Ergebnis:", ergebnis);
    return ergebnis;
}


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

    // NEU: Höhe des Containers anpassen (mit Verzögerung für die Animation)
    setTimeout(adjustMainContainerHeight, 400);
}

function prevScreen(prevScreenId) {
    const currentScreen = document.querySelector('.screen.active');
    
        // === DIE ENTSCHEIDENDE KORREKTUR ===
    // Prüfen, ob wir uns auf einem regulären Schritt-Screen befinden ODER
    // ob wir vom summaryScreen zurückgehen.
    const isStepBackward = currentScreen && currentScreen.id.startsWith('screen');
    const isComingFromSummary = currentScreen && currentScreen.id === 'summaryScreen';

    if (isStepBackward || isComingFromSummary) { // <-- Bedingung erweitert
        currentStep--; // Zähler verringern (auch beim Zurück vom Summary)
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

        // NEU: Höhe des Containers anpassen (mit Verzögerung für die Animation)
    setTimeout(adjustMainContainerHeight, 400);
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

function adjustMainContainerHeight() {
    const mainContainer = document.querySelector('main');
    const activeScreen = document.querySelector('.screen.active');

    if (mainContainer && activeScreen) {
        // Die tatsächliche Höhe des Inhalts des aktiven Screens ermitteln
        const contentHeight = activeScreen.scrollHeight;

        // Dem main-Container eine feste Höhe zuweisen, die dem Inhalt entspricht
        // Ein kleiner Puffer sorgt für etwas Luft nach unten.
        mainContainer.style.height = (contentHeight + 40) + 'px';
    }
}

// Zeigt die Zusammenfassung der Auswahl an
// ===================================================================
//      FINALE, NEUE updateSummary-Funktion (wie Megaripp)
// ===================================================================
// ERSETZEN Sie Ihre alte updateSummary-Funktion mit dieser.

// ===================================================================
//      FINALE updateSummary-Funktion (MIT ARTIKELNUMMER)
// ===================================================================
function updateSummary() {
    const summaryContainer = document.getElementById('summary');
    summaryContainer.innerHTML = ''; // Alten Inhalt leeren

    // 1. Ihre Artikelsuche-Funktion aufrufen. Das funktioniert ja jetzt perfekt.
    gefundeneArtikel = findeArtikelnummern(userSelection);
    gefundeneArtikelGlobal = findeArtikelnummern(userSelection);

    // 2. Eine wiederverwendbare Hilfsfunktion, um jede Zeile im Ergebnis zu erstellen.
    const erstelleErgebnisZeile = (label, wert, artikel) => {
        const zeile = document.createElement('div');
        zeile.className = 'summary-item-btn'; // Wir nutzen Ihr vorhandenes CSS

        // Standard-Text, falls nichts ausgewählt wurde
        if (!wert) {
            zeile.innerHTML = `<span class="summary-label">${label}:</span> <span class="summary-value" style="color: #888;">Nicht gewählt</span>`;
            return zeile;
        }

        // =======================================================
        // +++ HIER IST DIE ÄNDERUNG: Artikelnummer hinzufügen +++
        // =======================================================
        let artikelDetailsHtml = '';
        // Prüfen, ob ein Artikel UND eine Artikelnummer gefunden wurden
        if (artikel && artikel.Artikelnummer) {
            // Preis nur anzeigen, wenn er auch existiert
            const preisText = artikel.Preis ? ` | Preis: ${artikel.Preis} €` : '';
            
            // HTML für die Artikelnummer und den Preis erstellen
            artikelDetailsHtml = `<span class="summary-articleno">Art.-Nr.: ${artikel.Artikelnummer}${preisText}</span>`;
        }
        // =======================================================
        // +++ ENDE DER ÄNDERUNG +++
        // =======================================================

        // Den finalen HTML-Code für die Zeile zusammensetzen
        zeile.innerHTML = `
            <div>
                <span class="summary-label">${label}:</span>
                <span class="summary-value">${wert}</span>
                ${artikelDetailsHtml} 
            </div>`;
        
        return zeile;
    };

    // 3. Alle konfigurierten Teile nacheinander durchgehen und im Ergebnisbildschirm anzeigen
    
    // Hauptartikel: Schacht
    const schachtBeschreibung = `${userSelection.schacht} | ${userSelection.rohrdeckung} | ${userSelection.wasserzaehleranlage}`;
    summaryContainer.appendChild(erstelleErgebnisZeile('Schacht-Konfiguration', schachtBeschreibung, gefundeneArtikel.schacht));

    // Zubehör: Deckel
    summaryContainer.appendChild(erstelleErgebnisZeile('Deckel', userSelection.deckel, gefundeneArtikel.deckel));

    // Zubehör: Verschraubung (mit spezieller Logik für die Menge)
    let verschraubungText = 'Ohne Verschraubung';
    if (userSelection.peVerschraubung) {
        const anzahl = gefundeneArtikel.verschraubung && gefundeneArtikel.verschraubung.menge === 2 ? 'Zwei Verbinder' : 'Ein Verbinder';
        verschraubungText = `${anzahl} ${userSelection.peVerschraubung} (Größe ${userSelection.groesseVerbindung})`;
    }
    summaryContainer.appendChild(erstelleErgebnisZeile('PE-Verschraubung', verschraubungText, gefundeneArtikel.verschraubung));

    // Zubehör: Schlüssel
    summaryContainer.appendChild(erstelleErgebnisZeile('Schachtschlüssel', userSelection.wasserzaehlerSchluessel, gefundeneArtikel.schluessel));

    // 4. Fehler anzeigen, falls Ihre Suchfunktion welche zurückgibt
    if (gefundeneArtikel.fehler.length > 0) {
        const fehlerBox = document.createElement('div');
        fehlerBox.className = 'summary-error-box'; // Klasse für Styling
        
        let fehlerListeHtml = gefundeneArtikel.fehler.map(fehler => `<li>${fehler}</li>`).join('');
        
        fehlerBox.innerHTML = `
            <strong>Konfiguration unvollständig oder Artikel nicht gefunden:</strong>
            <ul>${fehlerListeHtml}</ul>
        `;
        
        summaryContainer.appendChild(fehlerBox);
    }
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
    const flexorippImage = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/flexoripp.png";
    
    // Generiere die Anfragenummer
    const requestNumber = generateRequestNumber();

    // Holen der Benutzerdaten aus dem Formular
    const firstName = document.getElementById('firstName').value; // NEU
    const lastName = document.getElementById('lastName').value;   // NEU (ehemals 'name')
    const company = document.getElementById('company').value || "Nicht angegeben"; // NEU
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
 // --- NEUE LOGIK FÜR DIE ZUSAMMENSTELLUNG ---
    let yOffset = 118;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text("Ihre Konfiguration:", 20, yOffset);
    yOffset += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // =======================================================
    // +++ HIER IST DIE EINFACHE ÄNDERUNG +++
    // =======================================================
    // Eine Hilfsfunktion, die Text bei einer festen Breite umbricht.
    const addZeileMitArtikel = (label, beschreibung, artikel) => {
        if (!beschreibung) return;

        const startXLabel = 25;
        const startXText = 65;
        const maxTextBreite = 90; // Feste Breite, lässt rechts Platz für das Bild (160 - 65 - Puffer)

        doc.setFont("helvetica", "bold");
        doc.text(label, startXLabel, yOffset);
        doc.setFont("helvetica", "normal");

        // Text umbrechen und ausgeben
        const beschreibungZeilen = doc.splitTextToSize(beschreibung, maxTextBreite);
        doc.text(beschreibungZeilen, startXText, yOffset);

        // y-Position für die nächste Zeile berechnen
        let naechsteYPos = yOffset + (beschreibungZeilen.length * 5); // ca. 5 Einheiten pro Zeile

        if (artikel && artikel.Artikelnummer) {
            const preisText = artikel.Preis ? ` | Preis: ${artikel.Preis} €` : '';
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`Art.-Nr.: ${artikel.Artikelnummer}${preisText}`, startXText, naechsteYPos);
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            naechsteYPos += 4; // Extra Platz für die Artikelnummer
        }
        
        // Den globalen yOffset aktualisieren
        yOffset = naechsteYPos + 4;
    };
    // =======================================================

    // Jetzt die Zeilen erstellen
    addZeileMitArtikel("Schacht:", `${userSelection.schacht} | ${userSelection.rohrdeckung} | ${userSelection.wasserzaehleranlage}`, gefundeneArtikelGlobal.schacht);
    addZeileMitArtikel("Deckel:", userSelection.deckel, gefundeneArtikelGlobal.deckel);
    

let verschraubungText = 'Ohne Verschraubung';
if (userSelection.peVerschraubung) {
    const anzahl = gefundeneArtikelGlobal.verschraubung && gefundeneArtikelGlobal.verschraubung.menge === 2 ? '2 x' : '1 x';
    
    // =======================================================
    // +++ HIER IST DIE ÄNDERUNG FÜR DIE ÖSTERREICH-REGEL +++
    // =======================================================
    let schachtGewinde = '';
    // Prüfe zuerst, ob überhaupt ein Schacht gefunden wurde
    if (gefundeneArtikelGlobal.schacht) {
        // Prüfe, ob die Benutzerauswahl für den Schacht "Österr." enthält
        if (userSelection.schacht.includes('Österr')) {
            // Wenn ja, setze das Gewinde für die Anzeige fest auf 1"
            schachtGewinde = '1"';
        } else {
            // Wenn nein, nimm das normale Gewinde aus der Datenbank
            schachtGewinde = gefundeneArtikelGlobal.schacht.Gewinde;
        }
    }
    // =======================================================
    
    // Baue den Text mit dem (potenziell überschriebenen) Gewinde zusammen.
    verschraubungText = `${anzahl} ${userSelection.peVerschraubung} (${userSelection.groesseVerbindung} x ${schachtGewinde})`;
}

    addZeileMitArtikel("Anschluss:", verschraubungText, gefundeneArtikelGlobal.verschraubung);
    addZeileMitArtikel("Schlüssel:", userSelection.wasserzaehlerSchluessel, gefundeneArtikelGlobal.schluessel);

    // Bild an seiner festen Position hinzufügen
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
    
    // NEU: Vorname und Nachname
    doc.text("Name:", 25, yOffset);
    doc.text(`${firstName} ${lastName}`, 60, yOffset);
    yOffset += 8;

    // NEU: Firma
    doc.text("Firma:", 25, yOffset);
    doc.text(company, 60, yOffset);
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
    // ALT:
    // const pdfData = doc.output('blob');
    // const url = URL.createObjectURL(pdfData);
    // window.open(url);

    // NEU:
    // 1. Den gewünschten Dateinamen zusammenbauen.
    const fileName = `Anfrage Flexoripp ${requestNumber}.pdf`;

    // 2. Die save()-Methode aufrufen, um den Download mit dem neuen Namen zu starten.
    doc.save(fileName);
    // =======================================================
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
// ERSETZEN Sie Ihre aktuelle openInfoScreen-Funktion mit dieser:
function openInfoScreen(imageElement) {
    const pdfPath = imageElement.getAttribute("data-pdf");
    if (pdfPath) {
        window.open(pdfPath, "_blank");
    }


    // Den aktuellen Screen merken
    const currentScreen = document.querySelector('.screen.active');
    if (currentScreen) {
        lastActiveScreenId = currentScreen.id;
    }

    // PDF in den iframe laden und Info-Screen anzeigen
    document.getElementById('infoScreenPdf').src = pdfPath;
    nextScreen('infoScreen'); // Nutzt unsere bestehende Animations-Logik

        // NEU: Höhe des Containers anpassen (mit Verzögerung für die Animation)
    setTimeout(adjustMainContainerHeight, 400);
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

        // NEU: Höhe des Containers anpassen (mit Verzögerung für die Animation)
    setTimeout(adjustMainContainerHeight, 400);
}




// === NEU: Funktionen für die visuelle Navigationsleiste ===

function addVisualNavStep(screenId, step, selectionText) {
    const navContainer = document.getElementById('visual-nav-container');
    const imageSrc = screenImages[screenId];
    const tooltipElement = document.getElementById('custom-tooltip');

    // Diese Zeile prüft, ob es sich um ein Gerät mit Touchscreen handelt.
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (imageSrc && selectionText) {
        const navImage = document.createElement('img');
        navImage.src = imageSrc;
        navImage.className = 'visual-nav-step';
        navImage.dataset.targetScreen = screenId;
        navImage.dataset.stepNumber = step;

        // =================================================================
        // HIER IST DIE ENTSCHEIDENDE ÄNDERUNG:
        // Der Code für den Tooltip wird nur ausgeführt, wenn es KEIN Touch-Gerät ist.
        // Dadurch wird das "Anklicken" des Tooltips auf dem Handy verhindert.
        // =================================================================
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

// FÜGE DIESE FEHLENDE FUNKTION HINZU
function removeLastVisualNavStep() {
    const navContainer = document.getElementById('visual-nav-container');
    // Prüft, ob überhaupt ein Bild zum Entfernen da ist
    if (navContainer.lastChild) {
        navContainer.removeChild(navContainer.lastChild);
    }
}



// =================================================================
// =================================================================
// +++ FINALE, GEHÄRTETE jumpToScreenFromNav-Funktion +++
// =================================================================
function jumpToScreenFromNav(event) {
        const tooltipElement = document.getElementById('custom-tooltip');
    if (tooltipElement) {
        tooltipElement.style.display = 'none';
        tooltipElement.style.opacity = '0';
    }
    const targetElement = event.currentTarget;
    const targetScreenId = targetElement.dataset.targetScreen;
    const targetStep = parseInt(targetElement.dataset.stepNumber);
    const currentScreen = document.querySelector('.screen.active');

    if (currentScreen.id === targetScreenId) {
        return;
    }

    // --- Logik zum Zurücksetzen der Auswahlen (diese ist korrekt) ---
    for (let i = targetStep + 1; i <= 10; i++) {
        const keyMap = {
            2: 'schacht', 3: 'rohrdeckung', 4: 'deckel', 5: 'wasserzaehleranlage',
            6: 'verbinder', 7: 'peVerschraubung', 8: 'groesseVerbindung', 9: 'verbinder',
            10: 'wasserzaehlerSchluessel'
        };
        
        const selectionKey = keyMap[i];
        if (selectionKey && userSelection[selectionKey]) {
            userSelection[selectionKey] = '';
        }
        if (lastSelections[`selection${i}`]) {
            lastSelections[`selection${i}`] = '';
        }
    }
    userSelection.peGroesse = '';
    userSelection.peVerbindung = '';

    // --- UI-Logik zum Entfernen der Bilder und Aktualisieren der Leiste ---
    const navContainer = document.getElementById('visual-nav-container');

    // =======================================================
    // +++ HIER IST DIE KORREKTUR +++
    // =======================================================
    // Diese Schleife prüft jetzt sicher, ob .dataset existiert, bevor sie darauf zugreift.
    while (navContainer.lastChild) {
        const lastNode = navContainer.lastChild;
        // Wir prüfen, ob der Knoten ein Element ist UND ein dataset mit stepNumber hat.
        if (lastNode.nodeType === 1 && lastNode.dataset && parseInt(lastNode.dataset.stepNumber) >= targetStep) {
            navContainer.removeChild(lastNode);
        } else {
            // Wenn der Knoten kein passendes Bild ist (z.B. ein Textknoten),
            // entfernen wir ihn trotzdem, um die Schleife nicht unendlich laufen zu lassen,
            // oder wir brechen ab, wenn wir auf einen unerwarteten Knoten stoßen.
            // In diesem Fall ist ein Abbruch sicherer.
            break; 
        }
    }
    // =======================================================
    
    currentStep = targetStep;
    updateProgressBar(currentStep, totalSteps);

        // NEU: Höhe des Containers anpassen
    setTimeout(adjustMainContainerHeight, 400);

    // --- Screen-Wechsel-Logik (unverändert) ---
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
    
    // Info-Bilder: Klick-Handler, Info-Badge + Tooltip
    const infoImages = document.querySelectorAll('.info-image');
    infoImages.forEach(image => {
        image.addEventListener('click', () => openInfoScreen(image));

        // Alte Pulse-Animation entfernen (ersetzt durch CSS glowPulse)
        image.classList.remove('pulse');

        // Info-Badge ("i") in den Container einfuegen
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
            'Österreich-Variante, DN 25',
            'Standard für größere Durchflussmengen, DN 32',
            'Österreich-Norm, 175mm Baulänge'
        ],
        'screen3': [
            'Flache Verlegung, geringer Erdaushub',
            'Standard-Einbautiefe',
            'Nur für DIBt-Zulassung verfügbar',
            'Mittlere Einbautiefe',
            'Tiefere Verlegung, mehr Frostschutz',
            'Maximale Einbautiefe'
        ],
        'screen4': [
            'Klasse A15, für Grünflächen und Gehwege',
            'Klasse A15, mit Stehbolzen-Sicherung',
            'Klasse B125 (12,5t), für Einfahrten und Parkplätze',
            'Klasse B125, mit Stehbolzen-Sicherung',
            'Leichte Abdeckung, max. 200 kg Belastung'
        ],
        'screen4a': [
            'Standard — ohne zusätzliche Druckregulierung',
            'Mit integriertem Druckminderer zur Druckbegrenzung'
        ],
        'screen5-mit': [
            'Beidseitig Kugelhahn — voller Durchgang',
            'Eingang Kugelhahn, Ausgang KSR — mit Rückflussschutz',
            'Kugelhahn + Kegelmembran-RV + Kugelhahn',
            'Beidseitig Freistromventil',
            'Eingang Freistrom, Ausgang KSR — mit Rückflussschutz',
            'Freistrom + Kegelmembran-RV + Freistrom'
        ],
        'screen5-ohne': [
            'Freistrom + Druckminderer + KSR',
            'Freistrom + Druckminderer + Freistrom',
            'Kugelhahn + Druckminderer + Kugelhahn',
            'Kugelhahn + Druckminderer + KSR'
        ],
        'screen6': [
            'Bleifreies Si-Messing, trinkwasserzugelassen',
            'Polypropylen-Verschraubung, kostengünstig',
            'Für Stumpfschweißung an PE-Rohr',
            'Elektroschweißmuffe für PE-Verbindung'
        ],
        'screen8': [
            'Standard Einzelanschluss, DN 25',
            'Größere Durchflussmenge, DN 32',
            'Mehrfamilienhaus/Gewerbe, DN 40',
            'Großanschluss, DN 50'
        ],
        'screen9': [
            'Standardanschluss — ein PE-Rohr',
            'Doppelter Ausgang — zwei PE-Rohre'
        ],
        'screen10': [
            'Kombischlüssel für Schachtabdeckung',
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

    // In Ihrem DOMContentLoaded-Listener
const duoViewerBtn = document.getElementById('closeToDuoViewerBtn');
if (duoViewerBtn) {
    duoViewerBtn.addEventListener('click', () => {
        window.close();
    });
}

        // NEU: Höhe direkt beim ersten Laden der Seite anpassen
    setTimeout(adjustMainContainerHeight, 50);
});


/* ================================================== */
/* +++ NEU: Logik für den Inaktivitäts-Timer +++ */
/* ================================================== */

/* ================================================== */
/* +++ NEU (Version 2): Logik für den Inaktivitäts-Timer mit dynamischer Positionierung +++ */
/* ================================================== */

/* ================================================== */
/* +++ NEU (Version 3): Logik für den Inaktivitäts-Timer, positioniert im aktiven Screen +++ */
/* ================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // --- Konfiguration ---
    const INACTIVITY_SECONDS = 15;
    const INACTIVITY_TIME_MS = INACTIVITY_SECONDS * 1000;

    // --- Elemente aus dem HTML holen ---
    const hintContainer = document.getElementById('inactivity-hint-container');
    const hintVideo = document.getElementById('inactivity-video');
    
    if (!hintContainer || !hintVideo) {
        console.log("Inaktivitäts-Video-Container nicht gefunden. Feature ist deaktiviert.");
        return;
    }

    let inactivityTimer;

    // --- Funktionen ---

    // Funktion, die das Video anzeigt und im aktiven Screen platziert
// Funktion, die das Video anzeigt, positioniert und startet (JETZT MIT ZUFALLS-LOGIK)
function showHintVideo() {
    const activeScreen = document.querySelector('.screen.active');

    // Zeige das Video nur an, wenn wir auf einem Konfigurations-Screen sind
    if (activeScreen && activeScreen.id.startsWith('screen')) {
        console.log(`Benutzer ist ${INACTIVITY_SECONDS}s inaktiv. Zeige Hinweis-Video.`);

        // =======================================================
        // +++ HIER IST DIE NEUE ZUFALLS-LOGIK +++
        // =======================================================
        
        // 1. Liste der verfügbaren Videos. Passen Sie die Dateinamen hier an!
        const videoQuellen = [
            'images/ausseninnenhilft.mp4',
            'images/tipp_video_2.mp4'  // Ersetzen Sie dies mit dem Namen Ihres zweiten Videos
        ];

        // 2. Wähle einen zufälligen Index aus der Liste (0 für das erste, 1 für das zweite)
        const zufallsIndex = Math.floor(Math.random() * videoQuellen.length);
        
        // 3. Hole die zufällig ausgewählte Video-URL
        const zufallsVideo = videoQuellen[zufallsIndex];
        
        console.log(`Spiele zufälliges Video ab: ${zufallsVideo}`);

        // 4. Setze die Quelle des Video-Elements auf das zufällige Video
        hintVideo.src = zufallsVideo;

        // =======================================================
        
        // Der Rest der Funktion bleibt gleich:
        activeScreen.appendChild(hintContainer);
        hintContainer.style.display = 'block';
        hintVideo.currentTime = 0;
        hintVideo.play().catch(e => console.error("Autoplay für Hinweis-Video blockiert:", e));
    }
}


    // Funktion, die den Timer zurücksetzt und das Video versteckt
    function resetInactivity() {
        if (hintContainer.style.display === 'block') {
            hintContainer.style.display = 'none';
            hintVideo.pause();
        }
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(showHintVideo, INACTIVITY_TIME_MS);
    }

    // --- Event-Listener für Benutzeraktivität (unverändert) ---
    window.addEventListener('mousemove', resetInactivity, { passive: true });
    window.addEventListener('mousedown', resetInactivity, { passive: true });
    window.addEventListener('keypress', resetInactivity, { passive: true });
    window.addEventListener('scroll', resetInactivity, { passive: true });
    window.addEventListener('touchstart', resetInactivity, { passive: true });

    // --- Initialer Start ---
    resetInactivity();
});
