import { motion, AnimatePresence } from 'motion/react';
import { Target, Flag, RefreshCw, Trophy, Users, Shield, Plane, Ship, Info, LogOut, Swords, List, Share2, Loader2, Settings, Volume2, VolumeX } from 'lucide-react';
import { useGameState } from './hooks/useGameState';
import { Team, Base, TroopBatch } from './types';
import { COLORS } from './constants';
import { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FirebaseProvider, useAuth } from './components/FirebaseProvider';
import { Lobby } from './components/Lobby';
import { Leaderboard } from './components/Leaderboard';
import { Chat } from './components/Chat';
import { SettingsPanel } from './components/SettingsPanel';
import { t } from './lib/i18n';
import { getUserRank } from './lib/ranks';
import { db, doc, updateDoc, increment, setDoc, handleFirestoreError, OperationType } from './lib/firebase';

// Using direct URLs for leaflet markers to avoid import issues
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl,
    shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function App() {
    return (
        <FirebaseProvider>
            <MainContent />
        </FirebaseProvider>
    );
}

function MainContent() {
    const { user, login, logout, profile, loading } = useAuth();
    const lang = profile?.language || 'es';
    const [view, setView] = useState<'lobby' | 'game' | 'leaderboard'>('lobby');
    const [activeGame, setActiveGame] = useState<{ id?: string, team: Team } | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [muted, setMuted] = useState(false);

    useEffect(() => {
        soundManager.setMuted(muted);
    }, [muted]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const gameId = params.get('gameId');
        if (gameId && user) {
            setActiveGame({ id: gameId, team: Team.OPPONENT }); // Default to opponent if joining via link
            setView('game');
            // Clean up URL without reload
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [user]);

    const handleJoinGame = (gameId: string, team: Team) => {
        setActiveGame({ id: gameId, team });
        setView('game');
    };

    const handleSinglePlayer = (team: Team) => {
        setActiveGame({ team });
        setView('game');
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-[#020617] flex items-center justify-center text-sky-400">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <RefreshCw className="w-12 h-12" />
                </motion.div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="fixed inset-0 bg-[#020617] flex flex-col items-center justify-center p-6 text-slate-100 font-sans overflow-hidden">
                <div className="absolute inset-0 military-scanline opacity-[0.03] pointer-events-none z-20" />
                
                {/* Background Malvinas Vector */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none blur-[1px]">
                    <svg viewBox="0 0 800 600" className="w-[120%] h-auto text-white fill-current">
                        {/* Simplified Gran Malvina (West) */}
                        <path d="M220,250 L240,210 L280,180 L320,190 L350,230 L340,300 L300,350 L250,380 L200,360 L180,310 Z" />
                        {/* Simplified Isla Soledad (East) */}
                        <path d="M450,200 L500,170 L580,180 L620,220 L630,280 L600,350 L550,400 L480,420 L420,380 L400,310 L410,250 Z" />
                        {/* Minor islands dots */}
                        <circle cx="380" cy="280" r="10" />
                        <circle cx="400" cy="450" r="8" />
                        <circle cx="210" cy="420" r="12" />
                    </svg>
                </div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-12 z-10 flex flex-col items-center">
                    <div className="space-y-4">
                        <h1 className="text-7xl md:text-9xl font-black italic tracking-tighter text-sky-400 drop-shadow-[0_0_30px_rgba(56,189,248,0.3)]">M29</h1>
                        <p className="text-sm md:text-base font-black tracking-[0.6em] text-white uppercase opacity-80 decoration-sky-500 decoration-2 underline-offset-8">{lang === 'es' ? 'Malvinas 2029 - Conflicto' : 'Falklands 2029 - Conflict'}</p>
                    </div>
                    
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={login}
                        className="bg-white text-black px-10 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-sky-400 transition-all shadow-[0_0_50px_rgba(56,189,248,0.2)] flex items-center gap-4 group"
                    >
                        <img src="https://www.google.com/favicon.ico" className="w-5 h-5 group-hover:rotate-12 transition-transform" alt=""/>
                        <span>{lang === 'es' ? 'Acceder con Google' : 'Sign in with Google'}</span>
                    </motion.button>

                    <div className="pt-12 flex flex-col items-center gap-2 opacity-30">
                        <div className="w-px h-12 bg-gradient-to-b from-transparent via-sky-500 to-transparent" />
                        <span className="text-[10px] font-mono tracking-widest uppercase">{lang === 'es' ? 'Protocolo de Encriptación Activo' : 'Encryption Protocol Active'}</span>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div id="game-root" className="fixed inset-0 bg-[#020617] text-slate-100 font-sans overflow-hidden select-none">
            <div className="absolute inset-0 military-scanline opacity-[0.03] pointer-events-none z-[5000]" />
            
            {view === 'game' && activeGame && (
                <Game 
                    gameId={activeGame.id} 
                    playerTeam={activeGame.team} 
                    onExit={() => { setView('lobby'); setActiveGame(null); }} 
                />
            )}

            {view !== 'game' && (
                <div className="relative h-full flex flex-col z-10">
                    <AnimatePresence>
                        {isSettingsOpen && (
                            <SettingsPanel onClose={() => setIsSettingsOpen(false)} />
                        )}
                    </AnimatePresence>
                    <header className="p-6 flex justify-between items-center bg-slate-900/50 backdrop-blur-md border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <h1 className="text-3xl font-black italic tracking-tighter text-sky-400">M29</h1>
                            <div className="flex bg-slate-950 p-1 rounded-lg border border-white/5">
                                <button onClick={() => setView('lobby')} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${view === 'lobby' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{lang === 'es' ? 'LOBBY' : 'LOBBY'}</button>
                                <button onClick={() => setView('leaderboard')} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${view === 'leaderboard' ? 'bg-sky-500 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{lang === 'es' ? 'STATS' : 'STATS'}</button>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden md:block">
                                <div className="flex items-center justify-end gap-2">
                                    {(() => {
                                        const rank = getUserRank(profile?.victories);
                                        return (
                                            <span 
                                                className="text-[8px] font-black px-1.5 py-0.5 rounded border border-current uppercase tracking-tighter"
                                                style={{ color: rank.color, backgroundColor: `${rank.color}10` }}
                                            >
                                                {t(lang, rank.key)}
                                            </span>
                                        );
                                    })()}
                                    <div className="text-xs font-black uppercase tracking-tight text-sky-400">
                                        {profile?.handle ? `@${profile.handle}` : profile?.displayName}
                                    </div>
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                    {profile?.victories} {t(lang, 'victories')}
                                </div>
                            </div>
                            <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setIsSettingsOpen(true)}
                                className="relative group"
                            >
                                <img src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} className="w-10 h-10 rounded-lg border border-sky-500/30 group-hover:border-sky-400 group-hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] transition-all" alt="" />
                                <div className="absolute inset-0 bg-sky-500/0 group-hover:bg-sky-500/20 rounded-lg transition-colors flex items-center justify-center">
                                    <Settings className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </motion.button>
                            <button 
                                onClick={() => setMuted(!muted)}
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors mr-2"
                            >
                                {muted ? <VolumeX className="w-5 h-5 text-slate-400" /> : <Volume2 className="w-5 h-5 text-sky-400" />}
                            </button>
                            <button onClick={logout} className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg border border-white/10 transition-colors">
                                <LogOut className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </header>

                    <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center">
                        {view === 'lobby' ? (
                            <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-start">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h2 className="text-4xl font-black uppercase italic tracking-tighter">{t(lang, 'start_operation')}</h2>
                                        <p className="text-slate-400 text-sm leading-relaxed border-l-2 border-sky-500/30 pl-4">
                                            {lang === 'es' ? 'Seleccione un despliegue rápido contra la IA táctica o busque frecuencias habilitadas para combate online.' : 'Select a quick deployment against tactical AI or search for enabled frequencies for online combat.'}
                                        </p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => handleSinglePlayer(Team.ARGENTINA)}
                                            className="flex-1 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 py-4 rounded-xl flex flex-col items-center gap-2 group transition-all"
                                        >
                                            <img src="https://flagcdn.com/ar.svg" className="w-10 h-auto rounded-sm group-hover:scale-110 transition-transform shadow-lg" alt="ARG" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">ARG Solo</span>
                                        </button>
                                        <button 
                                            onClick={() => handleSinglePlayer(Team.OPPONENT)}
                                            className="flex-1 bg-slate-700/10 hover:bg-slate-700/20 border border-slate-700/30 py-4 rounded-xl flex flex-col items-center gap-2 group transition-all"
                                        >
                                            <img src="https://flagcdn.com/gb.svg" className="w-10 h-auto rounded-sm group-hover:scale-110 transition-transform shadow-lg" alt="UK" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">UK Solo</span>
                                        </button>
                                    </div>
                                    <Lobby onJoinGame={handleJoinGame} />
                                </div>
                                <div className="hidden md:block">
                                    <Leaderboard />
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-md">
                                <Leaderboard />
                            </div>
                        )}
                    </main>
                </div>
            )}
        </div>
    );
}

function Game({ gameId, playerTeam, onExit }: { gameId?: string, playerTeam: Team, onExit: () => void }) {
  const { profile } = useAuth();
  const lang = profile?.language || 'es';
  const { gameState, sendTroops, startGame, restart } = useGameState(gameId, playerTeam);
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(null);
  const [percentage, setPercentage] = useState(0.6);
  const [isSharing, setIsSharing] = useState(false);
  const hasUpdatedRef = useRef(false);

  const shareGame = async () => {
    if (!gameId) return;
    setIsSharing(true);
    const url = `${window.location.origin}${window.location.pathname}?gameId=${gameId}`;
    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Malvinas 2029 - Conflicto',
                text: '¡Atención! Te desafío a una batalla estratégica en las Islas Malvinas. ¿Tienes lo necesario para vencerme?',
                url: url
            });
        } else {
            await navigator.clipboard.writeText(url);
            alert('Enlace de invitación copiado al portapapeles');
        }
    } catch (e) {
        console.error("Share failed", e);
    } finally {
        setIsSharing(false);
    }
  };

  useEffect(() => {
    if (gameState.victory && profile && !hasUpdatedRef.current) {
        hasUpdatedRef.current = true;
        const updateStats = async () => {
            const userDoc = doc(db, 'users', profile.uid);
            const globalDoc = doc(db, 'stats', 'global');
            
            const isWinner = gameState.victory === playerTeam;
            
            try {
                await updateDoc(userDoc, {
                    victories: increment(isWinner ? 1 : 0),
                    defeats: increment(isWinner ? 0 : 1),
                    totalGames: increment(1)
                });
            } catch (e) {
                handleFirestoreError(e, OperationType.WRITE, `users/${profile.uid}`);
            }

            if (isWinner) {
                try {
                    await setDoc(globalDoc, {
                        [playerTeam === Team.ARGENTINA ? 'argVictories' : 'ukVictories']: increment(1)
                    }, { merge: true });
                } catch (e) {
                    handleFirestoreError(e, OperationType.WRITE, 'stats/global');
                }
            }
        };
        updateStats();
    }
  }, [gameState.victory, playerTeam, profile]);

  const handleBaseClick = (id: string) => {
    const clickedBase = gameState.bases.find(b => b.id === id);
    if (!clickedBase || !gameState.started) return;

    if (selectedBaseId) {
      if (selectedBaseId === id) {
        setSelectedBaseId(null);
        soundManager.play(SOUNDS.BUBBLE, 0.4);
      } else {
        sendTroops(selectedBaseId, id, percentage);
        
        // Play launch sound based on base type
        const fromBase = gameState.bases.find(b => b.id === selectedBaseId);
        if (fromBase) {
            if (fromBase.type === 'airport') {
                soundManager.play(SOUNDS.PLANE, 0.5);
            } else if (fromBase.type === 'port') {
                soundManager.play(SOUNDS.SHIP, 0.5);
            } else {
                soundManager.play(SOUNDS.LAND, 0.5);
            }
        }
        
        setSelectedBaseId(null);
      }
    } else {
      if (clickedBase.team === playerTeam) {
        setSelectedBaseId(id);
        soundManager.play(SOUNDS.BUBBLE, 0.4);
      }
    }
  };

  return (
    <>
      {/* HUD Header */}
      <header className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-[1000] pointer-events-none">
        <div className="flex gap-4 pointer-events-auto">
          <div className="bg-slate-900/90 backdrop-blur-md border border-sky-500/30 p-4 rounded-xl shadow-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-950 rounded-lg flex items-center justify-center border border-sky-500/50 overflow-hidden">
              <div className="flex flex-col gap-0.5 w-10">
                {playerTeam === Team.ARGENTINA ? (
                    <img src="https://flagcdn.com/ar.svg" className="w-full h-auto shadow-sm" alt="ARG" />
                ) : (
                    <img src="https://flagcdn.com/gb.svg" className="w-full h-auto shadow-sm" alt="UK" />
                )}
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic text-sky-400">
                  {gameId ? t(lang, 'op_online') : t(lang, 'op_local')}
              </h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
                <p className="text-[10px] text-slate-400 font-mono tracking-widest">
                    {t(lang, 'mando')}: {playerTeam === Team.ARGENTINA ? t(lang, 'argentina') : t(lang, 'uk')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 p-3 rounded-lg flex gap-4 items-center">
            <div className="flex flex-col items-end">
                <span className="text-[9px] uppercase font-bold text-slate-500">Saldo de Tropas</span>
                <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-sky-400" />
                    <span className="text-lg font-mono font-bold">
                        {gameState.bases.filter(b => b.team === playerTeam).reduce((acc, b) => acc + b.units, 0)}
                    </span>
                </div>
            </div>
            <div className="w-px h-8 bg-slate-700" />
            <button onClick={onExit} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
              <LogOut className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Interactive Map */}
      <div className="absolute inset-0 z-0">
        <MapContainer 
            center={[-51.70, -59.30]} 
            zoom={8} 
            zoomControl={false}
            scrollWheelZoom={false}
            touchZoom={false}
            doubleClickZoom={false}
            dragging={false}
            className="w-full h-full grayscale-[0.4] brightness-[0.7]"
            style={{ background: '#020617' }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController 
            gameState={gameState} 
            selectedBaseId={selectedBaseId} 
            onBaseClick={handleBaseClick} 
            playerTeam={playerTeam}
          />
        </MapContainer>
      </div>

      {/* Mission Controller HUD */}
      {!gameState.started && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full bg-slate-900 border border-sky-950 p-8 rounded-2xl shadow-3xl space-y-6"
          >
            <div className="flex items-center gap-4">
               <Shield className="w-12 h-12 text-sky-400" />
               <div className="h-px flex-1 bg-gradient-to-r from-sky-400 to-transparent" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tighter italic">Briefing de Misión</h2>
            <p className="text-slate-400 text-sm leading-relaxed border-l-2 border-sky-500/30 pl-4">
              Esperando despliegue táctico. El mando {playerTeam === Team.ARGENTINA ? 'Argentino' : 'Británico'} tiene el control de las operaciones en su sector.
              Elimine toda presencia enemiga para asegurar la victoria.
            </p>
            <div className="flex flex-col gap-3">
               {!gameId ? (
                 <button 
                   onClick={startGame}
                   className="w-full py-4 bg-sky-500 hover:bg-sky-400 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
                 >
                   Iniciar Operación Solo
                 </button>
               ) : (
                 <div className="space-y-4 w-full">
                  <div className="w-full py-6 bg-slate-900 border border-white/5 text-sky-400 text-center font-black uppercase tracking-[0.3em] rounded-2xl flex flex-col items-center justify-center gap-4 shadow-2xl">
                     <div className="relative">
                        <Loader2 className="w-8 h-8 animate-spin opacity-50" />
                        <div className="absolute inset-0 bg-sky-500 blur-xl opacity-20 animate-pulse" />
                     </div>
                     <span className="text-[10px]">Escaneando frecuencias... Esperando Rival</span>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={shareGame}
                    disabled={isSharing}
                    className="w-full py-5 bg-white text-black font-black uppercase tracking-widest rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-sky-500/10"
                  >
                    <Share2 className="w-5 h-5" />
                    Desafiar a un Amigo
                  </motion.button>
                 </div>
               )}
               <button onClick={onExit} className="text-xs uppercase font-black tracking-widest text-slate-500 hover:text-slate-300">Abortar Misión</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Bottom Interface */}
      <footer className="absolute bottom-0 left-0 right-0 p-6 z-[1000] bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto space-y-4 pointer-events-auto">
          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/5 p-4 rounded-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">{t(lang, 'attack')}</span>
              </div>
              <span className="text-lg font-mono font-bold text-sky-400">{Math.round(percentage * 100)}%</span>
            </div>
            <input 
                type="range" 
                min="0.2" 
                max="1.0" 
                step="0.1" 
                value={percentage} 
                onChange={(e) => setPercentage(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        </div>
      </footer>

      {/* Victory Overlay */}
      <AnimatePresence>
        {gameState.victory && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/95 p-8 text-center"
          >
            <motion.div 
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="space-y-6"
            >
              <Trophy className={`w-32 h-32 mx-auto ${gameState.victory === playerTeam ? 'text-sky-400' : 'text-slate-500'}`} />
              <h2 className="text-6xl font-black uppercase tracking-tighter italic">
                {gameState.victory === playerTeam ? t(lang, 'victory') : t(lang, 'defeat')}
              </h2>
              <p className="text-slate-400 text-lg max-w-sm mx-auto font-medium">
                {gameState.victory === playerTeam 
                  ? (lang === 'es' ? 'La soberanía ha sido restablecida/mantenida bajo su mando. Misión cumplida.' : 'Sovereignty has been restored/maintained under your command. Mission accomplished.')
                  : (lang === 'es' ? 'Las fuerzas enemigas han prevalecido. Retirada táctica inmediata.' : 'Enemy forces have prevailed. Immediate tactical withdrawal.')}
              </p>
              <button 
                onClick={onExit}
                className="px-12 py-5 bg-sky-500 text-white font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-sky-500/40"
              >
                HQ
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {gameId && <Chat gameId={gameId} userTeam={playerTeam} />}
    </>
  );
}

function MapController({ gameState, selectedBaseId, onBaseClick, playerTeam }: { 
    gameState: any, 
    selectedBaseId: string | null,
    onBaseClick: (id: string) => void,
    playerTeam: Team
}) {
    const map = useMap();

    return (
        <>
            {gameState.bases.map((base: Base) => (
                <MilitaryBase 
                    key={base.id} 
                    base={base} 
                    isSelected={selectedBaseId === base.id}
                    onClick={() => onBaseClick(base.id)}
                    map={map}
                    playerTeam={playerTeam}
                />
            ))}
            <AnimatePresence>
                {gameState.troops.map((troop: TroopBatch) => (
                    <TroopMarker key={troop.id} troop={troop} map={map} />
                ))}
            </AnimatePresence>
        </>
    );
}

import { soundManager, SOUNDS } from './lib/sounds';

function MilitaryBase({ base, isSelected, onClick, map, playerTeam }: { base: Base, isSelected: boolean, onClick: () => void, map: L.Map, playerTeam: Team, key?: string }) {
    const [lastTeam, setLastTeam] = useState(base.team);
    const [lastCombatTime, setLastCombatTime] = useState(base.lastCombatTime);
    const [captureEffect, setCaptureEffect] = useState(false);

    useEffect(() => {
        if (base.team !== lastTeam) {
            setCaptureEffect(true);
            setLastTeam(base.team);
            soundManager.play(SOUNDS.VICTORY, 1.0);
            soundManager.play(SOUNDS.EXPLOSION, 0.6);
            const timer = setTimeout(() => setCaptureEffect(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [base.team, lastTeam]);

    useEffect(() => {
        if (base.lastCombatTime > lastCombatTime) {
            setLastCombatTime(base.lastCombatTime);
            // Only play arrival bubble if it wasn't a capture (which plays victory)
            if (base.team === lastTeam) {
                soundManager.play(SOUNDS.ARRIVAL, 0.3);
            }
        }
    }, [base.lastCombatTime, lastCombatTime, base.team, lastTeam]);

    const screenPos = map.latLngToContainerPoint(base.pos);
    const color = COLORS[base.team];
    const isUnderAttack = Date.now() - base.lastCombatTime < 500;

    useEffect(() => {
        if (isUnderAttack) {
            // Throttled combat sound
            const now = Date.now();
            if ((window as any).lastCombatSoundTime === undefined || now - (window as any).lastCombatSoundTime > 200) {
                soundManager.play(SOUNDS.COMBAT, 0.3);
                (window as any).lastCombatSoundTime = now;
            }
        }
    }, [isUnderAttack]);

    return (
        <div 
            className={`absolute z-[400] transition-transform duration-300 ${isUnderAttack ? 'animate-combat-shake' : ''}`}
            style={{ 
                left: screenPos.x, 
                top: screenPos.y, 
                transform: `translate(-50%, -50%) scale(${isSelected ? 1.2 : 1})`,
                pointerEvents: 'auto'
            }}
            onClick={onClick}
        >
            <div className="relative group cursor-pointer">
                {/* Combat/Capture Shockwave */}
                <AnimatePresence>
                    {(captureEffect || isUnderAttack) && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0.5 }}
                            animate={{ 
                                scale: [1, 2.5], 
                                opacity: [0.6, 0] 
                            }}
                            exit={{ opacity: 0 }}
                            transition={{ 
                                duration: isUnderAttack ? 0.6 : 1.5, 
                                repeat: isUnderAttack ? Infinity : 0,
                                ease: "easeOut" 
                            }}
                            className="absolute inset-0 rounded-full border-4 z-0 pointer-events-none"
                            style={{ borderColor: color, boxShadow: `0 0 30px ${color}` }}
                        />
                    )}
                </AnimatePresence>

                {isSelected && (
                    <div className="absolute -inset-4 rounded-full border border-sky-400 border-dashed animate-spin-slow opacity-60" />
                )}
                <motion.div 
                    animate={captureEffect ? { scale: [1, 1.2, 1], borderColor: [color, '#fff', color] } : {}}
                    transition={{ duration: 0.8 }}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 shadow-2xl transition-all relative overflow-hidden ${isUnderAttack ? 'brightness-150' : ''}`}
                    style={{ 
                        backgroundColor: `${color}20`,
                        borderColor: color,
                        boxShadow: `0 0 15px ${color}30`
                    }}
                >
                    <motion.div 
                        animate={{ height: `${(base.units / base.maxUnits) * 100}%` }}
                        className="absolute bottom-0 left-0 right-0 z-0 opacity-40 transition-all duration-1000"
                        style={{ backgroundColor: color }}
                    />
                    
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="mb-1">
                            {base.team === Team.ARGENTINA ? (
                                <img src="https://flagcdn.com/ar.svg" className="w-5 h-auto rounded-[1px] shadow-sm" alt="ARG" />
                            ) : base.team === Team.OPPONENT ? (
                                <img src="https://flagcdn.com/gb.svg" className="w-5 h-auto rounded-[1px] shadow-sm" alt="UK" />
                            ) : (
                                <Flag className="w-3 h-3" style={{ color }} />
                            )}
                        </div>
                        <div className="flex items-center gap-1 px-1 bg-black/20 rounded-full">
                            {base.type === 'airport' ? (
                                <Plane className="w-2.5 h-2.5 text-white/80" />
                            ) : base.type === 'port' ? (
                                <Ship className="w-2.5 h-2.5 text-white/80" />
                            ) : (
                                <Users className="w-2.5 h-2.5 text-white/80" />
                            )}
                            <span className="text-xs font-mono font-black text-white leading-none">{base.units}</span>
                        </div>
                    </div>
                </motion.div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/60 px-1.5 py-0.5 rounded border border-white/10">
                    <span className="text-[7px] text-slate-300 font-bold uppercase tracking-tight">
                        {base.type}-{base.id.split('-')[1]}
                    </span>
                </div>
            </div>
        </div>
    );
}

function TroopMarker({ troop, map }: { troop: TroopBatch, map: L.Map, key?: string }) {
    const fromPx = useMemo(() => map.latLngToContainerPoint(troop.fromPos), [troop.fromPos, map]);
    const toPx = useMemo(() => map.latLngToContainerPoint(troop.toPos), [troop.toPos, map]);

    const rotation = useMemo(() => {
        return Math.atan2(toPx.y - fromPx.y, toPx.x - fromPx.x) * 180 / Math.PI;
    }, [fromPx, toPx]);

    return (
        <motion.div
            initial={{ left: fromPx.x, top: fromPx.y, scale: 0 }}
            animate={{ left: toPx.x, top: toPx.y, scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: troop.duration / 1000, ease: "linear" }}
            className="absolute z-[500] pointer-events-none"
            style={{ transform: 'translate(-50%, -50%)' }}
        >
            <div className="relative">
                {/* Visual Effects - Behind the unit */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ transform: `rotate(${rotation}deg)` }}>
                    {troop.transportType === 'air' && (
                        <div className="flex items-center">
                            {/* Prominent Exhaust - Multi-layered */}
                            <motion.div 
                                animate={{ 
                                    opacity: [0.6, 0.9, 0.6],
                                    scaleY: [0.8, 1.2, 0.8],
                                    x: [-22, -28, -22]
                                }}
                                transition={{ repeat: Infinity, duration: 0.15 }}
                                className="w-16 h-4 bg-gradient-to-l from-orange-400 via-orange-600 to-transparent blur-[3px] rounded-full -translate-x-8"
                            />
                            {/* Hot Core */}
                            <motion.div 
                                animate={{ 
                                    opacity: [0.8, 1, 0.8],
                                    scaleY: [1, 1.3, 1],
                                }}
                                transition={{ repeat: Infinity, duration: 0.1 }}
                                className="absolute w-10 h-1.5 bg-white blur-[1px] rounded-full -translate-x-6 opacity-80"
                            />
                            {/* More Smoke trail puffs */}
                            {[0, 1, 2, 3, 4].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{ 
                                        opacity: [0, 0.4, 0],
                                        scale: [0.3, 2, 0.5],
                                        x: [-35 - (i * 12), -55 - (i * 18)],
                                        y: [(i % 2 === 0 ? 2 : -2), (i % 2 === 0 ? -4 : 4)]
                                    }}
                                    transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}
                                    className="absolute w-5 h-5 bg-slate-300/20 rounded-full blur-md"
                                />
                            ))}
                        </div>
                    )}
                    {troop.transportType === 'sea' && (
                        <div className="flex items-center">
                            {/* Sea Wake - Detailed V Shape */}
                            <div className="relative -translate-x-full">
                                <motion.div 
                                    animate={{ opacity: [0.1, 0.3, 0.1], skewY: [20, 25, 20] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-20 h-0.5 bg-white/40 blur-[1px] absolute top-[-6px] right-0 origin-right"
                                />
                                <motion.div 
                                    animate={{ opacity: [0.1, 0.3, 0.1], skewY: [-20, -25, -20] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="w-20 h-0.5 bg-white/40 blur-[1px] absolute top-[6px] right-0 origin-right"
                                />
                                <motion.div 
                                    animate={{ opacity: [0.1, 0.2, 0.1], scaleX: [0.8, 1.1, 0.8] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                    className="w-24 h-6 bg-gradient-to-r from-transparent to-white/10 blur-md"
                                />
                            </div>
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{ 
                                        opacity: [0, 0.5, 0],
                                        scale: [0.1, 1.2, 0.3],
                                        x: [-5 - (i * 8), -25 - (i * 12)],
                                        y: [Math.sin(i) * 5, Math.cos(i) * 8]
                                    }}
                                    transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.2 }}
                                    className="absolute w-2.5 h-2.5 bg-white/30 rounded-full blur-[0.5px]"
                                />
                            ))}
                        </div>
                    )}
                    {troop.transportType === 'land' && (
                        <div className="flex items-center">
                            {/* Dust Trail for Land */}
                            {[0, 1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    animate={{ 
                                        opacity: [0, 0.4, 0],
                                        scale: [0.5, 1.8, 1],
                                        x: [-10 - (i * 12), -25 - (i * 18)],
                                        y: [2, -2, 2]
                                    }}
                                    transition={{ repeat: Infinity, duration: 1.0, delay: i * 0.3 }}
                                    className="absolute w-4 h-4 bg-orange-900/20 rounded-full blur-sm"
                                />
                            ))}
                        </div>
                    )}
                </div>

                <motion.div 
                    style={{ rotate: rotation }}
                    className="w-8 h-8 rounded-full border border-white/40 shadow-[0_0_10px_rgba(255,255,255,0.3)] flex items-center justify-center p-1 bg-slate-900"
                >
                   <div className="absolute inset-0 rounded-full opacity-40" style={{ backgroundColor: COLORS[troop.team] }} />
                   <div className="relative z-10">
                       {troop.transportType === 'air' ? <Plane className="w-4 h-4 text-white" /> : (troop.transportType === 'sea' ? <Ship className="w-4 h-4 text-white" /> : <Users className="w-4 h-4 text-white" />)}
                   </div>
                </motion.div>

                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900/90 px-1.5 py-0.5 rounded-md flex items-center gap-1.5 text-[8px] font-black text-white border border-white/20 whitespace-nowrap shadow-xl backdrop-blur-sm">
                    {troop.transportType === 'air' ? <Plane className="w-3 h-3 text-sky-400" /> : (troop.transportType === 'sea' ? <Ship className="w-3 h-3 text-blue-400" /> : <Users className="w-3 h-3 text-orange-400" />)}
                    <span>{troop.count} {troop.transportType === 'air' ? 'SQUADRON' : (troop.transportType === 'sea' ? 'FLEET' : 'BATTALION')}</span>
                </div>
            </div>
        </motion.div>
    );
}
