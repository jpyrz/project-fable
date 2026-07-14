import { customizationAsset } from '../customizationData'
import { getSpecies } from '../state/GameContext'
import type { Pet } from '../types'
import styles from './PetAvatar.module.scss'

export function PetAvatar({ pet, size = 'large' }: { pet: Pet; size?: 'small' | 'large' }) {
  const kind = getSpecies(pet.speciesId)
  const selectedLayers = Object.values(pet.appearance ?? {}).map(customizationAsset).filter((asset) => asset?.speciesId === pet.speciesId)
  const hiddenSlots = new Set(selectedLayers.flatMap((asset) => asset?.hidesSlots ?? []))
  const appearanceLayers = selectedLayers.filter((asset) => asset && !hiddenSlots.has(asset.slot)).sort((a, b) => a!.layer - b!.layer)
  const baseArt = `/pets/customization/${pet.speciesId}/base.png`
  return (
    <div className={`${styles.frame} ${styles[size]} ${styles[`palette${pet.palette}`]}`} style={{ '--pet-color': kind.colors[pet.palette] } as React.CSSProperties} aria-label={`${pet.name} the ${kind.name}`}>
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
    </div>
  )
}
