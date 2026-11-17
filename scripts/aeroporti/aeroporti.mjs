// Lettura del CSV di OurAirports e scelta degli aeroporti (usata da genera.mjs, con i suoi test).

/** CSV con campi tra virgolette (anche con virgole, a capo e "" dentro) → righe come oggetti per intestazione. */
export function leggiCsv(testo) {
  const righe = []
  let riga = []
  let campo = ''
  let tra = false
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i]
    if (tra) {
      if (c === '"' && testo[i + 1] === '"') (campo += '"'), i++
      else if (c === '"') tra = false
      else campo += c
    } else if (c === '"') tra = true
    else if (c === ',') riga.push(campo), (campo = '')
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && testo[i + 1] === '\n') i++
      riga.push(campo)
      righe.push(riga)
      riga = []
      campo = ''
    } else campo += c
  }
  if (campo || riga.length) righe.push([...riga, campo])
  const [testa, ...resto] = righe.filter((r) => r.length > 1 || r[0])
  return resto.map((r) => Object.fromEntries(testa.map((k, i) => [k, r[i] ?? ''])))
}

/** Parole chiave utili alla ricerca: in caratteri latini, al massimo quattro, senza ripetere nome e città. */
function chiavi(k, nome, citta) {
  const gia = `${nome} ${citta}`.toLowerCase()
  return k
    .split(',')
    .map((x) => x.trim())
    .filter((x) => x && /^[\p{Script=Latin}\d\s.'()-]+$/u.test(x) && !gia.includes(x.toLowerCase()))
    .slice(0, 4)
    .join(', ')
}

/** Aeroporti con codice IATA, aperti, con voli di linea (o grandi): [codice, nome, città, paese, fuso, parole chiave]. */
export function scegliAeroporti(righe, fusoDi) {
  const visti = new Set()
  const out = []
  for (const r of righe) {
    const iata = r.iata_code?.trim().toUpperCase()
    if (!/^[A-Z]{3}$/.test(iata ?? '') || visti.has(iata)) continue
    if (r.type === 'closed' || !(r.scheduled_service === 'yes' || r.type === 'large_airport')) continue
    const lat = Number(r.latitude_deg)
    const lon = Number(r.longitude_deg)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    visti.add(iata)
    const nome = r.name.trim()
    const citta = r.municipality.trim()
    out.push([iata, nome, citta, r.iso_country.trim(), fusoDi(lat, lon), chiavi(r.keywords ?? '', nome, citta)])
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]))
}
