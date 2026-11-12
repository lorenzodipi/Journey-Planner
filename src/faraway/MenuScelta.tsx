// Scelta da un elenco aperto da un pulsante (Select di react-aria-components): «Stato della tappa», «Scegli il giorno».
// Il pulsante lo disegna chi la usa; l'elenco si apre sopra il contenuto, largo come il pulsante.
// Da tastiera: una sola fermata del Tab, frecce, Home/Fine, iniziale per saltare, Esc chiude e il focus torna al pulsante.
import type { ReactNode } from 'react'
import { Button, ListBox, ListBoxItem, Popover, Select, Text } from 'react-aria-components'
import { cx } from './cx'

export interface VoceScelta<T extends string> {
  id: T
  /** Nome della voce: è quello che legge il lettore di schermo e che si cerca con l'iniziale. */
  nome: string
  /** Seconda riga, letta come descrizione della voce. */
  descrizione?: string
  /** Segno a sinistra (cerchio dello stato, numero del giorno). */
  segno: ReactNode
}

export function MenuScelta<T extends string>({
  label,
  titolo,
  nota,
  value,
  onChange,
  voci,
  pulsante,
  spunta,
  classePulsante,
  ambito,
  isDisabled,
  isOpen,
  onOpenChange,
  altezza = 420,
}: {
  /** Nome dell'elenco per il lettore di schermo (es. «Stato della tappa»). */
  label: string
  /** Riga piccola in cima all'elenco. */
  titolo: string
  /** Riga piccola in fondo all'elenco. */
  nota?: string
  value: T | null
  onChange: (v: T) => void
  voci: VoceScelta<T>[]
  /** Contenuto del pulsante che apre l'elenco. */
  pulsante: ReactNode
  /** Segno a destra della voce scelta. */
  spunta: ReactNode
  classePulsante: string
  /** Classe del componente che usa l'elenco (es. `k-Tappa`): le sue regole per le righe valgono anche nell'elenco. */
  ambito: string
  isDisabled?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Altezza massima dell'elenco, poi scorre. */
  altezza?: number
}) {
  return (
    <Select
      aria-label={label}
      className="fa-scelta"
      selectedKey={value}
      onSelectionChange={(k) => {
        if (k != null) onChange(String(k) as T)
      }}
      isDisabled={isDisabled}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <Button className={classePulsante}>{pulsante}</Button>
      <Popover className={cx('fa-selpop', ambito)} placement="bottom" offset={8}>
        <div className="mh" aria-hidden="true">
          {titolo}
        </div>
        <ListBox aria-label={label} className="fa-sell" style={{ maxHeight: altezza }}>
          {voci.map((v) => (
            <ListBoxItem key={v.id} id={v.id} textValue={v.nome} className={({ isSelected }) => cx('op', isSelected && 'on')}>
              {({ isSelected }) => (
                <>
                  {v.segno}
                  <span className="ox">
                    <Text slot="label" elementType="b">
                      {v.nome}
                    </Text>
                    {v.descrizione ? <Text slot="description">{v.descrizione}</Text> : null}
                  </span>
                  {isSelected ? spunta : null}
                </>
              )}
            </ListBoxItem>
          ))}
        </ListBox>
        {nota ? <div className="mf">{nota}</div> : null}
      </Popover>
    </Select>
  )
}
