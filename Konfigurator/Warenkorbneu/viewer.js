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
  .then(res => res.arrayBuffer()) // UTF-8 sicherstellen
  .then(buffer => {
    const decoder = new TextDecoder("utf-8");
    const text = decoder.decode(buffer);

    const rows = text.split('\n').slice(1); // Header überspringen
    for (let row of rows) {
      const [
        MNR, KURZTEXT1, KURZTEXT2, GTIN, INTRASTATNUMMER,
        MENGENEINHEIT, PE, BRUTTOPREIS, END_PREIS, TZ,
        GEWICHT, B, H, T
      ] = row.split(';');

      // Nur speichern, wenn Artikelnummer & mind. 1 Text vorhanden
      if (MNR && (KURZTEXT1 || KURZTEXT2)) {
        artikelMap.set(MNR.trim(), {
          KURZTEXT1: KURZTEXT1?.trim() ?? "",
          KURZTEXT2: KURZTEXT2?.trim() ?? "",
          BRUTTOPREIS: BRUTTOPREIS?.trim() ?? "0"
        });
      }
    }

    // ✅ CSV fertig geladen → global speichern und Ladeanzeige prüfen
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

    // Seite rendern
    page.render({ canvasContext: ctx, viewport }).promise.then(() => {
      const viewer = document.getElementById('pdfViewer');
      viewer.innerHTML = '';

      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.id = 'canvasWrapper';
      wrapper.appendChild(canvas);
      viewer.appendChild(wrapper);

      clearHighlights(); // vorherige Treffer löschen

      // Treffer auf Seite hervorheben
      highlightMatches(page, wrapper, viewport);

      // Seiteninfo aktualisieren
      document.getElementById('page-info').textContent = `📄 Seite ${pageNum} / ${pdfDoc.numPages}`;
      updateNavigation();

      // ✅ Nur beim ersten Rendern den Ladezustand setzen
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
              style="margin-top:20px; padding:10px 16px; background:#007bff; color:white; border:none;
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

    // Suchbegriffe normalisieren
    const searchNorm = normalize(searchText);
    const search2Norm = normalize(secondSearchText);

    const zeilenMitArtikelnummer = new Set();

    // Zeilen mit Artikelnummern analysieren
    Object.values(lines).forEach(lineItems => {
      const lineText = lineItems.map(i => i.str).join(' ');
      const lineTextNorm = normalize(lineText);

      // Trefferlogik
      const hit1 = searchNorm && lineTextNorm.includes(searchNorm);
      const hit2 = search2Norm && lineTextNorm.includes(search2Norm);

      // Farben und Markierungslogik
      let bgColor = 'rgba(0, 150, 255, 0.3)'; // Standard für nur Artikelnummer
      let ganzeZeileMarkieren = false;

      if (hit1 && hit2) {
        bgColor = 'rgba(18, 189, 18, 0.15)'; // grün
        ganzeZeileMarkieren = true;
      } else if (hit1) {
        bgColor = 'rgba(255, 165, 0, 0.2)'; // orange
        ganzeZeileMarkieren = true;
      } else if (hit2) {
        bgColor = 'rgba(74, 235, 227, 0.2)'; // dunkleres blau
        ganzeZeileMarkieren = true;
      }

      // Artikelnummern mit Regex finden (keine # davor!)
      const regex = /(?:^|[^\#\w])((?:0392-[a-zA-Z0-9]+|[0-9]{7}(?:-[a-zA-Z0-9]+)?)(\*{1,2})?)/g;
      let match;
      while ((match = regex.exec(lineText)) !== null) {
        const artikelnummer = match[1];
        zeilenMitArtikelnummer.add(lineItems[0].y);

        // Startelement finden
        let startItem = null;
        let accStr = '';
        for (let i = 0; i < lineItems.length; i++) {
          accStr += (accStr ? ' ' : '') + lineItems[i].str;
          if (accStr.includes(artikelnummer)) {
            startItem = lineItems[i];
            break;
          }
        }
        if (!startItem) return;

        // Position & Größe
        let x, y, width, height;
        if (ganzeZeileMarkieren) {
          const first = lineItems[0];
          x = 0;
          y = (first.tx[5] - first.height - 12) * scaleY;
          width = canvas.offsetWidth;
          height = (first.height + 12) * scaleY;
        } else {
          x = startItem.tx[4] * scaleX;
          y = (startItem.tx[5] - startItem.height - 10) * scaleY;
          width = artikelnummer.length * 9.5 * scaleX;
          height = (startItem.height + 12) * scaleY;
        }

        const klickDiv = document.createElement('div');
        Object.assign(klickDiv.style, {
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: bgColor,
          cursor: 'pointer'
        });

        klickDiv.title = `Artikel ${artikelnummer} anzeigen`;

        klickDiv.addEventListener('click', () => {
         




          const artikel = artikelMap.get(artikelnummer);
          if (artikel) {
            zeigeArtikelDialogDirekt(artikelnummer, artikel);
          } else {
              console.log("❌ Artikel NICHT in artikelMap:", artikelnummer);
              console.log("➡️ Verwende lineText für Pseudo-Artikel:", lineText);
            const pseudoArtikel = {
              nummer: artikelnummer,
              name: lineText,
              preis: 0
            };
            zeigeArtikelDialogDirekt(artikelnummer, pseudoArtikel);
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
        bgColor = 'rgba(18, 189, 18, 0.15)'; // grün
      } else if (hit1) {
        bgColor = 'rgba(255, 165, 0, 0.2)'; // orange
      } else {
        bgColor = 'rgba(74, 235, 227, 0.2)'; // dunkleres blau
      }

      const first = lineItems[0];
      const x = 0;
      const y = (first.tx[5] - first.height - 12) * scaleY;
      const width = canvas.offsetWidth;
      const height = (first.height + 12) * scaleY;

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
        zeigeArtikelDialog(lineText);
      });

      container.appendChild(div);
    });
  });
}



// Blättern zwischen Trefferseiten
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

// Hilfsfunktionen aktualisieren (z. B. Trefferinfo & Fortschrittsbalken)
function updateHelpers() {
  updateCurrentMatchInfo();
  updateProgressBar();
}

// Aktuelle Trefferanzeige aktualisieren (z. B. „Treffer 2 / 7“)
function updateCurrentMatchInfo() {
  const idx = [...matchPages].indexOf(currentPage) + 1;
  document.getElementById('currentMatchInfo').textContent = `📄 Treffer ${idx} / ${matchPages.size}`;
}

// Fortschrittsbalken-Anzeige entsprechend der aktuellen Trefferposition
function updateProgressBar() {
  const idx = [...matchPages].indexOf(currentPage) + 1;
  document.getElementById('progressFill').style.width = `${(idx / matchPages.size) * 100}%`;
}

// Navigation (Zurück/Vor) aktivieren oder deaktivieren
function updateNavigation() {
  document.getElementById('prev-page').disabled = currentPage <= 1;
  document.getElementById('next-page').disabled = currentPage >= pdfDoc.numPages;
}

// Navigieren mit Buttons
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

// Zoomfunktionen
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

// Warenkorb-Dialog anzeigen
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

// Warenkorb ausblenden
function schließeWarenkorb() {
  document.getElementById("warenkorb").style.display = "none";
}

// Artikelmenge manuell aktualisieren
function aktualisiereMenge(artikelName, neueMenge) {
  const menge = parseInt(neueMenge, 10);
  if (isNaN(menge) || menge < 1) return;

  const artikel = warenkorb.find(item => item.name === artikelName);
  if (artikel) {
    artikel.menge = menge;
    console.log(`Aktualisiert: ${artikel.name} auf ${artikel.menge} Stück`);
  }
}

// Infofenster öffnen/schließen
function openInfo() {
  document.getElementById('infoModal').style.display = 'flex';
}
function closeInfo() {
  document.getElementById('infoModal').style.display = 'none';
}

// Aktuelle Seite drucken
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

// Alle Trefferseiten drucken
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

// Suche bei Enter-Taste in Suchfeldern auslösen
document.getElementById("searchBox").addEventListener("keydown", function(e) {
  if (e.key === "Enter") searchPDF();
});
document.getElementById("searchBox2").addEventListener("keydown", function(e) {
  if (e.key === "Enter") searchPDF();
});

// ESC-Taste: Warenkorb schließen, Suchfelder leeren, Fokus setzen
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    document.getElementById("warenkorb").style.display = "none";
    document.getElementById("searchBox").value = "";
    document.getElementById("searchBox2").value = "";
    document.getElementById("searchBox").focus();
  }
});



// ✅ Kurze Infoanzeige bei erfolgreichem Hinzufügen
function zeigeHinzugefügtOverlay(text) {
  const overlay = document.createElement("div");
  overlay.textContent = `✅ ${text} hinzugefügt`;

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


// ⚠️ Fehlerdialog: Keine Artikelnummer gefunden
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
            style="padding:10px 16px; background:#007bff; color:white;
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


// 🧹 Hilfsfunktion: Bereinigt Artikeltext von Anführungszeichen & Leerzeichen
function bereinigeText(text) {
  return text
    .replace(/"{2,}/g, '"')              // Doppelte Anführungszeichen zusammenfassen
    .replace(/^"/, '')                   // Anführungszeichen am Anfang entfernen
    .replace(/([^0-9¼½¾])"$/, '$1')      // Am Ende entfernen, wenn nicht nach Zahl/Bruch
    .replace(/"$/, '')                   // Fallback
    .trim();                             // Leerzeichen entfernen
}


// ➕ Artikel dem Warenkorb hinzufügen (mit Mengenerhöhung bei Duplikat)
function hinzufuegenArtikel(artikelObjekt, menge) {
  const vorhandenerArtikel = warenkorb.find(item => item.nummer === artikelObjekt.nummer);

  if (vorhandenerArtikel) {
    vorhandenerArtikel.menge += menge; // Menge erhöhen
  } else {
    warenkorb.push({
      name: artikelObjekt.name,
      nummer: artikelObjekt.nummer,
      preis: artikelObjekt.preis,
      menge
    });
  }

  zeigeHinzugefügtOverlay(`${artikelObjekt.name} (${artikelObjekt.nummer})`);
}


// 💬 Hauptdialog: Artikel anzeigen, Menge erfassen, ggf. erhöhen
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

  const vorhandenerArtikel = warenkorb.find(item => item.nummer === artikelnummer);

  // Wenn Artikel bereits im Warenkorb → Dialog zur Mengenänderung
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
        <h2 style="margin-top:0; font-size:1.3rem;">🛒 Artikel bereits im Warenkorb</h2>
        <p style="font-size: 1.1rem; margin-bottom: 18px;">
          <strong>${bereinigt}</strong> ist bereits im Warenkorb.<br><br>
          Aktuelle Menge: <strong>${vorhandenerArtikel.menge}</strong>
        </p>
        <label for="anzahlInput" style="display:block; margin-bottom: 6px;">Zusätzliche Menge:</label>
        <input id="anzahlInput" type="number" min="1" value="1"
               style="width:80px; padding:6px; font-size:0.8rem; border-radius:6px; border:1px solid #ccc;" />
        <div style="margin-top:20px; display:flex; justify-content:center; gap:15px;">
          <button id="abbrechenBestaetigung"
                  style="padding:10px 16px; background:#d6d6d6; color:white; border:none;
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

    // Entfernen → Artikel aus dem Warenkorb löschen
    document.getElementById("entfernenArtikel").addEventListener("click", () => {
      const index = warenkorb.findIndex(item => item.nummer === artikelnummer);
      if (index !== -1) {
        warenkorb.splice(index, 1);
        zeigeHinzugefügtOverlay(`${bereinigt} wurde entfernt`);
      }
      mengeDialog.remove();
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

  // Wenn Artikel noch nicht im Warenkorb → regulärer Dialog
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
      <h2 style="margin-top:0; font-size:1.4rem;">🛒 Artikel hinzufügen</h2>
      <p><strong>Bezeichnung:</strong><br>${bereinigt}</p>
      <p><strong>Artikelnummer:</strong> ${artikelnummer}</p>
      <p><strong>Bruttopreis:</strong> ${bruttopreis}</p>
      <label for="anzahlInput">Anzahl:</label>
      <input id="anzahlInput" type="number" min="1" value="1"
             style="width:70px; padding:4px; margin-left:10px; font-size:0.8rem; border-radius:4px; border:1px solid #ccc;" />
      <div style="margin-top:20px; display:flex; justify-content: flex-end; gap:10px;">
        <button id="abbrechenBtn"
                style="padding:10px 16px; background:#d6d6d6; color:white; border:none;
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

    warenkorb.push({
      name: bereinigt,
      nummer: artikelnummer,
      preis: bruttopreisZahl,
      menge: menge
    });

    zeigeHinzugefügtOverlay(`${bereinigt} (${artikelnummer})`);
    dialog.remove();
  });
}


document.addEventListener("DOMContentLoaded", () => {
  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.focus();
  }
});

function generateRequestNumber() {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, ""); // YYMMDD
    const timePart = now.toTimeString().slice(0, 5).replace(/:/g, ""); // HHMM
    const randomNum = Math.floor(100 + Math.random() * 900); // 3-stellige Zufallszahl

    return `${datePart}${timePart}${randomNum}`;
}



function generateCartPDF(cartItems) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const eweLogo = new Image();
  eweLogo.crossOrigin = "anonymous";  // wichtig, falls Logo von anderer Domain kommt
  eweLogo.src = "https://volkerkottwitz.github.io/Konfig/Konfigurator/images/logo.png";

  eweLogo.onload = function() {
    // Header
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

    // Horizontale Linie
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, 98, 190, 98);

    // Tabellenheader für Warenkorb
    let yOffset = 108;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(0, 51, 102);
    doc.text("Artikel im Warenkorb:", 20, yOffset);

    yOffset += 8;

    // Spaltenüberschriften fett und schwarz
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

    // Inhalte in normaler Schrift
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

cartItems.forEach((item, index) => {
  const maxWidth = 100; // mehr Platz für die Artikelbezeichnung
  const bezeichnungLines = doc.splitTextToSize(item.bezeichnung || item.name || "", maxWidth);

  const lineHeight = 6;
  const blockHeight = bezeichnungLines.length * lineHeight;

  if (yOffset + blockHeight > 270) {
    doc.addPage();
    yOffset = 20;

    // Tabellenkopf auf neuer Seite wiederholen
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

  // Artikel-Index
  doc.text(String(index + 1), 20, yOffset);

  // Artikelbezeichnung (mehrzeilig)
  doc.text(bezeichnungLines, 30, yOffset);

  // Artikelnummer
  doc.text(item.artikelnummer || item.nummer || "", 140, yOffset);

  // Menge
  doc.text(String(item.menge), 175, yOffset);

  yOffset += blockHeight + 4;
});

    // Trennlinie nach Warenkorb
    doc.setLineWidth(0.5);
    doc.line(20, yOffset + 2, 190, yOffset + 2);

    // Hier kannst du ggf. weitere Infos anhängen wie Benutzerdaten


// PDF mit korrektem Dateinamen öffnen
    const pdfData = doc.output('blob');
    const url = URL.createObjectURL(pdfData);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
      // Auf iOS: PDF in neuem Tab öffnen, Download per save() könnte problematisch sein
      doc.save("Warenkorb.pdf");
      
    } else {
      // Andere Geräte: PDF öffnen (oder speichern, wenn du möchtest)
      window.open(url);
      // Alternativ: doc.save("Warenkorb.pdf");
    }
  };
}





