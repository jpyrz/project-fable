import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { items } from '../data'
import { supabase } from '../lib/supabase'
import type { DailyTask, GameState, Pet, SpeciesId } from '../types'
import { GameContext, type GameContextValue } from './GameContextDefinition'

interface Snapshot {
  profile: { username: string; role: 'player' | 'moderator' | 'admin'; age_confirmed: boolean; reputation: number; reputation_xp: number; active_pet_id: string | null }
  coins: number
  pets: Array<{ id: string; name: string; species_id: SpeciesId; palette: number; hunger: number; mood: number; cleanliness: number; equipped: Record<string, string> }>
  inventory: Record<string, number>
  collected: string[]
  wishlist: string[]
  listings: Array<{ id: string; item_id: string; seller: string; price: number; quantity: number }>
  messages: Array<{ id: string; channel: string; author: string; body: string; time: string; own: boolean }>
  notifications: Array<{ id: string; text: string; read: boolean }>
  tasks: Array<{ id: string; label: string; progress: number; target: number; reward: number; claimed: boolean }>
  daily_wish_claimed: boolean
  friends: Array<{ id: string; name: string; pet: string; online: boolean }>
  friend_requests: Array<{ requester_id: string; name: string }>
}

interface CompanionPet {
  id: string
  name: string
  species_id: SpeciesId
  palette: number
  variant: Pet['variant']
  pronouns: Pet['pronouns']
  hunger: number
  mood: number
  cleanliness: number
  equipped: Record<string, string>
}

interface DailyAdventures { tasks: DailyTask[]; reset_at: string }

const emptyState: GameState = {
  onboarded: false,
  username: '',
  role: 'player',
  ageConfirmed: false,
  coins: 0,
  reputation: 1,
  reputationXp: 0,
  pets: [],
  activePetId: '',
  inventory: {},
  collected: [],
  wishlist: [],
  listings: [],
  messages: [],
  notifications: [],
  tasks: [],
  dailyResetAt: '',
  dailyWishClaimed: false,
  friends: [],
  friendRequests: [],
}

function mapSnapshot(snapshot: Snapshot, companions: CompanionPet[], adventures: DailyAdventures): GameState {
  const pets = companions.map((pet) => ({
    id: pet.id,
    name: pet.name,
    speciesId: pet.species_id,
    palette: pet.palette,
    variant: pet.variant,
    pronouns: pet.pronouns,
    hunger: pet.hunger,
    mood: pet.mood,
    cleanliness: pet.cleanliness,
    equipped: pet.equipped,
  }))
  return {
    onboarded: Boolean(snapshot.profile.active_pet_id && pets.length),
    username: snapshot.profile.username,
    role: snapshot.profile.role,
    ageConfirmed: snapshot.profile.age_confirmed,
    coins: Number(snapshot.coins),
    reputation: snapshot.profile.reputation,
    reputationXp: snapshot.profile.reputation_xp,
    pets,
    activePetId: snapshot.profile.active_pet_id ?? '',
    inventory: snapshot.inventory,
    collected: snapshot.collected,
    wishlist: snapshot.wishlist,
    listings: snapshot.listings.map((listing) => ({ id: listing.id, itemId: listing.item_id, seller: listing.seller, price: listing.price, quantity: listing.quantity })),
    messages: snapshot.messages,
    notifications: snapshot.notifications,
    tasks: adventures.tasks,
    dailyResetAt: adventures.reset_at,
    dailyWishClaimed: snapshot.daily_wish_claimed,
    friends: snapshot.friends,
    friendRequests: (snapshot.friend_requests ?? []).map((request) => ({ requesterId: request.requester_id, name: request.name })),
  }
}

