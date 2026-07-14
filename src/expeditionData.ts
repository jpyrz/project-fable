import type { ExpeditionLocation, SpeciesId } from './types'

export interface ExpeditionScene {
  title: string
  story: string
  pathA: { icon: string; label: string; description: string }
  pathB: { icon: string; label: string; description: string }
}

export interface ExpeditionLocationConfig {
  id: ExpeditionLocation
  name: string
  shortName: string
  icon: string
  level: number
  affinitySpecies: SpeciesId
  affinityLabel: string
  description: string
  flavor: string
  collection: string[]
  badge: { label: string; icon: string }
  scenes: ExpeditionScene[]
}

export const expeditionLocations: ExpeditionLocationConfig[] = [
  {
    id: 'sunberry-glen', name: 'Sunberry Glen', shortName: 'The Glen', icon: '🌿', level: 1,
    affinitySpecies: 'mossling', affinityLabel: 'Mosslings know every clover path here.',
    description: 'A mossy trail of clover hollows, old roots, and lantern-bright fireflies.',
    flavor: 'Gathering trail · woodland curiosities', collection: ['item-109', 'item-110', 'item-111', 'item-112'], badge: { label: 'Glen Guide', icon: '🌼' },
    scenes: [
      { title: 'A fork beneath the willow', story: 'Fireflies drift toward a clover hollow while ancient roots glitter with useful treasures.', pathA: { icon: '🏮', label: 'Follow the fireflies', description: 'Higher rare-find chance, but fewer materials.' }, pathB: { icon: '🧺', label: 'Gather by the roots', description: 'Bring home extra crafting materials.' } },
      { title: 'The humming berry patch', story: 'A secret melody floats from the berry vines, but a basket of fresh seedpods rests nearby.', pathA: { icon: '🎵', label: 'Chase the melody', description: 'Listen for a rare woodland secret.' }, pathB: { icon: '🍓', label: 'Gather seedpods', description: 'Collect dependable glen materials.' } },
      { title: 'The lantern-clover circle', story: 'A perfect ring of glowing clover surrounds a tiny, well-worn woodland trail.', pathA: { icon: '✨', label: 'Step into the circle', description: 'Take a curious chance on something rare.' }, pathB: { icon: '🍀', label: 'Study the clover', description: 'Carefully gather useful supplies.' } },
    ],
  },
  {
    id: 'mistbell-marsh', name: 'Mistbell Marsh', shortName: 'The Marsh', icon: '🪷', level: 2,
    affinitySpecies: 'cloudkip', affinityLabel: 'Cloudkips bounce easily across the mist pools.',
    description: 'Silver reeds, pearly fog, and shy creatures ripple beneath the quiet water.',
    flavor: 'Misty wetlands · shimmering keepsakes', collection: ['item-113', 'item-114', 'item-115', 'item-116'], badge: { label: 'Mist Walker', icon: '🪷' },
    scenes: [
      { title: 'A bell beneath the fog', story: 'Something rings beyond the silver reeds while dewglass pearls glimmer along the bank.', pathA: { icon: '🔔', label: 'Follow the ringing', description: 'Search the fog for a rare marsh secret.' }, pathB: { icon: '🫧', label: 'Gather dewglass', description: 'Collect extra marsh materials.' } },
      { title: 'Ripples in the moon pool', story: 'A tiny fin vanishes beneath the surface as musical reeds sway nearby.', pathA: { icon: '🐟', label: 'Wait by the ripples', description: 'Patience may reveal a rare visitor.' }, pathB: { icon: '🎋', label: 'Cut silver reeds', description: 'Bring home dependable supplies.' } },
      { title: 'The floating lotus trail', story: 'Glowing lotus flowers form a path into the mist, while the safe bank sparkles with pearls.', pathA: { icon: '🪷', label: 'Cross the lotus path', description: 'Brave the mist for a rare discovery.' }, pathB: { icon: '🦪', label: 'Search the bank', description: 'Gather useful crafting materials.' } },
    ],
  },
  {
    id: 'moonroot-caverns', name: 'Moonroot Caverns', shortName: 'The Caverns', icon: '🌙', level: 3,
    affinitySpecies: 'pebblit', affinityLabel: 'Pebblits can hear treasure humming through stone.',
    description: 'Crystal roots thread through a cavern where echoes sparkle like fallen stars.',
    flavor: 'Crystal caves · celestial treasures', collection: ['item-117', 'item-118', 'item-119', 'item-120'], badge: { label: 'Moonroot Seeker', icon: '🌟' },
    scenes: [
      { title: 'The echoing crystal split', story: 'A distant star-song winds through one tunnel while crystal-rich stone lines the other.', pathA: { icon: '🎶', label: 'Follow the star-song', description: 'Search deeper for a rare cave treasure.' }, pathB: { icon: '🔮', label: 'Gather crystals', description: 'Bring home extra cavern materials.' } },
      { title: 'A pocket of tiny stars', story: 'Pinpricks of light dance across the ceiling above a cluster of softly humming geodes.', pathA: { icon: '🌟', label: 'Climb toward the stars', description: 'Reach for a rare celestial find.' }, pathB: { icon: '🪨', label: 'Open the geodes', description: 'Collect reliable crafting supplies.' } },
      { title: 'The sleeping moonroot', story: 'An ancient silver root curls around a dark passage and a bed of bright crystals.', pathA: { icon: '🌙', label: 'Follow the moonroot', description: 'Explore the unknown for something rare.' }, pathB: { icon: '💎', label: 'Search the crystal bed', description: 'Gather a larger material bundle.' } },
    ],
  },
]

export function getExpeditionLocation(id: ExpeditionLocation) {
  return expeditionLocations.find((location) => location.id === id)!
}
