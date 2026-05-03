import { TRANSLATIONS } from './i18n';

export type RankKey = 
  | 'rank_recruit' 
  | 'rank_soldier' 
  | 'rank_corporal' 
  | 'rank_sergeant' 
  | 'rank_lieutenant' 
  | 'rank_captain' 
  | 'rank_general' 
  | 'rank_hero';

export interface RankInfo {
  key: RankKey;
  minVictories: number;
  color: string;
}

export const RANKS: RankInfo[] = [
  { key: 'rank_recruit', minVictories: 0, color: '#94a3b8' }, // slate-400
  { key: 'rank_soldier', minVictories: 5, color: '#4ade80' }, // green-400
  { key: 'rank_corporal', minVictories: 15, color: '#22d3ee' }, // cyan-400
  { key: 'rank_sergeant', minVictories: 30, color: '#38bdf8' }, // sky-400
  { key: 'rank_lieutenant', minVictories: 60, color: '#818cf8' }, // indigo-400
  { key: 'rank_captain', minVictories: 120, color: '#c084fc' }, // purple-400
  { key: 'rank_general', minVictories: 250, color: '#fbbf24' }, // amber-400
  { key: 'rank_hero', minVictories: 500, color: '#f87171' }, // red-400
];

export function getUserRank(victories: number = 0): RankInfo {
  const sortedRanks = [...RANKS].sort((a, b) => b.minVictories - a.minVictories);
  return sortedRanks.find(r => victories >= r.minVictories) || RANKS[0];
}
