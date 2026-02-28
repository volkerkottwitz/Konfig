let csvGeladen = false;
let pdfGerendert = false;
let wurdeBereitsInitialGerendert = false;

// === 🔧 Variablen für Viewer-Funktionalität ===
// ... (deine bestehenden Variablen)

// NEU: Variablen für die globale Suche und Lazy Loading
let globalPdfCache = [];
let isLazyLoading = false; // Verhindert, dass der Lader mehrfach startet

// === ARTIKEL-DATENBANK (Klarname-Lookup) ===
let artikelDB = null; // wird async geladen
fetch('artikel_db.json')
  .then(r => r.json())
  .then(data => { artikelDB = data; console.log(`Artikel-DB geladen: ${Object.keys(data).length} Artikel`); })
  .catch(err => console.warn('Artikel-DB konnte nicht geladen werden:', err));

// Artikel-Lookup: Gibt {bezeichnung, klarname, preis} zurück oder null
function lookupArtikel(nummer) {
  if (!artikelDB || !nummer) return null;
  const clean = String(nummer).replace(/\D/g, '').padStart(7, '0');
  const entry = artikelDB[clean];
  if (!entry) return null;
  return {
    bezeichnung: entry.b,
    klarname: entry.a || entry.b,
    preis: entry.p != null ? entry.p.toFixed(2).replace('.', ',') + ' \u20AC' : 'n.a.'
  };
}

// Artikel-Info-Banner anzeigen wenn Suchbegriff eine Artikelnummer ist
function zeigeArtikelInfo(suchbegriff) {
  // Altes Banner entfernen
  const altesBanner = document.getElementById('artikel-info-banner');
  if (altesBanner) altesBanner.remove();

  if (!suchbegriff || !artikelDB) return;

  // Pruefen ob der Suchbegriff eine Artikelnummer sein koennte (5-7 Ziffern)
  const clean = suchbegriff.trim().replace(/\D/g, '');
  if (clean.length < 5 || clean.length > 7) return;

  const info = lookupArtikel(clean);
  if (!info) return;

  const artNr = clean.padStart(7, '0');
  const banner = document.createElement('div');
  banner.id = 'artikel-info-banner';
  const bannerMobil = isMobileDevice() ? 'margin:6px 10px; font-size:0.85rem; padding:8px 12px;' : 'margin:6px auto; max-width:600px; padding:8px 16px;';
  banner.style.cssText = 'background:linear-gradient(135deg,#005A8C,#00a1e1); color:white; border-radius:8px; font-family:"Roboto Condensed",sans-serif; box-shadow:0 2px 8px rgba(0,0,0,0.15); display:flex; align-items:center; gap:10px; font-size:0.9rem;' + bannerMobil;
  banner.innerHTML = `
    <div style="flex:1; min-width:0;">
      <div style="font-weight:600; line-height:1.3;">${info.klarname}</div>
      <div style="font-size:0.8rem; opacity:0.85; margin-top:2px;">${artNr} &middot; ${info.preis}</div>
    </div>
    <button id="banner-add-merkliste" style="background:rgba(255,255,255,0.25); border:none; color:white; border-radius:6px; padding:5px 10px; cursor:pointer; font-size:0.8rem; font-family:'Roboto Condensed',sans-serif; font-weight:600; white-space:nowrap; transition:background 0.2s ease;"
            onmouseenter="this.style.background='rgba(255,255,255,0.4)'" onmouseleave="this.style.background='rgba(255,255,255,0.25)'">
      <i class="bi bi-plus-lg"></i> Merkliste
    </button>
    <button onclick="this.closest('#artikel-info-banner').remove()" style="background:none; border:none; color:rgba(255,255,255,0.6); cursor:pointer; font-size:0.85rem; padding:2px 4px;" title="Schließen">✕</button>`;

  // Merkliste-Button Event
  banner.querySelector('#banner-add-merkliste').addEventListener('click', function() {
    const preisZahl = info.preis !== 'n.a.' ? parseFloat(info.preis.replace(/[^\d,]/g, '').replace(',', '.')) : 0;
    addToMerkliste({ name: info.klarname, nummer: artNr, preisZahl: preisZahl }, 1);
    updateMerklisteIcon();
    this.innerHTML = '<i class="bi bi-check-lg"></i> Hinzugefügt';
    this.style.background = 'rgba(40,167,69,0.5)';
    this.disabled = true;
    // Banner nach kurzer Bestätigung automatisch schließen
    setTimeout(() => { banner.remove(); }, 800);
  });

  // Banner nach der Suchleiste einfuegen
  const infoSection = document.getElementById('infoSection');
  if (infoSection) infoSection.parentNode.insertBefore(banner, infoSection);
}

// === ARTIKEL-AUTOCOMPLETE (Dropdown bei Nummerneingabe) ===
function initArtikelAutocomplete() {
  const searchBox = document.getElementById('searchBox');
  if (!searchBox) return;

  // Dropdown-Container erstellen
  const dropdown = document.createElement('div');
  dropdown.id = 'artikel-autocomplete';
  dropdown.style.cssText = 'display:none; position:absolute; left:0; right:0; top:100%; background:white; border:1px solid #dee2e6; border-top:none; border-radius:0 0 8px 8px; box-shadow:0 4px 12px rgba(0,0,0,0.15); max-height:250px; overflow-y:auto; z-index:9999; font-family:"Roboto Condensed",sans-serif;';

  // searchBox braucht einen relativ positionierten Wrapper
  const wrapper = document.createElement('div');
  wrapper.id = 'searchBox-wrapper';
  wrapper.style.cssText = 'position:relative; width:240px;';
  // Mobile: Wrapper uebernimmt die Breite der searchBox
  if (isMobileDevice()) {
    wrapper.style.width = '90%';
    wrapper.style.maxWidth = '320px';
  }
  searchBox.parentNode.insertBefore(wrapper, searchBox);
  wrapper.appendChild(searchBox);
  wrapper.appendChild(dropdown);
  // searchBox soll im Wrapper volle Breite nutzen
  searchBox.style.width = '100%';

  let ausgewaehlt = -1; // Fuer Pfeiltasten-Navigation

  searchBox.addEventListener('input', function() {
    const val = this.value.trim();
    const nurZiffern = val.replace(/\D/g, '');

    // Nur bei 2+ Ziffern und wenn es wie eine Nummer aussieht
    if (nurZiffern.length < 2 || !artikelDB || !/^\d+$/.test(val.trim())) {
      dropdown.style.display = 'none';
      ausgewaehlt = -1;
      return;
    }

    // Artikel suchen: Ziffern muessen irgendwo in der 7-stelligen Nummer vorkommen
    const treffer = [];
    for (const [nr, entry] of Object.entries(artikelDB)) {
      if (nr.includes(nurZiffern)) {
        treffer.push({ nr, ...entry });
        if (treffer.length >= 8) break;
      }
    }

    if (treffer.length === 0) {
      dropdown.style.display = 'none';
      ausgewaehlt = -1;
      return;
    }

    dropdown.innerHTML = treffer.map((t, i) => {
      const name = t.a || t.b;
      const preis = t.p != null ? t.p.toFixed(2).replace('.', ',') + ' \u20AC' : 'n.a.';
      return `<div class="ac-item" data-nr="${t.nr}" style="padding:8px 12px; cursor:pointer; border-bottom:1px solid #f0f0f0; transition:background 0.1s ease;"
                   onmouseenter="this.style.background='#e8f4fd'" onmouseleave="this.style.background='${i === ausgewaehlt ? '#e8f4fd' : 'white'}'">
        <div style="display:flex; justify-content:space-between; align-items:baseline; gap:8px;">
          <span style="font-weight:600; color:#333; font-size:0.9rem;">${t.nr}</span>
          <span style="font-weight:600; color:#005A8C; font-size:0.85rem; white-space:nowrap;">${preis}</span>
        </div>
        <div style="font-size:0.82rem; color:#666; line-height:1.3; margin-top:2px;">${name}</div>
      </div>`;
    }).join('');

    dropdown.style.display = 'block';
    ausgewaehlt = -1;

    // Klick-Handler fuer Vorschlaege
    dropdown.querySelectorAll('.ac-item').forEach(item => {
      item.addEventListener('click', function() {
        searchBox.value = this.dataset.nr;
        dropdown.style.display = 'none';
        startLocalSearch();
      });
    });
  });

  // Pfeiltasten + Enter
  searchBox.addEventListener('keydown', function(e) {
    const items = dropdown.querySelectorAll('.ac-item');
    if (dropdown.style.display === 'none' || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      ausgewaehlt = Math.min(ausgewaehlt + 1, items.length - 1);
      items.forEach((el, i) => el.style.background = i === ausgewaehlt ? '#e8f4fd' : 'white');
      items[ausgewaehlt].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      ausgewaehlt = Math.max(ausgewaehlt - 1, 0);
      items.forEach((el, i) => el.style.background = i === ausgewaehlt ? '#e8f4fd' : 'white');
      items[ausgewaehlt].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && ausgewaehlt >= 0) {
      e.preventDefault();
      searchBox.value = items[ausgewaehlt].dataset.nr;
      dropdown.style.display = 'none';
      startLocalSearch();
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
      ausgewaehlt = -1;
    }
  });

  // Dropdown schliessen bei Klick ausserhalb
  document.addEventListener('click', function(e) {
    if (!wrapper.contains(e.target)) {
      dropdown.style.display = 'none';
      ausgewaehlt = -1;
    }
  });
}

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

    statusElement.textContent = `Dokumente laden \u2026 ${geladeneAnzahl} / ${globalPdfCache.length}`;
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
      statusElement.textContent = 'Alle Dokumente geladen';
      setTimeout(() => { statusElement.style.display = 'none'; }, 2000);
      isLazyLoading = false;
    }
  };

  loadNext();
}




