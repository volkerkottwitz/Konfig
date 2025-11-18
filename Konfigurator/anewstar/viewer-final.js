let csvGeladen = false;
let pdfGerendert = false;
let wurdeBereitsInitialGerendert = false;

// === 🔧 Variablen für Viewer-Funktionalität ===
// ... (deine bestehenden Variablen)

// NEU: Variablen für die globale Suche und Lazy Loading
let globalPdfCache = [];
let isLazyLoading = false; // Verhindert, dass der Lader mehrfach startet

// ===================================================================
//   SCHRITT 1: SYNONYM-WÖRTERBUCH & HILFSFUNKTION FÜR ZOLL-SUCHE
// ===================================================================

const zollSynonyms = [
    ['1/4', '¼'],
    ['1/2', '½'],
    ['3/4', '¾'],
    ['1 1/4', '1¼', '5/4'],
    ['1 1/2', '1½', '3/2', '6/4'],
    ['1 3/4', '1¾', '7/4'],
    ['2', '8/4'], // 2 Zoll kann auch als 8/4 geschrieben sein
    ['2 1/4', '2¼', '9/4'],
    ['2 1/2', '2½', '5/2', '10/4']
];

/**
 * Erweitert einen Suchbegriff um Zoll-Synonyme.
 * Findet einen Zoll-Wert im Suchbegriff und ersetzt ihn durch eine Regex-Gruppe,
 * die alle Synonyme (z.B. "5/4", "1 1/4", "1¼") abdeckt.
 * @param {string} query - Der ursprüngliche Suchbegriff.
 * @returns {string} - Der erweiterte Suchbegriff als Regex-String.
 */
// ===================================================================
//   FINALE KORREKTUR: 'expandZollQuery' mit flexiblen Leerzeichen
// ===================================================================
function expandZollQuery(query) {
    let finalQuery = query;

    const allTerms = zollSynonyms.flat().sort((a, b) => b.length - a.length);

    for (const term of allTerms) {
        // Erstelle eine Regex, um den Begriff als "ganzes Wort" zu finden.
        // Das \b sorgt dafür, dass wir nicht "1/4" in "1/40" finden.
        // Wir ersetzen das Leerzeichen im Begriff durch \s+, um flexibler zu sein.
        const termRegex = new RegExp(`\\b${term.replace(/\s+/g, '\\s+').replace('/', '\\/')}\\b`, 'i');

        if (termRegex.test(finalQuery)) {
            const group = zollSynonyms.find(g => g.includes(term));
            if (group) {
                // === HIER IST DIE ENTSCHEIDENDE ÄNDERUNG ===
                // Beim Erstellen der Regex-Gruppe ersetzen wir jedes Leerzeichen
                // in den Synonymen durch \s+, was "ein oder mehrere Whitespace-Zeichen" bedeutet.
                const regexPart = `(${group.map(s => s.replace(/\s+/g, '\\s+').replace('/', '\\/')).join('|')})`;
                
                finalQuery = finalQuery.replace(termRegex, regexPart);
                
                return finalQuery;
            }
        }
    }

    return finalQuery;
}



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
let currentDocumentName = '';
let currentDocumentPath = '';
let searchText = '', secondSearchText = '', matchPages = new Set();
let aktuellerArtikelText = "";
const merkliste = []; // Geändert von warenkorb zu merkliste
let pdfsData = [];
// ===================================================================
//   FUNKTION ZUR AKTUALISIERUNG DES MERKLISTEN-ZAHLEN-BADGES
// ===================================================================
// ===================================================================
//   NEUE, VERBESSERTE FUNKTION ZUR AKTUALISIERUNG ALLER MERKLISTEN-ICONS
// ===================================================================
function updateMerklisteIcon() {
  // Die Anzahl der Artikel in der Merkliste ermitteln
  const anzahl = merkliste.length;
  const hatArtikel = anzahl > 0; // Eine Hilfsvariable für besseren Lesefluss

// --- 1. Desktop-Icon aktualisieren (FINALE VERSION) ---
const merklisteBtnDesktop = document.getElementById('desktop-merkliste-btn');
if (merklisteBtnDesktop) {
  // Finde den Anker-Span INNERHALB des Buttons
  const anchor = merklisteBtnDesktop.querySelector('.badge-anchor');
  if (anchor) {
    if (hatArtikel) {
      // Hänge die Attribute an den Anker, nicht an den Button
      anchor.dataset.count = anzahl;
      anchor.classList.add('has-items'); // Diese Klasse wird für die Sichtbarkeit benötigt
    } else {
      anchor.classList.remove('has-items');
      delete anchor.dataset.count;
    }
  }
}


  // --- 2. Mobiles Hamburger-Menü-Icon aktualisieren (bleibt unverändert) ---
  const hamburgerBtn = document.getElementById('hamburger-btn');
  if (hamburgerBtn) {
    if (hatArtikel) {
      hamburgerBtn.dataset.count = anzahl;
      hamburgerBtn.classList.add('has-items');
    } else {
      hamburgerBtn.classList.remove('has-items');
      delete hamburgerBtn.dataset.count;
    }
  }

  // ===================================================================
  //   KORREKTUR: Link-Inhalt mit innerHTML komplett neu aufbauen
  // ===================================================================
  const merklisteLinkMobile = document.getElementById('mobile-nav-merkliste');
  if (merklisteLinkMobile) {
    // 1. Entscheiden, welcher Text angezeigt werden soll
    const text = hatArtikel ? `Merkliste (${anzahl})` : 'Merkliste';

    // 2. Den kompletten HTML-Inhalt des Links neu schreiben.
    //    Dadurch werden alle alten Inhalte (auch Duplikate) sicher entfernt.
    //    WICHTIG: Passen Sie die Icon-Klasse "fa-solid fa-list" an, falls sie bei Ihnen anders ist.
    // KORREKT:
merklisteLinkMobile.innerHTML = `<i class="bi bi-list-check"></i> ${text}`;

  }
}


const merklisteInhalt = document.getElementById("merklisteInhalt");


// ===================================================================
//   FUNKTION ZUR AKTUALISIERUNG DES DOKUMENTENNAMENS IM HEADER
// ===================================================================
function updateHeaderDocumentName() {
  const docNameElement = document.getElementById('current-document-name');
  if (docNameElement) {
    // Setzt den sichtbaren Text (der ggf. mit "..." gekürzt wird)
    docNameElement.textContent = currentDocumentName; 
    // Setzt den vollen Text als Tooltip für die Maus (Desktop)
    docNameElement.setAttribute('title', currentDocumentName); 
  }
}


// ÄNDERUNG: Die Funktion wird 'async', um auf die Text-Extraktion zu warten
// ERSETZEN: 'loadAndRenderPdf' wird um einen optionalen Parameter 'zielSeite' erweitert
async function loadAndRenderPdf(pdfPath, zielSeite = 1) { // Standardmäßig Seite 1
  document.getElementById('loadingSpinnerOverlay').style.display = 'flex';
  
  // WICHTIG: Die alten Such-Infos erst hier zurücksetzen, nicht global
  if (zielSeite === 1) {
      document.getElementById('searchInfo').textContent = '';
      matchPages.clear();
  }

  document.getElementById('pdfViewer').innerHTML = ''; 
  currentPage = zielSeite; // Die Zielseite wird zur aktuellen Seite
  currentDocumentPath = pdfPath;

  try {
    const pdf = await pdfjsLib.getDocument(pdfPath).promise;
    pdfDoc = pdf;

    const cacheEntry = globalPdfCache.find(p => p.path === pdfPath);
    if (cacheEntry && !cacheEntry.geladen) {
      console.log(`Extrahiere Text für: ${cacheEntry.name}`);
      const seitenTexte = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        seitenTexte.push(textContent.items.map(item => item.str).join(' '));
      }
      cacheEntry.seitenTexte = seitenTexte;
      cacheEntry.geladen = true;
      console.log(`Text für ${cacheEntry.name} erfolgreich gecacht.`);
    }
    
    updateHeaderDocumentName(); 
    // WICHTIG: Rendert jetzt direkt die korrekte Zielseite statt immer Seite 1
    renderPage(currentPage); 
    updateNavigation();
    updateHelpers();

  } catch (err) {
    alert('Fehler beim Laden des PDFs: ' + err.message);
    document.getElementById('pdfViewer').innerHTML = '<h2>Fehler beim Laden des Dokuments.</h2>';
    document.getElementById('loadingSpinnerOverlay').style.display = 'none';
  }
}


