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
   * v9.5 Handshake Protocol: Verify Identity and fetch available node data.
   * Uses select=* to prevent hard errors if financial columns are not yet provisioned in the specific node.
   */
  async verifyIdentity(fullName: string, nodeId: string) {
    const cleanName = fullName.trim();
    const cleanNode = nodeId.trim();
    
    // Fixed: Using select=* to avoid "column does not exist" errors if schema is partially out of sync
    const query = `full_name=ilike.${encodeURIComponent(cleanName)}&node_id=ilike.${encodeURIComponent(cleanNode)}&select=*`;
    const res = await fetch(`${SUPABASE_URL}/uba_identities?${query}`, { headers });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Supabase Handshake Error:', errorText);
      throw new Error('Cloud Identity Lookup Failed');
    }
    
    const data = await res.json();
    return data[0] || null;
  },

  async fetchStaff(hubId: string) {
    // Fixed: Simplified selection string
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
  },

  /**
   * v9.5 Provisioning: Registers new school with explicit Identity Hub entry
   */
  async registerSchool(schoolData: { 
    name: string, 
    nodeId: string, 
    email: string, 
    slogan?: string,
    hubId: string,
    originGate: string 
  }) {
    // 1. Provision the primary Admin Identity in the uba_identities table
    const identityPayload = {
      email: schoolData.email.trim().toLowerCase(),
      full_name: schoolData.name.trim().toUpperCase(),
      node_id: schoolData.nodeId.trim().toUpperCase(),
      hub_id: schoolData.hubId,
      role: 'school_admin',
      teaching_category: 'ADMINISTRATOR',
      merit_balance: 0,
      monetary_balance: 0
    };

    const idRes = await fetch(`${SUPABASE_URL}/uba_identities`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(identityPayload)
    });

    if (!idRes.ok) {
      const err = await idRes.text();
      console.error('Identity Provisioning Error:', err);
      throw new Error('Identity Creation Failed');
    }

    // 2. Initialize the Institutional Persistence Shard
    const persistenceId = `daily_activity_${schoolData.hubId}_${schoolData.nodeId}`;
    const initialPayload = {
        classWork: {},
        homeWork: {},
        projectWork: {},
        criterionWork: {},
        bookCountRecords: {},
        management: {
            settings: {
                name: schoolData.name.toUpperCase(),
                institutionalId: schoolData.nodeId.toUpperCase(),
                hubId: schoolData.hubId,
                slogan: schoolData.slogan || "Knowledge is Power",
                currentTerm: "1ST TERM",
                currentYear: "2024/2025",
                activeMonth: "MONTH 1",
                complianceThreshold: 0.85,
                poorPerformanceThreshold: 10,
                poorPerformanceFrequency: 3
            },
            staff: [{ 
              id: schoolData.email, 
              name: schoolData.name.toUpperCase(), 
              role: 'school_admin', 
              category: 'ADMINISTRATOR', 
              email: schoolData.email,
              uniqueCode: Math.floor(100000 + Math.random() * 900000).toString()
            }],
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