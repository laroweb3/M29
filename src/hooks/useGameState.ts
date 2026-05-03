import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Team, Base, TroopBatch } from '../types';
import { PRODUCTION_RATE, SPEED_AIR, SPEED_SEA, SPEED_LAND, generateRandomBases } from '../constants';
import { db, doc, onSnapshot, updateDoc } from '../lib/firebase';

export function useGameState(gameId?: string, playerTeam: Team = Team.ARGENTINA) {
  const [gameState, setGameState] = useState<GameState>({
    bases: generateRandomBases(12),
    troops: [],
    gameTime: 0,
    victory: null,
    started: !gameId // Auto start if not multiplayer
  });

  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(Date.now());
  const stateRef = useRef(gameState);
  stateRef.current = gameState;

  // Real-time synchronization
  useEffect(() => {
    if (!gameId) return;
    const unsub = onSnapshot(doc(db, 'games', gameId), (snap) => {
      if (!snap.exists()) {
        // Game was deleted by host
        window.location.href = window.location.origin + window.location.pathname;
        return;
      }
      const data = snap.data();
      if (data && data.gameState) {
        setGameState(data.gameState);
      }
    });
    return () => unsub();
  }, [gameId]);

  const updateRemoteState = useCallback(async (newState: GameState) => {
    if (!gameId) return;
    try {
      await updateDoc(doc(db, 'games', gameId), {
        gameState: newState,
        lastUpdatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Sync error", e);
    }
  }, [gameId]);

  const startGame = useCallback(() => {
    const newState = { ...stateRef.current, started: true };
    setGameState(newState);
    if (gameId) updateRemoteState(newState);
    lastTimeRef.current = Date.now();
  }, [gameId, updateRemoteState]);

  const sendTroops = useCallback((fromId: string, toId: string, percentage: number = 0.5) => {
    const prev = stateRef.current;
    const fromBase = prev.bases.find(b => b.id === fromId);
    const toBase = prev.bases.find(b => b.id === toId);
    if (!fromBase || !toBase || fromId === toId) return;
    if (fromBase.team !== playerTeam) return; // Only allow player to move their own troops

    const count = Math.floor(fromBase.units * percentage);
    if (count <= 0) return;

    const dist = Math.sqrt(
      Math.pow(toBase.pos.lat - fromBase.pos.lat, 2) + 
      Math.pow(toBase.pos.lng - fromBase.pos.lng, 2)
    );
    const transportType = fromBase.type === 'airport' ? 'air' : (fromBase.type === 'port' ? 'sea' : 'land');
    const speed = transportType === 'air' ? SPEED_AIR : (transportType === 'sea' ? SPEED_SEA : SPEED_LAND);
    const duration = (dist / speed) * 10;

    const newBatch: TroopBatch = {
      id: Math.random().toString(36).substr(2, 9),
      fromId,
      toId,
      team: fromBase.team,
      count,
      startTime: Date.now(),
      duration,
      fromPos: fromBase.pos,
      toPos: toBase.pos,
      transportType
    };

    const nextState = {
      ...prev,
      bases: prev.bases.map(b => b.id === fromId ? { ...b, units: b.units - count } : b),
      troops: [...prev.troops, newBatch]
    };

    setGameState(nextState);
    if (gameId) updateRemoteState(nextState);
  }, [playerTeam, gameId, updateRemoteState]);

  const animate = useCallback(() => {
    const now = Date.now();
    const deltaTime = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Only simulate locally if not multiplayer OR if you are the "host" 
    // In this simplified version, let's allow both to simulate production locally 
    // but collisions and arrivals are tricky.
    // Better: If multiplayer, the game document tracks the timestamp of last baseline.
    
    setGameState(prev => {
      if (!prev.started || prev.victory) return prev;

      // 1. Production
      let newBases = prev.bases.map(base => {
        if (base.team === Team.NEUTRAL) return base;
        const elapsed = now - base.lastProductionTime;
        if (elapsed > 1000) {
          const produced = Math.floor(Math.floor(elapsed / 1000) * PRODUCTION_RATE * base.level);
          return {
            ...base,
            units: Math.min(Math.floor(base.units + produced), base.maxUnits),
            lastProductionTime: now
          };
        }
        return base;
      });

      // 2. Troop Movement & Arrival
      const newTroops: TroopBatch[] = [];
      const arrivals: { toId: string, team: Team, count: number }[] = [];

      prev.troops.forEach(troop => {
        if (now - troop.startTime >= troop.duration) {
          arrivals.push({ toId: troop.toId, team: troop.team, count: troop.count });
        } else {
          newTroops.push(troop);
        }
      });

      // 3. Resolve Arrivals
      arrivals.forEach(arrival => {
        newBases = newBases.map(base => {
          if (base.id === arrival.toId) {
            if (base.team === arrival.team) {
              return { 
                ...base, 
                units: Math.min(base.units + arrival.count, base.maxUnits),
                lastCombatTime: now 
              };
            } else {
              const remaining = base.units - arrival.count;
              if (remaining < 0) {
                return {
                  ...base,
                  team: arrival.team,
                  units: Math.abs(remaining),
                  lastProductionTime: now,
                  lastCombatTime: now
                };
              } else {
                return { 
                  ...base, 
                  units: remaining,
                  lastCombatTime: now
                };
              }
            }
          }
          return base;
        });
      });

      // 4. Check Victory
      const teamsAlive = new Set(newBases.filter(b => b.team !== Team.NEUTRAL).map(b => b.team));
      let victory = prev.victory;
      if (teamsAlive.size === 1) {
        victory = Array.from(teamsAlive)[0];
      }

      const nextState = {
        ...prev,
        bases: newBases,
        troops: newTroops,
        gameTime: prev.gameTime + deltaTime,
        victory
      };

      return nextState;
    });

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  // AI Logic (Only if not multiplayer)
  useEffect(() => {
    if (gameId) return;
    
    const aiInterval = setInterval(() => {
      setGameState(prev => {
        if (!prev.started || prev.victory) return prev;
        
        const aiBases = prev.bases.filter(b => b.team === Team.OPPONENT);
        if (aiBases.length === 0) return prev;

        const source = aiBases[Math.floor(Math.random() * aiBases.length)];
        if (source.units < 15) return prev;

        const targets = prev.bases.filter(b => b.team !== Team.OPPONENT);
        if (targets.length === 0) return prev;

        const target = targets.reduce((p, c) => c.units < p.units ? c : p);
        
        setTimeout(() => {
            // Simplified AI action - doesn't use the standard sendTroops to avoid playerTeam check
            setGameState(curr => {
                const f = curr.bases.find(b => b.id === source.id);
                if (!f || f.team !== Team.OPPONENT) return curr;
                const c = Math.floor(f.units * 0.6);
                
                const d = Math.sqrt(
                    Math.pow(target.pos.lat - f.pos.lat, 2) + 
                    Math.pow(target.pos.lng - f.pos.lng, 2)
                );
                const transportType = f.type === 'airport' ? 'air' : (f.type === 'port' ? 'sea' : 'land');
                const speed = transportType === 'air' ? SPEED_AIR : (transportType === 'sea' ? SPEED_SEA : SPEED_LAND);
                const dur = (d / speed) * 10;

                const nb: TroopBatch = {
                    id: Math.random().toString(36).substr(2, 9),
                    fromId: source.id,
                    toId: target.id,
                    team: Team.OPPONENT,
                    count: c,
                    startTime: Date.now(),
                    duration: dur,
                    fromPos: f.pos,
                    toPos: target.pos,
                    transportType
                };

                return {
                    ...curr,
                    bases: curr.bases.map(b => b.id === source.id ? { ...b, units: b.units - c } : b),
                    troops: [...curr.troops, nb]
                };
            });
        }, 1);
        
        return prev;
      });
    }, 4500);

    return () => clearInterval(aiInterval);
  }, [gameId]); // sendTroops not needed as dependency using direct setter

  return { 
    gameState, 
    startGame, 
    sendTroops, 
    restart: () => window.location.reload() 
  };
}
