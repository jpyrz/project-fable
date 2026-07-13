import { Backpack, Clock3, Compass, MapPin, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCelebration } from '../components/Celebration'
import { PetAvatar } from '../components/PetAvatar'
import { items } from '../data'
import { foodTraitFor, foodTraits } from '../lib/foodEffects'
import { useGame } from '../state/GameContext'
import type { ExpeditionReward, ExpeditionState, Pet } from '../types'
import styles from './Expeditions.module.scss'

const durations = [
  { minutes: 10 as const, label: 'Quick wander', coins: '45+', chance: '20%' },
  { minutes: 20 as const, label: 'Glen ramble', coins: '80+', chance: '25%' },
  { minutes: 30 as const, label: 'Deep discovery', coins: '115+', chance: '30%' },
]

export function Expeditions() {
  const { activePet, state, getExpedition, startExpedition, claimExpedition } = useGame()
  const celebrate = useCelebration()
  const [expedition, setExpedition] = useState<ExpeditionState | null>(null)
  const [reward, setReward] = useState<ExpeditionReward | null>(null)
  const [duration, setDuration] = useState<10 | 20 | 30>(10)
  const [snack, setSnack] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(Date.now())
  const [serverOffset, setServerOffset] = useState(0)

  useEffect(() => {
    let live = true
    void Promise.resolve(getExpedition())
      .then((current) => { if (live) { setExpedition(current); if (current) setServerOffset(new Date(current.serverNow).getTime() - Date.now()) } })
      .catch((requestError) => { if (live) setError(requestError instanceof Error ? requestError.message : 'Could not open expeditions.') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [getExpedition])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1_000); return () => window.clearInterval(timer) }, [])

  const foods = useMemo(() => items.filter((item) => item.category === 'food' && (state.inventory[item.id] ?? 0) > 0), [state.inventory])
  const remainingMs = expedition ? Math.max(0, new Date(expedition.returnsAt).getTime() - (now + serverOffset)) : 0
  const totalMs = expedition ? new Date(expedition.returnsAt).getTime() - new Date(expedition.startedAt).getTime() : 1
  const progress = expedition ? Math.min(100, Math.max(0, 100 - remainingMs / totalMs * 100)) : 0
  const ready = Boolean(expedition && remainingMs <= 0)

  const begin = async () => {
    if (busy) return
    setBusy(true); setError('')
    try {
      const started = await startExpedition(duration, snack)
      setExpedition(started)
      setServerOffset(new Date(started.serverNow).getTime() - Date.now())
      const packed = snack ? items.find((item) => item.id === snack) : null
      celebrate({ icon: '🧭', title: `${started.petName} is off exploring!`, detail: packed ? `${packed.name} was packed from your bag for a ${foodTraits[foodTraitFor(packed.id)].label} bonus.` : 'Sunberry Glen will be waiting when they return.' })
    } catch (startError) { setError(startError instanceof Error ? startError.message : 'The expedition could not begin.') }
    finally { setBusy(false) }
  }

  const choose = async (choice: 'follow-glow' | 'gather-grove') => {
    if (!expedition || busy) return
    setBusy(true); setError('')
    try {
      const claimed = await claimExpedition(expedition.id, choice)
      setReward(claimed); setExpedition(null)
      celebrate({ level: 'major', icon: claimed.rare ? '🏮' : '🧺', title: claimed.title, detail: `${claimed.coins} Dewdrops, ${claimed.reputation} reputation, and ${claimed.items.reduce((total, item) => total + item.quantity, 0)} finds came home.` })
    } catch (claimError) { setError(claimError instanceof Error ? claimError.message : 'The discoveries could not be claimed.') }
    finally { setBusy(false) }
  }

  if (!activePet) return null
  if (loading) return <main className={styles.loading}><Compass /><h1>Checking the expedition trail…</h1></main>
  if (reward) return <RewardView reward={reward} petName={activePet.name} onAgain={() => { setReward(null); setSnack(null) }} />
  if (expedition) return ready
    ? <ReturnScene expedition={expedition} busy={busy} error={error} onChoose={choose} />
    : <Traveling expedition={expedition} activePet={activePet} progress={progress} remainingMs={remainingMs} />

  return <div className={styles.page}>
    <header className={styles.hero}><div><span>COMPANION EXPEDITIONS</span><h1>Sunberry Glen</h1><p>A mossy trail of clover hollows, old roots, and lantern-bright fireflies.</p><div><b><MapPin /> Gathering trail</b><b><Sparkles /> Rare discoveries</b></div></div><div className={styles.heroPet}><PetAvatar pet={activePet} /><span>{activePet.name} is ready!</span></div></header>
    <section className={styles.prep}><header><span>STEP ONE</span><h2>Choose how long to explore</h2><p>Longer journeys bring more Dewdrops and a better base rare-find chance.</p></header><div className={styles.durations}>{durations.map((option) => <button key={option.minutes} className={duration === option.minutes ? styles.selected : ''} onClick={() => setDuration(option.minutes)} aria-pressed={duration === option.minutes}><Clock3 /><b>{option.minutes} minutes</b><span>{option.label}</span><small>{option.coins} ✦ · {option.chance} rare chance</small></button>)}</div></section>
    <section className={styles.prep}><header><span>STEP TWO · OPTIONAL</span><h2>Pack one trail snack</h2><p>The snack is used when the expedition starts. Every effect is shown before you choose.</p></header><button className={`${styles.noSnack} ${snack === null ? styles.selectedSnack : ''}`} onClick={() => setSnack(null)}><b>🧺</b><span><strong>No snack</strong><small>Keep your food · no expedition bonus</small></span></button>{foods.length ? <div className={styles.snacks}>{foods.map((food) => { const trait = foodTraitFor(food.id); const effect = foodTraits[trait]; return <button key={food.id} className={snack === food.id ? styles.selectedSnack : ''} onClick={() => setSnack(food.id)}><b>{food.icon}</b><span><strong>{food.name}</strong><small>{effect.icon} {effect.label} · {effect.description}</small><i>×{state.inventory[food.id]}</i></span></button> })}</div> : <p className={styles.emptySnack}>No food in your bag. You can still explore, or <Link to="/market?tab=shop">visit the Market</Link>.</p>}</section>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <section className={styles.launch}><div><span>READY FOR THE TRAIL</span><b>{duration} minutes {snack ? `· ${foodTraits[foodTraitFor(snack)].label} snack` : '· no snack'}</b></div><button disabled={busy} onClick={() => void begin()}><Compass />{busy ? 'Opening the trail…' : `Send ${activePet.name}`}</button></section>
  </div>
}

