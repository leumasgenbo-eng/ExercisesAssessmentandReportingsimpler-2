
import React, { useState, useMemo } from 'react';
import { ManagementState, Staff, FacilitatorSubjectMapping, FacilitatorRoleType, EmploymentType, SchoolGroup, AppState, AssessmentData, ExerciseMetadata, InterventionRecord, WeeklyMapping, PlanningRemarks, AssessmentType } from '../types';
import { SCHOOL_HIERARCHY, SUBJECTS_BY_GROUP, WEEK_COUNT, INTERVENTION_REASONS } from '../constants';

interface Props {
  data: ManagementState;
  onUpdate: (data: ManagementState) => void;
  fullAppState?: AppState;
}

type FacilitatorSubView = 'REGISTRATION' | 'SUMMARY' | 'COMPLIANCE' | 'DEFAULTERS';

const FacilitatorPanel: React.FC<Props> = ({ data, onUpdate, fullAppState }) => {
  const [panelView, setPanelView] = useState<FacilitatorSubView>('REGISTRATION');
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [activeMappingType, setActiveMappingType] = useState<FacilitatorRoleType>('CLASS_BASED');
  const [activeEmployment, setActiveEmployment] = useState<EmploymentType>('FULL_TIME');
  
  // Grid Filters
  const [gridFilterClass, setGridFilterClass] = useState('');
  const [gridFilterSubjectId, setGridFilterSubjectId] = useState('');
  const [gridFilterWeek, setGridFilterWeek] = useState('');

  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Facilitator');

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [activeStatsMapping, setActiveStatsMapping] = useState<FacilitatorSubjectMapping | null>(null);
  const [editingWeek, setEditingWeek] = useState<string | null>(null);

  const [tempSelection, setTempSelection] = useState<Record<string, boolean>>({});
  const [targetClass, setTargetClass] = useState('');
  const [targetSubjectId, setTargetSubjectId] = useState('');

  // --- Helper Functions ---
  const getGroupFromClass = (className: string): SchoolGroup => {
    for (const [group, config] of Object.entries(SCHOOL_HIERARCHY)) {
      if (config.classes.includes(className)) return group as SchoolGroup;
    }
    return 'LOWER_BASIC';
  };

  const getMappingsForDuty = (className: string, subject: string) => {
    return (data.weeklyMappings || []).filter(wm => 
      wm.className === className && wm.subject === subject
    );
  };

  // --- Advanced Institutional Intelligence ---
  const institutionalIntel = useMemo(() => {
    if (!fullAppState) return null;

    const subjectStats: Record<string, { 
      exCount: number, 
      defaulters: number, 
      indicators: Set<string>, 
      weeksActive: Set<string>,
      weeklyCounts: Record<string, number>
    }> = {};
    const classStats: Record<string, { 
      exCount: number, 
      defaulters: number, 
      pupils: number, 
      scores: number,
      weeksActive: Set<string>
    }> = {};
    const weeklyWorkload: Record<string, Record<AssessmentType, number>> = {};
    
    (['classWork', 'homeWork', 'projectWork'] as const).forEach(workType => {
      const category = workType === 'classWork' ? 'CLASS' : workType === 'homeWork' ? 'HOME' : 'PROJECT';
      Object.entries(fullAppState[workType]).forEach(([key, assessmentVal]) => {
        const assessment = assessmentVal as AssessmentData;
        const [wk, cls, sub] = key.split('|');
        if (!assessment) return;

        if (!subjectStats[sub]) subjectStats[sub] = { exCount: 0, defaulters: 0, indicators: new Set(), weeksActive: new Set(), weeklyCounts: {} };
        if (!classStats[cls]) classStats[cls] = { exCount: 0, defaulters: 0, pupils: 0, scores: 0, weeksActive: new Set() };
        if (!weeklyWorkload[wk]) weeklyWorkload[wk] = { CLASS: 0, HOME: 0, PROJECT: 0, CRITERION: 0 };

        let exInThisAssessment = 0;
        (Object.values(assessment.exercises) as ExerciseMetadata[]).forEach(ex => {
          if (ex.maxScore && ex.maxScore !== '') {
            subjectStats[sub].exCount++;
            classStats[cls].exCount++;
            weeklyWorkload[wk][category]++;
            subjectStats[sub].weeksActive.add(wk);
            classStats[cls].weeksActive.add(wk);
            exInThisAssessment++;
            if (ex.indicatorCodes) ex.indicatorCodes.forEach(code => code && subjectStats[sub].indicators.add(code.trim()));
          }
        });
        
        subjectStats[sub].weeklyCounts[wk] = (subjectStats[sub].weeklyCounts[wk] || 0) + exInThisAssessment;

        const threshold = data.settings.poorPerformanceThreshold || 10;
        assessment.pupils.forEach(pupil => {
          classStats[cls].pupils++;
          const pupilScores = Object.values(pupil.scores) as string[];
          classStats[cls].scores += pupilScores.length;
          
          const isDefaulter = pupilScores.some(s => parseFloat(s) <= threshold) || (pupil.interventions && pupil.interventions.length > 0);
          if (isDefaulter) {
            subjectStats[sub].defaulters++;
            classStats[cls].defaulters++;
          }
        });
      });
    });

    const midWeek = Math.ceil(WEEK_COUNT / 2);
    const growthRates = { CLASS: 0, HOME: 0, PROJECT: 0 };
    (['CLASS', 'HOME', 'PROJECT'] as const).forEach(type => {
      let firstHalf = 0, secondHalf = 0;
      Object.entries(weeklyWorkload).forEach(([wk, types]) => {
        const wNum = parseInt(wk);
        if (wNum <= midWeek) firstHalf += types[type];
        else secondHalf += types[type];
      });
      growthRates[type] = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
    });

    return {
      subjectStats: Object.entries(subjectStats).map(([name, s]) => {
        const values = Object.values(s.weeklyCounts);
        return {
          name,
          avgEx: s.exCount / (s.weeksActive.size || 1),
          minEx: values.length > 0 ? Math.min(...values) : 0,
          maxEx: values.length > 0 ? Math.max(...values) : 0,
          defaulters: s.defaulters,
          exposureRatio: s.indicators.size / (s.weeksActive.size || 1)
        };
      }).sort((a, b) => b.defaulters - a.defaulters),
      classStats: Object.entries(classStats).map(([name, s]) => ({
        name,
        avgEx: s.exCount / (s.weeksActive.size || 1),
        defaulters: s.defaulters,
        completionRatio: s.pupils > 0 ? s.scores / (s.pupils * 5) : 0 
      })).sort((a, b) => b.completionRatio - a.completionRatio), 
      growthRates,
      weeklyWorkload
    };
  }, [fullAppState, data.settings.poorPerformanceThreshold]);

  // --- Stats Intelligence ---
  const calculatedStats = useMemo(() => {
    if (!activeStatsMapping || !fullAppState) return null;
    const subjectName = data.subjects.find(s => s.id === activeStatsMapping.subjectId)?.name || '';
    const keyPrefix = `|${activeStatsMapping.className}|${subjectName}`;
    
    let totalExercises = 0;
    let interventionCount = 0;
    
    (['classWork', 'homeWork', 'projectWork'] as const).forEach(workType => {
      Object.entries(fullAppState[workType]).forEach(([key, assessmentVal]) => {
        const assessment = assessmentVal as AssessmentData;
        if (key.endsWith(keyPrefix)) {
          totalExercises += (Object.values(assessment.exercises) as ExerciseMetadata[]).filter(ex => ex.maxScore && ex.maxScore !== '').length;
          assessment.pupils.forEach(p => {
            interventionCount += (p.interventions || []).length;
          });
        }
      });
    });

    const plans = getMappingsForDuty(activeStatsMapping.className, subjectName);
    const totalPlannedIndicators = plans.reduce((acc, p) => acc + (p.indicators ? p.indicators.split(',').length : 0), 0);
    const completedIndicators = Math.min(totalPlannedIndicators, totalExercises); 

    return {
      totalExercises,
      interventionCount,
      totalPlannedIndicators,
      completedIndicators,
      avgWeeklyExercises: totalExercises / WEEK_COUNT
    };
  }, [activeStatsMapping, fullAppState, data.subjects, data.weeklyMappings]);

  const allClasses = useMemo(() => 
    Object.values(SCHOOL_HIERARCHY).flatMap(group => group.classes), 
  []);

  const staffMappings = useMemo(() => {
    const groups: Record<string, FacilitatorSubjectMapping[]> = {};
    let baseMappings = data.mappings || [];

    if (gridFilterClass) {
      baseMappings = baseMappings.filter(m => m.className === gridFilterClass);
    }
    if (gridFilterSubjectId) {
      baseMappings = baseMappings.filter(m => m.subjectId === gridFilterSubjectId);
    }
    if (gridFilterWeek) {
      baseMappings = baseMappings.filter(m => {
        const subName = data.subjects.find(s => s.id === m.subjectId)?.name || '';
        return (data.weeklyMappings || []).some(wm => 
          wm.className === m.className && 
          wm.subject === subName && 
          wm.week === gridFilterWeek &&
          wm.strand !== '' 
        );
      });
    }

    baseMappings.forEach(m => {
      if (!groups[m.staffId]) groups[m.staffId] = [];
      groups[m.staffId].push(m);
    });
    return groups;
  }, [data.mappings, data.subjects, data.weeklyMappings, gridFilterClass, gridFilterSubjectId, gridFilterWeek]);

  const openConfiguration = () => {
    if (!selectedStaffId) return alert("Select staff first");
    setTempSelection({});
    setTargetClass('');
    setTargetSubjectId('');
    setIsConfigOpen(true);
  };

  const openStats = (mapping: FacilitatorSubjectMapping) => {
    setActiveStatsMapping(mapping);
    setIsStatsOpen(true);
  };

  const toggleSelection = (cls: string, subId: string) => {
    const key = `${cls}|${subId}`;
    setTempSelection(prev => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const saveConfiguration = () => {
    const activeSelections = Object.entries(tempSelection).filter(([_, v]) => v);
    const newMappings: FacilitatorSubjectMapping[] = activeSelections.map(([key]) => {
      const [cls, subId] = key.split('|');
      return {
        id: `map-${Date.now()}-${Math.random()}`,
        staffId: selectedStaffId,
        className: cls,
        subjectId: subId,
        type: activeMappingType,
        employmentType: activeEmployment
      };
    });
    onUpdate({ ...data, mappings: [...(data.mappings || []), ...newMappings] });
    setIsConfigOpen(false);
  };

  const updateIndividualMapping = (id: string, field: keyof WeeklyMapping, value: any) => {
    const newMappings = (data.weeklyMappings || []).map(wm => wm.id === id ? { ...wm, [field]: value } : wm);
    onUpdate({ ...data, weeklyMappings: newMappings });
  };

  const resetGridFilters = () => {
    setGridFilterClass('');
    setGridFilterSubjectId('');
    setGridFilterWeek('');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <div className="flex flex-col gap-6">
        
        <div className="no-print bg-white border border-sky-100 rounded-3xl p-5 md:p-10 flex flex-col md:flex-row justify-between items-center shadow-sm gap-4">
          <div className="text-center md:text-left">
            <h2 className="text-xl md:text-3xl font-black text-sky-950 uppercase tracking-tighter leading-none mb-1">Staff Roster</h2>
            <p className="text-[9px] md:text-xs font-bold text-sky-400 uppercase tracking-widest">United Baylor Institutional Intelligence</p>
          </div>
          <div className="bg-sky-50 p-1 rounded-2xl border border-sky-100 flex shadow-inner w-full md:w-auto">
                <button onClick={() => setPanelView('REGISTRATION')} className={`flex-1 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${panelView === 'REGISTRATION' ? 'bg-sky-600 text-white shadow-lg' : 'text-sky-400'}`}>Roster</button>
                <button onClick={() => setPanelView('SUMMARY')} className={`flex-1 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${panelView === 'SUMMARY' ? 'bg-sky-600 text-white shadow-lg' : 'text-sky-400'}`}>Summary</button>
                <button onClick={() => setPanelView('COMPLIANCE')} className={`flex-1 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${panelView === 'COMPLIANCE' ? 'bg-sky-600 text-white shadow-lg' : 'text-sky-400'}`}>Compliance</button>
          </div>
        </div>

        {panelView === 'REGISTRATION' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-sky-100 flex flex-col h-auto max-h-[600px] md:max-h-none animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="mb-6 font-black text-sky-900 uppercase tracking-widest text-[10px]">Registry</div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!newStaffName) return;
                onUpdate({ ...data, staff: [...data.staff, { id: `s-${Date.now()}`, name: newStaffName, email: newStaffEmail, role: newStaffRole }] });
                setNewStaffName(''); setNewStaffEmail('');
              }} className="space-y-3 mb-6">
                <input className="w-full bg-sky-50 border-none p-4 rounded-xl font-bold text-sky-900 text-xs" placeholder="Full Name..." value={newStaffName} onChange={(e) => setNewStaffName(e.target.value)} />
                <button className="w-full bg-sky-950 text-white font-black uppercase text-[9px] py-4 rounded-xl shadow-lg">Add Facilitator</button>
              </form>
              <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-hide">
                {data.staff.map(s => (
                  <div key={s.id} onClick={() => setSelectedStaffId(s.id)} className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedStaffId === s.id ? 'bg-sky-50 border-sky-600' : 'bg-white border-transparent'}`}>
                    <div className="font-black text-sky-950 uppercase text-[11px] leading-none mb-1">{s.name}</div>
                    <div className="text-[8px] font-bold text-sky-300 uppercase truncate">{s.role}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="bg-sky-950 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700">
                 <h3 className="text-xl font-black uppercase mb-8">Responsibility Management</h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Mode</label>
                       <select className="w-full bg-white/10 border-none p-3 rounded-xl font-black text-white text-[10px]" value={activeMappingType} onChange={(e) => setActiveMappingType(e.target.value as FacilitatorRoleType)}>
                          <option value="CLASS_BASED" className="text-sky-950">Class Based</option>
                          <option value="SUBJECT_BASED" className="text-sky-950">Subject Based</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-sky-500 uppercase tracking-widest">Employment</label>
                       <select className="w-full bg-white/10 border-none p-3 rounded-xl font-black text-white text-[10px]" value={activeEmployment} onChange={(e) => setActiveEmployment(e.target.value as EmploymentType)}>
                          <option value="FULL_TIME" className="text-sky-950">Full Time</option>
                          <option value="PART_TIME" className="text-sky-950">Part Time</option>
                       </select>
                    </div>
                    <div className="flex flex-col justify-end">
                       <button onClick={openConfiguration} className="w-full bg-sky-500 text-sky-950 h-11 rounded-xl font-black uppercase text-[9px] shadow-xl">Assign Duties</button>
                    </div>
                 </div>
                 
                 <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-sky-100 shadow-xl min-h-[400px]">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 border-b border-sky-50 pb-6">
                       <div>
                          <h3 className="text-lg font-black text-sky-950 uppercase underline underline-offset-4 decoration-sky-100">Live Grid</h3>
                          <p className="text-[8px] font-bold text-sky-400 uppercase tracking-[0.2em] mt-1">Teaching Responsibilities Monitoring</p>
                       </div>
                       
                       <div className="flex flex-wrap items-end gap-2 w-full md:w-auto justify-end">
                          <div className="flex flex-col">
                             <span className="text-[7px] font-black text-sky-400 uppercase tracking-widest mb-1 ml-1">Class</span>
                             <select value={gridFilterClass} onChange={(e) => setGridFilterClass(e.target.value)} className="bg-sky-50 border-none rounded-lg px-2 py-1.5 text-[9px] font-black uppercase text-sky-900 focus:ring-1 focus:ring-sky-200 outline-none min-w-[100px]">
                                <option value="">- ALL -</option>
                                {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[7px] font-black text-sky-400 uppercase tracking-widest mb-1 ml-1">Subject</span>
                             <select value={gridFilterSubjectId} onChange={(e) => setGridFilterSubjectId(e.target.value)} className="bg-sky-50 border-none rounded-lg px-2 py-1.5 text-[9px] font-black uppercase text-sky-900 focus:ring-1 focus:ring-sky-200 outline-none min-w-[120px]">
                                <option value="">- ALL -</option>
                                {data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                             </select>
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[7px] font-black text-sky-400 uppercase tracking-widest mb-1 ml-1">Week</span>
                             <select value={gridFilterWeek} onChange={(e) => setGridFilterWeek(e.target.value)} className="bg-sky-50 border-none rounded-lg px-2 py-1.5 text-[9px] font-black uppercase text-sky-900 focus:ring-1 focus:ring-sky-200 outline-none w-16">
                                <option value="">-</option>
                                {Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()).map(w => <option key={w} value={w}>{w}</option>)}
                             </select>
                          </div>
                          <button onClick={resetGridFilters} className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm" title="Clear Filters">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                       </div>
                    </div>

                    <div className="space-y-6">
                      {Object.entries(staffMappings).length > 0 ? (
                        Object.entries(staffMappings).map(([staffId, mappings]) => {
                          const staff = data.staff.find(s => s.id === staffId);
                          if (!staff) return null;
                          return (
                            <div key={staffId} className="border-b border-sky-50 pb-6 last:border-0 animate-in fade-in slide-in-from-bottom-2 duration-700">
                              <div className="font-black text-sky-950 uppercase text-xs mb-3 flex items-center gap-2">
                                <span className="w-8 h-8 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center text-[10px] font-black">{staff.name.charAt(0)}</span>
                                {staff.name}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(mappings as FacilitatorSubjectMapping[]).map(m => (
                                  <div key={m.id} className="bg-sky-50/50 p-3 rounded-xl border border-sky-100 flex items-center justify-between group">
                                    <div className="truncate flex-1">
                                      <div className="text-[10px] font-black text-sky-900 uppercase truncate">{data.subjects.find(s => s.id === m.subjectId)?.name || m.subjectId}</div>
                                      <div className="text-[8px] font-bold text-sky-400 uppercase">{m.className}</div>
                                    </div>
                                    <button onClick={() => openStats(m)} className="p-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-600 hover:text-white transition-all">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-20 text-center opacity-20">
                           <p className="text-[10px] font-black uppercase tracking-widest text-sky-950">No duties match current filters</p>
                        </div>
                      )}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}

        {panelView === 'SUMMARY' && institutionalIntel && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-sky-950 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-white/5 rounded-full blur-3xl transition-all group-hover:bg-sky-500/10"></div>
                  <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-4 block">Institutional Rigor</span>
                  <div className="text-4xl font-black mb-2">{institutionalIntel.subjectStats.reduce((acc, s) => acc + s.avgEx, 0).toFixed(1)}</div>
                  <p className="text-[9px] font-bold text-sky-500 uppercase leading-relaxed">Aggregated Average Exercises per Subject across all logged weeks.</p>
               </div>
               <div className="bg-white rounded-[2.5rem] p-8 border border-sky-100 shadow-xl group">
                  <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.2em] mb-4 block">Default Concentration</span>
                  <div className="text-4xl font-black text-sky-950 mb-2">{institutionalIntel.subjectStats[0]?.name || 'N/A'}</div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">Subject currently holding the highest volume of defaulter flags ({institutionalIntel.subjectStats[0]?.defaulters || 0} cases).</p>
               </div>
               <div className="bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100 shadow-xl group">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-4 block">Completion Milestone</span>
                  <div className="text-4xl font-black text-emerald-700 mb-2">{(institutionalIntel.classStats.reduce((acc, s) => acc + s.completionRatio, 0) / (institutionalIntel.classStats.length || 1) * 100).toFixed(1)}%</div>
                  <p className="text-[9px] font-bold text-emerald-400 uppercase leading-relaxed">Overall institutional submission ratio for the current academic session.</p>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white rounded-[3rem] p-10 border border-sky-50 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-1000">
                  <h4 className="text-xl font-black text-sky-950 uppercase mb-8 border-b-2 border-sky-50 pb-4">Subject Intel Matrix (Ranges & Load)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[10px] font-black uppercase">
                       <thead className="text-sky-300">
                          <tr className="border-b border-sky-50">
                             <th className="py-4">Subject</th>
                             <th className="py-4 text-center">Avg Ex</th>
                             <th className="py-4 text-center">Range (Min-Max)</th>
                             <th className="py-4 text-center">Exp. Ratio</th>
                             <th className="py-4 text-right">Defaulters</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-sky-50">
                          {institutionalIntel.subjectStats.map((s, idx) => (
                             <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                                <td className="py-5 text-sky-950">{s.name}</td>
                                <td className="py-5 text-center text-sky-600 font-black">{s.avgEx.toFixed(1)}</td>
                                <td className="py-5 text-center text-slate-400 font-bold">{s.minEx} - {s.maxEx}</td>
                                <td className="py-5 text-center text-indigo-500 font-black">{s.exposureRatio.toFixed(2)} Ind/Wk</td>
                                <td className="py-5 text-right"><span className={`px-2 py-1 rounded-md ${s.defaulters > 10 ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>{s.defaulters}</span></td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
               </div>

               <div className="bg-sky-950 rounded-[3rem] p-10 text-white shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000">
                  <h4 className="text-xl font-black uppercase mb-8 border-b-2 border-white/5 pb-4">Class Performance Tiers (Order of Completion)</h4>
                  <div className="space-y-4">
                     {institutionalIntel.classStats.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                           <div>
                              <div className="text-xs font-black uppercase">{c.name}</div>
                              <div className="text-[8px] font-bold text-sky-500 uppercase tracking-widest mt-1">Completion: {(c.completionRatio * 100).toFixed(1)}%</div>
                           </div>
                           <div className="text-right">
                              <div className="text-xs font-black text-sky-300">{c.avgEx.toFixed(2)} <span className="text-[8px] opacity-50">Ex/Wk</span></div>
                              <div className={`text-[9px] font-black uppercase mt-1 ${c.defaulters > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>{c.defaulters} DEFAULTS</div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
          </div>
        )}

        {panelView === 'COMPLIANCE' && institutionalIntel && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
             <div className="bg-white rounded-[3rem] p-10 border border-sky-100 shadow-xl">
                <h3 className="text-2xl font-black text-sky-950 uppercase tracking-tighter mb-10 border-b-2 border-sky-50 pb-6">Work Distribution & Growth Rates</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                   <div className="space-y-6">
                      <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Class Work Growth</span>
                         <div className={`text-xl font-black flex items-center gap-1 ${institutionalIntel.growthRates.CLASS >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {institutionalIntel.growthRates.CLASS.toFixed(1)}%
                            <svg className={`w-5 h-5 ${institutionalIntel.growthRates.CLASS < 0 ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path d="M5 10l5-5 5 5H5z"/></svg>
                         </div>
                      </div>
                      <div className="h-2 bg-sky-50 rounded-full overflow-hidden">
                         <div className="h-full bg-sky-600 transition-all duration-1000" style={{width: `${Math.min(100, Math.max(20, institutionalIntel.growthRates.CLASS + 50))}%`}}></div>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">Activity volume trend for the class-based assessment category.</p>
                   </div>

                   <div className="space-y-6">
                      <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Home Work Growth</span>
                         <div className={`text-xl font-black flex items-center gap-1 ${institutionalIntel.growthRates.HOME >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                            {institutionalIntel.growthRates.HOME.toFixed(1)}%
                            <svg className={`w-5 h-5 ${institutionalIntel.growthRates.HOME < 0 ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path d="M5 10l5-5 5 5H5z"/></svg>
                         </div>
                      </div>
                      <div className="h-2 bg-indigo-50 rounded-full overflow-hidden">
                         <div className="h-full bg-indigo-600 transition-all duration-1000" style={{width: `${Math.min(100, Math.max(20, institutionalIntel.growthRates.HOME + 50))}%`}}></div>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">Engagement growth across home-based study assignments.</p>
                   </div>

                   <div className="space-y-6">
                      <div className="flex justify-between items-end">
                         <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Project Growth</span>
                         <div className={`text-xl font-black flex items-center gap-1 ${institutionalIntel.growthRates.PROJECT >= 0 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {institutionalIntel.growthRates.PROJECT.toFixed(1)}%
                            <svg className={`w-5 h-5 ${institutionalIntel.growthRates.PROJECT < 0 ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20"><path d="M5 10l5-5 5 5H5z"/></svg>
                         </div>
                      </div>
                      <div className="h-2 bg-amber-50 rounded-full overflow-hidden">
                         <div className="h-full bg-amber-600 transition-all duration-1000" style={{width: `${Math.min(100, Math.max(20, institutionalIntel.growthRates.PROJECT + 50))}%`}}></div>
                      </div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">Strategic rigor and project-based outcome expansion.</p>
                   </div>
                </div>
             </div>

             <div className="bg-sky-950 rounded-[3rem] p-10 text-white shadow-2xl animate-in fade-in slide-in-from-bottom-12 duration-1000">
                <h4 className="text-xl font-black uppercase mb-8 border-b border-white/10 pb-4">Institutional Load Avg Ex/Sub</h4>
                <div className="overflow-x-auto scrollbar-hide">
                   <div className="flex items-end gap-3 h-64 min-w-[800px]">
                      {Array.from({ length: WEEK_COUNT }, (_, i) =>