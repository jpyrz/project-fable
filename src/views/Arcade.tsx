import { ArrowLeft, Play, Sparkles, Timer, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useGame } from '../state/GameContext'
import styles from './Arcade.module.scss'

type Mode = 'menu' | 'bloom' | 'star'
const blooms = ['🌸', '🌼', '🌺', '🌻']

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
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setTime((value) => { if (value <= 1) { window.clearInterval(id); window.setTimeout(onEnd, 0); return 0 } return value - 1 }), 1000)
    return () => window.clearInterval(id)
  }, [active, onEnd])
  return time
}

function BloomMatch({ close }: { close: () => void }) {
  const { startGame, gameReward } = useGame()
  const [active, setActive] = useState(false)
  const [score, setScore] = useState(0)
  const [cards, setCards] = useState(() => shuffle([...blooms, ...blooms, ...blooms].slice(0, 12).map((value, id) => ({ id, value, open: false, matched: false }))))
  const [openIds, setOpenIds] = useState<number[]>([])
  const [result, setResult] = useState<number | null>(null)
  const [runId, setRunId] = useState('')
  const begin = async () => { const id = await startGame('bloom-match'); setRunId(id); setActive(true) }
  const finish = async () => { if (!active || !runId) return; setActive(false); setResult(await gameReward('bloom-match', score, runId)) }
  const time = useCountdown(active, finish)
  const flip = (id: number) => {
    if (!active || openIds.length === 2) return
    const card = cards.find((entry) => entry.id === id)
    if (!card || card.open || card.matched) return
    const nextOpen = [...openIds, id]
    setCards((current) => current.map((entry) => entry.id === id ? { ...entry, open: true } : entry))
    setOpenIds(nextOpen)
    if (nextOpen.length === 2) window.setTimeout(() => {
      setCards((current) => {
        const [a, b] = nextOpen.map((cardId) => current.find((entry) => entry.id === cardId)!)
        if (a.value === b.value) { setScore((value) => value + 50); return current.map((entry) => nextOpen.includes(entry.id) ? { ...entry, matched: true } : entry) }
        return current.map((entry) => nextOpen.includes(entry.id) ? { ...entry, open: false } : entry)
      }); setOpenIds([])
    }, 500)
  }
  return <GameShell title="Bloom Match" time={time} score={score} close={close}>{!active && result === null && <StartOverlay icon="🌸" title="Match every pair" onStart={() => void begin()} />}{result !== null && <Result score={score} reward={result} close={close} />}
    <div className={styles.memoryGrid}>{cards.map((card) => <button key={card.id} className={card.open || card.matched ? styles.flipped : ''} disabled={card.matched} onClick={() => flip(card.id)}><span>✦</span><b>{card.value}</b></button>)}</div>
  </GameShell>
}

function StarCatch({ close }: { close: () => void }) {
  const { startGame, gameReward } = useGame()
  const [active, setActive] = useState(false)
  const [score, setScore] = useState(0)
  const [target, setTarget] = useState({ x: 50, y: 50, cloud: false, id: 0 })
  const [result, setResult] = useState<number | null>(null)
  const [runId, setRunId] = useState('')
  const begin = async () => { const id = await startGame('starwhisk-sprint'); setRunId(id); setActive(true) }
  const finish = async () => { if (!active || !runId) return; setActive(false); setResult(await gameReward('starwhisk-sprint', score, runId)) }
  const time = useCountdown(active, finish)
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setTarget((current) => ({ x: 8 + Math.random() * 78, y: 12 + Math.random() * 72, cloud: Math.random() < .24, id: current.id + 1 })), 720)
    return () => window.clearInterval(id)
  }, [active])
  const hit = () => { if (!active) return; setScore((value) => Math.max(0, value + (target.cloud ? -25 : 20))); setTarget((current) => ({ x: 8 + Math.random() * 78, y: 12 + Math.random() * 72, cloud: Math.random() < .24, id: current.id + 1 })) }
  return <GameShell title="Starwhisk Sprint" time={time} score={score} close={close}>{!active && result === null && <StartOverlay icon="🌠" title="Catch stars, dodge clouds" onStart={() => void begin()} />}{result !== null && <Result score={score} reward={result} close={close} />}<div className={styles.catchField}>{active && <button key={target.id} style={{ left: `${target.x}%`, top: `${target.y}%` }} className={target.cloud ? styles.cloud : ''} onPointerDown={hit}>{target.cloud ? '🌧️' : '⭐'}</button>}<div className={styles.hills} /></div></GameShell>
}

function GameShell({ title, time, score, close, children }: { title: string; time: number; score: number; close: () => void; children: React.ReactNode }) { return <section className={styles.gameShell}><header><button onClick={close}><ArrowLeft /> Exit</button><h1>{title}</h1><div><span><Timer /> {time}s</span><span><Sparkles /> {score}</span></div></header><div className={styles.playfield}>{children}</div></section> }
function StartOverlay({ icon, title, onStart }: { icon: string; title: string; onStart: () => void }) { return <div className={styles.overlay}><b>{icon}</b><h2>{title}</h2><p>You have 30 seconds. Rewards are granted when the run ends.</p><button onClick={onStart}><Play fill="currentColor" /> Start game</button></div> }
function Result({ score, reward, close }: { score: number; reward: number; close: () => void }) { return <div className={styles.overlay}><b>🏆</b><h2>Lovely run!</h2><p>You scored {score} and earned <strong>{reward} Dewdrops</strong>.</p><button onClick={close}>Back to arcade</button></div> }
function shuffle<T>(values: T[]) { return [...values].sort(() => Math.random() - .5) }
