import { customizationAsset, type CustomizationAsset } from '../customizationData'
import { getSpecies } from '../state/GameContext'
import type { Pet } from '../types'
import styles from './PetAvatar.module.scss'

interface PetAvatarProps {
  pet: Pet
  size?: 'small' | 'large'
  transformOverrides?: Record<string, CustomizationAsset['transform']>
  debug?: boolean
  selectedAssetId?: string
}

export function PetAvatar({ pet, size = 'large', transformOverrides = {}, debug = false, selectedAssetId }: PetAvatarProps) {
  const kind = getSpecies(pet.speciesId)
  const selectedLayers = Object.values(pet.appearance ?? {}).map(customizationAsset).filter((asset) => asset?.speciesId === pet.speciesId).map((asset) => asset && transformOverrides[asset.id] ? { ...asset, transform: transformOverrides[asset.id] } : asset)
  const hiddenSlots = new Set(selectedLayers.flatMap((asset) => asset?.hidesSlots ?? []))
  const appearanceLayers = selectedLayers.filter((asset) => asset && !hiddenSlots.has(asset.slot)).sort((a, b) => a!.layer - b!.layer)
  const baseArt = `/pets/customization/${pet.speciesId}/base.png`
  return (
    <div className={`${styles.frame} ${styles[size]} ${styles[`palette${pet.palette}`]} ${debug ? styles.debug : ''}`} style={{ '--pet-color': kind.colors[pet.palette] } as React.CSSProperties} aria-label={`${pet.name} the ${kind.name}`}>
      <span className={styles.aura} />
      <div className={styles.artStack}>
        <img className={`${styles.petArt} ${styles.tintable}`} src={baseArt} alt="" draggable={false} />
        {appearanceLayers.map((asset) => asset && <img
          key={asset.id}
          className={`${styles.layer} ${asset.tintWithPalette ? styles.tintable : ''} ${selectedAssetId === asset.id ? styles.selectedLayer : ''}`}
          style={{ left: `${asset.transform.x * 100}%`, top: `${asset.transform.y * 100}%`, width: `${asset.transform.scale * 100}%`, rotate: `${asset.transform.rotation ?? 0}deg`, zIndex: asset.layer }}
          src={asset.assetPath}
          data-asset-id={asset.id}
          alt=""
          draggable={false}
        />)}
      </div>
    </div>
  )
}
