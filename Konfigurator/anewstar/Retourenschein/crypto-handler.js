// crypto-handler.js (Version 4 - Final & Robust)

// Konstanten, die exakt mit Python übereinstimmen müssen
const ITERATIONS = 480000;
const KEY_SIZE_WORDS = 32 / 4; // 32 Bytes = 8 Words
const SALT_SIZE_BYTES = 16;
const NONCE_SIZE_BYTES = 12;

async function initializeCustomerSearch(onSuccess) {
    const encryptedFilePath = 'https://volkerkottwitz.github.io/Konfig/Konfigurator/anewstar/Retourenschein/kundenstamm.enc';
    const kundenSucheInput = document.getElementById('kundenSuche' );

    const decryptData = (encryptedArrayBuffer, password) => {
        try {
            // 1. Daten aus dem ArrayBuffer extrahieren
            const salt = CryptoJS.lib.WordArray.create(encryptedArrayBuffer.slice(0, SALT_SIZE_BYTES));
            const nonce = CryptoJS.lib.WordArray.create(encryptedArrayBuffer.slice(SALT_SIZE_BYTES, SALT_SIZE_BYTES + NONCE_SIZE_BYTES));
            const ciphertext = CryptoJS.lib.WordArray.create(encryptedArrayBuffer.slice(SALT_SIZE_BYTES + NONCE_SIZE_BYTES));

            // 2. Schlüssel ableiten
            const key = CryptoJS.PBKDF2(password, salt, {
                keySize: KEY_SIZE_WORDS,
                iterations: ITERATIONS,
                hasher: CryptoJS.algo.SHA256
            });

            // 3. Daten entschlüsseln
            const decrypted = CryptoJS.AES.decrypt({ ciphertext: ciphertext }, key, {
                iv: nonce,
                mode: CryptoJS.mode.GCM,
                padding: CryptoJS.pad.NoPadding
            });

            const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

            // 4. Erfolg prüfen: Wenn der Text leer ist, war das Passwort falsch.
            if (!decryptedText) {
                throw new Error("Entschlüsselung fehlgeschlagen. Ergebnis ist leer. Wahrscheinlich ist das Passwort falsch.");
            }

            return decryptedText;

        } catch (e) {
            // Fehler an die aufrufende Funktion weitergeben
            throw e;
        }
    };

    try {
        let password = sessionStorage.getItem('customerDataPassword');
        if (!password) {
            password = prompt("Bitte geben Sie das Passwort für den Zugriff auf die Kundendaten ein:", "");
            if (!password) {
                kundenSucheInput.placeholder = "Zugriff verweigert. Passwort erforderlich.";
                kundenSucheInput.disabled = true;
                return;
            }
        }

        kundenSucheInput.placeholder = "Lade und entschlüssele Kundendaten...";
        const response = await fetch(encryptedFilePath);
        if (!response.ok) throw new Error(`Netzwerkfehler: Datei nicht gefunden oder Server-Problem (Status: ${response.status})`);
        
        const encryptedArrayBuffer = await response.arrayBuffer();
        const csvText = decryptData(encryptedArrayBuffer, password);

        // Erfolg
        sessionStorage.setItem('customerDataPassword', password);
        const kunden = Papa.parse(csvText, { header: true, skipEmptyLines: true, bom: true }).data;
        console.log("✅ Kundenstamm erfolgreich entschlüsselt und geladen:", kunden.length, "Einträge.");
        kundenSucheInput.disabled = false;
        kundenSucheInput.placeholder = "🔍 Kunde, Firma, PLZ oder Ort suchen...";
        
        onSuccess(kunden);

    } catch (error) {
        // Fehlerbehandlung
        console.error("❌ FEHLER IM LADeprozess:", error.message);
        sessionStorage.removeItem('customerDataPassword');
        alert("Fehler: Die Kundendaten konnten nicht geladen werden. Wahrscheinlich ist das Passwort falsch. Details in der Konsole.");
        kundenSucheInput.placeholder = "Fehler: Passwort falsch oder Datei beschädigt.";
        kundenSucheInput.disabled = true;
    }
}
