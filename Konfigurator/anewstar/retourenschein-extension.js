// ===== RETOURENSCHEIN-ERWEITERUNG FÜR VIEWER-FINAL.JS =====
// Diese Datei erweitert die bestehende viewer-final.js um Retourenschein-Funktionalität
// Kann als eigenständige Datei eingebunden werden

(function() {
  'use strict';

  function waitForViewerReady() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (typeof merkliste !== 'undefined' && typeof isMobileDevice !== 'undefined') {
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
    // ====================================================================================
    // NEU: HIER DIE UPDATE-FUNKTION FÜR DAS HAUPTFENSTER EINFÜGEN
    // Diese Funktion wird vom mobilen Pop-up aufgerufen, um die Daten zu synchronisieren.
    // ====================================================================================
    window.updateMerklisteFromChild = function(neueMerkliste) {
      // 'merkliste' hier bezieht sich auf die Variable im Geltungsbereich von viewer-final.js
      merkliste.length = 0; // Leert das Array, ohne die Referenz zu verlieren
      Array.prototype.push.apply(merkliste, neueMerkliste); // Befüllt es mit den neuen Daten
      
      console.log('Hauptfenster: Merkliste wurde vom Pop-up synchronisiert.', merkliste);
      
      // Optional: Wenn Sie einen Zähler oder eine andere Anzeige im Hauptfenster haben,
      // rufen Sie hier die Funktion auf, um diese zu aktualisieren.
      // z.B. updateMerklistenCounterImHeader();
    };


    const originalOpenMerklisteDialogDesktop = window.openMerklisteDialogDesktop;

    window.openMerklisteDialogDesktop = function() {
      // ... Ihr Code für openMerklisteDialogDesktop bleibt unverändert ...
      if (document.getElementById('merklisteDialog')) return;

      const dialog = document.createElement("div");
      dialog.id = "merklisteDialog";
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

      let merklisteHTML = '';
      if (merkliste.length === 0) {
        merklisteHTML = '<p style="text-align: center; color: #666; font-style: italic;">Ihre Merkliste ist leer.</p>';
      } else {
        merklisteHTML = `
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Nr.</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Artikel / Art.-Nr.</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Preis</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Stück</th>
              </tr>
            </thead>
            <tbody>
        `;

merkliste.forEach((item, index) => {
          merklisteHTML += `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${index + 1}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">
                <strong>${item.name}</strong>  

                <small style="color: #666;">${item.nummer}</small>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.preis}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                <input type="number" min="1" value="${item.menge}" 
                       data-index="${index}"
                       style="width: 60px; text-align: center;" 
                       class="menge-input">
                
                
                <button data-index="${index}" class="entfernen-btn" 
                        title="Artikel entfernen"
                        style="margin-left: 8px; background: transparent; color: #dc3545; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 1.1rem; vertical-align: middle; transition: background-color 0.2s;"
                        onmouseover="this.style.backgroundColor='#f0f0f0'"
                        onmouseout="this.style.backgroundColor='transparent'">🗑️</button>
              </td>
            </tr>
          `;
        });

        merklisteHTML += `</tbody></table>`;
      }

      dialog.innerHTML = `
        <div style="background: #fefefe; padding: 25px 30px; border-radius: 14px; max-width: 600px; width: 90%; font-family: 'Segoe UI', sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.2); max-height: 80vh; overflow-y: auto;">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <span style="font-size: 1.5rem; margin-right: 10px;">📝</span>
            <h2 style="margin: 0; font-size: 1.3rem;">Ihre Merkliste</h2>
          </div>
          ${merklisteHTML}
          <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; margin-top: 20px;">
          <button id="jetztKaufenBtn" style="padding: 12px 20px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s;">🛒 Kaufen</button>

          <button id="retourenscheinBtn" style="padding: 12px 20px; background: #00a1e1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s;">📋 Retoure</button>
            <button id="jetztAnfragenBtn" style="padding: 12px 20px; background: #00a1e1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s;">📋 Anfrage</button>
            <button id="merklisteSchließenBtn" style="padding: 12px 20px; background: #6c757d; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s;">Schließen</button>
          </div>
        </div>`;

      document.body.appendChild(dialog);

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

      dialog.querySelectorAll(".entfernen-btn").forEach(button => {
        button.addEventListener("click", (e) => {
          const idx = parseInt(e.target.dataset.index, 10);
          merkliste.splice(idx, 1);
          localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
          document.body.removeChild(dialog);
          openMerklisteDialogDesktop();

          updateMerklisteIcon();
        });
      });

      // Event-Listener für den neuen "Kaufen"-Button
document.getElementById("jetztKaufenBtn").addEventListener("click", () => {
  if (merkliste && merkliste.length > 0) {
    localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
  }
  document.body.removeChild(dialog);
  window.open('kaufen.html', '_blank');
});

      document.getElementById("retourenscheinBtn").addEventListener("click", () => {
        if (merkliste && merkliste.length > 0) {
          localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
        }
        document.body.removeChild(dialog);
window.open('https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/interneAnfrage.html', '_blank', 'noopener=no' );
      });

      document.getElementById("jetztAnfragenBtn").addEventListener("click", () => {
          if (merkliste && merkliste.length > 0) {
          localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
        }
        document.body.removeChild(dialog);
window.open('https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/interneAnfrage.html', '_blank', 'noopener=no' );      });

       // const dialogElement = document.getElementById('merklisteDialog');
       // if (dialogElement) {
       //     document.body.removeChild(dialogElement);
       // }
       // generateMerklistePDF(merkliste);
      //});

      document.getElementById("merklisteSchließenBtn").addEventListener("click", () => {
        document.body.removeChild(dialog);
      });

      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
          document.body.removeChild(dialog);
        }
      });
    };

    window.openMerklisteMobile = function () {
      localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
      const merklisteWindow = window.open('', '_blank');

      merklisteWindow.document.write(`
        <html>
          <head>
            <title>Ihre Merkliste</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              /* === DIALOG-INSPIRIERTES DESIGN === */
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: flex-start;
              }

              .main-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                padding: 30px;
                max-width: 500px;
                width: 100%;
                text-align: center;
                position: relative;
                overflow: hidden;
                margin-bottom: 20px;
              }

              .main-container::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #00a1e1, #0077b6);
              }

              .ewe-logo {
                width: 80px;
                height: auto;
                margin-bottom: 20px;
                opacity: 0.9;
              }

              h1 {
                color: #333;
                margin: 0 0 25px 0;
                font-size: 1.5rem;
                font-weight: 600;
              }

              /* === ARTIKEL-KARTEN === */
              .artikel {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 20px;
                margin: 15px 0;
                border-left: 4px solid #00a1e1;
                text-align: left;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
                transition: all 0.3s ease;
              }

              .artikel:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
              }

              .artikel-info {
                margin-bottom: 15px;
              }

              .artikel-name {
                font-weight: 600;
                font-size: 1.1rem;
                color: #333;
                display: block;
                margin-bottom: 8px;
              }

              .artikel-details {
                color: #555;
                font-size: 0.9rem;
                line-height: 1.5;
              }

              .artikel-details strong {
                color: #333;
              }

              .artikel-aktionen {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 15px;
                padding-top: 15px;
                border-top: 1px solid #e1e5e9;
              }

              .mengen-steuerung {
                display: flex;
                align-items: center;
                gap: 10px;
              }

              .mengen-steuerung label {
                font-weight: 600;
                color: #333;
                font-size: 0.9rem;
              }

              .quantity-input {
                width: 80px;
                padding: 8px 12px;
                font-size: 16px;
                border: 2px solid #e1e5e9;
                border-radius: 8px;
                text-align: center;
                transition: all 0.3s ease;
              }

              .quantity-input:focus {
                outline: none;
                border-color: #00a1e1;
                box-shadow: 0 0 0 3px rgba(0, 161, 225, 0.15);
              }

              .entfernen-btn {
                background: linear-gradient(135deg, #dc3545, #c82333);
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 600;
                transition: all 0.3s ease;
                min-width: 80px;
              }

              .entfernen-btn:hover {
                background: linear-gradient(135deg, #c82333, #a71e2a);
                transform: translateY(-1px);
                box-shadow: 0 3px 8px rgba(220, 53, 69, 0.3);
              }

              /* === BUTTON-CONTAINER === */
              .button-container {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 30px;
                flex-wrap: wrap;
              }

              .btn {
                padding: 14px 24px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 120px;
                position: relative;
                overflow: hidden;
              }

              .btn-primary {
                background: linear-gradient(135deg, #00a1e1, #0077b6);
                color: white;
              }

              .btn-primary:hover {
                background: linear-gradient(135deg, #0077b6, #005577);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0, 161, 225, 0.3);
              }

              .btn-secondary {
                background: #e9ecef;
                color: #495057;
              }

              .btn-secondary:hover {
                background: #dee2e6;
                transform: translateY(-1px);
              }

              .btn-buy { background: #28a745; color: white; } /* Stil für Kaufen-Button */


              /* === EMPTY STATE === */
              .empty-state {
                color: #666;
                font-style: italic;
                text-align: center;
                padding: 40px 20px;
                background: #f8f9fa;
                border-radius: 12px;
                margin: 20px 0;
              }

              /* === MOBILE OPTIMIERUNGEN === */
              @media (max-width: 600px) {
                .main-container {
                  margin: 10px;
                  padding: 20px;
                }

                h1 {
                  font-size: 1.3rem;
                }

                .button-container {
                  flex-direction: column;
                  gap: 10px;
                }

                .btn {
                  width: 100%;
                  min-width: auto;
                }

                .artikel-aktionen {
                  flex-direction: column;
                  gap: 15px;
                  align-items: stretch;
                }

                .mengen-steuerung {
                  justify-content: center;
                }

                .quantity-input {
                  font-size: 16px; /* Verhindert Zoom auf iOS */
                  min-height: 44px;
                }
              }

              /* === ANIMATIONEN === */
              .main-container {
                animation: fadeInUp 0.4s ease;
              }

              @keyframes fadeInUp {
                from {
                  opacity: 0;
                  transform: translateY(30px);
                }
                to {
                  opacity: 1;
                  transform: translateY(0);
                }
              }
            </style>
          </head>
          <body>
            <div class="main-container">
              <img src="https://volkerkottwitz.github.io/Konfig/Konfigurator/images/logo.png" 
                   alt="EWE Logo" class="ewe-logo">
              
              <h1>📝 Ihre Merkliste</h1>
              
              <div id="merklisteContainer"></div>
              
              <div class="button-container">
              <button class="btn btn-buy" onclick="buyItems()">🛒 Kaufen</button>

                <button class="btn btn-primary" onclick="openRetourenschein()">📋 Retoure</button>
                <button class="btn btn-primary" onclick="requestQuote()">📋 Anfrage</button>
                <button class="btn btn-secondary" onclick="window.close()">Schließen</button>
              </div>
            </div>

            <script>
              let merkliste = JSON.parse(localStorage.getItem('merklisteForRetourenschein') || '[]');

              function renderMerkliste() {
                const container = document.getElementById('merklisteContainer');
                if (merkliste.length === 0) {
                  container.innerHTML = '<div class="empty-state">Ihre Merkliste ist leer.</div>';
                  return;
                }

                container.innerHTML = ''; 
                
                merkliste.forEach((item, index) => {
                  const div = document.createElement('div');
                  div.className = 'artikel';
                  div.innerHTML = \`
                    <div class="artikel-info">
                      <strong class="artikel-name">\${item.name}</strong>
                      <div class="artikel-details">
                        <p><strong>Artikelnummer:</strong> \${item.nummer}</p>
                        <p><strong>Preis:</strong> \${item.preis}</p>
                      </div>
                    </div>
                    <div class="artikel-aktionen">
                      <div class="mengen-steuerung">
                        <label for="menge-\${index}">Menge:</label>
                        <input type="number" id="menge-\${index}" class="quantity-input" min="1" value="\${item.menge}" onchange="updateMenge(this, \${index})">
                      </div>
                      <button class="entfernen-btn" onclick="removeItem(\${index})" title="Artikel entfernen">🗑️ Entfernen</button>
                    </div>
                  \`;
                  container.appendChild(div);
                });
              }

              // GEÄNDERT: updateMenge ruft jetzt die Funktion im Hauptfenster auf
              function updateMenge(input, index) {
                const neueMenge = parseInt(input.value);
                if (!isNaN(neueMenge) && neueMenge > 0) {
                  merkliste[index].menge = neueMenge;
                  localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
                  // NEU: Synchronisiere mit dem Hauptfenster
                  if (window.opener && window.opener.updateMerklisteFromChild) {
                    window.opener.updateMerklisteFromChild(merkliste);
                  }
                } else {
                  input.value = merkliste[index].menge;
                }
              }

              // GEÄNDERT: removeItem ruft jetzt die Funktion im Hauptfenster auf
              function removeItem(index) {
                if (confirm('Möchten Sie diesen Artikel wirklich aus der Merkliste entfernen?')) {
                  merkliste.splice(index, 1);
                  localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
                  // NEU: Synchronisiere mit dem Hauptfenster
                  if (window.opener && window.opener.updateMerklisteFromChild) {
                    window.opener.updateMerklisteFromChild(merkliste);
                  }
                  renderMerkliste();
                }
              }
// NEUE FUNKTION FÜR DEN KAUFEN-BUTTON
function buyItems() {
  // Die Merkliste ist bereits aktuell im localStorage.
  // Wir öffnen die kaufen.html Seite und schließen optional das aktuelle Fenster.
  window.open('kaufen.html', '_blank');
  window.close(); // Schließt das mobile Merklisten-Fenster
}

              function openRetourenschein() {
                window.open('https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/retourenschein.html', '_blank' );
              }

              function requestQuote() {
                 window.open('https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/interneAnfrage.html', '_blank', 'noopener=no' );
              }
                 
              //  if (window.opener && typeof window.opener.generateMerklistePDF === 'function') {
              //    window.opener.generateMerklistePDF(merkliste);
              //  }
              //  window.close();
              //}

              // Keyboard-Navigation
              document.addEventListener('keydown', function(event) {
                if (event.key === 'Escape') {
                  window.close();
                }
              });

              renderMerkliste();
            </script>
          </body>
        </html>
      `);
    };

    if (typeof openMerkliste === 'undefined') {
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

