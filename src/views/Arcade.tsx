import { ArrowLeft, Play, Sparkles, Timer, Trophy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createBloomDeck } from '../lib/gameLogic'
import { useGame } from '../state/GameContext'
import styles from './Arcade.module.scss'

type Mode = 'menu' | 'bloom' | 'star'
type RunResult = { reward: number; error?: string }

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message
  return fallback
}

export function Arcade() {
  const [mode, setMode] = useState<Mode>('menu')
  return <div className={styles.page}>{mode === 'menu' ? <ArcadeMenu play={setMode} /> : mode === 'bloom' ? <BloomMatch close={() => setMode('menu')} /> : <StarCatch close={() => setMode('menu')} />}</div>
}

function ArcadeMenu({ play }: { play: (mode: Mode) => void }) {
  return <><header className="pageHeader"><div><span>STARBRIGHT ARCADE</span><h1>Play, sparkle, repeat!</h1><p>Every run earns Dewdrops. Daily rewards are capped to keep the market fair.</p></div><div className={styles.ticket}>ADMIT<br /><b>✦ 2</b></div></header><section className={styles.games}><GameCard title="Bloom Match" label="COZY PUZZLE" description="Pair the garden blooms before the timer runs out." icon="🌸" color="pink" onClick={() => play('bloom')} /><GameCard title="Starwhisk Sprint" label="QUICK REFLEX" description="Catch falling stars, but dodge the stormy clouds!" icon="🌠" color="blue" onClick={() => play('star')} /></section><section className={styles.leaderboard}><Trophy /><div><span>YOUR BEST TODAY</span><b>280 points</b></div><p>Daily earning room <strong>210 ✦</strong></p></section></>
}

function GameCard({ title, label, description, icon, color, onClick }: { title: string; label: string; description: string; icon: string; color: string; onClick: () => void }) {
  return <article className={`${styles.gameCard} ${styles[color]}`}><span>{label}</span><div className={styles.gameArt}>{icon}<i>✦</i><b>✦</b></div><h2>{title}</h2><p>{description}</p><button onClick={onClick}><Play fill="currentColor" /> Play now</button></article>
}

function useCountdown(active: boolean, onEnd: () => void, seconds = 30) {
  const [time, setTime] = useState(seconds)
  const onEndRef = useRef(onEnd)
  onEndRef.current = onEnd
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setTime((value) => {
      if (value <= 1) {
        window.clearInterval(id)
        window.setTimeout(() => onEndRef.current(), 0)
        return 0
      }
      return value - 1
    }), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return { time, reset: () => setTime(seconds) }
}

function BloomMatch({ close }: { close: () => void }) {
  const { startGame, gameReward } = useGame()
  const [active, setActive] = useState(false)
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [cards, setCards] = useState(createBloomDeck)
  const [openIds, setOpenIds] = useState<number[]>([])
  const [result, setResult] = useState<RunResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [runId, setRunId] = useState('')
  const finishingRef = useRef(false)
  const finish = async () => {
    if (!active || !runId || finishingRef.current) return
    finishingRef.current = true
    setActive(false)
    setSubmitting(true)
    try { setResult({ reward: await gameReward('bloom-match', scoreRef.current, runId) }) }
    catch (error) { setResult({ reward: 0, error: errorMessage(error, 'The reward could not be saved.') }) }
    finally { setSubmitting(false) }
  }
  const { time, reset: resetCountdown } = useCountdown(active, finish)
  const begin = async () => {
    setStarting(true); setStartError(''); setResult(null); setCards(createBloomDeck()); setOpenIds([]); setScore(0); scoreRef.current = 0; finishingRef.current = false; resetCountdown()
    try { const id = await startGame('bloom-match'); setRunId(id); setActive(true) }
    catch (error) { setStartError(errorMessage(error, 'The game could not start.')) }
    finally { setStarting(false) }
  }
  const flip = (id: number) => {
    if (!active || openIds.length === 2) return
    const card = cards.find((entry) => entry.id === id)
    if (!card || card.open || card.matched) return
    const nextOpen = [...openIds, id]
    setCards((current) => current.map((entry) => entry.id === id ? { ...entry, open: true } : entry))
    setOpenIds(nextOpen)
    if (nextOpen.length === 2) {
      const [a, b] = nextOpen.map((cardId) => cards.find((entry) => entry.id === cardId)!)
      const matched = a.value === b.value
      const clearsBoard = matched && cards.filter((entry) => entry.matched).length + 2 === cards.length
      window.setTimeout(() => {
        setCards((current) => current.map((entry) => nextOpen.includes(entry.id) ? { ...entry, open: matched, matched } : entry))
        setOpenIds([])
        if (matched) {
          scoreRef.current += 50
          setScore(scoreRef.current)
          if (clearsBoard) window.setTimeout(() => { void finish() }, 0)
        }
      }, 500)
    }
  }
  return <GameShell title="Bloom Match" time={time} score={score} close={close}>{!active && result === null && !submitting && <StartOverlay icon="🌸" title="Match every pair" onStart={() => void begin()} starting={starting} error={startError} />}{submitting && <ResultPending />}{result !== null && <Result title="Garden cleared!" score={score} result={result} close={close} replay={() => void begin()} />}
    <div className={styles.memoryGrid}>{cards.map((card) => <button key={card.id} className={card.open || card.matched ? styles.flipped : ''} disabled={card.matched} onClick={() => flip(card.id)}><span>✦</span><b>{card.value}</b></button>)}</div>
  </GameShell>
}

