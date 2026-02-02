const SUPABASE_PROJECT_ID = 'zokbowglwohpfqmjnemc';
const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/rest/v1`;
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpva2Jvd2dsd29ocGZxbWpuZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5NzAyOTEsImV4cCI6MjA4NDU0NjI5MX0.FA-TC3fnHAipudO8X-jJ7iljkwxn9L_g-tuXd8x4_Yo';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

export const SupabaseSync = {
  /**
   * Fetches staff identities with Teaching Categories.
   * Differentiates Basic-Subject, Daycare, and KG staff.
   */
  async fetchStaff() {
    const res = await fetch(`${SUPABASE_URL}/uba_identities?select=*`, { headers });
    if (!res.ok) throw new Error('Cloud Identity Fetch Failed');
    return res.json();
  },

  /**
   * Fetches pupil records.
   * Handles Basic 9 Shared IDs and Creche-Basic 8 Local Codes.
   */
  async fetchPupils() {
    const res = await fetch(`${SUPABASE_URL}/uba_pupils?select=*`, { headers });
    if (!res.ok) throw new Error('Cloud Pupil Registry Fetch Failed');
    return res.json();
  },

  /**
   * Persistence logic for DAILY ACTIVITIES JSON state.
   */
  async pushGlobalState(nodeId: string, fullState: any) {
    const payload = {
      id: `daily_activity_${nodeId}`, // Specific key for Activity App
      hub_id: 'SMA-HQ',
      payload: fullState,
      last_updated: new Date().toISOString()
    };
    
    const res = await fetch(`${SUPABASE_URL}/uba_persistence`, {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error('Cloud Activity State Push Failed');
    return res.json();
  }
};