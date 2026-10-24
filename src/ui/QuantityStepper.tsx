import { MinusG, PlusG } from './glyphs'

/**
 * Controllo unico a pillola «− 2/5 +» per le voci con una quantità (pezzi a posto su pezzi totali).
 * Due pulsanti da 44 px distanziati dal numero; è l'unico comando sulla riga oltre alla spunta,
 * quindi non può essere scambiato con un'azione distruttiva.
 */
export function QuantityStepper({
  label,
  have,
  total,
  disabled = false,
  onChange,
}: {
  label: string
  have: number
  total: number
  disabled?: boolean
  onChange: (count: number) => void
}) {
  return (
    <div role="group" aria-label={`Pezzi a posto: ${label}`} class="qty">
      <button type="button" aria-label="Un pezzo in meno" disabled={disabled || have <= 0} onClick={() => onChange(have - 1)}>
        <MinusG size={18} />
      </button>
      <span class="num" aria-live="polite">
        {have}/{total}
      </span>
      <button type="button" aria-label="Un pezzo in più" disabled={disabled || have >= total} onClick={() => onChange(have + 1)}>
        <PlusG size={18} />
      </button>
    </div>
  )
}
