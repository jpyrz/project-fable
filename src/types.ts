export type SpeciesId = 'mossling' | 'lumipup' | 'cloudkip' | 'pebblit'
export type CareKind = 'food' | 'groom' | 'play'
export type ItemCategory = 'food' | 'care' | 'material' | 'collectible' | 'accessory' | 'background'
export type CustomizationSlot = 'marking' | 'hair' | 'outfit' | 'head'
export type PetAppearance = Partial<Record<CustomizationSlot, string>>

export interface Species {
  id: SpeciesId
  name: string
  tagline: string
  emoji: string
  colors: [string, string, string]
}

export interface Item {
  id: string
  name: string
  category: ItemCategory
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Mythic'
  price: number
  icon: string
  description: string
}

export interface Pet {
  id: string
  name: string
  speciesId: SpeciesId
  palette: number
  pronouns: 'they/them' | 'she/her' | 'he/him'
  hunger: number
  mood: number
  cleanliness: number
  equipped: Partial<Record<'head' | 'neck' | 'held' | 'background', string>>
  appearance: PetAppearance
}

export interface CustomizationDefinition {
  id: string
  speciesId: SpeciesId
  slot: CustomizationSlot
  label: string
  description: string
  icon: string
  assetPath: string
  layer: number
  transform: { x: number; y: number; scale: number; rotation?: number }
  tintWithPalette?: boolean
  source: string
  unlocked: boolean
}

export interface DailyTask {
  id: string
  kind: 'care' | 'play' | 'collect'
  label: string
  progress: number
  target: number
  reward: number
  claimed: boolean
}

export interface ChatMessage {
  id: string
  channel: string
  author: string
  body: string
  time: string
  own?: boolean
}

export interface Listing {
  id: string
  itemId: string
  seller: string
  price: number
  quantity: number
}

export interface Friend {
  id: string
  name: string
  pet: string
  online: boolean
}

export interface FriendRequest {
  requesterId: string
  name: string
}

export interface GameState {
  onboarded: boolean
  username: string
  role: 'player' | 'moderator' | 'admin'
  ageConfirmed: boolean
  coins: number
  reputation: number
  reputationXp: number
  pets: Pet[]
  activePetId: string
  inventory: Record<string, number>
  collected: string[]
  wishlist: string[]
  listings: Listing[]
  messages: ChatMessage[]
  notifications: { id: string; text: string; read: boolean }[]
  tasks: DailyTask[]
  dailyResetAt: string
  dailyWishClaimed: boolean
  friends: Friend[]
  friendRequests: FriendRequest[]
}

export interface PublicKeeperProfile {
  username: string
  reputation: number
  reputationXp: number
  activePet: Pet | null
  collected: string[]
  wishlist: string[]
  friendCount: number
  badges: ExpeditionBadge[]
}

export type FoodTrait = 'cozy' | 'keen' | 'lucky'
export type ExpeditionLocation = 'sunberry-glen' | 'mistbell-marsh' | 'moonroot-caverns'

export interface ExpeditionBadge {
  id: string
  label: string
  icon: string
  description: string
  earnedAt: string
}

export interface ExpeditionState {
  id: string
  location: ExpeditionLocation
  durationMinutes: 10 | 20 | 30
  petName: string
  foodItemId: string | null
  foodTrait: FoodTrait | null
  startedAt: string
  returnsAt: string
  serverNow: string
  sceneId: number
  speciesId: SpeciesId
  affinity: boolean
}

export interface ExpeditionReward {
  coins: number
  reputation: number
  items: Array<{ itemId: string; quantity: number }>
  rare: boolean
  title: string
  detail: string
  badge?: ExpeditionBadge | null
}

export interface ExpeditionJournal {
  collected: string[]
  badges: ExpeditionBadge[]
  history: Array<{
    id: string
    location: ExpeditionLocation
    petName: string
    durationMinutes: number
    choice: string
    result: ExpeditionReward
    claimedAt: string
  }>
  weekly: {
    completed: number
    uniqueDiscoveries: number
    targetCompleted: number
    targetDiscoveries: number
    claimed: boolean
    resetAt: string
    rewardCoins: number
    rewardReputation: number
  }
}
