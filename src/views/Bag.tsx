import { Backpack, Hammer, Search, Shirt, ShoppingBag, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { items } from '../data'
import { useGame } from '../state/GameContext'
import { useCelebration } from '../components/Celebration'
import type { ItemCategory } from '../types'
import styles from './Bag.module.scss'

type Filter = 'all' | ItemCategory

const filters: { id: Filter; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '✦' },
  { id: 'food', label: 'Food', icon: '🍓' },
  { id: 'care', label: 'Care', icon: '🫧' },
  { id: 'material', label: 'Materials', icon: '🧵' },
  { id: 'accessory', label: 'Wearables', icon: '🎀' },
  { id: 'background', label: 'Backgrounds', icon: '🌼' },
  { id: 'collectible', label: 'Collectibles', icon: '🌰' },
]

export function Bag() {
  const { state, activePet, equip } = useGame()
  const celebrate = useCelebration()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [equipping, setEquipping] = useState('')
  const owned = useMemo(() => items.filter((item) => {
    if ((state.inventory[item.id] ?? 0) < 1) return false
    if (filter !== 'all' && item.category !== filter) return false
    return item.name.toLowerCase().includes(search.trim().toLowerCase())
  }), [filter, search, state.inventory])
  const uniqueItems = Object.values(state.inventory).filter((quantity) => quantity > 0).length
  const totalItems = Object.values(state.inventory).reduce((total, quantity) => total + Math.max(0, quantity), 0)
  const equipped = new Set(Object.values(activePet?.equipped ?? {}))
  const equipItem = async (itemId: string, name: string) => {
    if (equipping) return
    setEquipping(itemId)
    try {
      await equip(itemId)
      const item = items.find((entry) => entry.id === itemId)
      celebrate({ icon: item?.icon ?? '🎀', title: 'Looking fabulous!', detail: `${name} is now equipped.` })
    } finally { setEquipping('') }
  }

  return <div className={styles.page}>
    <header className="pageHeader"><div><span>KEEPER'S BAG</span><h1>Your gathered treasures</h1><p>Everything you discover, craft, and purchase has a home here.</p></div><Backpack /></header>
    <section className={styles.summary} aria-label="Bag summary">
      <div><Backpack /><span><b>{totalItems}</b><small>Total items</small></span></div>
      <div><Sparkles /><span><b>{uniqueItems}</b><small>Unique treasures</small></span></div>
      <div><span className={styles.progressIcon}>{Math.round(state.collected.length / items.length * 100)}%</span><span><b>{state.collected.length}/{items.length}</b><small>Collection found</small></span></div>
    </section>
    <section className={styles.controls}>
      <label className={styles.search}><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your bag…" aria-label="Search your bag" /></label>
      <div className={styles.filters} aria-label="Filter bag by category">{filters.map((option) => <button key={option.id} className={filter === option.id ? styles.active : ''} aria-pressed={filter === option.id} onClick={() => setFilter(option.id)}><span>{option.icon}</span>{option.label}</button>)}</div>
    </section>
    <div className={styles.resultMeta}><strong>{owned.length} {owned.length === 1 ? 'treasure' : 'treasures'}</strong><span>Quantities include items not in escrow</span></div>
    {owned.length ? <section className={styles.grid} aria-label="Inventory items">{owned.map((item) => {
      const isCosmetic = item.category === 'accessory' || item.category === 'background'
      const isEquipped = equipped.has(item.id)
      return <article className={styles.card} key={item.id}>
        <div className={styles.art}><span>{item.icon}</span><b>×{state.inventory[item.id]}</b></div>
        <div className={styles.itemInfo}><span className={`${styles.rarity} ${styles[item.rarity.toLowerCase()]}`}>{item.rarity}</span><h2>{item.name}</h2><p>{item.description}</p></div>
        <div className={styles.actions}>
          {isCosmetic && <button className={styles.primaryAction} disabled={isEquipped || equipping === item.id} onClick={() => void equipItem(item.id, item.name)}><Shirt />{equipping === item.id ? 'Equipping…' : isEquipped ? 'Equipped' : 'Equip'}</button>}
          {item.category === 'material' && <Link className={styles.primaryAction} to="/workshop"><Hammer />Craft</Link>}
          <Link className={isCosmetic || item.category === 'material' ? styles.secondaryAction : styles.primaryAction} to={`/market?tab=sell&item=${item.id}`}><ShoppingBag />Sell</Link>
        </div>
      </article>
    })}</section> : <section className={styles.empty}><span>🧺</span><h2>No treasures found</h2><p>{search || filter !== 'all' ? 'Try another search or category.' : 'Visit the market or arcade to find something lovely.'}</p><Link className="button primary" to="/market">Visit the Market</Link></section>}
  </div>
}
