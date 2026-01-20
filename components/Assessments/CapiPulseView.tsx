import React from 'react';
import { AssessmentData, Pupil, AssessmentType } from '../../types';
import { EXERCISES_PER_TYPE } from '../../constants';

interface Props {
  data: AssessmentData;
  gridRows: Pupil[];
  activeEx: number;
  setActiveEx: (num: number) => void;
  updatePupil: (pupilId: string, updates: Partial<Pupil>) => void;
  onInterventionClick: (pupil: Pupil) => void;
}

const CapiPulseView: React.FC<Props> = ({ data, gridRows, activeEx, setActiveEx, updatePupil, onInterventionClick }) => {
  const currentExMeta = data.exercises[activeEx] || { maxScore: '10' };
  const maxThreshold = parseFloat(currentExMeta.maxScore) || 10;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* PRINT-ONLY FORMAL HEADER */}
      <div className="hidden print:block text-center border-b-4 border-slate-900 pb-6 mb-10">
         <h1 className="text-3xl font-black uppercase tracking-tighter">UNITED BAYLOR ACADEMY</h1>
         <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 mt-2">Activity Pulse Cards • Exercise {activeEx}</p>
         <div className="flex justify-center gap-10 mt-4 text-[10px] font-black uppercase">
            <span>Subject: {data.subject}</span>
            <span>Class: {data.className}</span>
            <span>Wk: {data.week}</span>
            <span>Term: {data.term}</span>
         </div>
      </div>

      {/* EXERCISE SELECTOR STRIP */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-4 no-print">
        {Object.keys(data.exercises).map(numStr => {
          const num = parseInt(numStr);
          return (
            <button 
              key={num} 
              onClick={() => setActiveEx(num)}
              className={`px-8 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${activeEx === num ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-100 text-slate-300'}`}
            >
              Ex. {num}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4">
        {gridRows.map((pup, pidx) => {
          const score = pup.scores[activeEx] || '';
          const percent = score ? (parseFloat(score) / maxThreshold) * 100 : 0;

          const adjust = (delta: number) => {
            const current = parseFloat(score) || 0;
            const newVal = Math.min(maxThreshold, Math.max(0, current + delta));
            updatePupil(pup.id, { scores: { ...pup.scores, [activeEx]: newVal.toString() } });
          };

          return (
            <div key={pup.id} className={`bg-white rounded-[2.5rem] p-6 border-2 transition-all flex flex-col gap-4 print:rounded-[1.5rem] print:p-4 print:break-inside-avoid ${score !== '' ? 'border-indigo-100 bg-indigo-50/5 print:border-slate-200' : 'border-slate-100 shadow-md shadow-slate-100/50'}`}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex flex-col items-center justify-center shrink-0 shadow-lg print:w-10 print:h-10 print:rounded-xl">
                  <span className="text-[7px] font-black opacity-40 uppercase leading-none mb-0.5">SN</span>
                  <span className="text-xl font-black leading-none print:text-base">{pidx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-base font-black text-slate-900 uppercase tracking-tight truncate leading-tight print:text-sm">{pup.name || `PUPIL ${pidx + 1}`}</h5>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden print:h-1">
                       <div className={`h-full transition-all duration-700 ${percent >= 80 ? 'bg-emerald-500' : percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${percent}%` }}></div>
                    </div>
                    <span className={`text-[8px] font-black uppercase whitespace-nowrap ${percent >= 80 ? 'text-emerald-600' : percent >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>{percent.toFixed(0)}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-50 print:pt-2">
                <button 
                  onClick={() => updatePupil(pup.id, { bookOpen: !pup.bookOpen })}
                  className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase border transition-all print:px-2 print:py-1 ${pup.bookOpen ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}
                >
                  {pup.bookOpen ? 'Present' : 'Missing'}
                </button>

                <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-[1.5rem] shadow-inner print:bg-transparent print:p-0">
                  <button onClick={() => adjust(-1)} className="w-10 h-10 rounded-xl bg-white text-slate-400 font-black text-2xl hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm no-print">-</button>
                  <div className="relative w-14 text-center">
                    <input 
                      type="number" 
                      className="w-full h-10 text-center text-2xl font-black text-slate-900 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none print:h-8 print:text-lg" 
                      value={score} 
                      onChange={(e) => updatePupil(pup.id, { scores: { ...pup.scores, [activeEx]: e.target.value } })}
                      placeholder="0"
                    />
                    <div className="hidden print:block absolute -bottom-1 left-1/2 -translate-x-1/2 text-[5px] font-black uppercase opacity-40">Mark</div>
                  </div>
                  <button onClick={() => adjust(1)} className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black text-2xl hover:bg-indigo-700 shadow-lg transition-all no-print">+</button>
                </div>

                <button 
                  onClick={() => onInterventionClick(pup)}
                  className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center text-xl transition-all shadow-sm print:w-8 print:h-8 print:text-sm ${pup.interventions && pup.interventions.length > 0 ? 'bg-rose-600 border-rose-700 text-white' : 'bg-white border-slate-100 hover:bg-rose-50'}`}
                >
                  {pup.interventions && pup.interventions.length > 0 ? '✔️' : '🚨'}
                </button>
              </div>
              
              {/* PRINT-ONLY SCORE CONTEXT */}
              <div className="hidden print:block border-t border-slate-100 pt-2 mt-auto">
                 <div className="flex justify-between text-[6px] font-black uppercase text-slate-400">
                    <span>Threshold: {maxThreshold}</span>
                    <span>Variance: {maxThreshold - (parseFloat(score) || 0)}</span>
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CapiPulseView;