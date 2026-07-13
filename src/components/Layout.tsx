import { Backpack, Bell, Coins, Map, MessageCircle, PawPrint, ShoppingBag } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { PetAvatar } from './PetAvatar'
import { CompanionDock } from './CompanionDock'
import styles from './Layout.module.scss'

const nav = [
  { to: '/town', label: 'Town', icon: Map },
  { to: '/pet', label: 'Pet', icon: PawPrint },
  { to: '/bag', label: 'Bag', icon: Backpack },
  { to: '/market', label: 'Market', icon: ShoppingBag },
  { to: '/plaza', label: 'Chat', icon: MessageCircle },
]

export function Layout() {
  const { state, activePet, markNotificationsRead } = useGame()
  const navigate = useNavigate()
  const unread = state.notifications.filter((note) => !note.read).length
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <button className={styles.brand} onClick={() => navigate('/town')}><span>✦</span><b>Project Fable</b><small>BRAMBLEWICK</small></button>
        <div className={styles.status}>
          <span className={styles.coins}><Coins size={17} /> {state.coins.toLocaleString()}</span>
          <button className={styles.bell} aria-label={`${unread} unread notifications`} onClick={() => { void markNotificationsRead(); navigate('/inbox') }}><Bell size={20} />{unread > 0 && <i>{unread}</i>}</button>
          {activePet && <button className={styles.avatar} onClick={() => navigate('/profile')}><PetAvatar pet={activePet} size="small" /></button>}
        </div>
      </header>
      <main className={styles.main}><Outlet /></main>
      <CompanionDock />
      <nav className={styles.bottomNav} aria-label="Primary navigation">
        {nav.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? styles.active : ''}><Icon /><span>{label}</span></NavLink>)}
      </nav>
    </div>
  )
}
