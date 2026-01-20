
import React, { useState, useMemo } from 'react';
import { AppState, AssessmentData, Pupil, InterventionRecord } from '../types';
import { SCHOOL_HIERARCHY, INTERVENTION_REASONS, INTERVENTION_ACTIONS, WEEK_COUNT } from '../constants';

interface Props {
  fullState: AppState;
}

const PupilPortal: React.FC<Props> = ({ fullState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPupilId, setSelectedPupilId] = useState<string | null>(null);
  
  // Advanced Filter States
  const [filterClass, setFilterClass] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterWeek, setFilterWeek] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const schoolName = fullState.management.settings.name;

  // Extract all unique pupils and their aggregated history from all assessment data
  const allPupils = useMemo(() => {
    const pupilMap = new Map<string, { 
      id: string, 
      name: string, 
      className: string, 
      subjects: Set<string>,
      weeks: Set<string>,
      interventions: InterventionRecord[] 
    }>();
    
    (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
      Object.values(fullState[cat]).forEach((data: AssessmentData) => {
        data.pupils.forEach(p => {
          if (p.name && !p.id.startsWith('empty-')) {
            const existing = pupilMap.get(p.id);
            const combinedInterventions = [...(existing?.interventions || []), ...(p.interventions || [])];
            // Deduplicate interventions by ID
            const uniqueInterventions = Array.from(new Map(combinedInterventions.map(i => [i.id, i])).values());
            
            const subjects = existing?.subjects || new Set<string>();
            if (data.subject) subjects.add(data.subject);

            const weeks = existing?.weeks || new Set<string>();
            if (data.week) weeks.add(data.week);

            pupilMap.set(p.id, { 
              id: p.id, 
              name: p.name, 
              className: data.className,
              subjects: subjects,
              weeks: weeks,
              interventions: uniqueInterventions
            });
          }
        });
      });
    });
    
    return Array.from(pupilMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [fullState]);

  const allClasses = useMemo(() => 
    Object.values(SCHOOL_HIERARCHY).flatMap(group => group.classes), 
  []);
  
  const allSubjects = useMemo(() => 
    fullState.management.subjects.map(s => s.name).sort(),
  [fullState.management.subjects]);

  const allWeeks = useMemo(() => 
    Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()),
  []);

  const filteredPupils = useMemo(() => {
    return allPupils.filter(p => {
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterClass && p.className !== filterClass) return false;
      if (filterSubject && !p.subjects.has(filterSubject)) return false;
      if (filterWeek && !p.weeks.has(filterWeek)) return false;
      if (filterReason && !p.interventions.some(int => int.reasonCategory === filterReason)) return false;
      if (filterAction && !p.interventions.some(int => int.actionTaken === filterAction)) return false;
      return true;
    });
  }, [allPupils, searchTerm, filterClass, filterSubject, filterWeek, filterReason, filterAction]);

  const resetFilters = () => {
    setSearchTerm('');
    setFilterClass('');
    setFilterSubject('');
    setFilterWeek('');
    setFilterReason('');
    setFilterAction('');
  };

  const selectedPupil = allPupils.find(p => p.id === selectedPupilId);

  const pupilRecords = useMemo(() => {
    if (!selectedPupilId) return null;
    const records: { week: string, subject: string, category: string, scores: string[], intervention?: string }[] = [];
    (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
      Object.values(fullState[cat]).forEach((data: AssessmentData) => {
        const p = data.pupils.find(pup => pup.id === selectedPupilId);
        if (p) {
          records.push({
            week: data.week,
            subject: data.subject || 'N/A',
            category: cat.replace('Work', '').toUpperCase(),
            scores: Object.values(p.scores) as string[],
            intervention: p.interventionReason
          });
        }
      });
    });
    return records.sort((a, b) => parseInt(a.week) - parseInt(b.week));
  }, [selectedPupilId, fullState]);

  const poorThreshold = fullState.management.settings.poorPerformanceThreshold;

  const handlePrint = () => window.print();

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-in fade-in slide-in-from-bottom-12 duration-700">
      {/* Sidebar - SEARCH & ADVANCED ANALYTICAL FILTERS */}
      <div className="no-print lg:w-[350px] bg-white rounded-[2rem] border border-sky-100 shadow-xl overflow-hidden flex flex-col h-auto lg:h-[800px] shrink-0">
        <div className="p-6 bg-sky-950 text-white shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black uppercase tracking-tighter leading-none">Record Filters</h3>
            <button onClick={resetFilters} className="text-[8px] font-black uppercase text-sky-400 hover:text-white transition-colors underline underline-offset-2">Reset All</button>
          </div>
          
          <div className="space-y-3">
            <input 
              type="text" 
              className="w-full bg-white/10 border border-white/20 p-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest placeholder-white/30 focus:outline-none focus:bg-white/20 transition-all"
              placeholder="Search Pupil Name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-1.5">
              <select className="bg-white/5 border border-white/10 p-2 rounded-xl text-[8px] font-black uppercase text-sky-200" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                <option value="" className="text-sky-950">Any Class</option>
                {allClasses.map(c => <option key={c} value={c} className="text-sky-950">{c}</option>)}
              </select>
              <select className="bg-white/5 border border-white/10 p-2 rounded-xl text-[8px] font-black uppercase text-sky-200" value={filterWeek} onChange={(e) => setFilterWeek(e.target.value)}>
                <option value="" className="text-sky-950">Any Week</option>
                {allWeeks.map(w => <option key={w} value={w} className="text-sky-950">Week {w}</option>)}
              </select>
            </div>
            
            <select className="w-full bg-white/5 border border-white/10 p-2 rounded-xl text-[8px] font-black uppercase text-sky-200" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
              <option value="" className="text-sky-950">Any Subject Area</option>
              {allSubjects.map(s => <option key={s} value={s} className="text-sky-950">{s}</option>)}
            </select>

            <div className="pt-2 border-t border-white/10 space-y-2">
              <span className="text-[7px] font-black text-rose-400 uppercase tracking-widest block ml-1">Clinical Filters</span>
              <select className="w-full bg-white/5 border border-rose-900/30 p-2 rounded-xl text-[8px] font-black uppercase text-rose-200" value={filterReason} onChange={(e) => setFilterReason(e.target.value)}>
                <option value="" className="text-sky-950">Any Reason Category</option>
                {INTERVENTION_REASONS.map(r => <option key={r} value={r} className="text-sky-950">{r}</option>)}
              </select>
              <select className="w-full bg-white/5 border border-sky-900/30 p-2 rounded-xl text-[8px] font-black uppercase text-sky-200" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                <option value="" className="text-sky-950">Any Prescribed Action</option>
                {INTERVENTION_ACTIONS.map(a => <option key={a} value={a} className="text-sky-950">{a}</option>)}
              </select>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 scrollbar-hide bg-[#fcfdfe] max-h-[400px] lg:max-h-none">
          {filteredPupils.length > 0 ? (
            filteredPupils.map(p => (
              <button 
                key={p.id}
                onClick={() => setSelectedPupilId(p.id)}
                className={`w-full text-left p-4 rounded-[1.5rem] border-2 transition-all flex items-center justify-between ${selectedPupilId === p.id ? 'bg-sky-50 border-sky-600 shadow-md' : 'bg-white border-transparent shadow-sm'}`}
              >
                <div className="truncate pr-2">
                  <div className={`font-black uppercase text-xs leading-none mb-1 ${selectedPupilId === p.id ? 'text-sky-950' : 'text-slate-700'}`}>{p.name}</div>
                  <div className="flex items-center gap-1.5">
                    <div className="text-[8px] font-bold text-sky-400 uppercase">{p.className}</div>
                    {p.interventions.length > 0 && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span className="text-[7px] font-black text-rose-500 uppercase">{p.interventions.length}</span>
                      </span>
                    )}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 ${selectedPupilId === p.id ? 'bg-sky-600 text-white rotate-90' : 'bg-slate-50 text-slate-300'}`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg>
                </div>
              </button>
            ))
          ) : (
            <div className="py-12 text-center opacity-30 flex flex-col items-center">
              <div className="text-2xl mb-2">🔍</div>
              <p className="font-black uppercase tracking-widest text-[8px]">No matching records found</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-6 overflow-y-auto h-auto lg:h-[800px] pr-1 scrollbar-hide print:h-auto print:p-0">
        {selectedPupil ? (
          <div className="space-y-6 pb-20 print:pb-0 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="no-print flex justify-end gap-2 mb-2">
              <button onClick={handlePrint} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-sky-100 text-sky-950 text-[9px] font-black uppercase rounded-xl shadow-sm hover:bg-sky-50 transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" /></svg>
                Print Assessment Report
              </button>
            </div>

            <div className="bg-white rounded-[2rem] p-6 md:p-8 border border-sky-100 shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
               <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-sky-950 text-white flex items-center justify-center text-3xl md:text-4xl font-black">
                 {selectedPupil.name.charAt(0)}
               </div>
               <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-black text-sky-950 uppercase tracking-tighter leading-tight mb-2">{selectedPupil.name}</h2>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                     <div className="bg-sky-50 px-3 py-1 rounded-lg border border-sky-100">
                        <span className="text-[8px] font-black text-sky-950 uppercase tracking-widest">{selectedPupil.className}</span>
                     </div>
                     <div className="bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
                        <span className="text-[8px] font-black text-rose-700 uppercase tracking-widest">{selectedPupil.interventions.length} Intervention Records</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Clinical Record */}
            <div className="bg-white rounded-[2rem] p-6 border border-sky-100 shadow-xl relative animate-in fade-in slide-in-from-bottom-4 duration-700">
               <h4 className="text-base font-black text-sky-950 uppercase mb-6 flex items-center gap-2">
                 <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-sm shadow-sm border border-rose-100">🏥</span>
                 Intervention Matrix Log
               </h4>
               <div className="space-y-4">
                  {selectedPupil.interventions.length > 0 ? (
                    [...selectedPupil.interventions].reverse().map((int, idx) => (
                      <div key={int.id} className="relative pl-6 border-l-2 border-slate-100 pb-6 last:pb-0 animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="absolute left-[-6px] top-0 w-2.5 h-2.5 rounded-full bg-white border-2 border-rose-400"></div>
                        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-rose-100 transition-colors">
                           <div className="flex justify-between items-start mb-2">
                              <div>
                                 <div className="text-[8px] font-black text-sky-400 uppercase tracking-widest mb-0.5">Week {int.week} • {int.subject}</div>
                                 <div className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{int.reasonCategory}</div>
                              </div>
                              <div className="text-[7px] font-black text-slate-300 uppercase">{int.date}</div>
                           </div>
                           <div className="bg-white p-3 rounded-xl border border-slate-200 mb-2 shadow-inner">
                              <div className="text-[8px] font-black text-sky-600 uppercase mb-1 tracking-widest">Prescribed Action</div>
                              <p className="text-[9px] font-bold text-sky-900 uppercase leading-tight">{int.actionTaken}</p>
                           </div>
                           {int.notes && (
                              <div className="text-[9px] text-slate-500 italic mb-2 border-l-2 border-sky-100 pl-3 py-1">
                                {int.notes}
                              </div>
                           )}
                           <div className="text-right">
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Facilitator: {int.facilitator}</span>
                           </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-12 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">No intervention history recorded for this pupil.</p>
                  )}
               </div>
            </div>

            {/* Scores History */}
            <div className="bg-white rounded-[2rem] p-6 border border-sky-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700">
               <h4 className="text-base font-black text-sky-950 uppercase mb-6 flex items-center gap-2">
                 <span className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center text-sm shadow-sm border border-sky-100">📈</span>
                 Progress Assessment Stream
               </h4>
               <div className="space-y-3">
                  {pupilRecords && pupilRecords.length > 0 ? (
                    pupilRecords.map((rec, idx) => (
                      <div key={idx} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 hover:bg-white transition-all group animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="flex flex-col gap-3">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center shadow-sm shrink-0 group-hover:border-sky-300 transition-colors">
                                <span className="text-[7px] font-black text-slate-400 uppercase leading-none">Wk</span>
                                <span className="text-xs font-black text-sky-950">{rec.week}</span>
                              </div>
                              <div className="truncate">
                                <div className="text-[10px] font-black text-sky-950 uppercase leading-none mb-1 truncate">{rec.subject}</div>
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{rec.category} ASSESSMENT</div>
                              </div>
                           </div>
                           <div className="flex flex-wrap gap-1.5 justify-end">
                             {rec.scores.map((s, i) => {
                               const val = parseFloat(s);
                               const isLow = !isNaN(val) && val <= poorThreshold;
                               return (
                                 <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black border transition-all ${isLow ? 'bg-rose-50 border-rose-200 text-rose-500' : 'bg-white border-sky-100 text-sky-800'}`}>
                                   {s || '-'}
                                 </div>
                               );
                             })}
                           </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-12 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest">No progress data found in the current session logs.</p>
                  )}
               </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center bg-white/40 backdrop-blur-md rounded-[2rem] border border-sky-100 text-center px-6 min-h-[500px] animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="text-6xl mb-6 opacity-10 grayscale">👤</div>
            <h3 className="text-lg font-black text-sky-950 uppercase tracking-tighter">Unified Intelligence Portal</h3>
            <p className="text-[9px] text-sky-400 font-bold uppercase tracking-[0.3em] mt-3 max-w-xs mx-auto leading-relaxed">Select a pupil from the registry to retrieve aggregated academic logs and clinical history.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PupilPortal;
