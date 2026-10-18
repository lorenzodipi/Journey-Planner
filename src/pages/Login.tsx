import { useState } from 'preact/hooks'
import { useAuth } from '../lib/auth'

export function Login() {
  const auth = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: Event) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const message = await auth.signIn(email, password)
    if (message) setError(message)
    setBusy(false)
  }

  return (
    <main
      class="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div class="rise">
        <span
          aria-hidden="true"
          class="mb-6 block h-14 w-14 rounded-full"
          style={{ background: 'linear-gradient(145deg, var(--accent), var(--secondary))' }}
        />
        <h1 class="font-display text-4xl font-extrabold leading-none">Journey Planner</h1>
        <p class="mt-2 text-muted">Accedi per aprire i tuoi viaggi.</p>

        <form class="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
          <label class="block">
            <span class="mb-1 block text-sm font-extrabold">Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="username"
              required
              value={email}
              onInput={(e) => setEmail(e.currentTarget.value)}
              class="min-h-12 w-full rounded-[14px] border-2 border-line bg-surface px-4"
            />
          </label>
          <label class="block">
            <span class="mb-1 block text-sm font-extrabold">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onInput={(e) => setPassword(e.currentTarget.value)}
              class="min-h-12 w-full rounded-[14px] border-2 border-line bg-surface px-4"
            />
          </label>

          {error && (
            <p role="alert" class="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || !email || !password}
            class="min-h-12 w-full rounded-full bg-accent px-6 font-extrabold text-accent-ink transition-opacity disabled:opacity-50"
          >
            {busy ? 'Accesso in corso…' : 'Accedi'}
          </button>
        </form>
      </div>
    </main>
  )
}
