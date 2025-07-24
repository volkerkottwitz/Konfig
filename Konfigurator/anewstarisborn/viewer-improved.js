let csvGeladen = false;
let pdfGerendert = false;
let wurdeBereitsInitialGerendert = false;

function ladebildschirmPruefen() {
  if (csvGeladen && pdfGerendert) {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('pdfViewer').style.display = 'block';
  }
}

// === 🛒 Artikel-Daten aus CSV laden ===
const artikelMap = new Map();

fetch("https://volkerkottwitz.github.io/Konfig/Konfigurator/Warenkorb/images/ewe-daten-2025.csv")
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
const warenkorb = [];

const warenkorbInhalt = document.getElementById("warenkorbInhalt");

// PDF-URL
const url = 'https://volkerkottwitz.github.io/Konfig/Konfigurator/images/pdf2025.pdf';

// === 📥 PDF laden & initial anzeigen ===
pdfjsLib.getDocument(url).promise.then(pdf => {
  pdfDoc = pdf;
  renderPage(currentPage);
  updateNavigation();
}).catch(err => alert('Fehler beim Laden: ' + err.message));

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
function searchPDF() {
  document.getElementById('loadingSpinnerOverlay').style.display = 'flex';
  searchText = normalize(document.getElementById('searchBox').value);
  secondSearchText = normalize(document.getElementById('searchBox2').value);

  if (!searchText && !secondSearchText) {
    zeigeLeererSuchbegriffDialog();
    document.getElementById('loadingSpinnerOverlay').style.display = 'none';
    return;
  }

  matchPages.clear();
  let totalMatches = 0;

  const tasks = [];
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    tasks.push(pdfDoc.getPage(p).then(page =>
      page.getTextContent().then(tc => {
        const pageText = normalize(tc.items.map(i => i.str).join(' '));
        if (pageText.includes(searchText) && (!secondSearchText || pageText.includes(secondSearchText))) {
          matchPages.add(p);
          totalMatches += countMatches(pageText, searchText, secondSearchText);
        }
      })
    ));
  }

  Promise.all(tasks).then(() => {
    document.getElementById('searchInfo').textContent = `🔍 ${matchPages.size} Seite(n), ${totalMatches} Treffer`;
    if (matchPages.size) {
      currentPage = [...matchPages][0];
      renderPage(currentPage);
    }
    document.getElementById('loadingSpinnerOverlay').style.display = 'none';
    updateNavigation();
    updateCurrentMatchInfo();
  });
}

