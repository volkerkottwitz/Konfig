let artikelMap = new Map();

fetch("https://volkerkottwitz.github.io/Konfig/Konfigurator/Warenkorb/images/ewe-daten-2025.csv")
  .then(res => res.arrayBuffer()) // Statt .text()
  .then(buffer => {
    const decoder = new TextDecoder("utf-8"); // Erzwinge UTF-8
    const text = decoder.decode(buffer);

    const rows = text.split('\n').slice(1); // Header überspringen
    for (let row of rows) {
      const [mnr, KURZTEXT1] = row.split(';');
      if (mnr && KURZTEXT1) {
        artikelMap.set(mnr.trim(), KURZTEXT1.trim());
      }
    }
  })
  .catch(err => console.error("CSV-Fehler:", err));


  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';


let pdfDoc = null, currentPage = 1, zoomFactor = 1.0;
let searchText = '', secondSearchText = '', matchPages = new Set();
let aktuellerArtikelText = "";
const warenkorb = []; // z. B. [{name: "Apfel", menge: 3}]

const warenkorbInhalt = document.getElementById("warenkorbInhalt");

const url = 'https://volkerkottwitz.github.io/Konfig/Konfigurator/images/pdf2025.pdf';

pdfjsLib.getDocument(url).promise.then(pdf => {
  pdfDoc = pdf;
  renderPage(currentPage);
  updateNavigation();
}).catch(err => alert('Fehler beim Laden: ' + err.message));

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
      wrapper.appendChild(canvas);
      wrapper.id = 'canvasWrapper';

      viewer.appendChild(wrapper);

      clearHighlights();

      if (matchPages.has(pageNum)) {
        highlightMatches(page, wrapper, viewport);
      }

      document.getElementById('page-info').textContent = `📄 Seite ${pageNum} / ${pdfDoc.numPages}`;
    });
  });
}


function clearHighlights() {
  document.querySelectorAll('.highlight-box').forEach(el => el.remove());
}

function searchPDF() {
  document.getElementById('loadingSpinnerOverlay').style.display = 'flex';
  searchText = normalize(document.getElementById('searchBox').value);
  secondSearchText = normalize(document.getElementById('searchBox2').value);
  if (!searchText) return alert('Bitte Suchbegriff 1 eingeben.');
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

function normalize(text) {
  return text.replace(/[\u201C\u201D\u201E\u201F]/g, '"').replace(/[\u2018\u2019]/g, "'").toLowerCase();
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
    const lines = {};

    // Gruppiere Textinhalte nach Zeilen anhand von y-Position
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
          backgroundColor: includesSecond && !includesFirst ? 'rgba(255, 200, 0, 0.3)' :
                          includesFirst && includesSecond ? 'rgba(255, 100, 0, 0.3)' :
                          'rgba(0, 150, 255, 0.3)',
          cursor: 'pointer'
        });

        box.title = 'Zum Warenkorb hinzufügen';
box.addEventListener("click", () => {
  const zeilentext = line.map(i => i.str).join(' ').trim();
  const artikelnummerMatch = zeilentext.match(/\b\d{7}\b/);

  if (artikelnummerMatch) {
    const artikelnummer = artikelnummerMatch[0];
    const artikelname = artikelMap.get(artikelnummer);
    
    if (artikelname) {
      // ✅ Nur die offizielle Bezeichnung und Nummer verwenden
      zeigeArtikelDialog(`${artikelname} (${artikelnummer})`);
      return;
    }
  }

  // ⚠️ Kein gültiger Artikel in Map gefunden – Fallback
  zeigeArtikelDialog(zeilentext);
});


        container.appendChild(box);
      }
    });
  });
}

