import React, { useState, useMemo, useRef } from 'react';
import { ManagementState, Staff, FacilitatorRoleType, EmploymentType, FacilitatorSubjectMapping, SchoolGroup } from '../../types';
import { SCHOOL_HIERARCHY, SUBJECTS_BY_GROUP } from '../../constants';
import { SupabaseSync } from '../../lib/supabase';

interface Props {
  data: ManagementState;
  onUpdate: (data: ManagementState) => void;
  selectedStaffId: string | null;
  onSelectStaff: (id: string) => void;
  activeMappingType: FacilitatorRoleType;
  setActiveMappingType: (t: FacilitatorRoleType) => void;
  activeEmployment: EmploymentType;
  setActiveEmployment: (t: EmploymentType) => void;
}

const StaffRoster: React.FC<Props> = ({ 
  data, onUpdate, selectedStaffId, onSelectStaff, 
  activeMappingType, setActiveMappingType, activeEmployment, setActiveEmployment
}) => {
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [targetLevel, setTargetLevel] = useState<SchoolGroup>('LOWER_BASIC');
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [targetClass, setTargetClass] = useState('Basic 1A');
  const [tempAssignments, setTempAssignments] = useState<Record<string, boolean>>({});
  const [isProvisioning, setIsProvisioning] = useState(false);
  
  const staffImportRef = useRef<HTMLInputElement>(null);

  const staffList = data?.staff || [];
  const mappingsList = data?.mappings || [];

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  };

  const enrolFacilitator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;
    
    setIsProvisioning(true);
    const uniqueCode = generateCode();
    
    const newStaff: Staff = { 
      id: newEmail.toLowerCase(), 
      name: newName.toUpperCase(), 
      role: 'facilitator', 
      category: targetLevel === 'DAYCARE' ? 'DAYCARE_FACILITATOR' : targetLevel === 'KINDERGARTEN' ? 'KG_FACILITATOR' : targetLevel === 'JHS' ? 'JHS_SPECIALIST' : 'BASIC_SUBJECT_LEVEL',
      email: newEmail.toLowerCase(),
      uniqueCode 
    };

    try {
      await SupabaseSync.registerSchool({
        name: newStaff.name,
        nodeId: data.settings.institutionalId,
        email: newStaff.email,
        hubId: data.settings.hubId,
        originGate: 'FACILITATOR'
      });
      
      onUpdate({ ...data, staff: [...staffList, newStaff] });
      setNewName('');
      setNewEmail('');
      alert(`Enrolment Verified. PIN: ${uniqueCode}`);
    } catch (err) {
      console.error(err);
      alert("Handshake Error: Check cloud link. Identity saved locally.");
      onUpdate({ ...data, staff: [...staffList, newStaff] });
    } finally {
      setIsProvisioning(false);
    }
  };

  const downloadStaffList = () => {
    const headers = ['Name', 'Email', 'Category', 'Unique Code'];
    const rows = staffList.map(s => [s.name, s.email, s.category, s.uniqueCode]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Facilitator_Registry_${data.settings?.name || 'UBA'}.csv`;
    link.click();
  };

  const handleStaffImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').slice(1);
      const newStaffList = [...staffList];
      
      for (const line of lines) {
        const parts = line.split(',').map(s => s?.trim());
        if (parts.length < 2) continue;
        const [name, email, category] = parts;
        if (!name || !email) continue;
        const code = generateCode();
        const staffObj: Staff = { id: email.toLowerCase(), name: name.toUpperCase(), email: email.toLowerCase(), category: (category || 'BASIC_SUBJECT_LEVEL') as any, role: 'facilitator', uniqueCode: code };
        
        try {
          await SupabaseSync.registerSchool({ name: staffObj.name, nodeId: data.settings.institutionalId, email: staffObj.email, hubId: data.settings.hubId, originGate: 'FACILITATOR' });
          newStaffList.push(staffObj);
        } catch (e) { 
          newStaffList.push(staffObj);
        }
      }
      onUpdate({ ...data, staff: newStaffList });
      alert("Staff roster batch synchronized.");
    };
    reader.readAsText(file);
  };

  const forwardCredentials = (staff: Staff) => {
    const message = `UNITED BAYLOR ACADEMY\nNODE ACCESS KEYCARD\n\nName: ${staff.name}\nHub Node: ${data.settings?.institutionalId || 'MASTER'}\nSecret PIN: ${staff.uniqueCode}\n\nProtocol: Enter these details at the Identity Gateway.`;
    navigator.clipboard.writeText(message);
    alert("Keycard Payload Copied.");
  };

  const getGroupForClass = (cls: string): SchoolGroup => {
    for (const [group, config] of Object.entries(SCHOOL_HIERARCHY)) {
      if (config.classes.includes(cls)) return group as SchoolGroup;
    }
    return 'LOWER_BASIC';
  };

  const currentSubjects = useMemo(() => SUBJECTS_BY_GROUP[getGroupForClass(targetClass)] || [], [targetClass]);

  const handleApplyGrid = () => {
    if (!selectedStaffId) return;
    const newMappings: FacilitatorSubjectMapping[] = Object.entries(tempAssignments)
      .filter(([_, checked]) => checked)
      .map(([subName]) => {
        const subId = data?.subjects?.find(s => s.name === subName)?.id || subName;
        return {
          id: `map-${Date.now()}-${Math.random()}`,
          staffId: selectedStaffId,
          className: targetClass,
          subjectId: subId,
          type: activeMappingType,
          employmentType: activeEmployment
        };
      });

    onUpdate({ ...data, mappings: [...mappingsList, ...newMappings] });
    setIsMatrixOpen(false);
    setTempAssignments({});
  };

  const activeFacilitator = staffList.find(s => s.id === selectedStaffId);

  return (
    <div className="flex flex-col lg:flex-row gap-10 items-start animate-in">
      <div className="lg:w-[450px] w-full bg-white rounded-[3.5rem] p-10 shadow-2xl border-4 border-slate-900 flex flex-col shrink-0">
        <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black uppercase text-slate-950 tracking-tighter flex items-center gap-3">
            <span className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg">📥</span>
            Registry
            </h3>
            <div className="flex gap-1.5">
                <button onClick={downloadStaffList} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-900 transition-all shadow-sm" title="Download Staff CSV">⬇️</button>
                <button onClick={() => staffImportRef.current?.click()} className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 transition-all shadow-sm" title="Upload Staff CSV">⬆️</button>
                <input type="file" ref={staffImportRef} className="hidden" accept=".csv" onChange={handleStaffImport} />
            </div>
        </div>
        
        <form onSubmit={enrolFacilitator} className="space-y-6 mb-10">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Full Legal Name</label>
            <input className="w-full bg-slate-50 border-4 border-slate-100 p-5 rounded-[1.8rem] font-black text-slate-950 text-xs outline-none uppercase focus:border-indigo-600 transition-all shadow-inner" placeholder="FACILITATOR NAME..." value={newName} onChange={(e) => setNewName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Verified Email</label>
            <input type="email" className="w-full bg-slate-50 border-4 border-slate-100 p-5 rounded-[1.8rem] font-black text-slate-950 text-xs outline-none focus:border-indigo-600 transition-all shadow-inner" placeholder="STAFF@BAYLOR.EDU" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Academic Posting</label>
            <select className="w-full bg-slate-50 border-4 border-slate-100 p-5 rounded-[1.8rem] font-black text-slate-950 text-xs outline-none uppercase shadow-inner" value={targetLevel} onChange={(e) => setTargetLevel(e.target.value as SchoolGroup)}>
              {Object.keys(SCHOOL_HIERARCHY).map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <button disabled={isProvisioning} className="w-full bg-slate-950 text-white font-black uppercase text-[11px] tracking-[0.2em] py-6 rounded-[2rem] shadow-2xl hover:bg-black transition-all">
            {isProvisioning ? 'SYNCHRONIZING...' : 'Add & Sync to Cloud +'}
          </button>
        </form>

        <div className="space-y-3 overflow-y-auto max-h-[400px] scrollbar-hide pr-3">
          <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">Live Staff Node</div>
          {staffList.map(s => (
            <div key={s.id} onClick={() => onSelectStaff(s.id)} className={`p-5 rounded-[2rem] border-4 transition-all cursor-pointer flex items-center justify-between group ${selectedStaffId === s.id ? 'bg-indigo-50 border-indigo-600 shadow-xl' : 'bg-white border-transparent hover:bg-slate-50'}`}>
              <div className="flex items-center gap-4 truncate">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${selectedStaffId === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'}`}>{s.name?.charAt(0) || '?'}</div>
                <div className="truncate">
                  <div className="font-black uppercase text-[12px] text-slate-950 truncate tracking-tight">{s.name}</div>
                  <div className="text-[9px] font-bold uppercase text-indigo-400 tracking-widest">{s.category?.replace('_', ' ') || 'FACILITATOR'}</div>
                </div>
              </div>
              {selectedStaffId === s.id && (
                <button onClick={(e) => { e.stopPropagation(); forwardCredentials(s); }} className="p-3 bg-white text-indigo-600 rounded-xl shadow-lg border-2 border-indigo-100 transition-all" title="Forward Access Card">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-10 w-full">
        <div className="bg-white rounded-[4.5rem] p-12 md:p-16 shadow-2xl border-4 border-slate-50 min-h-[700px]">
          {selectedStaffId && activeFacilitator ? (
            <div className="animate-in fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-14 border-b-4 border-slate-50 pb-12">
                 <div>
                   <h3 className="text-4xl font-black text-slate-950 uppercase tracking-tighter">Duty Assignment Grid</h3>
                   <p className="text-[12px] font-bold text-indigo-500 uppercase tracking-[0.2em] mt-2">Allocating Academic Scope: {activeFacilitator.name}</p>
                 </div>
                 <div className="flex flex-wrap gap-4">
                    <div className="bg-slate-950 p-2 rounded-[2rem] flex gap-1 shadow-2xl">
                        <button onClick={() => setActiveMappingType('CLASS_BASED')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMappingType === 'CLASS_BASED' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500'}`}>Class Based</button>
                        <button onClick={() => setActiveMappingType('SUBJECT_BASED')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeMappingType === 'SUBJECT_BASED' ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-500'}`}>Subject Based</button>
                    </div>
                    <button onClick={() => setIsMatrixOpen(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95">Map Domains +</button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {mappingsList.filter(m => m.staffId === selectedStaffId).map(m => (
                  <div key={m.id} className="bg-slate-50 p-8 rounded-[3.5rem] border-4 border-transparent hover:border-indigo-100 hover:bg-white transition-all shadow-sm flex items-center justify-between group">
                    <div className="truncate pr-6">
                      <div className="text-[13px] font-black text-slate-950 uppercase truncate leading-none mb-2">{data?.subjects?.find(s => s.id === m.subjectId)?.name || m.subjectId}</div>
                      <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{m.className}</div>
                    </div>
                    <button onClick={() => onUpdate({ ...data, mappings: mappingsList.filter(map => map.id !== m.id) })} className="w-12 h-12 rounded-2xl bg-white text-slate-200 hover:text-rose-500 transition-all flex items-center justify-center shadow-sm">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-56 text-center opacity-10 flex flex-col items-center">
              <div className="text-[12rem] mb-12">👨‍🏫</div>
              <h4 className="text-3xl font-black uppercase tracking-[0.5em]">Identity Handshake Pending</h4>
              <p className="text-[12px] font-bold uppercase mt-4 tracking-[0.3em]">Establish curriculum scope for active staff.</p>
            </div>
          )}
        </div>
      </div>

      {isMatrixOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-2xl animate-in fade-in">
           <div className="bg-white rounded-[4.5rem] p-14 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_100px_200px_rgba(0,0,0,0.4)] border-4 border-slate-900">
              <div className="flex justify-between items-start mb-12 border-b-4 border-slate-50 pb-10 shrink-0">
                 <div>
                    <h4 className="text-4xl font-black text-slate-950 uppercase tracking-tighter leading-none mb-3">Academic Matrix Assignment</h4>
                    <p className="text-[12px] font-black text-indigo-600 uppercase tracking-[0.3em]">Allocating Domains to Node: {activeFacilitator?.name}</p>
                 </div>
                 <button onClick={() => setIsMatrixOpen(false)} className="text-slate-300 hover:text-rose-500 p-4 bg-slate-50 rounded-full transition-all hover:rotate-90">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-6 space-y-12 scrollbar-hide">
                 <div className="space-y-5">
                    <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest block ml-2">Academic Target Class</label>
                    <select className="w-full bg-slate-50 border-4 border-slate-100 p-6 rounded-[2.5rem] font-black text-slate-950 uppercase text-lg outline-none focus:border-indigo-600 transition-all shadow-inner" value={targetClass} onChange={(e) => setTargetClass(e.target.value)}>
                      {Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentSubjects.map(sub => (
                      <label key={sub} className={`flex items-center gap-6 p-8 rounded-[3rem] border-4 transition-all cursor-pointer ${tempAssignments[sub] ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xl' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100'}`}>
                        <input type="checkbox" className="hidden" checked={!!tempAssignments[sub]} onChange={() => setTempAssignments(prev => ({...prev, [sub]: !prev[sub]}))} />
                        <div className={`w-8 h-8 rounded-xl border-4 flex items-center justify-center transition-all shrink-0 ${tempAssignments[sub] ? 'bg-white border-white' : 'border-slate-300'}`}>{tempAssignments[sub] && <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}</div>
                        <span className="text-[13px] font-black uppercase leading-tight tracking-tight">{sub}</span>
                      </label>
                    ))}
                 </div>
              </div>
              <div className="mt-14 pt-10 border-t-4 border-slate-50 flex gap-6 shrink-0">
                 <button onClick={() => setIsMatrixOpen(false)} className="flex-1 py-7 border-4 border-slate-100 text-slate-400 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] hover:bg-slate-50 transition-all">Discard</button>
                 <button onClick={handleApplyGrid} className="flex-[2] bg-slate-950 text-white py-7 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-[0_30px_60px_rgba(0,0,0,0.3)] hover:bg-black transition-all active:scale-95">Confirm Allocation</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffRoster;