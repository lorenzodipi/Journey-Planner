import { MinusIcon, PlusIcon } from './Icons'

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
    <div role="group" aria-label={`Pezzi a posto: ${label}`} class="inline-flex items-center rounded-full border-2 border-line bg-surface">
      <button
        type="button"
        aria-label="Un pezzo in meno"
        disabled={disabled || have <= 0}
        onClick={() => onChange(have - 1)}
        class="grid size-11 place-items-center rounded-full text-muted disabled:text-line"
      >
        <MinusIcon size={16} />
      </button>
      <span class="min-w-12 px-1 text-center text-sm font-extrabold tabular-nums" aria-live="polite">
        {have}/{total}
      </span>
      <button
        type="button"
        aria-label="Un pezzo in più"
        disabled={disabled || have >= total}
        onClick={() => onChange(have + 1)}
        class="grid size-11 place-items-center rounded-full text-pale disabled:text-line"
      >
        <PlusIcon size={16} />
      </button>
    </div>
  )
}
