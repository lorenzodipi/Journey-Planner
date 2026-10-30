// Foglio «Filtri» dei luoghi (mock Fa-56, #33): Stato, Città, Categoria a pillole multiple, Raggruppa per
// e Ordina per, «Azzera» in alto e «Mostra N luoghi» con il conteggio dal vivo.
import { useState } from 'react'
import { EMPTY_FILTERS, filterPlaces, toggleValue, type PlaceFilters } from '../../lib/placeFilter'
import { GROUP_LABEL, SORT_LABEL, type GroupBy, type PlaceView, type SortBy } from '../../lib/placeView'
import { STATI_LUOGO, STATO_LUOGO } from '../../lib/luoghi'
import type { Place, Trip } from '../../types'
import { Chip, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'

interface Props {
  trip: Trip
  places: Place[]
  open: boolean
  filters: PlaceFilters
  view?: PlaceView
  onApply: (f: PlaceFilters, v?: PlaceView) => void
  onClose: () => void
}

const GROUPS: GroupBy[] = ['city', 'category', 'status', 'day', 'none']
const SORTS: SortBy[] = ['name', 'day', 'status', 'cost']

export function FiltriSheet({ trip, places, open, filters, view, onApply, onClose }: Props) {
  const [f, setF] = useState(filters)
  const [v, setV] = useState(view)
  const cities = [...new Set(places.map((p) => p.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'))
  const cats = trip.categories.filter((c) => places.some((p) => p.categoryId === c.id))
  const count = filterPlaces(places, f).length

  return (
    <Foglio
      open={open}
      title="Filtri"
      onClose={onClose}
      headStart={
        <button type="button" className="fa-btn soft" style={{ height: 40, padding: '0 14px', width: 'auto' }} onClick={() => (setF(EMPTY_FILTERS), setV(view ? { groupBy: 'city', sortBy: 'name' } : undefined))}>
          Azzera
        </button>
      }
      footer={<Pulsante onPress={() => (onApply(f, v), onClose())}>{count === 1 ? 'Mostra 1 luogo' : `Mostra ${count} luoghi`}</Pulsante>}
    >
      <div className="frm" style={{ gap: 12 }}>
        <div className="fa-fld" role="group" aria-label="Stato">
          Stato
          <div className="fa-chips wrap">
            {STATI_LUOGO.map((s) => (
              <Chip key={s} on={f.statuses.includes(s)} onPress={() => setF({ ...f, statuses: toggleValue(f.statuses, s) })}>
                {STATO_LUOGO[s].label}
              </Chip>
            ))}
          </div>
        </div>
        {cities.length > 0 ? (
          <div className="fa-fld" role="group" aria-label="Città">
            Città
            <div className="fa-chips wrap">
              {cities.map((c) => (
                <Chip key={c} on={f.cities.includes(c)} onPress={() => setF({ ...f, cities: toggleValue(f.cities, c) })}>
                  {c}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
        {cats.length > 0 ? (
          <div className="fa-fld" role="group" aria-label="Categoria">
            Categoria
            <div className="fa-chips wrap">
              {cats.map((c) => (
                <Chip key={c.id} on={f.categories.includes(c.label)} onPress={() => setF({ ...f, categories: toggleValue(f.categories, c.label) })}>
                  {c.label}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
        {v ? (
          <>
            <div className="fa-fld" role="group" aria-label="Raggruppa per">
              Raggruppa per
              <div className="fa-chips wrap">
                {GROUPS.map((g) => (
                  <Chip key={g} on={v.groupBy === g} onPress={() => setV({ ...v, groupBy: g })}>
                    {GROUP_LABEL[g]}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="fa-fld" role="group" aria-label="Ordina per">
              Ordina per
              <div className="fa-chips wrap">
                {SORTS.map((s) => (
                  <Chip key={s} on={v.sortBy === s} onPress={() => setV({ ...v, sortBy: s })}>
                    {SORT_LABEL[s]}
                  </Chip>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </Foglio>
  )
}
