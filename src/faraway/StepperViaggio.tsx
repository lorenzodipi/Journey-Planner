// «Il viaggio»: le città previste come stepper non interattivo (pallino, nome, date e notti).
export interface TappaViaggio {
  nome: string
  date: string
  notti: number
  disco: string
}

export function StepperViaggio({ tappe }: { tappe: TappaViaggio[] }) {
  return (
    <section aria-label="Il viaggio" className="fa-stepv">
      <h2 className="fa-h3" style={{ margin: 0 }}>Il viaggio</h2>
      <ol>
        {tappe.map((t, i) => (
          <li key={i}>
            <i aria-hidden="true" style={{ background: `var(--disco-${t.disco})` }} />
            <span className="nm">{t.nome}</span>
            <span className="dt">
              {t.date} · {t.notti} {t.notti === 1 ? 'notte' : 'notti'}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
