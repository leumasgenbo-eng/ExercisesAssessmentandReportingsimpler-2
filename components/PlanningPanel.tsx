
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ManagementState, WeeklyMapping, PlanningRemarks, AppState, ExerciseMetadata } from '../types';
import { WEEK_COUNT, LITERACY_ASPECTS, LITERACY_INDICATOR_CATEGORIES } from '../constants';

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

const BLOOMS_TAXONOMY = [
  'Remembering',
  'Understanding',
  'Applying',
  'Analyzing',
  'Evaluating',
  'Creating'
];

const PlanningPanel: React.FC<Props> = ({ data, onUpdate, fullAppState }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [editingMapping, setEditingMapping] = useState<{ week: string; className: string; subject: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadTarget, setActiveUploadTarget] = useState<{ className: string; subject: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);

  const facilitatorDuties = useMemo(() => {
    if (!selectedStaffId) return [];
    return (data.mappings || []).filter(m => m.staffId === selectedStaffId);
  }, [selectedStaffId, data.mappings]);

  const handleEditWeek = (week: string, className: string, subjectId: string) => {
    const subject = data.subjects.find(s => s.id === subjectId)?.name || subjectId;
    setEditingMapping({ week, className, subject });
  };

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

  const getSubmissionStatus = (week: string, className: string, subject: string) => {
    if (!fullAppState) return { hasCW: false, hasHW: false, hasPW: false };
    const key = `${week}|${className}|${subject}`;
    
    const checkWork = (workRecord: any) => {
      const data = workRecord[key];
      if (!data) return false;
      const hasExercises = (Object.values(data.exercises) as ExerciseMetadata[]).some(ex => ex.maxScore && ex.maxScore !== '');
      const hasPupils = data.pupils && data.pupils.length > 0;
      return hasExercises || hasPupils;
    };

    return {
      hasCW: checkWork(fullAppState.classWork),
      hasHW: checkWork(fullAppState.homeWork),
      hasPW: checkWork(fullAppState.projectWork)
    };
  };

  const updateIndividualMapping = (id: string, field: keyof WeeklyMapping, value: any) => {
    const newMappings = (data.weeklyMappings || []).map(wm => 
      wm.id === id ? { ...wm, [field]: value } : wm
    );
    onUpdate({ ...data, weeklyMappings: newMappings });
  };

  const deleteIndividualMapping = (id: string) => {
    if (!confirm("Are you sure you want to remove this specific strand/aspect?")) return;
    const newMappings = (data.weeklyMappings || []).filter(wm => wm.id !== id);
    onUpdate({ ...data, weeklyMappings: newMappings });
  };

  const addStrandToWeek = (week: string, className: string, subject: string) => {
    const newMapping: WeeklyMapping = {
      id: `plan-${Date.now()}`,
      className,
      subject,
      week,
      strand: '',
      substrand: '',
      contentStandard: '',
      indicators: '',
      resources: [],
      pages: '',
      areasCovered: '',
      remarks: '',
      bloomsLevels: [],
      classWorkCount: 5,
      homeWorkCount: 5,
      projectWorkCount: 1
    };
    onUpdate({ ...data, weeklyMappings: [...(data.weeklyMappings || []), newMapping] });
  };

  const toggleBloomsLevel = (mappingId: string, level: string) => {
    const mapping = (data.weeklyMappings || []).find(wm => wm.id === mappingId);
    if (!mapping) return;
    const currentLevels = mapping.bloomsLevels || [];
    const newLevels = currentLevels.includes(level) 
      ? currentLevels.filter(l => l !== level)
      : [...currentLevels, level];
    
    updateIndividualMapping(mappingId, 'bloomsLevels', newLevels);
  };

  const handleGlobalSave = () => {
    setIsSaving(true);
    // Simulation of network/disk persistence
    setTimeout(() => {
      setIsSaving(false);
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 3000);
    }, 600);
  };

  const handleSaveToContinue = () => {
    // In our app, changes are reactive, but this provides visual confirmation and stays in the modal
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      // Optional: Logic to move to next week or aspect could go here
    }, 400);
  };

  const downloadDutyCSV = (className: string, subject: string) => {
    const headers = ['Start Date', 'End Date', 'Week', 'Strand Particulars', 'Sub-Strand', 'Content Standard', 'Indicators', 'Resources', "Bloom's Levels", 'Status', 'Pages', 'Areas Covered'];
    const mappings = (data.weeklyMappings || [])
      .filter(wm => wm.className === className && wm.subject === subject)
      .sort((a, b) => (parseInt(a.week) || 99) - (parseInt(b.week) || 99));

    const rows = mappings.map(plan => [
      plan.weekStartDate || '',
      plan.weekEndDate || '',
      plan.week || '',
      plan.strand || '',
      plan.substrand || '',
      plan.contentStandard || '',
      plan.indicators || '',
      (plan.resources || []).join('; '),
      (plan.bloomsLevels || []).join('; '),
      plan.remarks || '',
      plan.pages || '',
      plan.areasCovered || ''
    ].map(field => `"${String(field).replace(/"/g, '""')}"`));

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Active_Broadsheet_${className}_${subject}.csv`);
    link.click();
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadTarget) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const dataRows = lines.slice(1);
      const newPlans: WeeklyMapping[] = dataRows.filter(line => line.trim() !== '').map((line, idx) => {
        const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(p => p.replace(/^"|"$/g, '').trim());
        return {
          id: `plan-up-${Date.now()}-${idx}`,
          weekStartDate: parts[0] || '',
          weekEndDate: parts[1] || '',
          week: parts[2] || '',
          className: activeUploadTarget.className,
          subject: activeUploadTarget.subject,
          strand: parts[3] || '',
          substrand: parts[4] || '',
          contentStandard: parts[5] || '',
          indicators: parts[6] || '',
          resources: parts[7] ? parts[7].split(';').map(s => s.trim()) : [],
          bloomsLevels: parts[8] ? parts[8].split(';').map(s => s.trim()) : [],
          remarks: (parts[9] as PlanningRemarks) || '',
          pages: parts[10] || '',
          areasCovered: parts[11] || '',
          classWorkCount: 5,
          homeWorkCount: 5,
          projectWorkCount: 1
        };
      });

      if (newPlans.length > 0) {
        const filteredOldMappings = (data.weeklyMappings || []).filter(wm => 
          !(wm.className === activeUploadTarget.className && wm.subject === activeUploadTarget.subject)
        );
        onUpdate({ ...data, weeklyMappings: [...filteredOldMappings, ...newPlans] });
      }
      setActiveUploadTarget(null);
    };
    reader.readAsText(file);
  };

  const triggerUpload = (className: string, subject: string) => {
    setActiveUploadTarget({ className, subject });
    fileInputRef.current?.click();
  };

  const getStatusLightColor = (remarks: string) => {
    switch (remarks) {
      case 'Completed successfully': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Partially completed': return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Uncompleted': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Repeated': return 'bg-sky-50 text-sky-700 border-sky-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  };

  const bulkApplyDates = (className: string, subject: string) => {
    const mappings = (data.weeklyMappings || []).filter(wm => wm.className === className && wm.subject === subject);
    const week1 = mappings.find(wm => wm.week === "1");
    if (!week1 || !week1.weekStartDate || !week1.weekEndDate) {
      alert("Please set dates for Week 1 first to use as a template.");
      return;
    }
    if (confirm("Apply Week 1 timeline to all other mapped weeks in this subject?")) {
      const updated = (data.weeklyMappings || []).map(wm => {
        if (wm.className === className && wm.subject === subject && wm.week && wm.week !== "0") {
          return { ...wm, weekStartDate: week1.weekStartDate, weekEndDate: week1.weekEndDate };
        }
        return wm;
      });
      onUpdate({ ...data, weeklyMappings: updated });
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      {showSaveToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[3000] bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
          Academic Logs Saved Successfully!
        </div>
      )}

      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6 no-print">
        <div className="px-4">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-3xl md:text-4xl font-black text-sky-950 uppercase tracking-tighter leading-none">Class Assignment/ACTIVITIES</h2>
            <button 
              onClick={handleGlobalSave}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${isSaving ? 'bg-amber-500 text-white animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              {isSaving ? 'Saving...' : 'Save All Data'}
            </button>
          </div>
          <p className="text-[10px] md:text-sm font-bold text-sky-600/60 uppercase tracking-widest">SCHOOL: UNITED BAYLOR A. CLS: ASSESSMENT SHEET</p>
        </div>
        <div className="mx-4 bg-white/60 backdrop-blur-md p-4 rounded-[2rem] border border-sky-100 shadow-sm flex items-center gap-4">
          <label className="text-[10px] font-black text-sky-400 uppercase tracking-widest ml-2">Logged as:</label>
          <select 
            className="bg-transparent font-black text-sky-900 uppercase text-xs focus:outline-none appearance-none cursor-pointer pr-8 min-w-[150px] md:min-w-[200px]"
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(e.target.value)}
          >
            <option value="">-- SELECT NAME --</option>
            {data.staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <input type="file" ref={fileInputRef} onChange={handleCSVUpload} accept=".csv" className="hidden" />

      {!selectedStaffId ? (
        <div className="py-40 text-center opacity-30 flex flex-col items-center">
          <div className="text-6xl md:text-7xl mb-6">🗓️</div>
          <p className="font-black uppercase tracking-widest text-xs md:text-sm text-sky-950 px-8">Identify yourself to access your academic broadsheet</p>
        </div>
      ) : (
        <div className="space-y-16 px-2 md:px-0">
          {facilitatorDuties.length > 0 ? (
            facilitatorDuties.map((duty, idx) => {
              const subjectName = data.subjects.find(s => s.id === duty.subjectId)?.name || duty.subjectId;
              const unassignedStrands = getUnassignedMappings(duty.className, subjectName);

              return (
                <div key={idx} className="space-y-8">
                  <div className="bg-white rounded-3xl md:rounded-[3.5rem] p-1 shadow-2xl shadow-sky-900/5 border border-sky-100 overflow-hidden">
                    <div className="p-6 md:p-10 border-b border-sky-50 flex flex-col md:flex-row justify-between items-start md:items-center bg-white sticky top-0 z-20 gap-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-sky-950 text-white text-[8px] md:text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Active Broadsheet</span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black text-sky-900 uppercase tracking-tight leading-none break-words">{subjectName} <span className="text-sky-400 font-medium lowercase">at</span> {duty.className}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full md:w-auto no-print">
                        <button onClick={() => bulkApplyDates(duty.className, subjectName)} className="flex-1 md:flex-none bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100">Sync Timeline</button>
                        <button onClick={() => downloadDutyCSV(duty.className, subjectName)} className="flex-1 md:flex-none bg-sky-50 text-sky-600 px-4 py-2.5 rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-sky-600 hover:text-white transition-all border border-sky-100">Export</button>
                        <button onClick={() => triggerUpload(duty.className, subjectName)} className="flex-1 md:flex-none bg-sky-950 text-white px-4 py-2.5 rounded-xl md:rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-sky-800 transition-all shadow-lg">Upload</button>
                      </div>
                    </div>

                    <div className="overflow-x-auto scrollbar-hide">
                      <table className="w-full border-collapse min-w-[1400px]">
                        <thead>
                          <tr className="bg-sky-50/50 text-sky-900 border-b-2 border-sky-100 text-[9px] md:text-[10px] font-black uppercase tracking-widest">
                            <th className="w-36 p-4 text-left">Timeline</th>
                            <th className="w-16 p-4 text-center">Wk</th>
                            <th className="w-52 p-4 text-left">Strand Particulars</th>
                            <th className="w-52 p-4 text-left">Aspects / Sub-Strands</th>
                            <th className="w-44 p-4 text-left">Content Standard</th>
                            <th className="w-32 p-4 text-left">Indic.</th>
                            <th className="w-48 p-4 text-left">Resources</th>
                            <th className="w-32 p-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sky-50">
                          {Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()).map(wk => {
                            const plans = getMappingsForWeek(wk, duty.className, subjectName);
                            const submissions = getSubmissionStatus(wk, duty.className, subjectName);
                            const mergedStrands = Array.from(new Set(plans.map(p => p.strand).filter(v => v))).join(' & ');
                            const mergedSubstrands = plans.map(p => p.substrand).filter(v => v).join(' • ');
                            const mergedStandards = plans.map(p => p.contentStandard).filter(v => v).join(', ');
                            const mergedIndicators = plans.map(p => p.indicators).filter(v => v).join(', ');
                            const mergedResources = Array.from(new Set(plans.flatMap(p => p.resources).filter(v => v))).join(', ');
                            const startDate = plans[0]?.weekStartDate;
                            const endDate = plans[0]?.weekEndDate;
                            const status = plans.some(p => p.remarks === 'Completed successfully') ? 'Completed successfully' : plans[0]?.remarks;

                            return (
                              <tr key={wk} onClick={() => handleEditWeek(wk, duty.className, duty.subjectId)} className="group hover:bg-sky-50/50 cursor-pointer transition-colors h-20">
                                <td className="p-4 align-middle">
                                  <div className="text-[9px] md:text-[10px] font-black text-sky-900">{startDate || <span className="text-slate-200">Set Date</span>}</div>
                                  <div className="text-[8px] font-bold text-sky-300">to</div>
                                  <div className="text-[9px] md:text-[10px] font-black text-sky-900">{endDate || <span className="text-slate-200">Set Date</span>}</div>
                                </td>
                                <td className="p-4 text-center align-middle">
                                  <div className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center font-black text-xs border-2 transition-all ${plans.length > 0 ? 'bg-sky-950 border-sky-950 text-white' : 'bg-white border-sky-50 text-sky-200'}`}>
                                    {wk}
                                  </div>
                                </td>
                                <td className={`p-4 align-middle transition-all duration-300 ${submissions.hasCW || submissions.hasHW || submissions.hasPW ? 'bg-sky-50/40 border-l-4 border-amber-400' : ''}`}>
                                  <div className="text-[10px] md:text-[11px] font-black text-sky-900 uppercase line-clamp-2 leading-tight">
                                    {mergedStrands || <span className="text-slate-200 font-medium italic">Empty Week</span>}
                                  </div>
                                </td>
                                <td className="p-4 align-middle">
                                  <div className="text-[9px] md:text-[10px] font-bold text-sky-600 uppercase line-clamp-3 leading-tight">{mergedSubstrands || '---'}</div>
                                </td>
                                <td className="p-4 align-middle">
                                  <div className="text-[9px] md:text-[10px] font-black text-indigo-700 uppercase line-clamp-2 leading-tight">{mergedStandards || '---'}</div>
                                </td>
                                <td className="p-4 align-middle">
                                  <div className="text-[9px] md:text-[10px] font-black text-indigo-500 line-clamp-2 leading-tight">{mergedIndicators || '---'}</div>
                                </td>
                                <td className="p-4 align-middle">
                                  <div className="text-[9px] md:text-[10px] font-bold text-slate-500 italic leading-tight truncate max-w-[200px]">{mergedResources || '---'}</div>
                                </td>
                                <td className="p-4 text-center align-middle">
                                  {status ? (
                                    <span className={`inline-block px-2.5 py-1 rounded-lg text-[8px] font-black border uppercase tracking-tighter ${getStatusLightColor(status)}`}>
                                      {status.split(' ')[0]}
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-black text-slate-200 uppercase tracking-widest">Pending</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* CURRICULUM POOL / REPOSITORY */}
                  <div className="no-print bg-slate-50/50 rounded-[2.5rem] p-8 md:p-12 border-2 border-dashed border-slate-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                       <div>
                          <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Curriculum Repository</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Strands and topics currently awaiting assignment to a specific week</p>
                       </div>
                       <button onClick={() => addStrandToWeek('', duty.className, subjectName)} className="bg-white border-2 border-slate-200 text-slate-600 hover:bg-sky-950 hover:text-white hover:border-sky-950 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm transition-all">New Strand +</button>
                    </div>

                    {unassignedStrands.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {unassignedStrands.map(strand => (
                          <div key={strand.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                             <div className="flex justify-between items-start mb-4">
                               <div className="bg-sky-100 text-sky-700 text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">Repository Row</div>
                               <button onClick={() => deleteIndividualMapping(strand.id)} className="text-slate-200 hover:text-rose-500 transition-colors">
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                               </button>
                             </div>
                             <div className="space-y-4">
                                <div>
                                   <label className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Topic / Strand</label>
                                   <div className="text-xs font-black text-slate-900 uppercase line-clamp-1">{strand.strand || 'No Topic'}</div>
                                </div>
                                <div className="pt-4 border-t border-slate-50 flex items-center gap-3">
                                   <div className="flex-1">
                                      <label className="text-[7px] font-black text-sky-500 uppercase tracking-widest mb-1 block">Assign to Week</label>
                                      <select 
                                        className="w-full bg-sky-50 border-none p-2 rounded-xl font-black text-sky-900 uppercase text-[9px] outline-none cursor-pointer"
                                        value={strand.week || ''}
                                        onChange={(e) => updateIndividualMapping(strand.id, 'week', e.target.value)}
                                      >
                                        <option value="">- PICK -</option>
                                        {Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()).map(w => <option key={w} value={w}>Week {w}</option>)}
                                      </select>
                                   </div>
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-20 text-center opacity-20">
                         <div className="text-4xl mb-4">📥</div>
                         <p className="font-black uppercase tracking-widest text-[9px] text-slate-950">Curriculum repository is empty</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-40 text-center opacity-20">
              <p className="font-black uppercase tracking-widest text-[10px] text-sky-950">No duty mappings assigned to your profile</p>
            </div>
          )}
        </div>
      )}

      {/* Popout Editor */}
      {editingMapping && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-sky-950/80 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-3xl md:rounded-[3rem] p-6 md:p-10 w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6 md:mb-8 border-b-2 border-sky-50 pb-6 md:pb-8 shrink-0">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-sky-600 text-white text-[8px] md:text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Week {editingMapping.week} Editor</span>
                </div>
                <h4 className="text-xl md:text-2xl font-black text-sky-950 uppercase tracking-tight leading-tight">{editingMapping.subject}</h4>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{editingMapping.className}</p>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => addStrandToWeek(editingMapping.week, editingMapping.className, editingMapping.subject)} className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">Add Aspect +</button>
                 <button onClick={() => setEditingMapping(null)} className="bg-sky-50 text-sky-300 hover:text-red-500 p-2 md:p-3 rounded-xl md:rounded-2xl transition-all shadow-sm">
                   <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 md:pr-4 scrollbar-hide space-y-12 py-2">
              {getMappingsForWeek(editingMapping.week, editingMapping.className, editingMapping.subject).map((aspect, aspectIdx) => (
                <div key={aspect.id} className="space-y-8 bg-sky-50/20 p-6 md:p-10 rounded-[2.5rem] border border-sky-100 relative group/aspect">
                  <div className="absolute -top-3 left-8 bg-sky-950 text-white text-[8px] font-black px-4 py-1 rounded-full uppercase tracking-[0.2em] shadow-lg">Aspect {aspectIdx + 1}</div>
                  
                  <div className="grid grid-cols-2 gap-4 md:gap-8">
                    <div className="space-y-1.5">
                      <label className="text-[8px] md:text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1">Timeline Start</label>
                      <input type="date" className="w-full bg-white border-2 border-transparent focus:border-sky-500 p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-sky-950 uppercase text-[10px] md:text-xs" value={aspect.weekStartDate || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'weekStartDate', e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] md:text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1">Timeline End</label>
                      <input type="date" className="w-full bg-white border-2 border-transparent focus:border-sky-500 p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-sky-950 uppercase text-[10px] md:text-xs" value={aspect.weekEndDate || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'weekEndDate', e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[8px] md:text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1">Strand (Topic)</label>
                        <input className="w-full bg-white border-2 border-transparent focus:border-sky-500 p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-sky-950 uppercase text-[10px] md:text-xs" placeholder="Main Topic..." value={aspect.strand || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'strand', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] md:text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1">Sub-Strand / Detail</label>
                        <textarea className="w-full bg-white border-2 border-transparent focus:border-sky-500 p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-sky-950 uppercase text-[10px] md:text-xs min-h-[80px] resize-none" placeholder="Sub-strand details..." value={aspect.substrand || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'substrand', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[8px] md:text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1">Indicators</label>
                        <textarea className="w-full bg-white border-2 border-transparent focus:border-sky-500 p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-sky-950 uppercase text-[10px] md:text-xs min-h-[80px] resize-none" placeholder="Codes..." value={aspect.indicators || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'indicators', e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[8px] md:text-[9px] font-black text-sky-400 uppercase tracking-widest ml-1">Areas Covered / Outcomes</label>
                        <textarea className="w-full bg-white border-2 border-transparent focus:border-sky-500 p-3 md:p-4 rounded-xl md:rounded-2xl font-black text-sky-950 uppercase text-[10px] md:text-xs min-h-[100px] resize-none" placeholder="Lesson scope..." value={aspect.areasCovered || ''} onChange={(e) => updateIndividualMapping(aspect.id, 'areasCovered', e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 md:pt-8 border-t border-sky-50 shrink-0 flex flex-col md:flex-row gap-4">
              <button 
                onClick={handleSaveToContinue}
                className={`flex-1 py-4 md:py-5 rounded-2xl md:rounded-[1.5rem] font-black uppercase text-[11px] md:text-xs tracking-widest shadow-xl active:scale-[0.98] transition-all border-2 border-sky-950 text-sky-950 hover:bg-sky-50 ${isSaving ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isSaving ? 'Processing...' : 'Save to Continue'}
              </button>
              <button 
                onClick={() => setEditingMapping(null)}
                className="flex-[1.5] py-4 md:py-5 bg-sky-950 text-white rounded-2xl md:rounded-[1.5rem] font-black uppercase text-[11px] md:text-xs tracking-widest shadow-xl active:scale-[0.98] transition-all"
              >
                Save Changes & Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningPanel;
