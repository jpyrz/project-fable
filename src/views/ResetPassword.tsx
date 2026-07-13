import { FormEvent, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useGame } from '../state/GameContext'
import styles from './AuthScreen.module.scss'

export function ResetPassword() {
  const { updatePassword } = useGame()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await updatePassword(password) }
    catch (updateError) { setError(updateError instanceof Error ? updateError.message : 'Could not update password.') }
    finally { setBusy(false) }
  }
  return <main className={styles.page}><section className={styles.card}><div className={styles.art}><div className={styles.logo}>✦</div><span>ACCOUNT RECOVERY</span><h1>Project Fable</h1><p>Your Fables kept your place.</p></div><div className={styles.formPanel}><header><KeyRound /><div><span>CHOOSE A NEW KEY</span><h2>Reset your password</h2></div></header><form onSubmit={submit}><label>New password<input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>{error && <p className={styles.error} role="alert">{error}</p>}<button className="button primary" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button></form></div></section></main>
}
