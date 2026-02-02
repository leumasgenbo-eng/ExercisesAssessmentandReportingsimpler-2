const SUPABASE_URL = `https://atlhesebcfjcecmbmwuj.supabase.co/rest/v1`;
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bGhlc2ViY2ZqY2VjbWJtd3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDc0MTYsImV4cCI6MjA4NTAyMzQxNn0.hmiF7aWatQCGaJPuc2LzzF7z2IAxwoBy3fGlNacz2XQ';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

export const SupabaseSync = {
  /**
   * v7.9 Protocol: Verify a PIN (unique_code) and return identity metadata
   */
  async verifyCredential(pin: string) {
    const res = await fetch(`${SUPABASE_URL}/uba_identities?unique_code=eq.${pin}&select=*`, { headers });
    if (!res.ok) throw new Error('Cloud Handshake Error');
    const data = await res.json();
    return data[0] || null;
  },

  async fetchStaff(hubId: string) {
    const res = await fetch(`${SUPABASE_URL}/uba_identities?hub_id=eq.${hubId}&select=*`, { headers });
    if (!res.ok) throw new Error('Cloud Identity Fetch Failed');
    return res.json();
  },

  async fetchPupils(hubId: string) {
    const res = await fetch(`${SUPABASE_URL}/uba_pupils?hub_id=eq.${hubId}&select=*`, { headers });
    if (!res.ok) throw new Error('Cloud Pupil Registry Fetch Failed');
    return res.json();
  },

  /**
   * Retrieves the institutional state blob (Persistence Shard)
   */
  async fetchPersistence(nodeId: string, hubId: string) {
    const persistenceId = `daily_activity_${hubId}_${nodeId}`;
    const res = await fetch(`${SUPABASE_URL}/uba_persistence?id=eq.${persistenceId}&select=payload`, { headers });
    if (!res.ok) throw new Error('Cloud Persistence Retrieval Failed');
    const data = await res.json();
    return data[0]?.payload || null;
  },

  /**
   * Pushes the full app state to the cloud shard
   */
  async pushGlobalState(nodeId: string, hubId: string, fullState: any) {
    const payload = {
      id: `daily_activity_${hubId}_${nodeId}`, 
      hub_id: hubId,
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