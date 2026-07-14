import { Bath, Cookie, Gamepad2, Heart, Scissors, Shirt, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { items } from '../data'
import { useCelebration } from '../components/Celebration'
import { PetAvatar } from '../components/PetAvatar'
import { getSpecies, useGame } from '../state/GameContext'
import type { CareKind } from '../types'
import styles from './PetHome.module.scss'

export function PetHome() {
  const { activePet, care, feed, state, equip } = useGame()
  const celebrate = useCelebration()
  const [choosingFood, setChoosingFood] = useState(false)
  const [feeding, setFeeding] = useState('')
  const [feedError, setFeedError] = useState('')
  if (!activePet) return null
  const kind = getSpecies(activePet.speciesId)
  const closet = items.filter((item) => (state.inventory[item.id] ?? 0) > 0 && ['accessory', 'background'].includes(item.category))
  const foods = items.filter((item) => item.category === 'food' && (state.inventory[item.id] ?? 0) > 0)
  const careActions: { kind: Exclude<CareKind, 'food'>; label: string; icon: typeof Cookie }[] = [
    { kind: 'groom', label: 'Groom', icon: Bath }, { kind: 'play', label: 'Play', icon: Gamepad2 },
  ]
  const giveCare = async (action: CareKind, label: string) => { await care(action); celebrate({ icon: action === 'groom' ? '🫧' : '💗', title: `${activePet.name} feels wonderful!`, detail: `${label} gave their needs a cozy boost.` }) }
  const giveFood = async (itemId: string) => {
    const food = items.find((item) => item.id === itemId)
    if (!food || feeding) return
    setFeedError('')
    setFeeding(itemId)
    try {
      await feed(itemId)
      setChoosingFood(false)
      celebrate({ icon: food.icon, title: `${activePet.name} loved that!`, detail: `${food.name} was used from your bag and restored ${foodRestore(food.rarity)} Tummy.` })
    } catch (error) {
      setFeedError(error instanceof Error ? error.message : 'That snack could not be served.')
    } finally { setFeeding('') }
  }
  const equipItem = async (itemId: string, name: string, icon: string) => { await equip(itemId); celebrate({ icon, title: 'Looking fabulous!', detail: `${name} is now equipped.` }) }
  return <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.petStage}><span className={styles.bubble}>“The town smells like sunberries today!”</span><PetAvatar pet={activePet} /><div className={styles.nameplate}><h1>{activePet.name}</h1><span>{kind.name} • {activePet.pronouns}</span></div></div>
      <div className={styles.carePanel}>
        <header><div><span>COZY COTTAGE</span><h2>How is {activePet.name}?</h2></div><Heart fill="currentColor" /></header>
        <Stat label="Tummy" value={activePet.hunger} color="#f09b68" emoji="🍓" />
        <Stat label="Joy" value={activePet.mood} color="#e36c83" emoji="💗" />
        <Stat label="Sparkle" value={activePet.cleanliness} color="#53b9bd" emoji="🫧" />
        <div className={styles.actions}><button onClick={() => { setFeedError(''); setChoosingFood(true) }} disabled={activePet.hunger >= 100}><Cookie /><span>{activePet.hunger >= 100 ? 'Full' : 'Feed'}</span></button>{careActions.map(({ kind: action, label, icon: Icon }) => <button key={action} onClick={() => void giveCare(action, label)}><Icon /><span>{label}</span></button>)}</div>
        <p>Care gives a cozy boost. Time away never causes permanent harm.</p>
      </div>
    </section>
    <section className={styles.studioCallout}><div><span>NEW IN BRAMBLEWICK</span><h2>The Style Studio is open</h2><p>Shape physical traits, try unlocked looks, and save a style that follows {activePet.name} everywhere.</p></div><Link to="/style-studio"><Scissors /> Visit the Studio</Link></section>
    <section className={styles.closet}><header><div><span>YOUR CLOSET</span><h2>Quick wardrobe</h2></div><Shirt /></header>{closet.length ? <div className={styles.itemRow}>{closet.map((item) => <button key={item.id} onClick={() => void equipItem(item.id, item.name, item.icon)}><b>{item.icon}</b><span>{item.name}</span><small>Equip</small></button>)}</div> : <div className={styles.empty}>Craft or buy an accessory to start dressing up.</div>}</section>
    {choosingFood && <div className={styles.foodOverlay} onClick={(event) => { if (event.target === event.currentTarget) setChoosingFood(false) }}><section className={styles.foodPicker} role="dialog" aria-modal="true" aria-labelledby="food-picker-title"><header><div><span>FROM YOUR BAG</span><h2 id="food-picker-title">What should {activePet.name} eat?</h2><p>Better-quality treats restore more Tummy. Food effects are coming with expeditions.</p></div><button onClick={() => setChoosingFood(false)} aria-label="Close food picker"><X /></button></header>{feedError && <p className={styles.feedError} role="alert">{feedError}</p>}{foods.length ? <div className={styles.foodGrid}>{foods.map((food) => <button key={food.id} disabled={Boolean(feeding)} onClick={() => void giveFood(food.id)}><b>{food.icon}</b><span>{food.name}</span><small>{food.rarity} · +{foodRestore(food.rarity)} Tummy · ×{state.inventory[food.id]}</small><i>{feeding === food.id ? 'Serving…' : 'Choose'}</i></button>)}</div> : <div className={styles.noFood}><b>🧺</b><h3>No snacks in your bag</h3><p>Pick up something tasty from the general store.</p><Link to="/market?tab=shop" onClick={() => setChoosingFood(false)}>Visit the Market</Link></div>}</section></div>}
  </div>
}

function foodRestore(rarity: 'Common' | 'Uncommon' | 'Rare' | 'Mythic') {
  return { Common: 18, Uncommon: 24, Rare: 30, Mythic: 38 }[rarity]
}

function Stat({ label, value, color, emoji }: { label: string; value: number; color: string; emoji: string }) {
  return <div className={styles.stat}><span>{emoji}</span><div><strong>{label}<i>{value}%</i></strong><div><b style={{ width: `${value}%`, background: color }} /></div></div></div>
}
