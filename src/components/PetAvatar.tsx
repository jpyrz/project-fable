import { items } from '../data'
import { getSpecies } from '../state/GameContext'
import type { Pet } from '../types'
import styles from './PetAvatar.module.scss'

export function PetAvatar({ pet, size = 'large' }: { pet: Pet; size?: 'small' | 'large' }) {
  const kind = getSpecies(pet.speciesId)
  const equipped = Object.values(pet.equipped).map((id) => items.find((item) => item.id === id)).filter(Boolean)
  return (
    <div className={`${styles.frame} ${styles[size]} ${styles[pet.speciesId]}`} style={{ '--pet-color': kind.colors[pet.palette] } as React.CSSProperties} aria-label={`${pet.name} the ${kind.name}`}>
      {pet.equipped.background && <div className={styles.backdrop}>{items.find((item) => item.id === pet.equipped.background)?.icon}</div>}
      <div className={styles.ears}><span /><span /></div>
      <div className={styles.body}>
        <div className={styles.face}><i /><i /><b>ᴗ</b></div>
        <div className={styles.mark}>{kind.emoji}</div>
      </div>
      <div className={styles.tail} />
      <div className={styles.accessories}>{equipped.filter((item) => item?.category === 'accessory').map((item) => <span key={item!.id}>{item!.icon}</span>)}</div>
    </div>
  )
}
