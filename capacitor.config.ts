import type { CapacitorConfig } from '@capacitor/cli'

// App Android/iOS = lo stesso sito, impacchettato in un contenitore nativo.
// Build: `npm run build:native` poi `npx cap sync`. In pratica lo fanno i workflow
// in .github/workflows (android.yml, ios.yml).
const config: CapacitorConfig = {
  // Identificativo dell'app. Una volta pubblicato/installato NON va più cambiato
  // (Android lo registra anche per la verifica sviluppatore di Google).
  appId: 'it.lorenzodipi.journeyplanner',
  appName: 'Faraway',
  webDir: 'dist-native',
  backgroundColor: '#FAF6EE',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // iOS: la tastiera copre la finestra senza restringerla (vedi src/lib/tastiera.ts)
    Keyboard: { resize: 'none' },
  },
  ios: {
    contentInset: 'never',
  },
}

export default config
