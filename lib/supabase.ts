const SUPABASE_URL = `https://atlhesebcfjcecmbmwuj.supabase.co/rest/v1`;
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bGhlc2ViY2ZqY2VjbWJtd3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDc0MTYsImV4cCI6MjA4NTAyMzQxNn0.hmiF7aWatQCGaJPuc2LzzF7z2IAxwoBy3fGlNacz2XQ';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

export const SupabaseSync = {
  async verifyIdentity(fullName: string, nodeId: string) {
    const cleanName = fullName.trim();
    const cleanNode = nodeId.trim();
    
    const query = `full_name=ilike.${encodeURIComponent(cleanName)}&node_id=ilike.${encodeURIComponent(cleanNode)}&select=*`;
    const res = await fetch(`${SUPABASE_URL}/uba_identities?${query}`, { headers });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Supabase Identity Handshake Error:', errorText);
      throw new Error('Cloud Identity Lookup Failed');
    }
    
    const data = await res.json();
    const identity = data[0] || null;

    if (identity && identity.role === 'facilitator') {
      const facRes = await fetch(`${SUPABASE_URL}/uba_facilitators?email=eq.${identity.email}&select=*`, { headers });
      if (facRes.ok) {
        const facData = await facRes.json();
        if (facData[0]) {
          return { ...identity, facilitator_detail: facData[0] };
        }
      }
    }

    return identity;
  },

  async fetchStaff(hubId: string) {
    const res = await fetch(`${SUPABASE_URL}/uba_facilitators?hub_id=eq.${hubId}&select=*`, { headers });
    if (!res.ok) throw new Error('Cloud Staff Registry Fetch Failed');
    return res.json();
  },

  async fetchPupils(hubId: string) {
    const res = await fetch(`${SUPABASE_URL}/uba_pupils?hub_id=eq.${hubId}&select=*`, { headers });
    if (!res.ok) throw new Error('Cloud Pupil Registry Fetch Failed');
    return res.json();
  },

  async fetchPersistence(nodeId: string, hubId: string) {
    const persistenceId = `daily_activity_${hubId}_${nodeId}`;
    const res = await fetch(`${SUPABASE_URL}/uba_persistence?id=eq.${persistenceId}&select=payload`, { headers });
    if (!res.ok) throw new Error('Cloud Persistence Retrieval Failed');
    const data = await res.json();
    return data[0]?.payload || null;
  },

  async pushGlobalState(nodeId: string, hubId: string, fullState: any) {
    const payload = {
      id: `daily_activity_${hubId}_${nodeId}`, 
      hub_id: hubId,
      payload: fullState,
      version_tag: 'v9.6.0',
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

  async registerSchool(schoolData: { 
    name: string, 
    nodeId: string, 
    email: string, 
    slogan?: string,
    hubId: string,
    originGate: string 
  }) {
    const identityPayload = {
      email: schoolData.email.trim().toLowerCase(),
      full_name: schoolData.name.trim().toUpperCase(),
      node_id: schoolData.nodeId.trim().toUpperCase(),
      hub_id: schoolData.hubId,
      role: schoolData.originGate === 'ADMIN' ? 'school_admin' : 'facilitator',
      merit_balance: 0,
      monetary_balance: 0
    };

    const idRes = await fetch(`${SUPABASE_URL}/uba_identities`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
      body: JSON.stringify(identityPayload)
    });

    if (!idRes.ok) throw new Error('Identity Creation Failed');

    if (schoolData.originGate === 'FACILITATOR') {
      const facPayload = {
        email: schoolData.email.trim().toLowerCase(),
        full_name: schoolData.name.trim().toUpperCase(),
        hub_id: schoolData.hubId,
        node_id: schoolData.nodeId.trim().toUpperCase(),
        teaching_category: 'BASIC_SUBJECT_LEVEL',
        merit_balance: 0,
        monetary_balance: 0
      };
      await fetch(`${SUPABASE_URL}/uba_facilitators`, {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify(facPayload)
      });
    }

    if (schoolData.originGate === 'ADMIN') {
        const persistenceId = `daily_activity_${schoolData.hubId}_${schoolData.nodeId}`;
        const initialPayload = {
            classWork: {}, homeWork: {}, projectWork: {}, criterionWork: {}, bookCountRecords: {},
            management: {
                settings: {
                    name: schoolData.name.toUpperCase(),
                    institutionalId: schoolData.nodeId.toUpperCase(),
                    hubId: schoolData.hubId,
                    slogan: schoolData.slogan || "Knowledge is Power",
                    currentTerm: "1ST TERM", currentYear: "2024/2025", activeMonth: "MONTH 1",
                    complianceThreshold: 0.85, poorPerformanceThreshold: 10, poorPerformanceFrequency: 3
                },
                staff: [{ id: schoolData.email, name: schoolData.name.toUpperCase(), role: 'school_admin', email: schoolData.email, uniqueCode: 'ADMIN-PIN' }],
                subjects: [], 
                mappings: [], 
                weeklyMappings: [], 
                curriculum: [], // Mandatory v9.6.0
                masterPupils: {}, 
                messages: [] // Mandatory v9.6.0
            }
        };

        await fetch(`${SUPABASE_URL}/uba_persistence`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({
              id: persistenceId,
              hub_id: schoolData.hubId,
              payload: initialPayload,
              version_tag: 'v9.6.0'
          })
        });
    }
    
    return { success: true };
  }
};