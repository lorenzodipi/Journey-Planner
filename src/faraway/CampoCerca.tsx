// Scelta da un elenco molto lungo (aeroporti, paesi, valute, fusi orari): un campo in cui si scrive. Al tocco non si
// apre niente; appena si scrive compaiono al massimo `max` voci che corrispondono (codice esatto per primo), sotto il
// campo e nel flusso del foglio: un popover finirebbe sotto il <dialog> nativo dei fogli. ComboBox di react-aria:
// frecce, Invio ed Esc, ruolo e annunci per il lettore di schermo. Lasciando il campo senza scegliere torna la voce di
// prima (o, con `libero`, il testo scritto se è valido; con `facoltativo`, il campo vuoto toglie la scelta).
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { ComboBox, Input, Label, ListBox, ListBoxItem, Text } from 'react-aria-components'
import { cercaVoci, type VoceCerca } from '../lib/cerca'
import { cx } from './cx'
import { Sv, type SvName } from './icons'
import { t } from '../i18n'

interface Props<T extends VoceCerca> {
  label: string
  /** id della voce scelta ('' = nessuna) */
  value: string
  onChange: (id: string, voce?: T) => void
  voci: readonly T[]
  /** testo nel campo per la voce scelta; senza, la sua `label` (o il valore, se non è in elenco) */
  testoDi?: (id: string, voce?: T) => string
  placeholder?: string
  hint?: string
  error?: string
  icon?: SvName
  /** il campo vuoto toglie la scelta */
  facoltativo?: boolean
  /** testo scritto e non scelto dall'elenco → valore valido (es. un codice IATA), altrimenti null */
  libero?: (testo: string) => string | null
  /** quante voci al massimo */
  max?: number
  /** contenuto a sinistra della riga (es. il codice in grassetto) */
  segno?: (voce: T) => ReactNode
  /** l'elenco si sta ancora caricando */
  caricamento?: boolean
  autoComplete?: string
}

export function CampoCerca<T extends VoceCerca>({ label, value, onChange, voci, testoDi, placeholder, hint, error, icon, facoltativo, libero, max = 8, segno, caricamento, autoComplete = 'off' }: Props<T>) {
  const id = useId()
  const voce = useMemo(() => voci.find((v) => v.id === value), [voci, value])
  const mostra = testoDi ? testoDi(value, voce) : (voce?.label ?? value)
  const [testo, setTesto] = useState(mostra)
  const [scrive, setScrive] = useState(false)
  const lista = useRef<HTMLDivElement>(null)
  // quando cambia la scelta (o arriva l'elenco) e non si sta scrivendo, il campo mostra la voce scelta
  useEffect(() => {
    if (!scrive) setTesto(mostra)
  }, [mostra, scrive])
  const trovate = useMemo(() => (scrive ? cercaVoci(voci, testo, max) : []), [scrive, voci, testo, max])
  const aperto = scrive && testo.trim().length > 0
  // l'elenco appena aperto resta visibile sopra la tastiera
  useEffect(() => {
    if (aperto) lista.current?.scrollIntoView({ block: 'nearest' })
  }, [aperto, trovate.length])

  function lascia() {
    if (!scrive) return
    setScrive(false)
    const scritto = testo.trim()
    if (!scritto && facoltativo) {
      if (value) onChange('')
      setTesto('')
      return
    }
    const valido = libero?.(scritto)
    if (valido && valido !== value) onChange(valido, voci.find((v) => v.id === valido))
    else setTesto(mostra)
  }

  const helpId = `${id}-h`
  return (
    <ComboBox
      className="fa-fld fa-cerca"
      menuTrigger="input"
      allowsEmptyCollection
      allowsCustomValue
      inputValue={testo}
      onInputChange={(v) => {
        setTesto(v)
        setScrive(true)
      }}
      selectedKey={value || null}
      onSelectionChange={(k) => {
        if (k == null) return
        const v = voci.find((x) => x.id === String(k))
        setScrive(false)
        setTesto(testoDi ? testoDi(String(k), v) : (v?.label ?? String(k)))
        if (String(k) !== value) onChange(String(k), v)
      }}
      defaultFilter={() => true}
      items={trovate}
      onBlur={lascia}
    >
      <Label>{label}</Label>
      <span className={cx('fa-in', error && 'bad')}>
        {icon ? <Sv name={icon} size={20} /> : <Sv name="search" size={20} />}
        <Input
          // Esc con l'elenco aperto chiude solo l'elenco (e torna la voce di prima), non il foglio
          onKeyDown={(e) => {
            if (e.key !== 'Escape' || !aperto) return
            e.preventDefault()
            e.stopPropagation()
            setScrive(false)
            setTesto(mostra)
          }}
          placeholder={placeholder} autoComplete={autoComplete} aria-invalid={error ? true : undefined} aria-errormessage={error ? helpId : undefined} />
      </span>
      {aperto ? (
        <div ref={lista} className="fa-cerca-l">
          <ListBox<T>
            aria-label={label}
            className="fa-cerca-lb"
            renderEmptyState={() => <p className="fa-cerca-vuoto">{caricamento ? t('Sto caricando l\'elenco…') : t('Nessun risultato per «{v0}».', { v0: testo.trim() })}</p>}
          >
            {(v) => (
              <ListBoxItem id={v.id} textValue={v.label} className={({ isFocused, isSelected }) => cx('op', isFocused && 'fo', isSelected && 'on')}>
                {segno ? <span className="sg">{segno(v)}</span> : null}
                <span className="tx">
                  <Text slot="label" elementType="b">
                    {v.label}
                  </Text>
                  {v.detail ? (
                    <Text slot="description" elementType="span">
                      {v.detail}
                    </Text>
                  ) : null}
                </span>
              </ListBoxItem>
            )}
          </ListBox>
        </div>
      ) : null}
      {error ? (
        <span id={helpId} className="fa-help bad" role="alert">
          <Sv name="err" size={16} />
          {error}
        </span>
      ) : hint ? (
        <Text slot="description" className="fa-help">
          {hint}
        </Text>
      ) : null}
    </ComboBox>
  )
}
