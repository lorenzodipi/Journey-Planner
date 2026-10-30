// Icone a tratto del design system Faraway (barre, pulsanti, campi), le stesse del mock Fa-01…Fa-57.
// Le icone a disco colorato (concetti, categorie, mezzi) restano nello sprite: <Ic name="i-…"/>.

const PATHS = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  back: <path d="M15 5l-7 7 7 7" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  dots: <><circle cx="5.5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="18.5" cy="12" r="1.2" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  chev: <path d="M6 9l6 6 6-6" />,
  chevr: <path d="M9 6l6 6-6 6" />,
  plane: <path d="M3 13.5l8-2.5-3-6 2-.5 5.5 5.5 4-1.2c1-.3 2 .8 1.4 1.7-.3.5-.8.7-1.3.8l-4 1.2L11 20.5l-2 .5 1-6.5-4.5 1.4L4 17z" />,
  warn: <path d="M12 4l9 16H3zM12 10v4M12 17v.5" />,
  err: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16v.5" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  pencil: <path d="M4 20l1-4L16 5l3 3L8 19z" />,
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" />,
  share: <path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.8" /></>,
  cal: <><rect x="4" y="5.5" width="16" height="14" rx="3" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /></>,
  pin: <><path d="M12 19.5s5.5-4.4 5.5-9a5.5 5.5 0 1 0-11 0c0 4.6 5.5 9 5.5 9z" /><circle cx="12" cy="10.5" r="1.9" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19c0-3.3 3.1-5 7-5s7 1.7 7 5" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="3" /><path d="M4 8l8 6 8-6" /></>,
  wifi: <><path d="M3 9.5a14 14 0 0 1 18 0M6 13a9.5 9.5 0 0 1 12 0M9.2 16.4a4.8 4.8 0 0 1 5.6 0M12 19.5v.1" /><path d="M4 4l16 16" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></>,
  camera: <><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1-1.8h6.6l1 1.8h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><circle cx="12" cy="12.5" r="3.2" /></>,
  moon: <path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" />,
  star: <path d="M12 4l2.4 5 5.4.7-4 3.8 1 5.4-4.8-2.7-4.8 2.7 1-5.4-4-3.8 5.4-.7z" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8v.2" /></>,
  bell: <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  out: <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10M14 8l4 4-4 4M18 12H9" />,
  qr: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2.5v2.5M20 14v.1M14 20h.1M17 20h3v-3" /></>,
  filter: <><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  bag: <path d="M6 8h12l1.2 11H4.8zM9 8V6.5a3 3 0 0 1 6 0V8" />,
  copy: <><rect x="8" y="8" width="11" height="11" rx="2.5" /><path d="M5 15V7a2 2 0 0 1 2-2h8" /></>,
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  refresh: <path d="M19 12a7 7 0 1 1-2-4.9M19 4v4h-4" />,
  file: <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1zM14 3.5V8h4" />,
  download: <path d="M12 4v11M8 11l4 4 4-4M5 19h14" />,
  move: <path d="M8 7l-4 5 4 5M16 7l4 5-4 5M4 12h16" />,
} as const

export type SvName = keyof typeof PATHS

/** Icona a tratto da 22px (o `size`), colore dal testo. Sempre decorativa: il significato sta nell'etichetta accanto. */
export function Sv({ name, size = 22, className }: { name: SvName; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {PATHS[name]}
    </svg>
  )
}

/** Icone della barra delle schede (tratto 1,9 come nel mock). */
export const TAB_PATHS = {
  Oggi: <><rect x="4" y="5.5" width="16" height="14" rx="3" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /><circle cx="12" cy="14.6" r="1.6" fill="currentColor" stroke="none" /></>,
  Giorni: <><circle cx="7" cy="7.5" r="1.5" fill="currentColor" stroke="none" /><circle cx="7" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="7" cy="16.5" r="1.5" fill="currentColor" stroke="none" /><path d="M11.5 7.5H19M11.5 12H17M11.5 16.5H19" /></>,
  Luoghi: <><path d="M12 19.5s5.5-4.4 5.5-9a5.5 5.5 0 1 0-11 0c0 4.6 5.5 9 5.5 9z" /><circle cx="12" cy="10.5" r="1.9" /></>,
  Spese: <><path d="M17.2 8a6 6 0 1 0 0 8" /><path d="M6.5 10.5h8M6.5 13.5h8" /></>,
  Altro: <><circle cx="6" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.7" fill="currentColor" stroke="none" /><circle cx="18" cy="12" r="1.7" fill="currentColor" stroke="none" /></>,
} as const
