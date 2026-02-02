import React, { useRef, useState, useMemo } from 'react';
import { ManagementState, AppState, MasterPupilEntry, Staff, FacilitatorCategory, FacilitatorSubjectMapping, SchoolGroup } from '../../types';
import { SCHOOL_HIERARCHY, SUBJECTS_BY_GROUP } from '../../constants';
import ArchivePortal from './ArchivePortal';
import FacilitatorRewardPortal from './FacilitatorRewardPortal';
import { SupabaseSync } from '../../lib/supabase';

interface AdminPanelProps {
  data: ManagementState;
  fullState: AppState;
  onUpdateManagement: (newData: ManagementState) => void;
  onResetSystem: () => void;
  onRestoreSystem: (newState: AppState) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  data, fullState, onUpdateManagement, onResetSystem, onRestoreSystem
}) => {
  const pupilImportRef = useRef<HTMLInputElement>(null);
  const staffImportRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'STAFF' | 'PUPILS' | 'REWARDS' | 'ARCHIVE'>('IDENTITY');
  const [registryClass, setRegistryClass] = useState('Basic 1A');
  const [isProvisioning, setIsProvisioning] = useState(false);
  
  // Assignment Matrix State
  const [activeMappingStaff, setActiveMappingStaff] = useState<Staff | null>(null);
  const [targetClass, setTargetClass] = useState('Basic 1A');
  const [tempAssignments, setTempAssignments] = useState<Record<string, boolean>>({});

  // Individual Pupil Edit State
  const [editingPupil, setEditingPupil] = useState<{ entry: MasterPupilEntry; oldClass: string } | null>(null);

  const totalPupils = useMemo(() => Object.values(data.masterPupils || {}).reduce((a, c) => a + (c?.length || 0), 0), [data.masterPupils]);

  const handleUpdateSetting = (field: string, value: any) => onUpdateManagement({ ...data, settings: { ...data.settings, [field]: value } });

  const getGroupForClass = (cls: string): SchoolGroup => {
    for (const [group, config] of Object.entries(SCHOOL_HIERARCHY)) { 
      if (config.classes.includes(cls)) return group as SchoolGroup; 
    }
    return 'LOWER_BASIC';
  };

  // --- STAFF COMMANDS ---
  const [newStaff, setNewStaff] = useState({ name: '', email: '', category: 'BASIC_SUBJECT_LEVEL' as FacilitatorCategory });

  const addStaff = async () => {
    if (!newStaff.name || !newStaff.email) {
      alert("Name and Email are required for Identity Provisioning.");
      return;
    }
    setIsProvisioning(true);
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const staffObj: Staff = { 
      id: newStaff.email.toLowerCase(), 
      name: newStaff.name.toUpperCase(), 
      email: newStaff.email.toLowerCase(), 
      role: 'facilitator', 
      category: newStaff.category, 
      uniqueCode: pin 
    };

    try {
      await SupabaseSync.registerSchool({ 
        name: staffObj.name, 
        nodeId: data.settings.institutionalId, 
        email: staffObj.email, 
        hubId: data.settings.hubId, 
        originGate: 'FACILITATOR' 
      });
      onUpdateManagement({ ...data, staff: [...data.staff, staffObj] });
      setNewStaff({ name: '', email: '', category: 'BASIC_SUBJECT_LEVEL' });
      alert(`Facilitator Linked Successfully.\nPIN: ${pin}`);
    } catch (e) { 
      alert("Cloud Handshake Failed. Identity stored locally."); 
      onUpdateManagement({ ...data, staff: [...data.staff, staffObj] });
    } finally { 
      setIsProvisioning(false); 
    }
  };

  const removeStaff = (id: string) => {
    if (!confirm("CRITICAL: Permanently disconnect this facilitator and wipe all their academic duty mappings?")) return;
    onUpdateManagement({ 
      ...data, 
      staff: data.staff.filter(s => s.id !== id), 
      mappings: data.mappings.filter(m => m.staffId !== id) 
    });
  };

  const removeMapping = (mappingId: string) => {
    onUpdateManagement({
      ...data,
      mappings: data.mappings.filter(m => m.id !== mappingId)
    });
  };

  const handleAssignDuties = () => {
    if (!activeMappingStaff) return;
    const newMappings: FacilitatorSubjectMapping[] = Object.entries(tempAssignments)
      .filter(([_, checked]) => checked)
      .map(([subName]) => {
        const subId = data.subjects.find(s => s.name === subName)?.id || subName;
        return {
          id: `map-${Date.now()}-${Math.random()}`,
          staffId: activeMappingStaff.id,
          className: targetClass,
          subjectId: subId,
          type: 'CLASS_BASED',
          employmentType: 'FULL_TIME'
        };
      });
    
    // Prevent duplicate mappings
    const existingMappings = data.mappings;
    const filteredNew = newMappings.filter(nm => 
      !existingMappings.some(em => em.staffId === nm.staffId && em.className === nm.className && em.subjectId === nm.subjectId)
    );

    onUpdateManagement({ ...data, mappings: [...existingMappings, ...filteredNew] });
    setActiveMappingStaff(null);
    setTempAssignments({});
    alert("Academic Matrix Updated.");
  };

  const handleMassPromotion = () => {
    if (!confirm("CRITICAL WARNING: Effect School-Wide Mass Promotion?\nAll students will move to the next academic level. This cannot be undone.")) return;
    const newMaster: Record<string, MasterPupilEntry[]> = {};
    const flatClasses = Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes);
    Object.entries(data.masterPupils || {}).forEach(([cls, pupils]) => {
      const nextIdx = flatClasses.indexOf(cls) + 1;
      const nextCls = flatClasses[nextIdx];
      if (nextCls) newMaster[nextCls] = [...(newMaster[nextCls] || []), ...pupils];
    });
    onUpdateManagement({ ...data, masterPupils: newMaster });
    alert("Promotion Cycle Finalized.");
  };

  return (
    <div className="animate-in space-y-10 pb-24 max-w-[1400px] mx-auto px-4 lg:px-0">
      <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white flex flex-col lg:flex-row justify-between items-center gap-10 shadow-2xl">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <span className="bg-indigo-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">1: Class Assignment/ACTIVITIES</span>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">UNITED BAYLOR A. • ASSESSMENT SHEET</p>
          </div>
          <h3 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Admin Command</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-2">Institutional Authority Node</p>
        </div>
        <div className="flex bg-white/5 p-2 rounded-[2rem] overflow-x-auto scrollbar-hide max-w-full">
           {([['IDENTITY', '🆔'], ['STAFF', '👨‍🏫'], ['PUPILS', '👤'], ['REWARDS', '🏆'], ['ARCHIVE', '🏛️']] as const).map(([id, icon]) => (
             <button key={id} onClick={() => setActiveTab(id as any)} className={`px-6 md:px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === id ? 'bg-white text-slate-950 shadow-2xl scale-105' : 'text-slate-400 hover:text-white'}`}>
               <span className="mr-2">{icon}</span> {id}
             </button>
           ))}
        </div>
      </div>

      {activeTab === 'IDENTITY' && (
        <div className="bg-white rounded-[3.5rem] p-10 md:p-14 shadow-xl border border-slate-100 animate-in slide-in-from-bottom-4">
           <h4 className="text-3xl font-black uppercase mb-10 border-b-4 border-slate-50 pb-6 tracking-tight">Institutional Profile</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Institution Name</label>
                 <input className="w-full bg-slate-50 border-4 border-slate-100 p-6 rounded-3xl font-black uppercase text-sm outline-none focus:border-indigo-600 transition-all" value={data.settings.name} onChange={(e) => handleUpdateSetting('name', e.target.value)} />
              </div>
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Shard Node ID</label>
                 <input className="w-full bg-indigo-50 border-4 border-indigo-100 p-6 rounded-3xl font-black text-indigo-600 text-sm outline-none" value={data.settings.institutionalId} onChange={(e) => handleUpdateSetting('institutionalId', e.target.value)} />
              </div>
           </div>
        </div>
      )}

      {activeTab === 'STAFF' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-4">
           <div className="lg:col-span-4 bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 h-fit">
              <h4 className="text-xl font-black uppercase mb-6 tracking-tight">Enrol Faculty</h4>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Full Legal Name</label>
                    <input className="w-full bg-slate-50 border-2 p-4 rounded-xl font-black uppercase text-xs outline-none focus:border-indigo-600 transition-all" placeholder="e.g. JOHN AMANOR" value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Verified Email Address</label>
                    <input className="w-full bg-slate-50 border-2 p-4 rounded-xl font-black text-xs outline-none focus:border-indigo-600 transition-all" placeholder="john@uba.edu.gh" value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Academic Category</label>
                    <select className="w-full bg-slate-50 border-2 p-4 rounded-xl font-black text-xs uppercase outline-none focus:border-indigo-600 appearance-none" value={newStaff.category} onChange={(e) => setNewStaff({...newStaff, category: e.target.value as any})}>
                      <option value="DAYCARE_FACILITATOR">Daycare (Creche/Nursery)</option>
                      <option value="KG_FACILITATOR">Kindergarten</option>
                      <option value="BASIC_SUBJECT_LEVEL">Basic (1-6)</option>
                      <option value="JHS_SPECIALIST">JHS Specialist (7-9)</option>
                    </select>
                 </div>
                 <button onClick={addStaff} disabled={isProvisioning} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-indigo-700 transition-all">
                    {isProvisioning ? 'Syncing...' : 'Provision Facilitator +'}
                 </button>
              </div>
           </div>

           <div className="lg:col-span-8 bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100">
              <div className="flex justify-between items-center mb-8 border-b-2 border-slate-50 pb-4">
                <div>
                   <h4 className="text-xl font-black uppercase tracking-tight">Faculty Matrix</h4>
                   <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mt-1">{data.staff.length} Managed Identities</p>
                </div>
                <button onClick={() => staffImportRef.current?.click()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg hover:bg-black transition-all">Import CSV 📥</button>
                <input type="file" ref={staffImportRef} className="hidden" accept=".csv" />
              </div>
              <div className="grid grid-cols-1 gap-3">
                 {data.staff.map(s => (
                   <div key={s.id} className="p-5 bg-slate-50 rounded-[2rem] flex items-center justify-between group hover:bg-white hover:border-indigo-200 border-2 border-transparent transition-all shadow-sm">
                      <div className="flex items-center gap-5">
                         <div className="w-12 h-12 bg-slate-950 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg">{s.name.charAt(0)}</div>
                         <div>
                            <div className="font-black text-slate-900 uppercase text-[11px] tracking-tight">{s.name}</div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{s.category.replace('_', ' ')} • PIN: <span className="text-indigo-600">{s.uniqueCode}</span></div>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setActiveMappingStaff(s)} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-indigo-700 transition-all">Academic Mapping</button>
                        <button onClick={() => removeStaff(s.id)} className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-200 hover:text-rose-500 border border-slate-100 transition-all opacity-0 group-hover:opacity-100 shadow-sm"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      )}

      {activeTab === 'PUPILS' && (
        <div className="bg-white rounded-[3.5rem] p-10 md:p-14 shadow-xl border border-slate-100 animate-in space-y-12">
           <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-8">
              <div>
                 <h4 className="text-4xl font-black uppercase tracking-tighter">Pupil Command</h4>
                 <p className="text-indigo-600 font-black text-xs uppercase tracking-widest mt-2">{totalPupils} Active Entities Transmitting</p>
              </div>
              <div className="flex flex-wrap gap-4">
                 <button onClick={handleMassPromotion} className="bg-amber-500 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[10px] shadow-xl hover:bg-amber-600 transition-all active:scale-95">Mass Promotion ⬆️</button>
                 <button onClick={() => pupilImportRef.current?.click()} className="bg-slate-950 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[10px] shadow-xl hover:bg-black transition-all active:scale-95">Batch Import 📥</button>
                 <input type="file" ref={pupilImportRef} className="hidden" accept=".csv" />
              </div>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 bg-slate-50 p-6 rounded-[3rem] shadow-inner overflow-x-auto scrollbar-hide">
              {Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes).map(c => (
                <button key={c} onClick={() => setRegistryClass(c)} className={`p-5 rounded-[1.8rem] border-4 transition-all font-black uppercase text-[10px] whitespace-nowrap ${registryClass === c ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-white border-transparent text-slate-400 hover:bg-indigo-50'}`}>{c}</button>
              ))}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {(data.masterPupils?.[registryClass] || []).map((p, i) => (
                <div key={i} className="p-6 bg-white rounded-[2.5rem] border-4 border-slate-50 flex items-center justify-between group hover:border-indigo-100 transition-all shadow-sm">
                   <div className="flex items-center gap-5 truncate">
                      <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-md">{p.name.charAt(0)}</div>
                      <div className="truncate">
                        <div className="font-black uppercase text-[12px] text-slate-950 truncate tracking-tight">{p.name}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.studentId || 'NO ID'}</div>
                      </div>
                   </div>
                   <button onClick={() => setEditingPupil({ entry: {...p}, oldClass: registryClass })} className="p-3 text-slate-200 hover:text-indigo-600 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                   </button>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* ACADEMIC DUTY MAPPING MODAL (Micro text size for high density) */}
      {activeMappingStaff && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white rounded-[3rem] p-8 md:p-12 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-slate-900">
              <div className="flex justify-between items-start mb-8 shrink-0 border-b-2 border-slate-50 pb-6">
                 <div>
                    <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Academic Domain Allocation</h4>
                    <div className="flex items-center gap-3 mt-2">
                       <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-lg font-black shadow-lg">{activeMappingStaff.name.charAt(0)}</div>
                       <div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.1em]">{activeMappingStaff.name}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{activeMappingStaff.category.replace('_', ' ')}</p>
                       </div>
                    </div>
                 </div>
                 <button onClick={() => setActiveMappingStaff(null)} className="text-slate-300 hover:text-rose-500 p-2 bg-slate-50 rounded-full transition-all hover:rotate-90 shadow-sm"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>

              <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
                 {/* LEFT PANE: CONFIGURATION */}
                 <div className="lg:w-3/5 flex flex-col h-full space-y-6">
                    <div className="space-y-2 shrink-0">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Target Department / Class</label>
                       <select 
                         className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-slate-950 uppercase text-sm outline-none focus:border-indigo-600 transition-all shadow-inner appearance-none cursor-pointer"
                         value={targetClass}
                         onChange={(e) => { setTargetClass(e.target.value); setTempAssignments({}); }}
                       >
                         {Object.entries(SCHOOL_HIERARCHY).map(([group, config]) => (
                            <optgroup key={group} label={config.label.toUpperCase()} className="font-black text-[9px] text-indigo-600 bg-white">
                               {config.classes.map(c => <option key={c} value={c} className="text-slate-900 text-xs">{c}</option>)}
                            </optgroup>
                         ))}
                       </select>
                    </div>

                    <div className="flex-1 flex flex-col overflow-hidden space-y-3">
                       <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-1">Map Subjects for {targetClass}</label>
                          <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full uppercase">{getGroupForClass(targetClass)} CURRICULUM</span>
                       </div>
                       
                       <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-indigo-100 scrollbar-track-transparent">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-6">
                             {SUBJECTS_BY_GROUP[getGroupForClass(targetClass)].map(sub => (
                               <label key={sub} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer group ${tempAssignments[sub] ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-white hover:border-slate-200'}`}>
                                 <input type="checkbox" className="hidden" checked={!!tempAssignments[sub]} onChange={() => setTempAssignments(p => ({...p, [sub]: !p[sub]}))} />
                                 <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${tempAssignments[sub] ? 'bg-white border-white' : 'border-slate-300'}`}>{tempAssignments[sub] && <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}</div>
                                 <span className="text-[11px] font-black uppercase leading-tight tracking-tight">{sub}</span>
                               </label>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* RIGHT PANE: CURRENT LOAD */}
                 <div className="lg:w-2/5 flex flex-col bg-slate-900 rounded-[2rem] p-6 overflow-hidden">
                    <h5 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 shrink-0">Current Node Load</h5>
                    <div className="flex-1 overflow-y-auto pr-1 scrollbar-hide">
                       <div className="space-y-2">
                          {data.mappings.filter(m => m.staffId === activeMappingStaff.id).map((m, idx) => (
                             <div key={idx} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between group/item">
                                <div className="truncate">
                                   <div className="text-[10px] font-black text-white uppercase truncate">{data.subjects.find(s => s.id === m.subjectId)?.name || m.subjectId}</div>
                                   <div className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">{m.className}</div>
                                </div>
                                <button onClick={() => removeMapping(m.id)} className="p-1.5 text-white/20 hover:text-rose-500 transition-colors opacity-0 group-hover/item:opacity-100">
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                             </div>
                          ))}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="mt-8 pt-6 border-t-2 border-slate-50 flex gap-4 shrink-0">
                 <button onClick={() => setActiveMappingStaff(null)} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 transition-all">Discard</button>
                 <button onClick={handleAssignDuties} className="flex-[2] bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-black transition-all">Confirm Assignments</button>
              </div>
           </div>
        </div>
      )}
      
      {activeTab === 'REWARDS' && <FacilitatorRewardPortal data={data} fullState={fullState} />}
      {activeTab === 'ARCHIVE' && <ArchivePortal fullState={fullState} />}
    </div>
  );
};

export default AdminPanel;