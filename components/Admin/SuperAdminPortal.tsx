import React, { useState } from 'react';
import { AppState, ManagementState, RegisteredSchool, Message } from '../../types';

interface Props {
  state: AppState;
  onUpdateState: (state: AppState) => void;
  onUpdateManagement: (data: ManagementState) => void;
}

const SuperAdminPortal: React.FC<Props> = ({ state, onUpdateManagement, onUpdateState }) => {
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolLocation, setNewSchoolLocation] = useState('');
  const [directiveText, setDirectiveText] = useState('');
  
  const registry = state.management.superAdminRegistry || [];

  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName) return;

    const prefix = newSchoolName.replace(/[^a-zA-Z]/g, '').substring(0, 5).toUpperCase();
    const newNodeId = `${prefix}-SSM-${Math.floor(1000 + Math.random() * 9000)}`;

    const newSchool: RegisteredSchool = {
      id: newNodeId,
      name: newSchoolName.toUpperCase(),
      location: newSchoolLocation || 'Remote Node',
      timestamp: new Date().toISOString(),
      notified: false
    };

    onUpdateManagement({
      ...state.management,
      superAdminRegistry: [...registry, newSchool]
    });

    setNewSchoolName('');
    setNewSchoolLocation('');
    alert(`Node ${newNodeId} Provisioned successfully.`);
  };

  const dispatchMasterDirective = () => {
    if (!directiveText) return;

    const newMessage: Message = {
      id: `master-${Date.now()}`,
      from: 'GLOBAL MASTER NODE',
      to: 'ADMIN',
      text: directiveText,
      timestamp: new Date().toISOString(),
      read: false
    };

    onUpdateManagement({
      ...state.management,
      messages: [newMessage, ...state.management.messages]
    });

    setDirectiveText('');
    alert("Global Directive Dispatched to School Admin Board.");
  };

  const interceptNode = (school: RegisteredSchool) => {
    if (confirm(`Switch system context to ${school.name}?`)) {
      onUpdateManagement({
        ...state.management,
        settings: {
          ...state.management.settings,
          name: school.name,
          institutionalId: school.id,
          address: school.location
        }
      });
      alert(`System context updated to Node: ${school.id}`);
    }
  };

  const removeNode = (id: string) => {
    if (confirm("Permanently de-provision this node from registry?")) {
      onUpdateManagement({
        ...state.management,
        superAdminRegistry: registry.filter(s => s.id !== id)
      });
    }
  };

  return (
    <div className="space-y-12 animate-in pb-40">
      {/* Header Context */}
      <div className="bg-slate-950 rounded-[4rem] p-12 md:p-20 text-white shadow-2xl relative overflow-hidden border-b-8 border-indigo-600">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px]"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 bg-white/10 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-inner border border-white/5 backdrop-blur-md">🌍</div>
            <div>
              <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-2">Master Registry</h2>
              <p className="text-indigo-400 text-xs md:text-sm font-black uppercase tracking-[0.5em] opacity-80">Global Node Control • SSMAP Matrix Intelligence</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md">
               <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-2">Registered Nodes</span>
               <div className="text-5xl font-black">{registry.length}</div>
            </div>
            <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md">
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2">System Status</span>
               <div className="text-2xl font-black uppercase">Core Synchronized</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Node Provisioning */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-8">Provision New Node</h3>
              <form onSubmit={handleAddSchool} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institution Name</label>
                    <input 
                      className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 uppercase text-xs"
                      placeholder="e.g. ST. PETERS ACADEMY"
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Node Location</label>
                    <input 
                      className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 uppercase text-xs"
                      placeholder="Accra, Ghana"
                      value={newSchoolLocation}
                      onChange={(e) => setNewSchoolLocation(e.target.value)}
                    />
                 </div>
                 <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Provision Node</button>
              </form>
           </div>

           <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-2xl font-black uppercase tracking-tight mb-6">Master Directive</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Send an administrative entry to the current school's board.</p>
                <textarea 
                  className="w-full bg-white/5 border-2 border-white/10 p-6 rounded-3xl font-bold text-white text-xs outline-none focus:border-indigo-500 transition-all h-40 resize-none shadow-inner"
                  placeholder="Draft Master Directive..."
                  value={directiveText}
                  onChange={(e) => setDirectiveText(e.target.value)}
                />
                <button 
                  onClick={dispatchMasterDirective}
                  className="w-full mt-6 bg-white text-slate-950 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-50 transition-all"
                >Dispatch to Active Node</button>
              </div>
           </div>
        </div>

        {/* Global Registry Grid */}
        <div className="lg:col-span-8 space-y-8">
           <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.6em] ml-4">Global Node Registry</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {registry.map((school) => (
                <div key={school.id} className="bg-white rounded-[3.5rem] p-10 border border-slate-200 shadow-xl hover:shadow-2xl transition-all group flex flex-col justify-between">
                   <div>
                     <div className="flex justify-between items-start mb-8">
                        <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center text-3xl font-black shadow-lg">🏛️</div>
                        <div className="flex flex-col items-end gap-2">
                           <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Active Node</span>
                           <button onClick={() => removeNode(school.id)} className="text-slate-300 hover:text-rose-500 p-1 transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                           </button>
                        </div>
                     </div>
                     <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">{school.name}</h3>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">{school.location}</p>
                     
                     <div className="space-y-3 pt-6 border-t border-slate-50">
                        <div className="flex justify-between text-[9px] font-black uppercase">
                           <span className="text-slate-400">Secure Node ID:</span>
                           <span className="text-indigo-600 tracking-widest">{school.id}</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-black uppercase">
                           <span className="text-slate-400">Date Provisioned:</span>
                           <span className="text-slate-900">{new Date(school.timestamp).toLocaleDateString()}</span>
                        </div>
                     </div>
                   </div>
                   
                   <button 
                     onClick={() => interceptNode(school)}
                     className="w-full mt-10 py-5 bg-slate-50 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                   >Intercept Institutional Data</button>
                </div>
              ))}
              
              {registry.length === 0 && (
                <div className="col-span-full py-40 text-center opacity-20">
                   <div className="text-8xl mb-6 grayscale">🏜️</div>
                   <p className="text-xl font-black uppercase tracking-widest">Global Node Registry Vacant</p>
                   <p className="text-[10px] font-bold mt-2 uppercase">Begin manual provisioning to start network</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminPortal;
