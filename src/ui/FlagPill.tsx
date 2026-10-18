/** Interruttore a pillola. `offLabel`: testo quando è spento (es. "Non pagato"); se manca, resta `label`. */
export function FlagPill({ on, label, offLabel, onClick }: { on: boolean; label: string; offLabel?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      class={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium ${
        on ? 'border-ok/40 bg-ok/10 text-ok' : 'border-line text-muted'
      }`}
    >
      <span aria-hidden="true">{on ? '✓' : '○'}</span>
      {on ? label : (offLabel ?? label)}
    </button>
  )
}
