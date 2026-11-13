// Icona dell'app scelta in Impostazioni (solo app Android/iOS). Le icone sono dichiarate nei progetti nativi:
// Android = un <activity-alias> per icona (AndroidManifest.xml), iOS = un set per nome nell'asset catalog
// (ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES). Per aggiungerne una: genera le immagini con
// scripts/genera-icone.py, dichiarala nei due progetti e aggiungila qui.
// L'icona la ricorda il sistema: non c'è niente da salvare sul telefono.

export type IconaId = 'chiara' | 'scura' | 'blu'

/** `nativo` è il nome dell'alias/set; `null` = icona di partenza (su Android l'alias «IconaChiara»). */
export const ICONE: { id: IconaId; nome: string; nativo: string | null }[] = [
  { id: 'chiara', nome: 'Chiara', nativo: null },
  { id: 'scura', nome: 'Scura', nativo: 'IconaScura' },
  { id: 'blu', nome: 'Blu', nativo: 'IconaBlu' },
]

/** L'icona che corrisponde al nome restituito dal sistema (`null` o sconosciuto = quella di partenza). */
export function idDaNome(nome: string | null | undefined): IconaId {
  return ICONE.find((i) => i.nativo !== null && i.nativo === nome)?.id ?? 'chiara'
}

/** Vero solo nell'app nativa, se il sistema permette di cambiare l'icona. */
export async function iconaDisponibile(): Promise<boolean> {
  if (!__NATIVE__) return false
  try {
    const { AppIcon } = await import('@capawesome/capacitor-app-icon')
    return (await AppIcon.isAvailable()).available
  } catch {
    return false
  }
}

export async function iconaCorrente(): Promise<IconaId> {
  try {
    const { AppIcon } = await import('@capawesome/capacitor-app-icon')
    return idDaNome((await AppIcon.getCurrentIcon()).icon)
  } catch {
    return 'chiara'
  }
}

/** Cambia l'icona. Su Android l'app si riavvia da sola (il sistema chiuderebbe l'attività dell'icona vecchia). */
export async function cambiaIcona(id: IconaId): Promise<void> {
  const { AppIcon } = await import('@capawesome/capacitor-app-icon')
  const nativo = ICONE.find((i) => i.id === id)?.nativo ?? null
  if (nativo === null) await AppIcon.resetIcon({ relaunch: true })
  else await AppIcon.setIcon({ icon: nativo, relaunch: true })
}
