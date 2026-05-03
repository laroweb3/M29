
export const SOUNDS = {
  EXPLOSION: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  COMBAT: 'https://assets.mixkit.co/active_storage/sfx/1653/1653-preview.mp3',
  PLANE: 'https://assets.mixkit.co/active_storage/sfx/2047/2047-preview.mp3',    // Jet pass-by
  SHIP: 'https://assets.mixkit.co/active_storage/sfx/2049/2049-preview.mp3',     // Deep ship/sonar
  LAND: 'https://assets.mixkit.co/active_storage/sfx/154/154-preview.mp3',      // Heavy engine/steps
  VICTORY: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  BUBBLE: 'https://assets.mixkit.co/active_storage/sfx/1121/1121-preview.mp3',   // Bubble/UI Click (Selector)
  ARRIVAL: 'https://assets.mixkit.co/active_storage/sfx/1120/1120-preview.mp3',  // Different bubble (Arrival)
  LAUNCH: 'https://assets.mixkit.co/active_storage/sfx/1460/1460-preview.mp3',
};

class SoundManager {
  private static instance: SoundManager;
  private audioCache: Map<string, HTMLAudioElement[]> = new Map();
  private muted: boolean = false;
  private POOL_SIZE = 5;

  private constructor() {}

  static getInstance() {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  play(soundUrl: string, volume: number = 0.5) {
    if (this.muted) return;

    if (!this.audioCache.has(soundUrl)) {
      this.audioCache.set(soundUrl, []);
    }

    const pool = this.audioCache.get(soundUrl)!;
    let audio = pool.find(a => a.paused);

    if (!audio) {
      if (pool.length < this.POOL_SIZE) {
        audio = new Audio(soundUrl);
        pool.push(audio);
      } else {
        // Reuse the oldest one if pool is full
        audio = pool[0];
        audio.currentTime = 0;
      }
    }

    audio.volume = volume;
    audio.play().catch(e => {
       // Autoplay policies usually block this until user interacts
       // console.warn("Audio playback failed", e);
    });
  }
}

export const soundManager = SoundManager.getInstance();
