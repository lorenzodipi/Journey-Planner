export function FlagPill({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
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
      {label}
    </button>
  )
}
