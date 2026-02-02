import React, { useState, useMemo } from 'react';
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
  const [editingMapping, setEditingMapping] = useState<WeeklyMapping | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showBatchTools, setShowBatchTools] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [batchTarget, setBatchTarget] = useState<{ className: string; subject: string } | null>(null);

  const activeFacilitator = data.staff.find(s => s.id === selectedStaffId);

  const facilitatorDuties = useMemo(() => {
    if (!selectedStaffId) return [];
    return (data.mappings || []).filter(m => m.staffId === selectedStaffId);
  }, [selectedStaffId, data.mappings]);

  const getMappingsForWeek = (week: string, className: string, subject: string) => {
    return (data.weeklyMappings || []).filter(wm => 
      wm.week === week && wm.className === className && wm.subject === subject
    );
  };

  const handleUpdateMapping = (id: string, field: keyof WeeklyMapping, value: any) => {
    const exists = data.weeklyMappings.some(m => m.id === id);
    if (exists) {
      const newMappings = (data.weeklyMappings || []).map(wm => 
        wm.id === id ? { ...wm, [field]: value } : wm
      );
      onUpdate({ ...data, weeklyMappings: newMappings });
    } else if (editingMapping) {
      const newMapping = { ...editingMapping, [field]: value };
      setEditingMapping(newMapping);
      onUpdate({ ...data, weeklyMappings: [...data.weeklyMappings, newMapping] });
    }
  };

  const openEditor = (week: string, className: string, subject: string) => {
    const existing = getMappingsForWeek(week, className, subject)[0];
    if (existing) {
      setEditingMapping(existing);
    } else {
      setEditingMapping({
        id: `plan-${Date.now()}-${Math.random()}`,
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
        classWorkCount: 5,
        homeWorkCount: 5,
        projectWorkCount: 1
      });
    }
  };

  const processBatchCurriculum = () => {
    if (!batchInput.trim() || !batchTarget) return;
    const lines = batchInput.split('\n').filter(l => l.trim() !== '');
    const newPlans: WeeklyMapping[] = lines.map((line, idx) => {
      const [strand, substrand, standard, indicator] = line.split(/[|\t,]+/).map(s => s.trim());
      return {
        id: `batch-${Date.now()}-${idx}`,
        className: batchTarget.className,
        subject: batchTarget.subject,
        week: (idx + 1).toString(),
        strand: strand || '',
        substrand: substrand || '',
        contentStandard: standard || '',
        indicators: indicator || '',
        resources: [],
        pages: '',
        areasCovered: '',
        remarks: '',
        classWorkCount: 5,
        homeWorkCount: 5,
        projectWorkCount: 1
      };
    });

    const filtered = (data.weeklyMappings || []).filter(wm => 
      !(wm.className === batchTarget.className && wm.subject === batchTarget.subject)
    );

    onUpdate({ ...data, weeklyMappings: [...filtered, ...newPlans] });
    setShowBatchTools(false);
    setBatchInput('');
    alert("Academic Roadmap Synchronized.");
  };

  const downloadSubjectRoadmap = (className: string, subject: string) => {
    const headers = ['Week', 'Strand', 'Sub-Strand', 'Content Standard', 'Indicators', 'Status'];
    const road = (data.weeklyMappings || [])
      .filter(m => m.className === className && m.subject === subject)
      .sort((a,b) => parseInt(a.week) - parseInt(b.week));
    
    const rows = road.map(r => [r.week, r.strand, r.substrand, r.contentStandard, r.indicators, r.remarks]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Roadmap_${className}_${subject}.csv`;
    link.click();
  };

  const handleGlobalSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Academic Roadmaps Secured.");
    }, 800);
  };

  return (
    <div className="animate-in space-y-8 pb-40 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-slate-900 pb-8">
        <div className="space-y-2">
           <div className="inline-block bg-slate-950 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.3em] shadow-xl">
             1: Class Assignment/ACTIVITIES
           </div>
           <h2 className="text-4xl md:text-5xl font-black text-slate-950 uppercase tracking-tighter leading-none">{data.settings.name}</h2>
           <div className="flex flex-wrap items-center gap-4">
             <button onClick={handleGlobalSave} className={`px-8 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shadow-xl ${isSaving ? 'bg-amber-500 text-white animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
               {isSaving ? 'PROCESSING...' : 'Save All Data'}
             </button>
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] ml-4 hidden md:block">CLS: ASSESSMENT SHEET</p>
           </div>
        </div>
        
        <div className="bg-white p-6 rounded-[2.5rem] border-2 border-slate-950 shadow-2xl flex items-center gap-6 min-w-[280px]">
          <div className="text-right flex-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Identity Node:</label>
             <div className="text-xl font-black text-indigo-600 uppercase tracking-tight truncate">{activeFacilitator?.name || 'Awaiting Authenticity'}</div>
          </div>
          <select className="bg-slate-950 text-white font-black text-[9px] p-3 rounded-xl outline-none cursor-pointer uppercase tracking-widest hover:bg-black transition-all" value={selectedStaffId} onChange={(e) => setSelectedStaffId(e.target.value)}>
            <option value="">Switch Identity</option>
            {data.staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {!selectedStaffId ? (
        <div className="py-32 text-center opacity-10 flex flex-col items-center animate-pulse">
          <div className="text-[8rem] mb-6">🗓️</div>
          <p className="font-black uppercase tracking-[0.5em] text-sm text-slate-950 px-12">Identify facilitator to generate active roadmap</p>
        </div>
      ) : (
        <div className="space-y-16">
          {facilitatorDuties.map((duty, idx) => {
            const subjectName = data.subjects.find(s => s.id === duty.subjectId)?.name || duty.subjectId;

            return (
              <div key={idx} className="animate-in space-y-6">
                <div className="bg-white rounded-[3rem] shadow-2xl border-2 border-slate-950 overflow-hidden">
                  <div className="p-8 border-b-2 border-slate-950 flex flex-col md:flex-row justify-between items-center gap-6 bg-white sticky top-0 z-30">
                    <div className="text-center md:text-left">
                      <div className="bg-indigo-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] mb-2 inline-block">Academic Roadmap</div>
                      <h3 className="text-2xl md:text-3xl font-black text-slate-950 uppercase tracking-tighter leading-none">
                        {subjectName} <span className="text-indigo-500 mx-2 font-light">@</span> {duty.className}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setBatchTarget({ className: duty.className, subject: subjectName }); setShowBatchTools(true); }} className="bg-slate-50 border-2 border-slate-200 text-slate-400 px-5 py-2.5 rounded-xl font-black uppercase text-[9px] hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Rapid Ingestion Tool ⚡</button>
                       <button onClick={() => downloadSubjectRoadmap(duty.className, subjectName)} className="bg-slate-950 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[9px] shadow-xl hover:bg-black transition-all">Download Roadmap ⬇️</button>
                    </div>
                  </div>

                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full border-collapse min-w-[1200px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 border-b border-slate-200 text-[9px] font-black uppercase tracking-widest">
                          <th className="p-5 text-left w-48">Beginning - Ending</th>
                          <th className="p-5 text-center w-16">Wk</th>
                          <th className="p-5 text-left w-64">Strand Particulars</th>
                          <th className="p-5 text-left w-64">Aspects / Sub-Strands</th>
                          <th className="p-5 text-left w-48">Content Standard</th>
                          <th className="p-5 text-left w-40">Indicators</th>
                          <th className="p-5 text-center w-48">Remarks/Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()).map(wk => {
                          const plan = getMappingsForWeek(wk, duty.className, subjectName)[0];
                          return (
                            <tr key={wk} onClick={() => openEditor(wk, duty.className, subjectName)} className="group/row hover:bg-indigo-50/30 transition-all cursor-pointer h-20">
                              <td className="p-5">
                                <div className="text-[9px] font-black text-slate-950 uppercase">{plan?.weekStartDate || <span className="text-slate-200 italic">No Date Set</span>}</div>
                                <div className="text-[9px] font-black text-slate-950 uppercase mt-1">{plan?.weekEndDate || <span className="text-slate-200 italic">No Date Set</span>}</div>
                              </td>
                              <td className="p-5 text-center">
                                <div className={`w-8 h-8 rounded-lg mx-auto flex items-center justify-center font-black text-xs border-2 ${plan ? 'bg-slate-950 text-white border-slate-950' : 'bg-white border-slate-100 text-slate-200'}`}>
                                  {wk}
                                </div>
                              </td>
                              <td className="p-5"><div className="text-[11px] font-black text-slate-950 uppercase line-clamp-2 leading-tight">{plan?.strand || '---'}</div></td>
                              <td className="p-5"><div className="text-[10px] font-bold text-indigo-600 uppercase line-clamp-2 leading-tight">{plan?.substrand || '---'}</div></td>
                              <td className="p-5"><div className="text-[9px] font-black text-slate-400 uppercase line-clamp-2 leading-tight">{plan?.contentStandard || '---'}</div></td>
                              <td className="p-5"><div className="text-[9px] font-black text-emerald-600 truncate max-w-[100px]">{plan?.indicators || '---'}</div></td>
                              <td className="p-5 text-center">
                                {plan ? (
                                   <select 
                                     onClick={(e) => e.stopPropagation()}
                                     className={`w-full bg-white border-2 p-2 rounded-lg font-black uppercase text-[8px] outline-none transition-all ${plan.remarks ? 'border-emerald-100 text-emerald-600' : 'border-slate-100 text-slate-400'}`}
                                     value={plan.remarks}
                                     onChange={(e) => handleUpdateMapping(plan.id, 'remarks', e.target.value)}
                                   >
                                     <option value="">Pending</option>
                                     {REMARKS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                                   </select>
                                ) : (
                                  <span className="text-[8px] font-black text-slate-200 uppercase">Initialize Empty Week</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* RAPID INGESTION MODAL */}
      {showBatchTools && batchTarget && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md animate-in fade-in">
           <div className="bg-white rounded-[3rem] p-10 w-full max-w-4xl shadow-2xl border-4 border-slate-900">
              <div className="flex justify-between items-start mb-8 border-b-2 border-slate-50 pb-6">
                 <div>
                    <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Rapid Curriculum Ingestion</h4>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1">Ingesting into Node: {batchTarget.subject} @ {batchTarget.className}</p>
                 </div>
                 <button onClick={() => setShowBatchTools(false)} className="text-slate-300 hover:text-rose-500 transition-all p-3 bg-slate-50 rounded-full"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
              <div className="space-y-6">
                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    Protocol: Paste curriculum data below. Each line represents one week.<br/>
                    Format: <span className="text-slate-950">Strand | Sub-Strand | Content Standard | Indicator Codes</span>
                 </p>
                 <textarea 
                   className="w-full bg-slate-50 border-4 border-slate-100 p-8 rounded-[2.5rem] font-black text-indigo-600 text-xs focus:border-indigo-600 outline-none h-[300px] resize-none shadow-inner"
                   placeholder="Example:&#10;Topic A | Sub-topic | NA1.1 | I1, I2&#10;Topic B | Sub-topic | NA2.1 | I3"
                   value={batchInput}
                   onChange={(e) => setBatchInput(e.target.value)}
                 />
                 <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setShowBatchTools(false)} className="py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest">Discard</button>
                    <button onClick={processBatchCurriculum} className="py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-indigo-700 transition-all">Synchronize Roadmap</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* WEEKLY INDIVIDUAL EDITOR */}
      {editingMapping && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 md:p-12 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in">
           <div className="bg-white rounded-[4rem] p-10 md:p-14 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-slate-900">
              <div className="flex justify-between items-start mb-8 border-b-2 border-slate-50 pb-6 shrink-0">
                 <div>
                    <h4 className="text-3xl font-black text-slate-950 uppercase tracking-tighter">Academic Shard Editor</h4>
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1">Week {editingMapping.week} • {editingMapping.subject} @ {editingMapping.className}</p>
                 </div>
                 <button onClick={() => setEditingMapping(null)} className="text-slate-300 hover:text-rose-500 transition-all p-3 bg-slate-50 rounded-full">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-6 space-y-8 scrollbar-hide">
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Timeline Start</label>
                       <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-black text-slate-900 text-xs focus:border-indigo-500 outline-none" value={editingMapping.weekStartDate || ''} onChange={(e) => handleUpdateMapping(editingMapping.id, 'weekStartDate', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Timeline End</label>
                       <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-black text-slate-900 text-xs focus:border-indigo-500 outline-none" value={editingMapping.weekEndDate || ''} onChange={(e) => handleUpdateMapping(editingMapping.id, 'weekEndDate', e.target.value)} />
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Strand Particulars</label>
                          <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-slate-950 text-xs outline-none h-24 resize-none uppercase" value={editingMapping.strand} onChange={(e) => handleUpdateMapping(editingMapping.id, 'strand', e.target.value)} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub-Strand / Aspect</label>
                          <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-indigo-600 text-xs outline-none h-24 resize-none uppercase" value={editingMapping.substrand} onChange={(e) => handleUpdateMapping(editingMapping.id, 'substrand', e.target.value)} />
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Content Standard</label>
                          <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-bold text-slate-900 text-xs outline-none h-24 resize-none" value={editingMapping.contentStandard} onChange={(e) => handleUpdateMapping(editingMapping.id, 'contentStandard', e.target.value)} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Indicator Codes</label>
                          <textarea className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl font-black text-emerald-600 text-xs outline-none h-24 resize-none" value={editingMapping.indicators} onChange={(e) => handleUpdateMapping(editingMapping.id, 'indicators', e.target.value)} />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="mt-10 pt-8 border-t-2 border-slate-50 shrink-0 flex gap-4">
                 <button onClick={() => setEditingMapping(null)} className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all">Close</button>
                 <button onClick={() => setEditingMapping(null)} className="flex-[2] bg-slate-950 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-black transition-all">Secured Log Entry</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PlanningPanel;