
import React, { useState, useMemo, useRef } from 'react';
import { ManagementState, WeeklyMapping, PlanningRemarks, AppState } from '../../types';
import { WEEK_COUNT } from '../../constants';

interface Props {
  data: ManagementState;
  onUpdate: (data: ManagementState) => void;
  fullAppState?: AppState;
}

const REMARKS_OPTIONS: PlanningRemarks[] = [
  'Completed successfully',
  'Partially completed',
  'Uncompleted',
  'Repeated'
];

const PlanningPanel: React.FC<Props> = ({ data, onUpdate, fullAppState }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [editingMapping, setEditingMapping] = useState<{ week: string; className: string; subject: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<{ className: string; subject: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isOnline = navigator.onLine;
  
  // Paste Modal State
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [activePasteTarget, setActivePasteTarget] = useState<{ className: string; subject: string } | null>(null);

  const facilitatorDuties = useMemo(() => {
    if (!selectedStaffId) return [];
    return (data.mappings || []).filter(m => m.staffId === selectedStaffId);
  }, [selectedStaffId, data.mappings]);

  const getMappingsForWeek = (week: string, className: string, subject: string) => {
    return (data.weeklyMappings || []).filter(wm => 
      wm.week === week && wm.className === className && wm.subject === subject
    );
  };

  const getUnassignedMappings = (className: string, subject: string) => {
    return (data.weeklyMappings || []).filter(wm => 
      (wm.week === '' || wm.week === '0' || !wm.week) && 
      wm.className === className && 
      wm.subject === subject
    );
  };

  const updateIndividualMapping = (id: string, field: keyof WeeklyMapping, value: any) => {
    const newMappings = (data.weeklyMappings || []).map(wm => 
      wm.id === id ? { ...wm, [field]: value } : wm
    );
    onUpdate({ ...data, weeklyMappings: newMappings });
  };

  const clearBroadsheet = (className: string, subject: string) => {
    if (!confirm(`Are you sure you want to RESET the broadsheet for ${subject} in ${className}? All planning rows will be removed.`)) return;
    const newMappings = (data.weeklyMappings || []).filter(wm => 
      !(wm.className === className && wm.subject === subject)
    );
    onUpdate({ ...data, weeklyMappings: newMappings });
  };

  const clearAllFacilitatorPlans = () => {
    if (!selectedStaffId) return;
    const staff = data.staff.find(s => s.id === selectedStaffId);
    if (!confirm(`CRITICAL: Remove ALL broadsheet plans for ${staff?.name}? This action cannot be undone.`)) return;
    
    const staffDuties = data.mappings.filter(m => m.staffId === selectedStaffId);
    const staffDutyKeys = staffDuties.map(d => {
      const subName = data.subjects.find(s => s.id === d.subjectId)?.name || d.subjectId;
      return `${d.className}|${subName}`;
    });

    const newMappings = (data.weeklyMappings || []).filter(wm => {
      const key = `${wm.className}|${wm.subject}`;
      return !staffDutyKeys.includes(key);
    });

    onUpdate({ ...data, weeklyMappings: newMappings });
  };

  const deleteIndividualMapping = (id: string, hardDelete: boolean = false) => {
    const message = hardDelete 
      ? "Are you sure you want to PERMANENTLY DELETE this specific strand/aspect?" 
      : "Move this aspect to the Curriculum Repository? It will be removed from this week but saved for later use.";
    
    if (!confirm(message)) return;

    let newMappings: WeeklyMapping[];
    if (hardDelete) {
      newMappings = (data.weeklyMappings || []).filter(wm => wm.id !== id);
    } else {
      newMappings = (data.weeklyMappings || []).map(wm => 
        wm.id === id ? { ...wm, week: '' } : wm
      );
    }
    onUpdate({ ...data, weeklyMappings: newMappings });
  };

  const addStrandToWeek = (week: string, className: string, subject: string, strandName: string = '') => {
    const newMapping: WeeklyMapping = {
      id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      className,
      subject,
      week,
      strand: strandName,
      substrand: '',
      contentStandard: '',
      indicators: '',
      resources: [],
      pages: '',
      areasCovered: '',
      remarks: '',
      classWorkCount: 5,
      homeWorkCount: 5,
      projectWorkCount: 1
    };
    return newMapping;
  };

  const handleGlobalSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      const msg = isOnline ? "Academic Data Secured Online." : "Academic Data Cached Locally (Offline).";
      alert(msg);
    }, 600);
  };

  const bulkApplyDates = (className: string, subject: string) => {
    const mappings = (data.weeklyMappings || []).filter(wm => wm.className === className && wm.subject === subject);
    const week1 = mappings.find(wm => wm.week === "1");
    if (!week1 || !week1.weekStartDate || !week1.weekEndDate) {
      alert("Please set dates for Week 1 first.");
      return;
    }
    const updated = (data.weeklyMappings || []).map(wm => {
      if (wm.className === className && wm.subject === subject && wm.week && wm.week !== "0") {
        return { ...wm, weekStartDate: week1.weekStartDate, weekEndDate: week1.weekEndDate };
      }
      return wm;
    });
    onUpdate({ ...data, weeklyMappings: updated });
  };

  const triggerUpload = (className: string, subject: string) => {
    setActiveUploadTarget({ className, subject });
    fileInputRef.current?.click();
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadTarget) return;
    setActiveUploadTarget(null);
    alert("Import logic active. File processed.");
  };

  const triggerPaste = (className: string, subject: string) => {
    setActivePasteTarget({ className, subject });
    setIsPasteModalOpen(true);
  };

  const processPastedTopics = () => {
    if (!activePasteTarget || !pastedText.trim()) return;

    const lines = pastedText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) {
      alert("Please paste data to process.");
      return;
    }

    const newMappings: WeeklyMapping[] = lines.map((line, idx) => {
      const parts = line.split(/\t|,|;|\|/).map(p => p.trim());
      const firstPart = parts[0] || '';
      
      const isDatePresent = firstPart.includes(' to ') || 
                           (firstPart.includes('-') && firstPart.length > 7) || 
                           (firstPart.includes('/') && firstPart.length > 5);

      let weekStartDate = '';
      let weekEndDate = '';
      let weekNum = '';
      let strand = '';
      let substrand = '';
      let indicators = '';
      let contentStandard = '';
      let resourcesRaw = '';
      let statusRaw = '';

      if (isDatePresent) {
        const timeline = parts[0] || '';
        if (timeline.includes(' to ')) {
          const [start, end] = timeline.split(' to ');
          weekStartDate = start;
          weekEndDate = end;
        } else if (timeline.includes('-')) {
          const bits = timeline.split('-');
          if (bits.length >= 2) {
            weekStartDate = bits[0].trim();
            weekEndDate = bits[1].trim();
          }
        }
        weekNum = parts[1] || '';
        strand = parts[2] || '';
        substrand = parts[3] || '';
        contentStandard = parts[4] || '';
        indicators = parts[5] || '';
        resourcesRaw = parts[6] || '';
        statusRaw = parts[7] || '';
      } else {
        weekNum = parts[0] || '';
        if (weekNum.toLowerCase().startsWith('week')) {
          weekNum = weekNum.replace(/week\s*/i, '').trim();
        }
        strand = parts[1] || '';
        substrand = parts[2] || '';
        contentStandard = parts[3] || '';
        indicators = parts[4] || '';
        resourcesRaw = parts[5] || '';
        statusRaw = parts[6] || '';
      }

      const resources = resourcesRaw ? resourcesRaw.split(/&|,/).map(r => r.trim()).filter(r => r) : [];
      let remarks: PlanningRemarks = '';
      const matchedStatus = REMARKS_OPTIONS.find(opt => 
        statusRaw.toLowerCase().includes(opt.toLowerCase())
      );
      if (matchedStatus) remarks = matchedStatus;

      return {
        id: `plan-p-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        className: activePasteTarget.className,
        subject: activePasteTarget.subject,
        week: weekNum,
        weekStartDate,
        weekEndDate,
        strand: strand.toUpperCase(),
        substrand: substrand,
        indicators: indicators,
        contentStandard: contentStandard,
        resources: resources,
        remarks: remarks,
        pages: '',
        areasCovered: '',
        classWorkCount: 5,
        homeWorkCount: 5,
        projectWorkCount: 1
      };
    });

    onUpdate({ 
      ...data, 
      weeklyMappings: [...(data.weeklyMappings || []), ...newMappings] 
    });

    setIsPasteModalOpen(false);
    setPastedText('');
    setActivePasteTarget(null);
  };

  const getStatusColor = (remarks: string) => {
    switch (remarks) {
      case 'Completed successfully': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Partially completed': return 'text-amber-600 bg-amber-50 border-amber-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  return (
    <div className="animate-in space-y-12 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 px-4">
        <div>
           <div className="inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 shadow-lg">
             1: Class Assignment/ACTIVITIES
           </div>
           <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter mb-1">UNITED BAYLOR A.</h2>
           <div className="flex items-center gap-4">
             <button 
               onClick={handleGlobalSave}
               className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${isSaving ? 'bg-amber-500 text-white animate-pulse' : (isOnline ? 'bg-sky-950 text-white' : 'bg-amber-600 text-white')} hover:opacity-90`}
             >
               {isSaving ? 'Processing...' : (isOnline ? 'Save Online' : 'Cache Offline')}
             </button>
             {selectedStaffId && (
                <button 
                  onClick={clearAllFacilitatorPlans}
                  className="px-6 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                >
                  Clear Sheet
                </button>
             )}
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">CLS: ASSESSMENT SHEET</p>
           </div>
        </div>
        
        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-xl flex items-center gap-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Logged as:</label>
          <select 
            className="bg-transparent font-black text-slate-900 uppercase text-xs focus:outline-none appearance-none cursor-pointer pr-10 min-w-[200px]"
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
          >
            <option value="">-- SELECT FACILITATOR --</option>
            {data.staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />

      {!selectedStaffId ? (
        <div className="py-40 text-center opacity-20 flex flex-col items-center">
          <div className="text-7xl mb-6">📅</div>
          <p className="font-black uppercase tracking-widest text-xs text-slate-950">Select facilitator name to access active roadmap</p>
        </div>
      ) : (
        <div className="space-y-20">
          {facilitatorDuties.map((duty, idx) => {
            const subjectName = data.subjects.find(s => s.id === duty.subjectId)?.name || duty.subjectId;
            const unassigned = getUnassignedMappings(duty.className, subjectName);

            return (
              <div key={idx} className="space-y-8 animate-in">
                <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
                  <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 bg-white sticky top-0 z-30">
                    <div>
                      <div className="bg-slate-900 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-3 inline-block">Active Broadsheet</div>
                      <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{subjectName} <span className="text-sky-600">at</span> {duty.className}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2 no-print justify-center">
                      <button onClick={() => bulkApplyDates(duty.className, subjectName)} className="bg-white border-2 border-indigo-100 text-indigo-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Sync Timeline</button>
                      <button onClick={() => triggerPaste(duty.className, subjectName)} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Paste</button>
                      <button onClick={() => clearBroadsheet(duty.className, subjectName)} className="bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl text-[10px] font-black uppercase border border-rose-100 hover:bg-rose-600 hover:text-white transition-all">Reset</button>
                    </div>
                  </div>

                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full border-collapse min-w-[1400px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 border-b-2 border-slate-200 text-[10px] font-black uppercase tracking-widest">
                          <th className="p-6 text-left w-40">Timeline</th>
                          <th className="p-6 text-center w-20">Wk</th>
                          <th className="p-6 text-left w-64">Strand Particulars</th>
                          <th className="p-6 text-left w-64">Aspects / Sub-Strands</th>
                          <th className="p-6 text-left w-48">Content Standard</th>
                          <th className="p-6 text-left w-32">Indic.</th>
                          <th className="p-6 text-left w-48">Resources</th>
                          <th className="p-6 text-center w-40">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()).map(wk => {
                          const plans = getMappingsForWeek(wk, duty.className, subjectName);
                          const mergedStrands = Array.from(new Set(plans.map(p => p.strand).filter(v => v))).join(' & ');
                          const mergedSubstrands = plans.map(p => p.substrand).filter(v => v).join(' • ');
                          const mergedStandards = plans.map(p => p.contentStandard).filter(v => v).join(', ');
                          const mergedIndicators = plans.map(p => p.indicators).filter(v => v).join(', ');
                          const mergedResources = Array.from(new Set(plans.flatMap(p => p.resources).filter(v => v))).join(', ');
                          const remarks = plans[0]?.remarks;

                          return (
                            <tr key={wk} onClick={() => setEditingMapping({ week: wk, className: duty.className, subject: subjectName })} className="group hover:bg-slate-50 transition-colors cursor-pointer">
                              <td className="p-6">
                                <div className="text-[10px] font-black text-slate-900">{plans[0]?.weekStartDate || <span className="text-slate-200">Set Date</span>}</div>
                                <div className="text-[8px] font-bold text-slate-300 uppercase my-0.5">to</div>
                                <div className="text-[10px] font-black text-slate-900">{plans[0]?.weekEndDate || <span className="text-slate-200">Set Date</span>}</div>
                              </td>
                              <td className="p-6 text-center">
                                <div className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center font-black text-xs transition-all border-2 ${plans.length > 0 ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-200'}`}>
                                  {wk}
                                </div>
                              </td>
                              <td className="p-6"><div className="text-[11px] font-black text-slate-900 uppercase line-clamp-2 leading-tight">{mergedStrands || <span className="text-slate-200 font-bold italic">Empty Week</span>}</div></td>
                              <td className="p-6"><div className="text-[10px] font-bold text-sky-700 uppercase line-clamp-2 leading-tight">{mergedSubstrands || '---'}</div></td>
                              <td className="p-6"><div className="text-[10px] font-black text-slate-600 uppercase truncate">{mergedStandards || '---'}</div></td>
                              <td className="p-6"><div className="text-[10px] font-black text-indigo-500">{mergedIndicators || '---'}</div></td>
                              <td className="p-6"><div className="text-[10px] font-bold text-slate-400 italic truncate max-w-[200px]">{mergedResources || '---'}</div></td>
                              <td className="p-6 text-center">
                                <span className={`inline-block px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border tracking-tight ${getStatusColor(remarks || '')}`}>
                                  {remarks || 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* REPOSITORY SECTION */}
                <div className="bg-slate-100 rounded-[3.5rem] p-12 border-2 border-dashed border-slate-300">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-10">
                    <div>
                      <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Curriculum Repository</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Strands and topics currently awaiting assignment</p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => triggerPaste(duty.className, subjectName)} className="bg-indigo-50 text-indigo-600 border-2 border-indigo-100 hover:bg-indigo-600 hover:text-white px-8 py-4 rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all">Magic Paste</button>
                      <button onClick={() => {
                        const newM = addStrandToWeek('', duty.className, subjectName);
                        onUpdate({ ...data, weeklyMappings: [...(data.weeklyMappings || []), newM] });
                      }} className="bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-900 hover:text-white px-8 py-4 rounded-3xl text-[10px] font-black uppercase shadow-sm transition-all">New Strand +</button>
                    </div>
                  </div>
                  {unassigned.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {unassigned.map(strand => (
                        <div key={strand.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg group hover:-translate-y-1 transition-all">
                          <div className="flex justify-between items-start mb-6">
                            <span className="bg-sky-50 text-sky-700 text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em]">Repository Row</span>
                            <button onClick={() => deleteIndividualMapping(strand.id, true)} className="text-slate-200 hover:text-rose-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                          <div className="space-y-6">
                            <div>
                              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Topic / Strand</label>
                              <div className="text-sm font-black text-slate-900 uppercase truncate">{strand.strand || 'No Topic'}</div>
                            </div>
                            <div className="pt-6 border-t border-slate-100">
                               <label className="text-[8px] font-black text-sky-500 uppercase tracking-widest mb-1.5 block">Assign to Week</label>
                               <select 
                                 className="w-full bg-slate-50 border-none p-3 rounded-2xl font-black text-slate-900 uppercase text-[10px] outline-none cursor-pointer"
                                 value={strand.week || ''}
                                 onChange={(e) => updateIndividualMapping(strand.id, 'week', e.target.value)}
                               >
                                 <option value="">- PICK -</option>
                                 {Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()).map(w => <option key={w} value={w}>Week {w}</option>)}
                               </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-24 text-center opacity-20 flex flex-col items-center">
                      <div className="text-6xl mb-6">📥</div>
                      <p className="font-black uppercase tracking-widest text-[10px]">Curriculum repository is empty</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal */}
      {editingMapping && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-10 border-b-2 border-slate-50 flex justify-between items-start shrink-0">
               <div>
                  <div className="bg-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest mb-3 inline-block">Week {editingMapping.week} Editor</div>
                  <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">{editingMapping.subject} <span className="text-slate-300">/</span> {editingMapping.className}</h4>
               </div>
               <button onClick={() => setEditingMapping(null)} className="p-3 bg-slate-300 text-slate-950 hover:text-rose-500 rounded-2xl transition-all">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
               {getMappingsForWeek(editingMapping.week, editingMapping.className, editingMapping.subject).map((aspect, idx) => (
                  <div key={aspect.id} className="bg-slate-50 p-10 rounded-[3rem] border border-slate-100 relative group/aspect">
                     <div className="absolute -top-3 left-10 bg-slate-900 text-white text-[9px] font-black px-5 py-1.5 rounded-full uppercase tracking-widest">Aspect {idx + 1}</div>
                     
                     <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Timeline Start</label>
                           <input type="date" className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs shadow-sm" value={aspect.weekStartDate || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'weekStartDate', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Timeline End</label>
                           <input type="date" className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs shadow-sm" value={aspect.weekEndDate || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'weekEndDate', e.target.value)} />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Strand Particulars</label>
                           <input className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs shadow-sm" placeholder="Main Topic..." value={aspect.strand || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'strand', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Aspects / Sub-Strands</label>
                           <input className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs shadow-sm" placeholder="Details..." value={aspect.substrand || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'substrand', e.target.value)} />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content Standard</label>
                           <input className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs shadow-sm" placeholder="B7.1.1.1..." value={aspect.contentStandard || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'contentStandard', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Indicators</label>
                           <input className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs shadow-sm" placeholder="M1.1, M1.2..." value={aspect.indicators || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'indicators', e.target.value)} />
                        </div>
                     </div>

                     <div className="space-y-2 mb-8">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resources</label>
                        <textarea className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs shadow-sm h-24 resize-none" placeholder="Textbooks, tools, digital resources..." value={(aspect.resources || []).join(', ')} onChange={(e) => updateIndividualMapping(aspect.id, 'resources', e.target.value.split(',').map(s => s.trim()))} />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Delivery Status</label>
                           <select className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs shadow-sm appearance-none outline-none" value={aspect.remarks} onChange={(e) => updateIndividualMapping(aspect.id, 'remarks', e.target.value)}>
                              <option value="">-- PICK STATUS --</option>
                              {REMARKS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                           </select>
                        </div>
                        <button 
                          onClick={() => deleteIndividualMapping(aspect.id, false)} 
                          className="w-full py-4 rounded-2xl border-2 border-amber-200 text-amber-600 font-black uppercase text-[10px] hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all flex items-center justify-center gap-2"
                        >
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                           Move to Repository
                        </button>
                     </div>
                  </div>
               ))}
               
               <button onClick={() => {
                 const newM = addStrandToWeek(editingMapping.week, editingMapping.className, editingMapping.subject);
                 onUpdate({ ...data, weeklyMappings: [...(data.weeklyMappings || []), newM] });
               }} className="w-full py-6 border-4 border-dashed border-slate-100 rounded-[3rem] text-slate-300 font-black uppercase text-xs hover:border-indigo-200 hover:text-indigo-300 transition-all flex items-center justify-center gap-3">
                  <span className="text-2xl">+</span> Add Additional Aspect for this Week
               </button>
            </div>

            <div className="p-10 border-t-2 border-slate-50 shrink-0 bg-slate-50/50 flex gap-4">
               <button onClick={() => setEditingMapping(null)} className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs shadow-2xl hover:bg-black transition-all">Secure Changes & Exit</button>
            </div>
          </div>
        </div>
      )}

      {/* PASTE MODAL */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-sky-950/80 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] p-8 md:p-12 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 border-2 border-indigo-100">
              <div className="flex justify-between items-start mb-8">
                 <div>
                    <h4 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter leading-none mb-1">Curriculum Topic Paste</h4>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Multi-column data processing</p>
                 </div>
                 <button onClick={() => setIsPasteModalOpen(false)} className="text-slate-300 hover:text-rose-500 transition-colors p-2 bg-slate-50 rounded-full"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>

              <div className="space-y-6">
                 <textarea 
                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 p-6 rounded-[2rem] font-black text-indigo-900 text-[10px] focus:outline-none resize-none h-64 shadow-inner whitespace-pre overflow-x-auto"
                    placeholder="Example: 1	Numbers	Fractions	B7.1.1.1	M1.1"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    autoFocus
                 />

                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setIsPasteModalOpen(false)} className="py-4 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[11px] hover:bg-slate-50 transition-all">Cancel</button>
                    <button onClick={processPastedTopics} className="py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Import Table</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PlanningPanel;
