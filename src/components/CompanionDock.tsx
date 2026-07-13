import { Heart, Sparkles, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import type { CareKind } from '../types'
import { PetAvatar } from './PetAvatar'
import styles from './CompanionDock.module.scss'

const careActions: { kind: CareKind; icon: string; label: string }[] = [
  { kind: 'food', icon: '🍓', label: 'Snack' },
  { kind: 'play', icon: '🟣', label: 'Play' },
  { kind: 'groom', icon: '✨', label: 'Freshen' },
]

function companionLine(pet: NonNullable<ReturnType<typeof useGame>['activePet']>) {
  const lowest = Math.min(pet.hunger, pet.mood, pet.cleanliness)
  if (lowest === pet.hunger && lowest < 55) return `Psst… my tummy is making tiny thunder noises.`
  if (lowest === pet.mood && lowest < 55) return `Could we do something silly together?`
  if (lowest === pet.cleanliness && lowest < 55) return `I may have explored one puddle too many.`
  const lines = [
    `I saved you the coziest spot in Bramblewick!`,
    `Do you think clouds ever get ticklish?`,
    `I'm right here if you need an adventure buddy.`,
  ]
  return lines[new Date().getUTCDate() % lines.length]
}

export function CompanionDock() {
  const { activePet, care } = useGame()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState<CareKind | ''>('')
  const location = useLocation()
  const navigate = useNavigate()
  const line = useMemo(() => activePet ? companionLine(activePet) : '', [activePet])
  if (!activePet) return null
  const quickCare = async (kind: CareKind) => {
    setBusy(kind)
    try { await care(kind) } finally { setBusy('') }
  }
  return <aside className={`${styles.dock} ${open ? styles.open : ''} ${location.pathname === '/pet' ? styles.onPetPage : ''}`} aria-label={`${activePet.name}, your companion`}>
    {!open && <button className={styles.peek} onClick={() => setOpen(true)} aria-label={`Talk to ${activePet.name}`}>
      <span className={styles.peekBubble}>{activePet.hunger < 55 || activePet.mood < 55 || activePet.cleanliness < 55 ? 'Psst!' : 'Hi!'}</span>
      <PetAvatar pet={activePet} size="small" />
    </button>}
    {open && <div className={styles.panel}>
      <button className={styles.close} onClick={() => setOpen(false)} aria-label="Close companion actions"><X /></button>
      <div className={styles.friend}><PetAvatar pet={activePet} size="small" /></div>
      <div className={styles.dialogue}><small>{activePet.name.toUpperCase()} SAYS</small><p>“{line}”</p></div>
      <div className={styles.needs}>
        <span><b>🍓 {activePet.hunger}</b><small>Tummy</small></span>
        <span><b>💗 {activePet.mood}</b><small>Joy</small></span>
        <span><b>✨ {activePet.cleanliness}</b><small>Sparkle</small></span>
      </div>
      <div className={styles.actions}>{careActions.map((action) => <button key={action.kind} disabled={Boolean(busy)} onClick={() => void quickCare(action.kind)}><b>{action.icon}</b><span>{busy === action.kind ? 'One sec…' : action.label}</span></button>)}</div>
      <div className={styles.links}>
        <button onClick={() => { setOpen(false); navigate('/pet') }}><Heart /> Pet home</button>
        <button onClick={() => { setOpen(false); navigate('/friends') }}><Users /> Friends</button>
        <button onClick={() => { setOpen(false); navigate('/town') }}><Sparkles /> Adventure</button>
      </div>
    </div>}
  </aside>
}
