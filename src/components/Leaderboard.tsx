import { useState, useEffect } from 'react';
import { db, collection, query, orderBy, limit, onSnapshot, doc, handleFirestoreError, OperationType, where, getDocs } from '../lib/firebase';
import { useAuth, UserProfile } from './FirebaseProvider';
import { Trophy, Globe, Search, Sword, UserPlus, UserMinus, Users, ShieldAlert, Medal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Team } from '../types';
import { t } from '../lib/i18n';
import { getUserRank } from '../lib/ranks';

export function Leaderboard() {
  const { profile, addFriend, removeFriend } = useAuth();
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [globalStats, setGlobalStats] = useState({ argVictories: 0, ukVictories: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('victories', 'desc'), limit(10));
    const unsubLeaders = onSnapshot(q, (snap) => {
      setLeaders(snap.docs.map(d => d.data() as UserProfile));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
    });

    const unsubStats = onSnapshot(doc(db, 'stats', 'global'), (doc) => {
      if (doc.exists()) {
        setGlobalStats(doc.data() as any);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'stats/global');
    });

    return () => {
      unsubLeaders();
      unsubStats();
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const q = query(
        collection(db, 'users'), 
        where('handle', '>=', searchQuery.toLowerCase()),
        where('handle', '<=', searchQuery.toLowerCase() + '\uf8ff'),
        limit(5)
      );
      const snap = await getDocs(q);
      setSearchResults(snap.docs.map(d => d.data() as UserProfile));
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setIsSearching(false);
    }
  };

  const getFlag = (user: UserProfile) => {
    const team = user.favTeam as unknown as string;
    if (team === Team.ARGENTINA) return 'https://flagcdn.com/ar.svg';
    if (team === Team.OPPONENT) return 'https://flagcdn.com/gb.svg';
    if (user.victories > 0) return 'https://flagcdn.com/ar.svg'; 
    return 'https://flagcdn.com/ar.svg';
  };

  const lang = profile?.language || 'es';

  return (
    <div className="space-y-6 max-w-sm w-full mx-auto">
      {/* Global Stats */}
      <div className="bg-slate-900 border border-sky-900/50 p-4 rounded-xl shadow-xl">
        <h3 className="text-sm font-black uppercase tracking-widest text-sky-400 mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4" /> {t(lang, 'global_conflict')}
        </h3>
        <div className="flex gap-4 items-center">
            <div className="flex-1 text-center p-2 bg-sky-500/10 rounded border border-sky-500/20">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                    <img src="https://flagcdn.com/ar.svg" className="w-4 h-auto rounded-[1px] shadow-sm" alt="Argentina" />
                    <div className="text-[10px] uppercase font-bold text-sky-400">{t(lang, 'argentina')}</div>
                </div>
                <div className="text-2xl font-black font-mono">{globalStats.argVictories}</div>
            </div>
            <div className="text-slate-700 font-black italic text-xl">VS</div>
            <div className="flex-1 text-center p-2 bg-slate-500/10 rounded border border-slate-500/20">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                    <img src="https://flagcdn.com/gb.svg" className="w-4 h-auto rounded-[1px] shadow-sm" alt="UK" />
                    <div className="text-[10px] uppercase font-bold text-slate-400">{t(lang, 'uk')}</div>
                </div>
                <div className="text-2xl font-black font-mono">{globalStats.ukVictories}</div>
            </div>
        </div>
      </div>

      {/* Search Section */}
      <div className="bg-slate-950/50 backdrop-blur-md border border-white/5 p-4 rounded-xl">
        <div className="relative">
          <input 
            type="text"
            placeholder={t(lang, 'search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-sky-500/50 transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        </div>

        <AnimatePresence>
          {searchResults.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-4 space-y-2 border-t border-white/5 pt-4"
            >
              <div className="text-[8px] font-black uppercase text-slate-500 mb-2">{t(lang, 'intel_results')}</div>
              {searchResults.map(result => (
                <div key={result.uid} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-2">
                    <img src={getFlag(result)} className="w-4 h-auto rounded-[1px]" alt="" />
                    <div className="flex flex-col overflow-hidden">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-[10px] font-black text-white italic truncate max-w-[100px]">@{result.handle || 'SIN_ID'}</span>
                        {(() => {
                            const rank = getUserRank(result.victories);
                            return (
                                <span 
                                    className="text-[7px] font-bold px-1 py-0.5 rounded border border-current uppercase tracking-tighter shrink-0"
                                    style={{ color: rank.color, backgroundColor: `${rank.color}10` }}
                                >
                                    {t(lang, rank.key)}
                                </span>
                            );
                        })()}
                      </div>
                      <span className="text-[8px] text-slate-500 uppercase truncate max-w-[120px]">{result.displayName}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {profile && profile.uid !== result.uid && (
                        <button 
                            onClick={() => profile.friends?.includes(result.uid) ? removeFriend(result.uid) : addFriend(result.uid)}
                            className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-sky-400 transition-colors"
                        >
                            {profile.friends?.includes(result.uid) ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                        </button>
                    )}
                    <button className="p-1.5 hover:bg-sky-500/20 text-sky-400 rounded transition-colors group" title="Desafiar">
                        <Sword className="w-3 h-3 group-hover:rotate-12 transition-transform" />
                    </button>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setSearchResults([])}
                className="w-full text-center py-1 text-[8px] font-black text-slate-600 uppercase hover:text-slate-400"
              >
                Limpiar Búsqueda
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Leaderboard List */}
      <div className="bg-slate-950/50 backdrop-blur-md border border-white/5 p-4 rounded-xl">
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
          <Trophy className="w-4 h-4" /> {t(lang, 'top_commanders')}
        </h3>
        <div className="space-y-2">
          {leaders.map((leader, i) => (
            <motion.div 
              key={leader.uid}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500 w-4">{i + 1}</span>
                <div className="relative">
                  <img src={leader.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${leader.uid}`} className="w-8 h-8 rounded border border-white/20" alt="" />
                  <img src={getFlag(leader)} className="absolute -bottom-1 -right-1 w-3 h-auto rounded-[1px] border border-black shadow-sm" alt="" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="text-[10px] font-black text-sky-400 italic truncate max-w-[80px]">
                        {leader.handle ? `@${leader.handle}` : leader.displayName}
                    </span>
                    {(() => {
                        const rank = getUserRank(leader.victories);
                        return (
                            <span 
                                className="text-[7px] font-bold px-1 py-0.5 rounded border border-current uppercase tracking-tighter shrink-0"
                                style={{ color: rank.color, backgroundColor: `${rank.color}10` }}
                                title={t(lang, rank.key)}
                            >
                                {t(lang, rank.key)}
                            </span>
                        );
                    })()}
                  </div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase truncate max-w-[100px]">{leader.displayName}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-sky-400">{leader.victories}V</div>
                <div className="text-[9px] text-slate-500 uppercase font-bold">{leader.totalGames} G</div>
              </div>
            </motion.div>
          ))}
          {leaders.length === 0 && <p className="text-center text-[10px] text-slate-600 uppercase font-bold py-4 italic">Buscando informes de guerra...</p>}
        </div>
      </div>

      {/* Friends Section */}
      {profile && profile.friends && profile.friends.length > 0 && (
          <div className="bg-slate-950/50 backdrop-blur-md border border-white/5 p-4 rounded-xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" /> {t(lang, 'friends')}
              </h3>
              <div className="space-y-2">
                  {leaders.filter(l => profile.friends?.includes(l.uid)).map((friend) => (
                      <div key={friend.uid} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <img src={friend.photoURL} className="w-6 h-6 rounded border border-white/20" alt="" />
                                <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full border border-black" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-white italic truncate max-w-[120px]">@{friend.handle}</span>
                            </div>
                        </div>
                        <button className="p-1 hover:bg-sky-500/20 text-sky-400 rounded transition-colors">
                            <Sword className="w-3 h-3" />
                        </button>
                      </div>
                  ))}
              </div>
          </div>
      )}
    </div>
  );
}
