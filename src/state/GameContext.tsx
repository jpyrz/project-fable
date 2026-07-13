import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { items, recipes, species } from '../data'
import { calculateGameReward } from '../lib/gameLogic'
import type { GameState, SpeciesId } from '../types'
import { supabase } from '../lib/supabase'
import { GameContext, type GameContextValue } from './GameContextDefinition'
import { SupabaseGameProvider } from './SupabaseGameProvider'

const initialState: GameState = {
  onboarded: false,
  username: 'NewKeeper',
  role: 'player',
  ageConfirmed: false,
  coins: 850,
  reputation: 2,
  reputationXp: 65,
  pets: [],
  activePetId: '',
  inventory: { 'item-1': 2, 'item-6': 1, 'item-10': 4, 'item-11': 3, 'item-13': 2, 'item-14': 2 },
  collected: ['item-1', 'item-6', 'item-10', 'item-11', 'item-13', 'item-14'],
  wishlist: ['item-17', 'item-23'],
  listings: [
    { id: 'listing-1', itemId: 'item-17', seller: 'JuniperJay', price: 190, quantity: 1 },
    { id: 'listing-2', itemId: 'item-23', seller: 'MallowMoon', price: 145, quantity: 1 },
    { id: 'listing-3', itemId: 'item-21', seller: 'TinkerTom', price: 220, quantity: 1 },
    { id: 'listing-4', itemId: 'item-27', seller: 'CoralBee', price: 115, quantity: 2 },
    { id: 'listing-5', itemId: 'item-12', seller: 'FernFriend', price: 65, quantity: 4 },
  ],
  messages: [
    { id: 'm1', channel: 'Lobby', author: 'MallowMoon', body: 'The wishing well is sparkling extra bright today ✨', time: '9:42' },
    { id: 'm2', channel: 'Lobby', author: 'JuniperJay', body: 'My Mossling finally found a Glass Firefly!', time: '9:45' },
    { id: 'm3', channel: 'Trading', author: 'CoralBee', body: 'Looking for Star Thread — check my wishlist!', time: '9:47' },
    { id: 'm4', channel: 'Help', author: 'TinkerTom', body: 'Tip: the puzzle game rewards crafting materials.', time: '9:50' },
    { id: 'm5', channel: 'DM:JuniperJay', author: 'JuniperJay', body: 'Hi friend! Want to compare wishlists later?', time: '9:53' },
  ],
  notifications: [
    { id: 'n1', text: 'JuniperJay accepted your friend request.', read: false },
    { id: 'n2', text: 'Your daily tasks have refreshed!', read: false },
  ],
  tasks: [
    { id: 'care', label: 'Care for your active pet', progress: 0, target: 2, reward: 60, claimed: false },
    { id: 'play', label: 'Play an arcade game', progress: 0, target: 1, reward: 80, claimed: false },
    { id: 'collect', label: 'Collect 2 items', progress: 0, target: 2, reward: 100, claimed: false },
  ],
  dailyWishClaimed: false,
  friends: [{ id: 'friend-1', name: 'JuniperJay', pet: 'Sprig', online: true }, { id: 'friend-2', name: 'MallowMoon', pet: 'Nimbus', online: true }, { id: 'friend-3', name: 'TinkerTom', pet: 'Pebble', online: false }],
  friendRequests: [],
}
const key = 'project-fable-demo-v1'

function readState(): GameState {
  try {
    const saved = localStorage.getItem(key)
    return saved ? { ...initialState, ...JSON.parse(saved) } : initialState
  } catch { return initialState }
}

export function GameProvider({ children }: { children: ReactNode }) {
  return supabase ? <SupabaseGameProvider>{children}</SupabaseGameProvider> : <DemoGameProvider>{children}</DemoGameProvider>
}

function DemoGameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(readState)
  useEffect(() => { localStorage.setItem(key, JSON.stringify(state)) }, [state])
  const activePet = state.pets.find((pet) => pet.id === state.activePetId)

  const incrementTask = (draft: GameState, id: string, amount = 1) => ({
    ...draft,
    tasks: draft.tasks.map((task) => task.id === id ? { ...task, progress: Math.min(task.target, task.progress + amount) } : task),
  })

  const value = useMemo<GameContextValue>(() => ({
    state,
    activePet,
    backend: 'demo',
    status: 'ready',
    error: '',
    sessionEmail: '',
    onboard(username, petName, speciesId, palette) {
      const pet = { id: crypto.randomUUID(), name: petName, speciesId, palette, hunger: 78, mood: 82, cleanliness: 74, equipped: {} }
      setState((s) => ({ ...s, onboarded: true, ageConfirmed: true, username, pets: [pet], activePetId: pet.id }))
    },
    care(kind) {
      setState((s) => incrementTask({
        ...s,
        pets: s.pets.map((pet) => pet.id !== s.activePetId ? pet : {
          ...pet,
          hunger: Math.min(100, pet.hunger + (kind === 'food' ? 18 : 3)),
          mood: Math.min(100, pet.mood + (kind === 'play' ? 18 : 4)),
          cleanliness: Math.min(100, pet.cleanliness + (kind === 'groom' ? 20 : 2)),
        }),
      }, 'care'))
    },
    buyShopItem(itemId) {
      const item = items.find((entry) => entry.id === itemId)
      if (!item || state.coins < item.price) return false
      setState((s) => incrementTask({ ...s, coins: s.coins - item.price, inventory: { ...s.inventory, [itemId]: (s.inventory[itemId] ?? 0) + 1 }, collected: [...new Set([...s.collected, itemId])] }, 'collect'))
      return true
    },
    buyListing(listingId) {
      const listing = state.listings.find((entry) => entry.id === listingId)
      if (!listing || listing.seller === state.username || state.coins < listing.price) return false
      setState((s) => incrementTask({
        ...s,
        coins: s.coins - listing.price,
        listings: s.listings.filter((entry) => entry.id !== listingId),
        inventory: { ...s.inventory, [listing.itemId]: (s.inventory[listing.itemId] ?? 0) + 1 },
        collected: [...new Set([...s.collected, listing.itemId])],
        notifications: [{ id: crypto.randomUUID(), text: `Purchase complete — ${items.find((item) => item.id === listing.itemId)?.name} is in your bag.`, read: false }, ...s.notifications],
      }, 'collect'))
      return true
    },
    createListing(itemId, quantity, unitPrice) {
      if ((state.inventory[itemId] ?? 0)<quantity || quantity<1 || unitPrice<1) return false
      setState((s)=>({ ...s, inventory:{...s.inventory,[itemId]:s.inventory[itemId]-quantity}, listings:[{id:crypto.randomUUID(),itemId,seller:s.username,price:unitPrice*quantity,quantity},...s.listings] })); return true
    },
    craft(recipeId) {
      const recipe = recipes.find((entry) => entry.id === recipeId)
      if (!recipe || recipe.needs.some((need) => (state.inventory[need.id] ?? 0) < need.count)) return false
      setState((s) => {
        const inventory = { ...s.inventory }
        recipe.needs.forEach((need) => { inventory[need.id] -= need.count })
        inventory[recipe.output] = (inventory[recipe.output] ?? 0) + 1
        return incrementTask({ ...s, inventory, collected: [...new Set([...s.collected, recipe.output])] }, 'collect')
      })
      return true
    },
    equip(itemId) {
      const item = items.find((entry) => entry.id === itemId)
      if (!item || !activePet || !['accessory', 'background'].includes(item.category)) return
      const slot = item.category === 'background' ? 'background' : item.name.includes('Hat') || item.name.includes('Crown') ? 'head' : item.name.includes('Scarf') || item.name.includes('Bow') ? 'neck' : 'held'
      setState((s) => ({ ...s, pets: s.pets.map((pet) => pet.id === s.activePetId ? { ...pet, equipped: { ...pet.equipped, [slot]: itemId } } : pet) }))
    },
    toggleWishlist(itemId) { setState((s) => ({ ...s, wishlist: s.wishlist.includes(itemId) ? s.wishlist.filter((id) => id !== itemId) : [...s.wishlist, itemId] })) },
    addMessage(channel, body) {
      const clean = body.replace(/https?:\/\/\S+/gi, '[link removed]').slice(0, 280).trim()
      if (!clean) return
      setState((s) => ({ ...s, messages: [...s.messages, { id: crypto.randomUUID(), channel, author: s.username, body: clean, time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), own: true }] }))
    },
    reportMessage() {},
    sendFriendRequest(username) { setState((s) => ({ ...s, notifications: [{ id: crypto.randomUUID(), text: `Friend request sent to ${username}.`, read: false }, ...s.notifications] })) },
    respondFriendRequest() {},
    createInviteCode() { return 'DEMO-FABLE' },
    startGame() { return crypto.randomUUID() },
    gameReward(_gameId, score) {
      const reward = calculateGameReward(score)
      const material = score % 2 ? 'item-10' : 'item-11'
      setState((s) => incrementTask({ ...s, coins: s.coins + reward, reputationXp: s.reputationXp + 8, inventory: { ...s.inventory, [material]: (s.inventory[material] ?? 0) + 1 }, collected: [...new Set([...s.collected, material])] }, 'play'))
      return reward
    },
    claimTask(taskId) {
      setState((s) => {
        const task = s.tasks.find((entry) => entry.id === taskId)
        if (!task || task.claimed || task.progress < task.target) return s
        return { ...s, coins: s.coins + task.reward, reputationXp: s.reputationXp + 15, tasks: s.tasks.map((entry) => entry.id === taskId ? { ...entry, claimed: true } : entry) }
      })
    },
    makeWish() {
      if (state.dailyWishClaimed) return
      setState((s) => ({ ...s, dailyWishClaimed: true, coins: s.coins + 75, notifications: [{ id: crypto.randomUUID(), text: 'The well granted 75 Dewdrops!', read: false }, ...s.notifications] }))
    },
    markNotificationsRead() { setState((s) => ({ ...s, notifications: s.notifications.map((note) => ({ ...note, read: true })) })) },
    async signIn() {},
    async signUp() { return 'confirmed' },
    async signOut() {},
    async sendPasswordReset() {},
    async updatePassword() {},
    async refresh() {},
    resetDemo() { localStorage.removeItem(key); setState(initialState) },
  }), [state, activePet])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function getSpecies(id: SpeciesId) { return species.find((entry) => entry.id === id)! }

export { useGame } from './GameContextDefinition'
