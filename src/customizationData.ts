import type { CustomizationDefinition, CustomizationSlot, PetAppearance, SpeciesId } from './types'

export type CustomizationAsset = Omit<CustomizationDefinition, 'unlocked'> & {
  starter?: boolean
  reputationRequired?: number
  itemId?: string
}

export const customizationSlots: Array<{ id: CustomizationSlot; label: string; tab: 'salon' | 'wardrobe'; icon: string; description: string }> = [
  { id: 'marking', label: 'Markings', tab: 'salon', icon: '✨', description: 'Freckles, spots, and patterns.' },
  { id: 'hair', label: 'Hair & crests', tab: 'salon', icon: '🌿', description: 'Leafy styles and head growth.' },
  { id: 'outfit', label: 'Outfits', tab: 'wardrobe', icon: '👕', description: 'Species-fitted clothing layers.' },
  { id: 'head', label: 'Headwear', tab: 'wardrobe', icon: '👒', description: 'Hats and head accessories.' },
]

export const customizationAssets: CustomizationAsset[] = [
  {
    id: 'mossling-marking-sunberry-speckles', speciesId: 'mossling', slot: 'marking', label: 'Sunberry Speckles',
    description: 'A warm scattering of berry-colored freckles.', icon: '🍓',
    assetPath: '/pets/customization/mossling/layers/marking-sunberry-speckles.png', layer: 20,
    transform: { x: 0, y: 0, scale: 1 }, source: 'Starter Salon style', starter: true,
  },
  {
    id: 'mossling-hair-leafy-mohawk', speciesId: 'mossling', slot: 'hair', label: 'Leafy Mohawk',
    description: 'A bold crest of overlapping woodland leaves.', icon: '🌿',
    assetPath: '/pets/customization/mossling/layers/hair-leafy-mohawk.png', layer: 30,
    transform: { x: 0.15, y: -0.128, scale: 0.7 }, tintWithPalette: true, source: 'Starter Salon style', starter: true,
  },
  {
    id: 'mossling-outfit-sunberry-tunic', speciesId: 'mossling', slot: 'outfit', label: 'Sunberry Tunic',
    description: 'A fitted woodland tunic stitched for a Mossling.', icon: '🧵',
    assetPath: '/pets/customization/mossling/layers/outfit-sunberry-tunic.png', layer: 40,
    transform: { x: 0.17, y: 0.3, scale: 0.66 }, source: 'Reach Reputation Level 2', reputationRequired: 2,
  },
  {
    id: 'mossling-head-sunhat', speciesId: 'mossling', slot: 'head', label: 'Sunny Day Hat',
    description: 'A cheerful sunhat fitted above Mossling ears and crests.', icon: '👒',
    assetPath: '/pets/customization/mossling/layers/head-sunny-day-hat.png', layer: 50,
    transform: { x: 0.178, y: -0.097, scale: 0.62 }, source: 'Own Sunny Day Hat', itemId: 'item-16',
  },
]

export function customizationAsset(id: string) {
  return customizationAssets.find((asset) => asset.id === id)
}

export function appearanceForSpecies(appearance: PetAppearance, speciesId: SpeciesId): PetAppearance {
  return Object.fromEntries(Object.entries(appearance).filter(([, id]) => customizationAsset(id)?.speciesId === speciesId)) as PetAppearance
}
