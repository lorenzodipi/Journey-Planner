# App Android (APK) e iOS (IPA)

Il sito di Journey Planner viene impacchettato con **Capacitor** in due app:

| | Android | iOS |
|---|---|---|
| File | `JourneyPlanner.apk` (firmato) | `JourneyPlanner.ipa` (non firmato) |
| Costruito da | workflow **App Android (APK)** | workflow **App iOS (IPA per SideStore)** |
| Dove si scarica | Release **android-latest** | Release **ios-latest** |
| Installazione | scarichi l'APK dal telefono | SideStore lo firma con il tuo Apple ID |

Il sito (GitHub Pages) resta com'è e funziona sempre come **piano B**: stessi dati, stesso account.
Le app hanno un archivio locale separato dal sito: la prima volta si fa il login.

Identificativo dell'app: `it.lorenzodipi.journeyplanner` (in `capacitor.config.ts`). Va deciso **prima**
della prima installazione: se cambia, Android e iOS lo considerano un'altra app (si perdono dati locali e aggiornamenti).

## Android

### 1. Crea il keystore (una volta sola, sul tuo PC)

Il keystore è la "firma" dell'app: **non va mai nel repo** e **va salvato in due posti** (es. password manager + chiavetta).
Se lo perdi non potrai più aggiornare l'app installata, solo disinstallarla e reinstallarla.

PowerShell (serve Java; se manca: `winget install EclipseAdoptium.Temurin.21.JDK`):

```powershell
keytool -genkeypair -v -keystore journey-release.keystore -alias journey -keyalg RSA -keysize 2048 -validity 10000
# poi trasforma il file in testo da incollare nei Secrets:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("journey-release.keystore")) | Set-Clipboard
```

`keytool` chiede una password (usa la stessa per keystore e chiave, più semplice) e qualche dato (nome, paese: vanno bene anche valori semplici).

### 2. Metti i Secrets nel repo

GitHub > repo > Settings > Secrets and variables > Actions > **Secrets** > New repository secret:

| Nome | Valore |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | il testo copiato sopra (incolla dagli appunti) |
| `ANDROID_KEYSTORE_PASSWORD` | la password scelta |
| `ANDROID_KEY_ALIAS` | `journey` |
| `ANDROID_KEY_PASSWORD` | la stessa password |

Le **Variables** `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` sono le stesse già usate per Pages.

### 3. Costruisci e installa

1. Parte da sola a ogni commit su `main`; per rilanciarla a mano: Actions > **App Android (APK)** > *Run workflow* (4–8 minuti).
2. Dal telefono apri la pagina Releases del repo > **android-latest** > scarica `JourneyPlanner.apk`.
3. Android chiede di consentire "Installa app sconosciute" per il browser: consenti, poi installa.
4. Gli aggiornamenti si installano **sopra** quella già presente (stessa firma, numero di versione che sale a ogni build).

### Verifica sviluppatore di Google

Google introduce la verifica degli sviluppatori anche per le app installate fuori dal Play Store.
Per uso personale (poche persone) basta l'account **a distribuzione limitata** (gratuito, fino a 20 dispositivi);
si registra il package name `it.lorenzodipi.journeyplanner` con la firma del keystore. Dettagli e date aggiornate:
https://developer.android.com/developer-verification

## iOS (SideStore)

1. Parte da sola a ogni commit su `main`; per rilanciarla a mano: Actions > **App iOS (IPA per SideStore)** > *Run workflow* (10–15 minuti, gira su macOS).
2. Dall'iPhone apri Releases > **ios-latest** e scarica `JourneyPlanner.ipa` (Safari lo salva in File).
3. In SideStore: **+** in alto a sinistra > scegli `JourneyPlanner.ipa`. SideStore lo firma con il tuo Apple ID.
4. Aggiornare: scarichi il nuovo IPA e lo reinstalli dallo stesso modo (stesso identificativo = i dati restano).

Limiti dell'Apple ID gratuito: massimo **3 app attive** (SideStore incluso), **10 App ID a settimana**,
firma valida **7 giorni**. SideStore la rinnova da solo in background se la VPN locale (LocalDevVPN) è attiva e
il telefono è su Wi-Fi: **prima della partenza (21/11) controlla in SideStore la scadenza e rinnova a mano**.
Durante il viaggio, se la firma scade, l'app non si apre finché non si rinnova (serve rete): il sito resta il piano B.

## Cosa cambia nel codice per l'app

- `vite build --mode native` (`npm run build:native`): percorsi relativi e **nessun service worker**
  (i file sono già dentro l'app; gli aggiornamenti arrivano con una nuova installazione).
- Copie offline delle prenotazioni: nella cartella privata dell'app invece che nella Cache del browser.
- Aprire un biglietto: PDF/immagini passano al lettore del telefono. Esportare il backup JSON:
  si apre il foglio "Condividi" (salva in File, Drive, WhatsApp…).
- Icone e splash: `assets/*.png` > `npm run assets:native` (rigenera Android e iOS).

## Da provare sul telefono vero (prima del 13/11)

- login, apertura senza rete, aggiunta di una tappa offline e sincronizzazione al ritorno della rete
- mappa (tessere), ricerca luogo (Nominatim), percorsi a piedi, meteo: sono servizi esterni chiamati dall'app
  nativa con origine `https://localhost` (Android) / `capacitor://localhost` (iOS); se uno non risponde ma sul sito sì, è un problema di CORS da sistemare
- aprire un PDF di prenotazione, anche in modalità aereo con "Disponibile offline"
- esportazione backup, area sicura in alto/in basso (tacca, barra gesti), tastiera sui campi in basso

## Se un workflow fallisce

La prima esecuzione è la prova vera: Gradle (Android) e Xcode (iOS) non si possono eseguire fuori da GitHub.
Apri il run fallito, copia le ultime righe rosse del log e mandale: di solito è una correzione di una riga.
