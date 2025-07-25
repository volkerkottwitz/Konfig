// Artikelmenge aktualisieren
export function aktualisiereMenge(array, artikelName, neueMenge) {
  const menge = parseInt(neueMenge, 10);
  if (isNaN(menge) || menge < 1) return;
  const artikel = array.find(item => item.name === artikelName);
  if (artikel) {
    artikel.menge = menge;
    console.log(`Aktualisiert: ${artikel.name} auf ${artikel.menge} Stück`);
  }
}

// Infofenster öffnen/schließen
export function openInfo() {
  document.getElementById('infoModal').style.display = 'flex';
}
export function closeInfo() {
  document.getElementById('infoModal').style.display = 'none';
}

// Kurze Infoanzeige bei Hinzufügen/Entfernen
export function zeigeHinzugefügtOverlay(text) {
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

// Artikeltext bereinigen
export function bereinigeText(text) {
  return text
    .replace(/"{2,}/g, '"')
    .replace(/^"/, '')
    .replace(/([^0-9¼½¾])"$/, '$1')
    .replace(/"$/, '')
    .trim();
}