function prevMatch() {
  const arr = [...matchPages];
  const i = arr.indexOf(currentPage);
  if (i > 0) currentPage = arr[i - 1], renderPage(currentPage), updateHelpers();
}
function nextMatch() {
  const arr = [...matchPages];
  const i = arr.indexOf(currentPage);
  if (i < arr.length - 1) currentPage = arr[i + 1], renderPage(currentPage), updateHelpers();
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

document.getElementById('prev-page').onclick = () => { if (currentPage > 1) currentPage--, renderPage(currentPage), updateHelpers(); };
document.getElementById('next-page').onclick = () => { if (currentPage < pdfDoc.numPages) currentPage++, renderPage(currentPage), updateHelpers(); };

function zoomIn() { zoomFactor += 0.1; renderPage(currentPage); }
function zoomOut() { if (zoomFactor > 0.1) zoomFactor -= 0.1, renderPage(currentPage); }

function zeigeWarenkorb() {
  const modal = document.getElementById("warenkorb");
  const inhalt = document.getElementById("warenkorbInhalt");
  inhalt.innerHTML = "";

  if (!warenkorb.length) {
    inhalt.innerHTML = "<li>Der Warenkorb ist leer.</li>";
  } else {
    const table = document.createElement("table");
    table.style.width = "100%";
    table.style.borderCollapse = "collapse";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th style="text-align:left; padding:6px;">Nr.</th>
        <th style="text-align:left; padding:6px;">Artikel</th>
        <th style="text-align:center; padding:6px;">Stück</th>
        <th></th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    warenkorb.forEach((item, index) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td style="padding:6px;">${index + 1}</td>
        <td style="padding:6px;">${item.name}</td>
        <td style="text-align:center; padding:6px;">
          <input type="number" min="1" value="${item.menge}" 
                 onchange="aktualisiereMenge('${item.name}', this.value)"
                 style="width: 60px; padding: 4px; text-align:center;">
        </td>
        <td style="text-align:right; padding:6px;">
          <button style="background:none; border:none; color:#c00; cursor:pointer; font-size:16px;" title="Artikel entfernen">✖</button>
        </td>
      `;

      tr.querySelector("button").onclick = () => {
        warenkorb.splice(index, 1);
        zeigeWarenkorb();
      };

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    inhalt.appendChild(table);
  }

  modal.style.display = "flex";
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

function openInfo() { document.getElementById('infoModal').style.display = 'flex'; }
function closeInfo(){ document.getElementById('infoModal').style.display = 'none'; }


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


// Suche per Enter-Taste auslösen
document.getElementById("searchBox").addEventListener("keydown", function(e) {
  if (e.key === "Enter") searchPDF();
});
document.getElementById("searchBox2").addEventListener("keydown", function(e) {
  if (e.key === "Enter") searchPDF();
});


document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    // Warenkorb schließen (falls offen)
    document.getElementById("warenkorb").style.display = "none";

    // Eingabefelder leeren
    document.getElementById("searchBox").value = "";
    document.getElementById("searchBox2").value = "";

    // Fokus zurück auf erstes Suchfeld
    document.getElementById("searchBox").focus();
  }
});


function zeigeHinzugefügtOverlay(text) {
  let overlay = document.getElementById("hinzuOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "hinzuOverlay";
    Object.assign(overlay.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      backgroundColor: "#28a745",
      color: "white",
      padding: "14px 18px",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
      fontFamily: "'Segoe UI', sans-serif",
      fontSize: "15px",
      zIndex: 10000,
      opacity: 0,
      transition: "opacity 0.3s ease"
    });
    document.body.appendChild(overlay);
  }

  overlay.textContent = `✅ Hinzugefügt: ${text}`;
  overlay.style.opacity = 1;

  setTimeout(() => {
    overlay.style.opacity = 0;
  }, 2500);
}



function zeigeArtikelDialog(name) {
  if (document.getElementById('artikelDialog')) return;

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

  // Dialoginhalt
  dialog.innerHTML = `
    <div style="background:#fefefe; padding:25px 30px; border-radius:14px; max-width:450px; width:90%;
                font-family: 'Segoe UI', sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
      <h2 style="margin-top:0; font-size:1.4rem;">🛒 Artikel hinzufügen</h2>
      <p>Möchten Sie <strong>${name}</strong> dem Warenkorb hinzufügen?</p>
      <label for="anzahlInput">Anzahl:</label>
      <input id="anzahlInput" type="number" min="1" value="1"
             style="width:70px; padding:6px; margin-left:10px; font-size:1rem; border-radius:6px; border:1px solid #ccc;" />
      <div style="margin-top:20px; display:flex; justify-content: flex-end; gap:10px;">
        <button id="abbrechenBtn"
                style="padding:10px 16px; background:#e0e0e0; border:none; border-radius:8px; cursor:pointer;">Abbrechen</button>
        <button id="hinzufuegenBtn"
                style="padding:10px 16px; background:#007bff; color:white; border:none; border-radius:8px; cursor:pointer;">Hinzufügen</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);

  // Event-Handler sicher zuweisen
  document.getElementById("abbrechenBtn").addEventListener("click", () => dialog.remove());

document.getElementById("hinzufuegenBtn").addEventListener("click", function handleHinzufuegenClick() {
  const mengeInput = document.getElementById("anzahlInput");
  const menge = parseInt(mengeInput.value, 10);

  if (!isNaN(menge) && menge > 0) {
    hinzufuegenArtikel(name, menge);
    document.body.removeChild(dialog); // Nur hier entfernt
  } else {
    mengeInput.style.border = "2px solid red";
    mengeInput.focus();
  }
});
}

function hinzufuegenArtikel(name, menge) {
  const vorhandenerArtikel = warenkorb.find(item => item.name === name);

  if (vorhandenerArtikel) {
    vorhandenerArtikel.menge += menge;
  } else {
    warenkorb.push({ name, menge });
  }

  zeigeHinzugefügtOverlay(`${name} (${menge}×)`);
}

function abbrechenArtikel() {
  document.getElementById("artikelModal").style.display = "none";
}