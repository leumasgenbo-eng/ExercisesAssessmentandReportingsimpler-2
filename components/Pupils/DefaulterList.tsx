
import React, { useState, useMemo } from 'react';
import { AppState, AssessmentData, SchoolGroup } from '../../types';
import { SCHOOL_HIERARCHY, SUBJECTS_BY_GROUP, WEEK_COUNT } from '../../constants';

interface Props {
  fullState: AppState;
}

interface DefaulterRecord {
  pupilName: string;
  missingCW: string[];
  missingHW: string[];
  missingPW: string[];
  isComplete: boolean;
}

const DefaulterList: React.FC<Props> = ({ fullState }) => {
  const [filterClass, setFilterClass] = useState('Basic 1A');
  const [filterWeek, setFilterWeek] = useState('1');
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

  const defaulters = useMemo(() => {
    const masterEntries = fullState.management.masterPupils?.[filterClass] || [];
    const dataKey = `${filterWeek}|${filterClass}|${filterSubject}`;
    
    const cw = fullState.classWork[dataKey];
    const hw = fullState.homeWork[dataKey];
    const pw = fullState.projectWork[dataKey];

    const findMissing = (data: AssessmentData | undefined, pupilName: string) => {
      if (!data) return ['All'];
      const pupil = data.pupils.find(p => p.name === pupilName);
      if (!pupil) return ['All'];
      
      const missing: string[] = [];
      Object.entries(data.exercises).forEach(([id, ex]) => {
        if (ex.maxScore && ex.maxScore !== '') {
          if (!pupil.scores[parseInt(id)] || pupil.scores[parseInt(id)] === '') {
            missing.push(`Ex ${id}`);
          }
        }
      });
      return missing;
    };

    return masterEntries.map(entry => {
      const name = entry.name;
      const missingCW = findMissing(cw, name);
      const missingHW = findMissing(hw, name);
      const missingPW = findMissing(pw, name);
      
      const isComplete = missingCW.length === 0 && missingHW.length === 0 && missingPW.length === 0;

      return {
        pupilName: name,
        missingCW,
        missingHW,
        missingPW,
        isComplete
      };
    }).filter(p => !p.isComplete).sort((a, b) => a.pupilName.localeCompare(b.pupilName));
  }, [fullState, filterClass, filterWeek, filterSubject]);

  const handlePrint = () => window.print();

  return (
    <div className="animate-in space-y-8 pb-20">
      {/* FILTERS */}
      <div className="bg-white p-6 md:p-10 rounded-[3rem] border border-slate-200 shadow-2xl flex flex-col md:flex-row gap-6 md:items-end no-print">
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Class Registry</label>
          <select 
            className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none cursor-pointer"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            {allClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Week</label>
          <select 
            className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none cursor-pointer"
            value={filterWeek}
            onChange={(e) => setFilterWeek(e.target.value)}
          >
            {Array.from({length: WEEK_COUNT}, (_, i) => (i+1).toString()).map(w => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Subject</label>
          <select 
            className="w-full bg-slate-50 border-none p-4 rounded-2xl font-black text-slate-900 uppercase text-xs outline-none cursor-pointer"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">-- ALL SUBJECTS --</option>
            {subjectsForClass.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button 
          onClick={handlePrint}
          className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl hover:bg-rose-700 transition-all flex items-center gap-2"
        >
          <span>🖨️</span> Generate Report
        </button>
      </div>

      {/* REPORT CONTENT */}
      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden print:border-none print:shadow-none">
        <div className="bg-slate-900 p-10 text-white text-center flex flex-col items-center">
           <span className="bg-rose-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">Official Submission Defaulter Log</span>
           <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">{fullState.management.settings.name}</h3>
           <div className="flex gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span>Class: {filterClass}</span>
              <span className="w-1.5 h-1.5 bg-slate-700 rounded-full mt-1.5"></span>
              <span>Week: {filterWeek}</span>
              <span className="w-1.5 h-1.5 bg-slate-700 rounded-full mt-1.5"></span>
              <span>Subject: {filterSubject || 'Comprehensive'}</span>
           </div>
        </div>

        <div className="p-8 md:p-12">
          {defaulters.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Pupil Identity</th>
                    <th className="px-6 py-5 text-center text-[10px] font-black text-indigo-500 uppercase tracking-widest">Class Work</th>
                    <th className="px-6 py-5 text-center text-[10px] font-black text-emerald-500 uppercase tracking-widest">Home Work</th>
                    <th className="px-6 py-5 text-center text-[10px] font-black text-amber-500 uppercase tracking-widest">Project</th>
                    <th className="px-6 py-5 text-right text-[10px] font-black text-rose-500 uppercase tracking-widest">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {defaulters.map((p, idx) => {
                    const totalMissing = p.missingCW.length + p.missingHW.length + p.missingPW.length;
                    const severity = totalMissing > 10 ? 'CRITICAL' : totalMissing > 5 ? 'MODERATE' : 'INITIAL';
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-6">
                           <div className="font-black text-slate-900 uppercase text-xs">{p.pupilName}</div>
                           <div className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">Missing {totalMissing} total entries</div>
                        </td>
                        <td className="px-6 py-6 text-center">
                           <div className="flex flex-wrap justify-center gap-1">
                              {p.missingCW.length > 0 ? p.missingCW.map(m => (
                                <span key={m} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[8px] font-black uppercase">{m}</span>
                              )) : <span className="text-[10px]">✅</span>}
                           </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                           <div className="flex flex-wrap justify-center gap-1">
                              {p.missingHW.length > 0 ? p.missingHW.map(m => (
                                <span key={m} className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black uppercase">{m}</span>
                              )) : <span className="text-[10px]">✅</span>}
                           </div>
                        </td>
                        <td className="px-6 py-6 text-center">
                           <div className="flex flex-wrap justify-center gap-1">
                              {p.missingPW.length > 0 ? p.missingPW.map(m => (
                                <span key={m} className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[8px] font-black uppercase">{m}</span>
                              )) : <span className="text-[10px]">✅</span>}
                           </div>
                        </td>
                        <td className="px-6 py-6 text-right">
                           <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                             severity === 'CRITICAL' ? 'bg-rose-600 text-white border-rose-700 animate-pulse' : 
                             severity === 'MODERATE' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                             'bg-slate-100 text-slate-500 border-slate-200'
                           }`}>
                             {severity}
                           </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-24 text-center opacity-30 flex flex-col items-center">
               <div className="text-6xl mb-6">🏆</div>
               <p className="font-black uppercase tracking-widest text-[10px]">Perfect Submission Compliance achieved for this class context</p>
            </div>
          )}
        </div>

        {/* PRINT ONLY FOOTER */}
        <div className="hidden print:grid grid-cols-2 gap-12 p-12 border-t border-slate-100 mt-12">
           <div className="border-t border-slate-300 pt-4">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-8">Facilitator Signature</p>
              <div className="h-px w-full bg-slate-200 mb-2"></div>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">United Baylor Academy Official Record</p>
           </div>
           <div className="border-t border-slate-300 pt-4">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-8">Administrator Remarks</p>
              <div className="h-px w-full bg-slate-200 mb-2"></div>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Vetted & Verified Log</p>
           </div>
        </div>
      </div>
      
      {/* SHARING INSTRUCTIONS */}
      <div className="bg-indigo-950 p-6 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 no-print shadow-xl">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">📱</div>
            <div>
               <h4 className="font-black uppercase text-xs">Share Performance Log</h4>
               <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest">Export this list as a PDF to share with class facilitators</p>
            </div>
         </div>
         <div className="flex gap-3">
            <button onClick={handlePrint} className="px-6 py-2.5 bg-white text-indigo-950 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-100 transition-all">Export as PDF</button>
         </div>
      </div>
    </div>
  );
};

export default DefaulterList;
