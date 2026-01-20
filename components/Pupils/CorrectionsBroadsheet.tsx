
import React, { useState, useMemo } from 'react';
import { AppState, AssessmentData, Pupil, AssessmentType, ExerciseMetadata } from '../../types';
import { SCHOOL_HIERARCHY, SUBJECTS_BY_GROUP, WEEK_COUNT } from '../../constants';

interface Props {
  fullState: AppState;
  onUpdateState: (type: AssessmentType, key: string, data: AssessmentData) => void;
}

const CorrectionsBroadsheet: React.FC<Props> = ({ fullState, onUpdateState }) => {
  const [filterClass, setFilterClass] = useState('Basic 1A');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterWeek, setFilterWeek] = useState('1');
  const [activeCategory, setActiveCategory] = useState<AssessmentType>('CLASS');

  const allClasses = useMemo(() => 
    Object.values(SCHOOL_HIERARCHY).flatMap(group => group.classes), 
  []);

  const allSubjects = useMemo(() => 
    fullState.management.subjects.map(s => s.name).sort(),
  [fullState.management.subjects]);

  const currentKey = `${filterWeek}|${filterClass}|${filterSubject}`;
  
  const targetData = useMemo(() => {
    const categoryKey = activeCategory === 'CLASS' ? 'classWork' : activeCategory === 'HOME' ? 'homeWork' : 'projectWork';
    return fullState[categoryKey][currentKey];
  }, [fullState, activeCategory, currentKey]);

  // Find all pupils who scored LESS than the max score for any exercise
  const correctionsNeeded = useMemo(() => {
    if (!targetData) return [];
    
    return targetData.pupils.filter(p => {
      if (!p.name || p.id.startsWith('empty-') || p.id.startsWith('auto-')) return false;
      
      return (Object.entries(targetData.exercises) as [string, ExerciseMetadata][]).some(([id, ex]) => {
        const exId = parseInt(id);
        const score = parseFloat(p.scores[exId] || '');
        const max = parseFloat(ex.maxScore || '100') || 100;
        
        // Only include if score is strictly less than max and a score was actually entered
        return !isNaN(score) && score < max;
      });
    }).map(p => {
      // For each pupil, find WHICH exercises need corrections
      const exercisesRequiringCorrection = (Object.entries(targetData.exercises) as [string, ExerciseMetadata][])
        .filter(([id, ex]) => {
          const exId = parseInt(id);
          const score = parseFloat(p.scores[exId] || '');
          const max = parseFloat(ex.maxScore || '100') || 100;
          return !isNaN(score) && score < max;
        })
        .map(([id]) => parseInt(id));

      return { ...p, exercisesRequiringCorrection };
    });
  }, [targetData]);

  const handleToggle = (pupilId: string, exId: number, field: 'done' | 'marked') => {
    if (!targetData) return;

    const updatedPupils = targetData.pupils.map(p => {
      if (p.id === pupilId) {
        const currentStatus = p.correctionStatus?.[exId] || { done: false, marked: false };
        return {
          ...p,
          correctionStatus: {
            ...(p.correctionStatus || {}),
            [exId]: { ...currentStatus, [field]: !currentStatus[field] }
          }
        };
      }
      return p;
    });

    onUpdateState(activeCategory, currentKey, { ...targetData, pupils: updatedPupils });
  };

  const stats = useMemo(() => {
    let totalNeeded = 0;
    let totalDone = 0;
    let totalMarked = 0;

    correctionsNeeded.forEach(p => {
      p.exercisesRequiringCorrection.forEach(exId => {
        totalNeeded++;
        if (p.correctionStatus?.[exId]?.done) totalDone++;
        if (p.correctionStatus?.[exId]?.marked) totalMarked++;
      });
    });

    return { totalNeeded, totalDone, totalMarked };
  }, [correctionsNeeded]);

  return (
    <div className="animate-in space-y-8 pb-20">
      {/* STATS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
        <div className="bg-indigo-900 rounded-[2rem] p-8 text-white shadow-xl flex items-center justify-between group overflow-hidden relative">
          <div className="relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-60 block mb-1">Total Pending Corrections</span>
            <div className="text-4xl font-black">{stats.totalNeeded}</div>
          </div>
          <div className="text-6xl opacity-10 absolute -right-4 -bottom-4 rotate-12 group-hover:rotate-0 transition-transform">📚</div>
        </div>
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Student Completion</span>
            <div className="text-3xl font-black text-indigo-600">{stats.totalDone} <span className="text-sm text-slate-300">Done</span></div>
          </div>
          <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(stats.totalDone / (stats.totalNeeded || 1)) * 100}%` }}></div>
          </div>
        </div>
        <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/60 block mb-1">Facilitator Marked</span>
            <div className="text-3xl font-black text-emerald-700">{stats.totalMarked} <span className="text-sm text-emerald-300">Verified</span></div>
          </div>
          <div className="text-right">
             <div className="text-2xl font-black text-emerald-600">{((stats.totalMarked / (stats.totalNeeded || 1)) * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-6 md:p-8 rounded-[3rem] border border-slate-200 shadow-xl flex flex-col md:flex-row gap-6 md:items-end no-print">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Context</label>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            {(['CLASS', 'HOME', 'PROJECT'] as AssessmentType[]).map(type => (
              <button 
                key={type}
                onClick={() => setActiveCategory(type)}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-indigo-600'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class</label>
          <select className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
            {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
          <select className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
            <option value="">-- ALL SUBJECTS --</option>
            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="w-24 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Week</label>
          <select className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none" value={filterWeek} onChange={(e) => setFilterWeek(e.target.value)}>
            {Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()).map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      </div>

      {/* CHECKLIST TABLE */}
      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest w-20 text-center">SN</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest">Pupil & Exercise Context</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center">Original Performance</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center w-40">Pupil Correction</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-center w-40">Facilitator Marked</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-right pr-12">Clinical Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {correctionsNeeded.length > 0 ? (
                correctionsNeeded.flatMap((p, pIdx) => (
                  p.exercisesRequiringCorrection.map((exId, exIdx) => {
                    const status = p.correctionStatus?.[exId] || { done: false, marked: false };
                    const score = p.scores[exId];
                    const max = targetData?.exercises[exId]?.maxScore || '100';
                    const isFullyResolved = status.done && status.marked;

                    return (
                      <tr key={`${p.id}-${exId}`} className={`hover:bg-indigo-50/20 transition-colors group ${isFullyResolved ? 'opacity-40 grayscale-[0.5]' : ''}`}>
                        <td className="px-8 py-6 text-[10px] font-black text-slate-300 text-center">{pIdx + 1}</td>
                        <td className="px-8 py-6">
                          <div className="font-black text-slate-900 uppercase text-xs tracking-tight">{p.name}</div>
                          <div className="text-[8px] font-bold text-indigo-400 uppercase mt-0.5 tracking-widest">Exercise {exId} • {activeCategory} ASSESSMENT</div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className="inline-flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                             <span className="text-xs font-black text-rose-600">{score}</span>
                             <span className="text-[10px] font-bold text-slate-300">/</span>
                             <span className="text-[10px] font-black text-slate-900">{max}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <button 
                             onClick={() => handleToggle(p.id, exId, 'done')}
                             className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all mx-auto ${status.done ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300 border-2 border-slate-100'}`}
                           >
                             {status.done ? '✓' : ''}
                           </button>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <button 
                             onClick={() => handleToggle(p.id, exId, 'marked')}
                             className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all mx-auto ${status.marked ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 text-slate-300 border-2 border-slate-100'}`}
                             disabled={!status.done} // Optional logical dependency
                           >
                             {status.marked ? '✓' : ''}
                           </button>
                        </td>
                        <td className="px-8 py-6 text-right pr-12">
                          {isFullyResolved ? (
                            <span className="text-[8px] font-black text-emerald-500 uppercase flex items-center justify-end gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              REMEDIATED
                            </span>
                          ) : status.done ? (
                            <span className="text-[8px] font-black text-amber-500 uppercase flex items-center justify-end gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              PENDING MARKING
                            </span>
                          ) : (
                            <span className="text-[8px] font-black text-rose-500 uppercase flex items-center justify-end gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                              ACTION REQUIRED
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center opacity-20">
                       <div className="text-5xl mb-4 text-slate-300">✅</div>
                       <p className="font-black uppercase tracking-widest text-[10px]">No pupils requiring corrections in this domain</p>
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

export default CorrectionsBroadsheet;
