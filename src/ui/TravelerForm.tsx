import { useState } from 'preact/hooks'
import type { TravelerInput } from '../lib/tripApi'
import { TRAVELER_COLORS } from '../lib/tripForm'
import { FormError, PrimaryButton, SecondaryButton, TextField } from './Field'

interface Props {
  initial?: TravelerInput
  onSubmit: (input: TravelerInput) => Promise<string | null>
  /** Se presente compare il pulsante "Rimuovi". */
  onRemove?: () => Promise<string | null>
  onDone: () => void
  defaultColor?: string
}

export function TravelerForm({ initial, onSubmit, onRemove, onDone, defaultColor }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [color, setColor] = useState(initial?.color ?? defaultColor ?? TRAVELER_COLORS[0])
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(job: () => Promise<string | null>) {
    setBusy(true)
    setError(null)
    const message = await job()
    setBusy(false)
    if (message) setError(message)
    else onDone()
  }

  function submit(e: Event) {
    e.preventDefault()
    if (!name.trim()) return setError('Scrivi il nome della persona.')
    void run(() => onSubmit({ name, color }))
  }

  return (
    <form class="space-y-4" onSubmit={submit} noValidate>
      <TextField label="Nome" value={name} onInput={setName} maxLength={40} autoComplete="off" />
      <fieldset>
        <legend class="mb-2 block text-sm font-medium">Colore</legend>
        <div class="flex flex-wrap gap-3">
          {TRAVELER_COLORS.map((c) => (
            <button
              type="button"
              aria-label={`Colore ${c}`}
              aria-pressed={color === c}
              onClick={() => setColor(c)}
              class={`h-11 w-11 rounded-full border-2 ${color === c ? 'border-ink' : 'border-transparent'}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </fieldset>
      <FormError message={error} />
      <PrimaryButton busy={busy}>{busy ? 'Salvataggio…' : 'Salva'}</PrimaryButton>
      {onRemove &&
        (confirming ? (
          <div class="space-y-2 rounded-2xl bg-danger/10 p-3">
            <p class="text-sm text-danger">
              Le spese già assegnate a questa persona restano nel database ma non saranno più visibili. Rimuovere?
            </p>
            <SecondaryButton danger onClick={() => void run(onRemove)}>
              Sì, rimuovi
            </SecondaryButton>
          </div>
        ) : (
          <SecondaryButton danger onClick={() => setConfirming(true)}>
            Rimuovi dal viaggio
          </SecondaryButton>
        ))}
    </form>
  )
}
