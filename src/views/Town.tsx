import { Gamepad2, Hammer, Heart, MessageCircle, ShoppingBasket, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import styles from './Town.module.scss'

const destinations = [
  { to: '/arcade', label: 'Starbright Arcade', icon: Gamepad2, className: 'arcade' },
  { to: '/market', label: 'Merry Market', icon: ShoppingBasket, className: 'market' },
  { to: '/workshop', label: 'Tinker Workshop', icon: Hammer, className: 'workshop' },
  { to: '/plaza', label: 'Friendship Plaza', icon: MessageCircle, className: 'plaza' },
  { to: '/pet', label: 'Cozy Cottage', icon: Heart, className: 'cottage' },
]

export function Town() {
  const { state, makeWish, claimTask } = useGame()
  return <div className={styles.page}>
    <section className={styles.welcome}><div><span>GOOD MORNING, KEEPER</span><h1>What shall we discover today?</h1></div><p><b>Day 3</b><small>Summerbloom Season</small></p></section>
    <section className={styles.map}>
      <img src="/bramblewick-town.png" alt="The illustrated village of Bramblewick" />
      <div className={styles.mapTitle}><span>Welcome to</span><b>Bramblewick</b></div>
      {destinations.map(({ to, label, icon: Icon, className }) => <Link key={to} to={to} aria-label={label} className={`${styles.pin} ${styles[className]}`}><Icon /><span>{label}</span></Link>)}
      <button aria-label="Make a wish at the Wishing Well" className={`${styles.pin} ${styles.well}`} onClick={() => void makeWish()} disabled={state.dailyWishClaimed}><Sparkles /><span>{state.dailyWishClaimed ? 'Wish made!' : 'Wishing Well'}</span></button>
    </section>
    <section className={styles.dailies}><header><div><span>TODAY IN BRAMBLEWICK</span><h2>Little daily adventures</h2></div><b>{state.tasks.filter((t) => t.claimed).length}/{state.tasks.length}</b></header>
      <div className={styles.taskGrid}>{state.tasks.map((task) => <article key={task.id}><div><span>{task.id === 'care' ? '💗' : task.id === 'play' ? '🎮' : '🎁'}</span><div><strong>{task.label}</strong><small>{task.progress}/{task.target} complete</small></div></div><div className={styles.progress}><i style={{ width: `${task.progress / task.target * 100}%` }} /></div><button disabled={task.claimed || task.progress < task.target} onClick={() => void claimTask(task.id)}>{task.claimed ? 'Claimed' : `Claim ${task.reward} ✦`}</button></article>)}</div>
    </section>
  </div>
}