function zeigeLeererSuchbegriffDialog() {
  if (document.getElementById("hinweisDialog")) return;

  const dialog = document.createElement("div");
  dialog.id = "hinweisDialog";
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
    <div style="background:#fff; padding:25px 30px; border-radius:14px; max-width:400px; width:80%;
                font-family: 'Segoe UI', sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.2); text-align:center;">
      <h2 style="margin-top:0; font-size:1.2rem;">🔍 Kein Suchbegriff</h2>
      <p>Bitte gib einen Suchbegriff ein.</p>
      <button id="leererSuchbegriffOk"
              style="margin-top:20px; padding:10px 16px; background:#00a1e1; color:white; border:none;
                     border-radius:8px; cursor:pointer;">
        OK
      </button>
    </div>
  `;

  document.body.appendChild(dialog);

  document.getElementById("leererSuchbegriffOk").addEventListener("click", () => {
    dialog.remove();
    document.getElementById("searchBox")?.focus();
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

// === 🎯 VERBESSERTE HIGHLIGHT-FUNKTION MIT PRÄZISER ARTIKELNUMMERN-MARKIERUNG ===
function highlightMatches(page, container, viewport) {
  const canvas = container.querySelector('canvas');
  const scaleX = canvas.offsetWidth / canvas.width;
  const scaleY = canvas.offsetHeight / canvas.height;

  page.getTextContent().then(tc => {
    const items = tc.items;

    // Zeilen nach gerundeter Y-Position gruppieren
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

    // Zeilen mit Artikelnummern analysieren
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

      const regex = /(?:^|[^\#\w])((?:0392-[a-zA-Z0-9]+|[0-9]{7}(?:-[a-zA-Z0-9]+)?)(\*{1,2})?)/g;
      let match;
      while ((match = regex.exec(lineText)) !== null) {
        const artikelnummer = match[1];
        const matchStart = match.index + match[0].indexOf(artikelnummer);
        zeilenMitArtikelnummer.add(lineItems[0].y);

        // VERBESSERTE POSITIONSBERECHNUNG
        const position = calculatePreciseArticlePosition(lineItems, artikelnummer, matchStart, scaleX, scaleY);
        
        if (!position) continue;

        let x, y, width, height;
        if (ganzeZeileMarkieren) {
          const first = lineItems[0];
          x = 0;
          y = (first.tx[5] - position.height - 9) * scaleY;
          width = canvas.offsetWidth;
          height = (position.height + 12) * scaleY;
        } else {
          x = position.x;
          y = position.y;
          width = position.width;
          height = position.height;
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

        klickDiv.title = `Artikel ${artikelnummer} anzeigen`;

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

    // Zeilen ohne Artikelnummer aber mit Treffer
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

      const first = lineItems[0];
      const x = 0;
      const y = (first.tx[5] - 15) * scaleY;
      const width = canvas.offsetWidth;
      const height = 17 * scaleY;

      const div = document.createElement('div');
      Object.assign(div.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: bgColor,
        cursor: 'pointer'
      });

      div.title = `Keine Artikelnummer gefunden`;

      div.addEventListener('click', () => {
        openNoArticleDialog(lineText);
      });

      container.appendChild(div);
    });
  });
}

// === 🎯 PRÄZISE ARTIKELNUMMERN-POSITIONSBERECHNUNG ===
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
    
    // Berechne Position und Größe
    const startX = (targetItem.tx[4] + (charOffset * avgCharWidth)) * scaleX;
    const startY = (targetItem.tx[5] - targetItem.height - 2) * scaleY;
    const width = (artikelnummer.length * avgCharWidth) * scaleX;
    const height = (targetItem.height + 4) * scaleY;

    return {
      x: Math.max(0, startX),
      y: Math.max(0, startY),
      width: Math.max(20, width),
      height: Math.max(15, height)
    };
  } catch (error) {
    console.warn('Fehler bei Positionsberechnung:', error);
    // Fallback zur ursprünglichen Methode
    const firstItem = lineItems[0];
    return {
      x: (firstItem.tx[4] - 3) * scaleX,
      y: (firstItem.tx[5] - firstItem.height - 9) * scaleY,
      width: artikelnummer.length * 11 * scaleX,
      height: (firstItem.height + 12) * scaleY
    };
  }
}

// === 🆕 NEUE DIALOG-SYSTEM FUNKTIONEN ===

// Artikel-Dialog in neuem Fenster öffnen
function openArticleDialog(artikelnummer, artikel, dialogType = 'add') {
  const vorhandenerArtikel = warenkorb.find(item => item.nummer === artikelnummer);
  
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
    'dialog-article.html',
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

// Dialog für "Keine Artikelnummer gefunden"
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
    'dialog-article.html',
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
      addToCart(event.data.article, event.data.quantity);
      break;
    case 'addQuantity':
      addQuantityToExisting(event.data.articleNumber, event.data.quantity);
      break;
    case 'removeFromCart':
      removeFromCart(event.data.articleNumber);
      break;
  }
});

// Artikel zum Warenkorb hinzufügen
function addToCart(articleData, quantity) {
  warenkorb.push({
    name: articleData.name,
    nummer: articleData.nummer,
    preis: articleData.preisZahl,
    menge: quantity
  });

  zeigeHinzugefügtOverlay(`${articleData.name} (${articleData.nummer})`);
}

// Menge zu bestehendem Artikel hinzufügen
function addQuantityToExisting(articleNumber, additionalQuantity) {
  const artikel = warenkorb.find(item => item.nummer === articleNumber);
  if (artikel) {
    artikel.menge += additionalQuantity;
    zeigeHinzugefügtOverlay(`${artikel.name} (neu: ${artikel.menge} Stück)`);
  }
}

// Artikel aus Warenkorb entfernen
function removeFromCart(articleNumber) {
  const index = warenkorb.findIndex(item => item.nummer === articleNumber);
  if (index !== -1) {
    const artikel = warenkorb[index];
    warenkorb.splice(index, 1);
    zeigeHinzugefügtOverlay(`${artikel.name} wurde entfernt`);
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
  const arr = [...matchPages];
  const i = arr.indexOf(currentPage);
  if (i > 0) {
    currentPage = arr[i - 1];
    renderPage(currentPage);
    updateHelpers();
  }
}

function nextMatch() {
  const arr = [...matchPages];
  const i = arr.indexOf(currentPage);
  if (i < arr.length - 1) {
    currentPage = arr[i + 1];
    renderPage(currentPage);
    updateHelpers();
  }
}

function updateHelpers() {
  updateCurrentMatchInfo();
  updateProgressBar();
}

function updateCurrentMatchInfo() {
  const idx = [...matchPages].indexOf(currentPage) + 1;
  document.getElementById('currentMatchInfo').textContent = `📄 Treffer ${idx} / ${matchPages.size}`;
}

function updateProgressBar() {
  const idx = [...matchPages].indexOf(currentPage) + 1;
  document.getElementById('progressFill').style.width = `${(idx / matchPages.size) * 100}%`;
}

function updateNavigation() {
  document.getElementById('prev-page').disabled = currentPage <= 1;
  document.getElementById('next-page').disabled = currentPage >= pdfDoc.numPages;
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

// === 🛒 WARENKORB-FUNKTIONEN ===
function zeigeWarenkorb() {
  const dialog = document.createElement("div");
  dialog.id = "warenkorbDialog";
  dialog.style = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center;
    z-index: 9999;
  `;

  let inhalt = `
    <div style="background:#fff; padding:25px 30px; border-radius:14px; width:80%; max-width:600px;
                font-family:'Segoe UI', sans-serif; box-shadow:0 4px 20px rgba(0,0,0,0.2);">
      <h2 style="margin-top:0;">🛒 Ihr Warenkorb</h2>
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

  warenkorb.forEach((item, index) => {
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
              onchange="warenkorb[${index}].menge = parseInt(this.value, 10)" /></td>
        <td>
          <button onclick="warenkorb.splice(${index},1); document.body.removeChild(document.getElementById('warenkorbDialog')); zeigeWarenkorb();"
                  style="color:red; font-weight:bold; border:none; background:none; cursor:pointer;">✖</button>
        </td>
      </tr>
    `;
  });

  inhalt += `
        </tbody>
      </table>
      <div style="margin-top:20px; display:flex; justify-content:flex-end; gap:10px;">
        <button onclick="generateCartPDF(warenkorb); document.body.removeChild(document.getElementById('warenkorbDialog'));" 
                style="padding:10px 16px; background:#00a1e1; color:white; border:none; border-radius:8px;">
          Jetzt Anfragen
        </button>
        <button onclick="document.body.removeChild(document.getElementById('warenkorbDialog'))"
                style="padding:10px 16px; background:#ccc; border:none; border-radius:8px;">Schließen</button>
      </div>
    </div>
  `;

  dialog.innerHTML = inhalt;
  document.body.appendChild(dialog);
}

