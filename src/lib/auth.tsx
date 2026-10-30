import { createContext } from 'react'
import { useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from './supabase'

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'demo'

interface AuthValue {
  status: AuthStatus
  session: Session | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue>({
  status: 'loading',
  session: null,
  signIn: async () => 'Non pronto',
  signOut: async () => undefined,
})

function translateError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Email o password non corretti.'
  if (/failed to fetch|network/i.test(message)) return 'Nessuna connessione: per il primo accesso serve la rete.'
  if (/email not confirmed/i.test(message)) return 'Email non confermata: conferma l’utente dalla dashboard di Supabase.'
  return message
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Senza variabili Supabase l'app parte in modalità demo (dati fittizi).
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'demo')
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!supabase) return
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setStatus(data.session ? 'signed-in' : 'signed-out')
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setStatus(next ? 'signed-in' : 'signed-out')
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

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
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
