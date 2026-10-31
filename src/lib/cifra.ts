// Copie locali cifrate (#64, INT-10): AES-GCM con una chiave casuale che resta solo su questo dispositivo.
// Protegge i file se qualcuno ne legge la memoria senza passare dall'app; la chiave sparisce con «Esci dall'account».
const KEY = 'jp.filekey.v1'
const MAGIC = [0x4a, 0x50, 0x45, 0x31] // «JPE1»

async function chiave(crea: boolean): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null
  try {
    const salvata = localStorage.getItem(KEY)
    if (salvata) return await crypto.subtle.importKey('jwk', JSON.parse(salvata), 'AES-GCM', true, ['encrypt', 'decrypt'])
    if (!crea) return null
    const k = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
    localStorage.setItem(KEY, JSON.stringify(await crypto.subtle.exportKey('jwk', k)))
    return k
  } catch {
    return null
  }
}

/** Cifra il file; se il dispositivo non lo permette lo restituisce com'è («dove possibile»). */
export async function cifra(blob: Blob): Promise<Blob> {
  const k = await chiave(true)
  if (!k) return blob
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const tipo = new TextEncoder().encode(blob.type.slice(0, 100))
  const chiaro = new Uint8Array([tipo.length, ...tipo, ...new Uint8Array(await blob.arrayBuffer())]) // il tipo (PDF, immagine) viaggia dentro il file cifrato
  const dati = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, chiaro))
  return new Blob([new Uint8Array(MAGIC), iv, dati], { type: 'application/octet-stream' })
}

/** Decifra; una copia vecchia non cifrata si legge com'è. `undefined` se non si riesce (si riscarica). */
export async function decifra(blob: Blob): Promise<Blob | undefined> {
  const buf = new Uint8Array(await blob.arrayBuffer())
  if (!MAGIC.every((b, i) => buf[i] === b)) return blob
  const k = await chiave(false)
  if (!k) return undefined
  try {
    const chiaro = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(4, 16) }, k, buf.slice(16)))
    const n = chiaro[0]
    return new Blob([chiaro.slice(1 + n)], { type: new TextDecoder().decode(chiaro.slice(1, 1 + n)) })
  } catch {
    return undefined
  }
}

export function dimenticaChiave(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignorato
  }
}
