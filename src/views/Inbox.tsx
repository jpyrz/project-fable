import { Bell, CheckCheck, MessageCircle, ShoppingBag, UserRoundCheck } from 'lucide-react'
import { useGame } from '../state/GameContext'
import styles from './Inbox.module.scss'

export function Inbox() {
  const { state, respondFriendRequest } = useGame()
  return <div className={styles.page}><header className="pageHeader"><div><span>YOUR INBOX</span><h1>A little bird told us…</h1><p>Sales, friends, rewards, and moderation notices appear here.</p></div><Bell /></header>{state.friendRequests.length>0 && <section className={styles.requests}><h2>Friend requests</h2>{state.friendRequests.map((request)=><article key={request.requesterId}><UserRoundCheck /><b>{request.name}</b><span>would like to be friends.</span><div><button onClick={() => void respondFriendRequest(request.requesterId,true)}>Accept</button><button onClick={() => void respondFriendRequest(request.requesterId,false)}>Decline</button></div></article>)}</section>}<section className={styles.list}>{state.notifications.length ? state.notifications.map((note, index) => <article key={note.id}><div>{index % 3 === 0 ? <UserRoundCheck /> : index % 3 === 1 ? <MessageCircle /> : <ShoppingBag />}</div><p>{note.text}<span>{note.read ? 'Seen' : 'New'} • just now</span></p>{note.read && <CheckCheck />}</article>) : <p>No messages yet.</p>}</section></div>
}
