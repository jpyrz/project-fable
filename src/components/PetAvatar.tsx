import { items } from '../data'
import { customizationAsset } from '../customizationData'
import { getSpecies } from '../state/GameContext'
import type { Pet } from '../types'
import styles from './PetAvatar.module.scss'

export function PetAvatar({ pet, size = 'large' }: { pet: Pet; size?: 'small' | 'large' }) {
  const kind = getSpecies(pet.speciesId)
  const appearanceLayers = Object.values(pet.appearance ?? {}).map(customizationAsset).filter((asset) => asset?.speciesId === pet.speciesId).sort((a, b) => a!.layer - b!.layer)
  const equipped = Object.values(pet.equipped).map((id) => items.find((item) => item.id === id)).filter((item) => item && !(pet.appearance?.head && item.id === 'item-16'))
  const baseArt = pet.speciesId === 'mossling' ? '/pets/customization/mossling/base.png' : `/pets/${pet.speciesId}-classic.png`
  return (
    <div className={`${styles.frame} ${styles[size]} ${styles[`palette${pet.palette}`]}`} style={{ '--pet-color': kind.colors[pet.palette] } as React.CSSProperties} aria-label={`${pet.name} the ${kind.name}`}>
      {pet.equipped.background && <div className={styles.backdrop}>{items.find((item) => item.id === pet.equipped.background)?.icon}</div>}
      <span className={styles.aura} />
      <div className={styles.artStack}>
        <img className={`${styles.petArt} ${styles.tintable}`} src={baseArt} alt="" draggable={false} />
        {appearanceLayers.map((asset) => asset && <img
          key={asset.id}
          className={`${styles.layer} ${asset.tintWithPalette ? styles.tintable : ''}`}
          style={{ left: `${asset.transform.x * 100}%`, top: `${asset.transform.y * 100}%`, width: `${asset.transform.scale * 100}%`, rotate: `${asset.transform.rotation ?? 0}deg`, zIndex: asset.layer }}
          src={asset.assetPath}
          alt=""
          draggable={false}
        />)}
      </div>
      <div className={styles.accessories}>{equipped.filter((item) => item?.category === 'accessory').map((item) => <span key={item!.id}>{item!.icon}</span>)}</div>
    </div>
  )
}