function StarCatch({ close }: { close: () => void }) {
  const { startGame, gameReward } = useGame()
  const [active, setActive] = useState(false)
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [target, setTarget] = useState({ x: 50, y: 50, cloud: false, id: 0 })
  const [result, setResult] = useState<RunResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [runId, setRunId] = useState('')
  const finishingRef = useRef(false)
  const finish = async () => {
    if (!active || !runId || finishingRef.current) return
    finishingRef.current = true
    setActive(false)
    setSubmitting(true)
    try { setResult({ reward: await gameReward('starwhisk-sprint', scoreRef.current, runId) }) }
    catch (error) { setResult({ reward: 0, error: errorMessage(error, 'The reward could not be saved.') }) }
    finally { setSubmitting(false) }
  }
  const { time, reset: resetCountdown } = useCountdown(active, finish)
  const begin = async () => {
    setStarting(true); setStartError(''); setResult(null); setScore(0); scoreRef.current = 0; finishingRef.current = false; resetCountdown()
    try { const id = await startGame('starwhisk-sprint'); setRunId(id); setActive(true) }
    catch (error) { setStartError(errorMessage(error, 'The game could not start.')) }
    finally { setStarting(false) }
  }
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setTarget((current) => ({ x: 8 + Math.random() * 78, y: 12 + Math.random() * 72, cloud: Math.random() < .24, id: current.id + 1 })), 720)
    return () => window.clearInterval(id)
  }, [active])
  const hit = () => { if (!active) return; setScore((value) => { const next = Math.max(0, value + (target.cloud ? -25 : 20)); scoreRef.current = next; return next }); setTarget((current) => ({ x: 8 + Math.random() * 78, y: 12 + Math.random() * 72, cloud: Math.random() < .24, id: current.id + 1 })) }
  return <GameShell title="Starwhisk Sprint" time={time} score={score} close={close}>{!active && result === null && !submitting && <StartOverlay icon="🌠" title="Catch stars, dodge clouds" onStart={() => void begin()} starting={starting} error={startError} />}{submitting && <ResultPending />}{result !== null && <Result title="Sprint complete!" score={score} result={result} close={close} replay={() => void begin()} />}<div className={styles.catchField}>{active && <button key={target.id} style={{ left: `${target.x}%`, top: `${target.y}%` }} className={target.cloud ? styles.cloud : ''} onPointerDown={hit}>{target.cloud ? '🌧️' : '⭐'}</button>}<div className={styles.hills} /></div></GameShell>
}

function GameShell({ title, time, score, close, children }: { title: string; time: number; score: number; close: () => void; children: React.ReactNode }) { return <section className={styles.gameShell}><header><button onClick={close}><ArrowLeft /> Exit</button><h1>{title}</h1><div><span><Timer /> {time}s</span><span><Sparkles /> {score}</span></div></header><div className={styles.playfield}>{children}</div></section> }
function StartOverlay({ icon, title, onStart, starting, error }: { icon: string; title: string; onStart: () => void; starting: boolean; error: string }) { return <div className={styles.overlay}><b>{icon}</b><h2>{title}</h2><p>You have 30 seconds. Rewards are granted when the run ends.</p>{error && <p className={styles.gameError} role="alert">{error}</p>}<button onClick={onStart} disabled={starting}><Play fill="currentColor" /> {starting ? 'Opening game…' : 'Start game'}</button></div> }
function ResultPending() { return <div className={styles.overlay} aria-live="polite"><b className={styles.tally}>✦</b><h2>Tallying your sparkles…</h2><p>Your score is safe while Bramblewick prepares the reward.</p></div> }
function Result({ title, score, result, close, replay }: { title: string; score: number; result: RunResult; close: () => void; replay: () => void }) { return <div className={styles.overlay} role="dialog" aria-live="polite"><b>🏆</b><h2>{title}</h2>{result.error ? <p className={styles.gameError}>You scored {score}, but the reward could not be saved: {result.error}</p> : <p>You scored {score} and earned <strong>{result.reward} Dewdrops</strong>.</p>}<div className={styles.resultActions}><button onClick={replay}><Play fill="currentColor" /> Play again</button><button className={styles.closeResult} onClick={close}>Close</button></div></div> }
