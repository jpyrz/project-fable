import type { Item, Species } from './types'

export const species: Species[] = [
  { id: 'mossling', name: 'Mossling', tagline: 'Gentle garden dreamers', emoji: '🌿', colors: ['#91c96b', '#f3a46f', '#8fc8c7'] },
  { id: 'lumipup', name: 'Lumipup', tagline: 'Bright-hearted stargazers', emoji: '✨', colors: ['#f4b85c', '#a78bd4', '#70c9d2'] },
  { id: 'cloudkip', name: 'Cloudkip', tagline: 'Bouncy sky wanderers', emoji: '☁️', colors: ['#93cbe7', '#f09bb5', '#d3b1e8'] },
  { id: 'pebblit', name: 'Pebblit', tagline: 'Brave little treasure hunters', emoji: '💎', colors: ['#b28b69', '#749dd0', '#df8b70'] },
]

const itemSeeds = [
  ['Sunberry Tart', 'food', '🍓'], ['Moonmilk Tea', 'food', '🫖'], ['Clover Biscuit', 'food', '🍪'],
  ['Cloudfluff Bun', 'food', '🥐'], ['Honeydrop Apple', 'food', '🍎'], ['Sparkle Soap', 'care', '🧼'],
  ['Petal Brush', 'care', '🪮'], ['Giggle Ball', 'care', '🟣'], ['Storybook', 'care', '📖'],
  ['Willow Twig', 'material', '🪵'], ['Star Thread', 'material', '🧵'], ['River Pearl', 'material', '🫧'],
  ['Glow Shard', 'material', '💠'], ['Soft Moss', 'material', '🌱'], ['Brass Button', 'material', '🟡'],
  ['Sun Hat', 'accessory', '👒'], ['Moon Crown', 'accessory', '👑'], ['Teal Bow', 'accessory', '🎀'],
  ['Explorer Scarf', 'accessory', '🧣'], ['Tiny Satchel', 'accessory', '👜'], ['Star Wand', 'accessory', '🪄'],
  ['Garden Backdrop', 'background', '🌼'], ['Twilight Backdrop', 'background', '🌙'], ['River Backdrop', 'background', '🏞️'],
  ['Lucky Acorn', 'collectible', '🌰'], ['Glass Firefly', 'collectible', '🏮'], ['Singing Shell', 'collectible', '🐚'],
  ['Tiny Teacup', 'collectible', '☕'], ['Old Town Pin', 'collectible', '📍'], ['Wishing Token', 'collectible', '🪙'],
] as const

const suffixes = ['', ' of Dawn', ' of Clover', ' of Starlight']
export const items: Item[] = Array.from({ length: 120 }, (_, index) => {
  const seed = itemSeeds[index % itemSeeds.length]
  const tier = Math.floor(index / itemSeeds.length)
  const category = seed[1] as Item['category']
  const rarity: Item['rarity'] = tier === 0 ? 'Common' : tier === 1 ? 'Uncommon' : tier === 2 ? 'Rare' : 'Mythic'
  return {
    id: `item-${index + 1}`,
    name: `${seed[0]}${suffixes[tier]}`,
    category,
    rarity,
    price: 24 + (index % 15) * 7 + tier * 55,
    icon: seed[2],
    description: category === 'material' ? 'A useful ingredient gathered around Bramblewick.' : `A ${rarity.toLowerCase()} little treasure from Bramblewick.`,
  }
})

export const featuredShopItems = items.slice(0, 12)

export const recipes = [
  { id: 'sun-hat', output: 'item-16', needs: [{ id: 'item-10', count: 2 }, { id: 'item-14', count: 1 }] },
  { id: 'moon-crown', output: 'item-17', needs: [{ id: 'item-11', count: 2 }, { id: 'item-13', count: 1 }] },
  { id: 'star-wand', output: 'item-21', needs: [{ id: 'item-10', count: 1 }, { id: 'item-13', count: 2 }] },
]

export const channels = ['Lobby', 'Trading', 'Help', 'Off-topic']
