import { describe, expect, it } from 'vitest'
import { describeError } from './db'

describe('messaggi d\'errore', () => {
  it('non mostra mai gli errori tecnici del database così come sono', () => {
    const grezzi = [
      { message: 'invalid input syntax for type uuid: "stay:06c24448-e114-40ba-97fb-1749fb272259"', code: '22P02' },
      { message: 'column "wifi_name" of relation "stays" does not exist', code: '42703' },
      { message: 'Could not find the \'leg\' column of \'ticket_codes\' in the schema cache', code: 'PGRST204' },
      { message: 'new row for relation "flight_legs" violates check constraint "flight_legs_gate_close_check"', code: '23514' },
      { message: 'insert or update on table "settlements" violates foreign key constraint', code: '23503' },
      new TypeError("Cannot read properties of undefined (reading 'id')"),
      { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
    ]
    for (const e of grezzi) {
      const m = describeError(e)
      expect(m).not.toMatch(/uuid|relation|column|schema|constraint|Cannot read|JSON|PGRST|stay:/i)
      expect(m.length).toBeGreaterThan(10)
    }
  })
  it('i messaggi scritti dall\'app passano così come sono', () => {
    expect(describeError(new Error('Spesa non trovata'))).toBe('Spesa non trovata')
    const migr = "Per salvare codice d'accesso e Wi-Fi manca la migrazione 0052 sul database: eseguila nell'SQL Editor di Supabase (file supabase/migrations/0052_alloggi_wifi_accesso.sql), poi riprova."
    expect(describeError(new Error(migr))).toBe(migr)
    expect(describeError(new Error('Il file non è un JSON valido.'))).toBe('Il file non è un JSON valido.')
    expect(describeError({ message: 'Puoi registrare solo pagamenti che ti riguardano', code: 'P0001' })).toBe('Puoi registrare solo pagamenti che ti riguardano')
  })
  it('rete, permessi, sessione e doppioni hanno il loro messaggio', () => {
    expect(describeError(new TypeError('Failed to fetch'))).toMatch(/Connessione/)
    expect(describeError({ message: 'new row violates row-level security policy for table "stays"', code: '42501' })).toMatch(/permesso/)
    expect(describeError({ message: 'JWT expired', code: 'PGRST301' })).toMatch(/sessione/)
    expect(describeError({ message: 'duplicate key value violates unique constraint', code: '23505' })).toMatch(/Esiste già/)
    expect(describeError(undefined)).toMatch(/Riprova/)
  })
})
