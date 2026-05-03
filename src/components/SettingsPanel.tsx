import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User as UserIcon, 
  Settings, 
  Trophy, 
  Globe, 
  Users, 
  Fingerprint, 
  Check, 
  Edit2, 
  Copy,
  Hash,
  Flag,
  Medal
} from 'lucide-react';
import { useAuth, UserProfile } from './FirebaseProvider';
import { Team } from '../types';
import { t } from '../lib/i18n';
import { getUserRank, RANKS } from '../lib/ranks';

interface SettingsPanelProps {
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { profile, updateProfile, logout } = useAuth();
  const [editingField, setEditingField] = useState<'displayName' | 'handle' | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [copying, setCopying] = useState(false);

  if (!profile) return null;
  const lang = profile.language || 'es';

  const handleCopyId = () => {
    navigator.clipboard.writeText(profile.uid);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const startEditing = (field: 'displayName' | 'handle', value: string) => {
    setEditingField(field);
    setTempValue(value);
  };

  const saveEdit = async () => {
    if (!editingField) return;
    await updateProfile({ [editingField]: tempValue });
    setEditingField(null);
  };

  const changeLanguage = (langId: string) => {
    updateProfile({ language: langId });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[6000] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-3xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
              <Settings className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-widest text-white">{t(lang, 'profile_settings')}</h2>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">Terminal ID: {profile.uid.slice(0, 8)}...</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-8 space-y-10">
            
            {/* Identity Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Fingerprint className="w-4 h-4 text-sky-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t(lang, 'identity')}</h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* User ID (Read Only) */}
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t(lang, 'user_id')}</label>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-sky-300 truncate">{profile.uid}</span>
                    <button 
                      onClick={handleCopyId}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white"
                    >
                      {copying ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Handle */}
                <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t(lang, 'handle')}</label>
                  <div className="flex items-center justify-between gap-2">
                    {editingField === 'handle' ? (
                      <div className="flex items-center gap-1 w-full">
                        <span className="text-xs font-black text-sky-400">@</span>
                        <input 
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          autoFocus
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          className="bg-black/40 border border-sky-500/30 rounded-lg px-2 py-1 text-xs font-black text-white w-full outline-none"
                          placeholder="usuario_tatico"
                        />
                      </div>
                    ) : (
                      <span className="text-xs font-black text-sky-400 uppercase tracking-wider">{profile.handle ? `@${profile.handle}` : t(lang, 'sin_definir')}</span>
                    )}
                    <button 
                      onClick={() => editingField === 'handle' ? saveEdit() : startEditing('handle', profile.handle || '')}
                      className="p-2 hover:bg-white/10 rounded-lg transition-all text-sky-400"
                    >
                      {editingField === 'handle' ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t(lang, 'full_name')}</label>
                <div className="flex items-center justify-between gap-2">
                  {editingField === 'displayName' ? (
                    <input 
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      className="bg-black/40 border border-sky-500/30 rounded-lg px-4 py-2 text-sm font-bold text-white w-full outline-none"
                    />
                  ) : (
                    <span className="text-sm font-bold text-white">{profile.displayName}</span>
                  )}
                  <button 
                    onClick={() => editingField === 'displayName' ? saveEdit() : startEditing('displayName', profile.displayName)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-all text-sky-400"
                  >
                    {editingField === 'displayName' ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </section>

            {/* Military Rank Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-sky-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t(lang, 'rank_label')}</h3>
                </div>
              </div>
              
              {(() => {
                const currentRank = getUserRank(profile.victories);
                const nextRankIndex = RANKS.findIndex(r => r.key === currentRank.key) + 1;
                const nextRank = nextRankIndex < RANKS.length ? RANKS[nextRankIndex] : null;
                
                const progress = nextRank 
                    ? ((profile.victories - currentRank.minVictories) / (nextRank.minVictories - currentRank.minVictories)) * 100
                    : 100;

                return (
                  <div className="bg-slate-950/50 p-6 rounded-3xl border border-white/5 space-y-6">
                    <div className="flex items-center gap-6">
                        <div 
                            className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center shadow-lg transform rotate-3"
                            style={{ borderColor: currentRank.color, backgroundColor: `${currentRank.color}10`, boxShadow: `0 0 20px ${currentRank.color}20` }}
                        >
                            <Medal className="w-10 h-10" style={{ color: currentRank.color }} />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-2xl font-black italic tracking-tighter uppercase leading-tight" style={{ color: currentRank.color }}>
                                {t(lang, currentRank.key)}
                            </h4>
                            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                                {profile.victories} {t(lang, 'victories')}
                            </p>
                        </div>
                    </div>

                    {nextRank && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black uppercase text-slate-500 italic">Próximo Objetivo: {t(lang, nextRank.key)}</span>
                            <span className="text-[10px] font-mono text-sky-400 font-bold">{nextRank.minVictories - profile.victories} restantes</span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                className="h-full bg-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.5)]"
                            />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 text-center">
                  <div className="text-2xl font-black text-sky-400">{profile.victories}</div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">{t(lang, 'victories')}</div>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 text-center">
                  <div className="text-2xl font-black text-red-400">{profile.defeats}</div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">{t(lang, 'defeats')}</div>
                </div>
                <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 text-center">
                  <div className="text-2xl font-black text-white">{profile.totalGames}</div>
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-500">{t(lang, 'total')}</div>
                </div>
              </div>
            </section>

            {/* Military Allegiance */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-sky-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t(lang, 'allegiance')}</h3>
              </div>
              <div className="flex gap-4">
                {[
                  { id: Team.ARGENTINA, label: 'Fuerzas Argentinas', flag: 'https://flagcdn.com/ar.svg' },
                  { id: Team.OPPONENT, label: 'British Forces', flag: 'https://flagcdn.com/gb.svg' }
                ].map((t_team) => (
                  <button
                    key={t_team.id}
                    onClick={() => updateProfile({ favTeam: t_team.id })}
                    className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                      profile.favTeam === t_team.id 
                        ? 'bg-sky-500/10 border-sky-500' 
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <img src={t_team.flag} className="w-8 h-auto rounded-[1px] shadow-sm" alt="" />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                      profile.favTeam === t_team.id ? 'text-sky-400' : 'text-slate-500'
                    }`}>
                      {t_team.label}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Language Selection */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t(lang, 'comm_prefs')}</h3>
              </div>
              <div className="flex bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
                {[
                  { id: 'es', label: 'Español' },
                  { id: 'en', label: 'English' }
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => changeLanguage(l.id)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      profile.language === l.id 
                        ? 'bg-sky-500 text-white shadow-lg' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Friends list */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{t(lang, 'friends')}</h3>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">
                    {profile.friends?.length || 0} {t(lang, 'friends')}
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
          >
            {t(lang, 'close_terminal')}
          </button>
          <button 
             onClick={() => { logout(); onClose(); }}
             className="px-6 py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-red-500/20"
          >
            {t(lang, 'logout')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
