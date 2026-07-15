import { createContext, useContext } from 'react'
import type { CareKind, CustomizationDefinition, ExpeditionJournal, ExpeditionLocation, ExpeditionReward, ExpeditionState, GameReward, GameState, Pet, PetAppearance, PublicKeeperProfile, SpeciesId } from '../types'

export type MaybePromise<T> = T | Promise<T>
export type BackendMode = 'demo' | 'supabase'
export type ConnectionStatus = 'loading' | 'signed_out' | 'password_recovery' | 'ready' | 'error'

export interface GameContextValue {
  state: GameState
  activePet: GameState['pets'][number] | undefined
  backend: BackendMode
  status: ConnectionStatus
  error: string
  sessionEmail: string
  onboard: (username: string, petName: string, speciesId: SpeciesId, palette: number, pronouns: Pet['pronouns'], appearance: PetAppearance) => MaybePromise<void>
  care: (kind: CareKind) => MaybePromise<void>
  feed: (itemId: string) => MaybePromise<void>
  buyShopItem: (itemId: string) => MaybePromise<boolean>
  buyListing: (listingId: string) => MaybePromise<boolean>
  createListing: (itemId: string, quantity: number, unitPrice: number) => MaybePromise<boolean>
  craft: (recipeId: string) => MaybePromise<boolean>
  equip: (itemId: string) => MaybePromise<void>
  getCustomizationCatalog: (petId: string) => MaybePromise<CustomizationDefinition[]>
  savePetCustomization: (petId: string, palette: number, appearance: PetAppearance) => MaybePromise<void>
  toggleWishlist: (itemId: string) => MaybePromise<void>
  addMessage: (channel: string, body: string) => MaybePromise<void>
  reportMessage: (messageId: string, reason: string) => MaybePromise<void>
  sendFriendRequest: (username: string) => MaybePromise<void>
  respondFriendRequest: (requesterId: string, accept: boolean) => MaybePromise<void>
  createInviteCode: (label: string) => MaybePromise<string>
  startGame: (gameId: 'bloom-match' | 'starwhisk-sprint') => MaybePromise<string>
  gameReward: (gameId: 'bloom-match' | 'starwhisk-sprint', score: number, runId: string) => MaybePromise<GameReward>
  claimTask: (taskId: string) => MaybePromise<void>
  makeWish: () => MaybePromise<void>
  getExpedition: () => MaybePromise<ExpeditionState | null>
  startExpedition: (location: ExpeditionLocation, durationMinutes: 10 | 20 | 30, foodItemId: string | null) => MaybePromise<ExpeditionState>
  claimExpedition: (expeditionId: string, choice: 'path-a' | 'path-b') => MaybePromise<ExpeditionReward>
  getExpeditionJournal: () => MaybePromise<ExpeditionJournal>
  claimWeeklyExpeditionGoal: () => MaybePromise<{ coins: number; reputation: number }>
  markNotificationsRead: () => MaybePromise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, username: string, inviteCode: string) => Promise<'confirmed' | 'pending'>
  signOut: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<void>
  updatePassword: (password: string) => Promise<void>
  refresh: () => Promise<void>
  getPublicProfile: (username: string) => MaybePromise<PublicKeeperProfile>
  resetDemo: () => void
}

export const GameContext = createContext<GameContextValue | null>(null)

export function useGame() {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame must be used inside GameProvider')
  return value
}
