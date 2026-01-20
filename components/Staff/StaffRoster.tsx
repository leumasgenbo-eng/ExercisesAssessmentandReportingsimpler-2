import React, { useState, useMemo, useRef } from 'react';
import { ManagementState, Staff, FacilitatorRoleType, EmploymentType, FacilitatorSubjectMapping, SchoolGroup, AppState, AssessmentData, ExerciseMetadata } from '../../types';
import { SCHOOL_HIERARCHY, SUBJECTS_BY_GROUP, WEEK_COUNT } from '../../constants';

interface Props {
  data: ManagementState;
  onUpdate: (data: ManagementState) => void;
  selectedStaffId: string | null;
  onSelectStaff: (id: string) => void;
  activeMappingType: FacilitatorRoleType;
  setActiveMappingType: (t: FacilitatorRoleType) => void;
  activeEmployment: EmploymentType;
  setActiveEmployment: (t: EmploymentType) => void;
  fullAppState?: AppState;
}

const StaffRoster: React.FC<Props> = ({ 
  data, onUpdate, selectedStaffId, onSelectStaff, 
  activeMappingType, setActiveMappingType, activeEmployment, setActiveEmployment,
  fullAppState
}) => {
  const [newName, setNewName] = useState('');
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [targetClass, setTargetClass] = useState('Basic 1A');
  const [tempAssignments, setTempAssignments] = useState<Record<string, boolean>>({});
  const [isRosterFocus, setIsRosterFocus] = useState(false);
  
  const staffFileInputRef = useRef<HTMLInputElement>(null);

  // Subject Summary State
  const [isSubjectSummaryOpen, setIsSubjectSummaryOpen] = useState(false);
  const [summaryClass, setSummaryClass] = useState('Basic 1A');
  const [summarySubject, setSummarySubject] = useState('');
  const [summaryWeek, setSummaryWeek] = useState('ALL'); 
  const [summaryMonth, setSummaryMonth] = useState('MONTH 1');
  const [summaryTerm, setSummaryTerm] = useState('1ST TERM');

  // Live Grid Filters
  const [gridClass, setGridClass] = useState('');
  const [gridSubject, setGridSubject] = useState('');

  const generateCode = (staffId: string) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const updatedStaff = data.staff.map(s => s.id === staffId ? { ...s, uniqueCode: code } : s);
    onUpdate({ ...data, staff: updatedStaff });
  };

  const addStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;
    const newS: Staff = { 
      id: `s-${Date.now()}`, 
      name: newName.toUpperCase(), 
      role: 'Facilitator', 
      email: '',
      uniqueCode: '' 
    };
    onUpdate({ ...data, staff: [...data.staff, newS] });
    setNewName('');
  };

  const handleBulkDownload = (format: 'CSV' | 'JSON') => {
    if (data.staff.length === 0) {
      alert("Registry is currently empty.");
      return;
    }

    let content = '';
    let fileName = `Facilitator_Roster_${new Date().toISOString().split('T')[0]}`;
    let mimeType = '';

    if (format === 'CSV') {
      const headers = ['ID', 'Name', 'Role', 'Email', 'UniqueCode'];
      const rows = data.staff.map(s => [s.id, s.name, s.role, s.email, s.uniqueCode || '']);
      content = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
      fileName += '.csv';
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(data.staff, null, 2);
      fileName += '.json';
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      let newStaff: Staff[] = [];
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            newStaff = parsed.map((s: any, idx: number) => ({
              id: s.id || `s-up-${Date.now()}-${idx}`,
              name: (s.name || '').toUpperCase(),
              role: s.role || 'Facilitator',
              email: s.email || '',
              uniqueCode: s.uniqueCode || ''
            }));
          }
        } else {
          const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
          const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
          
          newStaff = lines.slice(1).map((line, idx) => {
            const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
            const s: any = { id: `s-up-${Date.now()}-${idx}`, role: 'Facilitator' };
            
            headers.forEach((h, hIdx) => {
              if (h === 'name') s.name = parts[hIdx]?.toUpperCase();
              if (h === 'role') s.role = parts[hIdx] || 'Facilitator';
              if (h === 'email') s.email = parts[hIdx] || '';
              if (h === 'uniquecode' || h === 'code') s.uniqueCode = parts[hIdx] || '';
              if (h === 'id' && parts[hIdx]) s.id = parts[hIdx];
            });
            return s as Staff;
          }).filter(s => s.name);
        }

        if (newStaff.length > 0) {
          const existingNames = new Set(data.staff.map(s => s.name));
          const trulyNew = newStaff.filter(s => !existingNames.has(s.name));
          onUpdate({ ...data, staff: [...data.staff, ...trulyNew] });
          alert(`Successfully ingested ${trulyNew.length} new facilitator records.`);
        }
      } catch (err) {
        alert("CRITICAL ERROR: Failed to parse the roster file. Ensure standard formatting.");
      }
    };
    reader.readAsText(file);
    if (staffFileInputRef.current) staffFileInputRef.current.value = '';
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
        const subId = data.subjects.find(s => s.name === subName)?.id || subName;
        return {
          id: `map-${Date.now()}-${Math.random()}`,
          staffId: selectedStaffId,
          className: targetClass,
          subjectId: subId,
          type: activeMappingType,
          employmentType: activeEmployment
        };
      });

    onUpdate({ ...data, mappings: [...data.mappings, ...newMappings] });
    setIsMatrixOpen(false);
    setTempAssignments({});
  };

  const removeMapping = (id: string) => {
    if (!confirm("Remove this duty assignment?")) return;
    onUpdate({ ...data, mappings: data.mappings.filter(m => m.id !== id) });
  };

  const filteredMappings = useMemo(() => {
    return data.mappings.filter(m => {
      const subName = data.subjects.find(s => s.id === m.subjectId)?.name || m.subjectId;
      if (gridClass && m.className !== gridClass) return false;
      if (gridSubject && subName !== gridSubject) return false;
      if (selectedStaffId && m.staffId !== selectedStaffId) return false;
      return true;
    });
  }, [data.mappings, gridClass, gridSubject, selectedStaffId, data.subjects]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start transition-all duration-700">
      {!isRosterFocus && (
        <div className="lg:w-[350px] w-full bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 flex flex-col shrink-0 animate-in slide-in-from-left-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">Registry</h3>
            <div className="flex gap-2">
               <button onClick={() => handleBulkDownload('CSV')} className="p-2 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all" title="Export Roster (CSV)">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
               </button>
               <button onClick={() => staffFileInputRef.current?.click()} className="p-2 bg-slate-50 text-slate-400 hover:text-sky-600 rounded-lg transition-all" title="Bulk Import Roster">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
               </button>
               <input type="file" ref={staffFileInputRef} onChange={handleBulkUpload} className="hidden" accept=".csv,.json" />
            </div>
          </div>
          
          <form onSubmit={addStaff} className="space-y-3 mb-8">
            <input className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-slate-900 text-xs outline-none uppercase" placeholder="Full Name..." value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button className="w-full bg-sky-950 text-white font-black uppercase text-[10px] py-4 rounded-2xl shadow-lg hover:bg-black transition-all">Add Facilitator</button>
          </form>

          <div className="space-y-2 overflow-y-auto max-h-[500px] scrollbar-hide">
            {data.staff.map(s => (
              <div key={s.id} onClick={() => onSelectStaff(s.id)} className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-4 ${selectedStaffId === s.id ? 'bg-sky-50 border-sky-600 shadow-md' : 'bg-white border-transparent'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${selectedStaffId === s.id ? 'bg-sky-600 text-white' : 'bg-slate-900 text-white'}`}>{s.name.charAt(0)}</div>
                <div className="truncate flex-1">
                  <div className="font-black uppercase text-[11px] text-slate-900">{s.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="text-[9px] font-bold uppercase text-slate-400">{s.role}</div>
                    {s.uniqueCode && <span className="bg-emerald-500/10 text-emerald-600 text-[7px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">CODE: {s.uniqueCode}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`flex-1 space-y-8 w-full transition-all duration-700`}>
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-xl min-h-[500px]">
          {selectedStaffId && (
            <div className="mb-10 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 animate-in fade-in duration-500">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <h4 className="text-xl font-black text-slate-900 uppercase">Credential Management</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Access Protocol for {data.staff.find(s => s.id === selectedStaffId)?.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="bg-white px-8 py-3 rounded-2xl border-2 border-slate-200 flex flex-col items-center shadow-sm">
                        <span className="text-[8px] font-black text-slate-300 uppercase mb-1">Active Login Code</span>
                        <span className="text-2xl font-black text-indigo-600 tracking-[0.3em]">{data.staff.find(s => s.id === selectedStaffId)?.uniqueCode || '------'}</span>
                     </div>
                     <button 
                       onClick={() => generateCode(selectedStaffId)} 
                       className="bg-sky-950 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-black transition-all"
                     >
                        {data.staff.find(s => s.id === selectedStaffId)?.uniqueCode ? 'Refresh Code' : 'Generate Code'}
                     </button>
                  </div>
               </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 border-b border-slate-50 pb-8">
             <div className="flex items-center gap-4">
               <h3 className="text-2xl font-black text-slate-900 uppercase">Mapping Matrix</h3>
               <button onClick={() => setIsMatrixOpen(true)} disabled={!selectedStaffId} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedStaffId ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-300'}`}>Assign Responsibilities</button>
             </div>
             <div className="flex gap-3">
                <select className="bg-slate-50 border-none px-4 py-2 rounded-xl font-black text-slate-900 uppercase text-[10px] outline-none" value={gridClass} onChange={(e) => setGridClass(e.target.value)}><option value="">- CLASS -</option>{Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes).map(c => <option key={c} value={c}>{c}</option>)}</select>
                <select className="bg-slate-50 border-none px-4 py-2 rounded-xl font-black text-slate-900 uppercase text-[10px] outline-none" value={gridSubject} onChange={(e) => setGridSubject(e.target.value)}><option value="">- SUBJECT -</option>{Array.from(new Set(data.subjects.map(s => s.name))).map(s => <option key={s} value={s}>{s}</option>)}</select>
             </div>
          </div>

          <div className={`grid grid-cols-1 md:grid-cols-2 ${isRosterFocus ? 'xl:grid-cols-4' : 'xl:grid-cols-3'} gap-4 transition-all duration-700`}>
            {filteredMappings.map(m => {
              const staff = data.staff.find(s => s.id === m.staffId);
              const subName = data.subjects.find(s => s.id === m.subjectId)?.name || m.subjectId;
              return (
                <div key={m.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-center gap-5 hover:bg-white hover:border-sky-500 hover:shadow-2xl transition-all group animate-in">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-black shrink-0">{staff?.name.charAt(0)}</div>
                  <div className="flex-1 truncate">
                    <div className="font-black text-slate-900 uppercase text-xs">{staff?.name}</div>
                    <div className="text-[10px] font-bold text-sky-600 uppercase truncate">{subName}</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase mt-1">{m.className}</div>
                    {staff?.uniqueCode && <div className="text-[7px] font-black text-indigo-400 uppercase mt-1">Code: {staff.uniqueCode}</div>}
                  </div>
                  <button onClick={() => removeMapping(m.id)} className="p-3 text-slate-200 hover:text-rose-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isMatrixOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-white rounded-[3rem] p-10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-slate-900">
              <div className="flex justify-between items-start mb-8 shrink-0">
                 <div><h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-2">Matrix Builder</h4><p className="text-[11px] font-black text-sky-600 uppercase tracking-widest">Assigning to: {data.staff.find(s => s.id === selectedStaffId)?.name}</p></div>
                 <button onClick={() => setIsMatrixOpen(false)} className="text-slate-300 hover:text-rose-500 p-3 bg-slate-50 rounded-full transition-all"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="flex-1 overflow-y-auto pr-4 space-y-10 scrollbar-hide">
                 <div className="space-y-4">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block ml-1">Select Target Scope</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl font-black text-slate-900 uppercase text-sm outline-none focus:border-sky-600 transition-all shadow-inner" value={targetClass} onChange={(e) => setTargetClass(e.target.value)}>{Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes).map(c => <option key={c} value={c}>{c}</option>)}</select>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentSubjects.map(sub => (
                      <label key={sub} className={`flex items-center gap-4 p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${tempAssignments[sub] ? 'bg-sky-600 border-sky-600 text-white shadow-xl' : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'}`}>
                        <input type="checkbox" className="hidden" checked={!!tempAssignments[sub]} onChange={() => setTempAssignments(prev => ({...prev, [sub]: !prev[sub]}))} />
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${tempAssignments[sub] ? 'bg-white border-white' : 'border-slate-300'}`}>{tempAssignments[sub] && <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}</div>
                        <span className="text-[11px] font-black uppercase leading-tight">{sub}</span>
                      </label>
                    ))}
                 </div>
              </div>
              <div className="mt-10 pt-8 border-t border-slate-100 flex gap-4 shrink-0"><button onClick={() => setIsMatrixOpen(false)} className="flex-1 py-5 border-2 border-slate-100 text-slate-400 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all">Discard</button><button onClick={handleApplyGrid} className="flex-[2] bg-sky-950 text-white py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-black transition-all">Apply Grid</button></div>
           </div>
        </div>
      )}
    </div>
  );
};

export default StaffRoster;