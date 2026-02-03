import React, { useState, useMemo, useRef } from 'react';
import { ManagementState, WeeklyMapping, PlanningRemarks, AppState, CurriculumEntry, SchoolGroup } from '../../types';
import { WEEK_COUNT, SCHOOL_HIERARCHY } from '../../constants';

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
  const [showCurriculumPicker, setShowCurriculumPicker] = useState(false);
  const [curriculumSearch, setCurriculumSearch] = useState('');

  const activeFacilitator = data.staff.find(s => s.id === selectedStaffId);

  const facilitatorDuties = useMemo(() => {
    if (!selectedStaffId) return [];
    return (data.mappings || []).filter(m => m.staffId === selectedStaffId);
  }, [selectedStaffId, data.mappings]);

  const getGroupForClass = (cls: string): SchoolGroup => {
    for (const [group, config] of Object.entries(SCHOOL_HIERARCHY)) {
      if (config.classes.includes(cls)) return group as SchoolGroup;
    }
    return 'LOWER_BASIC';
  };

  const filteredCurriculum = useMemo(() => {
    if (!editingMapping) return [];
    const classGroup = getGroupForClass(editingMapping.className);
    return (data.curriculum || []).filter(item => 
      item.levelGroup === classGroup && 
      item.subject.toLowerCase() === editingMapping.subject.toLowerCase() &&
      (item.indicatorText.toLowerCase().includes(curriculumSearch.toLowerCase()) || 
       item.indicatorCode.toLowerCase().includes(curriculumSearch.toLowerCase()) ||
       item.strand.toLowerCase().includes(curriculumSearch.toLowerCase()))
    );
  }, [data.curriculum, editingMapping, curriculumSearch]);

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
      const newMap: WeeklyMapping = {
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
      };
      setEditingMapping(newMap);
      onUpdate({ ...data, weeklyMappings: [...data.weeklyMappings, newMap] });
    }
  };

  const selectCurriculumItem = (item: CurriculumEntry) => {
    if (!editingMapping) return;
    handleUpdateMapping(editingMapping.id, 'strand', item.strand);
    handleUpdateMapping(editingMapping.id, 'substrand', item.subStrand || '');
    handleUpdateMapping(editingMapping.id, 'contentStandard', item.contentStandard || '');
    
    const existingIndicators = editingMapping.indicators ? editingMapping.indicators.split(',').map(s => s.trim()) : [];
    if (!existingIndicators.includes(item.indicatorCode)) {
        const newIndicators = [...existingIndicators, item.indicatorCode].join(', ');
        handleUpdateMapping(editingMapping.id, 'indicators', newIndicators);
    }
    setShowCurriculumPicker(false);
  };

  const handleGlobalSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Academic Roadmaps Secured to Institutional Shard.");
    }, 800);
  };

  return (
    <div className="animate-in space-y-8 pb-40 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-2 border-slate-900 pb-8">
        <div className="space-y-2">
           <div className="inline-block bg-slate-950 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.3em] shadow-xl">
             1: Class Assignment/ACTIVITIES
           </div>
           <h2 className="text-4xl md:text-5xl font-black text-slate-950 uppercase tracking-tighter leading-none">SCHOOL: {data.settings.name}</h2>
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
                                <div className="text-[9px] font-black text-slate-300 uppercase mt-1">{plan?.weekEndDate || '---'}</div>
                              </td>
                              <td className="p-5 text-center">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs mx-auto ${plan?.strand ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-300'}`}>{wk}</div>
                              </td>
                              <td className="p-5">
                                <div className="text-[10px] font-black text-slate-900 uppercase line-clamp-1">{plan?.strand || <span className="text-slate-200">Pending Log...</span>}</div>
                              </td>
                              <td className="p-5">
                                <div className="text-[9px] font-bold text-indigo-600 uppercase line-clamp-1">{plan?.substrand || '---'}</div>
                              </td>
                              <td className="p-5">
                                <div className="text-[9px] font-bold text-slate-400 uppercase line-clamp-1">{plan?.contentStandard || '---'}</div>
                              </td>
                              <td className="p-5">
                                <div className="text-[9px] font-black text-indigo-400 truncate">{plan?.indicators || '---'}</div>
                              </td>
                              <td className="p-5 text-center">
                                {plan?.remarks ? (
                                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase border border-emerald-100">{plan.remarks}</span>
                                ) : (
                                  <span className="text-[8px] font-black text-slate-200 uppercase tracking-widest">Incomplete</span>
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

      {/* Editor Modal */}
      {editingMapping && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white rounded-[4rem] p-10 md:p-14 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_100px_200px_rgba(0,0,0,0.5)] border-4 border-slate-900">
              <div className="flex justify-between items-start mb-10 border-b-2 border-slate-50 pb-8 shrink-0">
                 <div>
                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] mb-3 inline-block">Broadsheet Detail Editor</div>
                    <h4 className="text-3xl font-black text-slate-950 uppercase tracking-tighter leading-none">
                      Week {editingMapping.week}: {editingMapping.subject}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">{editingMapping.className} • Academic Node Control</p>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => setShowCurriculumPicker(true)} className="bg-indigo-50 text-indigo-600 px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-lg shadow-indigo-100">
                      NaCCA Master Library
                    </button>
                    <button onClick={() => setEditingMapping(null)} className="text-slate-300 hover:text-rose-500 transition-all p-3 bg-slate-50 rounded-full hover:rotate-90">
                       <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-6 scrollbar-hide space-y-12 py-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Beginning</label>
                             <input type="date" className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 p-4 rounded-2xl font-black text-slate-950 uppercase text-xs" value={editingMapping.weekStartDate || ''} onChange={(e) => handleUpdateMapping(editingMapping.id, 'weekStartDate', e.target.value)} />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Ending</label>
                             <input type="date" className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 p-4 rounded-2xl font-black text-slate-950 uppercase text-xs" value={editingMapping.weekEndDate || ''} onChange={(e) => handleUpdateMapping(editingMapping.id, 'weekEndDate', e.target.value)} />
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Main Strand (Topic)</label>
                          <input className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 p-5 rounded-[1.8rem] font-black text-slate-950 uppercase text-xs shadow-inner" placeholder="Primary Subject Matter..." value={editingMapping.strand} onChange={(e) => handleUpdateMapping(editingMapping.id, 'strand', e.target.value)} />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sub-Strand / Focal Area</label>
                          <textarea className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 p-6 rounded-[2rem] font-bold text-slate-950 uppercase text-xs h-32 resize-none shadow-inner" placeholder="Sub-topic and aspects..." value={editingMapping.substrand} onChange={(e) => handleUpdateMapping(editingMapping.id, 'substrand', e.target.value)} />
                       </div>
                    </div>

                    <div className="space-y-8">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content Standard Mapping</label>
                          <input className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 p-5 rounded-[1.8rem] font-black text-slate-950 uppercase text-xs shadow-inner" placeholder="Standard codes..." value={editingMapping.contentStandard} onChange={(e) => handleUpdateMapping(editingMapping.id, 'contentStandard', e.target.value)} />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Specific Indicators</label>
                          <textarea className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-600 p-6 rounded-[2rem] font-black text-indigo-600 text-xs h-32 resize-none shadow-inner" placeholder="B1.2.3.4.1, M1.2..." value={editingMapping.indicators} onChange={(e) => handleUpdateMapping(editingMapping.id, 'indicators', e.target.value)} />
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logistics & Resources</label>
                          <textarea className="w-full bg-white border-4 border-slate-50 p-6 rounded-[2rem] font-bold text-slate-600 text-xs h-32 resize-none italic shadow-sm" placeholder="Textbooks, manipulative tools, digital assets..." value={editingMapping.resources.join(', ')} onChange={(e) => handleUpdateMapping(editingMapping.id, 'resources', e.target.value.split(',').map(s => s.trim()))} />
                       </div>
                    </div>
                 </div>

                 <div className="pt-10 border-t-2 border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Learning Deliverables (Target Count)</label>
                       <div className="grid grid-cols-3 gap-3">
                          <div className="bg-indigo-50 p-4 rounded-[1.8rem] text-center">
                             <span className="text-[8px] font-black text-indigo-400 uppercase block mb-2">Class Work</span>
                             <input type="number" className="bg-transparent text-center font-black text-indigo-600 text-xl w-full outline-none" value={editingMapping.classWorkCount} onChange={(e) => handleUpdateMapping(editingMapping.id, 'classWorkCount', parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="bg-emerald-50 p-4 rounded-[1.8rem] text-center">
                             <span className="text-[8px] font-black text-emerald-400 uppercase block mb-2">Home Work</span>
                             <input type="number" className="bg-transparent text-center font-black text-emerald-600 text-xl w-full outline-none" value={editingMapping.homeWorkCount} onChange={(e) => handleUpdateMapping(editingMapping.id, 'homeWorkCount', parseInt(e.target.value) || 0)} />
                          </div>
                          <div className="bg-amber-50 p-4 rounded-[1.8rem] text-center">
                             <span className="text-[8px] font-black text-amber-400 uppercase block mb-2">Project</span>
                             <input type="number" className="bg-transparent text-center font-black text-amber-600 text-xl w-full outline-none" value={editingMapping.projectWorkCount} onChange={(e) => handleUpdateMapping(editingMapping.id, 'projectWorkCount', parseInt(e.target.value) || 0)} />
                          </div>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Institutional Status Remarks</label>
                       <select className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black uppercase text-xs outline-none focus:ring-8 focus:ring-slate-100 transition-all shadow-2xl appearance-none cursor-pointer" value={editingMapping.remarks} onChange={(e) => handleUpdateMapping(editingMapping.id, 'remarks', e.target.value)}>
                          <option value="">- SELECT AUDIT STATUS -</option>
                          {REMARKS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                       </select>
                    </div>
                 </div>
              </div>

              <div className="mt-10 pt-10 border-t-2 border-slate-50 shrink-0">
                 <button onClick={() => setEditingMapping(null)} className="w-full bg-slate-950 text-white py-7 rounded-[2.5rem] font-black uppercase text-xs tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-95">Save Academic Record</button>
              </div>
           </div>
        </div>
      )}

      {/* Curriculum Master Picker Modal */}
      {showCurriculumPicker && editingMapping && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4 bg-indigo-950/95 backdrop-blur-2xl animate-in zoom-in-95">
           <div className="bg-white rounded-[4rem] p-10 md:p-14 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border-4 border-indigo-900">
              <div className="flex justify-between items-start mb-10 shrink-0 border-b border-slate-50 pb-6">
                 <div>
                    <h4 className="text-3xl font-black text-slate-950 uppercase tracking-tighter">NaCCA Master Syllabus</h4>
                    <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest mt-1">
                        Domain: {editingMapping.subject} • Level: {getGroupForClass(editingMapping.className)}
                    </p>
                 </div>
                 <button onClick={() => setShowCurriculumPicker(false)} className="bg-slate-50 text-slate-300 hover:text-rose-500 p-3 rounded-full transition-all">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <div className="mb-8 shrink-0 relative">
                 <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] font-black text-slate-900 uppercase text-xs focus:border-indigo-600 outline-none pl-14 shadow-inner"
                    placeholder="Search strands, indicators or codes..."
                    value={curriculumSearch}
                    onChange={(e) => setCurriculumSearch(e.target.value)}
                    autoFocus
                 />
                 <svg className="w-6 h-6 absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide space-y-4">
                 {filteredCurriculum.length > 0 ? (
                    filteredCurriculum.map((item) => (
                      <button 
                        key={item.id} 
                        onClick={() => selectCurriculumItem(item)}
                        className="w-full text-left p-8 rounded-[2.5rem] bg-slate-50 border-2 border-transparent hover:border-indigo-600 hover:bg-white hover:shadow-xl transition-all group"
                      >
                         <div className="flex justify-between items-start mb-3">
                            <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{item.indicatorCode}</span>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Syllabus Index</span>
                         </div>
                         <div className="font-black text-slate-900 uppercase text-sm mb-2 group-hover:text-indigo-600 transition-colors">{item.strand}</div>
                         <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed">{item.indicatorText}</p>
                         <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Sub: {item.subStrand}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                               <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Std: {item.contentStandard}</span>
                            </div>
                         </div>
                      </button>
                    ))
                 ) : (
                    <div className="py-20 text-center opacity-20">
                       <div className="text-6xl mb-4">📖</div>
                       <p className="font-black uppercase tracking-widest text-[10px]">No curriculum matches found for this domain context</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PlanningPanel;