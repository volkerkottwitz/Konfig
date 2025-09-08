let csvGeladen = false;
let pdfGerendert = false;
let wurdeBereitsInitialGerendert = false;


function ladebildschirmPruefen() {
  if (csvGeladen && pdfGerendert) {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('pdfViewer').style.display = 'block';
  }
}

// === 📱 GERÄTE-ERKENNUNG ===
function isMobileDevice() {
  return window.innerWidth <= 768 || 
         /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// === 🛒 Artikel-Daten aus CSV laden ===
const artikelMap = new Map();

fetch("https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/images/ewe-daten-2025.csv")
  .then(res => res.arrayBuffer())
  .then(buffer => {
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(buffer);

    const rows = text.split('\n').slice(1);
    for (let row of rows) {
      const [
        MNR, KURZTEXT1, KURZTEXT2, GTIN, INTRASTATNUMMER,
        MENGENEINHEIT, PE, BRUTTOPREIS, END_PREIS, TZ,
        GEWICHT, B, H, T
      ] = row.split(';');

      if (MNR && (KURZTEXT1 || KURZTEXT2)) {
        artikelMap.set(MNR.trim(), {
          KURZTEXT1: KURZTEXT1?.trim() ?? "",
          KURZTEXT2: KURZTEXT2?.trim() ?? "",
          BRUTTOPREIS: BRUTTOPREIS?.trim() ?? "0"
        });
      }
    }

    window.artikelMap = artikelMap;
    csvGeladen = true;
    ladebildschirmPruefen();
  })
  .catch(err => console.error("CSV-Fehler:", err));

// === 📄 PDF.js vorbereiten ===
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// === 🔧 Variablen für Viewer-Funktionalität ===
let pdfDoc = null, currentPage = 1, zoomFactor = 1.0;
let searchText = '', secondSearchText = '', matchPages = new Set();
let aktuellerArtikelText = "";
const merkliste = []; // Geändert von warenkorb zu merkliste
// ===================================================================
//   FUNKTION ZUR AKTUALISIERUNG DES MERKLISTEN-ZAHLEN-BADGES
// ===================================================================
function updateMerklisteIcon() {
  // 1. Finde den Merkliste-Button im HTML
  const merklisteBtn = document.querySelector('a[onclick*="openMerkliste"]');
  
  // 2. Prüfe, ob der Button gefunden wurde
  if (merklisteBtn) {
    // 3. Ermittle die Anzahl der verschiedenen Artikel in der Merkliste
    const anzahl = merkliste.length;

    // 4. Entscheide, was zu tun ist
    if (anzahl > 0) {
      // WENN ARTIKEL VORHANDEN SIND:
      // Setze die Anzahl in das 'data-count'-Attribut des Buttons.
      // Das CSS wird diesen Wert auslesen und anzeigen.
      merklisteBtn.dataset.count = anzahl;
      
      // Füge die CSS-Klasse '.has-items' hinzu.
      // Das macht den Badge (das ::after-Element) sichtbar.
      merklisteBtn.classList.add('has-items');
    } else {
      // WENN KEINE ARTIKEL VORHANDEN SIND:
      // Entferne die CSS-Klasse, um den Badge wieder zu verstecken.
      merklisteBtn.classList.remove('has-items');
    }
  }
}



const merklisteInhalt = document.getElementById("merklisteInhalt");

// PDF-URL
// === const url = 'https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/pdf/ewe-preisliste-2025.pdf'; ===

// === 📥 PDF laden & initial anzeigen ===
// ===pdfjsLib.getDocument(url).promise.then(pdf => {
// ===  pdfDoc = pdf;
// ===  renderPage(currentPage);
// ===  updateNavigation();
// === }).catch(err => alert('Fehler beim Laden: ' + err.message));

function loadAndRenderPdf(pdfPath) {
  // Reset für die Suche und Anzeige
  document.getElementById('searchInfo').textContent = '';
  document.getElementById('pdfViewer').innerHTML = '<div class="loading">Lade PDF...</div>';
  matchPages.clear();
  currentPage = 1;

  pdfjsLib.getDocument(pdfPath).promise.then(pdf => {
    pdfDoc = pdf;
    renderPage(currentPage);
    updateNavigation();
    updateHelpers(); 
  }).catch(err => {
    alert('Fehler beim Laden des PDFs: ' + err.message);
    document.getElementById('pdfViewer').innerHTML = '<h2>Fehler beim Laden des Dokuments.</h2>';
  });
}


// === 🖼️ Seite rendern ===
function renderPage(pageNum) {
  pdfDoc.getPage(pageNum).then(page => {
    const viewport = page.getViewport({ scale: 2.0 * zoomFactor });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    page.render({ canvasContext: ctx, viewport }).promise.then(() => {
      const viewer = document.getElementById('pdfViewer');
      viewer.innerHTML = '';

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.id = 'canvasWrapper';
      wrapper.appendChild(canvas);
      viewer.appendChild(wrapper);

      clearHighlights();
      highlightMatches(page, wrapper, viewport);

      document.getElementById('page-info').textContent = `📄 Seite ${pageNum} / ${pdfDoc.numPages}`;
      updateNavigation();

      if (!wurdeBereitsInitialGerendert) {
        pdfGerendert = true;
        ladebildschirmPruefen();
        wurdeBereitsInitialGerendert = true;
      }
    });
  });
}

// === 🧹 Treffer-Hervorhebungen entfernen ===
function clearHighlights() {
  document.querySelectorAll('.highlight-box').forEach(el => el.remove());
}

// === 🔍 Volltextsuche durchführen ===
// === 🔍 Volltextsuche durchführen (ANGEPASSTE VERSION) ===
function searchPDF() {
  document.getElementById('loadingSpinnerOverlay').style.display = 'flex';
  searchText = normalize(document.getElementById('searchBox').value);
  secondSearchText = normalize(document.getElementById('searchBox2').value);

  // NEU: Aktiven Suchoperator auslesen
  const activeOperatorBtn = document.querySelector('.operator-btn.active');
  const searchOperator = activeOperatorBtn ? activeOperatorBtn.dataset.op : 'und'; // 'und' als sicherer Standard

// NEUER Block mit Nutzermeldung
if (!searchText && !secondSearchText) {
  const searchInfo = document.getElementById('searchInfo');
  
  // Nachricht anzeigen
  searchInfo.textContent = '⚠️ Bitte geben Sie zuerst einen Suchbegriff ein.';
  searchInfo.style.color = '#dc3545'; // Eine auffällige Farbe (Rot)

  // Lade-Spinner ausblenden
  document.getElementById('loadingSpinnerOverlay').style.display = 'none';
  
  // Nachricht nach 3 Sekunden wieder zurücksetzen
  setTimeout(() => {
    searchInfo.textContent = ''; // Text leeren
    searchInfo.style.color = ''; // Farbe zurücksetzen
  }, 3000);

  return; // Suche abbrechen
}

  matchPages.clear();
  let totalMatches = 0;

  const tasks = [];
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    tasks.push(pdfDoc.getPage(p).then(page =>
      page.getTextContent().then(tc => {
        const pageText = normalize(tc.items.map(i => i.str).join(' '));
        
        const hasFirstTerm = pageText.includes(searchText);
        const hasSecondTerm = secondSearchText && pageText.includes(secondSearchText);

        let isMatch = false;

        // NEUE LOGIK basierend auf dem ausgewählten Operator
        if (!secondSearchText) {
            // Wenn nur das erste Feld ausgefüllt ist, wird immer nur danach gesucht.
            isMatch = hasFirstTerm;
        } else {
            switch (searchOperator) {
                case 'und':
                    isMatch = hasFirstTerm && hasSecondTerm;
                    break;
                case 'oder':
                    isMatch = hasFirstTerm || hasSecondTerm;
                    break;
                case 'ohne':
                    isMatch = hasFirstTerm && !hasSecondTerm;
                    break;
            }
        }

        if (isMatch) {
          matchPages.add(p);
          // Die Zählung der Treffer bleibt zur Vereinfachung so,
          // da die Seitenzahl die wichtigere Information ist.
          totalMatches += countMatches(pageText, searchText, secondSearchText);
        }
      })
    ));
  }

  Promise.all(tasks).then(() => {
    if (matchPages.size > 0) {
        document.getElementById('searchInfo').textContent = `🔍 ${matchPages.size} Seite(n) gefunden.`;
        currentPage = [...matchPages].sort((a, b) => a - b)[0];
        renderPage(currentPage);
    } else {
        document.getElementById('searchInfo').textContent = '🔍 Keine Treffer für Ihre Suche gefunden.';
    }
    document.getElementById('loadingSpinnerOverlay').style.display = 'none';
    updateNavigation();
    updateCurrentMatchInfo();
    updateHelpers();
  });
}

// === 🔡 Hilfsfunktionen ===
function normalize(text) {
  return text.replace(/[\u201C\u201D\u201E\u201F]/g, '"')
             .replace(/[\u2018\u2019]/g, "'")
             .toLowerCase();
}

function countMatches(txt, s1, s2) {
  const c1 = (txt.match(new RegExp(s1, 'g')) || []).length;
  const c2 = s2 ? (txt.match(new RegExp(s2, 'g')) || []).length : c1;
  return s2 ? Math.min(c1, c2) : c1;
}

// === 📏 RESPONSIVE MARKIERUNGSGRÖSSENWERTE MIT ZOOM-ANPASSUNG ===
function getMarkierungsWerte() {
  if (isMobileDevice()) {
    return { 
      yOffset: -2, 
      widthAdd: 0, 
      heightAdd: -10,
      zeilenYOffset: -17,
      zeilenHeight: 18
    };
  } else {
    // Desktop: Markierungen skalieren mit Zoomfaktor
    const baseWidthAdd = 42;
    const baseHeightAdd = 1;
    const baseYOffset = -5;
    
    // Skalierung basierend auf Zoomfaktor
    const scaleFactor = Math.max(0.5, Math.min(3.0, zoomFactor)); // Begrenzt zwischen 0.5x und 3.0x
    
    return { 
      yOffset: baseYOffset * scaleFactor, 
      widthAdd: baseWidthAdd * scaleFactor, 
      heightAdd: baseHeightAdd * scaleFactor,
      zeilenYOffset: -17 * scaleFactor,
      zeilenHeight: 18 * scaleFactor
    };
  }
}

// === 🎯 VERBESSERTE HIGHLIGHT-FUNKTION MIT RESPONSIVE MARKIERUNGEN (KORRIGIERT) ===
function highlightMatches(page, container, viewport) {
  const canvas = container.querySelector('canvas');
  
  const baseScaleX = canvas.offsetWidth / canvas.width;
  const baseScaleY = canvas.offsetHeight / canvas.height;
  
  const scaleX = baseScaleX;
  const scaleY = baseScaleY;

  page.getTextContent().then(tc => {
    const items = tc.items;

    const lines = {};
    items.forEach(item => {
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const y = Math.round(tx[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push({ ...item, tx, y });
    });

    const searchNorm = normalize(searchText);
    const search2Norm = normalize(secondSearchText);

    const zeilenMitArtikelnummer = new Set();
    const markierungsWerte = getMarkierungsWerte();

    Object.values(lines).forEach(lineItems => {
      const lineText = lineItems.map(i => i.str).join(' ');
      const lineTextNorm = normalize(lineText);

      const hit1 = searchNorm && lineTextNorm.includes(searchNorm);
      const hit2 = search2Norm && lineTextNorm.includes(search2Norm);

      let bgColor = 'rgba(0, 150, 255, 0.3)';
      let ganzeZeileMarkieren = false;

      if (hit1 && hit2) {
        bgColor = 'rgba(18, 189, 18, 0.15)';
        ganzeZeileMarkieren = true;
      } else if (hit1) {
        bgColor = 'rgba(255, 165, 0, 0.2)';
        ganzeZeileMarkieren = true;
      } else if (hit2) {
        bgColor = 'rgba(74, 235, 227, 0.2)';
        ganzeZeileMarkieren = true;
      }

      const regex = /(?:^|[^\#\w])((?:0392-[A-Z]{5,10}|[0-9]{7}-(?:DIBT|wrs)|0392-[a-zA-Z0-9]{3,}|[0-9]{7}(?:-[a-zA-Z0-9]{2,})?)(\*{1,2})?)/g;
      let match;
      while ((match = regex.exec(lineText)) !== null) {
        const artikelnummer = match[1];
        const matchStart = match.index + match[0].indexOf(artikelnummer);
        zeilenMitArtikelnummer.add(lineItems[0].y);

        const position = calculatePreciseArticlePosition(lineItems, artikelnummer, matchStart, scaleX, scaleY);
        
        if (!position) continue;

        let x, y, width, height;
        if (ganzeZeileMarkieren) {
          const first = lineItems[0];
          x = 0;
          y = (first.tx[5] - position.height - 5) * scaleY;
          width = canvas.offsetWidth;
          height = (position.height + 9) * scaleY;
        } else {
          const zoomOffset = isMobileDevice() ? 0 : (zoomFactor - 1.0) * - 580;
          x = position.x + zoomOffset;
          y = position.y + markierungsWerte.yOffset;
          let extraBreite = 0;
          if (artikelnummer.includes('DIBT') || artikelnummer.startsWith('0392-')) {
            const baseExtraBreite = 20;
            extraBreite = isMobileDevice() ? baseExtraBreite : baseExtraBreite * Math.max(0.5, Math.min(3.0, zoomFactor));
          }
          width = position.width + markierungsWerte.widthAdd + extraBreite;
          height = position.height + markierungsWerte.heightAdd;
        }

        const klickDiv = document.createElement('div');
        Object.assign(klickDiv.style, {
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: bgColor,
          cursor: 'pointer',
          border: '1px solid rgba(0, 161, 225, 0.3)',
          borderRadius: '2px'
        });

        // =======================================================
        // HIER IST DIE ERSTE KORREKTUR
        klickDiv.setAttribute('data-tooltip', `Artikel ${artikelnummer} anzeigen`);
        // =======================================================

        klickDiv.addEventListener('click', () => {
          const artikel = artikelMap.get(artikelnummer);
          if (artikel) {
            openArticleDialog(artikelnummer, artikel, 'add');
          } else {
            console.log("❌ Artikel NICHT in artikelMap:", artikelnummer);
            const pseudoArtikel = {
              nummer: artikelnummer,
              name: lineText,
              preis: 0
            };
            openArticleDialog(artikelnummer, pseudoArtikel, 'add');
          }
        });

        container.appendChild(klickDiv);
      }
    });

    Object.values(lines).forEach(lineItems => {
      const yKey = lineItems[0].y;
      if (zeilenMitArtikelnummer.has(yKey)) return;

      const lineText = lineItems.map(i => i.str).join(' ');
      const lineTextNorm = normalize(lineText);

      const hit1 = searchNorm && lineTextNorm.includes(searchNorm);
      const hit2 = search2Norm && lineTextNorm.includes(search2Norm);

      if (!(hit1 || hit2)) return;

      let bgColor;
      if (hit1 && hit2) {
        bgColor = 'rgba(18, 189, 18, 0.15)';
      } else if (hit1) {
        bgColor = 'rgba(255, 165, 0, 0.2)';
      } else {
        bgColor = 'rgba(74, 235, 227, 0.2)';
      }

      const x = 0;
      const minY = Math.min(...lineItems.map(i => i.tx[5]));
      const maxY = Math.max(...lineItems.map(i => i.tx[5]));
      const textHeight = maxY - minY;
      
      const basePadding = 24;
      const padding = isMobileDevice() ? basePadding : basePadding * Math.max(0.5, Math.min(3.0, zoomFactor));

      const y = (minY + markierungsWerte.zeilenYOffset) * scaleY-1;
      const height = (textHeight + padding) * scaleY;
      const width = canvas.offsetWidth;

      const div = document.createElement('div');
      Object.assign(div.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: bgColor,
        cursor: 'pointer',
        border: '1px solid rgba(0, 161, 225, 0.3)',
        borderRadius: '2px'
      });

      // =======================================================
      // HIER IST DIE ZWEITE KORREKTUR
      div.setAttribute('data-tooltip', `Keine Artikelnummer gefunden`);
      // =======================================================

      div.addEventListener('click', () => {
        if (isMobileDevice()) {
          openNoArticleDialog(lineText);
        } else {
          zeigeArtikelDialog(lineText);
        }
      });

      container.appendChild(div);
    });
  });
}

// === 🎯 PRÄZISE ARTIKELNUMMERN-POSITIONSBERECHNUNG MIT ZOOM-ANPASSUNG ===
function calculatePreciseArticlePosition(lineItems, artikelnummer, matchStart, scaleX, scaleY) {
  try {
    // Finde das Text-Item, das die Artikelnummer enthält
    let cumulativeText = '';
    let targetItem = null;
    let charOffset = 0;

    for (let item of lineItems) {
      const itemStart = cumulativeText.length;
      const itemEnd = itemStart + item.str.length;
      
      if (matchStart >= itemStart && matchStart < itemEnd) {
        targetItem = item;
        charOffset = matchStart - itemStart;
        break;
      }
      
      cumulativeText += item.str + ' ';
    }

    if (!targetItem) return null;

    // Berechne die durchschnittliche Zeichenbreite für dieses Text-Item
    const avgCharWidth = (targetItem.width || targetItem.tx[0] || 10) / Math.max(targetItem.str.length, 1);
    
    // Berechne Position und Größe (Zoom ist bereits im viewport enthalten)
    const baseStartX = targetItem.tx[4] + (charOffset * avgCharWidth);
    const baseStartY = targetItem.tx[5] - targetItem.height - 2;
    const baseWidth = artikelnummer.length * avgCharWidth;
    const baseHeight = targetItem.height + 4;
    
    const startX = baseStartX * scaleX;
    const startY = baseStartY * scaleY;
    const width = baseWidth * scaleX;
    const height = baseHeight * scaleY;

    return {
      x: Math.max(0, startX),
      y: Math.max(0, startY),
      width: Math.max(20, width),
      height: Math.max(15, height)
    };
  } catch (error) {
    console.warn('Fehler bei Positionsberechnung:', error);
    // Fallback zur ursprünglichen Methode (Zoom ist bereits im viewport enthalten)
    const firstItem = lineItems[0];
    return {
      x: (firstItem.tx[4] - 3) * scaleX,
      y: (firstItem.tx[5] - firstItem.height - 9) * scaleY,
      width: artikelnummer.length * 11 * scaleX,
      height: (firstItem.height + 12) * scaleY
    };
  }
}

// === 🆕 DIALOG-SYSTEM MIT GERÄTE-ERKENNUNG ===

// Artikel-Dialog öffnen (Mobile: neues Fenster, Desktop: Modal)
function openArticleDialog(artikelnummer, artikel, dialogType = 'add') {
  if (isMobileDevice()) {
    openArticleDialogMobile(artikelnummer, artikel, dialogType);
  } else {
    openArticleDialogDesktop(artikelnummer, artikel, dialogType);
  }
}

// Mobile: Neues Fenster
function openArticleDialogMobile(artikelnummer, artikel, dialogType) {
  const vorhandenerArtikel = merkliste.find(item => item.nummer === artikelnummer);
  
  if (vorhandenerArtikel && dialogType === 'add') {
    dialogType = 'existing';
  }

  // Artikel-Daten vorbereiten
  const kompletterText = (
    (artikel.KURZTEXT1 ?? "") + " " + (artikel.KURZTEXT2 ?? "")
  ).trim() || artikel.name || "";
  const bereinigt = bereinigeText(kompletterText);

  const roherPreis = artikel.BRUTTOPREIS || "";
  const bruttopreisText = roherPreis
    .toString()
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  const bruttopreisZahl = parseFloat(bruttopreisText) || 0;

  const bruttopreis = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(bruttopreisZahl);

  const articleData = {
    type: 'articleData',
    dialogType: dialogType,
    nummer: artikelnummer,
    name: bereinigt,
    preis: bruttopreis,
    preisZahl: bruttopreisZahl,
    currentQuantity: vorhandenerArtikel ? vorhandenerArtikel.menge : 0
  };

  // Neues Fenster öffnen
  const dialogWindow = window.open(
    'dialog-article-final.html',
    'articleDialog',
    'width=600,height=500,scrollbars=yes,resizable=yes'
  );

  if (!dialogWindow) {
    alert('Pop-up-Blocker verhindert das Öffnen des Dialogs. Bitte erlauben Sie Pop-ups für diese Seite.');
    return;
  }

  // Daten an Dialog-Fenster senden, wenn es geladen ist
  dialogWindow.addEventListener('load', () => {
    dialogWindow.postMessage(articleData, '*');
  });

  // Fallback: Daten nach kurzer Verzögerung senden
  setTimeout(() => {
    if (dialogWindow && !dialogWindow.closed) {
      dialogWindow.postMessage(articleData, '*');
    }
  }, 500);
}

// Desktop: Modaler Dialog
function openArticleDialogDesktop(artikelnummer, artikel, dialogType) {
  const vorhandenerArtikel = merkliste.find(item => item.nummer === artikelnummer);
  
  if (vorhandenerArtikel && dialogType === 'add') {
    zeigeArtikelDialogDirekt(artikelnummer, artikel);
  } else {
    zeigeArtikelDialogDirekt(artikelnummer, artikel);
  }
}

// Dialog für "Keine Artikelnummer gefunden" (Mobile)
function openNoArticleDialog(lineText) {
  const articleData = {
    type: 'articleData',
    dialogType: 'notfound',
    nummer: 'Unbekannt',
    name: `Textauszug: "${lineText}"`,
    preis: '0,00 €',
    preisZahl: 0
  };

  const dialogWindow = window.open(
    'dialog-article-final.html',
    'noArticleDialog',
    'width=500,height=400,scrollbars=yes,resizable=yes'
  );

  if (!dialogWindow) {
    alert('Pop-up-Blocker verhindert das Öffnen des Dialogs. Bitte erlauben Sie Pop-ups für diese Seite.');
    return;
  }

  dialogWindow.addEventListener('load', () => {
    dialogWindow.postMessage(articleData, '*');
  });

  setTimeout(() => {
    if (dialogWindow && !dialogWindow.closed) {
      dialogWindow.postMessage(articleData, '*');
    }
  }, 500);
}

// === 📨 NACHRICHTEN VON DIALOG-FENSTERN EMPFANGEN ===
window.addEventListener('message', function(event) {
  if (!event.data || !event.data.type) return;

  switch (event.data.type) {
    case 'addToCart':
      addToMerkliste(event.data.article, event.data.quantity);
      break;
    case 'addQuantity':
      addQuantityToExisting(event.data.articleNumber, event.data.quantity);
      break;
    case 'removeFromCart':
      removeFromMerkliste(event.data.articleNumber);
      break;
  }
});

// Artikel zur Merkliste hinzufügen
function addToMerkliste(articleData, quantity) {
  merkliste.push({
    name: articleData.name,
    nummer: articleData.nummer,
    preis: articleData.preisZahl,
    menge: quantity
  });

  zeigeHinzugefügtOverlay(`${articleData.name} (${articleData.nummer})`);
}

// Menge zu bestehendem Artikel hinzufügen
function addQuantityToExisting(articleNumber, additionalQuantity) {
  const artikel = merkliste.find(item => item.nummer === articleNumber);
  if (artikel) {
    artikel.menge += additionalQuantity;
    zeigeHinzugefügtOverlay(`${artikel.name} (neu: ${artikel.menge} Stück)`);
  }
}

// Artikel aus Merkliste entfernen
function removeFromMerkliste(articleNumber) {
  const index = merkliste.findIndex(item => item.nummer === articleNumber);
  if (index !== -1) {
    const artikel = merkliste[index];
    merkliste.splice(index, 1);
    zeigeHinzugefügtOverlay(`${artikel.name} wurde entfernt`);

    updateMerklisteIcon();
  }
}

// === 🧹 HILFSFUNKTIONEN ===
function bereinigeText(text) {
  return text
    .replace(/"{2,}/g, '"')
    .replace(/^"/, '')
    .replace(/([^0-9¼½¾])"$/, '$1')
    .replace(/"$/, '')
    .trim();
}

function zeigeHinzugefügtOverlay(text) {
    // Auf Mobilgeräten nicht anzeigen
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    return;
  }
  const overlay = document.createElement("div");
  if (text.includes("entfernt")) {
    overlay.textContent = `✅ ${text}`;
  } else {
    overlay.textContent = `✅ ${text} hinzugefügt`;
  }

  Object.assign(overlay.style, {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    zIndex: 9999,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'opacity 0.3s ease-in-out',
    opacity: '1'
  });

  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 2500);
}

// === 🔄 NAVIGATION UND STEUERUNG ===
function prevMatch() {
  const arr = [...matchPages].sort((a, b) => a - b);
  const i = arr.indexOf(currentPage);
  if (i > 0) {
    currentPage = arr[i - 1];
    renderPage(currentPage);
    updateHelpers();
  }
}

function nextMatch() {
  const arr = [...matchPages].sort((a, b) => a - b);
  const i = arr.indexOf(currentPage);
  if (i < arr.length - 1) {
    currentPage = arr[i + 1];
    renderPage(currentPage);
    updateHelpers();
  }
}

// In Ihrer viewer-final.js

// In Ihrer viewer-final.js

// In Ihrer viewer-final.js

function removeCurrentHit() {
  if (!matchPages.has(currentPage)) return;

  const oldSortedPages = [...matchPages].sort((a, b) => a - b);
  const oldIndex = oldSortedPages.indexOf(currentPage);

  // 1. Aktuelle Seite aus der Trefferliste entfernen
  matchPages.delete(currentPage);

  // 2. Nächste anzuzeigende Seite bestimmen (jetzt auf Basis der sortierten Liste)
  const newSortedPages = [...matchPages].sort((a, b) => a - b);

  if (newSortedPages.length > 0) {
    // Fall A: Es sind noch Treffer übrig.
    // Wähle den Index, der dem alten am nächsten ist.
    let nextIndex = oldIndex;
    if (nextIndex >= newSortedPages.length) {
      // Wenn wir das letzte Element gelöscht haben, nimm das neue letzte Element.
      nextIndex = newSortedPages.length - 1;
    }
    
    currentPage = newSortedPages[nextIndex];
    renderPage(currentPage);

  } else {
    // Fall B: Das war der letzte Treffer.
    currentPage = 1;
    renderPage(currentPage);
    document.getElementById('searchInfo').textContent = '';
  }
  
  // 3. Helfer aktualisieren (dieser Aufruf bleibt entscheidend)
  updateHelpers();
}



// In Ihrer viewer-final.js

function addCurrentHit() {
  if (matchPages.has(currentPage)) return; // Sicherheitsabfrage
  matchPages.add(currentPage);
  updateHelpers();
}



// In Ihrer viewer-final.js

function updateHelpers() {
  updateCurrentMatchInfo();
  updateProgressBar();

  const removeHitBtn = document.getElementById('removeHitBtn');
  const addHitBtn = document.getElementById('addHitBtn');

  if (!removeHitBtn || !addHitBtn) return; // Sicherheitsabfrage

  const isCurrentlyOnMatchPage = matchPages.has(currentPage);

  // Standardmäßig beide Buttons ausblenden
  removeHitBtn.style.display = 'none';
  addHitBtn.style.display = 'none';

  // --- FINALE, KORRIGIERTE LOGIK ---
  if (isCurrentlyOnMatchPage) {
    // Zustand 1: Wir sind auf einer Trefferseite.
    // Zeige IMMER den "Entfernen"-Button an, auch wenn es der letzte Treffer ist.
    removeHitBtn.style.display = 'block';
  } else {
    // Zustand 2: Wir sind NICHT auf einer Trefferseite.
    // Zeige IMMER den "Hinzufügen"-Button an.
    addHitBtn.style.display = 'block';
  }
}



// In Ihrer viewer-final.js

function updateCurrentMatchInfo() {
  // --- GEÄNDERT: Das Array wird vor der Index-Suche sortiert ---
  const sortedPages = [...matchPages].sort((a, b) => a - b);
  const idx = sortedPages.indexOf(currentPage) + 1;

  // Nur eine Anzeige ausgeben, wenn es auch Treffer gibt und die Seite ein Treffer ist
  if (idx > 0 && matchPages.size > 0) {
    document.getElementById('currentMatchInfo').textContent = `🎯 Treffer ${idx} / ${matchPages.size}`;
  } else {
    document.getElementById('currentMatchInfo').textContent = ''; // Ansonsten Anzeige leeren
  }
}


// In Ihrer viewer-final.js

function updateProgressBar() {
  // --- GEÄNDERT: Das Array wird vor der Index-Suche sortiert ---
  const sortedPages = [...matchPages].sort((a, b) => a - b);
  const idx = sortedPages.indexOf(currentPage) + 1;

  // Nur die Breite aktualisieren, wenn es auch Treffer gibt
  if (matchPages.size > 0 && idx > 0) {
    const progressPercentage = (idx / matchPages.size) * 100;
    document.getElementById('progressFill').style.width = `${progressPercentage}%`;
  } else {
    // Wenn keine Treffer da sind, Balken zurücksetzen
    document.getElementById('progressFill').style.width = '0%';
  }
}

// === 🔄 VERBESSERTE NAVIGATION MIT TREFFER-BUTTON-STEUERUNG ===
function updateNavigation() {
  // PDF-Navigation
  document.getElementById('prev-page').disabled = currentPage <= 1;
  document.getElementById('next-page').disabled = currentPage >= pdfDoc.numPages;
  
  // Treffer-Navigation (nur aktivieren wenn Treffer vorhanden)
  const hasTreffer = matchPages.size > 0;
  const prevMatchBtn = document.querySelector('button[onclick="prevMatch()"]');
  const nextMatchBtn = document.querySelector('button[onclick="nextMatch()"]');
  
  if (prevMatchBtn) prevMatchBtn.disabled = !hasTreffer;
  if (nextMatchBtn) nextMatchBtn.disabled = !hasTreffer;
}

document.getElementById('prev-page').onclick = () => {
  if (currentPage > 1) {
    currentPage--;
    renderPage(currentPage);
    updateHelpers();
  }
};

document.getElementById('next-page').onclick = () => {
  if (currentPage < pdfDoc.numPages) {
    currentPage++;
    renderPage(currentPage);
    updateHelpers();
  }
};

function zoomIn() {
  zoomFactor += 0.1;
  renderPage(currentPage);
}

function zoomOut() {
  if (zoomFactor > 0.1) {
    zoomFactor -= 0.1;
    renderPage(currentPage);
  }
}

// === 🛒 MERKLISTE-FUNKTIONEN (ehemals Warenkorb) ===
function zeigeMerkliste() {
  const dialog = document.createElement("div");
  dialog.id = "merklisteDialog";
  dialog.style = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
    z-index: 9999;
  `;

  let inhalt = `
    <div style="background:#fff; padding:25px 30px; border-radius:14px; width:80%; max-width:600px;
                font-family:'Segoe UI', sans-serif; box-shadow:0 4px 20px rgba(0,0,0,0.2);">
      <h2 style="margin-top:0;">📝 Ihre Merkliste</h2>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="text-align:left; border-bottom:2px solid #ccc;">
            <th>Nr.</th>
            <th>Artikel / Art.-Nr.</th>
            <th>Preis</th>
            <th>Stück</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
  `;

  merkliste.forEach((item, index) => {
    const preisFormatted = item.preis.toFixed(2).replace('.', ',');
    inhalt += `
      <tr style="border-bottom: 10px solid transparent;">
        <td>${index + 1}</td>
        <td>
          <div style="font-weight:600;">${item.name}</div>
          <div style="font-size:0.9em; color:#555;">Art.-Nr. ${item.nummer}</div>
        </td>
        <td style="text-align:right;"><span style="white-space: nowrap;">${preisFormatted}&nbsp;€&nbsp;</span></td>
        <td><input type="number" min="1" value="${item.menge}" style="width:60px;"
              onchange="merkliste[${index}].menge = parseInt(this.value, 10)" /></td>
        <td>
          <button onclick="merkliste.splice(${index},1); document.body.removeChild(document.getElementById('merklisteDialog')); openMerkliste();"
                  style="color:red; font-weight:bold; border:none; background:none; cursor:pointer;">✖</button>
        </td>
      </tr>
    `;
  });

  inhalt += `
        </tbody>
      </table>
      <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
        
      <button onclick="window.open('https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/retourenschein.html?merkliste=' + encodeURIComponent(JSON.stringify(merkliste)));"
        style="padding:10px 16px; background:#00a1e1; color:white; border:none; border-radius:8px;">
  Retourenschein
</button>
      <button onclick="generateMerklistePDF(merkliste); document.body.removeChild(document.getElementById('merklisteDialog'));" 
                style="padding:10px 16px; background:#00a1e1; color:white; border:none; border-radius:8px;">
          Jetzt Anfragen
        </button>
        <button onclick="document.body.removeChild(document.getElementById('merklisteDialog'))"
                style="padding:10px 16px; background:#ccc; border:none; border-radius:8px;">Schließen</button>
      </div>
    </div>
  `;

  dialog.innerHTML = inhalt;
  document.body.appendChild(dialog);
}

function schließeMerkliste() {
  document.getElementById("merkliste").style.display = "none";
}

function aktualisiereMenge(artikelName, neueMenge) {
  const menge = parseInt(neueMenge, 10);
  if (isNaN(menge) || menge < 1) return;

  const artikel = merkliste.find(item => item.name === artikelName);
  if (artikel) {
    artikel.menge = menge;
    console.log(`Aktualisiert: ${artikel.name} auf ${artikel.menge} Stück`);
  }
}

function openInfo() {
  document.getElementById('infoModal').style.display = 'flex';
}

function closeInfo() {
  document.getElementById('infoModal').style.display = 'none';
}

// === 🖨️ DRUCK-FUNKTIONEN ===
function printCurrentPage() {
  const viewer = document.getElementById('pdfViewer');
  const canvas = viewer.querySelector('canvas');

  if (!canvas) return alert('Kein Inhalt zum Drucken verfügbar.');

  const dataUrl = canvas.toDataURL('image/png');
  const win = window.open('', '_blank');

  if (!win) return alert('Pop-up-Blocker verhindert das Drucken.');

  // --- NEU: HTML mit CSS-Druckregeln ---
  win.document.write(`
    <html>
      <head>
        <title>Druckansicht - ${document.title}</title>
        <style>
          /* CSS-Regeln, die nur für den Druck gelten */
          @media print {
            @page {
              size: A4; /* Definiert das Papierformat */
              margin: 15mm; /* Ein angemessener Rand */
            }
            body {
              margin: 0;
              padding: 0;
            }
            .print-page {
              width: 100%;
              height: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
              overflow: hidden;
            }
            img {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain; /* Das ist die Magie: Skaliert das Bild passend */
            }
          }
          /* Stile für die Bildschirmanzeige (optional, aber gut für die Vorschau) */
          body { margin: 0; padding: 0; }
          .print-page { width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; }
          img { max-width: 100%; max-height: 100%; object-fit: contain; }
        </style>
      </head>
      <body style="margin:0;padding:0">
        <!-- Das Bild wird in einen Container mit der Klasse "print-page" gepackt -->
        <div class="print-page">
            <img src="${dataUrl}" onload="window.print(); setTimeout(window.close, 100);">
        </div>
      </body>
    </html>
  `);
  win.document.close();
}

function printAllMatches() {
  if (!matchPages.size) {
    alert('Keine Treffer zum Drucken.');
    return;
  }

  // Die bewährte Sicherheitsabfrage für mobile Geräte
  const limit = 14;
  if (isMobileDevice() && matchPages.size > limit) {
    alert(`Auf mobilen Geräten können maximal ${limit} Seiten auf einmal gedruckt werden, um Probleme zu vermeiden. Sie versuchen, ${matchPages.size} Seiten zu drucken. Bitte reduzieren Sie die Anzahl der Trefferseiten.`);
    return;
  }

  // Ihr bewährter Code-Ablauf beginnt hier
 document.getElementById('loadingSpinnerOverlay').style.display = 'flex';

  // Die Seiten werden korrekt sortiert
  const pagesToPrint = [...matchPages].sort((a, b) => a - b);

  // Der Promise.all-Ansatz, der die Bilder im Speicher sammelt
  const renderPromises = pagesToPrint.map(pageNum =>
    pdfDoc.getPage(pageNum).then(page => {
      const viewport = page.getViewport({ scale: 2.0 * zoomFactor });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      return page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise.then(() => {
        return canvas.toDataURL('image/png');
      });
    })
  );

  // Ersetzen Sie den kompletten Promise.all-Block durch diesen:
  Promise.all(renderPromises).then(images => {
    // 1. Spinner sofort ausblenden. Die Haupt-App ist sofort wieder frei.
    document.getElementById('loadingSpinnerOverlay').style.display = 'none';

    // 2. Den Rest der Operation in einen setTimeout von 0ms auslagern.
    // Dies gibt dem Browser einen Moment Zeit, das Ausblenden des Spinners
    // zu verarbeiten, bevor das neue, potenziell blockierende Fenster geöffnet wird.
    setTimeout(() => {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Pop-up-Blocker verhindert das Drucken.');
        return;
      }

      // Ihr funktionierender HTML-Code bleibt exakt gleich.
      const html = `
        <html>
          <head>
            <title>Diese Seite(n) sind aus der Prospekten/BI´s/Preislisten 2025 von EWE-Armaturen.</title>
            <style>
              @media print { @page { size: A4; margin: 15mm; } body { margin: 0; padding: 0; } .print-page { page-break-after: always; text-align: center; } img { max-width: 100%; max-height: 95vh; object-fit: contain; } }
              body { margin: 0; padding: 0; }
            </style>
          </head>
          <body style="margin:0;padding:0">
            ${images.map(img => `<div class="print-page"><img src="${img}"></div>`).join('')}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(function() { window.close(); }, 100);
              };
            <\/script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      window.focus();
    }, 0); // Die magische 0

  }).catch(error => {
    // Wichtig: Spinner auch im Fehlerfall ausblenden.
    console.error("Fehler beim Rendern der Druckseiten:", error);
    document.getElementById('loadingSpinnerOverlay').style.display = 'none';
    window.focus();
    alert("Ein Fehler ist beim Erstellen der Druckansicht aufgetreten.");
  });
}


