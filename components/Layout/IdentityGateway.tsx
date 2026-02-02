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
  const [view, setView] = useState<'GATES' | 'FORM' | 'REGISTER' | 'HANDSHAKE'>('GATES');
  const [accessKey, setAccessKey] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [error, setError] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');

  const initiateHandshake = async (session: UserSession) => {
    setView('HANDSHAKE');
    setSyncStatus('Initiating Handshake...');
    
    try {
      // 1. Download Institutional Persistence Shard
      setSyncStatus(`Downloading Shard: ${session.nodeId}...`);
      const hydratedPayload = await SupabaseSync.fetchPersistence(session.nodeId, session.hubId || 'SMA-HQ');
      
      // 2. Download Shared Pupil Registry (v7.8 Unified Data)
      setSyncStatus('Syncing Pupil Roster...');
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

      // Prepare Hydrated App State
      let finalState: AppState | undefined = hydratedPayload;
      if (finalState && finalState.management) {
        finalState.management.masterPupils = master;
      }

      setSyncStatus('Node Context Ready.');
      setTimeout(() => {
        onAuthenticate(session, finalState);
      }, 1000);

    } catch (err) {
      console.error(err);
      setError('Handshake Rejected: Data synchronization failed.');
      setView('GATES');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pin = accessKey.trim();

    // Protocol: Hardcoded Master Keys for highest-tier entry
    if (gate === 'MASTER' && pin === 'UBA-HQ-MASTER-2025') {
      initiateHandshake({ role: 'super_admin', nodeName: 'GLOBAL MASTER', nodeId: 'MASTER-NODE-01', hubId: 'SMA-HQ' });
      return;
    }

    if (gate === 'PUPIL') {
        // Pupil login usually uses studentId as the PIN in this implementation
        initiateHandshake({ 
          role: 'pupil', 
          nodeName: management.settings.name, 
          nodeId: management.settings.institutionalId, 
          hubId: management.settings.hubId,
          pupilId: pin 
        });
        return;
    }

    // Protocol: Cloud PIN Handshake for Facilitators and Admins
    setSyncStatus('Verifying Credentials...');
    setView('HANDSHAKE');
    try {
        const identity = await SupabaseSync.verifyCredential(pin);
        
        if (!identity) {
            setError('Invalid PIN: Identity not found on cloud.');
            setView('FORM');
            return;
        }

        // Validate Role and Context
        if (gate === 'ADMIN' && identity.role !== 'school_admin' && identity.role !== 'super_admin') {
            setError('Unauthorized: Administrative clearance required.');
            setView('FORM');
            return;
        }

        initiateHandshake({
            role: identity.role,
            nodeName: identity.node_id, // Identity shard should contain node metadata
            nodeId: identity.node_id,
            hubId: identity.hub_id,
            facilitatorId: identity.email,
            facilitatorName: identity.full_name,
            facilitatorCategory: identity.teaching_category
        });

    } catch (err) {
        setError('Cloud Handshake Failed. Check Connection.');
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
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em]">Select Authorized Entry Point</p>
               </div>

               <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => { setGate('FACILITATOR'); setView('FORM'); }} className="group p-8 rounded-[2.5rem] bg-slate-50 border-2 border-transparent hover:border-indigo-600 hover:bg-white transition-all flex items-center justify-between shadow-sm">
                     <div className="text-left">
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Gate Gamma</span>
                        <h3 className="text-xl font-black text-slate-900 uppercase">Facilitator</h3>
                     </div>
                     <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">👨‍🏫</div>
                  </button>

                  <button onClick={() => { setGate('ADMIN'); setView('FORM'); }} className="group p-8 rounded-[2.5rem] bg-slate-50 border-2 border-transparent hover:border-sky-600 hover:bg-white transition-all flex items-center justify-between shadow-sm">
                     <div className="text-left">
                        <span className="text-[9px] font-black text-sky-500 uppercase tracking-widest block mb-1">Gate Beta</span>
                        <h3 className="text-xl font-black text-slate-900 uppercase">School Admin</h3>
                     </div>
                     <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl group-hover:bg-sky-600 group-hover:text-white transition-all">🔑</div>
                  </button>

                  <button onClick={() => { setGate('PUPIL'); setView('FORM'); }} className="group p-8 rounded-[2.5rem] bg-slate-50 border-2 border-transparent hover:border-emerald-600 hover:bg-white transition-all flex items-center justify-between shadow-sm">
                     <div className="text-left">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Gate Delta</span>
                        <h3 className="text-xl font-black text-slate-900 uppercase">Pupil Portal</h3>
                     </div>
                     <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-xl group-hover:bg-emerald-600 group-hover:text-white transition-all">🎓</div>
                  </button>
               </div>
               
               <div className="text-center flex items-center justify-center gap-1">
                  <button onClick={() => setView('REGISTER')} className="text-[10px] font-black uppercase text-indigo-600 hover:underline tracking-[0.2em]">Provision New Institutional Node</button>
                  <button onClick={() => { setGate('MASTER'); setView('FORM'); }} className="w-4 h-4 flex items-center justify-center text-[12px] font-black text-slate-200 opacity-10 hover:opacity-100 hover:text-indigo-600 transition-all cursor-default">.</button>
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
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Cloud Handshake Protocol v7.8</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <div className="space-y-1.5 pt-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {gate === 'PUPIL' ? 'Student ID / Personal Code' : 'Credential Access PIN'}
                    </label>
                    <input type="password" className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-3xl font-black text-slate-950 text-center tracking-[0.5em] text-xl outline-none focus:border-indigo-600 transition-all shadow-inner" placeholder="••••••••" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} required />
                  </div>
               </div>

               {error && <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center animate-bounce"><p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{error}</p></div>}
               
               <button type="submit" className="w-full bg-slate-950 text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-[1.02] transition-all">Authorize Cloud Handshake</button>
            </form>
          ) : view === 'REGISTER' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-6">
                  <button type="button" onClick={() => setView('GATES')} className="w-14 h-14 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center text-xl hover:bg-slate-100 transition-colors">←</button>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Node Provisioning</h3>
                    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mt-2">Initialize Global Institutional Identity</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black uppercase text-sm outline-none" placeholder="Full School Name" value={regName} onChange={(e) => setRegName(e.target.value)} />
                  <input type="email" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-sm outline-none" placeholder="Administrative Email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
               </div>

               <button onClick={() => setView('GATES')} className="w-full bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black uppercase text-xs tracking-widest shadow-2xl">Request Core Token</button>
            </div>
          )}
       </div>
    </div>
  );
};

export default IdentityGateway;