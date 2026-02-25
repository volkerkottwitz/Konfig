// ===== RETOURENSCHEIN-ERWEITERUNG FÜR VIEWER-FINAL.JS (VERSION 4 - FINAL) =====

;(function() {
  'use strict';

  function waitForViewerReady() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (typeof merkliste !== 'undefined' && typeof isMobileDevice !== 'undefined' && typeof updateMerklisteIcon !== 'undefined') {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  waitForViewerReady().then(() => {
    console.log('🔧 Retourenschein-Erweiterung wird geladen...');
    initRetourenscheinExtension();
  });

  function initRetourenscheinExtension() {
    
    window.updateMerklisteFromChild = function(neueMerkliste) {
      merkliste.length = 0;
      Array.prototype.push.apply(merkliste, neueMerkliste);
      console.log('Hauptfenster: Merkliste wurde vom Pop-up synchronisiert.', merkliste);
      updateMerklisteIcon();
    };

    // --- DESKTOP-ANSICHT: MERKLISTEN-DIALOG ---
    window.openMerklisteDialogDesktop = function() {
      if (document.getElementById('merklisteDialog')) return;

      const dialog = document.createElement("div");
      dialog.id = "merklisteDialog";
      Object.assign(dialog.style, { position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999 });

      let merklisteHTML = '';
      if (merkliste.length === 0) {
        merklisteHTML = `<div style="text-align:center; padding:40px 20px; color:#888;">
          <i class="bi bi-inbox" style="font-size:3rem; display:block; margin-bottom:12px; opacity:0.4;"></i>
          <p style="margin:0; font-size:1rem;">Ihre Merkliste ist leer.</p>
        </div>`;
      } else {
        merklisteHTML = merkliste.map((item, index) => {
          const preisText = typeof item.preis === 'number' ? item.preis.toFixed(2).replace('.', ',') + ' \u20AC' : (item.preis || 'n.a.');
          const dbInfo = (typeof lookupArtikel === 'function') ? lookupArtikel(item.nummer) : null;
          const displayName = dbInfo ? dbInfo.klarname : item.name;
          return `
          <div class="ml-card" style="background:#f8f9fa; border-radius:10px; padding:14px 18px; margin-bottom:10px; border-left:4px solid #00a1e1; transition:box-shadow 0.2s ease;"
               onmouseenter="this.style.boxShadow='0 2px 10px rgba(0,0,0,0.1)'" onmouseleave="this.style.boxShadow='none'">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
              <div style="flex:1; min-width:0;">
                <div style="font-weight:600; color:#333; margin-bottom:4px;">${displayName}</div>
                <div style="font-size:0.85rem; color:#666;">Art.-Nr. ${item.nummer}</div>
              </div>
              <div style="text-align:right; white-space:nowrap; font-weight:600; color:#005A8C;">${preisText}</div>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:10px; border-top:1px solid #e9ecef;">
              <div style="display:flex; align-items:center; gap:8px;">
                <label style="font-size:0.85rem; color:#555;">Menge:</label>
                <input type="number" min="1" value="${item.menge}" data-index="${index}" class="menge-input"
                       style="width:60px; padding:6px 8px; border:1px solid #dee2e6; border-radius:6px; text-align:center; font-size:14px; font-family:'Roboto Condensed',sans-serif;">
              </div>
              <button data-index="${index}" class="entfernen-btn" title="Artikel entfernen"
                      style="background:none; border:none; color:#999; cursor:pointer; font-size:1.1rem; padding:4px 8px; border-radius:6px; transition:color 0.2s ease;"
                      onmouseenter="this.style.color='#dc3545'" onmouseleave="this.style.color='#999'">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>`;
        }).join('');
      }

      dialog.innerHTML = `
        <div style="background:#fff; border-radius:14px; max-width:550px; width:90%; font-family:'Roboto Condensed',sans-serif; box-shadow:0 8px 30px rgba(0,0,0,0.2); max-height:80vh; display:flex; flex-direction:column; overflow:hidden;">
          <div style="background:linear-gradient(135deg,#005A8C 0%,#0080b8 50%,#00a1e1 100%); color:white; padding:16px 22px; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:10px;">
              <i class="bi bi-list-check" style="font-size:1.3rem;"></i>
              <h2 style="margin:0; font-size:1.2rem; font-weight:600;">Ihre Merkliste</h2>
              ${merkliste.length > 0 ? `<span style="background:rgba(255,255,255,0.2); padding:2px 10px; border-radius:12px; font-size:0.85rem;">${merkliste.length} Artikel</span>` : ''}
            </div>
            <button id="merklisteSchließenBtn" style="background:none; border:none; color:rgba(255,255,255,0.8); cursor:pointer; font-size:1.2rem; padding:4px;" title="Schließen">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div style="padding:18px 22px; overflow-y:auto; flex:1;">
            ${merklisteHTML}
          </div>
          <div style="padding:14px 22px; border-top:1px solid #eee; display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
            <button id="retourenscheinBtn" style="padding:10px 20px; background:#00a1e1; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-family:'Roboto Condensed',sans-serif; font-weight:600; transition:background 0.2s ease;"
                    onmouseenter="this.style.background='#0080b8'" onmouseleave="this.style.background='#00a1e1'">
              <i class="bi bi-arrow-return-left"></i> Retoure
            </button>
            <button id="jetztAnfragenBtn" style="padding:10px 20px; background:#00a1e1; color:white; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-family:'Roboto Condensed',sans-serif; font-weight:600; transition:background 0.2s ease;"
                    onmouseenter="this.style.background='#0080b8'" onmouseleave="this.style.background='#00a1e1'">
              <i class="bi bi-file-text"></i> Anfrage
            </button>
          </div>
        </div>`;

      document.body.appendChild(dialog);

      // Hilfsfunktion: Dialog schliessen und Retourenschein/Anfrage oeffnen
      function openProtectedWindow(baseUrl) {
        if (merkliste && merkliste.length > 0) localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
        document.body.removeChild(dialog);
        const password = localStorage.getItem('customerDataPassword');
        let targetUrl = baseUrl;
        if (password) targetUrl += `#password=${encodeURIComponent(password)}`;
        window.open(targetUrl, '_blank', 'noopener=no');
      }

      // Retourenschein-Button
      if (document.getElementById("retourenscheinBtn")) {
        document.getElementById("retourenscheinBtn").addEventListener("click", () => {
          openProtectedWindow('./Retourenschein/retourenschein.html');
        });
      }

      // Anfrage-Button
      if (document.getElementById("jetztAnfragenBtn")) {
        document.getElementById("jetztAnfragenBtn").addEventListener("click", () => {
          openProtectedWindow('./Retourenschein/interneAnfrage.html');
        });
      }

      // Schliessen-Button + Overlay-Klick
      document.getElementById("merklisteSchließenBtn").addEventListener("click", () => { document.body.removeChild(dialog); });
      dialog.addEventListener("click", (e) => { if (e.target === dialog) document.body.removeChild(dialog); });

      // Menge aendern
      dialog.querySelectorAll(".menge-input").forEach(input => {
        input.addEventListener("change", (e) => {
          const idx = parseInt(e.target.dataset.index, 10);
          const neueMenge = parseInt(e.target.value, 10);
          if (!isNaN(neueMenge) && neueMenge > 0) {
            merkliste[idx].menge = neueMenge;
            localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
          }
        });
      });

      // Artikel entfernen (click kann auf <i> innerhalb des Buttons landen)
      dialog.querySelectorAll(".entfernen-btn").forEach(button => {
        button.addEventListener("click", (e) => {
          const btn = e.target.closest('.entfernen-btn');
          const idx = parseInt(btn.dataset.index, 10);
          merkliste.splice(idx, 1);
          localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
          document.body.removeChild(dialog);
          openMerklisteDialogDesktop();
          updateMerklisteIcon();
        });
      });
    };

    // --- MOBILE-ANSICHT: MERKLISTEN-POP-UP ---
    window.openMerklisteMobile = function () {
      localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
      const baseUrl = window.location.href.replace(/\/[^\/]*$/, '/');
      const retourenUrl = baseUrl + 'Retourenschein/retourenschein.html';
      const anfrageUrl = baseUrl + 'Retourenschein/interneAnfrage.html';
      const merklisteWindow = window.open('', '_blank');

      merklisteWindow.document.write(`
        <html>
          <head>
            <title>Ihre Merkliste</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">
            <style>
              body {
                font-family: 'Roboto Condensed', sans-serif;
                margin: 0;
                padding: 20px;
                background: #f0f2f5;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
              }

              .main-container {
                background: white;
                border-radius: 14px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
                max-width: 500px;
                width: 100%;
                position: relative;
                overflow: hidden;
                margin-bottom: 20px;
                animation: fadeInUp 0.4s ease;
              }

              .ml-header {
                background: linear-gradient(135deg, #005A8C 0%, #0080b8 50%, #00a1e1 100%);
                color: white;
                padding: 16px 22px;
                display: flex;
                align-items: center;
                gap: 10px;
              }
              .ml-header h1 { margin: 0; font-size: 1.3rem; font-weight: 600; }
              .ml-header .count { background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 12px; font-size: 0.85rem; }

              .ml-body { padding: 18px 22px; }

              .artikel {
                background: #f8f9fa;
                border-radius: 10px;
                padding: 14px 18px;
                margin: 0 0 10px 0;
                border-left: 4px solid #00a1e1;
                text-align: left;
              }

              .artikel-name { font-weight: 600; color: #333; margin-bottom: 4px; }
              .artikel-nr { font-size: 0.85rem; color: #666; }
              .artikel-preis { text-align: right; white-space: nowrap; font-weight: 600; color: #005A8C; }

              .artikel-aktionen {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid #e9ecef;
              }

              .mengen-steuerung { display: flex; align-items: center; gap: 8px; }
              .mengen-steuerung label { font-size: 0.85rem; color: #555; }

              .quantity-input {
                width: 70px;
                padding: 8px 10px;
                font-size: 16px;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                text-align: center;
                font-family: 'Roboto Condensed', sans-serif;
              }
              .quantity-input:focus { outline: none; border-color: #00a1e1; box-shadow: 0 0 0 3px rgba(0,161,225,0.15); }

              .entfernen-btn {
                background: none;
                color: #999;
                border: none;
                padding: 6px 10px;
                cursor: pointer;
                font-size: 1.1rem;
                border-radius: 6px;
                transition: color 0.2s ease;
              }
              .entfernen-btn:hover { color: #dc3545; }

              .ml-footer {
                padding: 14px 22px;
                border-top: 1px solid #eee;
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
              }

              .btn {
                padding: 12px 22px;
                border: none;
                border-radius: 8px;
                font-size: 15px;
                font-weight: 600;
                cursor: pointer;
                font-family: 'Roboto Condensed', sans-serif;
                transition: background 0.2s ease;
              }
              .btn-primary { background: #00a1e1; color: white; }
              .btn-primary:hover { background: #0080b8; }
              .btn-secondary { background: #e9ecef; color: #495057; }
              .btn-secondary:hover { background: #dee2e6; }

              .empty-state {
                text-align: center;
                padding: 40px 20px;
                color: #888;
              }
              .empty-state i { font-size: 3rem; display: block; margin-bottom: 12px; opacity: 0.4; }

              @media (max-width: 600px) {
                .main-container { margin: 0; }
                .ml-footer { flex-direction: column; }
                .btn { width: 100%; }
                .artikel-aktionen { flex-direction: column; gap: 12px; align-items: stretch; }
                .mengen-steuerung { justify-content: center; }
                .quantity-input { min-height: 44px; }
              }

              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
              }
            </style>
          </head>
          <body>
            <div class="main-container">
              <div class="ml-header">
                <i class="bi bi-list-check" style="font-size:1.3rem;"></i>
                <h1>Ihre Merkliste</h1>
              </div>
              <div class="ml-body" id="merklisteContainer"></div>
              <div class="ml-footer" id="merklisteFooter"></div>
            </div>
            <script>
              let merkliste = JSON.parse(localStorage.getItem('merklisteForRetourenschein') || '[]');

              function renderMerkliste() {
                const container = document.getElementById('merklisteContainer');
                const footer = document.getElementById('merklisteFooter');
                const countEl = document.querySelector('.ml-header .count');

                if (merkliste.length === 0) {
                  container.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><p>Ihre Merkliste ist leer.</p></div>';
                  footer.innerHTML = \`
                    <button class="btn btn-primary" onclick="openProtectedWindow('${retourenUrl}')"><i class="bi bi-arrow-return-left"></i> Retoure</button>
                    <button class="btn btn-primary" onclick="openProtectedWindow('${anfrageUrl}')"><i class="bi bi-file-text"></i> Anfrage</button>
                    <button class="btn btn-secondary" onclick="window.close()">Schliessen</button>\`;
                  return;
                }

                // Artikel-Zaehler im Header
                const headerH1 = document.querySelector('.ml-header h1');
                if (!document.querySelector('.ml-header .count')) {
                  const span = document.createElement('span');
                  span.className = 'count';
                  span.textContent = merkliste.length + ' Artikel';
                  headerH1.after(span);
                } else {
                  document.querySelector('.ml-header .count').textContent = merkliste.length + ' Artikel';
                }

                container.innerHTML = '';
                merkliste.forEach((item, index) => {
                  const div = document.createElement('div');
                  div.className = 'artikel';
                  div.innerHTML = \`
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                      <div style="flex:1; min-width:0;">
                        <div class="artikel-name">\${item.name}</div>
                        <div class="artikel-nr">Art.-Nr. \${item.nummer}</div>
                      </div>
                      <div class="artikel-preis">\${typeof item.preis === 'number' ? item.preis.toFixed(2).replace('.', ',') + ' \u20AC' : (item.preis || 'n.a.')}</div>
                    </div>
                    <div class="artikel-aktionen">
                      <div class="mengen-steuerung">
                        <label>Menge:</label>
                        <input type="number" class="quantity-input" min="1" value="\${item.menge}" onchange="updateMenge(this, \${index})">
                      </div>
                      <button class="entfernen-btn" onclick="removeItem(\${index})" title="Entfernen"><i class="bi bi-trash"></i></button>
                    </div>\`;
                  container.appendChild(div);
                });

                footer.innerHTML = \`
                  <button class="btn btn-primary" onclick="openProtectedWindow('${retourenUrl}')"><i class="bi bi-arrow-return-left"></i> Retoure</button>
                  <button class="btn btn-primary" onclick="openProtectedWindow('${anfrageUrl}')"><i class="bi bi-file-text"></i> Anfrage</button>
                  <button class="btn btn-secondary" onclick="window.close()">Schliessen</button>\`;
              }

              function updateMenge(input, index) {
                const neueMenge = parseInt(input.value);
                if (!isNaN(neueMenge) && neueMenge > 0) {
                  merkliste[index].menge = neueMenge;
                  localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
                  if (window.opener && window.opener.updateMerklisteFromChild) window.opener.updateMerklisteFromChild(merkliste);
                } else { input.value = merkliste[index].menge; }
              }

              function removeItem(index) {
                merkliste.splice(index, 1);
                localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
                if (window.opener && window.opener.updateMerklisteFromChild) window.opener.updateMerklisteFromChild(merkliste);
                renderMerkliste();
              }

              function openProtectedWindow(baseUrl) {
                const password = window.opener ? window.opener.localStorage.getItem('customerDataPassword') : null;
                let targetUrl = baseUrl;
                if (password) targetUrl += \`#password=\${encodeURIComponent(password)}\`;
                window.open(targetUrl, '_blank', 'noopener=no');
              }

              document.addEventListener('keydown', (event) => { if (event.key === 'Escape') window.close(); });
              renderMerkliste();
            <\/script>
          </body>
        </html>
      `);
    };

    if (typeof window.openMerkliste === 'undefined') {
      window.openMerkliste = function () {
        if (isMobileDevice()) {
          openMerklisteMobile();
        } else {
          openMerklisteDialogDesktop();
        }
      };
    }

    console.log('✅ Retourenschein-Erweiterung erfolgreich geladen!');
  }
})();
