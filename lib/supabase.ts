
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
   * Fetches the entire staff directory from the cloud
   */
  async fetchStaff() {
    const res = await fetch(`${SUPABASE_URL}/staff?select=*`, { headers });
    if (!res.ok) throw new Error('Cloud Staff Fetch Failed');
    return res.json();
  },

  /**
   * Fetches the entire pupil registry from the cloud
   */
  async fetchPupils() {
    const res = await fetch(`${SUPABASE_URL}/pupils?select=*`, { headers });
    if (!res.ok) throw new Error('Cloud Pupil Fetch Failed');
    return res.json();
  },

  /**
   * Saves the entire SSMAP state to a master record in the cloud
   */
  async pushGlobalState(nodeId: string, fullState: any) {
    // We use upsert on the node_id
    const payload = {
      node_id: nodeId,
      state_json: fullState,
      last_sync: new Date().toISOString()
    };
    
    const res = await fetch(`${SUPABASE_URL}/app_state`, {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error('Cloud Sync Push Failed');
    return res.json();
  },

  /**
   * Pulls the last saved global state for this node
   */
  async pullGlobalState(nodeId: string) {
    const res = await fetch(`${SUPABASE_URL}/app_state?node_id=eq.${nodeId}&select=*`, { headers });
    if (!res.ok) throw new Error('Cloud Sync Pull Failed');
    const data = await res.json();
    return data[0]?.state_json || null;
  }
};