export function SupabaseGameProvider({ children }: { children: ReactNode }) {
  if (!supabase) throw new Error('SupabaseGameProvider requires configured environment variables')
  const client = supabase
  const [state, setState] = useState<GameState>(emptyState)
  const [session, setSession] = useState<Session | null>(null)
  const [status, setStatus] = useState<GameContextValue['status']>('loading')
  const [error, setError] = useState('')
  const [recoveryMode, setRecoveryMode] = useState(false)
  const refreshTimer = useRef<number | undefined>(undefined)

  const refresh = useCallback(async () => {
    const [snapshotResult, companionResult, adventureResult] = await Promise.all([
      client.rpc('get_game_snapshot'),
      client.rpc('get_pet_companions'),
      client.rpc('get_daily_adventures'),
    ])
    const requestError = snapshotResult.error ?? companionResult.error ?? adventureResult.error
    if (requestError) { setError(requestError.message); setStatus('error'); throw requestError }
    setState(mapSnapshot(
      snapshotResult.data as unknown as Snapshot,
      companionResult.data as unknown as CompanionPet[],
      adventureResult.data as unknown as DailyAdventures,
    ))
    setError('')
    setStatus('ready')
  }, [client])

  useEffect(() => {
    let active = true
    void client.auth.getSession().then(({ data }) => { if (active) setSession(data.session) })
    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => { if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true); setSession(nextSession) })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [client])

  useEffect(() => {
    if (!session) { setState(emptyState); setStatus('signed_out'); return }
    if (recoveryMode) { setStatus('password_recovery'); return }
    setStatus('loading')
    void refresh()
  }, [session, refresh, recoveryMode])

  useEffect(() => {
    if (!session) return
    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer.current)
      refreshTimer.current = window.setTimeout(() => { void refresh() }, 150)
    }
    const channel = client.channel(`game-state-${session.user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `owner_id=eq.${session.user.id}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_listings' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, scheduleRefresh)
      .subscribe()
    return () => { window.clearTimeout(refreshTimer.current); void client.removeChannel(channel) }
  }, [client, session, refresh])

  const rpc = useCallback(async (name: string, args: Record<string, unknown> = {}) => {
    const { data, error: rpcError } = await client.rpc(name, args)
    if (rpcError) { setError(rpcError.message); throw rpcError }
    return data as unknown
  }, [client])

  const value = useMemo<GameContextValue>(() => ({
    state,
    activePet: state.pets.find((pet) => pet.id === state.activePetId),
    backend: 'supabase',
    status,
    error,
    sessionEmail: session?.user.email ?? '',
    async onboard(username, petName, speciesId, palette, variant, pronouns) {
      await rpc('complete_onboarding', { p_username: username, p_pet_name: petName, p_species: speciesId, p_palette: palette, p_variant: variant, p_pronouns: pronouns })
      await refresh()
    },
    async care(kind) {
      if (!state.activePetId) return
      await rpc('care_pet', { p_pet: state.activePetId, p_kind: kind }); await refresh()
    },
    async buyShopItem(itemId) {
      try { await rpc('buy_shop_item', { p_item: itemId, p_idempotency_key: crypto.randomUUID() }); await refresh(); return true } catch { return false }
    },
    async buyListing(listingId) {
      try { await rpc('buy_listing', { p_listing: listingId, p_idempotency_key: crypto.randomUUID() }); await refresh(); return true } catch { return false }
    },
    async createListing(itemId, quantity, unitPrice) {
      try { await rpc('create_listing', { p_item: itemId, p_quantity: quantity, p_unit_price: unitPrice, p_idempotency_key: crypto.randomUUID() }); await refresh(); return true } catch { return false }
    },
    async craft(recipeId) {
      try { await rpc('craft_item', { p_recipe: recipeId, p_idempotency_key: crypto.randomUUID() }); await refresh(); return true } catch { return false }
    },
    async equip(itemId) {
      const item = items.find((entry) => entry.id === itemId)
      if (!item || !state.activePetId) return
      const slot = item.category === 'background' ? 'background' : item.name.includes('Hat') || item.name.includes('Crown') ? 'head' : item.name.includes('Scarf') || item.name.includes('Bow') ? 'neck' : 'held'
      await rpc('equip_item', { p_pet: state.activePetId, p_slot: slot, p_item: itemId }); await refresh()
    },
    async toggleWishlist(itemId) { await rpc('toggle_wishlist_item', { p_item: itemId }); await refresh() },
    async addMessage(channel, body) {
      if (channel.startsWith('DM:')) {
        const friend = state.friends.find((entry) => entry.name === channel.slice(3))
        if (!friend) throw new Error('You can only message accepted friends.')
        await rpc('send_dm', { p_friend: friend.id, p_body: body })
      } else {
        await rpc('send_channel_message', { p_channel: channel.toLowerCase(), p_body: body })
      }
      await refresh()
    },
    async reportMessage(messageId, reason) { await rpc('submit_message_report', { p_message: messageId, p_reason: reason }) },
    async sendFriendRequest(username) { await rpc('send_friend_request', { p_username: username }); await refresh() },
    async respondFriendRequest(requesterId, accept) { await rpc('respond_friend_request', { p_requester: requesterId, p_accept: accept }); await refresh() },
    async createInviteCode(label) { return await rpc('create_invite_code', { p_label: label }) as string },
    async startGame(gameId) {
      const result = await rpc('start_game_run', { p_game: gameId }) as { run_id: string }
      return result.run_id
    },
    async gameReward(_gameId, score, runId) {
      const result = await rpc('submit_game_run', { p_run: runId, p_score: score, p_idempotency_key: crypto.randomUUID() }) as { reward: number }
      await refresh(); return result.reward
    },
    async claimTask(taskId) { await rpc('claim_daily_task', { p_task: taskId, p_idempotency_key: crypto.randomUUID() }); await refresh() },
    async makeWish() { if (!state.dailyWishClaimed) { await rpc('claim_daily_wish', { p_idempotency_key: crypto.randomUUID() }); await refresh() } },
    async markNotificationsRead() { await rpc('mark_notifications_read'); await refresh() },
    async signIn(email, password) {
      const { error: authError } = await client.auth.signInWithPassword({ email, password })
      if (authError) throw authError
    },
    async signUp(email, password, username, inviteCode) {
      const { data, error: authError } = await client.auth.signUp({ email, password, options: { data: { username, invite_code: inviteCode }, emailRedirectTo: window.location.origin } })
      if (authError) throw authError
      return data.session ? 'confirmed' : 'pending'
    },
    async signOut() { await client.auth.signOut() },
    async sendPasswordReset(email) {
      const { error: resetError } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
      if (resetError) throw resetError
    },
    async updatePassword(password) {
      const { error: updateError } = await client.auth.updateUser({ password })
      if (updateError) throw updateError
      setRecoveryMode(false); await refresh()
    },
    refresh,
    resetDemo() {},
  }), [client, error, refresh, rpc, session, state, status])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
