import React, { useRef, useState, useMemo } from 'react';
import { ManagementState, AppState, MasterPupilEntry, Staff, FacilitatorCategory, FacilitatorSubjectMapping, SchoolGroup, StaffSchedule, ScheduleSlot } from '../../types';
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

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

// Mapping user-facing categories to internal SchoolGroup keys for subject lookup
const CATEGORY_TO_GROUP: Record<string, SchoolGroup> = {
  "Basic 7-9": "JHS",
  "BASIC 4-6": "UPPER_BASIC",
  "BASIC 1-3": "LOWER_BASIC",
  "SECTION A, B": "LOWER_BASIC",
  "KINDERGARTEN 1, 2": "KINDERGARTEN",
  "NURSERY 1, 2": "DAYCARE"
};

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  data, fullState, onUpdateManagement, onResetSystem, onRestoreSystem
}) => {
  const staffImportRef = useRef<HTMLInputElement>(null);
  const pupilImportRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'STAFF' | 'PUPILS' | 'REWARDS' | 'ARCHIVE'>('IDENTITY');
  const [staffSubTab, setStaffSubTab] = useState<'ENROLL' | 'MATRIX' | 'TIMETABLE' | 'SCHEDULE'>('ENROLL');
  const [registryClass, setRegistryClass] = useState('Basic 1A');
  const [isProvisioning, setIsProvisioning] = useState(false);
  
  // Assignment Matrix State
  const [activeMappingStaff, setActiveMappingStaff] = useState<Staff | null>(null);
  const [targetClass, setTargetClass] = useState('Basic 1A');
  const [tempAssignments, setTempAssignments] = useState<Record<string, boolean>>({});

  // Editing State
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  const totalPupils = useMemo(() => (Object.values(data?.masterPupils || {}) as MasterPupilEntry[][]).reduce((a, c) => a + (c?.length || 0), 0), [data?.masterPupils]);

  const handleUpdateSetting = (field: string, value: any) => onUpdateManagement({ ...data, settings: { ...data.settings, [field]: value } });

  const getGroupForClass = (cls: string): SchoolGroup => {
    for (const [group, config] of Object.entries(SCHOOL_HIERARCHY)) { 
      if (config.classes.includes(cls)) return group as SchoolGroup; 
    }
    return 'LOWER_BASIC';
  };

  // --- STAFF COMMANDS ---
  const [newStaff, setNewStaff] = useState({ 
    name: '', 
    email: '', 
    displayCategory: 'BASIC 1-3',
    selectedDisciplines: [] as string[]
  });

  const availableSubjectsForNewStaff = useMemo(() => {
    const group = CATEGORY_TO_GROUP[newStaff.displayCategory];
    return SUBJECTS_BY_GROUP[group] || [];
  }, [newStaff.displayCategory]);

  const toggleDiscipline = (sub: string) => {
    setNewStaff(prev => ({
      ...prev,
      selectedDisciplines: prev.selectedDisciplines.includes(sub)
        ? prev.selectedDisciplines.filter(s => s !== sub)
        : [...prev.selectedDisciplines, sub]
    }));
  };

  const addStaff = async () => {
    if (!newStaff.name || !newStaff.email) {
      alert("Name and Email are required for Identity Provisioning.");
      return;
    }
    setIsProvisioning(true);
    
    // Maintain existing PIN if editing
    const existing = data.staff.find(s => s.id === editingStaffId);
    const pin = existing?.uniqueCode || Math.floor(100000 + Math.random() * 900000).toString();
    
    let internalCat: FacilitatorCategory = 'BASIC_SUBJECT_LEVEL';
    if (newStaff.displayCategory.includes("7-9")) internalCat = 'JHS_SPECIALIST';
    if (newStaff.displayCategory.includes("KINDERGARTEN")) internalCat = 'KG_FACILITATOR';
    if (newStaff.displayCategory.includes("NURSERY")) internalCat = 'DAYCARE_FACILITATOR';

    const staffObj: Staff = { 
      id: editingStaffId || newStaff.email.toLowerCase(), 
      name: newStaff.name.toUpperCase(), 
      email: newStaff.email.toLowerCase(), 
      role: 'facilitator', 
      category: internalCat, 
      uniqueCode: pin,
      primaryDiscipline: newStaff.selectedDisciplines.join(', ')
    };

    try {
      await SupabaseSync.registerSchool({ 
        name: staffObj.name, 
        nodeId: data.settings.institutionalId, 
        email: staffObj.email, 
        hubId: data.settings.hubId, 
        originGate: 'FACILITATOR' 
      });
      
      const filteredStaff = (data.staff || []).filter(s => s.id !== staffObj.id);
      onUpdateManagement({ ...data, staff: [...filteredStaff, staffObj] });
      
      setNewStaff({ name: '', email: '', displayCategory: 'BASIC 1-3', selectedDisciplines: [] });
      setEditingStaffId(null);
      alert(editingStaffId ? "Faculty Identity Node Updated." : `Facilitator Node Provisioned.\nPIN: ${pin}`);
    } catch (e) { 
      alert("Cloud Sync Latency: Node saved locally."); 
      const filteredStaff = (data.staff || []).filter(s => s.id !== staffObj.id);
      onUpdateManagement({ ...data, staff: [...filteredStaff, staffObj] });
    } finally { 
      setIsProvisioning(false); 
    }
  };

  const removeStaff = (id: string) => {
    if (!confirm("CRITICAL: Permanently de-provision this facilitator and purge all duty logs?")) return;
    onUpdateManagement({ 
      ...data, 
      staff: (data.staff || []).filter(s => s.id !== id), 
      mappings: (data.mappings || []).filter(m => m.staffId !== id),
      schedules: (data.schedules || []).filter(s => s.staffId !== id)
    });
  };

  const editStaff = (staff: Staff) => {
    setEditingStaffId(staff.id);
    setNewStaff({
      name: staff.name,
      email: staff.email,
      displayCategory: Object.keys(CATEGORY_TO_GROUP).find(k => {
          if (k.includes("7-9") && staff.category === 'JHS_SPECIALIST') return true;
          if (k.includes("KINDERGARTEN") && staff.category === 'KG_FACILITATOR') return true;
          if (k.includes("NURSERY") && staff.category === 'DAYCARE_FACILITATOR') return true;
          return false;
      }) || "BASIC 1-3",
      selectedDisciplines: staff.primaryDiscipline ? staff.primaryDiscipline.split(', ') : []
    });
    setStaffSubTab('ENROLL');
  };

  const downloadKeycard = (staff: Staff) => {
    const textContent = `
UNITED BAYLOR ACADEMY - NODE ACCESS KEYCARD
==========================================
LEGAL IDENTITY: ${staff.name}
OFFICIAL EMAIL: ${staff.email}
PRIMARY DISCIPLINE: ${staff.primaryDiscipline || 'GENERALIST'}

INSTITUTIONAL NODE ID: ${data.settings.institutionalId}
HUB ACCESS ID: ${data.settings.hubId}

SECRET GATEWAY PIN: ${staff.uniqueCode}
==========================================
PROTOCOL: Present this card at the Identity Gateway to access your academic terminal. Keep this PIN confidential.
    `.trim();

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AccessCard_${staff.name.replace(/\s+/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const forwardCreds = (staff: Staff) => {
    const subject = encodeURIComponent(`Access Credentials: ${data.settings.name} Academic Node`);
    const body = encodeURIComponent(`
Hello ${staff.name},

Your academic node for ${data.settings.name} has been provisioned.

NODE ID: ${data.settings.institutionalId}
SECRET GATEWAY PIN: ${staff.uniqueCode}

Please use these credentials at the Identity Gateway to access your Broad Sheet and Assessment tools.
    `.trim());
    window.location.href = `mailto:${staff.email}?subject=${subject}&body=${body}`;
  };

  const removeMapping = (id: string) => {
    onUpdateManagement({
      ...data,
      mappings: (data.mappings || []).filter(m => m.id !== id)
    });
  };

  const handleMassPromotion = () => {
    if (!confirm("CRITICAL: Promote all pupils to the next academic level? This action modifies the master registry.")) return;
    
    const newMasterPupils: Record<string, MasterPupilEntry[]> = {};
    const groups = Object.keys(SCHOOL_HIERARCHY) as SchoolGroup[];
    const orderedClasses = groups.flatMap(g => SCHOOL_HIERARCHY[g].classes);
    
    orderedClasses.forEach((cls, idx) => {
      const pupils = data.masterPupils[cls] || [];
      if (pupils.length === 0) return;
      
      const nextClass = orderedClasses[idx + 1];
      if (nextClass) {
        newMasterPupils[nextClass] = [...(newMasterPupils[nextClass] || []), ...pupils];
      }
    });

    onUpdateManagement({ ...data, masterPupils: newMasterPupils });
    alert("Promotion cycle executed.");
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
          type: 'SUBJECT_BASED',
          employmentType: 'FULL_TIME'
        };
      });

    onUpdateManagement({
      ...data,
      mappings: [...(data.mappings || []), ...newMappings]
    });
    setActiveMappingStaff(null);
    setTempAssignments({});
  };

  const [activeTimetableStaff, setActiveTimetableStaff] = useState<string | null>(null);

  const handleUpdateSchedule = (day: string, period: number, className: string, subject: string) => {
    if (!activeTimetableStaff) return;
    const currentSchedules = data.schedules || [];
    const staffSched = currentSchedules.find(s => s.staffId === activeTimetableStaff) || { staffId: activeTimetableStaff, slots: [] };
    
    const newSlots = staffSched.slots.filter(s => !(s.day === day && s.period === period));
    if (className && subject) {
      newSlots.push({ day, period, className, subject });
    }

    const updatedSchedules = currentSchedules.filter(s => s.staffId !== activeTimetableStaff);
    updatedSchedules.push({ staffId: activeTimetableStaff, slots: newSlots });

    onUpdateManagement({ ...data, schedules: updatedSchedules });
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
                 <input className="w-full bg-slate-50 border-4 border-slate-100 p-6 rounded-3xl font-black uppercase text-sm outline-none focus:border-indigo-600 transition-all" value={data.settings?.name || ''} onChange={(e) => handleUpdateSetting('name', e.target.value)} />
              </div>
              <div className="space-y-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Shard Node ID</label>
                 <input className="w-full bg-indigo-50 border-4 border-indigo-100 p-6 rounded-3xl font-black text-indigo-600 text-sm outline-none" value={data.settings?.institutionalId || ''} onChange={(e) => handleUpdateSetting('institutionalId', e.target.value)} />
              </div>
           </div>
        </div>
      )}

      {activeTab === 'STAFF' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4">
           <div className="flex justify-center no-print">
              <div className="bg-white p-2 rounded-full border border-slate-200 shadow-xl flex gap-1">
                 {[
                   { id: 'ENROLL', label: 'Enrollment', icon: '📝' },
                   { id: 'MATRIX', label: 'Duty Matrix', icon: '⛓️' },
                   { id: 'TIMETABLE', label: 'Timetables', icon: '📅' },
                   { id: 'SCHEDULE', label: 'Master Schedule', icon: '🏛️' }
                 ].map(tab => (
                   <button 
                    key={tab.id} 
                    onClick={() => setStaffSubTab(tab.id as any)}
                    className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${staffSubTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
                   >
                     <span>{tab.icon}</span> {tab.label}
                   </button>
                 ))}
              </div>
           </div>

           {staffSubTab === 'ENROLL' && (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-5 bg-white rounded-[3rem] p-10 shadow-xl border-4 border-slate-900 h-fit">
                   <div className="flex justify-between items-start mb-8">
                      <h4 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                        <span className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg">{editingStaffId ? '✏️' : '⚡'}</span>
                        {editingStaffId ? 'Update Faculty' : 'Direct Enrollment'}
                      </h4>
                      {editingStaffId && (
                        <button onClick={() => { setEditingStaffId(null); setNewStaff({ name: '', email: '', displayCategory: 'BASIC 1-3', selectedDisciplines: [] }); }} className="text-rose-500 font-black text-[10px] uppercase underline">Cancel Edit</button>
                      )}
                   </div>
                   <div className="space-y-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Legal Identity</label>
                         <input className="w-full bg-slate-50 border-4 border-slate-100 p-5 rounded-[1.5rem] font-black uppercase text-xs focus:border-indigo-600 transition-all" placeholder="FULL NAME..." value={newStaff.name} onChange={(e) => setNewStaff({...newStaff, name: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Official Email</label>
                         <input className="w-full bg-slate-50 border-4 border-slate-100 p-5 rounded-[1.5rem] font-black text-xs focus:border-indigo-600 transition-all" placeholder="OFFICIAL@ACADEMY.COM" value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} />
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Academic Category</label>
                         <select 
                            className="w-full bg-slate-50 border-4 border-slate-100 p-5 rounded-[1.5rem] font-black text-xs uppercase appearance-none cursor-pointer focus:border-indigo-600" 
                            value={newStaff.displayCategory} 
                            onChange={(e) => setNewStaff({...newStaff, displayCategory: e.target.value, selectedDisciplines: []})}
                          >
                            <option value="Basic 7-9">Basic 7-9</option>
                            <option value="BASIC 4-6">BASIC 4-6</option>
                            <option value="BASIC 1-3">BASIC 1-3</option>
                            <option value="SECTION A, B">SECTION A, B</option>
                            <option value="KINDERGARTEN 1, 2">KINDERGARTEN 1, 2</option>
                            <option value="NURSERY 1, 2">NURSERY 1, 2</option>
                         </select>
                      </div>

                      <div className="space-y-3 bg-slate-50 p-6 rounded-[1.5rem] border-2 border-slate-100 shadow-inner max-h-[300px] overflow-y-auto">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Primary Discipline Assignment</label>
                         <div className="grid grid-cols-1 gap-2">
                            {availableSubjectsForNewStaff.map(sub => (
                              <label key={sub} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer group ${newStaff.selectedDisciplines.includes(sub) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-transparent text-slate-500 hover:bg-white hover:border-slate-200'}`}>
                                <input type="checkbox" className="hidden" checked={newStaff.selectedDisciplines.includes(sub)} onChange={() => toggleDiscipline(sub)} />
                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${newStaff.selectedDisciplines.includes(sub) ? 'bg-white border-white' : 'border-slate-300'}`}>{newStaff.selectedDisciplines.includes(sub) && <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}</div>
                                <span className="text-[10px] font-black uppercase tracking-tight leading-none">{sub}</span>
                              </label>
                            ))}
                         </div>
                      </div>

                      <button onClick={addStaff} disabled={isProvisioning} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-indigo-700 transition-all">
                         {isProvisioning ? 'PROVISIONING...' : (editingStaffId ? 'Confirm Updates' : 'Establish faculty Node')}
                      </button>
                   </div>
                </div>

                <div className="lg:col-span-7 bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
                   <div className="flex justify-between items-center mb-10 border-b-2 border-slate-50 pb-6">
                      <div>
                        <h4 className="text-2xl font-black uppercase tracking-tight">Active Faculty Registry</h4>
                        <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">{(data.staff || []).length} Logged Identities</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => staffImportRef.current?.click()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg">Bulk Upload 📥</button>
                        <input type="file" ref={staffImportRef} className="hidden" accept=".csv" />
                      </div>
                   </div>
                   <div className="space-y-3">
                      {(data.staff || []).map(s => (
                        <div key={s.id} className="p-6 bg-slate-50 rounded-[2.5rem] flex items-center justify-between group hover:bg-white hover:border-indigo-200 border-4 border-transparent transition-all">
                           <div className="flex items-center gap-6">
                              <div className="w-14 h-14 bg-slate-950 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">{s.name.charAt(0)}</div>
                              <div>
                                 <div className="font-black text-slate-900 uppercase text-sm tracking-tight">{s.name}</div>
                                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                   {s.primaryDiscipline || 'Generalist'} • <span className="text-indigo-600 font-black">{s.uniqueCode}</span>
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => downloadKeycard(s)} title="Notepad Text File" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-500 border border-slate-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                              <button onClick={() => forwardCreds(s)} title="Forward via Email" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-sky-500 border border-slate-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></button>
                              <button onClick={() => editStaff(s)} title="Edit Record" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 border border-slate-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                              <button onClick={() => removeStaff(s.id)} title="Delete Record" className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-200 hover:text-rose-500 border border-slate-100"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {staffSubTab === 'MATRIX' && (
             <div className="bg-white rounded-[3.5rem] p-10 md:p-14 shadow-xl border border-slate-100">
                <h4 className="text-3xl font-black uppercase mb-10 tracking-tight">Duty Allocation Matrix</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {(data.staff || []).map(s => (
                     <div key={s.id} className="bg-slate-50 p-8 rounded-[3rem] border-2 border-transparent hover:border-indigo-100 transition-all relative overflow-hidden group">
                        <div className="flex items-center gap-4 mb-6">
                           <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-lg">{s.name.charAt(0)}</div>
                           <div>
                              <div className="font-black text-slate-900 uppercase text-xs">{s.name}</div>
                              <div className="text-[8px] font-bold text-slate-400 uppercase">Load: {(data.mappings || []).filter(m => m.staffId === s.id).length} Domains</div>
                           </div>
                        </div>
                        <div className="space-y-2">
                           {(data.mappings || []).filter(m => m.staffId === s.id).map(m => (
                             <div key={m.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
                                <span className="text-[9px] font-black uppercase text-indigo-700">{data.subjects.find(sub => sub.id === m.subjectId)?.name || m.subjectId} @ {m.className}</span>
                                <button onClick={() => removeMapping(m.id)} className="text-slate-200 hover:text-rose-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
                             </div>
                           ))}
                        </div>
                        <button onClick={() => setActiveMappingStaff(s)} className="mt-6 w-full py-3 bg-white border-2 border-indigo-100 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Add Domain +</button>
                     </div>
                   ))}
                </div>
             </div>
           )}

           {staffSubTab === 'TIMETABLE' && (
             <div className="bg-white rounded-[3.5rem] p-10 md:p-14 shadow-xl border border-slate-100 space-y-12">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                   <h4 className="text-3xl font-black uppercase tracking-tight">Staff Timetable Architect</h4>
                   <select 
                    className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] font-black uppercase text-xs outline-none shadow-xl min-w-[300px]"
                    value={activeTimetableStaff || ''}
                    onChange={(e) => setActiveTimetableStaff(e.target.value)}
                   >
                      <option value="">-- SELECT FACILITATOR --</option>
                      {data.staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                   </select>
                </div>

                {!activeTimetableStaff ? (
                  <div className="py-40 text-center opacity-10 flex flex-col items-center">
                    <div className="text-[10rem]">🗓️</div>
                    <p className="font-black uppercase tracking-[0.5em] text-sm">Pick a facilitator node to begin scheduling</p>
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-4">
                     <div className="overflow-x-auto rounded-[3rem] border-4 border-slate-900 shadow-2xl">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                           <thead>
                              <tr className="bg-slate-900 text-white">
                                 <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest border-r border-white/5">PERIOD</th>
                                 {DAYS.map(day => (
                                   <th key={day} className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/5">{day}</th>
                                 ))}
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {PERIODS.map(period => (
                                <tr key={period} className="hover:bg-slate-50 transition-colors">
                                   <td className="px-8 py-10 font-black text-slate-400 text-center border-r border-slate-100 bg-slate-50/50">
                                      <div className="text-xl">P{period}</div>
                                      <div className="text-[8px] uppercase opacity-60">Academic Slot</div>
                                   </td>
                                   {DAYS.map(day => {
                                     const currentSched = (data.schedules || []).find(s => s.staffId === activeTimetableStaff);
                                     const slot = currentSched?.slots.find(s => s.day === day && s.period === period);
                                     const mappings = (data.mappings || []).filter(m => m.staffId === activeTimetableStaff);
                                     
                                     return (
                                       <td key={day} className="p-4 border-r border-slate-100">
                                          <div className="space-y-2">
                                             <select 
                                               className="w-full bg-white border-2 border-slate-100 p-2 rounded-xl text-[8px] font-black uppercase outline-none focus:border-indigo-600 transition-all"
                                               value={slot ? `${slot.className}|${slot.subject}` : ''}
                                               onChange={(e) => {
                                                 const [cls, sub] = e.target.value.split('|');
                                                 handleUpdateSchedule(day, period, cls, sub);
                                               }}
                                             >
                                                <option value="">FREE SLOT</option>
                                                {mappings.map(m => (
                                                  <option key={m.id} value={`${m.className}|${data.subjects.find(s => s.id === m.subjectId)?.name || m.subjectId}`}>
                                                    {m.className} • {data.subjects.find(s => s.id === m.subjectId)?.name || m.subjectId}
                                                  </option>
                                                ))}
                                             </select>
                                             {slot && (
                                               <div className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[7px] font-black uppercase text-center shadow-lg animate-in zoom-in-95">
                                                  {slot.className}
                                               </div>
                                             )}
                                          </div>
                                       </td>
                                     );
                                   })}
                                </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
                )}
             </div>
           )}

           {staffSubTab === 'SCHEDULE' && (
             <div className="bg-white rounded-[3.5rem] p-10 md:p-14 shadow-xl border border-slate-100 space-y-12">
                <h4 className="text-3xl font-black uppercase tracking-tight">Institutional Master Schedule</h4>
                <div className="overflow-x-auto rounded-[3rem] border-4 border-slate-100 shadow-2xl">
                   <table className="w-full text-left border-collapse min-w-[1200px]">
                      <thead>
                         <tr className="bg-slate-900 text-white">
                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest border-r border-white/5">DAY / PERIOD</th>
                            {PERIODS.map(p => (
                              <th key={p} className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-center border-r border-white/5">P{p}</th>
                            ))}
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {DAYS.map(day => (
                           <tr key={day} className="align-top">
                              <td className="px-8 py-10 font-black text-slate-900 border-r border-slate-200 bg-slate-50 uppercase text-sm">{day}</td>
                              {PERIODS.map(period => (
                                <td key={period} className="p-3 border-r border-slate-100 min-h-[150px]">
                                   <div className="space-y-1.5">
                                      {(data.schedules || []).map(s => {
                                        const slot = s.slots.find(sl => sl.day === day && sl.period === period);
                                        const staff = data.staff.find(st => st.id === s.staffId);
                                        if (!slot || !staff) return null;
                                        return (
                                          <div key={s.staffId} className="bg-white p-3 rounded-2xl border-2 border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-500 transition-all group">
                                             <div className="text-[7px] font-black uppercase text-indigo-600 mb-1">{staff.name.split(' ')[0]}</div>
                                             <div className="text-[8px] font-black text-slate-900 uppercase leading-none">{slot.className}</div>
                                             <div className="text-[6px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{slot.subject}</div>
                                          </div>
                                        );
                                      })}
                                   </div>
                                </td>
                              ))}
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
           )}
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
              {(data?.masterPupils?.[registryClass] || []).map((p, i) => (
                <div key={i} className="p-6 bg-white rounded-[2.5rem] border-4 border-slate-50 flex items-center justify-between group hover:border-indigo-100 transition-all shadow-sm">
                   <div className="flex items-center gap-5 truncate">
                      <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-lg shrink-0 shadow-md">{p.name.charAt(0)}</div>
                      <div className="truncate">
                        <div className="font-black uppercase text-[12px] text-slate-950 truncate tracking-tight">{p.name}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{p.studentId || 'NO ID'}</div>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* ACADEMIC DUTY MAPPING MODAL */}
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
                             {(SUBJECTS_BY_GROUP[getGroupForClass(targetClass)] || []).map(sub => (
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
                          {(data.mappings || []).filter(m => m.staffId === activeMappingStaff.id).map((m, idx) => (
                             <div key={idx} className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center justify-between group/item">
                                <div className="truncate">
                                   <div className="text-[10px] font-black text-white uppercase truncate">{data.subjects.find(s => s.id === m.subjectId)?.name || m.subjectId}</div>
                                   <div className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">{m.className}</div>
                                </div>
                                <button onClick={() => removeMapping(m.id)} className="p-1.5 text-white/20 hover:text-rose-500 transition-colors opacity-0 group-hover/item:opacity-100">
                                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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