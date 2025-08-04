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
        });
      });

      document.getElementById("retourenscheinBtn").addEventListener("click", () => {
        if (merkliste && merkliste.length > 0) {
          localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
        }
        document.body.removeChild(dialog);
        window.open('https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/retourenschein.html', '_blank' );
      });

      document.getElementById("jetztAnfragenBtn").addEventListener("click", () => {
        const dialogElement = document.getElementById('merklisteDialog');
        if (dialogElement) {
            document.body.removeChild(dialogElement);
        }
        generateMerklistePDF(merkliste);
      });

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
          <style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 15px; background-color: #f4f4f4; }
  
  /* Bisherige Styles bleiben erhalten... */
  .button { /* ... */ }
  .retourenschein-btn { /* ... */ }
  .close-btn { /* ... */ }

  /* --- NEUE UND VERBESSERTE STYLES --- */
  .artikel {
    background-color: #ffffff;
    margin-bottom: 12px;
    padding: 15px;
    border: 1px solid #e1e1e1;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  .artikel-info {
    margin-bottom: 12px; /* Abstand zur Aktionszeile */
  }
  .artikel-name {
    font-weight: 600; /* Fettgedruckt */
    font-size: 1.1em;
    display: block; /* Eigene Zeile */
    margin-bottom: 4px;
  }
  .artikel-details {
    color: #555;
    font-size: 0.9em;
  }
  .artikel-aktionen {
    display: flex; /* Flexbox für die Anordnung */
    justify-content: space-between; /* Elemente an die Enden verteilen */
    align-items: center; /* Vertikal zentrieren */
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #f0f0f0; /* Trennlinie */
  }
  .mengen-steuerung {
    display: flex;
    align-items: center;
  }
  .mengen-steuerung label {
    margin-right: 8px;
    font-size: 0.9em;
    color: #333;
  }
  input[type="number"] {
    padding: 6px;
    width: 60px;
    border: 1px solid #ccc;
    border-radius: 5px;
    text-align: center;
  }
  .entfernen-btn { /* Gezielter Style für den Button */
    background: none;
    border: none;
    color: #d9534f; /* Dezentes Rot */
    cursor: pointer;
    font-size: 1rem; /* Größer für leichtere Berührung */
    padding: 0 5px;
  }
</style>
            <title>Ihre Merkliste</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .button {
                display: inline-block; padding: 12px 20px; margin: 10px 5px;
                background: #00a1e1; color: white; text-decoration: none;
                border-radius: 8px; border: none; cursor: pointer; font-size: 14px;
              }
              .retourenschein-btn { background: #28a745; }
              .close-btn { background: #6c757d; }
              .artikel { margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
              .entfernen { color: red; cursor: pointer; margin-top: 4px; display: inline-block; }
              input[type="number"] { padding: 3px; width: 50px; }
            </style>
          </head>
          <body>
            <h1>📝 Ihre Merkliste</h1>
            <div id="merklisteContainer"></div>
            <div style="margin-top: 20px;">
              <button class="button retourenschein-btn" onclick="openRetourenschein()">📋 Retoure</button>
              <button class="button" onclick="requestQuote()">📋 Anfrage</button>
              <button class="button close-btn" onclick="window.close()">Schließen</button>
            </div>
            <script>
              let merkliste = JSON.parse(localStorage.getItem('merklisteForRetourenschein') || '[]');

function renderMerkliste() {
  const container = document.getElementById('merklisteContainer');
  if (merkliste.length === 0) {
    container.innerHTML = '<p style="color: #666; font-style: italic;">Ihre Merkliste ist leer.</p>';
    return;
  }

  container.innerHTML = ''; 
  
  merkliste.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'artikel';
    // KORREKTUR: Das Backtick am Anfang und Ende von innerHTML wird mit einem Backslash maskiert (\`)
    div.innerHTML = \`
      <div class="artikel-info">
        <strong class="artikel-name">\${item.name}</strong>
        <small class="artikel-details">Art.-Nr.: \${item.nummer} &bull; Preis: \${item.preis}</small>
      </div>
      <div class="artikel-aktionen">
        <div class="mengen-steuerung">
          <label for="menge-\${index}">Menge:</label>
          <input type="number" id="menge-\${index}" min="1" value="\${item.menge}" onchange="updateMenge(this, \${index})">
        </div>
        <button class="entfernen-btn" onclick="removeItem(\${index})" title="Artikel entfernen">🗑️</button>
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
                merkliste.splice(index, 1);
                localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
                // NEU: Synchronisiere mit dem Hauptfenster
                if (window.opener && window.opener.updateMerklisteFromChild) {
                  window.opener.updateMerklisteFromChild(merkliste);
                }
                renderMerkliste();
              }

              function openRetourenschein() {
                window.open('https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/retourenschein.html', '_blank' );
              }

              function requestQuote() {
                if (window.opener && typeof window.opener.generateMerklistePDF === 'function') {
                  window.opener.generateMerklistePDF(merkliste);
                }
                window.close();
              }

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