import { FormEvent, useState } from 'react'
import { KeyRound, Mail, Sparkles } from 'lucide-react'
import { useGame } from '../state/GameContext'
import styles from './AuthScreen.module.scss'

export function AuthScreen() {
  const { signIn, signUp, sendPasswordReset } = useGame()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    try {
      if (mode === 'login') await signIn(email, password)
      else {
        const result = await signUp(email, password, username.trim(), inviteCode.trim())
        if (result === 'pending') setMessage('Check your email to confirm your account, then return here to sign in.')
      }
    } catch (authError) { setError(authError instanceof Error ? authError.message : 'Authentication failed.') }
    finally { setBusy(false) }
  }

  const reset = async () => {
    if (!email) { setError('Enter your email first.'); return }
    setBusy(true); setError('')
    try { await sendPasswordReset(email); setMessage('Password reset instructions are on the way.') }
    catch (resetError) { setError(resetError instanceof Error ? resetError.message : 'Could not send reset email.') }
    finally { setBusy(false) }
  }

  return <main className={styles.page}><section className={styles.card}>
    <div className={styles.art}><div className={styles.logo}>✦</div><span>WELCOME TO</span><h1>Project Fable</h1><p>Meet your Fable. Find your people.</p><div className={styles.creatures}>🌿 ✨ ☁️ 💎</div></div>
    <div className={styles.formPanel}><div className={styles.tabs}><button className={mode === 'login' ? styles.active : ''} onClick={() => { setMode('login'); setError(''); setMessage('') }}>Sign in</button><button className={mode === 'signup' ? styles.active : ''} onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Use an invite</button></div>
      <header><Sparkles /><div><span>{mode === 'login' ? 'WELCOME BACK, KEEPER' : 'BEGIN YOUR STORY'}</span><h2>{mode === 'login' ? 'Bramblewick missed you' : 'Your invitation awaits'}</h2></div></header>
      <form onSubmit={submit}>
        {mode === 'signup' && <label>Keeper name<input value={username} minLength={3} maxLength={20} required onChange={(event) => setUsername(event.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="e.g. JuniperJay" /></label>}
        <label>Email<div><Mail /><input type="email" value={email} required onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label>
        <label>Password<div><KeyRound /><input type="password" value={password} minLength={8} required onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></div></label>
        {mode === 'signup' && <label>Invitation code<input value={inviteCode} minLength={6} required onChange={(event) => setInviteCode(event.target.value)} placeholder="Your one-time code" /></label>}
        {error && <p className={styles.error} role="alert">{error}</p>}{message && <p className={styles.success} role="status">{message}</p>}
        <button className="button primary" disabled={busy}>{busy ? 'One moment…' : mode === 'login' ? 'Enter Bramblewick' : 'Create account'}</button>
      </form>
      {mode === 'login' && <button className={styles.reset} onClick={() => void reset()}>Forgot your password?</button>}
      <small>Project Fable is a moderated 13+ community. Never share personal information.</small>
    </div>
  </section></main>
}
