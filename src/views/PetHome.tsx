import { Bath, Cookie, Gamepad2, Heart, Shirt } from 'lucide-react'
import { items } from '../data'
import { PetAvatar } from '../components/PetAvatar'
import { getSpecies, useGame } from '../state/GameContext'
import type { CareKind } from '../types'
import styles from './PetHome.module.scss'

export function PetHome() {
  const { activePet, care, state, equip } = useGame()
  if (!activePet) return null
  const kind = getSpecies(activePet.speciesId)
  const closet = items.filter((item) => (state.inventory[item.id] ?? 0) > 0 && ['accessory', 'background'].includes(item.category))
  const careActions: { kind: CareKind; label: string; icon: typeof Cookie }[] = [
    { kind: 'food', label: 'Feed', icon: Cookie }, { kind: 'groom', label: 'Groom', icon: Bath }, { kind: 'play', label: 'Play', icon: Gamepad2 },
  ]
  return <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.petStage}><span className={styles.bubble}>“The town smells like sunberries today!”</span><PetAvatar pet={activePet} /><div className={styles.nameplate}><h1>{activePet.name}</h1><span>{kind.name} • Your active Fable</span></div></div>
      <div className={styles.carePanel}>
        <header><div><span>COZY COTTAGE</span><h2>How is {activePet.name}?</h2></div><Heart fill="currentColor" /></header>
        <Stat label="Tummy" value={activePet.hunger} color="#f09b68" emoji="🍓" />
        <Stat label="Joy" value={activePet.mood} color="#e36c83" emoji="💗" />
        <Stat label="Sparkle" value={activePet.cleanliness} color="#53b9bd" emoji="🫧" />
        <div className={styles.actions}>{careActions.map(({ kind: action, label, icon: Icon }) => <button key={action} onClick={() => void care(action)}><Icon /><span>{label}</span></button>)}</div>
        <p>Care gives a cozy boost. Your Fable will never be harmed by time away.</p>
      </div>
    </section>
    <section className={styles.closet}><header><div><span>YOUR CLOSET</span><h2>Dress up for an adventure</h2></div><Shirt /></header>{closet.length ? <div className={styles.itemRow}>{closet.map((item) => <button key={item.id} onClick={() => void equip(item.id)}><b>{item.icon}</b><span>{item.name}</span><small>Equip</small></button>)}</div> : <div className={styles.empty}>Craft or buy an accessory to start dressing up.</div>}</section>
  </div>
}

function Stat({ label, value, color, emoji }: { label: string; value: number; color: string; emoji: string }) {
  return <div className={styles.stat}><span>{emoji}</span><div><strong>{label}<i>{value}%</i></strong><div><b style={{ width: `${value}%`, background: color }} /></div></div></div>
}
