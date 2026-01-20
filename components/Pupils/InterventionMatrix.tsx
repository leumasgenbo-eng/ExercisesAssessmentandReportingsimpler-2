
import React, { useState, useMemo } from 'react';
import { AppState, AssessmentData, InterventionRecord, SchoolGroup } from '../../types';
import { SCHOOL_HIERARCHY, SUBJECTS_BY_GROUP, WEEK_COUNT } from '../../constants';

interface Props {
  fullState: AppState;
}

const InterventionMatrix: React.FC<Props> = ({ fullState }) => {
  const [filterClass, setFilterClass] = useState('Basic 1A');
  const [filterSubject, setFilterSubject] = useState('');
  const [hoveredCell, setHoveredCell] = useState<{ pupilId: string; week: string } | null>(null);

  const allClasses = useMemo(() => 
    Object.values(SCHOOL_HIERARCHY).flatMap(group => group.classes), 
  []);

  const subjectsForClass = useMemo(() => {
    let group: SchoolGroup = 'LOWER_BASIC';
    for (const [g, config] of Object.entries(SCHOOL_HIERARCHY)) {
      if (config.classes.includes(filterClass)) {
        group = g as SchoolGroup;
        break;
      }
    }
    return SUBJECTS_BY_GROUP[group];
  }, [filterClass]);

  const matrixData = useMemo(() => {
    const pupilMap = new Map<string, { 
      id: string, 
      name: string, 
      weeklyInterventions: Record<string, InterventionRecord[]> 
    }>();
    
    // Scan all work categories
    (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
      Object.entries(fullState[cat]).forEach(([key, data]) => {
        const assessment = data as AssessmentData;
        const [wk, cls, sub] = key.split('|');
        
        if (cls !== filterClass) return;
        if (filterSubject && sub !== filterSubject) return;

        assessment.pupils.forEach(p => {
          if (!p.name || p.id.startsWith('empty-') || p.id.startsWith('auto-')) return;
          if (!p.interventions || p.interventions.length === 0) return;

          const existing = pupilMap.get(p.id) || { 
            id: p.id, 
            name: p.name, 
            weeklyInterventions: {} 
          };

          p.interventions.forEach(int => {
            if (filterSubject && int.subject !== filterSubject) return;
            
            if (!existing.weeklyInterventions[int.week]) {
              existing.weeklyInterventions[int.week] = [];
            }
            if (!existing.weeklyInterventions[int.week].find(i => i.id === int.id)) {
              existing.weeklyInterventions[int.week].push(int);
            }
          });

          pupilMap.set(p.id, existing);
        });
      });
    });

    return Array.from(pupilMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [fullState, filterClass, filterSubject]);

  const weeks = Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString());

  return (
    <div className="animate-in space-y-8 pb-20">
      {/* FILTERS */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl flex flex-col md:flex-row gap-6 md:items-end no-print">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Class Filter</label>
          <select 
            className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-600 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none cursor-pointer transition-all shadow-inner"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Contextual Subject</label>
          <select 
            className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-600 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none cursor-pointer transition-all shadow-inner"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">ALL BROADCASTS</option>
            {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="shrink-0 flex gap-2">
           <button onClick={() => window.print()} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all">Download Support Matrix</button>
        </div>
      </div>

      {/* MATRIX GRID */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="sticky left-0 z-20 bg-slate-900 px-8 py-6 text-[10px] font-black uppercase tracking-widest w-64 border-r border-slate-800">Pupil Identity</th>
                {weeks.map(wk => (
                  <th key={wk} className="px-4 py-6 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-800 w-16">Wk {wk}</th>
                ))}
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center w-24">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrixData.length > 0 ? (
                matrixData.map((pupil, pIdx) => {
                  const totalInts = (Object.values(pupil.weeklyInterventions) as InterventionRecord[][]).reduce((acc: number, curr) => acc + curr.length, 0);
                  return (
                    <tr key={pupil.id} className="hover:bg-rose-50/20 transition-colors group">
                      <td className="sticky left-0 z-10 bg-white group-hover:bg-rose-50/20 px-8 py-5 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                        <div className="font-black text-slate-900 uppercase text-xs tracking-tight">{pupil.name}</div>
                        <div className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">Academic Monitoring Active</div>
                      </td>
                      {weeks.map(wk => {
                        const ints = pupil.weeklyInterventions[wk] || [];
                        const hasIntervention = ints.length > 0;
                        const isHovered = hoveredCell?.pupilId === pupil.id && hoveredCell?.week === wk;

                        return (
                          <td 
                            key={wk} 
                            className={`p-1 border-r border-slate-50 text-center relative transition-all ${hasIntervention ? 'bg-rose-50/30' : ''}`}
                            onMouseEnter={() => hasIntervention && setHoveredCell({ pupilId: pupil.id, week: wk })}
                            onMouseLeave={() => setHoveredCell(null)}
                          >
                            <div className="flex items-center justify-center h-10">
                              {hasIntervention ? (
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black transition-all cursor-help ${ints.length > 1 ? 'bg-rose-600 text-white shadow-lg animate-pulse' : 'bg-rose-100 text-rose-600'}`}>
                                  {ints.length}
                                </div>
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors"></div>
                              )}
                            </div>

                            {/* POPOVER INFO */}
                            {isHovered && hasIntervention && (
                              <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white rounded-2xl shadow-2xl border border-rose-100 p-4 text-left animate-in zoom-in-95">
                                <div className="text-[8px] font-black text-rose-400 uppercase tracking-widest mb-2">Support Details • WK {wk}</div>
                                {ints.map((i, idx) => (
                                  <div key={idx} className="mb-2 last:mb-0 pb-2 last:pb-0 border-b last:border-0 border-slate-50">
                                    <div className="text-[9px] font-black text-slate-900 uppercase leading-tight mb-1">{i.reasonCategory}</div>
                                    <div className="text-[7px] font-bold text-sky-600 uppercase italic">{i.actionTaken}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-8 py-5 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black ${totalInts > 5 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {totalInts}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={WEEK_COUNT + 2} className="py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                       <div className="text-5xl mb-4 text-slate-300">🛡️</div>
                       <p className="font-black uppercase tracking-widest text-[10px]">No academic support trends detected in current class context</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* LEGEND */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-lg flex flex-wrap gap-8 items-center justify-center no-print">
         <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-rose-600 animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Multi-Concern Week</span>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full bg-rose-100"></div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Standard Support Row</span>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-100"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Compliant Period</span>
         </div>
      </div>
    </div>
  );
};

export default InterventionMatrix;
