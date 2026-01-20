
import React, { useState, useMemo } from 'react';
import { AppState, AssessmentData, SchoolGroup } from '../../types';
import { SCHOOL_HIERARCHY, SUBJECTS_BY_GROUP, CRITERION_SKILLS } from '../../constants';

interface Props {
  fullState: AppState;
}

const CriterionGrowthMatrix: React.FC<Props> = ({ fullState }) => {
  const [filterClass, setFilterClass] = useState('Basic 1A');
  const [filterWeek, setFilterWeek] = useState('1');

  const allClasses = useMemo(() => 
    Object.values(SCHOOL_HIERARCHY).flatMap(group => group.classes), 
  []);

  const growthData = useMemo(() => {
    const key = `${filterWeek}|${filterClass}|`; // Subject might be empty for CRA
    // We look for any entry matching class/week in criterionWork
    const matchingEntries = Object.entries(fullState.criterionWork).filter(([k]) => k.includes(`|${filterClass}|`));
    
    // For simplicity, let's pick the one for the specific week if provided, or the first one found
    const currentData = fullState.criterionWork[`${filterWeek}|${filterClass}|`] || matchingEntries[0]?.[1];

    if (!currentData) return [];

    return currentData.pupils.filter(p => p.name && !p.id.startsWith('auto-')).map(p => {
      const skills = CRITERION_SKILLS.map((skillName, i) => {
        const beforeIdx = i * 2 + 1;
        const afterIdx = i * 2 + 2;
        const before = parseFloat(p.scores[beforeIdx] || '');
        const after = parseFloat(p.scores[afterIdx] || '');
        const diff = !isNaN(before) && !isNaN(after) ? after - before : null;
        
        return { name: skillName, before, after, diff };
      });

      const avgGrowth = skills.reduce((acc, s) => acc + (s.diff || 0), 0) / skills.filter(s => s.diff !== null).length;

      return {
        id: p.id,
        name: p.name,
        skills,
        avgGrowth: isNaN(avgGrowth) ? 0 : avgGrowth
      };
    });
  }, [fullState.criterionWork, filterClass, filterWeek]);

  const stats = useMemo(() => {
    if (growthData.length === 0) return null;
    const totalGrowth = growthData.reduce((acc, p) => acc + p.avgGrowth, 0);
    const averageClassGrowth = totalGrowth / growthData.length;
    
    const skillAverages = CRITERION_SKILLS.map((_, i) => {
      const validDiffs = growthData.map(p => p.skills[i].diff).filter(d => d !== null) as number[];
      return validDiffs.length > 0 ? validDiffs.reduce((a, b) => a + b, 0) / validDiffs.length : 0;
    });

    return { averageClassGrowth, skillAverages };
  }, [growthData]);

  return (
    <div className="animate-in space-y-8 pb-20">
      {/* ANALYTICAL HEADER */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 no-print">
          <div className="bg-rose-600 rounded-[2rem] p-8 text-white shadow-xl flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Avg Institutional Growth</span>
            <div className="text-4xl font-black mt-2">
              {stats.averageClassGrowth > 0 ? '+' : ''}{stats.averageClassGrowth.toFixed(1)}%
            </div>
          </div>
          {CRITERION_SKILLS.slice(0, 3).map((skill, i) => (
            <div key={skill} className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-xl">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{skill}</span>
              <div className={`text-2xl font-black ${stats.skillAverages[i] >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {stats.skillAverages[i] > 0 ? '+' : ''}{stats.skillAverages[i].toFixed(1)} pts
              </div>
              <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${stats.skillAverages[i] >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.min(100, Math.abs(stats.skillAverages[i] * 10))}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FILTERS */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-xl flex flex-col md:flex-row gap-6 md:items-end no-print">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Clinical Class Filter</label>
          <select 
            className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-600 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none cursor-pointer transition-all shadow-inner"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="w-32 space-y-2">
          <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Session Week</label>
          <select 
            className="w-full bg-slate-50 border-2 border-transparent focus:border-rose-600 p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none cursor-pointer transition-all shadow-inner"
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
          >
            {Array.from({ length: 16 }, (_, i) => (i + 1).toString()).map(w => <option key={w} value={w}>Wk {w}</option>)}
          </select>
        </div>
        <div className="shrink-0 flex gap-2">
           <button onClick={() => window.print()} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all">Download Growth Matrix</button>
        </div>
      </div>

      {/* GROWTH MATRIX TABLE */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th rowSpan={2} className="px-8 py-6 text-[10px] font-black uppercase tracking-widest w-64 border-r border-slate-800">Pupil Identity</th>
                {CRITERION_SKILLS.map(skill => (
                  <th key={skill} colSpan={3} className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center border-r border-slate-800 bg-slate-800/50">
                    {skill.split(' ')[0]}
                  </th>
                ))}
                <th rowSpan={2} className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center w-24">Net Delta</th>
              </tr>
              <tr className="bg-slate-800 text-slate-400">
                {CRITERION_SKILLS.map(skill => (
                  <React.Fragment key={`${skill}-sub`}>
                    <th className="px-2 py-3 text-[8px] font-black text-center border-r border-slate-700 w-12">Pre</th>
                    <th className="px-2 py-3 text-[8px] font-black text-center border-r border-slate-700 w-12">Post</th>
                    <th className="px-2 py-3 text-[8px] font-black text-center border-r border-slate-700 w-16 bg-slate-900/30">+/-</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {growthData.length > 0 ? (
                growthData.map((pupil) => (
                  <tr key={pupil.id} className="hover:bg-rose-50/20 transition-colors group">
                    <td className="px-8 py-5 border-r border-slate-100 bg-white sticky left-0 z-10">
                      <div className="font-black text-slate-900 uppercase text-xs tracking-tight">{pupil.name}</div>
                      <div className="text-[7px] font-bold text-slate-400 uppercase mt-0.5">Performance Comparison Active</div>
                    </td>
                    {pupil.skills.map((skill, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <td className="px-2 py-5 text-center border-r border-slate-50 text-[10px] font-bold text-slate-400">{skill.before ?? '-'}</td>
                        <td className="px-2 py-5 text-center border-r border-slate-50 text-[10px] font-bold text-slate-900">{skill.after ?? '-'}</td>
                        <td className={`px-2 py-5 text-center border-r border-slate-100 text-[10px] font-black bg-slate-50/30 ${
                          skill.diff !== null ? (skill.diff > 0 ? 'text-emerald-600' : skill.diff < 0 ? 'text-rose-600' : 'text-slate-400') : 'text-slate-200'
                        }`}>
                          {skill.diff !== null ? `${skill.diff > 0 ? '+' : ''}${skill.diff}` : '--'}
                        </td>
                      </React.Fragment>
                    ))}
                    <td className={`px-6 py-5 text-center font-black text-xs ${pupil.avgGrowth > 0 ? 'text-emerald-700 bg-emerald-50' : pupil.avgGrowth < 0 ? 'text-rose-700 bg-rose-50' : 'text-slate-400'}`}>
                      {pupil.avgGrowth > 0 ? '+' : ''}{pupil.avgGrowth.toFixed(1)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={CRITERION_SKILLS.length * 3 + 2} className="py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                       <div className="text-5xl mb-4 text-slate-300">📊</div>
                       <p className="font-black uppercase tracking-widest text-[10px]">No growth metrics found for this class and week</p>
                       <p className="text-[8px] mt-2 italic">Ensure scores are entered in the CRITERION tab under Assess</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* GROWTH LEGEND */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-lg flex flex-wrap gap-8 items-center justify-center no-print">
         <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded bg-emerald-500"></div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Significant Growth</span>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded bg-rose-500"></div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Academic Decline</span>
         </div>
         <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded bg-slate-200"></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No Delta Logged</span>
         </div>
      </div>
    </div>
  );
};

export default CriterionGrowthMatrix;
