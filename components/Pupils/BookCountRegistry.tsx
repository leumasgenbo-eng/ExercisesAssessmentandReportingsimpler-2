
import React, { useState, useMemo } from 'react';
import { AppState, SchoolGroup, AssessmentType } from '../../types';
import { SCHOOL_HIERARCHY, WEEK_COUNT, SUBJECTS_BY_GROUP } from '../../constants';

interface Props {
  fullState: AppState;
  onUpdateBookCounts: (key: string, data: { count: number; date: string; enrollment?: number }) => void;
}

type EntryMode = 'SINGLE' | 'MATRIX';

const BookCountRegistry: React.FC<Props> = ({ fullState, onUpdateBookCounts }) => {
  const [activeWeek, setActiveWeek] = useState('1');
  const [activeClass, setActiveClass] = useState('Basic 1A');
  const [activeCategory, setActiveCategory] = useState<AssessmentType>('CLASS');
  const [activeSubject, setActiveSubject] = useState('');
  const [entryMode, setEntryMode] = useState<EntryMode>('SINGLE');
  const [filterQuery, setFilterQuery] = useState('');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkEnrollment, setBulkEnrollment] = useState<string>('');

  const defaultEnrollment = useMemo(() => {
    return fullState.management.masterPupils?.[activeClass]?.length || 0;
  }, [fullState.management.masterPupils, activeClass]);

  const currentKey = `${activeWeek}|${activeClass}|${activeSubject}|${activeCategory}`;
  const currentRecord = fullState.bookCountRecords[currentKey] || { count: 0, date: new Date().toISOString().split('T')[0] };

  const allClasses = useMemo(() => 
    Object.values(SCHOOL_HIERARCHY).flatMap(group => group.classes), 
  []);

  const groupForClass = useMemo(() => {
    for (const [group, config] of Object.entries(SCHOOL_HIERARCHY)) {
      if (config.classes.includes(activeClass)) return group as SchoolGroup;
    }
    return 'LOWER_BASIC' as SchoolGroup;
  }, [activeClass]);

  const subjectsForClass = useMemo(() => 
    SUBJECTS_BY_GROUP[groupForClass] || [],
  [groupForClass]);

  const allSubjects = useMemo(() => 
    fullState.management.subjects.map(s => s.name).sort(),
  [fullState.management.subjects]);

  const applyBulkDate = () => {
    if (!confirm(`Apply date ${bulkDate} to all subjects in ${activeClass} for Week ${activeWeek} (${activeCategory})?`)) return;
    subjectsForClass.forEach(sub => {
       const key = `${activeWeek}|${activeClass}|${sub}|${activeCategory}`;
       const existing = fullState.bookCountRecords[key] || { count: 0, date: bulkDate };
       onUpdateBookCounts(key, { ...existing, date: bulkDate });
    });
  };

  const applyBulkEnrollment = () => {
    const val = parseInt(bulkEnrollment);
    if (isNaN(val)) {
      alert("Enter a valid number for enrollment.");
      return;
    }
    if (!confirm(`Apply enrollment of ${val} to all subjects in ${activeClass} for Week ${activeWeek} (${activeCategory})?`)) return;
    subjectsForClass.forEach(sub => {
       const key = `${activeWeek}|${activeClass}|${sub}|${activeCategory}`;
       const existing = fullState.bookCountRecords[key] || { count: 0, date: bulkDate };
       onUpdateBookCounts(key, { ...existing, enrollment: val });
    });
  };

  // --- ANALYTICS (Adjusted to filter by activeCategory and respect overrides) ---
  
  const classRankings = useMemo(() => {
    const list = allClasses.map(cls => {
      let totalBooks = 0;
      let totalEnrolmentInClass = 0;
      let sessionCount = 0;

      const classEntries = Object.entries(fullState.bookCountRecords).filter(([k]) => 
        k.includes(`|${cls}|`) && k.endsWith(`|${activeCategory}`)
      );
      
      classEntries.forEach(([_, record]) => {
        const r = record as any;
        totalBooks += r.count || 0;
        totalEnrolmentInClass += r.enrollment ?? (fullState.management.masterPupils?.[cls]?.length || 0);
        sessionCount++;
      });

      const avg = sessionCount > 0 ? totalBooks / sessionCount : 0;
      const ratio = totalEnrolmentInClass > 0 ? (totalBooks / totalEnrolmentInClass) * 100 : 0;
      const displayEnrolment = totalEnrolmentInClass > 0 ? Math.round(totalEnrolmentInClass / sessionCount) : (fullState.management.masterPupils?.[cls]?.length || 0);
      
      return { name: cls, enrollment: displayEnrolment, avg, ratio };
    });
    return list.sort((a, b) => b.ratio - a.ratio);
  }, [fullState.bookCountRecords, fullState.management.masterPupils, allClasses, activeCategory]);

  const subjectRankings = useMemo(() => {
    const list = allSubjects.map(sub => {
      let totalBooks = 0;
      let totalEnrollmentMatched = 0;
      let uniqueEntries = 0;

      Object.entries(fullState.bookCountRecords).forEach(([key, record]) => {
        const [, cls, sName, cat] = key.split('|');
        if (sName === sub && cat === activeCategory) {
          const r = record as any;
          totalBooks += r.count || 0;
          const effectiveEnrollment = r.enrollment ?? (fullState.management.masterPupils?.[cls]?.length || 0);
          totalEnrollmentMatched += effectiveEnrollment;
          uniqueEntries++;
        }
      });

      const avgRatio = totalEnrollmentMatched > 0 ? (totalBooks / totalEnrollmentMatched) * 100 : 0;
      return { name: sub, avgRatio, count: totalBooks, entries: uniqueEntries };
    });
    return list.filter(s => s.entries > 0).sort((a, b) => b.avgRatio - a.avgRatio);
  }, [fullState.bookCountRecords, fullState.management.masterPupils, allSubjects, activeCategory]);

  const stats = useMemo(() => {
    let totalC = 0;
    let totalE = 0;
    let entryCount = 0;

    Object.entries(fullState.bookCountRecords).forEach(([key, record]) => {
      const [, cls, , cat] = key.split('|');
      if (cat === activeCategory) {
        const r = record as any;
        totalC += r.count || 0;
        totalE += r.enrollment ?? (fullState.management.masterPupils?.[cls]?.length || 0);
        entryCount++;
      }
    });

    const ratio = totalE > 0 ? (totalC / totalE) * 100 : 0;
    const avgResponse = entryCount > 0 ? totalC / entryCount : 0;
    const totalEnrol = totalE; // This is an aggregate expected volume

    return { ratio, avgResponse, totalEnrol, entryCount };
  }, [fullState.bookCountRecords, fullState.management.masterPupils, activeCategory]);

  const categories = [
    { id: 'CLASS', label: 'CLASS WORK EXERCISE BOOKS' },
    { id: 'HOME', label: 'HOME WORK EXERCISE BOOKS' },
    { id: 'PROJECT', label: 'PROJECT BOOK' },
  ];

  return (
    <div className="animate-in space-y-10 pb-20">
      {/* HEADER CONTROLS */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-lg">📊</div>
           <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Submission Hub</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enrollment vs Head Count Matrix</p>
           </div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
           <button 
             onClick={() => setEntryMode('SINGLE')}
             className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${entryMode === 'SINGLE' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
           >
             Quick Pulse
           </button>
           <button 
             onClick={() => setEntryMode('MATRIX')}
             className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${entryMode === 'MATRIX' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
           >
             Batch Manual Entry
           </button>
        </div>
      </div>

      {/* ENTRY AREA */}
      <div className="bg-white rounded-[3.5rem] border border-slate-200 shadow-2xl overflow-hidden no-print transition-all">
        <div className="bg-slate-900 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="text-center bg-indigo-500 text-white px-4 py-2 rounded-2xl min-w-[80px]">
               <span className="block text-[8px] font-black uppercase opacity-60">Master Enrol.</span>
               <span className="text-2xl font-black leading-none">{defaultEnrollment}</span>
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">{activeClass}</h3>
              <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mt-1">Registry Log • Week {activeWeek}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center items-center gap-3">
             <div className="flex bg-white/10 rounded-2xl p-1 items-center">
               <span className="px-3 text-[9px] font-black text-sky-300 uppercase">Wk</span>
               <select className="bg-transparent text-white font-black text-xs outline-none pr-2" value={activeWeek} onChange={(e) => setActiveWeek(e.target.value)}>
                 {Array.from({length: WEEK_COUNT}, (_, i) => (i+1).toString()).map(w => <option key={w} value={w} className="text-slate-900">Wk {w}</option>)}
               </select>
             </div>

             <select 
               className="bg-white/10 text-white font-black text-[10px] px-4 py-2 rounded-2xl outline-none min-w-[200px]" 
               value={activeCategory} 
               onChange={(e) => setActiveCategory(e.target.value as AssessmentType)}
             >
               {categories.map(cat => (
                 <option key={cat.id} value={cat.id} className="text-slate-900">{cat.label}</option>
               ))}
             </select>

             <select className="bg-white/10 text-white font-black text-xs px-4 py-2 rounded-2xl outline-none" value={activeClass} onChange={(e) => setActiveClass(e.target.value)}>
               {allClasses.map(c => <option key={c} value={c} className="text-slate-900">{c}</option>)}
             </select>
             
             {entryMode === 'SINGLE' && (
               <select className="bg-white/10 text-white font-black text-xs px-4 py-2 rounded-2xl outline-none min-w-[150px]" value={activeSubject} onChange={(e) => setActiveSubject(e.target.value)}>
                 <option value="" className="text-slate-900">-- SUBJECT --</option>
                 {subjectsForClass.map(s => <option key={s} value={s} className="text-slate-900">{s}</option>)}
               </select>
             )}
          </div>
        </div>

        {entryMode === 'SINGLE' ? (
          <div className="p-12 flex flex-col md:flex-row items-center justify-around gap-12 bg-gradient-to-br from-white to-indigo-50/20">
            <div className="text-center space-y-4">
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Subject Registry</span>
                   <div className="text-7xl font-black text-slate-900">{currentRecord.enrollment ?? defaultEnrollment}</div>
                </div>
                <div className="grid grid-cols-1 gap-2 pt-4 border-t border-slate-100">
                   <div className="text-left">
                     <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Logging Date</label>
                     <input 
                       type="date" 
                       className="w-full bg-white border-2 border-slate-100 p-2 rounded-xl text-[11px] font-black text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-sm"
                       value={currentRecord.date}
                       onChange={(e) => onUpdateBookCounts(currentKey, { ...currentRecord, date: e.target.value })}
                     />
                   </div>
                   <div className="text-left">
                     <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Enrolment Override</label>
                     <input 
                       type="number" 
                       className="w-full bg-white border-2 border-slate-100 p-2 rounded-xl text-[11px] font-black text-slate-600 outline-none focus:border-indigo-500 transition-all shadow-sm"
                       value={currentRecord.enrollment ?? ''}
                       placeholder={defaultEnrollment.toString()}
                       onChange={(e) => onUpdateBookCounts(currentKey, { ...currentRecord, enrollment: parseInt(e.target.value) || undefined })}
                     />
                   </div>
                </div>
            </div>
            
            <div className="w-px h-32 bg-slate-200 hidden md:block"></div>

            <div className="flex-1 max-w-sm text-center">
                <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-6">Active Head Count</label>
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => onUpdateBookCounts(currentKey, { ...currentRecord, count: Math.max(0, currentRecord.count - 1) })} 
                    className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-600 font-black text-3xl hover:bg-indigo-100 hover:text-indigo-600 transition-all shadow-sm"
                  >
                    -
                  </button>
                  <div className="flex-1 relative group">
                    <input 
                      type="number" 
                      className="w-full h-24 text-center text-6xl font-black text-indigo-950 border-4 border-indigo-50 rounded-[2.5rem] focus:border-indigo-500 focus:ring-8 focus:ring-indigo-50 outline-none transition-all"
                      value={currentRecord.count || ''}
                      placeholder="0"
                      onChange={(e) => onUpdateBookCounts(currentKey, { ...currentRecord, count: parseInt(e.target.value) || 0 })}
                    />
                    <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full border border-indigo-100 text-[8px] font-black text-indigo-400 uppercase shadow-sm whitespace-nowrap">Pulse Entry System</span>
                  </div>
                  <button 
                    onClick={() => onUpdateBookCounts(currentKey, { ...currentRecord, count: Math.min(currentRecord.enrollment ?? defaultEnrollment, currentRecord.count + 1) })} 
                    className="w-16 h-16 rounded-3xl bg-indigo-600 text-white font-black text-3xl hover:bg-indigo-700 shadow-xl transition-all"
                  >
                    +
                  </button>
                </div>
            </div>

            <div className="w-px h-32 bg-slate-200 hidden md:block"></div>

            <div className="text-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">Pulse Analytics</span>
                <div className={`text-5xl font-black mb-2 ${currentRecord.count >= (currentRecord.enrollment ?? defaultEnrollment) ? 'text-emerald-600' : currentRecord.count > (currentRecord.enrollment ?? defaultEnrollment) / 2 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {(currentRecord.enrollment ?? defaultEnrollment) > 0 ? ((currentRecord.count / (currentRecord.enrollment ?? defaultEnrollment)) * 100).toFixed(0) : 0}%
                </div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Variance: <span className={currentRecord.count < (currentRecord.enrollment ?? defaultEnrollment) ? 'text-rose-500' : 'text-emerald-500'}>{(currentRecord.enrollment ?? defaultEnrollment) - currentRecord.count}</span>
                </div>
            </div>
          </div>
        ) : (
          <div className="p-8">
             <div className="flex justify-end mb-8 gap-6 items-end flex-wrap">
                <div className="flex flex-col">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Batch Date</label>
                   <div className="flex gap-2">
                    <input 
                      type="date" 
                      className="bg-slate-50 border-2 border-slate-100 p-2.5 rounded-xl text-[11px] font-black text-slate-700 outline-none focus:border-indigo-500 transition-all"
                      value={bulkDate}
                      onChange={(e) => setBulkDate(e.target.value)}
                    />
                    <button 
                      onClick={applyBulkDate}
                      className="px-4 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[9px] uppercase border-2 border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                    >
                      Apply All
                    </button>
                   </div>
                </div>

                <div className="flex flex-col">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1">Batch Enrolment</label>
                   <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder={defaultEnrollment.toString()}
                      className="w-24 bg-slate-50 border-2 border-slate-100 p-2.5 rounded-xl text-[11px] font-black text-slate-700 outline-none focus:border-emerald-500 transition-all"
                      value={bulkEnrollment}
                      onChange={(e) => setBulkEnrollment(e.target.value)}
                    />
                    <button 
                      onClick={applyBulkEnrollment}
                      className="px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase border-2 border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                    >
                      Apply All
                    </button>
                   </div>
                </div>
             </div>

             <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-inner bg-slate-50/50">
               <table className="w-full text-left border-collapse min-w-[1000px]">
                 <thead>
                   <tr className="border-b border-slate-200">
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Academic Domain</th>
                     <th className="px-8 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center w-40">Logging Date</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-32">Enrol.</th>
                     <th className="px-8 py-5 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center w-48">Manual Count</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Var.</th>
                     <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ratio</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {subjectsForClass.map((sub) => {
                     const key = `${activeWeek}|${activeClass}|${sub}|${activeCategory}`;
                     const record = fullState.bookCountRecords[key] || { count: 0, date: new Date().toISOString().split('T')[0] };
                     const effectiveEnrol = record.enrollment ?? defaultEnrollment;
                     const ratio = effectiveEnrol > 0 ? (record.count / effectiveEnrol) * 100 : 0;
                     const diff = effectiveEnrol - record.count;

                     return (
                       <tr key={sub} className="hover:bg-white transition-colors group">
                         <td className="px-8 py-5">
                           <div className="font-black text-slate-900 uppercase text-xs">{sub}</div>
                           <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1 italic">Subject Specific Node</div>
                         </td>
                         <td className="px-8 py-5 text-center">
                            <input 
                              type="date" 
                              className="w-full bg-white border-2 border-transparent focus:border-indigo-500 p-1.5 rounded-lg text-[10px] font-black text-slate-600 outline-none transition-all shadow-sm"
                              value={record.date}
                              onChange={(e) => onUpdateBookCounts(key, { ...record, date: e.target.value })}
                            />
                         </td>
                         <td className="px-8 py-5 text-center">
                            <input 
                              type="number" 
                              className="w-20 bg-white border-2 border-transparent focus:border-emerald-500 p-1.5 rounded-lg text-[11px] font-black text-slate-900 text-center outline-none transition-all shadow-sm"
                              value={record.enrollment ?? ''}
                              placeholder={defaultEnrollment.toString()}
                              onChange={(e) => onUpdateBookCounts(key, { ...record, enrollment: parseInt(e.target.value) || undefined })}
                            />
                         </td>
                         <td className="px-8 py-5">
                            <div className="flex items-center justify-center gap-2">
                               <button 
                                 onClick={() => onUpdateBookCounts(key, { ...record, count: Math.max(0, record.count - 1) })}
                                 className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center font-black"
                               >-</button>
                               <input 
                                 type="number" 
                                 className="w-20 h-10 text-center font-black text-indigo-950 bg-white border-2 border-slate-100 rounded-xl focus:border-indigo-500 outline-none text-sm shadow-sm"
                                 value={record.count || ''}
                                 placeholder="0"
                                 onChange={(e) => onUpdateBookCounts(key, { ...record, count: parseInt(e.target.value) || 0 })}
                               />
                               <button 
                                 onClick={() => onUpdateBookCounts(key, { ...record, count: Math.min(effectiveEnrol, record.count + 1) })}
                                 className="w-8 h-8 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center font-black"
                               >+</button>
                            </div>
                         </td>
                         <td className="px-8 py-5 text-center">
                           <span className={`text-sm font-black ${diff === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{diff > 0 ? `-${diff}` : diff === 0 ? '0' : `+${Math.abs(diff)}`}</span>
                         </td>
                         <td className="px-8 py-5 text-right">
                           <div className="flex flex-col items-end">
                              <span className={`text-xs font-black ${ratio >= 90 ? 'text-emerald-600' : ratio > 50 ? 'text-amber-600' : 'text-rose-600'}`}>{ratio.toFixed(0)}%</span>
                              <div className="w-20 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                 <div className={`h-full transition-all duration-700 ${ratio >= 90 ? 'bg-emerald-500' : ratio > 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${ratio}%` }}></div>
                              </div>
                           </div>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
          </div>
        )}
      </div>

      {/* INSTITUTIONAL ANALYTICS HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* SIDEBAR: CLASS RANKINGS */}
        <div className="lg:col-span-5 space-y-6">
           <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-xl overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                 <h4 className="text-lg font-black text-slate-900 uppercase">Class Performance</h4>
                 <div className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-black text-[9px] uppercase">Ranked by Ratio ({activeCategory})</div>
              </div>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                 {classRankings.map((c, i) => (
                    <div key={c.name} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-indigo-200 transition-all">
                       <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                             <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] ${i < 3 ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</div>
                             <span className="font-black text-slate-900 uppercase text-xs">{c.name}</span>
                          </div>
                          <div className="text-right">
                             <span className="text-[11px] font-black text-indigo-600">{c.ratio.toFixed(1)}%</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${c.ratio}%` }}></div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase shrink-0">{c.avg.toFixed(0)} / {c.enrollment} Books</span>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* MAIN ANALYSIS: SUBJECTS & OVERALL */}
        <div className="lg:col-span-7 space-y-8">
           {/* School-Wide Stat */}
           <div className="bg-indigo-950 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:bg-sky-500/10 transition-all"></div>
              <div className="relative z-10">
                 <div className="flex justify-between items-start">
                    <div>
                       <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest block mb-1">Institutional Compliance ({activeCategory})</span>
                       <h3 className="text-4xl font-black uppercase tracking-tighter">Unified School Matrix</h3>
                    </div>
                    <div className="text-right">
                       <div className="text-5xl font-black text-white">{stats.ratio.toFixed(1)}%</div>
                       <span className="text-[9px] font-black text-sky-400 uppercase tracking-[0.2em]">Overall Avg. Submission</span>
                    </div>
                 </div>
                 <div className="mt-8 space-y-3">
                    <div className="flex justify-between text-[10px] font-black uppercase text-sky-200">
                       <span>Total Logged Expected: {stats.totalEnrol}</span>
                       <span>Avg. Response: {stats.avgResponse.toFixed(0)} Books</span>
                    </div>
                    <div className="h-4 bg-white/10 rounded-2xl overflow-hidden border border-white/10">
                       <div className="h-full bg-sky-500 transition-all duration-1000 shadow-[0_0_15px_rgba(56,189,248,0.5)]" style={{ width: `${stats.ratio}%` }}></div>
                    </div>
                 </div>
              </div>
           </div>

           {/* Subject Rankings */}
           <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl overflow-hidden">
              <div className="flex justify-between items-center mb-10 pb-4 border-b border-slate-100">
                 <h4 className="text-xl font-black text-slate-900 uppercase">Subject Load Comparison ({activeCategory})</h4>
                 <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      placeholder="Filter Subjects..." 
                      className="bg-slate-50 border-none px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-indigo-100"
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                    />
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {subjectRankings
                   .filter(s => s.name.toLowerCase().includes(filterQuery.toLowerCase()))
                   .map((s, i) => (
                    <div key={s.name} className="p-6 rounded-3xl border-2 border-slate-50 bg-slate-50/20 hover:border-emerald-200 hover:bg-white transition-all group">
                       <div className="flex justify-between items-center mb-4">
                          <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">RANK #{i+1}</div>
                          <div className={`px-3 py-1 rounded-lg font-black text-[10px] ${s.avgRatio > 80 ? 'bg-emerald-50 text-emerald-600' : s.avgRatio > 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                             {s.avgRatio.toFixed(0)}% Submissions
                          </div>
                       </div>
                       <h5 className="font-black text-slate-900 uppercase text-sm mb-1 group-hover:text-indigo-600 transition-colors">{s.name}</h5>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {s.count} Books present across {s.entries} sessions
                       </p>
                    </div>
                 ))}
              </div>

              {subjectRankings.length === 0 && (
                <div className="py-20 text-center opacity-20">
                   <p className="font-black uppercase tracking-widest text-xs">No {activeCategory} data logged yet</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default BookCountRegistry;
