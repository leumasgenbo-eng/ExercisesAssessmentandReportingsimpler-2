import React, { useState } from 'react';
import { AssessmentData, Pupil } from '../../types';

interface Props {
  data: AssessmentData;
  gridRows: Pupil[];
  activeEx: number;
  setActiveEx: (num: number) => void;
  updatePupil: (pupilId: string, updates: Partial<Pupil>) => void;
  onInterventionClick: (pupil: Pupil) => void;
}

const CapiPulseView: React.FC<Props> = ({ data, gridRows, activeEx, setActiveEx, updatePupil, onInterventionClick }) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const currentExMeta = data.exercises[activeEx] || { maxScore: '10' };
  const maxThreshold = parseFloat(currentExMeta.maxScore) || 10;

  const currentPupil = gridRows[focusedIndex];
  const score = currentPupil?.scores[activeEx] || '';
  const percent = score ? (parseFloat(score) / maxThreshold) * 100 : 0;

  const adjust = (delta: number) => {
    if (!currentPupil) return;
    const current = parseFloat(score) || 0;
    const newVal = Math.min(maxThreshold, Math.max(0, current + delta));
    updatePupil(currentPupil.id, { scores: { ...currentPupil.scores, [activeEx]: newVal.toString() } });
  };

  const nextPupil = () => {
    if (focusedIndex < gridRows.length - 1) setFocusedIndex(focusedIndex + 1);
  };

  const prevPupil = () => {
    if (focusedIndex > 0) setFocusedIndex(focusedIndex - 1);
  };

  return (
    <div className="space-y-10 animate-in fade-in max-w-2xl mx-auto pb-64">
      {/* EXERCISE SELECTOR STRIP */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-6 no-print border-b border-white/5">
        {Object.keys(data.exercises).map(numStr => {
          const num = parseInt(numStr);
          return (
            <button 
              key={num} 
              onClick={() => setActiveEx(num)}
              className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${activeEx === num ? 'bg-indigo-600 text-white shadow-[0_15px_30px_rgba(79,70,229,0.3)]' : 'bg-slate-900 border border-white/10 text-slate-500'}`}
            >
              Ex. {num}
            </button>
          );
        })}
      </div>

      {currentPupil && (
        <div className="bg-white rounded-[4.5rem] p-12 md:p-16 shadow-[0_80px_160px_rgba(0,0,0,0.5)] border-4 border-slate-950 relative animate-in zoom-in-95">
           <div className="absolute top-[-25px] left-1/2 -translate-x-1/2 bg-slate-950 text-white px-8 py-2.5 rounded-full text-[11px] font-black uppercase tracking-[0.5em] shadow-2xl border border-white/10">
              Identity Node {focusedIndex + 1} of {gridRows.length}
           </div>

           <div className="flex flex-col items-center text-center gap-8 mb-14">
              <div className="w-28 h-28 rounded-[3rem] bg-slate-950 text-white flex items-center justify-center text-5xl font-black shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
                {currentPupil.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-4xl font-black text-slate-950 uppercase tracking-tighter leading-tight mb-3">{currentPupil.name}</h3>
                <div className="flex items-center gap-4 justify-center">
                  <div className="h-3 w-40 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div className={`h-full transition-all duration-700 ${percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${percent}%` }}></div>
                  </div>
                  <span className={`text-[11px] font-black uppercase tracking-widest ${percent >= 80 ? 'text-emerald-600' : percent >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>{percent.toFixed(0)}% PROFICIENCY</span>
                </div>
              </div>
           </div>

           <div className="space-y-12">
              <div className="bg-slate-50 p-12 rounded-[4rem] flex items-center justify-between shadow-inner border border-slate-100">
                 <button onClick={() => adjust(-1)} className="w-24 h-24 rounded-[2.5rem] bg-white text-slate-300 font-black text-5xl hover:bg-rose-500 hover:text-white transition-all shadow-xl active:scale-90">-</button>
                 <div className="flex flex-col items-center">
                    <input 
                      type="number" 
                      className="w-40 h-24 text-center text-8xl font-black text-slate-950 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                      value={score} 
                      onChange={(e) => updatePupil(currentPupil.id, { scores: { ...currentPupil.scores, [activeEx]: e.target.value } })}
                      placeholder="0"
                    />
                    <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] mt-2">THRESHOLD: {maxThreshold}</span>
                 </div>
                 <button onClick={() => adjust(1)} className="w-24 h-24 rounded-[2.5rem] bg-indigo-600 text-white font-black text-5xl hover:bg-indigo-700 shadow-2xl transition-all active:scale-90">+</button>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <button 
                  onClick={() => updatePupil(currentPupil.id, { bookOpen: !currentPupil.bookOpen })}
                  className={`py-8 rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.3em] border-4 transition-all shadow-sm ${currentPupil.bookOpen ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}
                 >
                   {currentPupil.bookOpen ? 'BOOK PRESENT' : 'BOOK MISSING'}
                 </button>
                 <button 
                  onClick={() => onInterventionClick(currentPupil)}
                  className={`py-8 rounded-[2.5rem] font-black uppercase text-[11px] tracking-[0.3em] border-4 transition-all shadow-sm ${currentPupil.interventions && currentPupil.interventions.length > 0 ? 'bg-rose-600 border-rose-700 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400'}`}
                 >
                   CLINICAL FLAG
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* FLOATING NAVIGATION CONTROL TABS */}
      <div className="fixed bottom-40 left-1/2 -translate-x-1/2 z-[60] flex gap-5 w-full max-w-xl px-8 no-print animate-in slide-in-from-bottom-10">
         <button 
           disabled={focusedIndex === 0}
           onClick={prevPupil}
           className="flex-1 bg-slate-950/95 backdrop-blur-3xl text-white py-7 rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.3em] shadow-2xl border border-white/10 disabled:opacity-20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
         >
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M15 19l-7-7 7-7" /></svg>
           Previous Pupil
         </button>
         <button 
           disabled={focusedIndex === gridRows.length - 1}
           onClick={nextPupil}
           className="flex-1 bg-indigo-600/95 backdrop-blur-3xl text-white py-7 rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.3em] shadow-[0_30px_60px_rgba(79,70,229,0.4)] border border-white/10 disabled:opacity-20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
         >
           Next Pupil
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M9 5l7 7-7 7" /></svg>
         </button>
      </div>
    </div>
  );
};

export default CapiPulseView;