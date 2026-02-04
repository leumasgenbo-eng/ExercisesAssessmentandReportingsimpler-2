import React, { useState, useEffect } from 'react';
import { AssessmentData, AssessmentType, ExerciseMetadata } from '../../types';
import { EXERCISES_PER_TYPE } from '../../constants';

interface Props {
  data: AssessmentData;
  type: AssessmentType;
  availableIndicators: string[];
  onUpdate: (data: AssessmentData) => void;
  onNext: () => void;
  onBack: () => void;
}

const WizardRigor: React.FC<Props> = ({ data, type, availableIndicators, onUpdate, onNext, onBack }) => {
  const [activeEx, setActiveEx] = useState<number>(1);
  const totalEx = EXERCISES_PER_TYPE[type];
  
  // Local text state for raw input
  const [localText, setLocalText] = useState('');

  // Sync local text when active exercise changes
  useEffect(() => {
    const codes = data.exercises[activeEx]?.indicatorCodes || [];
    setLocalText(codes.join(', '));
  }, [activeEx, data.exercises]);

  const updateMetadata = (id: number, field: keyof ExerciseMetadata, value: any) => {
    onUpdate({
      ...data,
      exercises: { ...data.exercises, [id]: { ...data.exercises[id], [field]: value } }
    });
  };

  const handleIndicatorInput = (val: string) => {
    setLocalText(val);
    const codes = val.split(/[,\n;]+/).map(s => s.trim()).filter(s => s);
    updateMetadata(activeEx, 'indicatorCodes', codes);
  };

  const togglePlannedCode = (code: string) => {
    const currentCodes = data.exercises[activeEx]?.indicatorCodes || [];
    let newCodes: string[];
    
    if (currentCodes.includes(code)) {
      newCodes = currentCodes.filter(c => c !== code);
    } else {
      newCodes = [...currentCodes, code];
    }
    
    updateMetadata(activeEx, 'indicatorCodes', newCodes);
    setLocalText(newCodes.join(', '));
  };

  const exMeta = data.exercises[activeEx] || { maxScore: '10', date: '', indicatorCodes: [] };
  const currentExIndicators = exMeta.indicatorCodes || [];
  
  // Requirement check: Must have at least one indicator to proceed
  const isSetupValid = currentExIndicators.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in zoom-in-95 pb-20">
      <div className="text-center">
        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none mb-4">Rigor Configuration</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Establish NaCCA indicators for each exercise</p>
      </div>

      <div className="bg-white p-8 md:p-14 rounded-[4rem] border-4 border-slate-950 shadow-2xl relative overflow-hidden">
        {/* Progress Indicator for Exercises */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-8 mb-10 border-b-2 border-slate-50">
          {Array.from({ length: totalEx }, (_, i) => i + 1).map(num => {
            const hasInd = (data.exercises[num]?.indicatorCodes?.length || 0) > 0;
            return (
              <button 
                key={num} 
                onClick={() => setActiveEx(num)} 
                className={`px-10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shrink-0 border-2 relative ${
                  activeEx === num ? 'bg-slate-950 border-slate-950 text-white shadow-xl scale-105' : 'bg-slate-50 border-transparent text-slate-300 hover:bg-slate-100'
                }`}
              >
                Ex. {num}
                {hasInd && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400"></span>
                )}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-10">
            {/* Meta Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Date</label>
                  <input type="date" className="w-full bg-slate-50 border-4 border-slate-100 p-4 rounded-3xl font-black uppercase text-xs focus:border-indigo-600 outline-none" value={exMeta.date || ''} onChange={(e) => updateMetadata(activeEx, 'date', e.target.value)} />
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Threshold (Max)</label>
                  <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-3xl border-4 border-slate-100">
                    <button onClick={() => updateMetadata(activeEx, 'maxScore', Math.max(1, parseInt(exMeta.maxScore || '10') - 1).toString())} className="w-10 h-10 bg-white text-slate-950 rounded-xl font-black text-xl shadow-sm hover:bg-rose-500 hover:text-white">-</button>
                    <span className="flex-1 text-center text-xl font-black text-slate-900">{exMeta.maxScore || '10'}</span>
                    <button onClick={() => updateMetadata(activeEx, 'maxScore', (parseInt(exMeta.maxScore || '10') + 1).toString())} className="w-10 h-10 bg-white text-slate-950 rounded-xl font-black text-xl shadow-sm hover:bg-emerald-500 hover:text-white">+</button>
                  </div>
               </div>
            </div>

            {/* Selection Hub for Planned Indicators */}
            <div className="bg-indigo-50/50 p-8 rounded-[3rem] border-4 border-indigo-100">
                <div className="flex justify-between items-center mb-6">
                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-widest">Planned from Broadsheet</h4>
                    <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm">Week {data.week} Archive</span>
                </div>
                
                {availableIndicators.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {availableIndicators.map(code => (
                      <button 
                        key={code} 
                        onClick={() => togglePlannedCode(code)}
                        className={`group p-4 rounded-2xl text-[10px] font-black uppercase text-left transition-all border-4 flex justify-between items-center ${
                          currentExIndicators.includes(code) 
                            ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg' 
                            : 'bg-white border-transparent text-indigo-400 hover:border-indigo-200'
                        }`}
                      >
                        <span className="tracking-widest">{code}</span>
                        {currentExIndicators.includes(code) ? (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <span className="opacity-0 group-hover:opacity-40">+ ADD</span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center opacity-30">
                    <p className="text-[9px] font-bold text-indigo-900 uppercase tracking-[0.2em] leading-relaxed">
                      No indicators were logged in the roadmap.<br/>
                      <span className="text-slate-400">Custom input is required below.</span>
                    </p>
                  </div>
                )}
            </div>
          </div>

          {/* Customary Indicators Section */}
          <div className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center px-1">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Indicator Repository</label>
               <span className={`text-[8px] font-black px-2 py-1 rounded uppercase ${currentExIndicators.length > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600 animate-pulse'}`}>
                  {currentExIndicators.length > 0 ? 'Protocol Ready' : 'Mandatory Setup'}
               </span>
            </div>
            <textarea 
               className="flex-1 w-full min-h-[350px] bg-slate-50 border-4 border-slate-100 p-8 rounded-[4rem] font-black text-indigo-600 text-xs shadow-inner focus:border-indigo-600 focus:bg-white outline-none transition-all resize-none placeholder-indigo-200"
               placeholder="Enter customary indicators here, separated by commas or lines... e.g. B1.2.3, M4.5..."
               value={localText}
               onChange={(e) => handleIndicatorInput(e.target.value)}
            />
            {!isSetupValid && (
              <div className="p-5 bg-rose-50 border-2 border-rose-100 rounded-3xl flex items-start gap-4">
                 <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center text-xl shrink-0 shadow-lg">⚠️</div>
                 <div>
                    <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Configuration Error</h5>
                    <p className="text-[9px] font-bold text-rose-400 uppercase leading-tight">Facilitator MUST select a planned indicator or submit customary indicators before launching scoring.</p>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Protocol Buttons */}
      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 bg-white border-4 border-slate-950 text-slate-950 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.4em] hover:bg-slate-50 transition-all shadow-xl">Back to Scope</button>
        <button 
          onClick={onNext} 
          disabled={!isSetupValid}
          className={`flex-[2] py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.4em] shadow-[0_30px_60px_rgba(0,0,0,0.3)] transition-all active:scale-95 border-b-8 ${
            isSetupValid 
              ? 'bg-slate-950 text-white border-indigo-600 hover:bg-black' 
              : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-50'
          }`}
        >
          Launch Official Scoring Protocol
        </button>
      </div>
    </div>
  );
};

export default WizardRigor;