// crypto-handler.js

async function initializeCustomerSearch(onSuccess) {
    const encryptedFilePath = 'https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/kundenstamm.enc';
    const kundenSucheInput = document.getElementById('kundenSuche' );

    // Funktion zur Entschlüsselung
// NEUER, KORRIGIERTER CODE
const decryptData = (encryptedData, password) => {
    try {
        // Die Daten aus dem ArrayBuffer extrahieren
        // 16 Bytes Salt + 12 Bytes Nonce + Rest sind die Daten
        const salt = CryptoJS.lib.WordArray.create(encryptedData.slice(0, 16));
        const nonce = CryptoJS.lib.WordArray.create(encryptedData.slice(16, 28));
        const ciphertext = CryptoJS.lib.WordArray.create(encryptedData.slice(28));

        // Schlüssel vom Passwort ableiten (muss exakt wie im Python-Skript sein)
        const key = CryptoJS.PBKDF2(password, salt, {
            keySize: 32 / 4, // 32 Bytes = 256 bits
            iterations: 480000,
            hasher: CryptoJS.algo.SHA256
        });

        // Daten mit AES-GCM entschlüsseln
        // KORREKTUR: Die Parameter werden als separates Objekt übergeben
        const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, {
            iv: nonce,
            mode: CryptoJS.mode.GCM,
            padding: CryptoJS.pad.NoPadding
        });

        const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

        // Prüfen, ob die Entschlüsselung erfolgreich war
        if (decryptedText && decryptedText.length > 0) {
            return decryptedText;
        } else {
            // Dieser Fall tritt ein, wenn das Passwort falsch ist, da GCM die Authentifizierung fehlschlägt
            throw new Error("Decryption failed: Authentication tag mismatch. Likely wrong password.");
        }
    } catch (e) {
        console.error("Decryption error:", e.message);
        return null; // Signalisiert einen Fehler
    }
};


    // Hauptlogik
    try {
        // 1. Passwort abfragen (oder aus sessionStorage nehmen)
        let password = sessionStorage.getItem('customerDataPassword');
        if (!password) {
            password = prompt("Bitte geben Sie das Passwort für den Zugriff auf die Kundendaten ein:", "");
            if (!password) {
                kundenSucheInput.placeholder = "Zugriff verweigert. Passwort erforderlich.";
                kundenSucheInput.disabled = true;
                return;
            }
        }

        // 2. Verschlüsselte Datei laden
        kundenSucheInput.placeholder = "Lade und entschlüssele Kundendaten...";
        const response = await fetch(encryptedFilePath);
        if (!response.ok) throw new Error("Netzwerkantwort war nicht in Ordnung.");
        
        const encryptedArrayBuffer = await response.arrayBuffer();

        // 3. Daten entschlüsseln
        const csvText = decryptData(encryptedArrayBuffer, password);

        if (csvText) {
            // Entschlüsselung erfolgreich
            sessionStorage.setItem('customerDataPassword', password); // Passwort für die Session speichern
            const kunden = Papa.parse(csvText, { header: true, skipEmptyLines: true, bom: true }).data;
            console.log("Kundenstamm erfolgreich entschlüsselt und geladen:", kunden.length, "Einträge.");
            kundenSucheInput.disabled = false;
            kundenSucheInput.placeholder = "🔍 Kunde, Firma, PLZ oder Ort suchen...";
            
            // Die anwendungsspezifische Callback-Funktion aufrufen
            onSuccess(kunden);

        } else {
            // Entschlüsselung fehlgeschlagen
            sessionStorage.removeItem('customerDataPassword'); // Falsches Passwort entfernen
            alert("Passwort falsch. Die Kundendaten konnten nicht geladen werden.");
            kundenSucheInput.placeholder = "Fehler: Passwort falsch.";
            kundenSucheInput.disabled = true;
        }

    } catch (error) {
        console.error("Fehler beim Laden der Kundendaten:", error);
        kundenSucheInput.placeholder = "Fehler beim Laden der Kundenliste.";
        kundenSucheInput.disabled = true;
    }
}
