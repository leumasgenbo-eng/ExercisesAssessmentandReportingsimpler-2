import React, { useState } from 'react';
import { ManagementState, UserSession, RegisteredSchool, AppState, MasterPupilEntry } from '../../types';
import { SupabaseSync } from '../../lib/supabase';

interface IdentityGatewayProps {
  management: ManagementState;
  onAuthenticate: (session: UserSession, hydratedState?: AppState) => void;
  onSuperAdminTrigger: () => void;
  onRegisterSchool: (school: RegisteredSchool) => void;
  isSuperAdminAuth: boolean;
  isGeneratingToken: boolean;
}

type GateType = 'FACILITATOR' | 'ADMIN' | 'MASTER' | 'PUPIL';

const IdentityGateway: React.FC<IdentityGatewayProps> = ({ 
  management, 
  onAuthenticate, 
  onSuperAdminTrigger, 
  onRegisterSchool,
  isSuperAdminAuth, 
  isGeneratingToken 
}) => {
  const [gate, setGate] = useState<GateType>('FACILITATOR');
  const [view, setView] = useState<'GATES' | 'FORM' | 'REGISTER' | 'HANDSHAKE' | 'SUCCESS'>('GATES');
  
  // Dual-Factor Handshake State
  const [inputName, setInputName] = useState('');
  const [inputNodeId, setInputNodeId] = useState('');
  
  const [syncStatus, setSyncStatus] = useState('');
  const [error, setError] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [lastCredentials, setLastCredentials] = useState<{ nodeId: string, name: string } | null>(null);

  const initiateHandshake = async (session: UserSession) => {
    setView('HANDSHAKE');
    setSyncStatus('Establishing Secure Link...');
    
    try {
      setSyncStatus(`Syncing Institutional Node: ${session.nodeId}...`);
      const hydratedPayload = await SupabaseSync.fetchPersistence(session.nodeId, session.hubId || 'SMA-HQ');
      
      setSyncStatus('Reconstituting Global Roster...');
      const remotePupils = await SupabaseSync.fetchPupils(session.hubId || 'SMA-HQ');
      
      const master: Record<string, MasterPupilEntry[]> = {};
      remotePupils.forEach((p: any) => {
        if (!master[p.class_name]) master[p.class_name] = [];
        master[p.class_name].push({ 
          name: p.name, 
          gender: p.gender as any, 
          studentId: p.student_id, 
          isJhsLevel: !!p.is_jhs_level 
        });
      });

      let finalState: AppState | undefined = hydratedPayload;
      if (finalState && finalState.management) {
        finalState.management.masterPupils = master;
      }

      setSyncStatus('Handshake Complete. Welcome.');
      setTimeout(() => {
        onAuthenticate(session, finalState);
      }, 1000);

    } catch (err) {
      console.error(err);
      setError('Handshake Rejected: The node registry could not be reached.');
      setView('GATES');
    }
  };

  const handleRegisterNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setView('HANDSHAKE');
    setSyncStatus('Provisioning Identity Matrix...');

    const prefix = regName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
    const nodeId = `${prefix}-UB-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await SupabaseSync.registerSchool({
        name: regName.toUpperCase(),
        nodeId,
        email: regEmail,
        hubId: 'SMA-HQ',
        originGate: gate
      });

      setLastCredentials({ nodeId, name: regName.toUpperCase() });
      setView('SUCCESS');
    } catch (err) {
      setError('Registration Collision: This email or name is already provisioned.');
      setView('REGISTER');
    }
  };

  const downloadKeycard = () => {
    if (!lastCredentials) return;
    const content = `UNITED BAYLOR ACADEMY: SECURE ACCESS KEYCARD\n\nREQUIRED FOR HANDSHAKE:\n----------------------------\nIDENTITY LABEL: ${lastCredentials.name}\nINSTITUTIONAL NODE ID: ${lastCredentials.nodeId}\n----------------------------\nGATE USED: ${gate}\nTIMESTAMP: ${new Date().toLocaleString()}\n\nPROTOCOL: Store this file offline. Use these exact details to perform cloud handshakes.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CREDENTIALS_${lastCredentials.nodeId}.txt`;
    link.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Master Key Override
    if (gate === 'MASTER' && inputNodeId === 'UBA-HQ-MASTER-2025') {
      initiateHandshake({ role: 'super_admin', nodeName: 'GLOBAL MASTER', nodeId: 'MASTER-NODE-01', hubId: 'SMA-HQ' });
      return;
    }

    if (gate === 'PUPIL') {
        initiateHandshake({ 
          role: 'pupil', 
          nodeName: management.settings.name, 
          nodeId: management.settings.institutionalId, 
          hubId: management.settings.hubId,
          pupilId: inputNodeId 
        });
        return;
    }

    setSyncStatus('Performing Cloud Handshake...');
    setView('HANDSHAKE');
    try {
        const identity = await SupabaseSync.verifyIdentity(inputName.toUpperCase(), inputNodeId.toUpperCase());
        
        if (!identity) {
            setError('Handshake Refused: Identity not found on the matrix.');
            setView('FORM');
            return;
        }

        if (gate === 'ADMIN' && identity.role !== 'school_admin' && identity.role !== 'super_admin') {
            setError('Authorization Gap: Administrative level clearance required.');
            setView('FORM');
            return;
        }

        initiateHandshake({
            role: identity.role,
            nodeName: identity.node_id,
            nodeId: identity.node_id,
            hubId: identity.hub_id,
            facilitatorId: identity.email,
            facilitatorName: identity.full_name,
            facilitatorCategory: identity.teaching_category
        });

    } catch (err) {
        setError('Connection Latency: Handshake timeout.');
        setView('FORM');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950 overflow-y-auto">
       <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[800px] h-[800px] bg-sky-600/20 rounded-full blur-[150px]"></div>
       </div>

       <div className="bg-white rounded-[4rem] p-10 md:p-20 w-full max-w-2xl shadow-2xl relative animate-in zoom-in-95">
          {view === 'GATES' ? (
            <div className="space-y-12">
               <div className="text-center">
                  <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-8 shadow-2xl">🏛️</div>
                  <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-4">SSMAP Identity Hub</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Gate Handshake Selection</p>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => { setGate('FACILITATOR'); setView('FORM'); }} className="group p-8 rounded-[2.5rem] bg-slate-50 border-2 border-transparent hover:border-indigo-600 hover:bg-white transition-all flex items-center justify-between shadow-sm">
                     <div className="text-left">
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Gate Alpha</span>
                        <h3 className="text-xl font-black text-slate-900 uppercase">Facilitator Hub</h3>
                     </div>
                     <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">👨‍🏫</div>
                  </button>

                  <button onClick={() => { setGate('ADMIN'); setView('FORM'); }} className="group p-8 rounded-[2.5rem] bg-slate-50 border-2 border-transparent hover:border-sky-600 hover:bg-white transition-all flex items-center justify-between shadow-sm">
                     <div className="text-left">
                        <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest block mb-1">Gate Beta</span>
                        <h3 className="text-xl font-black text-slate-900 uppercase">Institutional Admin</h3>
                     </div>
                     <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl group-hover:bg-sky-600 group-hover:text-white transition-all">🔑</div>
                  </button>

                  <button onClick={() => { setGate('PUPIL'); setView('FORM'); }} className="group p-8 rounded-[2.5rem] bg-slate-50 border-2 border-transparent hover:border-emerald-600 hover:bg-white transition-all flex items-center justify-between shadow-sm">
                     <div className="text-left">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Gate Delta</span>
                        <h3 className="text-xl font-black text-slate-900 uppercase">Pupil Terminal</h3>
                     </div>
                     <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">🎓</div>
                  </button>
               </div>
               
               <div className="text-center flex flex-col items-center gap-4">
                  <button onClick={() => setView('REGISTER')} className="text-[10px] font-black uppercase text-indigo-600 hover:underline tracking-[0.2em]">Provision New School Node</button>
                  <button onClick={() => { setGate('MASTER'); setView('FORM'); }} className="w-4 h-4 text-slate-100 opacity-5 hover:opacity-100 transition-opacity">.</button>
               </div>
            </div>
          ) : view === 'HANDSHAKE' ? (
            <div className="text-center py-20 animate-in fade-in">
               <div className="relative w-32 h-32 mx-auto mb-12">
                  <div className="absolute inset-0 border-8 border-indigo-50 rounded-full"></div>
                  <div className="absolute inset-0 border-8 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-4xl">🛰️</div>
               </div>
               <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Cloud Synchronizing</h3>
               <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.4em] animate-pulse">{syncStatus}</p>
            </div>
          ) : view === 'FORM' ? (
            <form onSubmit={handleSubmit} className="space-y-8 animate-in slide-in-from-bottom-4">
               <div className="flex items-center gap-6 mb-12">
                  <button type="button" onClick={() => setView('GATES')} className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center text-xl hover:bg-slate-100 transition-colors">←</button>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">{gate} ENTRY</h3>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">v8.1 Cloud Key Exchange</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Authorized Full Name</label>
                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl font-black text-slate-950 uppercase text-sm outline-none focus:border-indigo-600 transition-all shadow-inner" placeholder="E.G. UNITED BAYLOR ACADEMY" value={inputName} onChange={(e) => setInputName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Institutional Node ID</label>
                    <input type="password" className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl font-black text-slate-950 uppercase text-center tracking-[0.3em] text-lg outline-none focus:border-indigo-600 transition-all shadow-inner" placeholder="••••-UB-••••" value={inputNodeId} onChange={(e) => setInputNodeId(e.target.value)} required />
                  </div>
               </div>

               {error && <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center"><p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{error}</p></div>}
               
               <button type="submit" className="w-full bg-slate-950 text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-[1.02] transition-all">Authorize Cloud Handshake</button>
            </form>
          ) : view === 'REGISTER' ? (
            <form onSubmit={handleRegisterNode} className="space-y-10 animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-6">
                  <button type="button" onClick={() => setView('GATES')} className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center text-xl hover:bg-slate-100 transition-colors">←</button>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">New Node Setup</h3>
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-2">Initialize Institutional Shard</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Official School Name (Used as Handshake ID)</label>
                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black uppercase text-sm outline-none focus:border-indigo-500" placeholder="e.g. UNITED BAYLOR ACADEMY" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Admin Email</label>
                    <input type="email" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-sm outline-none focus:border-indigo-500" placeholder="admin@school.edu" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                  </div>
               </div>

               {error && <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center"><p className="text-[10px] font-black text-rose-600 uppercase">{error}</p></div>}

               <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-indigo-700 transition-all">Provision Institutional Core</button>
            </form>
          ) : view === 'SUCCESS' && lastCredentials && (
            <div className="text-center space-y-12 animate-in zoom-in-95">
               <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-5xl mx-auto shadow-xl">✓</div>
               <div>
                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-4">Node Activated</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest max-w-sm mx-auto leading-relaxed">The institutional shard is live. Download your credentials to access the terminal.</p>
               </div>

               <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white text-left space-y-6 shadow-2xl relative overflow-hidden">
                  <div>
                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1">AUTHORIZED NAME</span>
                    <div className="text-xl font-black tracking-tighter uppercase">{lastCredentials.name}</div>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1">NODE ID</span>
                    <div className="text-xl font-black tracking-[0.2em]">{lastCredentials.nodeId}</div>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <button onClick={downloadKeycard} className="w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-3">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                     Download Credential Keycard
                  </button>
                  <button onClick={() => setView('GATES')} className="w-full text-slate-400 font-black uppercase text-[10px] tracking-[0.4em] hover:text-slate-600 transition-colors py-4">Return to Hub</button>
               </div>
            </div>
          )}
       </div>
    </div>
  );
};

export default IdentityGateway;