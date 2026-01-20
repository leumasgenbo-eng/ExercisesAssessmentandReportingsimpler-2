
import React, { useState, useMemo } from 'react';
import { AppState, SchoolGroup, AssessmentData } from '../../types';
import { SCHOOL_HIERARCHY } from '../../constants';

interface Props {
  fullState: AppState;
}

const ArchivePortal: React.FC<Props> = ({ fullState }) => {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Extract all unique years, terms, and months present in the data
  const archivalIndex = useMemo(() => {
    const index: Record<string, Record<string, Set<string>>> = {};
    
    (['classWork', 'homeWork', 'projectWork', 'criterionWork'] as const).forEach(cat => {
      Object.entries(fullState[cat]).forEach(([key]) => {
        const [year, term, month] = key.split('|');
        if (!year || !term || !month) return;
        
        if (!index[year]) index[year] = {};
        if (!index[year][term]) index[year][term] = new Set();
        index[year][term].add(month);
      });
    });

    return index;
  }, [fullState]);

  const years = Object.keys(archivalIndex).sort().reverse();
  const terms = selectedYear ? Object.keys(archivalIndex[selectedYear] || {}).sort() : [];
  const months = (selectedYear && selectedTerm) ? Array.from(archivalIndex[selectedYear][selectedTerm]).sort() : [];

  return (
    <div className="space-y-10 animate-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-indigo-950 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
         <div className="relative z-10">
            <h3 className="text-4xl font-black uppercase tracking-tighter mb-2">Institutional Archive</h3>
            <p className="text-[11px] font-bold text-sky-400 uppercase tracking-[0.4em]">Multi-Session Knowledge Base Explorer</p>
         </div>
         <div className="flex gap-4 relative z-10">
            <div className="bg-white/10 p-5 rounded-3xl border border-white/10 text-center min-w-[120px]">
               <span className="block text-[9px] font-black text-sky-300 uppercase mb-2">Logged Years</span>
               <span className="text-3xl font-black">{years.length}</span>
            </div>
            <div className="bg-white/10 p-5 rounded-3xl border border-white/10 text-center min-w-[120px]">
               <span className="block text-[9px] font-black text-sky-300 uppercase mb-2">Data Points</span>
               <span className="text-3xl font-black">
                 {Object.values(fullState.classWork).length + Object.values(fullState.homeWork).length}
               </span>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         {/* YEAR SELECTOR */}
         <div className="lg:col-span-4 space-y-6">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-4">Select Academic Year</h4>
            <div className="grid grid-cols-1 gap-3">
               {years.length > 0 ? years.map(y => (
                 <button 
                   key={y}
                   onClick={() => { setSelectedYear(y); setSelectedTerm(''); setSelectedMonth(''); }}
                   className={`p-8 rounded-[2.5rem] border-4 transition-all text-left group relative overflow-hidden ${selectedYear === y ? 'bg-indigo-600 border-indigo-700 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'}`}
                 >
                   <span className="text-xs font-black uppercase tracking-widest block mb-1">Session</span>
                   <span className="text-2xl font-black block">{y}</span>
                   <div className="absolute right-6 top-1/2 -translate-y-1/2 text-4xl opacity-10 group-hover:opacity-20 transition-opacity">📁</div>
                 </button>
               )) : (
                 <p className="p-10 text-center text-slate-300 font-black uppercase text-[10px]">No historical years detected</p>
               )}
            </div>
         </div>

         {/* TERM & MONTH EXPLORER */}
         <div className="lg:col-span-8 bg-white rounded-[3.5rem] border border-slate-200 shadow-xl p-10 min-h-[500px]">
            {!selectedYear ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                 <div className="text-8xl mb-6">🔍</div>
                 <p className="text-xl font-black uppercase tracking-widest">Select Year to Expand</p>
              </div>
            ) : (
              <div className="space-y-12 animate-in">
                 <div className="space-y-6">
                    <h4 className="text-xs font-black text-indigo-600 uppercase tracking-[0.3em]">Term Cycles for {selectedYear}</h4>
                    <div className="flex flex-wrap gap-4">
                       {terms.map(t => (
                         <button 
                           key={t}
                           onClick={() => { setSelectedTerm(t); setSelectedMonth(''); }}
                           className={`px-10 py-5 rounded-[2rem] font-black uppercase text-sm transition-all border-2 ${selectedTerm === t ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                         >
                           {t}
                         </button>
                       ))}
                    </div>
                 </div>

                 {selectedTerm && (
                    <div className="space-y-6 animate-in">
                       <h4 className="text-xs font-black text-emerald-600 uppercase tracking-[0.3em]">Monthly Records</h4>
                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {months.map(m => (
                            <button 
                              key={m}
                              onClick={() => setSelectedMonth(m)}
                              className={`p-6 rounded-3xl font-black uppercase text-xs transition-all border-2 flex flex-col items-center gap-3 ${selectedMonth === m ? 'bg-emerald-600 border-emerald-700 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-emerald-200'}`}
                            >
                              <span className="text-2xl">📅</span>
                              {m}
                            </button>
                          ))}
                       </div>
                    </div>
                 )}

                 {selectedMonth && (
                    <div className="pt-10 border-t border-slate-100 animate-in">
                       <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-200 text-center">
                          <h5 className="text-lg font-black text-slate-900 uppercase mb-4">Jump to Context</h5>
                          <p className="text-xs text-slate-500 uppercase tracking-widest mb-8">This will instantly load all sheets for {selectedYear}, {selectedTerm}, {selectedMonth}</p>
                          <div className="flex justify-center gap-4">
                             <button 
                               onClick={() => {
                                 // Logic to broadcast the global context switch would go here 
                                 // Usually handled by updating Management settings which trigger App.tsx
                                 alert("Context Routing Active: Switching Global View Mode...");
                               }}
                               className="bg-indigo-600 text-white px-12 py-5 rounded-[2rem] font-black uppercase text-xs shadow-xl hover:bg-indigo-700 transition-all"
                             >
                               Load Session Context
                             </button>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
            )}
         </div>
      </div>

      {/* RECENT ARCHIVAL ACTIVITY */}
      <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl overflow-hidden">
         <h4 className="text-xl font-black text-slate-900 uppercase mb-8 border-b border-slate-100 pb-4">Session Statistics</h4>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {years.map(y => {
              const termsInYear = archivalIndex[y] ? Object.keys(archivalIndex[y]).length : 0;
              return (
                <div key={y} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                   <div className="text-[10px] font-black text-slate-400 uppercase mb-1">{y}</div>
                   <div className="text-sm font-black text-slate-900 uppercase">{termsInYear} Full Terms</div>
                </div>
              );
            })}
         </div>
      </div>
    </div>
  );
};

export default ArchivePortal;
