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
const expeditionItemOverrides: Record<number, Partial<Item>> = {
  109: { name: 'Sunberry Seedpod', category: 'material', rarity: 'Uncommon', icon: '🍓', description: 'A warm little seedpod gathered in Sunberry Glen.' },
  110: { name: 'Lantern Clover', category: 'material', rarity: 'Uncommon', icon: '🍀', description: 'Clover that glows softly beneath the glen fireflies.' },
  111: { name: 'Willow Whisper', category: 'collectible', rarity: 'Rare', icon: '🍃', description: 'A rare leaf that seems to remember an old woodland song.' },
  112: { name: 'Glen Garland', category: 'accessory', rarity: 'Rare', icon: '🌼', description: 'A cheerful garland crafted from Sunberry Glen discoveries.' },
  113: { name: 'Mistbell Reed', category: 'material', rarity: 'Uncommon', icon: '🎋', description: 'A musical marsh reed with a silvery ring.' },
  114: { name: 'Dewglass Pearl', category: 'material', rarity: 'Uncommon', icon: '🫧', description: 'A pearly bead of mist hardened by moonlight.' },
  115: { name: 'Fogfin Charm', category: 'collectible', rarity: 'Rare', icon: '🐟', description: 'A tiny charm left behind by a shy marsh swimmer.' },
  116: { name: 'Marshlight Brooch', category: 'accessory', rarity: 'Rare', icon: '🪷', description: 'A luminous brooch crafted from Mistbell Marsh finds.' },
  117: { name: 'Moonroot Crystal', category: 'material', rarity: 'Uncommon', icon: '🔮', description: 'A violet crystal grown around an ancient moonroot.' },
  118: { name: 'Echo Geode', category: 'material', rarity: 'Uncommon', icon: '🪨', description: 'A geode that quietly repeats happy sounds.' },
  119: { name: 'Cave Star', category: 'collectible', rarity: 'Rare', icon: '🌟', description: 'A rare fallen star found in the deepest cavern pocket.' },
  120: { name: 'Moonroot Sky', category: 'background', rarity: 'Mythic', icon: '🌌', description: 'A dreamy cavern sky crafted from Moonroot discoveries.' },
}
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
    ...expeditionItemOverrides[index + 1],
  }
})

export const featuredShopItems = items.slice(0, 12)

export const recipes = [
  { id: 'sun-hat', output: 'item-16', level: 1, needs: [{ id: 'item-10', count: 2 }, { id: 'item-14', count: 1 }] },
  { id: 'moon-crown', output: 'item-17', level: 2, needs: [{ id: 'item-11', count: 2 }, { id: 'item-13', count: 1 }] },
  { id: 'star-wand', output: 'item-21', level: 2, needs: [{ id: 'item-10', count: 1 }, { id: 'item-13', count: 2 }] },
  { id: 'glen-garland', output: 'item-112', level: 1, needs: [{ id: 'item-109', count: 2 }, { id: 'item-110', count: 1 }] },
  { id: 'marshlight-brooch', output: 'item-116', level: 2, needs: [{ id: 'item-113', count: 2 }, { id: 'item-114', count: 1 }] },
  { id: 'moonroot-sky', output: 'item-120', level: 3, needs: [{ id: 'item-117', count: 2 }, { id: 'item-118', count: 1 }] },
]

export const channels = ['Lobby', 'Trading', 'Help', 'Off-topic']
