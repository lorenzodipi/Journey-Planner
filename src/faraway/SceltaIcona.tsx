// Scelta dell'icona di una categoria nuova, tra le icone delle categorie che l'app ha già (dischi «i-cat-*»).
// Gruppo di opzioni di react-aria: frecce per spostarsi, una sola scelta, il nome dell'icona letto dallo screen reader.
import { Label, Radio, RadioGroup } from 'react-aria-components'
import { ICONE_CATEGORIA } from '../lib/categoryIcon'
import { Ic } from '../ui/Sprite'

export function SceltaIcona({ value, onChange }: { value: string; onChange: (icona: string) => void }) {
  return (
    <RadioGroup className="fa-icone" value={value} onChange={onChange} orientation="horizontal">
      <Label className="fa-icone-l">Icona</Label>
      <div className="fa-icone-g">
        {ICONE_CATEGORIA.map((x) => (
          <Radio key={x.id} value={x.id} className="fa-icona" aria-label={x.nome}>
            <Ic name={`i-cat-${x.id}`} size={40} />
          </Radio>
        ))}
      </div>
    </RadioGroup>
  )
}
