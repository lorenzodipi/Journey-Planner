// Caricamento vero: un anello che gira (niente frasi tipo «Sto caricando»). Con `reduced motion` resta un anello fermo a metà.
export function Loader({ size = 24, label = 'Caricamento in corso', className }: { size?: number; label?: string; className?: string }) {
  return (
    <span className={`fa-spin${className ? ` ${className}` : ''}`} role="status" aria-label={label} style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
        <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  )
}
