import { createContext } from 'react'
import { describeError } from './db'
import { useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js'
import { cancellaDatiLocali } from './datiLocali'
import { CHIAVE_SESSIONE, isSupabaseConfigured, supabase } from './supabase'
import { t } from '../i18n'

/** Segnata all'accesso, tolta quando si sceglie il viaggio: l'app apre «Tutti i viaggi» invece dell'ultima pagina. */
export const SCEGLI_DOPO_ACCESSO = 'jp.scegliDopoAccesso'

/**
 * `unreachable`: il servizio non risponde entro il tempo limite (es. progetto Supabase in pausa, #25);
 * `saved`: si usano i dati salvati sul telefono finché il servizio non torna.
 */
export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'demo' | 'unreachable' | 'saved'

/** Tempo limite per sapere se si è dentro (#25). */
export const AUTH_TIMEOUT_MS = 12_000
const LAST_UID = 'jp.lastUid'
const NOME_PROFILO = 'jp.nomeProfilo'

/** Il nome scelto per il profilo (account) o, in demo e con i dati salvati, quello tenuto sul telefono. */
export function nomeProfiloDa(user: { user_metadata?: unknown } | null | undefined, sulTelefono = ''): string {
  // «display_name» è il campo «Display name» di Supabase (si vede e si corregge anche dalla dashboard);
  // «profile_name» è la chiave usata per poche ore in una versione precedente: si legge ancora, non si scrive più
  const meta = user?.user_metadata as { display_name?: unknown; profile_name?: unknown } | undefined
  const testo = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  return testo(meta?.display_name) || testo(meta?.profile_name) || sulTelefono.trim()
}

function leggiNomeTelefono(): string {
  try {
    return localStorage.getItem(NOME_PROFILO) ?? ''
  } catch {
    return ''
  }
}

/** L'ultimo account entrato su questo telefono: serve a riconoscere «me» nei dati salvati. */
export function lastUid(): string | null {
  try {
    return localStorage.getItem(LAST_UID)
  } catch {
    return null
  }
}

interface AuthValue {
  status: AuthStatus
  session: Session | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  /** Il nome scelto per il profilo: è quello proposto in ogni nuovo viaggio (vuoto se non scelto). */
  profileName: string
  /** Cambia il nome del profilo; stringa vuota = tornare al nome dell'account. Restituisce un errore, o `null`. */
  setProfileName: (name: string) => Promise<string | null>
  /** Riprova a sapere se si è dentro. */
  retry: () => void
  /** Continua con i dati salvati sul telefono (servizio irraggiungibile). */
  useSaved: () => void
}

const AuthContext = createContext<AuthValue>({
  status: 'loading',
  session: null,
  signIn: async () => t('Non pronto'),
  signOut: async () => undefined,
  profileName: '',
  setProfileName: async () => t('Non pronto'),
  retry: () => undefined,
  useSaved: () => undefined,
})

function translateError(message: string): string {
  if (/invalid login credentials/i.test(message)) return t('Email o password non corrette. Controlla i dati e riprova.')
  if (/failed to fetch|network/i.test(message)) return t('Nessuna connessione: per il primo accesso serve la rete.')
  if (/email not confirmed/i.test(message)) return t('Email non confermata: conferma l’utente dalla dashboard di Supabase.')
  return describeError({ message })
}

/**
 * La sessione ancora salvata sul telefono, anche col token scaduto. Offline, con il token d'accesso scaduto (dopo un'ora),
 * supabase-js non riesce a rinnovarlo e risponde «nessuna sessione» pur tenendola salvata: non è un'uscita. Si resta dentro
 * con i dati del telefono e il token si rinnova da solo appena torna la rete.
 */
export function sessioneSalvata(): Session | null {
  if (!CHIAVE_SESSIONE) return null
  try {
    const raw = localStorage.getItem(CHIAVE_SESSIONE)
    const s = raw ? (JSON.parse(raw) as Partial<Session> | null) : null
    return s && typeof s.access_token === 'string' && typeof s.refresh_token === 'string' && s.user?.id ? (s as Session) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Senza variabili Supabase l'app parte in modalità demo (dati fittizi).
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'demo')
  const [session, setSession] = useState<Session | null>(null)

  const [attempt, setAttempt] = useState(0)
  const [nomeTelefono, setNomeTelefono] = useState(leggiNomeTelefono)

  useEffect(() => {
    if (!supabase) return
    let active = true
    let settled = false
    const timer = window.setTimeout(() => {
      if (active && !settled) setStatus((cur) => (cur === 'loading' ? 'unreachable' : cur))
    }, AUTH_TIMEOUT_MS)

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        settled = true
        if (!active) return
        // offline col token scaduto: la sessione è ancora salvata, quindi si è ancora dentro (non si cancella niente)
        const tenuta = !data.session && error && isAuthRetryableFetchError(error) ? sessioneSalvata() : null
        const s = data.session ?? tenuta
        setSession(s)
        setStatus(s ? 'signed-in' : 'signed-out')
      })
      .catch(() => {
        settled = true
        if (active) setStatus((cur) => (cur === 'loading' ? 'unreachable' : cur))
      })

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      settled = true
      // si esce solo con un'uscita vera (SIGNED_OUT): una sessione «vuota» per la rete assente, con la sessione ancora salvata, non conta
      if (!next && event !== 'SIGNED_OUT' && sessioneSalvata()) return
      setSession(next)
      setStatus(next ? 'signed-in' : 'signed-out')
    })

    return () => {
      active = false
      window.clearTimeout(timer)
      sub.subscription.unsubscribe()
    }
  }, [attempt])

  useEffect(() => {
    if (status === 'signed-out') setNomeTelefono('')
  }, [status])

  useEffect(() => {
    const uid = session?.user.id
    if (!uid) return
    try {
      localStorage.setItem(LAST_UID, uid)
    } catch {
      // ignorato
    }
  }, [session?.user.id])

  const value: AuthValue = {
    status,
    session,
    profileName: nomeProfiloDa(session?.user, nomeTelefono),
    async setProfileName(name) {
      const nuovo = name.trim().slice(0, 40)
      if (supabase && session) {
        const { error } = await supabase.auth.updateUser({ data: { display_name: nuovo, profile_name: null } })
        if (error) return translateError(error.message)
      }
      // sul telefono si tiene sempre una copia: serve in demo, con i dati salvati e se il servizio non risponde
      try {
        if (nuovo) localStorage.setItem(NOME_PROFILO, nuovo)
        else localStorage.removeItem(NOME_PROFILO)
      } catch {
        // ignorato
      }
      setNomeTelefono(nuovo)
      return null
    },
    async signIn(email, password) {
      if (!supabase) return t('Supabase non è configurato.')
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) return translateError(error.message)
      // subito dopo l'accesso si sceglie il viaggio (riaprendo l'app senza uscire, invece, si torna dov'eri)
      try {
        localStorage.setItem(SCEGLI_DOPO_ACCESSO, '1')
      } catch {
        // ignorato
      }
      return null
    },
    async signOut() {
      await supabase?.auth.signOut()
      // sul telefono non resta niente dell'account: copia dei viaggi, coda, nome, file, avvisi (vedi `cancellaDatiLocali`)
      cancellaDatiLocali()
      setNomeTelefono('')
    },
    retry() {
      setStatus('loading')
      setAttempt((n) => n + 1)
    },
    useSaved() {
      setStatus('saved')
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
