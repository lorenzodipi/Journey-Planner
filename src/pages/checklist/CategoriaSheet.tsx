// Foglio «Modifica la categoria» (menu ⋯ sul titolo di una categoria creata a mano): il nome nuovo vale per tutte le sue voci.
// Se il nome c'è già (anche con le maiuscole diverse, o è una delle cinque dell'app) le voci si uniscono a quella categoria.
import { useState } from 'react'
import { nuovoNomeCategoria } from '../../lib/checklist'
import { Campo, Pulsante } from '../../faraway/base'
import { Foglio } from '../../faraway/Foglio'
import { Sv } from '../../faraway/icons'
import { nomeCategoria, t } from '../../i18n'

interface Props {
  /** il nome di adesso */
  categoria: string
  /** le categorie che esistono (per accorgersi di un'unione) */
  esistenti: readonly string[]
  /** vero se tra le voci ci sono voci comuni in un viaggio di gruppo: il cambio lo vedono tutti */
  perTutti: boolean
  onClose: () => void
  /** chiamata col nome già controllato; ritorna l'errore, se la modifica non è stata accettata */
  onSalva: (nome: string) => Promise<string | null>
}

export function CategoriaSheet({ categoria, esistenti, perTutti, onClose, onSalva }: Props) {
  const [nome, setNome] = useState(categoria)
  const [errore, setErrore] = useState<string | undefined>()
  const [errForm, setErrForm] = useState<string | undefined>()
  const [busy, setBusy] = useState(false)
  const prova = nuovoNomeCategoria(nome, categoria, esistenti)

  async function submit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!prova.ok) return setErrore(t('Scrivi il nome della categoria.'))
    // lo stesso nome di prima: niente da fare
    if (prova.nome === categoria) return onClose()
    setBusy(true)
    setErrForm((await onSalva(prova.nome)) ?? undefined)
    setBusy(false)
  }

  return (
    <Foglio
      open
      title={t('Modifica la categoria')}
      onClose={onClose}
      footer={
        <Pulsante type="submit" form="categoria-form" isLoading={busy}>
          {t('Salva')}
        </Pulsante>
      }
    >
      <form id="categoria-form" className="frm" onSubmit={submit} noValidate>
        <Campo
          label={t('Nome della categoria')}
          value={nome}
          onChange={(v) => (setNome(v), setErrore(undefined))}
          placeholder={t('es. Nome della categoria')}
          maxLength={30}
          error={errore}
          hint={prova.ok && prova.unisce ? t('Esiste già «{label}»: le voci si uniscono a quella.', { label: nomeCategoria(prova.nome) }) : undefined}
          autoFocus
        />
        {perTutti ? <span className="fa-m">{t('Il nome cambia per tutti i viaggiatori.')}</span> : null}
        {errForm ? (
          <span className="fa-help bad" role="alert">
            <Sv name="err" size={16} />
            {errForm}
          </span>
        ) : null}
      </form>
    </Foglio>
  )
}
