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
    transform: { x: 0.17, y: 0.3, scale: 0.66 }, source: 'Own Sunberry Tunic', itemId: 'item-121',
  },
  {
    id: 'mossling-head-sunhat', speciesId: 'mossling', slot: 'head', label: 'Sunny Day Hat',
    description: 'A cheerful sunhat fitted above Mossling ears and crests.', icon: '👒',
    assetPath: '/pets/customization/mossling/layers/head-sunny-day-hat.png', layer: 50,
    transform: { x: 0.178, y: -0.097, scale: 0.62 }, hidesSlots: ['hair'], source: 'Own Sunny Day Hat', itemId: 'item-16',
  },
  {
    id: 'lumipup-marking-comet-dust', speciesId: 'lumipup', slot: 'marking', label: 'Comet Dust',
    description: 'A trail of tiny starlight freckles.', icon: '✨',
    assetPath: '/pets/customization/lumipup/layers/marking-comet-dust.png', layer: 20,
    transform: { x: 0, y: 0, scale: 1 }, source: 'Starter Salon style', starter: true,
  },
  {
    id: 'lumipup-hair-nova-swoop', speciesId: 'lumipup', slot: 'hair', label: 'Nova Swoop',
    description: 'A bright curled forelock with a starry tip.', icon: '🌟',
    assetPath: '/pets/customization/lumipup/layers/hair-nova-swoop.png', layer: 30,
    transform: { x: 0, y: 0, scale: 1 }, tintWithPalette: true, source: 'Starter Salon style', starter: true,
  },
  {
    id: 'lumipup-outfit-sunberry-tunic', speciesId: 'lumipup', slot: 'outfit', label: 'Sunberry Tunic',
    description: 'A fitted coral tunic tailored for a Lumipup.', icon: '🧵',
    assetPath: '/pets/customization/lumipup/layers/outfit-sunberry-tunic.png', layer: 40,
    transform: { x: 0.19, y: 0.27, scale: 0.6 }, source: 'Own Sunberry Tunic', itemId: 'item-121',
  },
  {
    id: 'lumipup-head-sunhat', speciesId: 'lumipup', slot: 'head', label: 'Sunny Day Hat',
    description: 'A sunny hat balanced between a Lumipup’s long ears.', icon: '👒',
    assetPath: '/pets/customization/mossling/layers/head-sunny-day-hat.png', layer: 50,
    transform: { x: 0.25, y: -0.05, scale: 0.45 }, hidesSlots: ['hair'], source: 'Own Sunny Day Hat', itemId: 'item-16',
  },
  {
    id: 'cloudkip-marking-raindrop-blush', speciesId: 'cloudkip', slot: 'marking', label: 'Raindrop Blush',
    description: 'Cheery blue droplets scattered across the cheeks.', icon: '💧',
    assetPath: '/pets/customization/cloudkip/layers/marking-raindrop-blush.png', layer: 20,
    transform: { x: 0, y: 0, scale: 1 }, source: 'Starter Salon style', starter: true,
  },
  {
    id: 'cloudkip-hair-storm-curl', speciesId: 'cloudkip', slot: 'hair', label: 'Storm Curl',
    description: 'A dramatic cloud curl swept over the brow.', icon: '🌩️',
    assetPath: '/pets/customization/cloudkip/layers/hair-storm-curl.png', layer: 30,
    transform: { x: 0, y: 0, scale: 1 }, tintWithPalette: true, source: 'Starter Salon style', starter: true,
  },
  {
    id: 'cloudkip-outfit-sunberry-tunic', speciesId: 'cloudkip', slot: 'outfit', label: 'Sunberry Tunic',
    description: 'A fitted coral tunic tailored for a Cloudkip.', icon: '🧵',
    assetPath: '/pets/customization/cloudkip/layers/outfit-sunberry-tunic.png', layer: 40,
    transform: { x: 0.22, y: 0.36, scale: 0.56 }, source: 'Own Sunberry Tunic', itemId: 'item-121',
  },
  {
    id: 'cloudkip-head-sunhat', speciesId: 'cloudkip', slot: 'head', label: 'Sunny Day Hat',
    description: 'A sunny hat nestled between a Cloudkip’s puffs.', icon: '👒',
    assetPath: '/pets/customization/mossling/layers/head-sunny-day-hat.png', layer: 50,
    transform: { x: 0.31, y: 0.02, scale: 0.38 }, hidesSlots: ['hair'], source: 'Own Sunny Day Hat', itemId: 'item-16',
  },
  {
    id: 'pebblit-marking-geode-freckles', speciesId: 'pebblit', slot: 'marking', label: 'Geode Freckles',
    description: 'Tiny golden crystal flecks across the cheeks.', icon: '💎',
    assetPath: '/pets/customization/pebblit/layers/marking-geode-freckles.png', layer: 20,
    transform: { x: 0, y: 0, scale: 1 }, source: 'Starter Salon style', starter: true,
  },
  {
    id: 'pebblit-hair-crystal-crest', speciesId: 'pebblit', slot: 'hair', label: 'Crystal Crest',
    description: 'A proud row of polished crown crystals.', icon: '🔮',
    assetPath: '/pets/customization/pebblit/layers/hair-crystal-crest.png', layer: 30,
    transform: { x: 0, y: 0, scale: 1 }, tintWithPalette: true, source: 'Starter Salon style', starter: true,
  },
  {
    id: 'pebblit-outfit-sunberry-tunic', speciesId: 'pebblit', slot: 'outfit', label: 'Sunberry Tunic',
    description: 'A fitted coral tunic tailored for a Pebblit.', icon: '🧵',
    assetPath: '/pets/customization/pebblit/layers/outfit-sunberry-tunic.png', layer: 40,
    transform: { x: 0.22, y: 0.37, scale: 0.56 }, source: 'Own Sunberry Tunic', itemId: 'item-121',
  },
  {
    id: 'pebblit-head-sunhat', speciesId: 'pebblit', slot: 'head', label: 'Sunny Day Hat',
    description: 'A sunny hat fitted between a Pebblit’s crystal ears.', icon: '👒',
    assetPath: '/pets/customization/mossling/layers/head-sunny-day-hat.png', layer: 50,
    transform: { x: 0.22, y: -0.02, scale: 0.55 }, hidesSlots: ['hair'], source: 'Own Sunny Day Hat', itemId: 'item-16',
  },
]

export function customizationAsset(id: string) {
  return customizationAssets.find((asset) => asset.id === id)
}

export function customizationAssetForItem(itemId: string, speciesId: SpeciesId) {
  return customizationAssets.find((asset) => asset.itemId === itemId && asset.speciesId === speciesId)
}

export function appearanceForSpecies(appearance: PetAppearance, speciesId: SpeciesId): PetAppearance {
  return Object.fromEntries(Object.entries(appearance).filter(([, id]) => customizationAsset(id)?.speciesId === speciesId)) as PetAppearance
}
