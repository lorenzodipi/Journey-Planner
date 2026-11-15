import { useRef } from 'react'
import { modificaAltrui } from '../lib/conflitti'
import { useMe } from '../state/me'
import type { Trip } from '../types'
import { useConferma } from './Foglio'
import { t } from '../i18n'

/** Prima di salvare: se un altro ha cambiato l'elemento mentre lo modificavi, chiede se sovrascrivere. */
export function useConflitto(trip: Trip, table: string, rowId: string | undefined): [() => Promise<boolean>, React.ReactNode] {
  const [ask, node] = useConferma()
  const aperto = useRef(new Date().toISOString())
  const me = useMe(trip)
  async function procedi(): Promise<boolean> {
    const c = modificaAltrui(trip.activity, table, rowId, aperto.current, me?.userId)
    if (!c) return true
    return ask({ title: t('Questo elemento è cambiato'), message: t('Nel frattempo qualcuno lo ha modificato. Se salvi, le tue modifiche prendono il posto delle sue.'), confirm: t('Salva lo stesso'), cancel: t('Torna indietro'), destructive: false })
  }
  return [procedi, node]
}