// ===================================================================
//   ANPASSUNG 1: 'startLazyLoading' zum Laden der .JSON-Dateien
// ===================================================================
function startLazyLoading() {
  if (isLazyLoading) return;
  isLazyLoading = true;
  
  const statusElement = document.getElementById('lazy-load-status');
  statusElement.style.display = 'inline';

  const loadNext = async () => {
    const ungeladenesPdf = globalPdfCache.find(p => !p.geladen);
    const geladeneAnzahl = globalPdfCache.filter(p => p.geladen).length;

    statusElement.textContent = `(Initialisiere Suche: ${geladeneAnzahl}/${globalPdfCache.length})`;

    if (ungeladenesPdf) {
      try {
        // 1. Erstelle den Pfad zur .json-Datei
        const jsonPath = ungeladenesPdf.path.replace('.pdf', '.json');

        // 2. Lade die .json-Datei
        const response = await fetch(jsonPath + '?t=' + new Date().getTime()); // Cache umgehen
        if (!response.ok) {
            throw new Error(`JSON-Datei nicht gefunden (HTTP ${response.status})`);
        }
        const seitenTexte = await response.json(); // Parst die JSON direkt in ein Array
        
        // 3. Speichere das Array der Seitentexte im Cache
        ungeladenesPdf.seitenTexte = seitenTexte;
        
        ungeladenesPdf.geladen = true;
        console.log(`Text-Cache für ${ungeladenesPdf.name} aus .json-Datei erstellt.`);

      } catch (error) {
        console.error(`Fehler beim Laden der .json für ${ungeladenesPdf.name}:`, error);
        ungeladenesPdf.geladen = true; 
      }
      
      setTimeout(loadNext, 100); 
    } else {
      console.log("Alle Text-Caches wurden erstellt.");
      statusElement.textContent = 'Suche bereit.';
      setTimeout(() => { statusElement.style.display = 'none'; }, 2000);
      isLazyLoading = false;
    }
  };

  loadNext();
}




