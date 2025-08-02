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
    const originalOpenMerklisteDialogDesktop = window.openMerklisteDialogDesktop;

    window.openMerklisteDialogDesktop = function() {
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
                <strong>${item.name}</strong><br>
                <small style="color: #666;">${item.nummer}</small>
              </td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.preis}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">
                <input type="number" min="1" value="${item.menge}" 
                       data-index="${index}"
                       style="width: 60px; text-align: center;" 
                       class="menge-input">
                <button data-index="${index}" class="entfernen-btn" 
                        style="margin-left: 6px; background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">✖</button>
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
            <button id="retourenscheinBtn" style="padding: 12px 20px; background: #28a745; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s;">📋 Retourenschein</button>
            <button id="jetztAnfragenBtn" style="padding: 12px 20px; background: #00a1e1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background-color 0.2s;">Jetzt Anfragen</button>
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
        window.open('https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/retourenschein.html', '_blank');
      });

      document.getElementById("jetztAnfragenBtn").addEventListener("click", () => {
        document.body.removeChild(dialog);
        generateMerklistePDF(merkliste);
        document.body.removeChild(document.getElementById('merkliste'));
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

    window.openMerklisteMobile = function() {
      localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
      const merklisteWindow = window.open('', '_blank');

      let merklisteHTML = '';
      if (merkliste.length === 0) {
        merklisteHTML = '<p style="text-align: center; color: #666; font-style: italic;">Ihre Merkliste ist leer.</p>';
      } else {
        merklisteHTML = '<ul>';
        merkliste.forEach((item, index) => {
          merklisteHTML += `
            <li style="margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
              <strong>${item.name}</strong><br>
              <small>Art.-Nr.: ${item.nummer}</small><br>
              <small>Preis: ${item.preis}</small><br>
              Menge: <input type="number" min="1" value="${item.menge}" data-index="${index}" class="menge-input" style="width: 60px; text-align: center;">
              <button data-index="${index}" class="entfernen-btn" style="margin-left: 6px; background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">✖</button>
            </li>
          `;
        });
        merklisteHTML += '</ul>';
      }

      merklisteWindow.document.write(`
        <html>
          <head>
            <title>Ihre Merkliste</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .button { display: inline-block; padding: 12px 20px; margin: 10px 5px; background: #00a1e1; color: white; text-decoration: none; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; }
              .retourenschein-btn { background: #28a745; }
              .close-btn { background: #6c757d; }
            </style>
          </head>
          <body>
            <h1>📝 Ihre Merkliste</h1>
            ${merklisteHTML}
            <div style="margin-top: 20px;">
              <button class="button retourenschein-btn" onclick="openRetourenschein()">📋 Retourenschein</button>
              <button class="button" onclick="requestQuote()">Jetzt Anfragen</button>
              <button class="button close-btn" onclick="window.close()">Schließen</button>
            </div>
            <script>
              function openRetourenschein() {
                window.open('https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/retourenschein.html', '_blank');
              }
              function requestQuote() {
                generateMerklistePDF(merkliste);
                window.close();
              }
              document.querySelectorAll(".menge-input").forEach(input => {
                input.addEventListener("change", (e) => {
                  const idx = parseInt(e.target.dataset.index, 10);
                  const neueMenge = parseInt(e.target.value, 10);
                  if (!isNaN(neueMenge) && neueMenge > 0) {
                    merkliste[idx].menge = neueMenge;
                    localStorage.setItem("merklisteForRetourenschein", JSON.stringify(merkliste));
                  } else {
                    e.target.value = merkliste[idx].menge;
                  }
                });
              });
              document.querySelectorAll(".entfernen-btn").forEach(button => {
                button.addEventListener("click", (e) => {
                  const idx = parseInt(e.target.dataset.index, 10);
                  let merkliste = JSON.parse(localStorage.getItem('merklisteForRetourenschein') || '[]');
                  merkliste.splice(idx, 1);
                  localStorage.setItem('merklisteForRetourenschein', JSON.stringify(merkliste));
                  e.target.closest('li').remove();
                  if (merkliste.length === 0) {
                    e.target.closest('body').querySelector('h1').insertAdjacentHTML('afterend', '<p style="text-align: center; color: #666; font-style: italic;">Ihre Merkliste ist leer.</p>');
                  }
                });
              });
            </script>
          </body>
        </html>
      `);
    };

    if (typeof openMerkliste === 'undefined') {
      window.openMerkliste = function() {
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
