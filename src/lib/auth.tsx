import { createContext } from 'react'
import { useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'

/**
 * `unreachable`: il servizio non risponde entro il tempo limite (es. progetto Supabase in pausa, #25);
 * `saved`: si usano i dati salvati sul telefono finché il servizio non torna.
 */
export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'demo' | 'unreachable' | 'saved'

/** Tempo limite per sapere se si è dentro (#25). */
export const AUTH_TIMEOUT_MS = 12_000
const LAST_UID = 'jp.lastUid'

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
  /** Riprova a sapere se si è dentro. */
  retry: () => void
  /** Continua con i dati salvati sul telefono (servizio irraggiungibile). */
  useSaved: () => void
}

const AuthContext = createContext<AuthValue>({
  status: 'loading',
  session: null,
  signIn: async () => 'Non pronto',
  signOut: async () => undefined,
  retry: () => undefined,
  useSaved: () => undefined,
})

function translateError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Email o password non corrette. Controlla i dati e riprova.'
  if (/failed to fetch|network/i.test(message)) return 'Nessuna connessione: per il primo accesso serve la rete.'
  if (/email not confirmed/i.test(message)) return 'Email non confermata: conferma l’utente dalla dashboard di Supabase.'
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Senza variabili Supabase l'app parte in modalità demo (dati fittizi).
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'demo')
  const [session, setSession] = useState<Session | null>(null)

  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!supabase) return
    let active = true
    let settled = false
    const timer = window.setTimeout(() => {
      if (active && !settled) setStatus((cur) => (cur === 'loading' ? 'unreachable' : cur))
    }, AUTH_TIMEOUT_MS)

    supabase.auth
      .getSession()
      .then(({ data }) => {
        settled = true
        if (!active) return
        setSession(data.session)
        setStatus(data.session ? 'signed-in' : 'signed-out')
      })
      .catch(() => {
        settled = true
        if (active) setStatus((cur) => (cur === 'loading' ? 'unreachable' : cur))
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      settled = true
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
    async signIn(email, password) {
      if (!supabase) return 'Supabase non è configurato.'
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      return error ? translateError(error.message) : null
    },
    async signOut() {
      await supabase?.auth.signOut()
      try {
        localStorage.removeItem(LAST_UID)
      } catch {
        // ignorato
      }
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