// === 🖼️ SEITE RENDERN (Wiederhergestellte, funktionierende Version) ===
function renderPage(pageNum) {
  pdfDoc.getPage(pageNum).then(page => {
    const viewport = page.getViewport({ scale: 2.0 * zoomFactor });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    page.render({ canvasContext: ctx, viewport }).promise.then(() => {
      const viewer = document.getElementById('pdfViewer');
      
      viewer.style.transition = 'none'; 
      viewer.style.transform = 'translateX(0)';
      
      viewer.innerHTML = '';
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.id = 'canvasWrapper';
      wrapper.appendChild(canvas);
      viewer.appendChild(wrapper);

      // WICHTIG: Die UI-Helfer werden wieder hier aufgerufen
      clearHighlights();
      highlightMatches(page, wrapper, viewport);
      document.getElementById('page-info').textContent = `📄 Seite ${pageNum} / ${pdfDoc.numPages}`;
      updateNavigation();
      updateHelpers(); // <--- DER ENTSCHEIDENDE AUFRUF IST WIEDER HIER

      setTimeout(() => {
          viewer.style.transition = 'opacity 0.3s ease-in';
          viewer.style.opacity = '1';
      }, 50);

      document.getElementById('loadingSpinnerOverlay').style.display = 'none';
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

// ===================================================================
//   AKTION 3: Suchlogik in LOKAL und GLOBAL aufteilen
// ===================================================================

// ===================================================================
//   KORRIGIERTE 'startLocalSearch' (MIT 2-ZEICHEN-PRÜFUNG)
// ===================================================================
function startLocalSearch() {
  const term1 = document.getElementById('searchBox').value;
  const term2 = document.getElementById('searchBox2').value;

  // === NEUE, VERBESSERTE PRÜFUNG ===
  // Die Suche wird nur gestartet, wenn mindestens ein Feld Text enthält
  // UND dieser Text mindestens 2 Zeichen lang ist.
  if ((!term1 || term1.length < 2) && (!term2 || term2.length < 2)) {
    const searchInfo = document.getElementById('searchInfo');
    searchInfo.textContent = '⚠️ Bitte geben Sie mindestens 2 Zeichen ein.';
    searchInfo.style.color = '#dc3545';
    setTimeout(() => {
      searchInfo.textContent = '';
      searchInfo.style.color = '';
    }, 3000);
    return;
  }

  // Der Rest der Funktion bleibt unverändert
  activateSearchContext();

  if (matchPages.size > 0) {
    const ersteTrefferSeite = [...matchPages].sort((a, b) => a - b)[0];
    if (currentPage !== ersteTrefferSeite) {
      currentPage = ersteTrefferSeite;
      renderPage(currentPage);
    }
  } else {
    const searchInfo = document.getElementById('searchInfo');
    searchInfo.textContent = '🔍 Keine Treffer in diesem Dokument gefunden.';
    searchInfo.style.color = '';
    setTimeout(() => {
      if (searchInfo.textContent === '🔍 Keine Treffer in diesem Dokument gefunden.') {
        searchInfo.textContent = '';
      }
    }, 3000);
  }
}



// ===================================================================
//   ANGEPASSTE 'startGlobalSearch'-FUNKTION (MIT ÜBERSCHRIFTEN-EXTRAKTION)
// ===================================================================
function startGlobalSearch() {
  const searchText1 = document.getElementById('searchBox').value;
  const searchText2 = document.getElementById('searchBox2').value;

  if ((!searchText1 || searchText1.length < 2) && (!searchText2 || searchText2.length < 2)) {
    alert('Bitte geben Sie für die globale Suche mindestens 2 Zeichen ein.');
    return;
  }

  document.getElementById('loadingSpinnerOverlay').style.display = 'flex';
  
  // Die Suchbegriffe werden jetzt hier erweitert, damit wir sie nur einmal berechnen müssen.
  const expandedTerm1 = searchText1 ? expandZollQuery(searchText1) : null;
  const expandedTerm2 = searchText2 ? expandZollQuery(searchText2) : null;
  
  const searchRegex1 = expandedTerm1 ? new RegExp(expandedTerm1, 'gi') : null;
  const searchRegex2 = expandedTerm2 ? new RegExp(expandedTerm2, 'gi') : null;

  const activeOperatorBtn = document.querySelector('.operator-btn.active');
  const searchOperator = activeOperatorBtn ? activeOperatorBtn.dataset.op : 'und';

  const allResults = [];
  const geladeneDokumente = globalPdfCache.filter(p => p.geladen);

  for (const doc of geladeneDokumente) {
    for (let i = 0; i < doc.seitenTexte.length; i++) {
      const pageText = doc.seitenTexte[i];
      const normalizedPageText = normalize(pageText);
      
      // Wichtig: Regex-Indizes vor jeder Verwendung zurücksetzen!
      if (searchRegex1) searchRegex1.lastIndex = 0;
      if (searchRegex2) searchRegex2.lastIndex = 0;

      const hasText1 = searchRegex1 ? searchRegex1.test(normalizedPageText) : false;
      const hasText2 = searchRegex2 ? searchRegex2.test(normalizedPageText) : false;
      
// NEUER, KORRIGIERTER isMatch-Block:

let isMatch = false;

// Fall 1: Nur das erste Feld ist ausgefüllt.
if (expandedTerm1 && !expandedTerm2) {
    isMatch = hasText1;
} 
// Fall 2: Nur das zweite Feld ist ausgefüllt.
else if (!expandedTerm1 && expandedTerm2) {
    isMatch = hasText2;
} 
// Fall 3: Beide Felder sind ausgefüllt.
else if (expandedTerm1 && expandedTerm2) {
    switch (searchOperator) {
        case 'und': isMatch = hasText1 && hasText2; break;
        case 'oder': isMatch = hasText1 || hasText2; break;
        case 'ohne': isMatch = hasText1 && !hasText2; break;
    }
}
// (Wenn beide Felder leer sind, bleibt isMatch = false, was korrekt ist)

      if (isMatch) {
        // === HIER IST DIE NEUE LOGIK ===
        // 1. Extrahiere die Überschrift von der gefundenen Seite.
        const headline = extractHeadline(pageText);

        // 2. Füge die Überschrift zum Ergebnisobjekt hinzu.
        allResults.push({
          docName: doc.name,
          docPath: doc.path,
          pageNumber: i + 1,
          headline: headline, // <--- NEUES FELD
          context: getContextSnippet(pageText, searchText1, searchText2)
        });
      }
    }
  }

  // Die Statistik-Zählung ist hier nicht mehr vorhanden, das ist korrekt.
  displayGlobalResults(allResults, { 
      term1: searchText1, 
      term2: searchText2,
      isFromGlobalSearch: true
  });
  
  document.getElementById('loadingSpinnerOverlay').style.display = 'none';
}


// ===================================================================
//   FINALE, VERFEINERTE 'getContextSnippet'-FUNKTION
// ===================================================================
function getContextSnippet(pageText, term1, term2, length = 150) {
  const expandedTerm1 = term1 ? expandZollQuery(term1) : null;
  const expandedTerm2 = term2 ? expandZollQuery(term2) : null;
  const normPageText = normalize(pageText);

  let index = -1;

  // === NEUE, VERFEINERTE LOGIK ===
  // 1. Versuche, den exakten (normalisierten) Originalbegriff zu finden.
  //    Das ist oft relevanter für den Benutzer.
  if (term1) {
    index = normPageText.indexOf(normalize(term1));
  }
  if (index === -1 && term2) {
    index = normPageText.indexOf(normalize(term2));
  }

  // 2. Wenn der Originalbegriff nicht gefunden wurde, suche nach irgendeinem Synonym.
  if (index === -1 && expandedTerm1) {
    try {
      const searchRegex = new RegExp(expandedTerm1, 'i');
      index = normPageText.search(searchRegex);
    } catch (e) { /* Fehler ignorieren */ }
  }
  if (index === -1 && expandedTerm2) {
    try {
      const searchRegex = new RegExp(expandedTerm2, 'i');
      index = normPageText.search(searchRegex);
    } catch (e) { /* Fehler ignorieren */ }
  }

  if (index === -1) {
    return pageText.substring(0, length) + '...';
  }

  const start = Math.max(0, index - Math.floor(length / 3));
  let snippet = pageText.substring(start, start + length);

  // Die Hervorhebung selbst bleibt intelligent und markiert alle Synonyme.
  if (expandedTerm1) {
    try {
      const highlightRegex = new RegExp(expandedTerm1, 'gi');
      snippet = snippet.replace(highlightRegex, '<strong>$&</strong>');
    } catch (e) { /* Fehler ignorieren */ }
  }
  if (expandedTerm2) {
    try {
      const highlightRegex = new RegExp(expandedTerm2, 'gi');
      snippet = snippet.replace(highlightRegex, '<strong>$&</strong>');
    } catch (e) { /* Fehler ignorieren */ }
  }

  return (start > 0 ? '...' : '') + snippet + (start + length < pageText.length ? '...' : '');
}



// ===================================================================
//   ANGEPASSTE 'displayGlobalResults'-FUNKTION (ZEIGT ÜBERSCHRIFT AN)
// ===================================================================
function displayGlobalResults(results, searchData) {
  const overlay = document.getElementById('global-search-overlay');
  const titleEl = document.getElementById('global-search-title');
  const container = document.getElementById('global-search-results-container');
  
  container.innerHTML = '';

  const operatorText = document.querySelector('.operator-btn.active')?.textContent || 'UND';
  let titleText = '';
  const term1 = searchData.term1;
  const term2 = searchData.term2;

  if (term1 && term2) {
    titleText = `${results.length} Trefferseiten für "${term1}" ${operatorText} "${term2}"`;
  } else if (term1) {
    titleText = `${results.length} Trefferseiten für "${term1}"`;
  } else if (term2) {
    titleText = `${results.length} Trefferseiten für "${term2}"`;
  } else {
    titleText = `${results.length} Trefferseiten gefunden`;
  }
  titleEl.textContent = titleText;

  // Die Statistik-Anzeige lassen wir weg, da wir die Zählung entfernt haben.
  
  if (results.length === 0) {
    container.innerHTML += '<p style="text-align: center; margin-top: 20px;">Keine Ergebnisse gefunden.</p>';
  } else {
    const groupedResults = results.reduce((acc, result) => {
      if (!acc[result.docName]) {
        acc[result.docName] = [];
      }
      acc[result.docName].push(result);
      return acc;
    }, {});

    const anzahlDokumente = Object.keys(groupedResults).length;

    for (const docName in groupedResults) {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'result-document-group';
      
      const docTitle = document.createElement('div');
      docTitle.className = 'doc-category-title accordion-trigger';
      docTitle.innerHTML = `<span class="accordion-arrow">►</span> ${docName} (${groupedResults[docName].length} Treffer)`;
      
      const detailsContainer = document.createElement('div');
      detailsContainer.className = 'accordion-details';

      const isFromGlobalSearch = searchData.isFromGlobalSearch !== false;
      if (!isFromGlobalSearch || anzahlDokumente === 1) {
        detailsContainer.style.display = 'block';
        docTitle.classList.add('active');
      } else {
        detailsContainer.style.display = 'none';
      }

      groupDiv.appendChild(docTitle);

      for (const item of groupedResults[docName]) {
        // === HIER IST DIE NEUE LOGIK ===
        // Erstelle einen optionalen HTML-Block für die Überschrift.
        const headlineHTML = item.headline 
          ? `<span class="result-headline">${item.headline}</span>` 
          : '';

        const itemDiv = document.createElement('div');
        itemDiv.className = 'result-item';
        // Füge den headlineHTML-Block zwischen Seitenzahl und Snippet ein.
        itemDiv.innerHTML = `
          <span class="page-number">Seite ${item.pageNumber}</span>
          ${headlineHTML}
          <div class="context-snippet">${item.context}</div>
        `;
        
        itemDiv.onclick = async () => {
          overlay.style.display = 'none';
          currentDocumentName = item.docName;
          await loadAndRenderPdf(item.docPath, item.pageNumber);
          activateSearchContext();
        };
        detailsContainer.appendChild(itemDiv);
      }
      groupDiv.appendChild(detailsContainer);
      container.appendChild(groupDiv);
    }
  }
  
  overlay.style.display = 'flex';
}



// ===================================================================
//   SCHRITT 3: 'activateSearchContext' anpassen
// ===================================================================
function activateSearchContext() {
  const term1 = document.getElementById('searchBox').value;
  const term2 = document.getElementById('searchBox2').value;

  // === HIER IST DIE ÄNDERUNG ===
  // Wir speichern die erweiterten Begriffe in den globalen Variablen,
  // damit die 'highlightMatches'-Funktion sie verwenden kann.
  searchText = term1 ? normalize(expandZollQuery(term1)) : "";
  secondSearchText = term2 ? normalize(expandZollQuery(term2)) : "";
  
  const searchInfo = document.getElementById('searchInfo');

  if (!searchText && !secondSearchText) {
    searchInfo.innerHTML = '';
    matchPages.clear();
    updateHelpers();
    updateNavigation();
    return;
  }

  const cacheEntry = globalPdfCache.find(p => p.path === currentDocumentPath);
  if (!cacheEntry || !cacheEntry.geladen) return;

  matchPages.clear();
  const activeOperatorBtn = document.querySelector('.operator-btn.active');
  const searchOperator = activeOperatorBtn ? activeOperatorBtn.dataset.op : 'und';

  let localTerm1Count = 0;
  let localTerm2Count = 0;

  for (let i = 0; i < cacheEntry.seitenTexte.length; i++) {
    const pageText = cacheEntry.seitenTexte[i];
    if (!pageText) continue;

    const normalizedPageText = normalize(pageText);
    
    let matches1 = 0;
    if (searchText) {
        matches1 = (normalizedPageText.match(new RegExp(searchText, 'gi')) || []).length;
    }
    
    let matches2 = 0;
    if (secondSearchText) {
        matches2 = (normalizedPageText.match(new RegExp(secondSearchText, 'gi')) || []).length;
    }

    const hasText1 = matches1 > 0;
    const hasText2 = matches2 > 0;

    let isMatch = false;
    if (searchText && !secondSearchText) { isMatch = hasText1; }
    else if (!searchText && secondSearchText) { isMatch = hasText2; }
    else if (searchText && secondSearchText) {
      switch (searchOperator) {
        case 'und': isMatch = hasText1 && hasText2; break;
        case 'oder': isMatch = hasText1 || hasText2; break;
        case 'ohne': isMatch = hasText1 && !hasText2; break;
      }
    }

    if (isMatch) {
      matchPages.add(i + 1);
      localTerm1Count += matches1;
      localTerm2Count += matches2;
    }
  }

  if (matchPages.size > 0) {
    let statsText = `(${term1}: ${localTerm1Count}x`;
    if (term2) {
      statsText += `, ${term2}: ${localTerm2Count}x`;
    }
    statsText += `)`;
    
    searchInfo.innerHTML = `🔍 <span id="local-search-trigger" style="cursor: pointer; text-decoration: underline;" title="Klicken für eine Übersicht aller Treffer in diesem Dokument">${matchPages.size} Seite(n) in diesem Dokument gefunden.</span> ${statsText}`;
    
    document.getElementById('local-search-trigger').onclick = () => {
      const localResults = [];
      for (const pageNum of [...matchPages].sort((a,b) => a - b)) {
        const pageText = cacheEntry.seitenTexte[pageNum - 1];
        localResults.push({
          docName: cacheEntry.name,
          docPath: cacheEntry.path,
          pageNumber: pageNum,
          context: getContextSnippet(pageText, term1, term2)
        });
      }
      displayGlobalResults(localResults, { term1: term1, term2: term2, count1: localTerm1Count, count2: localTerm2Count, isLocal: true });
    };

  } else {
    searchInfo.innerHTML = '';
  }
}


// === 🔡 Hilfsfunktionen ===
function normalize(text) {
  return text.replace(/[\u201C\u201D\u201E\u201F]/g, '"')
             .replace(/[\u2018\u2019]/g, "'")
             .toLowerCase();
}


// ===================================================================
//   NEUE HILFSFUNKTION: 'extractHeadline'
// ===================================================================
/**
 * Versucht, die wahrscheinlichste Überschrift aus einem Seitentext zu extrahieren.
 * @param {string} pageText - Der gesamte Text einer PDF-Seite.
 * @returns {string} - Die gefundene Überschrift oder ein leerer String.
 */
function extractHeadline(pageText) {
  // Teilt den gesamten Seitentext in einzelne Zeilen auf.
  const lines = pageText.split('\n');
  
  // Schlüsselwörter, die oft in Überschriften vorkommen.
  const headlineKeywords = ['ventil', 'armatur', 'system', 'anschluss', 'rohr', 'dn', 'rp', 'hülse'];
  // Wörter, die eher nicht in der Hauptüberschrift stehen.
  const antiKeywords = ['preis', 'artikelnummer', 'art.-nr', 'menge', 'stück'];

  for (const line of lines) {
    const trimmedLine = line.trim();
    const lowerLine = trimmedLine.toLowerCase();
    
    // Überprüfe die Kriterien für eine gute Überschrift:
    // 1. Die Zeile muss Text enthalten.
    // 2. Sie sollte nicht zu lang sein (z.B. weniger als 12 Wörter).
    // 3. Sie muss mindestens ein Schlüsselwort enthalten.
    // 4. Sie darf kein "Anti-Schlüsselwort" enthalten.
    if (trimmedLine && 
        trimmedLine.split(/\s+/).length < 12 &&
        headlineKeywords.some(keyword => lowerLine.includes(keyword)) &&
        !antiKeywords.some(keyword => lowerLine.includes(keyword))) {
      
      // Der erste Treffer wird als Überschrift zurückgegeben.
      return trimmedLine;
    }
  }

  // Wenn keine passende Zeile gefunden wurde, gib einen leeren String zurück.
  return '';
}


// ===================================================================
//   SCHRITT 1: NEUE FUNKTION ZUR INDEX-ERSTELLUNG
// ===================================================================
/**
 * Erstellt einen kompakten Such-Index aus den Seitentexten eines Dokuments.
 * @param {string[]} pageTexts - Ein Array mit dem gesamten Text für jede Seite.
 * @returns {Map<string, Set<number>>} - Eine Map, bei der der Schlüssel das Wort
 *   und der Wert ein Set mit den Seitenzahlen ist.
 */
function createSearchIndex(pageTexts) {
    const index = new Map();

    for (let i = 0; i < pageTexts.length; i++) {
        const pageText = pageTexts[i];
        const pageNum = i + 1;

        // Normalisiere den Text und zerlege ihn in einzelne Wörter.
        // Wir filtern kurze Wörter (< 3 Zeichen) und Zahlen heraus, um den Index klein zu halten.
        const words = normalize(pageText).split(/\s+/).filter(word => word.length > 2 && isNaN(word));

        for (const word of words) {
            if (!index.has(word)) {
                // Wenn das Wort neu ist, erstelle einen neuen Eintrag mit der aktuellen Seitenzahl.
                index.set(word, new Set());
            }
            // Füge die aktuelle Seitenzahl zum Set für dieses Wort hinzu.
            // Ein Set verhindert doppelte Einträge automatisch.
            index.get(word).add(pageNum);
        }
    }
    return index;
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

// ===================================================================
//   FINALE KORREKTUR (VOLLSTÄNDIG): 'highlightMatches' mit Regex-Unterstützung
// ===================================================================
function highlightMatches(page, container, viewport) {
  const canvas = container.querySelector('canvas');
  const canvasLeftOffset = (container.offsetWidth - canvas.offsetWidth) / 2;
  const scaleX = canvas.offsetWidth / canvas.width;
  const scaleY = canvas.offsetHeight / canvas.height;

  page.getTextContent().then(tc => {
    const items = tc.items;
    const lines = {};
    items.forEach(item => {
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const y = Math.round(tx[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push({ ...item, tx, y });
    });

    // Erstelle direkt RegExp-Objekte aus den globalen (bereits erweiterten) Suchbegriffen.
    // Das 'g' Flag ist wichtig für das Zurücksetzen von lastIndex.
    const searchRegex1 = searchText ? new RegExp(searchText, 'gi') : null;
    const searchRegex2 = secondSearchText ? new RegExp(secondSearchText, 'gi') : null;

    const zeilenMitArtikelnummer = new Set();
    const markierungsWerte = getMarkierungsWerte();

    Object.values(lines).forEach(lineItems => {
      const lineText = lineItems.map(i => i.str).join(' ');
      const lineTextNorm = normalize(lineText);

      // Wir testen jetzt mit den Regex-Objekten.
      const hit1 = searchRegex1 ? searchRegex1.test(lineTextNorm) : false;
      if(searchRegex1) searchRegex1.lastIndex = 0; // Wichtig: Regex-Index zurücksetzen

      const hit2 = searchRegex2 ? searchRegex2.test(lineTextNorm) : false;
      if(searchRegex2) searchRegex2.lastIndex = 0; // Wichtig: Regex-Index zurücksetzen

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

  //       const regex = /(?:^|[^\#\w])((?:0392-[A-Z]{5,10}|[0-9]{7}-(?:DIBT|wrs)|0392-[a-zA-Z0-9]{3,}|[0-9]{7}(?:-[a-zA-Z0-9]{2,})?)(\*{1,2})?)/g;
  //       const regex = /(?:^|[^\#\w])((?:0392-[A-Z]{5,10}|[0-9]{7}-(?:DIBT|wrs)|0392-[a-zA-Z0-9]{3,}|[0-9]{7}(?:-(?:V|K|[a-zA-Z0-9]{2,}))?)(\*{1,2})?)/g;
const regex = /(?:^|[^\#\w])((?:0392-[A-Z]{5,10}|[0-9]{7}-(?:DIBT|wrs)|0392-[a-zA-Z0-9]{3,}|W[0-9]{6}|[0-9]{7}(?:-(?:V|K|[a-zA-Z0-9]{2,}))?)(\*{1,2})?)/g;

      let match;
      while ((match = regex.exec(lineText)) !== null) {
        const artikelnummer = match[1];

        // START: HIER DIE NEUEN ZEILEN EINFÜGEN
        const kontextIndex = match.index;
        const kontextText = lineText.substring(Math.max(0, kontextIndex - 20), kontextIndex);
        if (/mobil|telefon|\+49/i.test(kontextText)) {
            continue; 
        }
        // ENDE: NEUE ZEILEN
      
        const matchStart = match.index + match[0].indexOf(artikelnummer);
        zeilenMitArtikelnummer.add(lineItems[0].y);

        const position = calculatePreciseArticlePosition(lineItems, artikelnummer, matchStart, scaleX, scaleY);
        
        if (!position) continue;

        let x, y, width, height;
        if (ganzeZeileMarkieren) {
          const first = lineItems[0];
          x = canvasLeftOffset;
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

        klickDiv.setAttribute('data-tooltip', `Artikel ${artikelnummer} anzeigen`);

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

      // Wir testen hier ebenfalls mit den Regex-Objekten.
      const hit1 = searchRegex1 ? searchRegex1.test(lineTextNorm) : false;
      if(searchRegex1) searchRegex1.lastIndex = 0; // Wichtig: Regex-Index zurücksetzen

      const hit2 = searchRegex2 ? searchRegex2.test(lineTextNorm) : false;
      if(searchRegex2) searchRegex2.lastIndex = 0; // Wichtig: Regex-Index zurücksetzen

      if (!(hit1 || hit2)) return;

      let bgColor;
      if (hit1 && hit2) {
        bgColor = 'rgba(18, 189, 18, 0.15)';
      } else if (hit1) {
        bgColor = 'rgba(255, 165, 0, 0.2)';
      } else {
        bgColor = 'rgba(74, 235, 227, 0.2)';
      }

      const x = canvasLeftOffset;
      const minY = Math.min(...lineItems.map(i => i.tx[5]));
      const maxY = Math.max(...lineItems.map(i => i.tx[5]));
      const textHeight = maxY - minY;
      
      const basePadding = 24;
      const padding = isMobileDevice() ? basePadding : basePadding * Math.max(0.5, Math.min(3.0, zoomFactor));

      const y = (minY + markierungsWerte.zeilenYOffset) * scaleY-3;
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

      div.setAttribute('data-tooltip', `Keine Artikelnummer gefunden`);

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

      case 'updateIcon':
      updateMerklisteIcon();
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

// ===================================================================
//   NEU: Intelligente Treffer-Navigation (behebt "Verlust des Fokus")
// ===================================================================
function prevMatch() {
  const sortedPages = [...matchPages].sort((a, b) => a - b);
  
  // Finde den größten Treffer, der kleiner als die aktuelle Seite ist.
  const prevPage = sortedPages.reverse().find(p => p < currentPage);

  if (prevPage !== undefined) {
    currentPage = prevPage;
    renderPage(currentPage);
    updateHelpers();
  } else {
    // Optional: Wenn es keinen vorherigen gibt, zum letzten Treffer springen
    if (sortedPages.length > 0) {
        currentPage = sortedPages[0]; // sortedPages ist hier noch umgedreht
        renderPage(currentPage);
        updateHelpers();
    }
  }
}

function nextMatch() {
  const sortedPages = [...matchPages].sort((a, b) => a - b);

  // Finde den kleinsten Treffer, der größer als die aktuelle Seite ist.
  const nextPage = sortedPages.find(p => p > currentPage);

  if (nextPage !== undefined) {
    currentPage = nextPage;
    renderPage(currentPage);
    updateHelpers();
  } else {
    // Optional: Wenn es keinen nächsten gibt, zum ersten Treffer springen
    if (sortedPages.length > 0) {
        currentPage = sortedPages[0];
        renderPage(currentPage);
        updateHelpers();
    }
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

  // --- Listener für Add/Remove Hit Buttons ---
  const removeHitBtn = document.getElementById('removeHitBtn');
  if (removeHitBtn) {
    removeHitBtn.addEventListener('click', function(event) { // Funktion empfängt jetzt 'event'
      event.stopPropagation(); // <-- DAS IST DIE ENTSCHEIDENDE ZEILE
      removeCurrentHit();      // Ruft die ursprüngliche Funktion auf
    });
  }

  // Der Listener für addHitBtn kann genauso bleiben, aber es schadet nicht, ihn auch anzupassen:
  const addHitBtn = document.getElementById('addHitBtn');
  if (addHitBtn) {
    addHitBtn.addEventListener('click', function(event) { // Sicher ist sicher
      event.stopPropagation(); // Verhindert auch hier unerwünschtes Bubbling
      addCurrentHit();
    });
  }

// In Ihrer viewer-final.js
// NEUE, ERWEITERTE updateHelpers() FUNKTION
function updateHelpers() {
  // Holen der UI-Elemente
  const progressBar = document.getElementById('progressBar'); // Korrigierte ID
  const removeHitBtn = document.getElementById('removeHitBtn');
  const addHitBtn = document.getElementById('addHitBtn');

  // Sicherheitsabfrage
  if (!progressBar || !removeHitBtn || !addHitBtn) return;

  // Die zwei zentralen Bedingungen
  const hasTreffer = matchPages.size > 0;
  const isCurrentlyOnMatchPage = matchPages.has(currentPage);

  // --- Logik für die Sichtbarkeit der Fortschrittsanzeige ---
  progressBar.style.display = hasTreffer ? 'block' : 'none';
  
  // Aktualisiere die anderen Helfer nur, wenn es auch Treffer gibt
  if (hasTreffer) {
    updateCurrentMatchInfo();
    updateProgressBar();
  } else {
    // Wenn keine Treffer, setze die Anzeigen explizit zurück
    document.getElementById('currentMatchInfo').textContent = '';
    document.getElementById('progressFill').style.width = '0%';
  }

  // --- Logik für Add/Remove-Buttons (wie von Ihnen gewünscht) ---
  removeHitBtn.style.display = 'none';
  addHitBtn.style.display = 'none';

  if (isCurrentlyOnMatchPage) {
    removeHitBtn.style.display = 'block';
  } else {
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

// ===================================================================
//   FINALE, ENDGÜLTIGE 'printCurrentPage' (MIT KORREKTER SKALIERUNG)
// ===================================================================
function printCurrentPage() {
  const viewer = document.getElementById('pdfViewer');
  const canvas = viewer.querySelector('canvas');

  if (!canvas) return alert('Kein Inhalt zum Drucken verfügbar.');

  const dataUrl = canvas.toDataURL('image/png');
  const win = window.open('', '_blank');

  if (!win) return alert('Pop-up-Blocker verhindert das Drucken.');

  win.document.write(`
    <html>
      <head>
        <title>Druckansicht - ${document.title}</title>
        <style>
          /* Stile, die immer gelten (sowohl Vorschau als auch Druck) */
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
          }
          .print-container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          img {
            /* === HIER IST DIE MAGIE DER SKALIERUNG === */
            /* Das Bild darf maximal so breit und so hoch wie sein Container sein. */
            max-width: 100%;
            max-height: 100%;
            /* Behält das Seitenverhältnis bei, während es in den Container eingepasst wird. */
            object-fit: contain;
          }

          /* Spezifische Regeln nur für den Druck-Kontext */
          @media print {
            @page {
              size: A4; /* Definiert das Papierformat */
              margin: 15mm; /* Ein angemessener Rand */
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
            <img src="${dataUrl}">
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(window.close, 100);
            }, 0);
          };
        <\/script>
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
  const limit = 15;
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


// ===== KORRIGIERTE VERSION FÜR viewer-final.js =====

/**
 * Zeigt den modalen Passwort-Dialog an und übernimmt die komplette Login-Logik.
 * Gibt 'true' bei Erfolg zurück, 'false' bei Abbruch.
 */
function showPasswordDialogAndLogin() {
    return new Promise((resolve) => {
        const overlay = document.getElementById('password-dialog-overlay');
        const passwordInput = document.getElementById('passwordInput');
        const submitButton = document.getElementById('submitButton');
        const cancelButton = document.getElementById('cancelLoginBtn');
        const status = document.getElementById('status');

        // Dialog anzeigen und Zustand zurücksetzen
        overlay.style.display = 'flex';
        passwordInput.value = '';
        status.textContent = '';
        passwordInput.focus();

        // Interne Funktion, die die Passwortprüfung durchführt
        const attemptLogin = async () => {
            const password = passwordInput.value.trim();
            if (!password) {
                status.textContent = 'Bitte geben Sie ein Passwort ein.';
                passwordInput.focus();
                return;
            }

            status.textContent = 'Prüfe Passwort...';
            submitButton.disabled = true;

            try {
                await validatePassword(password);
                
                // ERFOLG!
                localStorage.setItem('customerDataPassword', password);
                overlay.style.display = 'none';
                resolve(true); // <--- Kein Alert, nur das Ergebnis zurückgeben

            } catch (error) {
                // FEHLER!
                status.textContent = 'Das Passwort ist falsch. Bitte erneut versuchen.';
                passwordInput.focus(); // Fokus zurück ins Feld
                passwordInput.select(); // Text markieren für einfache Überschreibung
                submitButton.disabled = false; // Button wieder aktivieren
            }
        };

        // Event-Listener nur einmal zuweisen
        submitButton.onclick = attemptLogin;
        passwordInput.onkeydown = (e) => { if (e.key === 'Enter') attemptLogin(); };
        
        cancelButton.onclick = () => {
            overlay.style.display = 'none'; // Dialog schließen
            resolve(false); // Abbruch signalisieren
        };
    });
}

/**
 * Prüft ein Passwort, indem es versucht, die kundenstamm.enc zu entschlüsseln.
 * Wirft einen Fehler, wenn das Passwort falsch ist.
 */
async function validatePassword(password) {
    const encryptedFilePath = 'https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/kundenstamm.enc';
    const response = await fetch(encryptedFilePath + '?t=' + new Date( ).getTime());
    if (!response.ok) throw new Error('Kundendatei nicht erreichbar');
    const encryptedArrayBuffer = await response.arrayBuffer();
    
    // Die decryptData-Funktion wird hier nur zur Validierung genutzt
    const ITERATIONS = 480000, SALT_SIZE_BYTES = 16, NONCE_SIZE_BYTES = 12;
    const salt = encryptedArrayBuffer.slice(0, SALT_SIZE_BYTES);
    const nonce = encryptedArrayBuffer.slice(SALT_SIZE_BYTES, SALT_SIZE_BYTES + NONCE_SIZE_BYTES);
    const data = encryptedArrayBuffer.slice(SALT_SIZE_BYTES + NONCE_SIZE_BYTES);
    const passwordKey = await window.crypto.subtle.importKey('raw', new TextEncoder().encode(password), { name: 'PBKDF2' }, false, ['deriveKey']);
    const aesKey = await window.crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: ITERATIONS, hash: 'SHA-256' }, passwordKey, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
    await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aesKey, data);
}

/**
 * Aktualisiert die Sichtbarkeit der Login/Logout-Buttons basierend auf dem Anmeldestatus.
 */
/**
 * Aktualisiert die Sichtbarkeit und den Inhalt der Login/Logout-Buttons 
 * für Desktop UND Mobile.
 */
function updateAuthUI() {
    // Elemente finden
    const loginBtnDesktop = document.getElementById('loginBtn');
    const logoutBtnDesktop = document.getElementById('logoutBtn');
    const mobileAuthLink = document.getElementById('mobileAuthLink'); // Unser neuer Link

    // Prüfen, ob der Nutzer angemeldet ist
    const isLoggedIn = !!localStorage.getItem('customerDataPassword');

    // Sicherheitsabfrage, falls Elemente nicht gefunden werden
    if (!loginBtnDesktop || !logoutBtnDesktop || !mobileAuthLink) {
        console.error("Ein oder mehrere Authentifizierungs-Buttons wurden nicht im DOM gefunden.");
        return;
    }

    if (isLoggedIn) {
        // --- ZUSTAND: EINGELOGGT ---
        // Desktop-Ansicht
        loginBtnDesktop.style.display = 'none';
        logoutBtnDesktop.style.display = 'block';

        // Mobile-Ansicht
        mobileAuthLink.innerHTML = '<i class="bi bi-box-arrow-right"></i> Abmelden';
        mobileAuthLink.onclick = () => {
            // Führt die gleiche Aktion wie der Desktop-Logout-Button aus
            document.getElementById('logoutBtn').click(); 
            closeMobileNav(); // Schließt das Menü
            return false;
        };

    } else {
        // --- ZUSTAND: AUSGELOGGT ---
        // Desktop-Ansicht
        loginBtnDesktop.style.display = 'block';
        logoutBtnDesktop.style.display = 'none';

        // Mobile-Ansicht
        mobileAuthLink.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Anmelden';
        mobileAuthLink.onclick = () => {
            // Führt die gleiche Aktion wie der Desktop-Login-Button aus
            document.getElementById('loginBtn').click();
            closeMobileNav(); // Schließt das Menü
            return false;
        };
    }
}


// ===== KORRIGIERTE VERSION FÜR viewer-final.js =====

/**
 * Startet den optionalen Login-Prozess beim Laden der Seite.
 * Zeigt Fehler jetzt direkt im Dialog an.
 */
/**
 * Startet den optionalen Login-Prozess beim Laden der Seite.
 */
async function initializeAuth() {
    // Event-Listener für den manuellen Login-Button
    document.getElementById('loginBtn').addEventListener('click', async () => {
        const success = await showPasswordDialogAndLogin();
        if (success) {
            alert('Anmeldung erfolgreich!');
            updateAuthUI();
        }
    });

// ===== FINALE VERSION (OHNE BESTÄTIGUNG) =====

// Event-Listener für den Logout-Button
document.getElementById('logoutBtn').addEventListener('click', () => {
    // Die Aktionen werden jetzt sofort ausgeführt.
    localStorage.removeItem('customerDataPassword');
    location.reload();
});


// if (!localStorage.getItem('customerDataPassword')) {
//     const success = await showPasswordDialogAndLogin();
//     if (success) {
//         updateAuthUI();
//     }
// }

    
    // UI in jedem Fall aktualisieren (z.B. wenn der Benutzer schon angemeldet war)
    updateAuthUI();
}


// ===== NEU: FUNKTION ZUM ÖFFNEN GESCHÜTZTER SEITEN =====

function openBerichte(event) {
    // Verhindert, dass der Link "#" die Seite nach oben springen lässt.
    if (event) {
        event.preventDefault();
    }

    // Liest das Passwort aus dem zentralen Speicher.
    const password = localStorage.getItem('customerDataPassword');
    
    let targetUrl = 'Retourenschein/berichte.html';

    // Nur wenn ein Passwort vorhanden ist, wird es an die URL angehängt.
    if (password) {
        targetUrl += `#password=${encodeURIComponent(password)}`;
    }

    // Öffnet das neue Fenster. Die Zielseite kümmert sich um den Rest.
    window.open(targetUrl, '_blank', 'noopener=no');
}


function resetApplication() {
  // Die Sicherheitsabfrage "if (isMobileDevice())" wurde entfernt.
  updateHelpers(); 
  console.log("Anwendung wird zurückgesetzt...");

  // 1. Leere die Suchfelder
  document.getElementById('searchBox').value = '';
  document.getElementById('searchBox2').value = '';

  // 2. Suchergebnis-Informationen zurücksetzen
  document.getElementById('searchInfo').textContent = '';
  document.getElementById('currentMatchInfo').textContent = '';
  matchPages.clear();

  // 3. UI-Helfer aktualisieren
  updateHelpers();
  
  // 4. Leere die Merkliste
  merkliste.splice(0, merkliste.length);
  
  // 5. Aktualisiere das Merklisten-Icon
  updateMerklisteIcon();

  // 6. Zoomfaktor zurücksetzen
  zoomFactor = 1.0;
  
  // 7. Finde das Standard-PDF
  const defaultPdf = pdfsData.find(pdf => pdf.isDefault);
  
  if (defaultPdf) {
    currentDocumentName = defaultPdf.name;
    loadAndRenderPdf(defaultPdf.path);
  } else {
    console.error("Kein Standard-PDF zum Zurücksetzen gefunden.");
  }
  
  // 8. Setze den Fokus zurück ins erste Suchfeld
  const searchBox = document.getElementById('searchBox');
  if(searchBox) {
      searchBox.focus();
  }
}


// ===================================================================
//   DIESE FUNKTIONEN MÜSSEN AUSSERHALB VON window.onload STEHEN
// ===================================================================

function populateDocList() {
  const listContainer = document.getElementById('docDialogList');
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
      
      const pdfNameForListener = pdf.name; 

      link.addEventListener('click', (e) => {
        e.preventDefault();
        currentDocumentName = pdfNameForListener;
        loadAndRenderPdf(e.target.dataset.path);
        document.getElementById('docDialog').style.display = 'none';
      });
      groupDiv.appendChild(link);
    });
    listContainer.appendChild(groupDiv);
  }
}

async function initializeDocumentHandling() {
  try {
    const response = await fetch('pdf/pdfs.json?v=' + new Date().getTime());
    pdfsData = await response.json();

    globalPdfCache = pdfsData.map(pdf => ({
      name: pdf.name,
      path: pdf.path,
      category: pdf.category,
      seitenTexte: [],
      geladen: false
    }));

    populateDocList();

    const defaultPdf = pdfsData.find(pdf => pdf.isDefault);
    const initialPdfPath = defaultPdf ? defaultPdf.path : (pdfsData.length > 0 ? pdfsData[0].path : '');
    const initialPdfName = defaultPdf ? defaultPdf.name : (pdfsData.length > 0 ? pdfsData[0].name : 'Kein Dokument geladen');

    if (initialPdfPath) {
      currentDocumentName = initialPdfName;
      await loadAndRenderPdf(initialPdfPath); 
    } else {
      document.getElementById('pdfViewer').innerHTML = '<h2>Keine Dokumente konfiguriert.</h2>';
      updateHeaderDocumentName();
    }

    startLazyLoading();

  } catch (error) {
    console.error("Fehler beim Laden oder Verarbeiten von pdfs.json:", error);
    alert("Die Konfigurationsdatei für die Dokumente konnte nicht geladen werden.");
  }
}




// ===================================================================
//   HAUPTFUNKTION, die nach dem Laden der Seite ausgeführt wird
// ===================================================================
async function main() {

  // ===================================================================
  //   INITIALISIERUNGS-LOGIK
  // ===================================================================
  initializeAuth();
  // WICHTIG: Wir warten jetzt korrekt, bis alles geladen ist.
  await initializeDocumentHandling(); 

  // --- Fokus, Datum, etc. ---
  const searchBox = document.getElementById("searchBox");
  if (searchBox) {
    searchBox.focus();
  }
  updateHeaderDate();

  // ===================================================================
  //   ZENTRALE EVENT-LISTENER (Jetzt wird alles korrekt registriert)
  // ===================================================================

  // --- Listener für den Dokumenten-Dialog ---
  const openBtn = document.getElementById('openDocDialogBtn');
  const closeBtn = document.getElementById('closeDocDialogBtn');
  const dialog = document.getElementById('docDialog');
  if (openBtn && dialog && closeBtn) {
      openBtn.addEventListener('click', () => { dialog.style.display = 'flex'; });
      closeBtn.addEventListener('click', () => { dialog.style.display = 'none'; });
  }

  // --- Listener für das Schließen des globalen Such-Overlays ---
  const closeOverlayBtn = document.getElementById('close-search-overlay-btn');
  if (closeOverlayBtn) {
    closeOverlayBtn.addEventListener('click', () => {
      document.getElementById('global-search-overlay').style.display = 'none';
    });
  }

  // --- Listener für die Akkordeon-Funktion im Such-Overlay ---
  const resultsContainer = document.getElementById('global-search-results-container');
  if (resultsContainer) {
    resultsContainer.addEventListener('click', function(e) {
      const trigger = e.target.closest('.accordion-trigger');
      if (!trigger) return;
      const details = trigger.nextElementSibling;
      if (!details) return;
      trigger.classList.toggle('active');
      details.style.display = details.style.display === 'none' ? 'block' : 'none';
    });
  }

   // --- Listener für die 4 Haupt-Buttons ---
  document.getElementById('local-search-btn').addEventListener('click', startLocalSearch);
  document.getElementById('global-search-btn').addEventListener('click', startGlobalSearch);
  document.getElementById('print-current-btn').addEventListener('click', printCurrentPage);
  document.getElementById('print-matches-btn').addEventListener('click', printAllMatches);


  // --- Listener für die Enter-Taste in den Suchfeldern ---
  document.getElementById("searchBox").addEventListener("keydown", function(e) {
    if (e.key === "Enter") startLocalSearch();
  });
  document.getElementById("searchBox2").addEventListener("keydown", function(e) {
    if (e.key === "Enter") startLocalSearch();
  });
  

  // --- Listener für das Hamburger-Menü ---
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const body = document.body;
  if (hamburgerBtn && mobileNav) {
    hamburgerBtn.addEventListener('click', function(event) {
      event.stopPropagation();
      toggleMobileNav();
    });
    body.addEventListener('click', function(event) {
      if (mobileNav.classList.contains('active') && !mobileNav.contains(event.target) && event.target !== hamburgerBtn) {
        closeMobileNav();
      }
    });
  }

  // --- Listener für die Such-Operatoren ---
  const operatorGroup = document.getElementById('search-operator-group');
  if (operatorGroup) {
    operatorGroup.addEventListener('click', function(e) {
      if (e.target.classList.contains('operator-btn')) {
        operatorGroup.querySelectorAll('.operator-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
      }
    });
  }

  // --- Listener für Zoom-Reset auf Mobile ---
  window.addEventListener('focus', function() {
    if (isMobileDevice() && zoomFactor !== 1.0) {
      console.log("Zoom wird auf Standard zurückgesetzt...");
      zoomFactor = 1.0;
      renderPage(currentPage);
    }
  });


  // --- Listener für Touch-Gesten auf dem PDF-Container ---
  const pdfContainer = document.getElementById('pdfContainer');
  if (pdfContainer) {
    // Dein kompletter Code für dblclick, touchstart, touchmove, touchend
    // ... (ich füge ihn hier zur Sicherheit vollständig ein)
    pdfContainer.addEventListener('dblclick', function() {
      if (!isMobileDevice() && currentDocumentPath && pdfDoc) {
        const urlForNewTab = `${currentDocumentPath}#page=${currentPage}`;
        window.open(urlForNewTab, '_blank');
      }
    });
// URSPRÜNGLICHE, WIEDERHERGESTELLTE GESTENSTEUERUNG

let startX = 0, startY = 0, distanzX = 0, distanzY = 0, lastTap = 0;
const pdfViewer = document.getElementById('pdfViewer');

pdfContainer.addEventListener('touchstart', function(e) {
  if (e.touches.length > 1 || !(zoomFactor >= 0.8 && zoomFactor <= 1.2)) {
    return;
  }
  const touch = e.touches[0];
  startX = touch.screenX;
  startY = touch.screenY;
  distanzX = 0;
  distanzY = 0;
  if (pdfViewer) {
    pdfViewer.style.transition = 'none';
  }
});

// NEUER, VERBESSERTER touchmove-Listener

pdfContainer.addEventListener('touchmove', function(e) {
  // Diese Sicherheitsabfragen sind weiterhin wichtig
  if (e.touches.length > 1 || zoomFactor > 1.0) return;

  const touch = e.touches[0];
  distanzX = touch.screenX - startX;
  distanzY = touch.screenY - startY;

  // Nur bei horizontaler Bewegung reagieren
  if (pdfViewer && Math.abs(distanzX) > Math.abs(distanzY)) {
    
    // --- HIER IST DIE VERBESSERTE LOGIK ---
    let bewegung = distanzX;

    // Fall 1: Auf Seite 1 und Versuch, nach rechts zu wischen (zurück)
    if (currentPage === 1 && distanzX > 0) {
      // Dämpfe die Bewegung stark, um einen "Wand"-Effekt zu erzeugen
      bewegung = distanzX / (1 + (distanzX / pdfContainer.clientWidth) * 2);
    } 
    // Fall 2: Auf der letzten Seite und Versuch, nach links zu wischen (vorwärts)
    else if (currentPage === pdfDoc.numPages && distanzX < 0) {
      // Dämpfe die Bewegung in die andere Richtung
      const absDistanz = Math.abs(distanzX);
      bewegung = - (absDistanz / (1 + (absDistanz / pdfContainer.clientWidth) * 2));
    }
    
    // Wende die (ggf. gedämpfte) Bewegung auf die Seite an
    pdfViewer.style.transform = `translateX(${bewegung}px)`;
  }
}, { passive: true });


// FINALE, KORREKTE touchend-FUNKTION

// FINALE, ERWEITERTE touchend-FUNKTION

pdfContainer.addEventListener('touchend', function(event) {
  // Doppel-Tap-Logik (unverändert)
  const currentTime = new Date().getTime();
  const tapLength = currentTime - lastTap;
  lastTap = currentTime;
  if (tapLength < 300 && tapLength > 0 && Math.abs(distanzX) < 20) {
    // ... (Doppel-Tap-Code bleibt gleich) ...
    return;
  }

  const mindestDistanz = pdfContainer.clientWidth * 0.25;
  const pdfViewer = document.getElementById('pdfViewer');

  // --- HIER BEGINNEN DIE ÄNDERUNGEN ---
  let geblaettert = false; // Eine Hilfsvariable, um zu prüfen, ob eine Aktion stattfand

  // Prüfen, ob eine relevante Wischbewegung stattgefunden hat
  if (Math.abs(distanzX) > mindestDistanz && Math.abs(distanzX) > Math.abs(distanzY)) {
    
    // Geste nach LINKS (will zur NÄCHSTEN Seite)
    if (distanzX < 0 && currentPage < pdfDoc.numPages) {
      if (pdfViewer) { pdfViewer.style.transition = 'opacity 0.3s ease-out'; pdfViewer.style.opacity = '0'; }
      setTimeout(() => { document.getElementById('next-page').click(); }, 50);
      geblaettert = true;
    } 
    // Geste nach RECHTS (will zur VORHERIGEN Seite)
    else if (distanzX > 0 && currentPage > 1) {
      if (pdfViewer) { pdfViewer.style.transition = 'opacity 0.3s ease-out'; pdfViewer.style.opacity = '0'; }
      setTimeout(() => { document.getElementById('prev-page').click(); }, 50);
      geblaettert = true;
    }
  }

  // Wenn NICHT geblättert wurde (entweder nicht weit genug gewischt ODER am Anschlag),
  // dann sorge IMMER dafür, dass die Seite zurückschnellt.
  if (!geblaettert && distanzX !== 0) {
    if (pdfViewer) {
      pdfViewer.style.transition = 'transform 0.3s ease-out';
      pdfViewer.style.transform = 'translateX(0)';
    }
  }
  
  // Am Ende IMMER die Distanzen für die nächste Geste zurücksetzen.
  distanzX = 0;
  distanzY = 0;
});


}


// ===================================================================
//   NEU: JAVASCRIPT-BASIERTE TOOLTIP-LOGIK
// ===================================================================
function initializeTooltips() {
  let tooltipElement;

  // Funktion zum Anzeigen des Tooltips
  function showTooltip(event) {
    const target = event.currentTarget;
    const tooltipText = target.getAttribute('data-tooltip');
    if (!tooltipText) return;

    // Erstelle das Tooltip-Element
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'custom-tooltip'; // Eigene Klasse für Styling
    tooltipElement.textContent = tooltipText;
    document.body.appendChild(tooltipElement);

    // Positioniere das Tooltip-Element
    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltipElement.getBoundingClientRect();

    // Berechne die Position, zentriert über dem Element
    let top = targetRect.top - tooltipRect.height - 8; // 8px über dem Element
    let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);

    // Korrigiere, wenn der Tooltip links oder rechts aus dem Fenster ragt
    if (left < 0) {
      left = 5; // Kleiner Abstand vom Rand
    }
    if (left + tooltipRect.width > window.innerWidth) {
      left = window.innerWidth - tooltipRect.width - 5;
    }
    
    // Wenn oben kein Platz ist, zeige ihn unten an
    if (top < 0) {
        top = targetRect.bottom + 8;
    }

    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.top = `${top}px`;

    // Mache den Tooltip nach einer winzigen Verzögerung sichtbar, um die CSS-Animation auszulösen
setTimeout(() => {
    if (tooltipElement) { // Prüfen, ob der Tooltip noch existiert
        tooltipElement.style.opacity = '1';
        tooltipElement.style.transform = 'translateY(0)';
    }
}, 10); // 10 Millisekunden reichen völlig aus

  }

  // Funktion zum Verstecken des Tooltips
  function hideTooltip() {
    if (tooltipElement) {
      tooltipElement.remove();
      tooltipElement = null;
    }
  }

  // Finde ALLE Elemente mit data-tooltip und füge Listener hinzu
  document.querySelectorAll('[data-tooltip]').forEach(element => {
    element.addEventListener('mouseenter', showTooltip);
    element.addEventListener('mouseleave', hideTooltip);
    element.addEventListener('click', hideTooltip); // Versteckt Tooltip bei Klick
  });
}

// Rufen Sie die neue Funktion am Ende von main() auf
initializeTooltips();

}

// ===================================================================
//   DER MODERNE ERSATZ FÜR window.onload
// ===================================================================
// Dieser Listener wartet, bis das gesamte HTML-Dokument fertig geladen ist,
// und ruft dann unsere async Hauptfunktion 'main' auf.
document.addEventListener('DOMContentLoaded', main);



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


