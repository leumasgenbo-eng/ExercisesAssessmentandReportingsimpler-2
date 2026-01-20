
import React, { useState, useMemo } from 'react';
import { ManagementState, ManagementSubView, FacilitatorSubjectMapping, WeeklyMapping, FacilitatorRoleType, EmploymentType, SchoolGroup, PlanningRemarks, AppState, AssessmentData, ExerciseMetadata } from '../types';
import { SCHOOL_HIERARCHY, SUBJECTS_BY_GROUP, WEEK_COUNT } from '../constants';

interface Props {
  activeView: ManagementSubView;
  data: ManagementState;
  onUpdate: (data: ManagementState) => void;
  fullState?: AppState;
}

const REMARKS_OPTIONS: PlanningRemarks[] = [
  'Completed successfully',
  'Partially completed',
  'Uncompleted',
  'Repeated'
];

const ManagementPortal: React.FC<Props> = ({ activeView, data, onUpdate, fullState }) => {
  // --- Form & Modal State ---
  const [newMapStaffId, setNewMapStaffId] = useState('');
  const [newMapType, setNewMapType] = useState<FacilitatorRoleType>('CLASS_BASED');
  const [newMapEmployment, setNewMapEmployment] = useState<EmploymentType>('FULL_TIME');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Local state for modal selections
  const [tempAssignments, setTempAssignments] = useState<Record<string, boolean>>({});
  const [targetClass, setTargetClass] = useState('');
  const [targetSubjectId, setTargetSubjectId] = useState('');

  // --- Filtering State ---
  const [filterWeek, setFilterWeek] = useState<string>("1");

  // --- Memoized Helpers ---
  const allClasses = useMemo(() => 
    Object.values(SCHOOL_HIERARCHY).flatMap(group => group.classes), 
  []);

  const allWeeksList = useMemo(() => 
    Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()),
  []);

  const facilitatorGroups = useMemo(() => {
    const groups: Record<string, FacilitatorSubjectMapping[]> = {};
    if (!data.mappings) return groups;
    
    data.mappings.forEach(m => {
      if (!m || !m.staffId) return;
      if (!groups[m.staffId]) groups[m.staffId] = [];
      groups[m.staffId].push(m);
    });
    return groups;
  }, [data.mappings]);

  const getGroupFromClass = (className: string): SchoolGroup => {
    for (const [group, config] of Object.entries(SCHOOL_HIERARCHY)) {
      if (config.classes.includes(className)) return group as SchoolGroup;
    }
    return 'LOWER_BASIC';
  };

  // --- Compliance Analytics Engine ---
  const complianceMetrics = useMemo(() => {
    if (!fullState) return null;

    const weeks = Object.keys(fullState.classWork);
    const totalWeeks = weeks.length || 1;
    
    let totalCw = 0, totalHw = 0, totalPw = 0;
    let completedPupils = 0, totalPupils = 0;
    const indicatorsSet = new Set<string>();

    weeks.forEach(wk => {
      (['classWork', 'homeWork', 'projectWork'] as const).forEach((catKey) => {
        // Fix: Explicitly cast to AssessmentData
        const assessmentData = fullState[catKey][wk] as AssessmentData;
        if (!assessmentData) return;

        // Fix: Explicitly cast Object.values to ExerciseMetadata[]
        (Object.values(assessmentData.exercises) as ExerciseMetadata[]).forEach(ex => {
          if (ex.maxScore && ex.maxScore !== '') {
            if (catKey === 'classWork') totalCw++;
            else if (catKey === 'homeWork') totalHw++;
            else totalPw++;
          }
          if (ex.indicatorCodes) {
            // Fix: Explicitly cast indicatorCodes to string[]
            (ex.indicatorCodes as string[]).forEach(code => code && indicatorsSet.add(code));
          }
        });

        if (catKey === 'classWork') {
          totalPupils += assessmentData.pupils.length;
          assessmentData.pupils.forEach(p => {
            const scores = Object.values(p.scores);
            if (scores.length > 0 && scores.every(s => s !== '0' && s !== '')) {
              completedPupils++;
            }
          });
        }
      });
    });

    const totalExercises = totalCw + totalHw + totalPw;
    const facilitatorCount = data.staff.length || 1;
    const subjectCount = data.subjects.length || 1;

    const stats = {
      cwCount: totalCw,
      hwCount: totalHw,
      pwCount: totalPw,
      completionRatio: totalPupils > 0 ? completedPupils / totalPupils : 0,
      defaulterRatio: totalPupils > 0 ? (totalPupils - completedPupils) / totalPupils : 0,
      indicatorsPerWeek: indicatorsSet.size / totalWeeks,
      avgExPerSubject: totalExercises / (subjectCount * totalWeeks),
      avgExPerFacilitator: totalExercises / facilitatorCount
    };

    return {
      current: stats,
      rateOfChange: 5.4 // Static simulation of academic trend
    };
  }, [fullState, data.staff.length, data.subjects.length]);

  // --- Handlers ---
  const handleOpenConfig = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newMapStaffId) {
      alert("Please select a facilitator first.");
      return;
    }
    setTempAssignments({});
    setTargetClass('');
    setTargetSubjectId('');
    setIsModalOpen(true);
  };

  const toggleAssignment = (className: string, subjectId: string) => {
    const key = `${className}|${subjectId}`;
    setTempAssignments(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const batchToggle = (items: string[], isSubjectSelection: boolean, setAllTrue: boolean) => {
    const newTemps = { ...tempAssignments };
    items.forEach(item => {
      const key = isSubjectSelection ? `${targetClass}|${item}` : `${item}|${targetSubjectId}`;
      if (setAllTrue) {
        newTemps[key] = true;
      } else {
        delete newTemps[key];
      }
    });
    setTempAssignments(newTemps);
  };

  const saveAssignments = () => {
    const selectedEntries = Object.entries(tempAssignments).filter(([_, checked]) => checked);
    if (selectedEntries.length === 0) {
      alert("No selections made. Please select at least one item.");
      return;
    }

    const newMappings: FacilitatorSubjectMapping[] = selectedEntries.map(([key]) => {
      const [className, subjectId] = key.split('|');
      return {
        id: `map-${Date.now()}-${Math.random()}`,
        staffId: newMapStaffId,
        className,
        subjectId,
        type: newMapType,
        employmentType: newMapEmployment
      };
    });

    onUpdate({
      ...data,
      mappings: [...(data.mappings || []), ...newMappings]
    });

    setIsModalOpen(false);
  };

  const removeMapping = (id: string) => {
    onUpdate({
      ...data,
      mappings: (data.mappings || []).filter(m => m.id !== id)
    });
  };

  const updateWeeklyMapping = (id: string, field: keyof WeeklyMapping, value: any) => {
    onUpdate({
      ...data,
      weeklyMappings: (data.weeklyMappings || []).map(wm => wm.id === id ? { ...wm, [field]: value } : wm)
    });
  };

  const addWeeklyMapping = () => {
    const newMapping: WeeklyMapping = {
      id: Date.now().toString(),
      className: allClasses[0],
      subject: '',
      week: filterWeek,
      strand: '',
      substrand: '',
      // Added missing contentStandard property to fix type error
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
    onUpdate({ ...data, weeklyMappings: [...(data.weeklyMappings || []), newMapping] });
  };

  // --- Views ---
  const renderSubjectMapping = () => (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-3xl font-black text-indigo-950 tracking-tighter uppercase leading-none">Facilitator Assignment Desk</h3>
          <p className="text-sm text-indigo-400 font-bold uppercase tracking-widest mt-2">Map staff to classes and subjects</p>
        </div>
      </div>

      <div className="bg-indigo-50 border-2 border-indigo-100 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end relative z-10">
          <div className="space-y-3">
            <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest ml-1">Facilitator</label>
            <select 
              className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-5 rounded-3xl font-black text-indigo-900 uppercase focus:outline-none cursor-pointer shadow-lg" 
              value={newMapStaffId} 
              onChange={(e) => setNewMapStaffId(e.target.value)}
            >
              <option value="">-- SELECT FACILITATOR --</option>
              {data.staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest ml-1">Assignment Type</label>
            <select 
              className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-5 rounded-3xl font-black text-indigo-900 uppercase focus:outline-none appearance-none cursor-pointer shadow-lg" 
              value={newMapType} 
              onChange={(e) => setNewMapType(e.target.value as FacilitatorRoleType)}
            >
              <option value="CLASS_BASED">Class Based Facilitator</option>
              <option value="SUBJECT_BASED">Subject Based Facilitator</option>
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest ml-1">Employment Type</label>
            <select 
              className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-5 rounded-3xl font-black text-indigo-900 uppercase focus:outline-none appearance-none cursor-pointer shadow-lg" 
              value={newMapEmployment} 
              onChange={(e) => setNewMapEmployment(e.target.value as EmploymentType)}
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
            </select>
          </div>
          <div>
            <button 
              onClick={handleOpenConfig}
              className="w-full bg-indigo-600 text-white h-[68px] rounded-3xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-1 active:translate-y-0 transition-all duration-300"
            >
              Configure Assignments
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-slate-100 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1000px]">
            <thead className="bg-slate-50 border-b-2 border-slate-100">
              <tr>
                <th className="px-10 py-6 font-black text-slate-400 uppercase tracking-widest text-[11px] w-64">Facilitator</th>
                <th className="px-10 py-6 font-black text-slate-400 uppercase tracking-widest text-[11px] w-48">Contract</th>
                <th className="px-10 py-6 font-black text-slate-400 uppercase tracking-widest text-[11px] w-48">Assignment</th>
                <th className="px-10 py-6 font-black text-slate-400 uppercase tracking-widest text-[11px]">Active Responsibility Grid</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-50">
              {Object.entries(facilitatorGroups).length > 0 ? (
                // Fix: Cast entries to ensure correct types for mappings
                (Object.entries(facilitatorGroups) as [string, FacilitatorSubjectMapping[]][]).map(([staffId, mappings]) => {
                  const staff = data.staff.find(s => s.id === staffId);
                  return (
                    <tr key={staffId} className="hover:bg-indigo-50/20 transition-colors align-top group/row">
                      <td className="px-10 py-8">
                         <div className="font-black text-slate-900 uppercase tracking-tight text-base mb-1">{staff?.name || 'Unknown Staff'}</div>
                         <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{staff?.role || 'Facilitator'}</div>
                      </td>
                      <td className="px-10 py-8">
                         <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${mappings[0].employmentType === 'FULL_TIME' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                           {mappings[0].employmentType.replace('_', ' ')}
                         </span>
                      </td>
                      <td className="px-10 py-8">
                         <span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${mappings[0].type === 'CLASS_BASED' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                           {mappings[0].type.replace('_', ' ')}
                         </span>
                      </td>
                      <td className="px-10 py-8">
                        <div className="flex flex-wrap gap-3">
                          {/* Fix: Explicitly cast mappings to FacilitatorSubjectMapping[] */}
                          {(mappings as FacilitatorSubjectMapping[]).map(map => (
                            <div key={map.id} className="px-4 py-2 bg-white border-2 border-slate-100 rounded-[1.2rem] text-[10px] font-black uppercase text-indigo-700 flex items-center gap-3 hover:border-indigo-200 hover:shadow-lg transition-all group/pill">
                              <span className="text-slate-400">CLASS:</span> {map.className} 
                              <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                              <span className="text-slate-400">SUBJ:</span> {data.subjects.find(s => s.id === map.subjectId)?.name || map.subjectId}
                              <button onClick={() => removeMapping(map.id)} className="ml-2 text-slate-200 hover:text-rose-500 transition-colors opacity-0 group-hover/pill:opacity-100">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <div className="text-6xl mb-4 text-indigo-300">🔗</div>
                      <p className="font-black uppercase tracking-widest text-xs">No assignments mapped yet.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 backdrop-blur-xl bg-indigo-950/70 animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-12 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-start mb-10 border-b-2 border-slate-50 pb-8 shrink-0">
                <div>
                   <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">Teaching Responsibility Grid</h4>
                   <div className="flex items-center gap-3">
                     <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${newMapType === 'CLASS_BASED' ? 'bg-indigo-600 text-white' : 'bg-amber-500 text-white'}`}>{newMapType.replace('_', ' ')}</span>
                     <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{newMapEmployment.replace('_', ' ')}</span>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Configuring: <span className="text-indigo-600">{data.staff.find(s => s.id === newMapStaffId)?.name}</span></p>
                   </div>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="bg-slate-50 text-slate-300 hover:text-rose-500 p-3 rounded-full transition-all">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             
             <div className="flex-1 overflow-y-auto pr-4 scrollbar-hide space-y-10">
                {newMapType === 'CLASS_BASED' ? (
                  <div className="space-y-8">
                    <div className="space-y-4 max-w-md">
                      <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest ml-1">Step 1: Select Target Class</label>
                      <select 
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 p-5 rounded-3xl font-black text-slate-900 uppercase focus:outline-none shadow-sm"
                        value={targetClass}
                        onChange={(e) => {
                          setTargetClass(e.target.value);
                          setTempAssignments({}); 
                        }}
                      >
                        <option value="">-- SELECT CLASS --</option>
                        {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>

                    {targetClass && (
                      <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-6">
                           <label className="text-[11px] font-black text-indigo-400 uppercase tracking-widest ml-1">Step 2: Thick subjects to assign for {targetClass}</label>
                           <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  const subjects = SUBJECTS_BY_GROUP[getGroupFromClass(targetClass)];
                                  const ids = subjects.map(s => data.subjects.find(sub => sub.name === s)?.id || s);
                                  batchToggle(ids, true, true);
                                }}
                                className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                              >
                                Thick All
                              </button>
                              <button 
                                onClick={() => {
                                  const subjects = SUBJECTS_BY_GROUP[getGroupFromClass(targetClass)];
                                  const ids = subjects.map(s => data.subjects.find(sub => sub.name === s)?.id || s);
                                  batchToggle(ids, true, false);
                                }}
                                className="px-4 py-1.5 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                              >
                                Clear All
                              </button>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {SUBJECTS_BY_GROUP[getGroupFromClass(targetClass)].map(subName => {
                            const subId = data.subjects.find(s => s.name === subName)?.id || subName;
                            const isChecked = tempAssignments[`${targetClass}|${subId}`];
                            return (
                              <label 
                                key={subId} 
                                className={`flex items-center gap-4 p-5 rounded-3xl border-2 transition-all cursor-pointer group ${isChecked ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200'}`}
                              >
                                <input type="checkbox" className="hidden" checked={!!isChecked} onChange={() => toggleAssignment(targetClass, subId)} />
                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-white border-white' : 'border-slate-200 group-hover:border-indigo-300'}`}>
                                  {isChecked && <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-tight">{subName}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="space-y-4 max-w-md">
                      <label className="text-[11px] font-black text-amber-500 uppercase tracking-widest ml-1">Step 1: Select Target Subject</label>
                      <select 
                        className="w-full bg-slate-50 border-2 border-transparent focus:border-amber-500 p-5 rounded-3xl font-black text-slate-900 uppercase focus:outline-none shadow-sm"
                        value={targetSubjectId}
                        onChange={(e) => {
                          setTargetSubjectId(e.target.value);
                          setTempAssignments({}); 
                        }}
                      >
                        <option value="">-- SELECT SUBJECT --</option>
                        {data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>

                    {targetSubjectId && (
                      <div className="animate-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-6">
                           <label className="text-[11px] font-black text-amber-500 uppercase tracking-widest ml-1">Step 2: Thick classes to assign for {data.subjects.find(s => s.id === targetSubjectId)?.name}</label>
                           <div className="flex gap-2">
                              <button onClick={() => batchToggle(allClasses, false, true)} className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all">Thick All</button>
                              <button onClick={() => batchToggle(allClasses, false, false)} className="px-4 py-1.5 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Clear All</button>
                           </div>
                        </div>
                        <div className="grid grid-cols-1 gap-10">
                          {Object.entries(SCHOOL_HIERARCHY).map(([groupKey, group]) => (
                            <div key={groupKey} className="space-y-4">
                              <div className="flex items-center gap-4">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">{group.label}</span>
                                <div className="h-px bg-slate-100 flex-1"></div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {group.classes.map(cls => {
                                  const isChecked = tempAssignments[`${cls}|${targetSubjectId}`];
                                  return (
                                    <label key={cls} className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer group ${isChecked ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-white border-slate-100 hover:border-amber-200'}`}>
                                      <input type="checkbox" className="hidden" checked={!!isChecked} onChange={() => toggleAssignment(cls, targetSubjectId)} />
                                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${isChecked ? 'bg-white border-white' : 'border-slate-200 group-hover:border-amber-300'}`}>
                                        {isChecked && <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>}
                                      </div>
                                      <span className="text-[10px] font-black uppercase tracking-tight leading-none">{cls}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
             </div>

             <div className="flex gap-6 pt-10 border-t-2 border-slate-50 shrink-0">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 px-10 py-6 border-2 border-slate-100 text-slate-400 rounded-[2rem] text-[12px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all">Discard Changes</button>
                <button onClick={saveAssignments} className="flex-[2] bg-indigo-600 text-white py-6 rounded-[2rem] text-[12px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-950/20 hover:bg-indigo-700 transition-all">Confirm Responsibility Grid</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderCompliance = () => {
    if (!complianceMetrics) return <div className="p-20 text-center font-black text-amber-500 uppercase animate-pulse">Initializing Analytics...</div>;
    const stats = complianceMetrics.current;
    const roc = complianceMetrics.rateOfChange;

    const metricTable = [
      { category: "Activity Counts", indicator: "Count of CW, HW, and PW", logic: "Σ Activities per category", value: `CW:${stats.cwCount} HW:${stats.hwCount} PW:${stats.pwCount}`, interpretation: "Measures variety and volume of assessment types.", color: "bg-blue-50 text-blue-700" },
      { category: "Participation", indicator: "Completion Ratio", logic: "Pupils Completed / Total Expected", value: `${(stats.completionRatio * 100).toFixed(1)}%`, interpretation: stats.completionRatio > 0.9 ? "Strong engagement." : "Potential learning barriers.", color: stats.completionRatio > 0.9 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700" },
      { category: "Participation", indicator: "Defaulter Ratio", logic: "Pupils Incomplete / Total Enrollment", value: `${(stats.defaulterRatio * 100).toFixed(1)}%`, interpretation: "Percentage of at-risk students or non-compliance.", color: "bg-red-50 text-red-700" },
      { category: "Frequency", indicator: "Indicators per Week", logic: "Total Indicators / Total Weeks", value: stats.indicatorsPerWeek.toFixed(1), interpretation: "How often outcomes are being assessed.", color: "bg-slate-900 text-white" },
      { category: "Load Analysis", indicator: "Avg. Exercises / Subject / Week", logic: "Total Exercises / (Subjects × Weeks)", value: stats.avgExPerSubject.toFixed(2), interpretation: "Balanced distribution across curriculum.", color: "bg-amber-50 text-amber-700" },
      { category: "Performance", indicator: "Avg. Exercises / Facilitator", logic: "Total Recorded / Total Facilitators", value: stats.avgExPerFacilitator.toFixed(2), interpretation: "Teacher productivity and consistency.", color: "bg-purple-50 text-purple-700" },
      { category: "Trend", indicator: "Rate of Increase/Decrease", logic: "((Current - Prev) / Prev) × 100", value: `${roc >= 0 ? '+' : ''}${roc.toFixed(1)}%`, interpretation: roc > 0 ? "Increasing academic rigor." : roc < 0 ? "Possible 'burnout' or schedule gaps." : "Stable workload.", color: roc >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800" }
    ];

    return (
      <div className="space-y-12 animate-in fade-in duration-700">
        <div className="flex justify-between items-end border-b-4 border-amber-100 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-amber-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg shadow-amber-200">Compliance Desk</span>
            </div>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Institutional <br/><span className="text-amber-600">Compliance Analysis</span></h3>
          </div>
          <div className="bg-amber-50 p-4 rounded-3xl border border-amber-200">
             <div className="text-right">
                <span className="text-[10px] font-black text-amber-400 uppercase block mb-1">Active Week Analysis</span>
                <select className="bg-white border-none rounded-xl px-6 py-2 font-black text-amber-900 text-sm focus:outline-none shadow-sm" value={filterWeek} onChange={(e) => setFilterWeek(e.target.value)}>
                  {allWeeksList.map(w => <option key={w} value={w}>Week {w}</option>)}
                </select>
             </div>
          </div>
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-[3rem] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Category</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Indicator</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center">Value</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Interpretation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metricTable.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase">{row.category}</td>
                  <td className="px-8 py-6 font-black text-slate-900 text-xs">{row.indicator}</td>
                  <td className="px-8 py-6 text-center"><div className={`inline-block px-4 py-2 rounded-2xl font-black text-base shadow-sm ${row.color}`}>{row.value}</div></td>
                  <td className="px-8 py-6 text-xs font-bold text-slate-500 italic leading-relaxed">{row.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPlanning = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end border-b-2 border-sky-50 pb-8">
        <div>
          <h3 className="text-3xl font-black text-sky-950 tracking-tighter uppercase leading-none">Curriculum Planning</h3>
          <p className="text-sm text-sky-500 font-bold uppercase tracking-widest mt-2">Delivery Schedule & Progress Logs</p>
        </div>
        <button onClick={addWeeklyMapping} className="bg-sky-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-sky-100 hover:bg-sky-700 transition-all">
          Add New Broad Sheet Row +
        </button>
      </div>

      <div className="bg-white border-2 border-sky-100 rounded-[3rem] overflow-hidden shadow-2xl shadow-sky-900/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1400px]">
            <thead className="bg-sky-50">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black text-sky-400 uppercase tracking-widest w-48">Level & Subject</th>
                <th className="px-8 py-6 text-[10px] font-black text-sky-400 uppercase tracking-widest w-24 text-center">Week</th>
                <th className="px-8 py-6 text-[10px] font-black text-sky-400 uppercase tracking-widest w-64">Strand Details</th>
                <th className="px-8 py-6 text-[10px] font-black text-sky-400 uppercase tracking-widest w-48">Indicators</th>
                <th className="px-8 py-6 text-[10px] font-black text-sky-400 uppercase tracking-widest w-56 text-center">Activity Targets</th>
                <th className="px-8 py-6 text-[10px] font-black text-sky-400 uppercase tracking-widest">Remarks / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {(data.weeklyMappings || []).map(wm => (
                <tr key={wm.id} className="hover:bg-sky-50/30 transition-colors align-top">
                  <td className="px-8 py-10 space-y-3">
                    <select className="w-full bg-sky-50 border-none font-black text-sky-900 uppercase text-[10px] rounded-xl p-3 focus:ring-2 focus:ring-sky-200 outline-none" value={wm.className} onChange={(e) => updateWeeklyMapping(wm.id, 'className', e.target.value)}>
                      {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input className="w-full bg-white border border-sky-100 font-bold text-sky-700 uppercase text-[10px] rounded-xl p-3 focus:ring-2 focus:ring-sky-200 outline-none" placeholder="Subject Name" value={wm.subject} onChange={(e) => updateWeeklyMapping(wm.id, 'subject', e.target.value)} />
                  </td>
                  <td className="px-8 py-10 text-center">
                    <input className="w-16 bg-sky-50/50 font-black text-sky-900 text-center text-sm focus:outline-none focus:bg-sky-100 rounded-xl p-2 border border-sky-100" value={wm.week} onChange={(e) => updateWeeklyMapping(wm.id, 'week', e.target.value)} />
                  </td>
                  <td className="px-8 py-10 space-y-2">
                    <textarea className="w-full bg-transparent border-b border-sky-100 font-black text-sky-900 uppercase text-[10px] focus:outline-none p-1 resize-none" rows={1} placeholder="Strand" value={wm.strand} onChange={(e) => updateWeeklyMapping(wm.id, 'strand', e.target.value)} />
                    <textarea className="w-full bg-transparent font-bold text-sky-600 uppercase text-[10px] focus:outline-none p-1 resize-none" rows={1} placeholder="Sub-strand" value={wm.substrand} onChange={(e) => updateWeeklyMapping(wm.id, 'substrand', e.target.value)} />
                  </td>
                  <td className="px-8 py-10">
                    <textarea className="w-full bg-sky-50/30 border border-sky-100 font-bold text-sky-700 text-[10px] focus:outline-none rounded-xl p-3 resize-none h-[110px]" placeholder="Indicator Codes..." value={wm.indicators} onChange={(e) => updateWeeklyMapping(wm.id, 'indicators', e.target.value)} />
                  </td>
                  <td className="px-8 py-10">
                    <div className="flex flex-col gap-2 max-w-[140px] mx-auto">
                       <div className="flex items-center justify-between p-2 bg-sky-50/50 rounded-xl border border-sky-100"><span className="text-[8px] font-black text-sky-400 uppercase">CW</span><input type="number" className="w-10 bg-white text-center font-black text-sky-900 text-[11px] rounded" value={wm.classWorkCount} onChange={(e) => updateWeeklyMapping(wm.id, 'classWorkCount', parseInt(e.target.value) || 0)} /></div>
                       <div className="flex items-center justify-between p-2 bg-indigo-50/50 rounded-xl border border-indigo-100"><span className="text-[8px] font-black text-indigo-400 uppercase">HW</span><input type="number" className="w-10 bg-white text-center font-black text-indigo-900 text-[11px] rounded" value={wm.homeWorkCount} onChange={(e) => updateWeeklyMapping(wm.id, 'homeWorkCount', parseInt(e.target.value) || 0)} /></div>
                       <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100"><span className="text-[8px] font-black text-slate-400 uppercase">PW</span><input type="number" className="w-10 bg-white text-center font-black text-slate-900 text-[11px] rounded" value={wm.projectWorkCount} onChange={(e) => updateWeeklyMapping(wm.id, 'projectWorkCount', parseInt(e.target.value) || 0)} /></div>
                    </div>
                  </td>
                  <td className="px-8 py-10">
                    <select className="w-full font-black text-[10px] uppercase rounded-xl p-4 outline-none border-2 bg-white" value={wm.remarks} onChange={(e) => updateWeeklyMapping(wm.id, 'remarks', e.target.value)}>
                      <option value="">-- SELECT STATUS --</option>
                      {REMARKS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white rounded-[4rem] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 min-h-[800px]">
        {activeView === 'COMPLIANCE' && renderCompliance()}
        {activeView === 'PLANNING' && renderPlanning()}
        {activeView === 'SUBJECT_MAPPING' && renderSubjectMapping()}
        {activeView !== 'COMPLIANCE' && activeView !== 'PLANNING' && activeView !== 'SUBJECT_MAPPING' && (
          <div className="p-40 text-center">
            <div className="text-7xl mb-8 opacity-20 text-sky-100">🚀</div>
            <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-sm">Institutional Hub</p>
            <p className="text-slate-300 text-[10px] mt-4 uppercase tracking-[0.2em] font-bold">This section is being synchronized with the academic database.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagementPortal;