
import React, { useState } from 'react';
import { ManagementState, UserSession, RegisteredSchool } from '../../types';

interface IdentityGatewayProps {
  management: ManagementState;
  onAuthenticate: (session: UserSession) => void;
  onSuperAdminTrigger: () => void;
  onRegisterSchool: (school: RegisteredSchool) => void;
  isSuperAdminAuth: boolean;
  isGeneratingToken: boolean;
}

const IdentityGateway: React.FC<IdentityGatewayProps> = ({ 
  management, 
  onAuthenticate, 
  onSuperAdminTrigger, 
  onRegisterSchool,
  isSuperAdminAuth, 
  isGeneratingToken 
}) => {
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'SUCCESS'>('LOGIN');
  const [nodeName, setNodeName] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [facCode, setFacCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');

  // Registration State
  const [regName, setRegName] = useState('');
  const [regLocation, setRegLocation] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regContact, setRegContact] = useState('');
  const [generatedCreds, setGeneratedCreds] = useState<RegisteredSchool | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const normalizedNode = nodeName.trim().toUpperCase();
    const normalizedId = nodeId.trim().toUpperCase();

    const isSchoolAdmin = 
      management.settings.name.toUpperCase() === normalizedNode && 
      management.settings.institutionalId === normalizedId;

    if (isSchoolAdmin && !facCode) {
      onAuthenticate({ role: 'SCHOOL_ADMIN', nodeName: normalizedNode, nodeId: normalizedId });
      return;
    }

    if (normalizedNode && normalizedId && facCode) {
      const facilitator = management.staff.find(s => s.uniqueCode === facCode.trim().toUpperCase());
      if (facilitator && management.settings.name.toUpperCase() === normalizedNode && management.settings.institutionalId === normalizedId) {
        onAuthenticate({ role: 'FACILITATOR', nodeName: normalizedNode, nodeId: normalizedId, facilitatorId: facilitator.id, facilitatorName: facilitator.name });
        return;
      }
    }

    setError('Invalid credentials. Please verify your Node details and try again.');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName || !regEmail) return;

    const prefix = regName.replace(/[^a-zA-Z]/g, '').substring(0, 5).toUpperCase();
    const newNodeId = `${prefix}-NODE-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const newSchool: RegisteredSchool = {
      id: newNodeId,
      name: regName.toUpperCase(),
      location: regLocation,
      timestamp: new Date().toISOString(),
      email: regEmail,
      contact: regContact
    };

    onRegisterSchool(newSchool);
    setGeneratedCreds(newSchool);
    setView('SUCCESS');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Credentials copied to secure clipboard!");
  };

  const downloadCreds = () => {
    if (!generatedCreds) return;
    const content = `SSMAP INSTITUTIONAL ACCESS CREDENTIALS\n\nInstitution: ${generatedCreds.name}\nActive Node ID: ${generatedCreds.id}\nLocation: ${generatedCreds.location}\nProvision Date: ${new Date(generatedCreds.timestamp).toLocaleString()}\n\n[DO NOT SHARE THIS INFORMATION]`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SSMAP_SECURE_CREDS_${generatedCreds.name}.txt`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900 overflow-y-auto">
       <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-sky-600/20 rounded-full blur-[120px]"></div>
       </div>

       <div className="bg-white rounded-[3.5rem] p-10 md:p-16 w-full max-w-xl shadow-2xl relative animate-in zoom-in-95">
          <div className="text-center mb-12">
             <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner ring-4 ring-indigo-50/50">🏛️</div>
             <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">Institutional Core</h2>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">
                {view === 'REGISTER' ? 'Self-Registration Protocol' : view === 'SUCCESS' ? 'Secure Credentials Active' : 'SSMAP Authentication Protocol'}
             </p>
          </div>

          {view === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Node Name</label>
                  <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 text-sm outline-none focus:border-indigo-600 transition-all uppercase" placeholder="e.g. JOE LAMPTEY SCHOOL" value={nodeName} onChange={(e) => setNodeName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Active Node ID</label>
                  <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-indigo-600 tracking-widest text-sm outline-none focus:border-indigo-600 transition-all uppercase" placeholder="JOELA-SSM-6119" value={nodeId} onChange={(e) => setNodeId(e.target.value)} required />
              </div>
              <div className="pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Facilitator Code</label>
                    <span className="text-[8px] font-black text-indigo-400 uppercase">Leave blank for Admin</span>
                  </div>
                  <div className="relative">
                    <input type={showCode ? "text" : "password"} className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 text-sm outline-none focus:border-indigo-600 transition-all text-center tracking-[0.5em]" placeholder="••••••" value={facCode} onChange={(e) => setFacCode(e.target.value)} />
                    <button type="button" onClick={() => setShowCode(!showCode)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
                      {showCode ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>}
                    </button>
                  </div>
              </div>
              {error && <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center animate-in shake"><p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{error}</p></div>}
              <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black transition-all">Initialize Secure Session</button>
              <div className="text-center mt-6">
                 <button type="button" onClick={() => setView('REGISTER')} className="text-[10px] font-black uppercase text-indigo-600 hover:underline tracking-widest">New School? Register Node Here</button>
              </div>
            </form>
          )}

          {view === 'REGISTER' && (
            <form onSubmit={handleRegister} className="space-y-6 animate-in slide-in-from-bottom-4">
              <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official School Name</label>
                  <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 text-sm outline-none focus:border-indigo-600 transition-all uppercase" placeholder="Enter Full Name" value={regName} onChange={(e) => setRegName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location of school</label>
                  <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 text-sm outline-none focus:border-indigo-600 transition-all uppercase" placeholder="Enter location" value={regLocation} onChange={(e) => setRegLocation(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Administrative Email</label>
                  <input type="email" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 text-sm outline-none focus:border-indigo-600 transition-all" placeholder="admin@school.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <input type="tel" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 text-sm outline-none focus:border-indigo-600 transition-all" placeholder="+233..." value={regContact} onChange={(e) => setRegContact(e.target.value)} />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-indigo-700 transition-all">Provision Official Node</button>
              <div className="text-center mt-6">
                 <button type="button" onClick={() => setView('LOGIN')} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 tracking-widest transition-colors">Already have credentials? Log In</button>
              </div>
            </form>
          )}

          {view === 'SUCCESS' && generatedCreds && (
            <div className="space-y-10 animate-in zoom-in-95">
               <div className="bg-slate-900 rounded-[3rem] p-10 text-white text-center shadow-2xl relative overflow-hidden border-t-4 border-emerald-500">
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                     <div className="absolute top-[-50%] left-[-50%] w-full h-full bg-emerald-500 rounded-full blur-[100px]"></div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400 block mb-8">Access Token Matrix</span>
                  <div className="space-y-8 relative z-10">
                     <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <span className="text-[8px] font-black uppercase text-slate-500 block mb-1">Node Identity</span>
                        <div className="text-2xl font-black uppercase tracking-tight">{generatedCreds.name}</div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{generatedCreds.location}</div>
                     </div>
                     <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
                        <span className="text-[8px] font-black uppercase text-emerald-400 block mb-1">Secure Node ID</span>
                        <div className="text-4xl font-black tracking-[0.2em] text-emerald-500">{generatedCreds.id}</div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <button onClick={() => copyToClipboard(`${generatedCreds.name} | ${generatedCreds.id}`)} className="flex flex-col items-center gap-3 p-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] hover:bg-white hover:border-indigo-600 hover:shadow-xl transition-all group">
                     <span className="text-3xl group-hover:scale-125 transition-transform">📋</span>
                     <span className="text-[9px] font-black uppercase text-slate-950 tracking-widest">Copy to Guard</span>
                  </button>
                  <button onClick={downloadCreds} className="flex flex-col items-center gap-3 p-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] hover:bg-white hover:border-sky-600 hover:shadow-xl transition-all group">
                     <span className="text-3xl group-hover:scale-125 transition-transform">💾</span>
                     <span className="text-[9px] font-black uppercase text-slate-950 tracking-widest">Secure Backup</span>
                  </button>
               </div>

               <div className="bg-amber-50 p-6 rounded-3xl border border-amber-200">
                  <p className="text-[9px] font-bold text-amber-800 text-center uppercase leading-relaxed">
                    CRITICAL: Please ensure you have downloaded or copied these credentials before proceeding. They are required for all future node access.
                  </p>
               </div>

               <button onClick={() => { setNodeName(generatedCreds.name); setNodeId(generatedCreds.id); setView('LOGIN'); }} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black transition-all">Proceed to Authorized Login</button>
            </div>
          )}

          <div className="mt-12 text-center flex flex-col items-center gap-3">
             <div className="flex items-center gap-3">
                <button onClick={onSuperAdminTrigger} disabled={isGeneratingToken} className={`w-3.5 h-3.5 rounded-full transition-all duration-500 hover:scale-150 shadow-lg cursor-pointer ${isSuperAdminAuth ? 'bg-indigo-600 shadow-indigo-300 animate-pulse' : 'bg-slate-300'} ${isGeneratingToken ? 'animate-ping' : ''}`} title="Super Admin Identity Gateway"></button>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.5em] opacity-60">Global Nodes Monitored by SSMAP Matrix Intelligence</p>
             </div>
             <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest opacity-40">Authorized Encryption Tier • v7.4.2</p>
          </div>
       </div>
    </div>
  );
};

export default IdentityGateway;