// === ⌨️ KEYBOARD-EVENTS ===
document.getElementById("searchBox").addEventListener("keydown", function(e) {
  if (e.key === "Enter") searchPDF();
});

document.getElementById("searchBox2").addEventListener("keydown", function(e) {
  if (e.key === "Enter") searchPDF();
});

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    document.getElementById("merkliste").style.display = "none";
    document.getElementById("searchBox").value = "";
    document.getElementById("searchBox2").value = "";
    document.getElementById("searchBox").focus();
  }
});

// === 📅 DATUM UND TAG IM HEADER ===
function updateHeaderDate() {
  const now = new Date();
  const options = { 
    weekday: 'short', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  };
  const dateString = now.toLocaleDateString('de-DE', options);
  
  const dateElement = document.getElementById('header-date');
  if (dateElement) {
    dateElement.textContent = dateString;
  }
}



// === function addAllTooltips() {
  // Tooltips für alle Elemente definieren.
  // Die Selektoren sind jetzt exakt auf den bekannten HTML-Code abgestimmt.
// ===  const tooltips = {
    // Buttons in der Hauptleiste
// ===    'button[onclick="searchPDF()"]': 'Suche starten',
// ===    'button[onclick="printCurrentPage()"]': 'Aktuelle Seite drucken',
// ===    'button[onclick="printAllMatches()"]': 'Alle Treffer drucken',
// ===    '#prev-page': 'Vorherige Seite',
// ===    '#next-page': 'Nächste Seite',
// ===    'button[onclick="prevMatch()"]': 'Vorheriger Treffer',
// ===    'button[onclick="nextMatch()"]': 'Nächster Treffer',
// ===    'button[onclick="zoomOut()"]': 'Verkleinern',
// ===    'button[onclick="zoomIn()"]': 'Vergrößern',
    
    // Such-Operatoren (jetzt mit den exakten Selektoren aus dem HTML)
// ===    '.operator-btn[data-op=\'und\']': 'Zeigt nur Seiten, auf denen BEIDE Begriffe vorkommen',
// ===    '.operator-btn[data-op=\'oder\']': 'Zeigt Seiten, auf denen MINDESTENS EINER der Begriffe vorkommt',
// ===    '.operator-btn[data-op=\'ohne\']': 'Zeigt Seiten, die den ersten, aber NICHT den zweiten Begriff enthalten',

    // Suchfelder (jetzt mit den exakten Selektoren aus dem HTML)
// ===    '#searchBox': 'Ersten Suchbegriff eingeben',
// ===    '#searchBox2': 'Zweiten Suchbegriff eingeben (optional)',
    
    // Header-Elemente und die drei Bilder (jetzt mit den exakten Selektoren aus dem HTML)
// ===    'a[href="https://www.ewe-armaturen.de"]': 'Zur EWE-Armaturen Webseite',
// ===    'a[onclick="openMegarippKonfigurator()"]': 'Konfigurator MEGARIPP', // <-- GEÄNDERT
// ===    'a[onclick="openFlexorippKonfigurator()"]': 'Konfigurator FLEXORIPP', // <-- GEÄNDERT
// ===    'a[onclick="openYoutubeChannel()"]': 'EWE-Youtube Kanal', // <-- GEÄNDERT


