// Elenco degli aeroporti per il campo «Aeroporto» del foglio del volo, dai dati di OurAirports (pubblico dominio).
// Tiene solo gli aeroporti con codice IATA e voli di linea (più i grandi aeroporti), calcola il fuso orario dalle
// coordinate e scrive un JSON compatto: [codice, nome, città, paese ISO, fuso, parole chiave].
//
// Uso:  node scripts/aeroporti/genera.mjs [airports.csv] [file di uscita]
// Senza file CSV lo scarica da GitHub; l'uscita predefinita è src/data/aeroporti.json (l'elenco dentro l'app).
// Lo stesso script gira ogni mese nell'azione «Aeroporti» e pubblica l'elenco aggiornato nel ramo `dati-aeroporti`.
import fs from 'node:fs'
import tzlookup from '@photostructure/tz-lookup'
import { leggiCsv, scegliAeroporti } from './aeroporti.mjs'

const URL_CSV = 'https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv'
const [, , ingresso, uscita = new URL('../../src/data/aeroporti.json', import.meta.url).pathname] = process.argv

const testo = ingresso ? fs.readFileSync(ingresso, 'utf8') : await (await fetch(URL_CSV)).text()
const voci = scegliAeroporti(leggiCsv(testo), (lat, lon) => tzlookup(lat, lon))
if (voci.length < 2000) throw new Error(`Troppi pochi aeroporti (${voci.length}): il file scaricato sembra sbagliato.`)
const dati = { aggiornato: new Date().toISOString().slice(0, 10), voci }
fs.writeFileSync(uscita, JSON.stringify(dati) + '\n')
console.log(`${voci.length} aeroporti scritti in ${uscita}`)
