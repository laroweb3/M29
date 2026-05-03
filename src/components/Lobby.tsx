import { useState, useEffect } from 'react';
import { 
  db, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  where, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp,
  getDoc,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { useAuth } from './FirebaseProvider';
import { Team } from '../types';
import { generateRandomBases } from '../constants';
import { Swords, Plus, Loader2, Users, Trash2, Share2, Shield, Swords as BattleIcon, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { t } from '../lib/i18n';

interface GameRoom {
  id: string;
  name?: string;
  hostId: string;
  status: 'waiting' | 'active' | 'finished';
  players: Record<string, Team>;
  createdAt: any;
}

export function Lobby({ onJoinGame }: { onJoinGame: (gameId: string, team: Team) => void }) {
  const { user, profile } = useAuth();
  const lang = profile?.language || 'es';
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [creating, setCreating] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'games'), where('status', '==', 'waiting'));
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() } as GameRoom)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'games');
    });
    return () => unsub();
  }, []);

  const createRoom = async (preferredTeam: Team = Team.ARGENTINA) => {
    if (!user) return;
    setCreating(true);
    try {
      const finalName = roomName.trim() || `SALA DE ${user.displayName?.toUpperCase().split(' ')[0] || 'COMANDANTE'}`;
      const resp = await addDoc(collection(db, 'games'), {
        name: finalName,
        hostId: user.uid,
        status: 'waiting',
        players: { [user.uid]: preferredTeam },
        gameState: {
          bases: generateRandomBases(12),
          troops: [],
          gameTime: 0,
          victory: null,
          started: false
        },
        createdAt: serverTimestamp(),
        lastUpdatedAt: serverTimestamp()
      });
      onJoinGame(resp.id, preferredTeam);
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const deleteRoom = async (roomId: string) => {
    if (!user) return;
    if (!confirm(t(lang, 'abort_confirm'))) return;
    
    setIsDeleting(roomId);
    try {
      await deleteDoc(doc(db, 'games', roomId));
    } catch (e) {
      console.error("Delete failed", e);
      alert('Error al eliminar la sala: Sin permisos o error de red');
    } finally {
      setIsDeleting(null);
    }
  };

  const startEditingName = (room: GameRoom) => {
    setEditingRoomId(room.id);
    setNewRoomName(room.name || '');
  };

  const cancelEditingName = () => {
    setEditingRoomId(null);
    setNewRoomName('');
  };

  const saveRoomName = async (roomId: string) => {
    if (!user || !newRoomName.trim()) return;
    setIsUpdatingName(true);
    try {
      await updateDoc(doc(db, 'games', roomId), {
        name: newRoomName.trim().toUpperCase()
      });
      setEditingRoomId(null);
    } catch (e) {
      console.error("Update name failed", e);
    } finally {
      setIsUpdatingName(false);
    }
  };

  const shareRoom = async (roomId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?gameId=${roomId}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'M29 - Tactical Conflict',
          text: lang === 'es' 
            ? '¡Atención! Te desafío a una batalla estratégica en las Islas Malvinas. ¿Tienes lo necesario para vencerme?' 
            : 'Attention! I challenge you to a strategic battle in the Falkland Islands. Do you have what it takes to beat me?',
          url: url
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert(lang === 'es' ? 'Enlace de invitación copiado al portapapeles' : 'Invitation link copied to clipboard');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const joinRoom = async (room: GameRoom) => {
    if (!user) return;
    const existingPlayers = Object.keys(room.players);
    if (existingPlayers.length >= 2) return;
    
    const hostTeam = Object.values(room.players)[0];
    const myTeam = hostTeam === Team.ARGENTINA ? Team.OPPONENT : Team.ARGENTINA;

    await updateDoc(doc(db, 'games', room.id), {
      [`players.${user.uid}`]: myTeam,
      status: 'active',
      'gameState.started': true
    });
    onJoinGame(room.id, myTeam);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3 bg-slate-900/50 p-4 rounded-2xl border border-white/5 shadow-inner">
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-sky-400 pl-1">{t(lang, 'room_id_label')}</label>
          <input 
            type="text" 
            placeholder={t(lang, 'op_name_placeholder')}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value.toUpperCase())}
            className="bg-black/40 border border-white/10 rounded-xl px-4 py-4 text-xs font-black tracking-widest uppercase focus:border-sky-500/50 outline-none transition-all placeholder:text-slate-700"
          />
        </div>
        <div className="flex gap-4">
          <button 
            disabled={creating}
            onClick={() => createRoom(Team.ARGENTINA)}
            className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 py-4 rounded-xl flex flex-col items-center justify-center gap-1 font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-sky-900/20 active:scale-95"
          >
            <div className="flex items-center gap-2">
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              <span className="text-xs">{t(lang, 'lead_arg')}</span>
            </div>
            <span className="text-[8px] opacity-50">{t(lang, 'nat_sovereignty')}</span>
          </button>
          <button 
            disabled={creating}
            onClick={() => createRoom(Team.OPPONENT)}
            className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 py-4 rounded-xl flex flex-col items-center justify-center gap-1 font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-black/20 active:scale-95 border border-white/5"
          >
            <div className="flex items-center gap-2">
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <BattleIcon className="w-5 h-5" />}
              <span className="text-xs">{t(lang, 'command_uk')}</span>
            </div>
            <span className="text-[8px] opacity-50">{t(lang, 'task_force')}</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 px-1 border-l-2 border-sky-500 ml-1">
            {t(lang, 'op_centers')} ({rooms.length})
        </h3>
        <AnimatePresence mode="popLayout" initial={false}>
          {rooms.map(room => (
            <motion.div 
              key={room.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900/80 border border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:bg-slate-900 hover:border-white/10 transition-all shadow-xl"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${Object.values(room.players)[0] === Team.ARGENTINA ? 'bg-sky-400' : 'bg-red-400'} animate-pulse`} />
                  {editingRoomId === room.id ? (
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <input 
                        type="text"
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value.toUpperCase())}
                        autoFocus
                        className="bg-black/40 border border-sky-500/30 rounded-lg px-2 py-1 text-[11px] font-black text-white uppercase tracking-wider w-full outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveRoomName(room.id);
                          if (e.key === 'Escape') cancelEditingName();
                        }}
                      />
                      <button 
                        onClick={() => saveRoomName(room.id)}
                        disabled={isUpdatingName}
                        className="p-1 hover:text-green-400 transition-colors"
                      >
                        {isUpdatingName ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                      </button>
                      <button 
                        onClick={cancelEditingName}
                        className="p-1 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/title">
                      <div className="text-[11px] font-black text-white uppercase tracking-wider">{room.name || `SALA #${room.id.slice(-4).toUpperCase()}`}</div>
                      {room.hostId === user?.uid && (
                        <button 
                          onClick={() => startEditingName(room)}
                          className="opacity-0 group-hover/title:opacity-100 p-1 hover:text-sky-400 transition-all"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-[9px] text-slate-500 font-mono tracking-wider flex items-center gap-2">
                  <span className="bg-white/5 px-2 py-0.5 rounded uppercase">
                    {Object.values(room.players)[0] === Team.ARGENTINA ? `HOST: ${t(lang, 'argentina')}` : `HOST: ${t(lang, 'uk')}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {room.hostId === user?.uid ? (
                  <>
                    <button 
                      onClick={() => shareRoom(room.id)}
                      className="p-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/20 transition-all"
                      title={t(lang, 'share_invitation')}
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button 
                      disabled={isDeleting === room.id}
                      onClick={() => deleteRoom(room.id)}
                      className="p-3 bg-red-500/10 hover:bg-red-500/80 hover:text-white text-red-500 rounded-xl border border-red-500/20 transition-all flex items-center gap-2 group/del"
                      title={t(lang, 'abort')}
                    >
                      {isDeleting === room.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span className="text-[9px] font-black uppercase tracking-tighter hidden group-hover/del:inline">{t(lang, 'abort')}</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => joinRoom(room)}
                    className="bg-white text-black h-11 px-6 rounded-xl flex items-center gap-3 transition-all hover:bg-sky-400 hover:text-white font-black shadow-lg"
                  >
                    <span className="text-xs uppercase tracking-widest">{t(lang, 'deploy')}</span>
                    <Swords className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {rooms.length === 0 && !creating && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.4em] italic mb-1">{t(lang, 'no_war_theaters')}</p>
                <p className="text-[9px] text-slate-700 font-mono">{t(lang, 'start_mission_msg')}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
