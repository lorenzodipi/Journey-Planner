// Luminosità al massimo mentre si mostra un codice (#38). Solo nell'app Android/iOS: sul web il browser non lo permette.
// Il plugin si carica solo dentro `if (__NATIVE__)`, così la versione web non lo porta con sé.

/** Alza la luminosità al massimo; restituisce la funzione che la ripristina. */
export async function luminositaMassima(): Promise<() => void> {
  if (!__NATIVE__) return () => undefined
  try {
    const { ScreenBrightness } = await import('@capacitor-community/screen-brightness')
    const { brightness } = await ScreenBrightness.getBrightness()
    await ScreenBrightness.setBrightness({ brightness: 1 })
    return () => void ScreenBrightness.setBrightness({ brightness }).catch(() => undefined)
  } catch {
    return () => undefined
  }
}

export const LUMINOSITA_SUPPORTATA = typeof __NATIVE__ !== 'undefined' && __NATIVE__