function schließeWarenkorb() {
  document.getElementById("warenkorb").style.display = "none";
}

function aktualisiereMenge(artikelName, neueMenge) {
  const menge = parseInt(neueMenge, 10);
  if (isNaN(menge) || menge < 1) return;

  const artikel = warenkorb.find(item => item.name === artikelName);
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

  win.document.write(`
    <html>
      <head><title>Diese Seite(n) sind aus der Preisliste 2025 von EWE-Armaturen.</title></head>
      <body style="margin:0;padding:0">
        <img src="${dataUrl}" style="width:100%;height:auto" onload="window.print();window.close()">
      </body>
    </html>
  `);
}

function printAllMatches() {
  if (!matchPages.size) return alert('Keine Treffer zum Drucken.');

  const pagesToPrint = [...matchPages];
  const images = [];

  document.getElementById('loadingSpinnerOverlay').style.display = 'flex';

  const renderPromises = pagesToPrint.map(pageNum =>
    pdfDoc.getPage(pageNum).then(page => {
      const viewport = page.getViewport({ scale: 2.0 * zoomFactor });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      return page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise.then(() => {
        images.push(canvas.toDataURL('image/png'));
      });
    })
  );

  Promise.all(renderPromises).then(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Pop-up-Blocker verhindert das Drucken.');
      document.getElementById('loadingSpinnerOverlay').style.display = 'none';
      return;
    }

    const html = `
      <html>
        <head><title>Diese Seite(n) sind aus der Preisliste 2025 von EWE-Armaturen.</title></head>
        <body style="margin:0;padding:0">
          ${images.map(img => `<img src="${img}" style="width:100%;page-break-after:always;">`).join('')}
          <script>
            window.onload = function() {
              window.print();window.close();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    document.getElementById('loadingSpinnerOverlay').style.display = 'none';
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
    document.getElementById("warenkorb").style.display = "none";
    document.getElementById("searchBox").value = "";
    document.getElementById("searchBox2").value = "";
    document.getElementById("searchBox").focus();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.focus();
  }
});

// === 📄 PDF-GENERATION (wird später ausgelagert) ===
function generateRequestNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(2, 10).replace(/-/g, "");
  const timePart = now.toTimeString().slice(0, 5).replace(/:/g, "");
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${datePart}${timePart}${randomNum}`;
}

function generateCartPDF(cartItems) {
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
    doc.text("Artikel im Warenkorb:", 20, yOffset);

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

    cartItems.forEach((item, index) => {
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
      doc.save("Warenkorb.pdf");
    } else {
      window.open(url);
    }
  };
}

