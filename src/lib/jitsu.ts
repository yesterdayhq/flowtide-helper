const HAPPYLEAD_WEBHOOK = 'https://nwnjmxzipkvuhqhtskux.supabase.co/functions/v1/ingest-product-events';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bmpteHppcGt2dWhxaHRza3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczOTA5ODUsImV4cCI6MjA4Mjk2Njk4NX0.rVAh2MO3FU7fkHEDTj9JSefrKu3_8NIFKs3p-_-f2Fo';

export const jitsu = {
  track: (eventType: string, properties: any = {}) => {
    const user = (window as any).currentUser;

    fetch(HAPPYLEAD_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        account_id: 'aedfe5e8-4e92-4d2b-a109-b88c3876d415', // Your FlowTide test account
        event_type: eventType,
        user_email: user?.email || 'anonymous@flowtide.com',
        properties: properties,
        timestamp: new Date().toISOString(),
      }),
    }).catch(err => console.error('[Events] Track failed:', err));
  },
};