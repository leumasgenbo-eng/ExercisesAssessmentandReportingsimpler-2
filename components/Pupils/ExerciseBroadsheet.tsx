
import React, { useState, useMemo } from 'react';
import { AppState, AssessmentData, SchoolGroup } from '../../types';
import { SCHOOL_HIERARCHY, SUBJECTS_BY_GROUP } from '../../constants';

interface Props {
  fullState: AppState;
}

const ExerciseBroadsheet: React.FC<Props> = ({ fullState }) => {
  const [filterClass, setFilterClass] = useState('Basic 1A');
  const [filterSubject, setFilterSubject] = useState('');

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

  const broadsheetData = useMemo(() => {
    // We need to track actual total vs possible total for true performance percentage
    const pupilStats = new Map<string, { 
      name: string, 
      totalObtained: number, 
      totalPossible: number, 
      entryCount: number 
    }>();
    
    (['classWork', 'homeWork', 'projectWork'] as const).forEach(cat => {
      Object.entries(fullState[cat]).forEach(([key, data]) => {
        const assessment = data as AssessmentData;
        const [,, sub] = key.split('|');
        
        if (assessment.className !== filterClass) return;
        if (filterSubject && sub !== filterSubject) return;

        assessment.pupils.forEach(p => {
          if (!p.name || p.id.startsWith('empty-') || p.id.startsWith('auto-')) return;
          
          const existing = pupilStats.get(p.id) || { name: p.name, totalObtained: 0, totalPossible: 0, entryCount: 0 };
          
          Object.entries(p.scores).forEach(([exId, s]) => {
            const val = parseFloat(s);
            const exMeta = assessment.exercises[parseInt(exId)];
            const maxVal = parseFloat(exMeta?.maxScore || '100') || 100;

            if (!isNaN(val)) {
              existing.totalObtained += val;
              existing.totalPossible += maxVal;
              existing.entryCount++;
            }
          });
          pupilStats.set(p.id, existing);
        });
      });
    });

    return Array.from(pupilStats.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [fullState, filterClass, filterSubject]);

  return (
    <div className="animate-in space-y-8 pb-20">
      {/* FILTERS */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl flex flex-col md:flex-row gap-6 md:items-end no-print">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registry Level Filter</label>
          <select 
            className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-900 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none cursor-pointer transition-all"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Domain</label>
          <select 
            className="w-full bg-slate-50 border-2 border-transparent focus:border-slate-900 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none cursor-pointer transition-all"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">ALL BROADCASTS</option>
            {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="shrink-0 flex gap-2">
           <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all">Export Report</button>
        </div>
      </div>

      {/* BROAD SHEET TABLE */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest w-20 text-center">SN</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Pupil Identity</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center w-32">Exercises</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center w-32">Score / Max</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center w-32">Efficiency (%)</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-right pr-12 w-48">Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {broadsheetData.length > 0 ? (
                broadsheetData.map((pupil, idx) => {
                  const percentage = pupil.totalPossible > 0 
                    ? ((pupil.totalObtained / pupil.totalPossible) * 100).toFixed(1) 
                    : '0.0';
                  const isPoor = parseFloat(percentage) < 40; // Threshold adjusted for percentage logic
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-8 py-6 text-[10px] font-black text-slate-300 text-center">{idx + 1}</td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900 uppercase text-xs tracking-tight">{pupil.name}</div>
                        <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">Threshold-Checked Performance</div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black">{pupil.entryCount}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className="text-slate-900 font-black text-sm">{pupil.totalObtained}</span>
                        <span className="text-slate-300 mx-1 font-bold">/</span>
                        <span className="text-slate-400 font-bold text-xs">{pupil.totalPossible}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className={`inline-block px-4 py-1.5 rounded-xl font-black text-xs ${isPoor ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                          {percentage}%
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right pr-12">
                        {isPoor ? (
                          <span className="text-[8px] font-black text-rose-500 uppercase flex items-center justify-end gap-1.5 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            Performance Warning
                          </span>
                        ) : parseFloat(percentage) >= 90 ? (
                          <span className="text-[8px] font-black text-amber-500 uppercase flex items-center justify-end gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                            Distinction Tier
                          </span>
                        ) : (
                          <span className="text-[8px] font-black text-emerald-500 uppercase flex items-center justify-end gap-1.5 opacity-60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Steady Progress
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                       <div className="text-5xl mb-4 text-slate-300">🔎</div>
                       <p className="font-black uppercase tracking-widest text-[10px]">No pupil records found for this domain</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExerciseBroadsheet;
