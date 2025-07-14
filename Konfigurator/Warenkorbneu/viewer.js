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

    window.artikelMap = artikelMap; // Global verfügbar
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
      if (matchPages.has(pageNum)) {
        highlightMatches(page, wrapper, viewport);
      }

      // Seiteninfo aktualisieren
      document.getElementById('page-info').textContent = `📄 Seite ${pageNum} / ${pdfDoc.numPages}`;
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
    <div style="background:#fff; padding:25px 30px; border-radius:14px; max-width:400px; width:90%;
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

// === ✨ Treffer visuell hervorheben ===
function highlightMatches(page, container, viewport) {
  const canvas = container.querySelector('canvas');
  const scaleX = canvas.offsetWidth / canvas.width;
  const scaleY = canvas.offsetHeight / canvas.height;

  page.getTextContent().then(tc => {
    const items = tc.items;
    const lines = {};

    // Zeilenweise Gruppieren nach y-Position
    items.forEach(item => {
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const y = Math.round(tx[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push({
        str: item.str,
        x: tx[4],
        y: tx[5] - item.height,
        w: item.width,
        h: item.height
      });
    });

    Object.values(lines).forEach(line => {
      const text = line.map(i => i.str).join(' ').toLowerCase();
      const includesFirst = searchText && text.includes(searchText);
      const includesSecond = secondSearchText && text.includes(secondSearchText);

      if (includesFirst || includesSecond) {
        const minY = Math.min(...line.map(i => i.y));
        const height = Math.max(...line.map(i => i.h));
        const box = document.createElement('div');

        box.className = 'highlight-box';
        Object.assign(box.style, {
          position: 'absolute',
          left: '0px',
          top: `${minY * scaleY}px`,
          width: `${canvas.offsetWidth}px`,
          height: `${height * scaleY}px`,
          backgroundColor:
            includesSecond && !includesFirst ? 'rgba(255, 200, 0, 0.3)' :
            includesFirst && includesSecond ? 'rgba(255, 100, 0, 0.3)' :
            'rgba(0, 150, 255, 0.3)',
          cursor: 'pointer'
        });

        box.title = 'Zum Warenkorb hinzufügen';

        // Klick auf Highlight → Artikel erkennen & anzeigen
        box.addEventListener("click", () => {
          const zeilentext = line.map(i => i.str).join(' ').trim();
          const artikelnummerMatch = zeilentext.match(/\b(?:0392|[0-9]{7})-[a-zA-Z0-9]+\b|\b[0-9]{7}\b/);

          if (artikelnummerMatch) {
            const artikelnummer = artikelnummerMatch[0];
            const artikel = artikelMap.get(artikelnummer);

            if (artikel) {
              zeigeArtikelDialogDirekt(artikelnummer, artikel);  // ✅ Besser: direkt übergeben
              return;
            }
          }

          // ⚠️ Fallback – nur Text anzeigen
          zeigeArtikelDialog(zeilentext);
        });

        container.appendChild(box);
      }
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
    <div style="background:#fff; padding:25px 30px; border-radius:14px; width:90%; max-width:600px;
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
      <head><title>Drucken</title></head>
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
        <head><title>Drucken der Trefferseiten</title></head>
        <body style="margin:0;padding:0">
          ${images.map(img => `<img src="${img}" style="width:100%;page-break-after:always;">`).join('')}
          <script>
            window.onload = function() {
              window.print();
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
    position: "fixed",
    top: "20px",
    right: "20px",
    background: "#28a745",
    color: "white",
    padding: "12px 20px",
    borderRadius: "10px",
    zIndex: 9999,
    fontFamily: "Segoe UI, sans-serif",
    fontSize: "1rem"
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

  const roherText1 = artikel.KURZTEXT1 ?? "";
  const roherText2 = artikel.KURZTEXT2 ?? "";
  const kompletterText = `${roherText1} ${roherText2}`.trim();
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
      <div style="background:#fefefe; padding:25px 30px; border-radius:14px; max-width:440px; width:90%;
                  font-family: 'Segoe UI', sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.2); text-align: center;">
        <h2 style="margin-top:0; font-size:1.3rem;">🛒 Artikel bereits im Warenkorb</h2>
        <p style="font-size: 1.1rem; margin-bottom: 18px;">
          <strong>${bereinigt}</strong> ist bereits im Warenkorb.<br><br>
          Aktuelle Menge: <strong>${vorhandenerArtikel.menge}</strong>
        </p>
        <label for="anzahlInput" style="display:block; margin-bottom: 6px;">Zusätzliche Menge:</label>
        <input id="anzahlInput" type="number" min="1" value="1"
               style="width:80px; padding:6px; font-size:1rem; border-radius:6px; border:1px solid #ccc;" />
        <div style="margin-top:20px; display:flex; justify-content:center; gap:15px;">
          <button id="abbrechenBestaetigung"
                  style="padding:10px 16px; background:#d6d6d6; color:white; border:none;
                         border-radius:8px; cursor:pointer;">Abbrechen</button>
          <button id="entfernenArtikel"
                  style="padding:10px 16px; background:#dc3545; color:white; border:none;
                         border-radius:8px; cursor:pointer;">Entfernen</button>
          <button id="bestaetigenHinzufuegen"
                  style="padding:10px 16px; background:#00a1e1; color:white; border:none;
                         border-radius:8px; cursor:pointer;">Menge erhöhen</button>
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
    <div style="background:#fefefe; padding:25px 30px; border-radius:14px; max-width:480px; width:90%;
                font-family: 'Segoe UI', sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
      <h2 style="margin-top:0; font-size:1.4rem;">🛒 Artikel hinzufügen</h2>
      <p><strong>Bezeichnung:</strong><br>${bereinigt}</p>
      <p><strong>Artikelnummer:</strong> ${artikelnummer}</p>
      <p><strong>Bruttopreis:</strong> ${bruttopreis}</p>
      <label for="anzahlInput">Anzahl:</label>
      <input id="anzahlInput" type="number" min="1" value="1"
             style="width:70px; padding:6px; margin-left:10px; font-size:1rem; border-radius:6px; border:1px solid #ccc;" />
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

    // PDF öffnen
    const pdfData = doc.output('blob');
    const url = URL.createObjectURL(pdfData);
    window.open(url);
  };

  eweLogo.onerror = function() {
    alert("Logo konnte nicht geladen werden. PDF wird ohne Logo erstellt.");
    // Optional: PDF ohne Logo generieren oder Fehlerbehandlung hier
  };
}