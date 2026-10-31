// Avviso «Notti senza alloggio» (#57): solo le notti senza nessun alloggio e non trascorse in viaggio. Nessuna notifica push.
import { useLocation } from 'wouter'
import { formatShort } from '../lib/dates'
import { intervalliNotti, nottiScoperte } from '../lib/stays'
import type { Trip } from '../types'
import { Banner, Pulsante } from './base'

const nextDay = (ymd: string) => new Date(Date.parse(`${ymd}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
export const testoNotti = (i: { from: string; to: string; count: number }) => `${i.count === 1 ? '1 notte' : `${i.count} notti`} senza alloggio · ${formatShort(i.from)} → ${formatShort(nextDay(i.to))}`

export function AvvisoNotti({ trip }: { trip: Trip }) {
  const [, navigate] = useLocation()
  const intervalli = intervalliNotti(nottiScoperte(trip))
  if (intervalli.length === 0) return null
  return (
    <>
      {intervalli.map((i) => (
        <Banner key={i.from} tone="az" icon="moon" action={<Pulsante size="sm" color="secondary" onPress={() => navigate('/altro/alloggi')}>Apri le date</Pulsante>}>
          {testoNotti(i)}
        </Banner>
      ))}
    </>
  )
}
