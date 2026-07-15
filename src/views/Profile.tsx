import { useState } from 'react'
import { Award, BookOpen, Heart, RotateCcw, Star, UserPlus, Users } from 'lucide-react'
import { items } from '../data'
import { Link } from 'react-router-dom'
import { PetAvatar } from '../components/PetAvatar'
import { customizationAsset } from '../customizationData'
import { ItemArtwork } from '../components/ItemArtwork'
import { getSpecies, useGame } from '../state/GameContext'
import styles from './Profile.module.scss'

export function Profile() {
  const { state, activePet, resetDemo, backend, signOut, sessionEmail, sendFriendRequest, createInviteCode } = useGame()
  const [friendName, setFriendName] = useState('')
  const [friendStatus, setFriendStatus] = useState('')
  const [inviteLabel, setInviteLabel] = useState('')
  const [newInvite, setNewInvite] = useState('')
  const levelProgress = state.reputationXp % 100
  const addFriend = async () => { setFriendStatus(''); try { await sendFriendRequest(friendName); setFriendStatus('Request sent!'); setFriendName('') } catch (requestError) { setFriendStatus(requestError instanceof Error ? requestError.message : 'Could not send request.') } }
  if (!activePet) return null
  const scene = activePet.appearance.background ? customizationAsset(activePet.appearance.background) : undefined
  return <div className={styles.page}><section className={styles.banner}><div className={styles.identity}><div className={styles.avatar}>{state.username.slice(0, 1)}</div><div><span>KEEPER PROFILE</span><h1>{state.username}</h1><p>Making Bramblewick brighter, one tiny treasure at a time.</p></div></div><div className={`${styles.pet} ${scene ? styles.hasScene : ''}`} style={scene ? { '--pet-scene': `url("${scene.assetPath}")` } as React.CSSProperties : undefined}><PetAvatar pet={activePet} showBackground={false} /><div><span>ACTIVE FABLE</span><h2>{activePet.name}</h2><p>{getSpecies(activePet.speciesId).name}</p></div></div></section>
    <section className={styles.stats}><article><Star /><b>Reputation Level {state.reputation}</b><span>{levelProgress}/100 to Level {state.reputation + 1}</span><div><i style={{ width: `${levelProgress}%` }} /></div><small>Earned from adventures and tasks. Higher levels unlock recipes and more market listings.</small></article><article><BookOpen /><b>{state.collected.length}/120</b><span>Collection discovered</span></article><article><Users /><b>{state.friends.length} friends</b><span>{state.friends.filter((friend) => friend.online).length} exploring now</span></article></section>
    <section className={styles.friendFinder}><UserPlus /><div><span>ADD A FRIEND</span><h2>Know another Keeper?</h2><p>Enter their exact Keeper name. DMs unlock after they accept.</p></div><label><input value={friendName} onChange={(event) => setFriendName(event.target.value)} placeholder="Keeper name" /><button disabled={friendName.length<3} onClick={() => void addFriend()}>Send request</button></label>{friendStatus && <small role="status">{friendStatus}</small>}<Link to="/friends">Open friends list →</Link></section>
    {state.role==='admin' && <section className={styles.friendFinder}><Award /><div><span>INVITE CONTROL</span><h2>Welcome a new Keeper</h2><p>Codes are one-use and expire after 30 days. Share them privately.</p></div><label><input value={inviteLabel} onChange={(event)=>setInviteLabel(event.target.value)} placeholder="Label, e.g. Maya"/><button onClick={()=>void Promise.resolve(createInviteCode(inviteLabel)).then((code)=>{setNewInvite(code);setInviteLabel('')})}>Generate</button></label>{newInvite&&<small role="status">New code: <strong>{newInvite}</strong></small>}</section>}
    <section className={styles.showcase}><header><div><span>SHOWCASE</span><h2>Favorite finds</h2></div><Award /></header><div>{state.collected.slice(-6).map((id) => { const item = items.find((entry) => entry.id === id)!; return <article key={id}><b><ItemArtwork item={item} /></b><span>{item.name}</span></article> })}</div></section>
    <section className={styles.showcase}><header><div><span>WISHLIST</span><h2>Dreaming of these</h2></div><Heart /></header><div>{state.wishlist.map((id) => { const item = items.find((entry) => entry.id === id)!; return <article key={id}><b><ItemArtwork item={item} /></b><span>{item.name}</span></article> })}</div></section>
    <button className={styles.reset} onClick={() => backend === 'demo' ? resetDemo() : void signOut()}><RotateCcw /> {backend === 'demo' ? 'Reset local preview' : `Sign out${sessionEmail ? ` (${sessionEmail})` : ''}`}</button>
  </div>
}