// ===  };



// ===  Object.entries(tooltips).forEach(([selector, tooltip]) => {
// ===    const elements = document.querySelectorAll(selector);
    
// ===    if (elements.length > 0) {
// ===      elements.forEach(element => {
// ===        // Schritt 1: Das neue, sichere data-tooltip Attribut setzen
// ===        element.setAttribute('data-tooltip', tooltip);
        
        // Schritt 2: Ein aria-label für Barrierefreiheit setzen
// ===        element.setAttribute('aria-label', tooltip);
        
        // Schritt 3: Das alte, störende title-Attribut SICHER entfernen
// ===        if (element.hasAttribute('title')) {
// ===          element.removeAttribute('title');
// ===        }
// ===      });
// ===    } else {
// ===      console.warn(`Tooltip-Element wurde nicht gefunden für Selektor: ${selector}`);
// ===    }
// ===  });
// ===}



// === 💬 DESKTOP MODAL DIALOGE ===

// ⚠️ Fehlerdialog: Keine Artikelnummer gefunden (Desktop)
function zeigeArtikelDialog(roherText) {
  const overlay = document.createElement('div');
  overlay.id = "artikelFehlerOverlay";

  Object.assign(overlay.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    background: "#fff",
    padding: "25px 30px",
    borderRadius: "14px",
    width: "80%",
    fontFamily: "'Segoe UI', sans-serif",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
    textAlign: "center",
    maxWidth: "360px"
  });

  box.innerHTML = `
    <h2 style="margin-top:0; font-size:1.4rem;">📦 Keine Artikelnummer gefunden</h2>
    <p style="margin: 14px 0 20px;">
      In der Auswahl wurde keine gültige Artikelnummer erkannt.<br>
      Textauszug: <em>"${roherText}"</em>
    </p>
    <button id="fehlerOverlayClose"
            style="padding:10px 16px; background:#00a1e1; color:white;
                   border:none; border-radius:8px; cursor:pointer;">
      OK
    </button>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  // Schließen per Button
  document.getElementById("fehlerOverlayClose").onclick = () => {
    document.body.removeChild(overlay);
  };
}

// 💬 Hauptdialog: Artikel anzeigen, Menge erfassen, ggf. erhöhen (Desktop)
function zeigeArtikelDialogDirekt(artikelnummer, artikel) {
  if (document.getElementById('artikelDialog')) return;

  const kompletterText = (
    (artikel.KURZTEXT1 ?? "") + " " + (artikel.KURZTEXT2 ?? "")
  ).trim() || artikel.name || "";
  const bereinigt = bereinigeText(kompletterText);

  // Preis bereinigen und konvertieren
  const roherPreis = artikel.BRUTTOPREIS || "";
  const bruttopreisText = roherPreis
    .toString()
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  const bruttopreisZahl = parseFloat(bruttopreisText) || 0;

  const bruttopreis = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(bruttopreisZahl);

  const vorhandenerArtikel = merkliste.find(item => item.nummer === artikelnummer);

  // Wenn Artikel bereits in der Merkliste → Dialog zur Mengenänderung
  if (vorhandenerArtikel) {
    const mengeDialog = document.createElement("div");
    mengeDialog.id = "artikelDialog";
    Object.assign(mengeDialog.style, {
      position: "fixed",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0,0,0,0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999
    });

    mengeDialog.innerHTML = `
      <div style="background:#fefefe; padding:25px 30px; border-radius:14px; max-width:440px; width:80%;
                  font-family: 'Segoe UI', sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.2); text-align: center;">
        <h2 style="margin-top:0; font-size:1.3rem;">📝 Artikel bereits in der Merkliste</h2>
        <p style="font-size: 1.1rem; margin-bottom: 18px;">
          <strong>${bereinigt}</strong> ist bereits in der Merkliste.<br><br>
          Aktuelle Menge: <strong>${vorhandenerArtikel.menge}</strong>
        </p>
        <label for="anzahlInput" style="display:block; margin-bottom: 6px;">Zusätzliche Menge:</label>
        <input id="anzahlInput" type="number" min="1" value="1"
               style="width:80px; padding:6px; font-size:0.8rem; border-radius:6px; border:1px solid #ccc;" />
        <div style="margin-top:20px; display:flex; justify-content:center; gap:15px;">
          <button id="abbrechenBestaetigung"
                  style="padding:10px 16px; background:#d6d6d6; color:#333; border:none;
                         border-radius:8px; cursor:pointer;">Abbrechen</button>
          <button id="entfernenArtikel"
                  style="padding:10px 16px; background:#dc3545; color:white; border:none;
                         border-radius:8px; cursor:pointer;">Entfernen</button>
          <button id="bestaetigenHinzufuegen"
                  style="padding:10px 16px; background:#00a1e1; color:white; border:none;
                         border-radius:8px; cursor:pointer;">Hinzufügen</button>
        </div>
      </div>
    `;

    document.body.appendChild(mengeDialog);

    // Abbrechen → Dialog schließen
    document.getElementById("abbrechenBestaetigung").addEventListener("click", () => {
      mengeDialog.remove();
    });

    // Entfernen → Artikel aus der Merkliste löschen
    document.getElementById("entfernenArtikel").addEventListener("click", () => {
      const index = merkliste.findIndex(item => item.nummer === artikelnummer);
      if (index !== -1) {
        merkliste.splice(index, 1);
        zeigeHinzugefügtOverlay(`${bereinigt} wurde entfernt`);
      }
      mengeDialog.remove();

      updateMerklisteIcon();

    });

    // Menge erhöhen
    document.getElementById("bestaetigenHinzufuegen").addEventListener("click", () => {
      const zusatzmenge = parseInt(document.getElementById("anzahlInput").value, 10);
      if (isNaN(zusatzmenge) || zusatzmenge < 1) {
        alert("Bitte eine gültige Menge eingeben.");
        return;
      }
      vorhandenerArtikel.menge += zusatzmenge;
      zeigeHinzugefügtOverlay(`${bereinigt} (neu: ${vorhandenerArtikel.menge} Stück)`);
      mengeDialog.remove();
    });

    return; // keine weitere Anzeige
  }

  // Wenn Artikel noch nicht in der Merkliste → regulärer Dialog
  const dialog = document.createElement("div");
  dialog.id = "artikelDialog";
  Object.assign(dialog.style, {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0,0,0,0.4)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999
  });

  dialog.innerHTML = `
    <div style="background:#fefefe; padding:25px 30px; border-radius:14px; max-width:480px; width:80%;
                font-family: 'Segoe UI', sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
      <h2 style="margin-top:0; font-size:1.4rem;">📝 Artikel zur Merkliste hinzufügen</h2>
      <p><strong>Bezeichnung:</strong><br>${bereinigt}</p>
      <p><strong>Artikelnummer:</strong> ${artikelnummer}</p>
      <p><strong>Bruttopreis:</strong> ${bruttopreis}</p>
      <label for="anzahlInput">Anzahl:</label>
      <input id="anzahlInput" type="number" min="1" value="1"
             style="width:70px; padding:4px; margin-left:10px; font-size:0.8rem; border-radius:4px; border:1px solid #ccc;" />
      <div style="margin-top:20px; display:flex; justify-content: flex-end; gap:10px;">
        <button id="abbrechenBtn"
                style="padding:10px 16px; background:#d6d6d6; color:#333; border:none;
                       border-radius:8px; cursor:pointer;">Abbrechen</button>
        <button id="hinzufuegenBtn"
                style="padding:10px 16px; background:#00a1e1; color:white; border:none;
                       border-radius:8px; cursor:pointer;">Hinzufügen</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  // Abbrechen → Dialog schließen
  document.getElementById("abbrechenBtn").addEventListener("click", () => {
    dialog.remove();
  });

  // Hinzufügen
  document.getElementById("hinzufuegenBtn").addEventListener("click", () => {
    const menge = parseInt(document.getElementById("anzahlInput").value, 10);
    if (isNaN(menge) || menge < 1) {
      alert("Bitte eine gültige Anzahl eingeben.");
      return;
    }

    merkliste.push({
      name: bereinigt,
      nummer: artikelnummer,
      preis: bruttopreisZahl,
      menge: menge
    });

    zeigeHinzugefügtOverlay(`${bereinigt} (${artikelnummer})`);
    dialog.remove();

    updateMerklisteIcon(); 
  });
}

