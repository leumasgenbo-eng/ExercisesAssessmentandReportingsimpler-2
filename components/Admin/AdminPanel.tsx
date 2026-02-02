import React, { useRef, useState, useMemo } from 'react';
import { ManagementState, AppState, MasterPupilEntry } from '../../types';
import { SCHOOL_HIERARCHY, INITIAL_MANAGEMENT_DATA } from '../../constants';
import ArchivePortal from './ArchivePortal';
import FacilitatorRewardPortal from './FacilitatorRewardPortal';
import { SupabaseSync } from '../../lib/supabase';

interface AdminPanelProps {
  data: ManagementState;
  fullState: AppState;
  onUpdateManagement: (newData: ManagementState) => void;
  onResetSystem: () => void;
  onRestoreSystem: (newState: AppState) => void;
  isSuperAdminAuthenticated?: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  data, fullState, onUpdateManagement, onResetSystem, onRestoreSystem
}) => {
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const pupilInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'REGISTRY' | 'REWARDS' | 'ARCHIVE' | 'SYNC'>('IDENTITY');
  const [registryClass, setRegistryClass] = useState('Basic 1A');
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'FETCHING' | 'SUCCESS' | 'ERROR'>('IDLE');

  const totalVerifiedPupils = useMemo(() => {
    return (Object.values(data.masterPupils || {}) as MasterPupilEntry[][]).reduce((acc, curr) => acc + curr.length, 0);
  }, [data.masterPupils]);

  const handleUpdateSetting = (field: string, value: any) => {
    onUpdateManagement({
      ...data,
      settings: {
        ...data.settings,
        [field]: value
      }
    });
  };

  const handleCloudPull = async () => {
    setSyncStatus('FETCHING');
    try {
      const remoteStaff = await SupabaseSync.fetchStaff();
      const remotePupils = await SupabaseSync.fetchPupils();
      const newManagement = { ...data };
      if (remoteStaff.length > 0) newManagement.staff = remoteStaff.map((s: any) => ({ id: s.id.toString(), name: s.name, role: s.role, category: s.category || 'BASIC_SUBJECT_LEVEL', email: s.email, uniqueCode: s.unique_code }));
      if (remotePupils.length > 0) {
        const master: Record<string, MasterPupilEntry[]> = {};
        remotePupils.forEach((p: any) => {
          if (!master[p.class_name]) master[p.class_name] = [];
          /**
           * Fixed: Added missing 'isJhsLevel' property to comply with MasterPupilEntry interface
           */
          master[p.class_name].push({ name: p.name, gender: p.gender as any, studentId: p.student_id, isJhsLevel: !!p.is_jhs });
        });
        newManagement.masterPupils = master;
      }
      onUpdateManagement(newManagement);
      setSyncStatus('SUCCESS');
      setTimeout(() => setSyncStatus('IDLE'), 3000);
    } catch (err) { setSyncStatus('ERROR'); alert("Cloud Sync Handshake Failed."); }
  };

  const tabs = [
    { id: 'IDENTITY', label: 'Identity', icon: '🆔' },
    { id: 'REGISTRY', label: 'Roster', icon: '👤' },
    { id: 'SYNC', label: 'Sync', icon: '☁️' },
    { id: 'REWARDS', label: 'Rewards', icon: '🏆' },
    { id: 'ARCHIVE', label: 'Archive', icon: '🏛️' },
  ] as const;

  return (
    <div className="animate-in space-y-12 pb-24 max-w-[1400px] mx-auto">
      <div className="bg-slate-900 rounded-[3rem] p-10 md:p-14 shadow-2xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
        <div>
          <h3 className="text-4xl font-black text-white uppercase tracking-tighter mb-1">Administrative Node</h3>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">SSMAP Matrix Management</p>
        </div>
        <div className="flex bg-white/5 p-2 rounded-[2.5rem] w-full md:w-auto overflow-x-auto scrollbar-hide border border-white/10">
           {tabs.map(t => (
             <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex-1 px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-white text-slate-950 shadow-2xl scale-105' : 'text-slate-400 hover:text-white'}`}>
               <span className="mr-2">{t.icon}</span> {t.label}
             </button>
           ))}
        </div>
      </div>

      <div className="transition-all duration-500">
        {activeTab === 'IDENTITY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-bottom-4">
             <div className="lg:col-span-8 space-y-8">
                <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl border border-slate-100">
                   <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-10 border-b-2 border-slate-50 pb-6">Node Branding & Identity</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Institution Name</label>
                         <input className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 uppercase text-xs" value={data.settings.name} onChange={(e) => handleUpdateSetting('name', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Slogan</label>
                         <input className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 text-xs" value={data.settings.slogan} onChange={(e) => handleUpdateSetting('slogan', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institutional Node ID</label>
                         <input className="w-full bg-indigo-50 border-2 border-indigo-100 p-5 rounded-2xl font-black text-indigo-600 tracking-widest text-xs uppercase" value={data.settings.institutionalId} onChange={(e) => handleUpdateSetting('institutionalId', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Administrative Contact</label>
                         <input className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 text-xs" value={data.settings.contact} onChange={(e) => handleUpdateSetting('contact', e.target.value)} />
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl border border-slate-100">
                   <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-8">System Global Context</h4>
                   <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Year</label>
                         <input className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-slate-900 text-xs" value={data.settings.currentYear} onChange={(e) => handleUpdateSetting('currentYear', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Active Term</label>
                         <select className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-slate-900 text-xs uppercase" value={data.settings.currentTerm} onChange={(e) => handleUpdateSetting('currentTerm', e.target.value)}>
                            {["1ST TERM", "2ND TERM", "3RD TERM"].map(t => <option key={t} value={t}>{t}</option>)}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Month Cycle</label>
                         <select className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-slate-900 text-xs uppercase" value={data.settings.activeMonth} onChange={(e) => handleUpdateSetting('activeMonth', e.target.value)}>
                            {["MONTH 1", "MONTH 2", "MONTH 3", "MONTH 4"].map(m => <option key={m} value={m}>{m}</option>)}
                         </select>
                      </div>
                   </div>
                </div>
             </div>

             <div className="lg:col-span-4 space-y-8">
                <div className="bg-slate-950 rounded-[3.5rem] p-10 text-white shadow-2xl">
                   <h4 className="text-xl font-black uppercase mb-6 flex items-center gap-3">
                      <span className="text-2xl">📦</span> Local Archive
                   </h4>
                   <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed mb-8">Download your institutional state as a secure SSMAP JSON package.</p>
                   <button onClick={() => {
                      const dataStr = JSON.stringify(fullState, null, 2);
                      const blob = new Blob([dataStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = `SSMAP_BACKUP_${data.settings.name}_${new Date().toISOString().split('T')[0]}.json`;
                      link.click();
                   }} className="w-full py-6 bg-white text-slate-950 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-indigo-50 transition-all shadow-xl">Export Node State</button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'SYNC' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4">
             <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden border-b-8 border-emerald-500">
                <div className="relative z-10">
                   <h4 className="text-4xl font-black uppercase tracking-tighter mb-4">Cloud Handshake Hub</h4>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed mb-10">Sync institutional registries or upload snapshots to remote SSMAP nodes.</p>
                   <button onClick={handleCloudPull} className={`px-12 py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest transition-all ${syncStatus === 'FETCHING' ? 'bg-amber-500 animate-pulse' : 'bg-indigo-600 shadow-2xl'}`}>
                      {syncStatus === 'FETCHING' ? 'Syncing...' : 'Handshake with Cloud'}
                   </button>
                </div>
             </div>
          </div>
        )}
        
        {activeTab === 'REGISTRY' && (
           <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl border border-slate-100 animate-in">
              <div className="flex justify-between items-end mb-10">
                 <div>
                    <h4 className="text-3xl font-black text-slate-900 uppercase">Master Pupil Roster</h4>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">{totalVerifiedPupils} Verified Entities</p>
                 </div>
                 <select className="bg-slate-50 border-2 border-slate-100 rounded-xl px-6 py-3 font-black text-slate-900 text-[11px] uppercase outline-none" value={registryClass} onChange={(e) => setRegistryClass(e.target.value)}>
                    {Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes).map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4">
                 {(data.masterPupils?.[registryClass] || []).map((p, i) => (
                    <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">{p.name.charAt(0)}</div>
                       <div className="truncate">
                          <div className="font-black uppercase text-[11px] text-slate-900 truncate">{p.name}</div>
                          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.gender} • {p.studentId || 'NO ID'}</div>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        )}

        {activeTab === 'REWARDS' && <FacilitatorRewardPortal data={data} fullState={fullState} />}
        {activeTab === 'ARCHIVE' && <ArchivePortal fullState={fullState} />}
      </div>
    </div>
  );
};

export default AdminPanel;