const JITSU_HOST = 'https://t.jitsu.com';
const JITSU_KEY = 'lujFLynGw9BEI1btwEL69eTrao4jl89T:DUCqpDO6o9FKBs98pcZdlWoseJ3NBX4i';

export const jitsu = {
  track: (event: string, properties: any = {}) => {
    const user = (window as any).currentUser;

    fetch(`${JITSU_HOST}/api/s/s2s/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Write-Key': JITSU_KEY,
      },
      body: JSON.stringify({
        event,
        properties,
        user_id: user?.email || 'anonymous',
        timestamp: new Date().toISOString(),
      }),
    }).catch(err => console.error('[Jitsu] Track failed:', err));
  },

  identify: (userId: string, traits: any = {}) => {
    fetch(`${JITSU_HOST}/api/s/s2s/identify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Write-Key': JITSU_KEY,
      },
      body: JSON.stringify({
        user_id: userId,
        traits,
        timestamp: new Date().toISOString(),
      }),
    }).catch(err => console.error('[Jitsu] Identify failed:', err));
  },
};