// === 📄 PDF-GENERATION (Merkliste statt Warenkorb) ===
function generateRequestNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, "");
  const timePart = now.toTimeString().slice(0, 5).replace(/:/g, "");
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${datePart}${timePart}${randomNum}`;
}

function generateMerklistePDF(merklisteItems) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const eweLogo = new Image();
  eweLogo.crossOrigin = "anonymous";
  eweLogo.src = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/logo.png";

  eweLogo.onload = function() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(0, 51, 102);
    doc.text("Wilhelm Ewe GmbH & Co.KG", 105, 34, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Volkmaroder Str. 19, 38104 Braunschweig", 105, 40, { align: "right" });

    doc.addImage(eweLogo, 'PNG', 156, 5, 30, 30);

    const currentDate = new Date().toLocaleDateString();
    doc.text(`Datum: ${currentDate}`, 158, 47);

    const requestNumber = generateRequestNumber();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text(`Anfragenummer: ${requestNumber}`, 20, 70);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Sehr geehrte Damen und Herren,", 20, 80);
    doc.text("anbei sende ich Ihnen meine Anfrage zu folgenden Artikeln:", 20, 89);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, 98, 190, 98);

    let yOffset = 108;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text("Artikel aus der Merkliste:", 20, yOffset);

    yOffset += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Nr.", 20, yOffset);
    doc.text("Bezeichnung", 30, yOffset);
    doc.text("Artikelnummer", 140, yOffset);
    doc.text("Menge", 175, yOffset);

    yOffset += 6;
    doc.setLineWidth(0.2);
    doc.line(20, yOffset, 190, yOffset);
    yOffset += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    merklisteItems.forEach((item, index) => {
      const maxWidth = 100;
      const bezeichnungLines = doc.splitTextToSize(item.bezeichnung || item.name || "", maxWidth);

      const lineHeight = 6;
      const blockHeight = bezeichnungLines.length * lineHeight;

      if (yOffset + blockHeight > 270) {
        doc.addPage();
        yOffset = 20;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Nr.", 20, yOffset);
        doc.text("Bezeichnung", 30, yOffset);
        doc.text("Artikelnummer", 140, yOffset);
        doc.text("Menge", 175, yOffset);
        yOffset += 6;
        doc.line(20, yOffset, 190, yOffset);
        yOffset += 6;
        doc.setFont("helvetica", "normal");
      }

      doc.text(String(index + 1), 20, yOffset);
      doc.text(bezeichnungLines, 30, yOffset);
      doc.text(item.artikelnummer || item.nummer || "", 140, yOffset);
      doc.text(String(item.menge), 175, yOffset);

      yOffset += blockHeight + 4;
    });

    doc.setLineWidth(0.5);
    doc.line(20, yOffset + 2, 190, yOffset + 2);

    const pdfData = doc.output('blob');
    const url = URL.createObjectURL(pdfData);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
      doc.save("Merkliste.pdf");
    } else {
      window.open(url);
    }
  };
}


function toggleMobileNav() {
  const mobileNav = document.getElementById('mobile-nav');
  const body = document.body;
  const hamburgerBtn = document.getElementById('hamburger-btn');

  const isActive = mobileNav.classList.toggle('active');
  body.classList.toggle('mobile-nav-open', isActive);
  
  // Ändert das Icon zu einem "X", wenn das Menü offen ist
  if (isActive) {
    hamburgerBtn.innerHTML = '✖';
  } else {
    hamburgerBtn.innerHTML = '☰';
  }
}

function closeMobileNav() {
  const mobileNav = document.getElementById('mobile-nav');
  const body = document.body;
  const hamburgerBtn = document.getElementById('hamburger-btn');

  mobileNav.classList.remove('active');
  body.classList.remove('mobile-nav-open');
  hamburgerBtn.innerHTML = '☰';
}


// ===================================================================
//   ALLES AUSFÜHREN, WENN DIE SEITE UND ALLE INHALTE FERTIG GELADEN SIND
// ===================================================================

window.onload = function() {

      // ===================================================================
    //   NEUE LOGIK FÜR DOKUMENTEN-AUSWAHL UND INITIALISIERUNG
    // ===================================================================

    const openBtn = document.getElementById('openDocDialogBtn');
    const closeBtn = document.getElementById('closeDocDialogBtn');
    const dialog = document.getElementById('docDialog');
    const listContainer = document.getElementById('docDialogList');
    let pdfsData = [];
    updateMerklisteIcon();

    function populateDocList() {
      const groupedPdfs = pdfsData.reduce((acc, pdf) => {
        const category = pdf.category || 'Allgemein';
        if (!acc[category]) { acc[category] = []; }
        acc[category].push(pdf);
        return acc;
      }, {});

      listContainer.innerHTML = '';

      for (const category in groupedPdfs) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'doc-category-group';
        const title = document.createElement('div');
        title.className = 'doc-category-title';
        title.textContent = category;
        groupDiv.appendChild(title);

        groupedPdfs[category].forEach(pdf => {
          const link = document.createElement('a');
          link.className = 'doc-link';
          link.textContent = pdf.name;
          link.href = '#';
          link.dataset.path = pdf.path;
          link.addEventListener('click', (e) => {
            e.preventDefault();
            loadAndRenderPdf(e.target.dataset.path);
            dialog.style.display = 'none';
          });
          groupDiv.appendChild(link);
        });
        listContainer.appendChild(groupDiv);
      }
    }

    if (openBtn && dialog && closeBtn) {
        openBtn.addEventListener('click', () => { dialog.style.display = 'flex'; });
        closeBtn.addEventListener('click', () => { dialog.style.display = 'none'; });
    }

    async function initializeDocumentHandling() {
      try {
        const response = await fetch('pdf/pdfs.json');
        pdfsData = await response.json();
        const defaultPdf = pdfsData.find(pdf => pdf.isDefault);
        const initialPdfPath = defaultPdf ? defaultPdf.path : (pdfsData.length > 0 ? pdfsData[0].path : '');
        if (initialPdfPath) {
          loadAndRenderPdf(initialPdfPath);
        } else {
          document.getElementById('pdfViewer').innerHTML = '<h2>Keine Dokumente konfiguriert.</h2>';
        }
        populateDocList();
      } catch (error) {
        console.error("Fehler beim Laden oder Verarbeiten von pdfs.json:", error);
        alert("Die Konfigurationsdatei für die Dokumente konnte nicht geladen werden.");
      }
    }

    initializeDocumentHandling();

    // ===================================================================
    //   ENDE DER NEUEN LOGIK
    // ===================================================================


  // --- 1. Fokus auf das erste Suchfeld setzen ---
  const searchBox = document.getElementById("searchBox");
  
  if (searchBox) {
    searchBox.focus();
  }

  // --- 2. Datum im Header aktualisieren ---
  updateHeaderDate();
  
  // --- 3. Alle Tooltips initialisieren (JETZT mit einer winzigen Verzögerung) ---
  // Dies stellt sicher, dass auch dynamisch nachgeladene Elemente (wie die Suchleiste)
  // sicher im DOM vorhanden sind, bevor das Skript läuft.
 // ---  setTimeout(function() {
 // ---    addAllTooltips();
 // ---  }, 0); // Die 0ms Verzögerung reicht aus, um die Ausführung ans Ende der Event-Queue zu schieben.

  // --- NEU: Funktionalität für "Trefferseite entfernen"-Button ---
  const removeHitBtn = document.getElementById('removeHitBtn');
  if (removeHitBtn) {
    removeHitBtn.addEventListener('click', removeCurrentHit);
  }

    // HIER DEN NEUEN LISTENER HINZUFÜGEN
  const addHitBtn = document.getElementById('addHitBtn');
  if (addHitBtn) {
    addHitBtn.addEventListener('click', addCurrentHit);
  }

  // --- 4. Funktionalität für das Hamburger-Menü (Mobile) ---
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const body = document.body;

  if (hamburgerBtn && mobileNav) {
    // Menü öffnen/schließen beim Klick auf den Button
    hamburgerBtn.addEventListener('click', function(event) {
      event.stopPropagation(); // Verhindert, dass der Klick sofort wieder schließt
      toggleMobileNav();
    });

    // Menü schließen, wenn man daneben klickt
    body.addEventListener('click', function(event) {
        if (mobileNav.classList.contains('active')) {
            // Prüfen, ob der Klick außerhalb des Menüs war
            if (!mobileNav.contains(event.target) && event.target !== hamburgerBtn) {
                closeMobileNav();
            }
        }
    });
  }

  // --- 5. Funktionalität für die Suchoperator-Buttons (UND, ODER, OHNE) ---
  const operatorGroup = document.getElementById('search-operator-group');
  if (operatorGroup) {
    operatorGroup.addEventListener('click', function(e) {
      // Nur reagieren, wenn ein Button mit der Klasse 'operator-btn' geklickt wurde
      if (e.target.classList.contains('operator-btn')) {
        
        // Alle Buttons in der Gruppe deaktivieren
        operatorGroup.querySelectorAll('.operator-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        
        // Nur den geklickten Button aktivieren
        e.target.classList.add('active');
      }
    });
  }

   // ===================================================================
  //   NEU: HIER IST DIE PERFEKTE STELLE FÜR DIE WISCHGESTEN-INITIALISIERUNG
  // ===================================================================
  const pdfContainer = document.getElementById('pdfContainer');
  if (pdfContainer) {
    let startX = 0;
    let startY = 0;
    let distanzX = 0;
    let distanzY = 0;
    const mindestDistanz = 50; // Mindest-Wischdistanz in Pixeln

    pdfContainer.addEventListener('touchstart', function(e) {
      const touch = e.touches[0];
      startX = touch.screenX;
      startY = touch.screenY;
    }, { passive: true });

    pdfContainer.addEventListener('touchmove', function(e) {
      if (e.touches.length > 0) {
          const touch = e.touches[0];
          distanzX = touch.screenX - startX;
          distanzY = touch.screenY - startY;
      }
    }, { passive: true });

    pdfContainer.addEventListener('touchend', function(e) {
      // Nur ausführen, wenn die horizontale Bewegung dominant war
      if (Math.abs(distanzX) > Math.abs(distanzY) && Math.abs(distanzX) > mindestDistanz) {
        
        // Nach links wischen -> Nächste Seite
        if (distanzX < 0) {
          // Simuliert einen Klick auf den "Nächste Seite"-Button
          document.getElementById('next-page').click();
        } 
        // Nach rechts wischen -> Vorherige Seite
        else {
          // Simuliert einen Klick auf den "Vorherige Seite"-Button
          document.getElementById('prev-page').click();
        }
      }

      // Variablen für die nächste Geste zurücksetzen
      startX = 0;
      startY = 0;
      distanzX = 0;
      distanzY = 0;
    });
  }
  // ===================================================================
  //   ENDE DES NEUEN WISCHGESTEN-CODES
  // ===================================================================


}; // Ende des window.onload Blocks


function openMegarippKonfigurator() {
  // Öffnet megaripp.html in einem neuen Fenster (oder Tab)
  // Der Browser merkt sich, dass unser Skript dieses Fenster geöffnet hat.
  window.open('megaripp.html', '_blank');
}

// ======================================================== */
//   FUNKTION ZUM ÖFFNEN DES FLEXORIPP-KONFIGURATORS         */
// ======================================================== */

function openFlexorippKonfigurator() {
  // Öffnet flexoripp.html in einem neuen, vom Skript kontrollierten Fenster
  window.open('flexoripp.html', '_blank');
}

// ======================================================== */
//   FUNKTION ZUM ÖFFNEN DES EWE YOUTUBE-KANALS             */
// ======================================================== */

function openYoutubeChannel() {
  // Die vollständige URL zum YouTube-Kanal
  const youtubeUrl = 'https://www.youtube.com/@ewe-armaturen4154/videos';
  
  // Öffnet die URL in einem neuen, vom Skript kontrollierten Fenster
  window.open(youtubeUrl, '_blank' );
}