function Traveling({ expedition, activePet, progress, remainingMs }: { expedition: ExpeditionState; activePet: Pet; progress: number; remainingMs: number }) {
  return <div className={styles.journeyPage}><section className={styles.journey}><span className={styles.sky}>☁️ · ✨ · ☁️</span><div className={styles.travelPet}><PetAvatar pet={activePet} /></div><span>OUT EXPLORING</span><h1>{expedition.petName} is wandering Sunberry Glen</h1><p>They’ll return with a story and a choice for you to make.</p><div className={styles.timer}><strong>{formatRemaining(remainingMs)}</strong><span>until the trail home opens</span><div><i style={{ width: `${progress}%` }} /></div></div>{expedition.foodTrait && <b className={styles.activeEffect}>{foodTraits[expedition.foodTrait].icon} {foodTraits[expedition.foodTrait].label} snack active</b>}<Link to="/town">Keep exploring Bramblewick</Link></section></div>
}

function ReturnScene({ expedition, busy, error, onChoose }: { expedition: ExpeditionState; busy: boolean; error: string; onChoose: (choice: 'follow-glow' | 'gather-grove') => void }) {
  return <div className={styles.returnPage}><section className={styles.story}><span>🌿 · 🏮 · 🌿</span><small>A DISCOVERY IN SUNBERRY GLEN</small><h1>{expedition.petName} found a fork in the trail…</h1><p>Lantern-bright fireflies drift toward a clover hollow, while the roots of an ancient willow glitter with useful treasures. Where did they look?</p>{expedition.foodTrait && <b>{foodTraits[expedition.foodTrait].icon} {foodTraits[expedition.foodTrait].label} bonus is active</b>}<div className={styles.choices}><button disabled={busy} onClick={() => onChoose('follow-glow')}><span>🏮</span><strong>Follow the fireflies</strong><small>Higher chance of a rare collectible, but fewer materials.</small></button><button disabled={busy} onClick={() => onChoose('gather-grove')}><span>🧺</span><strong>Gather by the old roots</strong><small>Guaranteed extra crafting materials.</small></button></div>{error && <p className={styles.error} role="alert">{error}</p>}{busy && <p className={styles.resolving}>Gathering up the discoveries…</p>}</section></div>
}

function RewardView({ reward, petName, onAgain }: { reward: ExpeditionReward; petName: string; onAgain: () => void }) {
  return <div className={styles.rewardPage}><section className={styles.reward}><span>{reward.rare ? '🏮' : '🧺'}</span><small>EXPEDITION COMPLETE</small><h1>{reward.title}</h1><p>{reward.detail}</p><div className={styles.rewardSummary}><article><b>✦</b><strong>{reward.coins}</strong><small>Dewdrops</small></article><article><b>⭐</b><strong>+{reward.reputation}</strong><small>Reputation</small></article>{reward.items.map((entry) => { const item = items.find((candidate) => candidate.id === entry.itemId); return item ? <article key={entry.itemId}><b>{item.icon}</b><strong>×{entry.quantity}</strong><small>{item.name}</small></article> : null })}</div><p className={styles.homeNote}>{petName} tucked everything safely into your bag.</p><div className={styles.rewardActions}><button onClick={onAgain}><Compass /> Explore again</button><Link to="/bag"><Backpack /> Open bag</Link></div></section></div>
}

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1_000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}
