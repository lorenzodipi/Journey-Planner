import { describe, expect, it } from 'vitest'
import { leggiCsv, scegliAeroporti } from './aeroporti.mjs'

const CSV = `"id","type","name","latitude_deg","longitude_deg","iso_country","municipality","scheduled_service","iata_code","keywords"
1,"large_airport","Rome–Fiumicino Airport",41.8,12.25,"IT","Rome","yes","FCO","Fiumicino, 羅馬"
2,"heliport","Elisuperficie",45,9,"IT","Milano","no",,
3,"small_airport","Pista ""Nord"", privata",45,9,"IT","Como","no","XXX",
4,"closed","Vecchio",45,9,"IT","Torino","yes","OLD",
5,"medium_airport","Narita International Airport",35.76,140.38,"JP","Narita","yes","nrt","TYO, Tokyo, Narita"
`

describe('aeroporti da OurAirports', () => {
  it('legge il CSV con virgolette, virgole e "" dentro i campi', () => {
    const r = leggiCsv(CSV)
    expect(r).toHaveLength(5)
    expect(r[2].name).toBe('Pista "Nord", privata')
    expect(r[1].iata_code).toBe('')
  })

  it('tiene solo gli aeroporti aperti con codice IATA e voli di linea, con fuso e parole chiave latine', () => {
    const out = scegliAeroporti(leggiCsv(CSV), (lat) => (lat > 40 ? 'Europe/Rome' : 'Asia/Tokyo'))
    expect(out).toEqual([
      ['FCO', 'Rome–Fiumicino Airport', 'Rome', 'IT', 'Europe/Rome', ''],
      ['NRT', 'Narita International Airport', 'Narita', 'JP', 'Asia/Tokyo', 'TYO, Tokyo'],
    ])
  })
})
