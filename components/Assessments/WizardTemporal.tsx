import React, { useRef } from 'react';
import { AssessmentData } from '../../types';
import { ACADEMIC_YEAR_RANGE } from '../../constants';

interface Props {
  data: AssessmentData;
  onYearChange: (y: string) => void;
  onTermChange: (t: string) => void;
  onMonthChange: (m: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const WizardTemporal: React.FC<Props> = ({ data, onYearChange, onTermChange, onMonthChange, onNext, onBack }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="max-w-2xl mx-auto space-y-10 animate-in fade-in zoom-in-95">
      <div className="text-center">
        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Academic Timeline</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Establish the temporal context of this assessment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 p-10 rounded-[3rem] border border-slate-200">
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Session Year</label>
          <div className="relative h-48 bg-white rounded-[2.5rem] shadow-inner border border-slate-100 overflow-hidden">
             <div ref={scrollRef} className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide py-16">
                {ACADEMIC_YEAR_RANGE.map(y => (
                  <div key={y} onClick={() => onYearChange(y)} className={`h-16 flex items-center justify-center snap-center cursor-pointer transition-all ${data.year === y ? 'text-indigo-600 font-black scale-110' : 'text-slate-300 opacity-40'}`}>
                    <span className="text-xl">{y}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-2">
            {["1ST TERM", "2ND TERM", "3RD TERM"].map(t => (
              <button key={t} onClick={() => onTermChange(t)} className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all ${data.term === t ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}>{t}</button>
            ))}
          </div>
          <select className="w-full bg-white border-2 border-slate-100 p-4 rounded-2xl font-black text-slate-900 uppercase text-[10px]" value={data.month} onChange={(e) => onMonthChange(e.target.value)}>
            {["MONTH 1", "MONTH 2", "MONTH 3", "MONTH 4"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 bg-white border-2 border-slate-200 text-slate-400 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.2em]">Go Back</button>
        <button onClick={onNext} className="flex-[2] bg-slate-900 text-white py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl">Confirm Period</button>
      </div>
    </div>
  );
};

export default WizardTemporal;