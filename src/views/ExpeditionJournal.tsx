import { Award, BookOpen, Check, Clock3, Compass, Gift, LockKeyhole } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCelebration } from '../components/Celebration'
import { items } from '../data'
import { expeditionLocations, getExpeditionLocation } from '../expeditionData'
import { useGame } from '../state/GameContext'
import type { ExpeditionJournal as Journal, ExpeditionState } from '../types'
import styles from './ExpeditionJournal.module.scss'

export function ExpeditionJournal() {
  const { state, getExpedition, getExpeditionJournal, claimWeeklyExpeditionGoal } = useGame()
  const celebrate = useCelebration()
  const [journal, setJournal] = useState<Journal | null>(null)
  const [active, setActive] = useState<ExpeditionState | null>(null)
  const [error, setError] = useState('')
  const [claiming, setClaiming] = useState(false)

  const load = useCallback(async () => {
    const [nextJournal, nextActive] = await Promise.all([Promise.resolve(getExpeditionJournal()), Promise.resolve(getExpedition())])
    setJournal(nextJournal); setActive(nextActive)
  }, [getExpedition, getExpeditionJournal])
  useEffect(() => { void load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Could not open the journal.')) }, [load])

  if (!journal) return <main className={styles.loading}><BookOpen /><h1>Opening your expedition journal…</h1>{error && <p>{error}</p>}</main>
  const weeklyReady = journal.weekly.completed >= journal.weekly.targetCompleted && journal.weekly.uniqueDiscoveries >= journal.weekly.targetDiscoveries && !journal.weekly.claimed
  const claimWeekly = async () => {
    setClaiming(true); setError('')
    try { const result = await claimWeeklyExpeditionGoal(); await load(); celebrate({ level: 'major', icon: '🎁', title: 'Weekly expedition complete!', detail: `${result.coins} Dewdrops and ${result.reputation} reputation are yours.` }) }
    catch (claimError) { setError(claimError instanceof Error ? claimError.message : 'The weekly reward could not be claimed.') }
    finally { setClaiming(false) }
  }

  return <div className={styles.page}>
    <header className={styles.header}><div><span>KEEPER’S FIELD NOTES</span><h1>Expedition Journal</h1><p>Track discoveries, complete regional collections, and remember every companion adventure.</p></div><BookOpen /></header>
    {active && <Link className={styles.activeTrip} to="/expeditions"><Compass /><span><small>ACTIVE EXPEDITION</small><strong>{active.petName} · {getExpeditionLocation(active.location).name}</strong></span><b>{Date.now() >= new Date(active.returnsAt).getTime() ? 'Ready!' : 'Exploring'}</b></Link>}
    <section className={styles.weekly}><header><div><span>THIS WEEK</span><h2>Trailblazer’s Challenge</h2><p>Complete four expeditions and bring home three different discoveries.</p></div><Gift /></header><div className={styles.weeklyGoals}><Goal label="Expeditions" value={journal.weekly.completed} target={journal.weekly.targetCompleted} /><Goal label="Unique finds" value={journal.weekly.uniqueDiscoveries} target={journal.weekly.targetDiscoveries} /></div><footer><span>Reward: {journal.weekly.rewardCoins} ✦ · +{journal.weekly.rewardReputation} reputation</span><button disabled={!weeklyReady || claiming} onClick={() => void claimWeekly()}>{journal.weekly.claimed ? <><Check /> Claimed</> : weeklyReady ? <><Gift /> {claiming ? 'Claiming…' : 'Claim reward'}</> : <><LockKeyhole /> Keep exploring</>}</button></footer>{error && <p className={styles.error} role="alert">{error}</p>}</section>
    <section className={styles.collections}><header><div><span>REGIONAL COLLECTIONS</span><h2>Twelve trail treasures</h2></div><b>{journal.collected.length}/12</b></header><div className={styles.regionGrid}>{expeditionLocations.map((location) => { const locked = state.reputation < location.level; const badge = journal.badges.find((entry) => entry.label === location.badge.label); return <article key={location.id} className={locked ? styles.locked : ''}><header><b>{location.icon}</b><div><h3>{location.name}</h3><span>{locked ? `Unlocks at Level ${location.level}` : `${location.collection.filter((id) => journal.collected.includes(id)).length}/4 discovered`}</span></div>{badge && <i title={badge.description}>{badge.icon}</i>}</header><div className={styles.finds}>{location.collection.map((id, index) => { const item = items.find((entry) => entry.id === id)!; const found = journal.collected.includes(id); return <div key={id} className={found ? styles.found : ''}><b>{found ? item.icon : '?'}</b><span>{found ? item.name : index === 3 ? 'Crafted reward' : 'Unknown discovery'}</span></div> })}</div><footer>{badge ? <strong><Award /> {badge.label} earned</strong> : <span>Complete all four to earn {location.badge.icon} {location.badge.label}</span>}<Link to="/expeditions">Explore</Link></footer></article> })}</div></section>
    <section className={styles.badges}><header><div><span>FIELD BADGES</span><h2>Marks of a seasoned explorer</h2></div><Award /></header>{journal.badges.length ? <div>{journal.badges.map((badge) => <article key={badge.id}><b>{badge.icon}</b><strong>{badge.label}</strong><span>{badge.description}</span></article>)}</div> : <p>Your first badge awaits at the end of a regional collection.</p>}</section>
    <section className={styles.history}><header><div><span>RECENT TRAILS</span><h2>Expedition history</h2></div><Clock3 /></header>{journal.history.length ? <div>{journal.history.map((entry) => { const location = getExpeditionLocation(entry.location); return <article key={entry.id}><b>{location.icon}</b><span><strong>{location.name}</strong><small>{entry.petName} · {entry.durationMinutes} minutes · {new Date(entry.claimedAt).toLocaleDateString()}</small></span><i>{entry.result.items.reduce((total, item) => total + item.quantity, 0)} finds</i></article> })}</div> : <p>Your completed expeditions will be recorded here.</p>}</section>
  </div>
}

function Goal({ label, value, target }: { label: string; value: number; target: number }) {
  const progress = Math.min(100, value / target * 100)
  return <div><span><strong>{label}</strong><b>{Math.min(value, target)}/{target}</b></span><div><i style={{ width: `${progress}%` }} /></div></div>
}
