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

type GateType = 'MASTER' | 'ADMIN' | 'FACILITATOR' | 'PUPIL';

const IdentityGateway: React.FC<IdentityGatewayProps> = ({ 
  management, 
  onAuthenticate, 
  onSuperAdminTrigger, 
  onRegisterSchool,
  isSuperAdminAuth, 
  isGeneratingToken 
}) => {
  const [gate, setGate] = useState<GateType>('ADMIN');
  const [view, setView] = useState<'GATES' | 'FORM' | 'REGISTER' | 'HANDSHAKE' | 'SUCCESS'>('GATES');
  
  const [inputName, setInputName] = useState('');
  const [inputNodeId, setInputNodeId] = useState('');
  
  const [syncStatus, setSyncStatus] = useState('');
  const [error, setError] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regSlogan, setRegSlogan] = useState('');
  const [lastCredentials, setLastCredentials] = useState<{ nodeId: string, name: string, merit?: number, money?: number } | null>(null);

  const initiateHandshake = async (session: UserSession) => {
    setView('HANDSHAKE');
    setSyncStatus('Linking...');
    
    try {
      setSyncStatus(`Syncing Node: ${session.nodeId}...`);
      const hydratedPayload = await SupabaseSync.fetchPersistence(session.nodeId, session.hubId || 'SMA-HQ');
      
      setSyncStatus('Updating Roster...');
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

      setSyncStatus('Authorized.');
      setLastCredentials({ 
        nodeId: session.nodeId, 
        name: session.facilitatorName || session.nodeName,
        merit: session.meritBalance,
        money: session.monetaryBalance
      });
      
      if (session.role === 'super_admin') {
        onAuthenticate(session, finalState);
      } else {
        setView('SUCCESS');
      }

    } catch (err) {
      setError('Handshake Rejected.');
      setView('GATES');
    }
  };

  const handleRegisterNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setView('HANDSHAKE');
    setSyncStatus('Provisioning Shard...');

    const prefix = regName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase();
    const nodeId = `${prefix}-UB-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await SupabaseSync.registerSchool({
        name: regName.toUpperCase(),
        nodeId,
        email: regEmail.toLowerCase(),
        slogan: regSlogan,
        hubId: 'SMA-HQ',
        originGate: 'ADMIN'
      });
      setLastCredentials({ nodeId, name: regName.toUpperCase() });
      setView('SUCCESS');
    } catch (err) {
      setError('Registration Error.');
      setView('REGISTER');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanName = inputName.trim();
    const cleanNodeId = inputNodeId.trim();

    if (gate === 'MASTER' && cleanNodeId === 'UBA-HQ-MASTER-2025') {
      initiateHandshake({ role: 'super_admin', nodeName: 'GLOBAL MASTER', nodeId: 'MASTER-NODE-01', hubId: 'SMA-HQ' });
      return;
    }

    if (gate === 'PUPIL') {
        initiateHandshake({ role: 'pupil', nodeName: management.settings.name, nodeId: management.settings.institutionalId, hubId: management.settings.hubId, pupilId: cleanNodeId });
        return;
    }

    setView('HANDSHAKE');
    try {
        const identity = await SupabaseSync.verifyIdentity(cleanName, cleanNodeId);
        if (!identity) {
            setError(`Credentials Rejected.`);
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
            facilitatorCategory: identity.teaching_category,
            meritBalance: identity.merit_balance || 0,
            monetaryBalance: identity.monetary_balance || 0
        });
    } catch (err) {
        setError('Connection Timeout.');
        setView('FORM');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-950 overflow-y-auto">
       <div className="bg-white rounded-[2.5rem] p-8 md:p-10 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-300">
          {view === 'GATES' ? (
            <div className="space-y-6">
               <div className="text-center">
                  <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-xl">🏛️</div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Institutional Gateway</h2>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">Access Protocol v9.5</p>
               </div>

               <div className="grid grid-cols-1 gap-2.5">
                  <button onClick={() => { setGate('ADMIN'); setView('FORM'); }} className="group p-4 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-sky-600 transition-all flex items-center justify-between">
                     <div className="text-left">
                        <span className="text-[7px] font-black text-sky-500 uppercase tracking-widest block">L1 Auth</span>
                        <h3 className="text-xs font-black text-slate-900 uppercase">Institutional Admin</h3>
                     </div>
                     <div className="text-lg">🔑</div>
                  </button>

                  <button onClick={() => { setGate('FACILITATOR'); setView('FORM'); }} className="group p-4 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-indigo-600 transition-all flex items-center justify-between">
                     <div className="text-left">
                        <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest block">L2 Auth</span>
                        <h3 className="text-xs font-black text-slate-900 uppercase">Facilitator Hub</h3>
                     </div>
                     <div className="text-lg">👨‍🏫</div>
                  </button>

                  <button onClick={() => { setGate('PUPIL'); setView('FORM'); }} className="group p-4 rounded-2xl bg-slate-50 border-2 border-transparent hover:border-emerald-600 transition-all flex items-center justify-between">
                     <div className="text-left">
                        <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest block">L3 Auth</span>
                        <h3 className="text-xs font-black text-slate-900 uppercase">Pupil Terminal</h3>
                     </div>
                     <div className="text-lg">🎓</div>
                  </button>
               </div>
               
               <div className="text-center pt-2">
                 <button onClick={() => setView('REGISTER')} className="text-[8px] font-black uppercase text-indigo-600 hover:underline tracking-widest">Setup New Node</button>
               </div>
            </div>
          ) : view === 'REGISTER' ? (
            <form onSubmit={handleRegisterNode} className="space-y-4">
               <div className="flex items-center gap-4 mb-4">
                  <button type="button" onClick={() => setView('GATES')} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center text-xs hover:bg-slate-100 transition-all">←</button>
                  <h3 className="text-sm font-black text-slate-900 uppercase">New Node Registry</h3>
               </div>
               <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Name</label>
                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-3.5 rounded-xl font-black text-slate-950 uppercase text-[10px] focus:border-indigo-600 outline-none" value={regName} onChange={(e) => setRegName(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand Slogan</label>
                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-3.5 rounded-xl font-black text-slate-950 text-[10px] focus:border-indigo-600 outline-none" value={regSlogan} onChange={(e) => setRegSlogan(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Email</label>
                    <input type="email" className="w-full bg-slate-50 border-2 border-slate-100 p-3.5 rounded-xl font-black text-slate-950 text-[10px] focus:border-indigo-600 outline-none" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
                  </div>
               </div>
               <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Provision Node</button>
            </form>
          ) : view === 'SUCCESS' && lastCredentials ? (
            <div className="text-center animate-in zoom-in-95">
               <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-xl mx-auto mb-4 shadow-sm">✓</div>
               <h3 className="text-lg font-black text-slate-900 uppercase mb-1">Handshake Secured</h3>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-6">{lastCredentials.name}</p>
               
               <div className="grid grid-cols-2 gap-2 mb-4">
                 <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-100">
                    <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Merit Pool</span>
                    <div className="text-lg font-black text-indigo-600">{lastCredentials.merit || 0}</div>
                 </div>
                 <div className="bg-slate-50 p-3 rounded-2xl border-2 border-slate-100">
                    <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Vault GHS</span>
                    <div className="text-lg font-black text-emerald-600">₵{lastCredentials.money?.toFixed(2) || '0.00'}</div>
                 </div>
               </div>

               <div className="bg-slate-900 p-4 rounded-2xl mb-8">
                  <span className="text-[7px] font-black text-slate-400 uppercase block mb-1">Secure Node ID</span>
                  <div className="text-lg font-black text-white tracking-widest">{lastCredentials.nodeId}</div>
               </div>

               <button 
                 onClick={() => window.location.reload()} 
                 className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] shadow-xl"
               >
                 Enter Terminal Hub
               </button>
            </div>
          ) : view === 'HANDSHAKE' ? (
            <div className="text-center py-10">
               <div className="w-12 h-12 mx-auto mb-6 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
               <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.4em]">{syncStatus}</p>
            </div>
          ) : view === 'FORM' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
               <div className="flex items-center gap-4 mb-4">
                  <button type="button" onClick={() => setView('GATES')} className="w-8 h-8 bg-slate-50 text-slate-400 rounded-lg flex items-center justify-center text-xs hover:bg-slate-100 transition-all">←</button>
                  <h3 className="text-sm font-black text-slate-900 uppercase">{gate} LOGIN</h3>
               </div>
               <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name / ID</label>
                    <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-3.5 rounded-xl font-black text-slate-950 uppercase text-[10px] outline-none focus:border-indigo-600" value={inputName} onChange={(e) => setInputName(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest ml-1">Node Token / PIN</label>
                    <input type="password" className="w-full bg-slate-50 border-2 border-slate-100 p-3.5 rounded-xl font-black text-slate-950 uppercase text-center tracking-[0.2em] text-xs outline-none focus:border-indigo-600" value={inputNodeId} onChange={(e) => setInputNodeId(e.target.value)} required />
                  </div>
               </div>
               {error && <div className="p-2.5 bg-rose-50 text-rose-600 text-[7px] font-black uppercase text-center rounded-lg">{error}</div>}
               <button type="submit" className="w-full bg-slate-950 text-white py-4 rounded-2xl font-black uppercase text-[9px] tracking-widest shadow-xl hover:scale-105 transition-all">Identify</button>
            </form>
          ) : null}
       </div>
    </div>
  );
};

export default IdentityGateway;