const HAPPYLEAD_WEBHOOK = 'https://nwnjmxzipkvuhqhtskux.supabase.co/functions/v1/product-events-testonly';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53bmpteHppcGt2dWhxaHRza3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczOTA5ODUsImV4cCI6MjA4Mjk2Njk4NX0.rVAh2MO3FU7fkHEDTj9JSefrKu3_8NIFKs3p-_-f2Fo';

const trackEvent = (eventType: string, properties: any = {}) => {
  const user = (window as any).currentUser;

  fetch(HAPPYLEAD_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      account_id: 'aedfe5e8-4e92-4d2b-a109-b88c3876d415',
      event_type: eventType,
      user_email: user?.email || 'anonymous@flowtide.com',
      properties: properties,
      timestamp: new Date().toISOString(),
    }),
  }).catch(err => console.error('[Events] Track failed:', err));
};

export const analytics = {
  stepAdded: (demoId: string, stepCount: number) => {
    trackEvent('demo_step_added', { demo_id: demoId, step_count: stepCount });
  },

  stepRemoved: (demoId: string, stepCount: number, stepId: string) => {
    trackEvent('demo_step_removed', { demo_id: demoId, step_count: stepCount, step_id: stepId });
  },

  stepImageChanged: (demoId: string, stepId: string) => {
    trackEvent('demo_step_image_changed', { demo_id: demoId, step_id: stepId });
  },

  annotationAdded: (demoId: string, stepId: string) => {
    trackEvent('demo_annotation_added', { demo_id: demoId, step_id: stepId });
  },

  annotationEdited: (demoId: string, stepId: string) => {
    trackEvent('demo_annotation_edited', { demo_id: demoId, step_id: stepId });
  },

  demoPreviewed: (demoId: string, stepCount: number) => {
    trackEvent('demo_previewed', { demo_id: demoId, step_count: stepCount });
  },

  demoPublished: (demoId: string, stepCount: number) => {
    trackEvent('demo_published', { demo_id: demoId, step_count: stepCount });

    if (stepCount >= 5) {
      trackEvent('demo_aha_moment', { demo_id: demoId, step_count: stepCount });
    }
  },

  demoShared: (demoId: string) => {
    trackEvent('demo_shared', { demo_id: demoId });
  },
};

// Legacy compatibility
export const jitsu = {
  track: trackEvent
};