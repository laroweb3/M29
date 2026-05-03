import { Team, Base, LatLng } from './types';

export const PRODUCTION_RATE = 1.25; 
export const SPEED_AIR = 0.0015;
export const SPEED_SEA = 0.0006;
export const SPEED_LAND = 0.00035;
export const UNIT_CAP_PER_LEVEL = 60;
export const MAX_LEVEL = 3;

export const MALVINAS_CENTER: LatLng = { lat: -51.79, lng: -59.52 };
export const MALVINAS_BOUNDS = {
  latMin: -52.3,
  latMax: -51.2,
  lngMin: -61.5,
  lngMax: -57.5
};

export const COLORS = {
  [Team.NEUTRAL]: '#9ca3af',
  [Team.ARGENTINA]: '#0ea5e9', // Sky blue
  [Team.OPPONENT]: '#475569', // Grayish blue / UK Slate
};

function getDist(p1: LatLng, p2: LatLng) {
  return Math.sqrt(Math.pow(p1.lat - p2.lat, 2) + Math.pow(p1.lng - p2.lng, 2));
}

export function generateRandomBases(count: number): Base[] {
  const bases: Base[] = [];
  // Ensure primary teams are handled first for better placement
  const mainTeams = [Team.ARGENTINA, Team.OPPONENT];
  const neutralTeams = Array(count - 2).fill(Team.NEUTRAL);
  const teams = [...mainTeams, ...neutralTeams];
  
  const islandCenters = [
    { lat: -51.48, lng: -59.81 }, // West
    { lat: -51.78, lng: -58.42 }, // East
    { lat: -51.25, lng: -59.35 }, // North
    { lat: -52.00, lng: -58.80 }  // South
  ];

  const MIN_DIST = 0.18; // Minimum distance to prevent overlaps
  const MIN_START_DIST = 1.2; // Larger separation for opposing forces

  for (let i = 0; i < count; i++) {
    const team = teams[i];
    let pos: LatLng = { lat: 0, lng: 0 };
    let attempts = 0;
    let isValid = false;

    while (!isValid && attempts < 100) {
      const center = islandCenters[Math.floor(Math.random() * islandCenters.length)];
      pos = {
        lat: center.lat + (Math.random() - 0.5) * 0.45,
        lng: center.lng + (Math.random() - 0.5) * 0.85
      };

      isValid = true;
      for (const b of bases) {
        const d = getDist(pos, b.pos);
        
        // Base overlap check
        if (d < MIN_DIST) {
          isValid = false;
          break;
        }

        // Opposing start distance check
        if ((team !== Team.NEUTRAL && b.team !== Team.NEUTRAL && b.team !== team)) {
          if (d < MIN_START_DIST) {
            isValid = false;
            break;
          }
        }
      }
      attempts++;
    }

    bases.push({
      id: `base-${i}`,
      pos,
      team,
      units: team === Team.NEUTRAL ? 5 + Math.floor(Math.random() * 12) : 25,
      maxUnits: UNIT_CAP_PER_LEVEL,
      lastProductionTime: Date.now(),
      level: 1,
      type: Math.random() > 0.7 ? (Math.random() > 0.5 ? 'airport' : 'port') : 'base',
      lastCombatTime: 0
    });
  }
  return bases;
}
