import { Check, HeartHandshake, MessageCircle, UserPlus, Users, X } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../state/GameContext'
import { useCelebration } from '../components/Celebration'
import styles from './Friends.module.scss'

export function Friends() {
  const { state, sendFriendRequest, respondFriendRequest } = useGame()
  const celebrate = useCelebration()
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')
  const request = async () => {
    setStatus('')
    try { await sendFriendRequest(name.trim()); setStatus(`Friend request sent to ${name.trim()}!`); setName('') }
    catch (error) { setStatus(error instanceof Error ? error.message : 'That request could not be sent.') }
  }
  const respond = async (requesterId: string, name: string, accept: boolean) => { await respondFriendRequest(requesterId, accept); if (accept) celebrate({ icon: '💞', title: 'A new Bramblewick friend!', detail: `${name} joined your circle.` }) }
  return <div className={styles.page}>
    <header className="pageHeader"><div><span>YOUR CIRCLE</span><h1>Friends of the Fables</h1><p>Find your people, see who they’re adventuring with, and pick up a cozy conversation.</p></div><HeartHandshake /></header>
    <section className={styles.finder}><UserPlus /><div><span>ADD A KEEPER</span><h2>Make a new friend</h2><p>Enter their exact Keeper name. Messages unlock after they accept.</p></div><form onSubmit={(event) => { event.preventDefault(); void request() }}><input value={name} onChange={(event) => setName(event.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="Keeper name" maxLength={20} /><button disabled={name.length < 3}>Send request</button></form>{status && <small role="status">{status}</small>}</section>
    {state.friendRequests.length > 0 && <section className={styles.requests}><header><div><span>WAITING FOR YOU</span><h2>Friend requests</h2></div><b>{state.friendRequests.length}</b></header>{state.friendRequests.map((requester) => <article key={requester.requesterId}><div className={styles.avatar}>{requester.name.slice(0,1)}</div><div><strong>{requester.name}</strong><small>would like to be friends</small></div><button className={styles.accept} onClick={() => void respond(requester.requesterId, requester.name, true)} aria-label={`Accept ${requester.name}`}><Check /></button><button className={styles.decline} onClick={() => void respond(requester.requesterId, requester.name, false)} aria-label={`Decline ${requester.name}`}><X /></button></article>)}</section>}
    <section className={styles.list}><header><div><span>KEEPERS YOU KNOW</span><h2>Your friends</h2></div><Users /></header>{state.friends.length ? <div className={styles.grid}>{state.friends.map((friend) => <article key={friend.id}><div className={styles.avatar}>{friend.name.slice(0,1)}<i className={friend.online ? styles.online : ''} /></div><div><strong>{friend.name}</strong><small>Exploring with {friend.pet}</small><span>{friend.online ? 'Around Bramblewick' : 'Away for now'}</span></div><Link to={`/plaza?dm=${encodeURIComponent(friend.name)}`}><MessageCircle /> Message</Link></article>)}</div> : <div className={styles.empty}><HeartHandshake /><h3>Your circle is ready to grow</h3><p>Send a request above, or say hello in the Lobby.</p><Link className="button secondary" to="/plaza">Visit the plaza</Link></div>}</section>
  </div>
}
