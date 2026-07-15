import { Backpack, Bell, CircleUserRound, Coins, Map, MessageCircle, PawPrint, ShoppingBag } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import styles from './Layout.module.scss'

const nav = [
  { to: '/town', label: 'Town', icon: Map },
  { to: '/pet', label: 'Pet', icon: PawPrint },
  { to: '/bag', label: 'Bag', icon: Backpack },
  { to: '/market', label: 'Market', icon: ShoppingBag },
  { to: '/plaza', label: 'Chat', icon: MessageCircle },
]

export function Layout() {
  const { state, markNotificationsRead } = useGame()
  const navigate = useNavigate()
  const unread = state.notifications.filter((note) => !note.read).length
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button className={styles.brand} onClick={() => navigate('/town')}><span>✦</span><b>Project Fable</b><small>BRAMBLEWICK</small></button>
        <div className={styles.status}>
          <span className={styles.coins}><Coins size={17} /> {state.coins.toLocaleString()}</span>
          <button className={styles.bell} aria-label={`${unread} unread notifications`} onClick={() => { void markNotificationsRead(); navigate('/inbox') }}><Bell size={20} />{unread > 0 && <i>{unread}</i>}</button>
          <button className={styles.avatar} aria-label="Open Keeper profile" onClick={() => navigate('/profile')}><CircleUserRound /></button>
        </div>
      </header>
      <main className={styles.main}><Outlet /></main>
      <nav className={styles.bottomNav} aria-label="Primary navigation">
        {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? styles.active : ''}><Icon /><span>{label}</span></NavLink>)}
      </nav>
    </div>
  )
}
