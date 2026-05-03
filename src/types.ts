export enum Team {
  NEUTRAL = 'NEUTRAL',
  ARGENTINA = 'ARGENTINA',
  OPPONENT = 'OPPONENT'
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Base {
  id: string;
  pos: LatLng;
  team: Team;
  units: number;
  maxUnits: number;
  lastProductionTime: number;
  level: number;
  type: 'base' | 'airport' | 'port';
  lastCombatTime: number;
}

export interface TroopBatch {
  id: string;
  fromId: string;
  toId: string;
  team: Team;
  count: number;
  startTime: number;
  duration: number;
  fromPos: LatLng;
  toPos: LatLng;
  transportType: 'air' | 'sea' | 'land';
}

export interface GameState {
  bases: Base[];
  troops: TroopBatch[];
  gameTime: number;
  victory: Team | null;
  started: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderTeam: Team;
  text: string;
  timestamp: any;
}