// === Gedruckte Seitennummer aus PDF-Seitentext extrahieren ===
function extractPrintedPageNumberFromText(text) {
  if (!text) return '';
  const head = text.substring(0, 300).trim();
  // Muster 1 (gerade Seiten, links): "1.02 Preisliste..." (auch mit fuehrendem Whitespace)
  const match1 = head.match(/^\s*(\d+\.\d{2})\s/);
  if (match1) return match1[1];
  // Muster 2 (ungerade Seiten, rechts): "...Preisliste 1.03..."
  const match2 = head.match(/Preisliste\s+(\d+\.\d{2})/);
  if (match2) return match2[1];
  // Muster 3 (Fallback): Seitennummer irgendwo im Format X.XX am Anfang
  const match3 = head.match(/(\d+\.\d{2})\s+Preisliste/);
  if (match3) return match3[1];
  return '';
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
      const pageInfoEl = document.getElementById('page-info');
      pageInfoEl.className = 'status-pill pill-page';
      pageInfoEl.innerHTML = `Seite ${pageNum} / ${pdfDoc.numPages}`;
      // Gedruckte Seitennummer asynchron nachladen
      page.getTextContent().then(tc => {
        const text = tc.items.map(item => item.str).join(' ');
        const printed = extractPrintedPageNumberFromText(text);
        if (printed) {
          pageInfoEl.innerHTML = `Seite ${pageNum} / ${pdfDoc.numPages} &middot; PL Seite ${printed}`;
        }
      }).catch(err => console.warn('[PageNum] Text-Extraktion fehlgeschlagen:', err));
      updateNavigation();
      updateHelpers(); // <--- DER ENTSCHEIDENDE AUFRUF IST WIEDER HIER

      setTimeout(() => {
          viewer.style.transition = 'opacity 0.3s ease-in';
          viewer.style.opacity = '1';
          viewer.style.transform = '';
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



// === Treffer-Hervorhebungen entfernen ===
function clearHighlights() {
  document.querySelectorAll('.highlight-box, .article-click-box, .line-click-box').forEach(el => el.remove());
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

  // === ARTIKEL-ERKENNUNG: 7-stellige Nummer im Suchfeld? ===
  zeigeArtikelInfo(term1);

  // === NEUE, VERBESSERTE PRÜFUNG ===
  // Die Suche wird nur gestartet, wenn mindestens ein Feld Text enthält
  // UND dieser Text mindestens 2 Zeichen lang ist.
  if ((!term1 || term1.length < 2) && (!term2 || term2.length < 2)) {
    const searchInfo = document.getElementById('searchInfo');
    searchInfo.className = 'status-pill pill-warn';
    searchInfo.innerHTML = 'Bitte mindestens 2 Zeichen eingeben.';
    setTimeout(() => {
      searchInfo.innerHTML = '';
      searchInfo.className = '';
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
    // Schnelle Pruefung: Gibt es Treffer in anderen Dokumenten?
    const globalCount = countGlobalMatchDocs(term1, term2);
    if (globalCount > 0) {
      searchInfo.className = 'status-pill pill-search';
      searchInfo.innerHTML = `Nicht in diesem Dokument &mdash; in ${globalCount} anderen gefunden`;
      startGlobalSearch();
    } else {
      searchInfo.className = 'status-pill pill-error';
      searchInfo.innerHTML = 'Keine Treffer in allen Dokumenten.';
      setTimeout(() => {
        if (searchInfo.innerHTML.includes('Keine Treffer')) {
          searchInfo.innerHTML = '';
          searchInfo.className = '';
        }
      }, 5000);
    }
  }
}

// === Schnelle Zaehlung: In wie vielen ANDEREN Dokumenten gibt es Treffer? ===
function countGlobalMatchDocs(rawTerm1, rawTerm2) {
  const tokens1 = tokenizeQuery(rawTerm1 || '');
  const tokens2 = tokenizeQuery(rawTerm2 || '');
  if (tokens1.length === 0 && tokens2.length === 0) return 0;

  const regexes1 = tokens1.map(t => new RegExp(expandZollQuery(t), 'gi'));
  const regexes2 = tokens2.map(t => new RegExp(expandZollQuery(t), 'gi'));
  const searchOperator = document.querySelector('.operator-btn.active')?.dataset.op || 'und';

  let docCount = 0;
  for (const doc of globalPdfCache) {
    if (!doc.geladen) continue;
    // Aktuelles Dokument ueberspringen
    if (doc.path === currentDocumentPath) continue;

    let found = false;
    for (let i = 0; i < doc.seitenTexte.length && !found; i++) {
      const norm = normalize(doc.seitenTexte[i]);
      const g1 = regexes1.length > 0 ? regexes1.every(r => { r.lastIndex = 0; return r.test(norm); }) : true;
      const g2 = regexes2.length > 0 ? regexes2.every(r => { r.lastIndex = 0; return r.test(norm); }) : true;
      const g2any = regexes2.length > 0 ? regexes2.some(r => { r.lastIndex = 0; return r.test(norm); }) : false;

      let match = false;
      if (tokens1.length > 0 && tokens2.length === 0) match = g1;
      else if (tokens1.length === 0 && tokens2.length > 0) match = g2;
      else if (tokens1.length > 0 && tokens2.length > 0) {
        if (searchOperator === 'und') match = g1 && g2;
        else if (searchOperator === 'oder') match = g1 || g2;
        else if (searchOperator === 'ohne') match = g1 && !g2any;
      }
      if (match) found = true;
    }
    if (found) docCount++;
  }
  return docCount;
}

// ===================================================================
//   SCHRITT 1: Intelligenter Tokenizer für Multi-Keyword & Phrasensuche
// ===================================================================
/**
 * Zerlegt einen Suchstring in einzelne Wörter und exakte Phrasen.
 * Phrasen werden mit Anführungszeichen (") definiert.
 * @param {string} query - Die komplette Eingabe aus einem Suchfeld.
 * @returns {string[]} - Ein Array von Such-Tokens (Wörter und Phrasen).
 */
function tokenizeQuery(query) {
  if (!query || typeof query !== 'string') {
    return [];
  }
  
  const tokens = [];
  // Dieser reguläre Ausdruck findet entweder eine Phrase in Anführungszeichen
  // oder ein einzelnes, nicht-leeres Wort.
  const regex = /"([^"]+)"|\S+/g;
  
  let match;
  while ((match = regex.exec(query)) !== null) {
    // Wenn match[1] existiert, ist es eine Phrase. Ansonsten ist es ein einzelnes Wort (match[0]).
    tokens.push(match[1] || match[0]);
  }
  
  return tokens;
}


// ===================================================================
//   SCHRITT 2: startGlobalSearch mit neuer Logik ersetzen
// ===================================================================
function startGlobalSearch() {
  // 1. Eingaben aus beiden Feldern holen und mit der neuen Funktion zerlegen
  const tokens1 = tokenizeQuery(document.getElementById('searchBox').value);
  const tokens2 = tokenizeQuery(document.getElementById('searchBox2').value);

  if (tokens1.length === 0 && tokens2.length === 0) {
    alert('Bitte geben Sie mindestens einen Suchbegriff ein.');
    return;
  }

  document.getElementById('loadingSpinnerOverlay').style.display = 'flex';

  // 2. Für jeden Token eine erweiterte Regex erstellen
  const regexes1 = tokens1.map(token => new RegExp(expandZollQuery(token), 'gi'));
  const regexes2 = tokens2.map(token => new RegExp(expandZollQuery(token), 'gi'));

  const searchOperator = document.querySelector('.operator-btn.active')?.dataset.op || 'und';
  const allResults = [];
  const geladeneDokumente = globalPdfCache.filter(p => p.geladen);

  for (const doc of geladeneDokumente) {
    for (let i = 0; i < doc.seitenTexte.length; i++) {
      const pageText = doc.seitenTexte[i];
      const normalizedPageText = normalize(pageText);

      // 3. Prüfen, ob die Bedingungen für jede Gruppe erfüllt sind
      // Gruppe 1: ALLE Tokens aus Feld 1 müssen vorhanden sein
      const group1Match = regexes1.length > 0 ? regexes1.every(regex => {
        regex.lastIndex = 0; // Wichtig für globale Regexes in Schleifen
        return regex.test(normalizedPageText);
      }) : true;

      // Gruppe 2: ALLE Tokens aus Feld 2 müssen vorhanden sein (für UND/ODER)
      const group2Match = regexes2.length > 0 ? regexes2.every(regex => {
        regex.lastIndex = 0;
        return regex.test(normalizedPageText);
      }) : true; // Standardmäßig true, wird durch Operatorlogik gesteuert

      // Für OHNE: MINDESTENS EIN Token aus Feld 2 reicht zum Ausschließen
      const group2AnyMatch = regexes2.length > 0 ? regexes2.some(regex => {
        regex.lastIndex = 0;
        return regex.test(normalizedPageText);
      }) : false;

      // 4. Die Ergebnisse der Gruppen mit dem Operator verknüpfen
      let isMatch = false;
      if (tokens1.length > 0 && tokens2.length === 0) {
        isMatch = group1Match;
      } else if (tokens1.length === 0 && tokens2.length > 0) {
        isMatch = group2Match;
      } else if (tokens1.length > 0 && tokens2.length > 0) {
        switch (searchOperator) {
          case 'und': isMatch = group1Match && group2Match; break;
          case 'oder': isMatch = group1Match || group2Match; break;
          case 'ohne': isMatch = group1Match && !group2AnyMatch; break;
        }
      }
      
      if (isMatch) {
        const headline = extractHeadline(pageText);
        allResults.push({
          docName: doc.name,
          docPath: doc.path,
          pageNumber: i + 1,
          headline: headline,
          context: getContextSnippet(pageText, tokens1, tokens2) // Übergibt die Token-Arrays
        });
      }
    }
  }

  displayGlobalResults(allResults, { 
      term1: document.getElementById('searchBox').value, 
      term2: document.getElementById('searchBox2').value,
      isFromGlobalSearch: true
  });
  
  document.getElementById('loadingSpinnerOverlay').style.display = 'none';
}



// ===================================================================
//   SCHRITT 3: getContextSnippet für Token-Arrays anpassen
// ===================================================================
function getContextSnippet(pageText, tokens1, tokens2, length = 250) {
  // 1. Text bereinigen: Steuerzeichen, mehrfache Leerzeichen, Tabs zusammenfassen
  const cleaned = pageText
    .replace(/[\r\t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .replace(/ {2,}/g, ' ')
    .replace(/[^\S\n]+/g, ' ')
    .trim();

  const normCleaned = normalize(cleaned);
  const allTokens = [...tokens1, ...tokens2];
  let index = -1;

  // 2. Position des ersten Tokens finden
  if (allTokens.length > 0) {
    try {
      const firstTokenRegex = new RegExp(expandZollQuery(allTokens[0]), 'i');
      index = normCleaned.search(firstTokenRegex);
    } catch (e) { /* ignorieren */ }
  }

  if (index === -1) {
    const fallback = cleaned.substring(0, length);
    const cut = fallback.lastIndexOf(' ');
    return (cut > length * 0.6 ? fallback.substring(0, cut) : fallback) + '\u2026';
  }

  // 3. Ausschnitt um den Treffer: 1/3 davor, 2/3 danach
  let start = Math.max(0, index - Math.floor(length / 3));
  let end = Math.min(cleaned.length, start + length);

  // An Wortgrenzen ausrichten
  if (start > 0) {
    const spaceAfter = cleaned.indexOf(' ', start);
    if (spaceAfter !== -1 && spaceAfter - start < 20) start = spaceAfter + 1;
  }
  if (end < cleaned.length) {
    const spaceBefore = cleaned.lastIndexOf(' ', end);
    if (spaceBefore > start && end - spaceBefore < 20) end = spaceBefore;
  }

  let snippet = cleaned.substring(start, end);

  // 4. Zeilenumbrueche durch Trennzeichen ersetzen fuer saubere Darstellung
  snippet = snippet.replace(/\n/g, ' \u00B7 ');

  // 5. Treffer hervorheben
  allTokens.forEach(token => {
    try {
      const highlightRegex = new RegExp(expandZollQuery(token), 'gi');
      snippet = snippet.replace(highlightRegex, '<strong>$&</strong>');
    } catch (e) { /* ignorieren */ }
  });

  const prefix = start > 0 ? '\u2026 ' : '';
  const suffix = end < cleaned.length ? ' \u2026' : '';
  return prefix + snippet + suffix;
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
    titleText = `${results.length} Trefferseiten \u2014 "${term1}" ${operatorText} "${term2}"`;
  } else if (term1) {
    titleText = `${results.length} Trefferseiten \u2014 "${term1}"`;
  } else if (term2) {
    titleText = `${results.length} Trefferseiten \u2014 "${term2}"`;
  } else {
    titleText = `${results.length} Trefferseiten gefunden`;
  }
  titleEl.textContent = titleText;

  if (results.length === 0) {
    container.innerHTML = '<div class="global-search-no-results"><i class="bi bi-search"></i>Keine Ergebnisse gefunden.</div>';
  } else {
    const groupedResults = results.reduce((acc, result) => {
      if (!acc[result.docName]) acc[result.docName] = [];
      acc[result.docName].push(result);
      return acc;
    }, {});

    const anzahlDokumente = Object.keys(groupedResults).length;

    for (const docName in groupedResults) {
      const hitCount = groupedResults[docName].length;
      const groupDiv = document.createElement('div');
      groupDiv.className = 'result-document-group';

      const docTitle = document.createElement('div');
      docTitle.className = 'doc-category-title accordion-trigger';
      docTitle.innerHTML = `<i class="bi bi-chevron-right accordion-arrow"></i> ${docName} <span class="doc-hit-count">${hitCount}</span>`;

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
        const headlineHTML = item.headline
          ? `<span class="result-headline">${item.headline}</span>`
          : '';

        const itemDiv = document.createElement('div');
        itemDiv.className = 'result-item';
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
//   SCHRITT 4: activateSearchContext mit neuer Logik ersetzen
// ===================================================================
function activateSearchContext() {
  // 1. Eingaben aus beiden Feldern holen und tokenizen
  const tokens1 = tokenizeQuery(document.getElementById('searchBox').value);
  const tokens2 = tokenizeQuery(document.getElementById('searchBox2').value);

  // 2. Globale Suchvariablen für die Hervorhebungsfunktion (highlightMatches) vorbereiten
  // Wir erstellen eine große ODER-verknüpfte Regex für jedes Feld.
  searchText = tokens1.length > 0 ? tokens1.map(t => `(${expandZollQuery(t)})`).join('|') : "";
  secondSearchText = tokens2.length > 0 ? tokens2.map(t => `(${expandZollQuery(t)})`).join('|') : "";

  const searchInfo = document.getElementById('searchInfo');
  matchPages.clear();

  if (tokens1.length === 0 && tokens2.length === 0) {
    searchInfo.innerHTML = '';
    searchInfo.className = '';
    updateHelpers();
    updateNavigation();
    return;
  }

  const cacheEntry = globalPdfCache.find(p => p.path === currentDocumentPath);
  if (!cacheEntry || !cacheEntry.geladen) return;

  const searchOperator = document.querySelector('.operator-btn.active')?.dataset.op || 'und';

  // Regex-Objekte für die Trefferzählung
  const regexes1 = tokens1.map(token => new RegExp(expandZollQuery(token), 'gi'));
  const regexes2 = tokens2.map(token => new RegExp(expandZollQuery(token), 'gi'));

  let totalMatches1 = 0;
  let totalMatches2 = 0;

  for (let i = 0; i < cacheEntry.seitenTexte.length; i++) {
    const pageText = cacheEntry.seitenTexte[i];
    if (!pageText) continue;

    const normalizedPageText = normalize(pageText);
    
    // Prüfen, ob die Bedingungen für jede Gruppe erfüllt sind
    const group1Match = regexes1.length > 0 ? regexes1.every(regex => {
      regex.lastIndex = 0;
      return regex.test(normalizedPageText);
    }) : true;

    const group2Match = regexes2.length > 0 ? regexes2.every(regex => {
      regex.lastIndex = 0;
      return regex.test(normalizedPageText);
    }) : true;

    // Für OHNE: MINDESTENS EIN Token aus Feld 2 reicht zum Ausschließen
    const group2AnyMatch = regexes2.length > 0 ? regexes2.some(regex => {
      regex.lastIndex = 0;
      return regex.test(normalizedPageText);
    }) : false;

    let isMatch = false;
    if (tokens1.length > 0 && tokens2.length === 0) {
      isMatch = group1Match;
    } else if (tokens1.length === 0 && tokens2.length > 0) {
      isMatch = group2Match;
    } else if (tokens1.length > 0 && tokens2.length > 0) {
      switch (searchOperator) {
        case 'und': isMatch = group1Match && group2Match; break;
        case 'oder': isMatch = group1Match || group2Match; break;
        case 'ohne': isMatch = group1Match && !group2AnyMatch; break;
      }
    }

    if (isMatch) {
      matchPages.add(i + 1);
      // Zähle die Matches für die Statistik
      regexes1.forEach(regex => { regex.lastIndex = 0; totalMatches1 += (normalizedPageText.match(regex) || []).length; });
      regexes2.forEach(regex => { regex.lastIndex = 0; totalMatches2 += (normalizedPageText.match(regex) || []).length; });
    }
  }

  // NEUER, KORREKTER BLOCK in activateSearchContext

if (matchPages.size > 0) {
  const term1 = document.getElementById('searchBox').value;
  const term2 = document.getElementById('searchBox2').value;
  let statsText = `(${term1}: ${totalMatches1}x`;
  if (term2) {
    statsText += `, ${term2}: ${totalMatches2}x`;
  }
  statsText += `)`;
  
  // 1. Den Link wie gewohnt erstellen
  searchInfo.className = 'status-pill pill-search';
  searchInfo.innerHTML = `<span id="local-search-trigger" title="Klicken fuer eine Uebersicht aller Treffer">${matchPages.size} Seite(n) gefunden</span> ${statsText}`;
  
  // 2. Den Event-Listener DIREKT DANACH an das neu erstellte Element binden
  document.getElementById('local-search-trigger').onclick = () => {
    const localResults = [];
    const tokens1 = tokenizeQuery(term1);
    const tokens2 = tokenizeQuery(term2);
    const cacheEntry = globalPdfCache.find(p => p.path === currentDocumentPath);

    // Iteriere über die sortierten Trefferseiten
    for (const pageNum of [...matchPages].sort((a, b) => a - b)) {
      const pageText = cacheEntry.seitenTexte[pageNum - 1];
      localResults.push({
        docName: cacheEntry.name,
        docPath: cacheEntry.path,
        pageNumber: pageNum,
        headline: extractHeadline(pageText), // Überschrift hinzufügen
        context: getContextSnippet(pageText, tokens1, tokens2) // Snippet erstellen
      });
    }
    
    // Zeige das globale Ergebnis-Overlay mit den lokalen Ergebnissen an
    displayGlobalResults(localResults, { 
      term1: term1, 
      term2: term2, 
      isFromGlobalSearch: false // Wichtig: Signalisiert, dass es eine lokale Übersicht ist
    });
  };

} else {
  searchInfo.innerHTML = '';
  searchInfo.className = '';
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

function countMatches(txt, s1, s2) {
  const c1 = (txt.match(new RegExp(s1, 'g')) || []).length;
  const c2 = s2 ? (txt.match(new RegExp(s2, 'g')) || []).length : c1;
  return s2 ? Math.min(c1, c2) : c1;
}

// === 📏 RESPONSIVE MARKIERUNGSGRÖSSENWERTE MIT ZOOM-ANPASSUNG ===
// ===================================================================
//   HIGHLIGHT-SYSTEM: Markierungen auf dem PDF
//   - EWE-Blau Farbschema (einheitlich)
//   - Positionsberechnung direkt aus Viewport-Koordinaten
//   - Keine Magic Numbers, skaliert korrekt mit Zoom
// ===================================================================

// EWE-Blau Farbkonstanten fuer Markierungen
// Artikelboxen (klein, brauchen weniger Opacity)
const MARK_COLOR_HIT1    = 'rgba(0, 161, 225, 0.20)';  // Suchfeld 1
const MARK_COLOR_HIT2    = 'rgba(0, 90, 140, 0.20)';   // Suchfeld 2
const MARK_COLOR_BOTH    = 'rgba(0, 161, 225, 0.30)';   // Beide Suchfelder
const MARK_COLOR_ARTICLE = 'rgba(0, 161, 225, 0.25)';   // Artikelnummer ohne Suche
// Zeilen-Markierungen (volle Breite, brauchen mehr Opacity)
const LINE_COLOR_HIT1    = 'rgba(0, 161, 225, 0.22)';  // Suchfeld 1 Zeile
const LINE_COLOR_HIT2    = 'rgba(0, 90, 140, 0.22)';   // Suchfeld 2 Zeile
const LINE_COLOR_BOTH    = 'rgba(0, 161, 225, 0.30)';   // Beide Suchfelder Zeile

function highlightMatches(page, container, viewport) {
  const canvas = container.querySelector('canvas');
  const canvasLeftOffset = (container.offsetWidth - canvas.offsetWidth) / 2;
  const scaleX = canvas.offsetWidth / canvas.width;
  const scaleY = canvas.offsetHeight / canvas.height;
  const pad = 1; // Pixel Padding um Markierungen
  const yShift = isMobileDevice() ? -2 : 2; // Mobile: 4px höher
  const lineYShift = isMobileDevice() ? -1 : 3; // Mobile: 4px höher

  page.getTextContent().then(tc => {
    const items = tc.items;
    const lines = {};
    items.forEach(item => {
      const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
      const y = Math.round(tx[5]);
      if (!lines[y]) lines[y] = [];
      lines[y].push({ ...item, tx, y });
    });

    const searchRegex1 = searchText ? new RegExp(searchText, 'gi') : null;
    const searchRegex2 = secondSearchText ? new RegExp(secondSearchText, 'gi') : null;
    const zeilenMitArtikelnummer = new Set();

    // --- Pass 1: Artikelnummern finden und markieren ---
    Object.values(lines).forEach(lineItems => {
      const lineText = lineItems.map(i => i.str).join(' ');
      const lineTextNorm = normalize(lineText);

      const hit1 = searchRegex1 ? searchRegex1.test(lineTextNorm) : false;
      if (searchRegex1) searchRegex1.lastIndex = 0;
      const hit2 = searchRegex2 ? searchRegex2.test(lineTextNorm) : false;
      if (searchRegex2) searchRegex2.lastIndex = 0;

      let bgColor = MARK_COLOR_ARTICLE;
      let lineColor = null;
      let ganzeZeileMarkieren = false;

      if (hit1 && hit2) {
        bgColor = MARK_COLOR_BOTH;
        lineColor = LINE_COLOR_BOTH;
        ganzeZeileMarkieren = true;
      } else if (hit1) {
        bgColor = MARK_COLOR_HIT1;
        lineColor = LINE_COLOR_HIT1;
        ganzeZeileMarkieren = true;
      } else if (hit2) {
        bgColor = MARK_COLOR_HIT2;
        lineColor = LINE_COLOR_HIT2;
        ganzeZeileMarkieren = true;
      }

      const regex = /(?:^|[^\#\w])((?:0392-[A-Z]{5,10}|[0-9]{7}-(?:DIBT|wrs)|0392-[a-zA-Z0-9]{3,}|W[0-9]{6}|[0-9]{7}(?:-(?:V|K|[a-zA-Z0-9]{2,}))?)(\*{1,2})?)/g;

      let match;
      while ((match = regex.exec(lineText)) !== null) {
        const artikelnummer = match[1];

        // Telefonnummern-Filter
        const kontextIndex = match.index;
        const kontextText = lineText.substring(Math.max(0, kontextIndex - 20), kontextIndex);
        if (/mobil|telefon|\+49/i.test(kontextText)) continue;

        const matchStart = match.index + match[0].indexOf(artikelnummer);
        zeilenMitArtikelnummer.add(lineItems[0].y);

        let x, y, width, height;

        if (ganzeZeileMarkieren) {
          // Ganze Zeile markieren (Suchtreffer)
          const topY = Math.min(...lineItems.map(i => i.tx[5] - (Math.abs(i.tx[3]) || 10)));
          const bottomY = Math.max(...lineItems.map(i => i.tx[5]));
          x = canvasLeftOffset;
          y = (topY * scaleY) - pad + lineYShift;
          width = canvas.offsetWidth;
          height = ((bottomY - topY) * scaleY) + (pad * 2);
        } else {
          // Praezise Artikel-Box
          const pos = calculateArticleScreenPosition(lineItems, artikelnummer, matchStart, scaleX, scaleY, canvasLeftOffset, pad, yShift);
          if (!pos) continue;
          x = pos.x; y = pos.y; width = pos.width; height = pos.height;
        }

        const klickDiv = document.createElement('div');
        klickDiv.className = 'article-click-box';

        Object.assign(klickDiv.style, {
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: ganzeZeileMarkieren ? lineColor : bgColor
        });

        // Tooltip mit Klarname + Preis
        const artInfo = lookupArtikel(artikelnummer);
        if (artInfo) {
          klickDiv.setAttribute('data-tooltip', `${artInfo.klarname}\n${artikelnummer}  \u2022  ${artInfo.preis}`);
        } else {
          klickDiv.setAttribute('data-tooltip', `Artikel ${artikelnummer}`);
        }

        klickDiv.setAttribute('data-artikelnummer', artikelnummer);
        klickDiv.setAttribute('data-line-text', lineText);
        klickDiv.setAttribute('data-highlight-type', 'article');
        container.appendChild(klickDiv);
      }
    });

    // --- Pass 2: Zeilen mit Suchtreffer OHNE Artikelnummer ---
    Object.values(lines).forEach(lineItems => {
      const yKey = lineItems[0].y;
      if (zeilenMitArtikelnummer.has(yKey)) return;

      const lineText = lineItems.map(i => i.str).join(' ');
      const lineTextNorm = normalize(lineText);

      const hit1 = searchRegex1 ? searchRegex1.test(lineTextNorm) : false;
      if (searchRegex1) searchRegex1.lastIndex = 0;
      const hit2 = searchRegex2 ? searchRegex2.test(lineTextNorm) : false;
      if (searchRegex2) searchRegex2.lastIndex = 0;

      if (!(hit1 || hit2)) return;

      let bgColor;
      if (hit1 && hit2) {
        bgColor = LINE_COLOR_BOTH;
      } else if (hit1) {
        bgColor = LINE_COLOR_HIT1;
      } else {
        bgColor = LINE_COLOR_HIT2;
      }

      const topY = Math.min(...lineItems.map(i => i.tx[5] - (Math.abs(i.tx[3]) || 10)));
      const bottomY = Math.max(...lineItems.map(i => i.tx[5]));

      const x = canvasLeftOffset;
      const y = (topY * scaleY) - pad + lineYShift;
      const height = ((bottomY - topY) * scaleY) + (pad * 2);
      const width = canvas.offsetWidth;

      const div = document.createElement('div');
      div.className = 'line-click-box';

      Object.assign(div.style, {
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: bgColor
      });

      // Erklaerung im Tooltip: Suchtreffer, aber keine Artikelnummer
      const suchbegriff = (hit1 && hit2) ? `\u201E${searchText}\u201C und \u201E${secondSearchText}\u201C`
        : hit1 ? `\u201E${searchText}\u201C`
        : `\u201E${secondSearchText}\u201C`;
      div.setAttribute('data-tooltip', `Suchtreffer f\u00FCr ${suchbegriff}\nKeine Artikelnummer in dieser Zeile erkannt.`);

      div.setAttribute('data-line-text', lineText);
      div.setAttribute('data-highlight-type', 'line');
      container.appendChild(div);
    });
  });
}

// === Praezise Artikelposition in Bildschirm-Pixeln ===
// item.width/height sind in PDF User Space, tx[] ist in Viewport-Koordinaten.
// vpScale konvertiert von User Space nach Viewport Space.
function calculateArticleScreenPosition(lineItems, artikelnummer, matchStart, scaleX, scaleY, canvasLeftOffset, pad, yShift) {
  try {
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

    // Skalierungsfaktor: PDF User Space -> Viewport
    const origHScale = targetItem.transform ? targetItem.transform[0] : 1;
    const vpScale = origHScale !== 0 ? (targetItem.tx[0] / origHScale) : 1;

    // Zeichenbreite in Viewport-Koordinaten
    const vpTextWidth = (targetItem.width || 10) * vpScale;
    const avgCharWidth = vpTextWidth / Math.max(targetItem.str.length, 1);

    // Texthoehe in Viewport-Koordinaten
    const vpH = Math.abs(targetItem.tx[3]) || 10;

    // Position in Viewport-Koordinaten
    const vpX = targetItem.tx[4] + (charOffset * avgCharWidth);
    const vpY = targetItem.tx[5] - vpH;
    let vpW = (artikelnummer.length + 0.3) * avgCharWidth;

    // Extra Breite fuer lange Artikel-IDs (DIBT, 0392-)
    if (artikelnummer.includes('DIBT') || artikelnummer.startsWith('0392-')) {
      vpW += avgCharWidth * 2;
    }

    // Umrechnung in Bildschirm-Pixel + Padding
    return {
      x: (vpX * scaleX) + canvasLeftOffset - pad,
      y: (vpY * scaleY) - pad + (yShift || 0),
      width: (vpW * scaleX) + (pad * 2),
      height: (vpH * scaleY) + (pad * 2)
    };
  } catch (error) {
    console.warn('Fehler bei Positionsberechnung:', error);
    const firstItem = lineItems[0];
    const vpH = Math.abs(firstItem.tx[3]) || 10;
    return {
      x: (firstItem.tx[4] * scaleX) + canvasLeftOffset - pad,
      y: ((firstItem.tx[5] - vpH) * scaleY) - pad + (yShift || 0),
      width: (artikelnummer.length * 8 * scaleX) + (pad * 2),
      height: (vpH * scaleY) + (pad * 2)
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

  // Klarname aus Artikel-DB
  const dbInfo = lookupArtikel(artikelnummer);
  const displayName = dbInfo ? dbInfo.klarname : bereinigt;

  const roherPreis = artikel.BRUTTOPREIS || "";
  const bruttopreisText = roherPreis
    .toString()
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  const bruttopreisZahl = parseFloat(bruttopreisText) || (dbInfo && dbInfo.preis !== 'n.a.' ? parseFloat(dbInfo.preis.replace(/[^\d,]/g, '').replace(',', '.')) : 0);

  const bruttopreis = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(bruttopreisZahl);

  const articleData = {
    type: 'articleData',
    dialogType: dialogType,
    nummer: artikelnummer,
    name: displayName,
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
  // Klarname aus Artikel-DB nachschlagen falls vorhanden
  const dbInfo = lookupArtikel(articleData.nummer);
  const displayName = dbInfo ? dbInfo.klarname : articleData.name;

  merkliste.push({
    name: displayName,
    nummer: articleData.nummer,
    preis: articleData.preisZahl,
    menge: quantity
  });

  zeigeHinzugefügtOverlay(`${displayName} (${articleData.nummer})`);
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
    top: '70px',
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
    const matchReset = document.getElementById('currentMatchInfo');
    matchReset.innerHTML = '';
    matchReset.className = '';
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
    const matchEl = document.getElementById('currentMatchInfo');
    matchEl.className = 'status-pill pill-match';
    matchEl.innerHTML = `Treffer ${idx} / ${matchPages.size}`;
  } else {
    const matchEl = document.getElementById('currentMatchInfo');
    matchEl.innerHTML = '';
    matchEl.className = '';
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
  
  // Treffer-Navigation: Gruppe ein-/ausblenden
  const hasTreffer = matchPages.size > 0;
  const matchGroup = document.querySelector('.nav-group-matches');
  if (matchGroup) {
    matchGroup.classList.toggle('has-matches', hasTreffer);
  }
  const prevMatchBtn = document.querySelector('.match-nav-btn[onclick="prevMatch()"]');
  const nextMatchBtn = document.querySelector('.match-nav-btn[onclick="nextMatch()"]');
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
  const limit = 25;
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

// Hauptdialog: Artikel anzeigen, Menge erfassen, ggf. erhoehen (Desktop)
function zeigeArtikelDialogDirekt(artikelnummer, artikel) {
  if (document.getElementById('artikelDialog')) return;

  const kompletterText = (
    (artikel.KURZTEXT1 ?? "") + " " + (artikel.KURZTEXT2 ?? "")
  ).trim() || artikel.name || "";
  const bereinigt = bereinigeText(kompletterText);

  // Klarname aus Artikel-DB
  const dbInfo = lookupArtikel(artikelnummer);
  const displayName = dbInfo ? dbInfo.klarname : bereinigt;

  // Preis bereinigen und konvertieren
  const roherPreis = artikel.BRUTTOPREIS || "";
  const bruttopreisText = roherPreis
    .toString()
    .replace(/\s/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3})/g, '')
    .replace(',', '.');
  const bruttopreisZahl = parseFloat(bruttopreisText) || (dbInfo && dbInfo.preis !== 'n.a.' ? parseFloat(dbInfo.preis.replace(/[^\d,]/g, '').replace(',', '.')) : 0);

  const bruttopreis = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(bruttopreisZahl);

  const vorhandenerArtikel = merkliste.find(item => item.nummer === artikelnummer);

  // Overlay-Hintergrund erstellen
  function erstelleOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "artikelDialog";
    Object.assign(overlay.style, {
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.4)", display: "flex",
      justifyContent: "center", alignItems: "center", zIndex: 9999
    });
    // Klick auf Overlay schliesst Dialog
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    return overlay;
  }

  // Wenn Artikel bereits in der Merkliste -> Mengen-Dialog
  if (vorhandenerArtikel) {
    const mengeDialog = erstelleOverlay();
    mengeDialog.innerHTML = `
      <div style="background:#fff; border-radius:14px; max-width:440px; width:90%; font-family:'Roboto Condensed',sans-serif; box-shadow:0 8px 30px rgba(0,0,0,0.2); overflow:hidden;">
        <div style="background:linear-gradient(135deg,#005A8C 0%,#0080b8 50%,#00a1e1 100%); color:white; padding:14px 20px; display:flex; align-items:center; gap:10px;">
          <i class="bi bi-info-circle" style="font-size:1.2rem;"></i>
          <h2 style="margin:0; font-size:1.1rem; font-weight:600;">Bereits in der Merkliste</h2>
        </div>
        <div style="padding:20px;">
          <div style="background:#f8f9fa; border-left:4px solid #00a1e1; border-radius:8px; padding:12px 16px; margin-bottom:16px;">
            <div style="font-weight:600; color:#333; line-height:1.3;">${displayName}</div>
            <div style="font-size:0.85rem; color:#666; margin-top:4px;">Art.-Nr. ${artikelnummer} &middot; ${bruttopreis}</div>
          </div>
          <div style="text-align:center; margin-bottom:16px;">
            <span style="font-size:0.9rem; color:#555;">Aktuelle Menge: <strong>${vorhandenerArtikel.menge}</strong></span>
          </div>
          <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:20px;">
            <label style="font-size:0.9rem; color:#555;">Zusaetzlich:</label>
            <input id="anzahlInput" type="number" min="1" value="1"
                   style="width:70px; padding:8px; font-size:15px; border-radius:6px; border:1px solid #dee2e6; text-align:center; font-family:'Roboto Condensed',sans-serif;">
          </div>
          <div style="display:flex; justify-content:center; gap:10px;">
            <button id="abbrechenBestaetigung" style="padding:10px 18px; background:#e9ecef; color:#495057; border:none; border-radius:8px; cursor:pointer; font-family:'Roboto Condensed',sans-serif; font-weight:600; font-size:0.9rem;">Abbrechen</button>
            <button id="entfernenArtikel" style="padding:10px 18px; background:none; color:#dc3545; border:1px solid #dc3545; border-radius:8px; cursor:pointer; font-family:'Roboto Condensed',sans-serif; font-weight:600; font-size:0.9rem;">
              <i class="bi bi-trash"></i> Entfernen
            </button>
            <button id="bestaetigenHinzufuegen" style="padding:10px 18px; background:#00a1e1; color:white; border:none; border-radius:8px; cursor:pointer; font-family:'Roboto Condensed',sans-serif; font-weight:600; font-size:0.9rem;">
              <i class="bi bi-plus-lg"></i> Hinzufuegen
            </button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(mengeDialog);

    document.getElementById("abbrechenBestaetigung").addEventListener("click", () => mengeDialog.remove());

    document.getElementById("entfernenArtikel").addEventListener("click", () => {
      const index = merkliste.findIndex(item => item.nummer === artikelnummer);
      if (index !== -1) {
        merkliste.splice(index, 1);
        zeigeHinzugefügtOverlay(`${displayName} wurde entfernt`);
      }
      mengeDialog.remove();
      updateMerklisteIcon();
    });

    document.getElementById("bestaetigenHinzufuegen").addEventListener("click", () => {
      const zusatzmenge = parseInt(document.getElementById("anzahlInput").value, 10);
      if (isNaN(zusatzmenge) || zusatzmenge < 1) { alert("Bitte eine gueltige Menge eingeben."); return; }
      vorhandenerArtikel.menge += zusatzmenge;
      zeigeHinzugefügtOverlay(`${displayName} (neu: ${vorhandenerArtikel.menge} Stueck)`);
      mengeDialog.remove();
    });

    return;
  }

  // Wenn Artikel noch nicht in der Merkliste -> Hinzufuegen-Dialog
  const dialog = erstelleOverlay();
  dialog.innerHTML = `
    <div style="background:#fff; border-radius:14px; max-width:480px; width:90%; font-family:'Roboto Condensed',sans-serif; box-shadow:0 8px 30px rgba(0,0,0,0.2); overflow:hidden;">
      <div style="background:linear-gradient(135deg,#005A8C 0%,#0080b8 50%,#00a1e1 100%); color:white; padding:14px 20px; display:flex; align-items:center; gap:10px;">
        <i class="bi bi-plus-circle" style="font-size:1.2rem;"></i>
        <h2 style="margin:0; font-size:1.1rem; font-weight:600;">Artikel zur Merkliste</h2>
      </div>
      <div style="padding:20px;">
        <div style="background:#f8f9fa; border-left:4px solid #00a1e1; border-radius:8px; padding:12px 16px; margin-bottom:16px;">
          <div style="font-weight:600; color:#333; line-height:1.3;">${displayName}</div>
          <div style="font-size:0.85rem; color:#666; margin-top:4px;">Art.-Nr. ${artikelnummer} &middot; ${bruttopreis}</div>
        </div>
        <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-bottom:20px;">
          <label style="font-size:0.9rem; color:#555;">Anzahl:</label>
          <input id="anzahlInput" type="number" min="1" value="1"
                 style="width:70px; padding:8px; font-size:15px; border-radius:6px; border:1px solid #dee2e6; text-align:center; font-family:'Roboto Condensed',sans-serif;">
        </div>
        <div style="display:flex; justify-content:center; gap:10px;">
          <button id="abbrechenBtn" style="padding:10px 18px; background:#e9ecef; color:#495057; border:none; border-radius:8px; cursor:pointer; font-family:'Roboto Condensed',sans-serif; font-weight:600; font-size:0.9rem;">Abbrechen</button>
          <button id="hinzufuegenBtn" style="padding:10px 18px; background:#00a1e1; color:white; border:none; border-radius:8px; cursor:pointer; font-family:'Roboto Condensed',sans-serif; font-weight:600; font-size:0.9rem;">
            <i class="bi bi-plus-lg"></i> Hinzufuegen
          </button>
        </div>
      </div>
    </div>`;

  document.body.appendChild(dialog);

  document.getElementById("abbrechenBtn").addEventListener("click", () => dialog.remove());

  document.getElementById("hinzufuegenBtn").addEventListener("click", () => {
    const menge = parseInt(document.getElementById("anzahlInput").value, 10);
    if (isNaN(menge) || menge < 1) { alert("Bitte eine gueltige Anzahl eingeben."); return; }

    merkliste.push({
      name: displayName,
      nummer: artikelnummer,
      preis: bruttopreisZahl,
      menge: menge
    });

    zeigeHinzugefügtOverlay(`${displayName} (${artikelnummer})`);
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

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    if (isIOS) {
      doc.save("Merkliste.pdf");
    } else {
      const pdfData = doc.output('blob');
      const url = URL.createObjectURL(pdfData);
      window.open(url);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
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
 * Prüft ein Passwort gegen das Envelope-Encryption-System (keys.json).
 * Fallback: Alte Methode (kundenstamm.enc) fuer das Shared-Passwort.
 * Wirft einen Fehler, wenn das Passwort falsch ist.
 */
async function validatePassword(password) {
    // --- Methode 1: Envelope Encryption (keys.json) ---
    try {
        const keysResp = await fetch('Retourenschein/keys.json?t=' + Date.now());
        if (keysResp.ok) {
            const keysData = await keysResp.json();
            for (const entry of keysData.users) {
                try {
                    const salt = Uint8Array.from(atob(entry.salt), c => c.charCodeAt(0));
                    const nonce = Uint8Array.from(atob(entry.nonce), c => c.charCodeAt(0));
                    const encKey = Uint8Array.from(atob(entry.key), c => c.charCodeAt(0));
                    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
                    const derivedKey = await crypto.subtle.deriveKey(
                        { name: 'PBKDF2', salt, iterations: 480000, hash: 'SHA-256' },
                        keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
                    );
                    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, derivedKey, encKey);
                    return; // Erfolg — Passwort ist gueltig
                } catch (e) { continue; }
            }
        }
    } catch (e) { /* keys.json nicht erreichbar, Fallback nutzen */ }

    // --- Methode 2: Fallback auf kundenstamm.enc (altes Shared-Passwort) ---
    const encryptedFilePath = 'https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/kundenstamm.enc';
    const response = await fetch(encryptedFilePath + '?t=' + Date.now());
    if (!response.ok) throw new Error('Kundendatei nicht erreichbar');
    const encryptedArrayBuffer = await response.arrayBuffer();
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
  const resetSearchInfo = document.getElementById('searchInfo');
  resetSearchInfo.innerHTML = '';
  resetSearchInfo.className = '';
  const resetMatchInfo = document.getElementById('currentMatchInfo');
  resetMatchInfo.innerHTML = '';
  resetMatchInfo.className = '';
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

  // --- Toggle fuer erweiterte Suche (Mobile) ---
  const toggleAdvBtn = document.getElementById('toggle-advanced-search');
  const advSection = document.getElementById('advanced-search-section');
  if (toggleAdvBtn && advSection) {
    toggleAdvBtn.addEventListener('click', () => {
      const isExpanded = advSection.classList.toggle('expanded');
      toggleAdvBtn.classList.toggle('active', isExpanded);
      toggleAdvBtn.querySelector('i').className = isExpanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
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
// GESTENSTEUERUNG (Swipe, Tap, Zoom-Erkennung)

let startX = 0, startY = 0, distanzX = 0, distanzY = 0, lastTap = 0;
let currentGesture = 'none';
let touchStartTime = 0;
let lastMoveTime = 0;
let lastMoveX = 0;
const pdfViewer = document.getElementById('pdfViewer');

// Erkennt ob die Seite nativ gezoomt ist (Pinch-Zoom)
function isNativeZoomed() {
  if (window.visualViewport) {
    return window.visualViewport.scale > 1.05;
  }
  return false;
}

// Event-Delegation fuer Artikel-Klicks
pdfContainer.addEventListener('click', function(event) {
  if (currentGesture === 'browser-pan' || currentGesture === 'swipe-to-page') {
    return;
  }

  const target = event.target.closest('.article-click-box, .line-click-box');
  if (!target) return;

  const type = target.getAttribute('data-highlight-type');
  const lineText = target.getAttribute('data-line-text');

  if (type === 'article') {
    const artikelnummer = target.getAttribute('data-artikelnummer');
    const artikel = artikelMap.get(artikelnummer);
    if (artikel) {
      openArticleDialog(artikelnummer, artikel, 'add');
    } else {
      const pseudoArtikel = { nummer: artikelnummer, name: lineText, preis: 0 };
      openArticleDialog(artikelnummer, pseudoArtikel, 'add');
    }
  }
  else if (type === 'line') {
    if (isMobileDevice()) {
      openNoArticleDialog(lineText);
    } else {
      zeigeArtikelDialog(lineText);
    }
  }
}, { passive: true });

// === touchstart ===
pdfContainer.addEventListener('touchstart', function(e) {
  touchStartTime = Date.now();

  // 1. Multi-Touch (Zoom/Pinch)
  if (e.touches.length > 1) {
    currentGesture = 'browser-zoom';
    return;
  }

  // 2. Gezoomt? JS-Zoom ODER nativer Pinch-Zoom → Browser pannen lassen
  const isJsZoomed = !(zoomFactor >= 0.8 && zoomFactor <= 1.2);
  if (isJsZoomed || isNativeZoomed()) {
    currentGesture = 'browser-pan';
    return;
  }

  // 3. Swipe-to-Page (nur bei normalem Zoom)
  currentGesture = 'swipe-to-page';
  const touch = e.touches[0];
  startX = touch.screenX;
  startY = touch.screenY;
  distanzX = 0;
  distanzY = 0;
  lastMoveX = startX;
  lastMoveTime = touchStartTime;
  if (pdfViewer) {
    pdfViewer.style.transition = 'none';
  }
}, { passive: true });

// === touchmove ===
pdfContainer.addEventListener('touchmove', function(e) {
  if (currentGesture !== 'swipe-to-page') {
    if (e.touches.length > 1) {
      currentGesture = 'browser-zoom';
    }
    return;
  }

  const touch = e.touches[0];
  distanzX = touch.screenX - startX;
  distanzY = touch.screenY - startY;

  // Jitter-Filter
  if (Math.abs(distanzX) < 5 && Math.abs(distanzY) < 5) {
    return;
  }

  // Velocity-Tracking (letzte Bewegung merken)
  lastMoveX = touch.screenX;
  lastMoveTime = Date.now();

  if (pdfViewer && Math.abs(distanzX) > Math.abs(distanzY)) {
    let bewegung = distanzX;
    // Rubber-Band an den Raendern
    if (currentPage === 1 && distanzX > 0) {
      bewegung = distanzX / (1 + (distanzX / pdfContainer.clientWidth) * 2);
    }
    else if (currentPage === pdfDoc.numPages && distanzX < 0) {
      const absDistanz = Math.abs(distanzX);
      bewegung = -(absDistanz / (1 + (absDistanz / pdfContainer.clientWidth) * 2));
    }
    pdfViewer.style.transform = `translate3d(${bewegung}px, 0, 0)`;
  }
}, { passive: true });

// === touchend ===
pdfContainer.addEventListener('touchend', function(event) {
  const touchDuration = Date.now() - touchStartTime;

  // Zoom oder Pan → ignorieren, sauber zuruecksetzen
  if (currentGesture === 'browser-zoom' || currentGesture === 'browser-pan') {
    currentGesture = 'none';
    return;
  }

  if (currentGesture !== 'swipe-to-page') {
    currentGesture = 'none';
    return;
  }

  const currentTime = Date.now();
  const tapLength = currentTime - lastTap;

  // === DOPPEL-TAP → PDF im neuen Tab oeffnen ===
  if (tapLength < 300 && tapLength > 0 &&
      Math.abs(distanzX) < 20 &&
      touchDuration < 200) {
    if (currentDocumentPath && pdfDoc) {
      const urlForNewTab = `${currentDocumentPath}#page=${currentPage}`;
      window.open(urlForNewTab, '_blank');
    }
    lastTap = 0;
    currentGesture = 'none';
    return;
  }

  lastTap = currentTime;

  // === WISCH-LOGIK mit Velocity ===
  const mindestDistanz = pdfContainer.clientWidth * 0.25;
  // Velocity: Pixel pro Millisekunde der letzten Bewegung
  const timeSinceLastMove = currentTime - lastMoveTime;
  const velocity = timeSinceLastMove > 0 ? Math.abs(distanzX) / touchDuration : 0;
  // Schneller Flick: niedrigere Distanz-Schwelle
  const istFlick = velocity > 0.4 && Math.abs(distanzX) > 40;
  let geblaettert = false;

  if ((Math.abs(distanzX) > mindestDistanz || istFlick) && Math.abs(distanzX) > Math.abs(distanzY)) {
    if (distanzX < 0 && currentPage < pdfDoc.numPages) {
      if (pdfViewer) {
        pdfViewer.style.transition = 'opacity 0.3s ease-out';
        pdfViewer.style.opacity = '0';
      }
      setTimeout(() => { document.getElementById('next-page').click(); }, 50);
      geblaettert = true;
    }
    else if (distanzX > 0 && currentPage > 1) {
      if (pdfViewer) {
        pdfViewer.style.transition = 'opacity 0.3s ease-out';
        pdfViewer.style.opacity = '0';
      }
      setTimeout(() => { document.getElementById('prev-page').click(); }, 50);
      geblaettert = true;
    }
  }

  // Zurueckschnellen bei zu kurzer Wischbewegung
  if (!geblaettert && Math.abs(distanzX) > 5) {
    if (pdfViewer) {
      pdfViewer.style.transition = 'transform 0.3s ease-out';
      pdfViewer.style.transform = 'translate3d(0, 0, 0)';
    }
  }

  distanzX = 0;
  distanzY = 0;
  currentGesture = 'none';
}, { passive: true });

// === touchcancel (z.B. eingehender Anruf, Systemgeste) ===
pdfContainer.addEventListener('touchcancel', function() {
  if (pdfViewer && currentGesture === 'swipe-to-page') {
    pdfViewer.style.transition = 'transform 0.3s ease-out';
    pdfViewer.style.transform = 'translate3d(0, 0, 0)';
  }
  distanzX = 0;
  distanzY = 0;
  currentGesture = 'none';
}, { passive: true });




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
    tooltipElement.className = 'custom-tooltip';
    // Zeilenumbrueche im Tooltip ermoeglichen
    if (tooltipText.includes('\n')) {
      tooltipElement.innerHTML = tooltipText.replace(/\n/g, '<br>');
    } else {
      tooltipElement.textContent = tooltipText;
    }
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
    element.addEventListener('click', hideTooltip);
  });

  // Event-Delegation fuer dynamische Elemente (article-click-box + line-click-box im PDF)
  document.addEventListener('mouseover', function(e) {
    const box = e.target.closest('.article-click-box[data-tooltip], .line-click-box[data-tooltip]');
    if (box && !box._tooltipBound) {
      box._tooltipBound = true;
      box.addEventListener('mouseenter', showTooltip);
      box.addEventListener('mouseleave', hideTooltip);
      box.addEventListener('click', hideTooltip);
      // Sofort auslösen fuer den aktuellen Hover
      showTooltip({ currentTarget: box });
    }
  });
}

// Rufen Sie die neue Funktion am Ende von main() auf
initializeTooltips();
initArtikelAutocomplete();

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
