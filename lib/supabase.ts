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
   * v8.0 Protocol: Verify Identity using Full Name and Node ID
   */
  async verifyIdentity(fullName: string, nodeId: string) {
    const res = await fetch(
      `${SUPABASE_URL}/uba_identities?full_name=eq.${encodeURIComponent(fullName)}&node_id=eq.${encodeURIComponent(nodeId)}&select=*`, 
      { headers }
    );
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
   * Pushes the full app state to the cloud shard with deduplication handling
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
  },

  /**
   * v8.1 Provisioning: Registers a new school node and its first admin identity
   */
  async registerSchool(schoolData: { 
    name: string, 
    nodeId: string, 
    email: string, 
    hubId: string,
    originGate: string 
  }) {
    // 1. Provision the primary Admin Identity using Name/ID protocol
    const identityPayload = {
      email: schoolData.email,
      full_name: schoolData.name, // Use the actual school name as the identity label
      node_id: schoolData.nodeId,
      hub_id: schoolData.hubId,
      role: 'school_admin',
      teaching_category: 'ADMINISTRATOR'
    };

    const idRes = await fetch(`${SUPABASE_URL}/uba_identities`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(identityPayload)
    });

    if (!idRes.ok) throw new Error('Identity Creation Failed');

    // 2. Initialize the Persistence Shard for the Node
    const persistenceId = `daily_activity_${schoolData.hubId}_${schoolData.nodeId}`;
    const initialPayload = {
        classWork: {},
        homeWork: {},
        projectWork: {},
        criterionWork: {},
        bookCountRecords: {},
        management: {
            settings: {
                name: schoolData.name,
                institutionalId: schoolData.nodeId,
                hubId: schoolData.hubId,
                currentTerm: "1ST TERM",
                currentYear: "2024/2025",
                activeMonth: "MONTH 1",
                complianceThreshold: 0.85,
                poorPerformanceThreshold: 10,
                poorPerformanceFrequency: 3
            },
            staff: [{ id: schoolData.email, name: schoolData.name, role: 'school_admin', category: 'ADMINISTRATOR', email: schoolData.email }],
            subjects: [],
            mappings: [],
            weeklyMappings: [],
            masterPupils: {},
            messages: []
        }
    };

    const pRes = await fetch(`${SUPABASE_URL}/uba_persistence`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify({
          id: persistenceId,
          hub_id: schoolData.hubId,
          payload: initialPayload
      })
    });

    if (!pRes.ok) throw new Error('Persistence Shard Initialization Failed');
    
    return { success: true };
  }
};