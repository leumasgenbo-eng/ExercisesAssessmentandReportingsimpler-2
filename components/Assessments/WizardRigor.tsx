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
  
  // Local text to avoid lag
  const [localText, setLocalText] = useState('');

  useEffect(() => {
    const codes = data.exercises[activeEx]?.indicatorCodes || [];
    setLocalText(codes.join(', '));
  }, [activeEx]);

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

  const addCode = (code: string) => {
    const current = localText.trim();
    const newVal = current ? `${current}, ${code}` : code;
    handleIndicatorInput(newVal);
  };

  const exMeta = data.exercises[activeEx] || { maxScore: '10', date: '' };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in zoom-in-95 pb-20">
      <div className="text-center">
        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Rigor Configuration</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Define thresholds and curriculum target codes</p>
      </div>

      <div className="bg-white p-10 md:p-14 rounded-[4rem] border border-slate-200 shadow-2xl">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-8 mb-10 border-b border-slate-50">
          {Array.from({ length: totalEx }, (_, i) => i + 1).map(num => (
            <button 
              key={num} 
              onClick={() => setActiveEx(num)} 
              className={`px-10 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shrink-0 ${
                activeEx === num ? 'bg-indigo-600 text-white shadow-xl' : 'bg-slate-50 text-slate-300'
              }`}
            >
              Ex. {num}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Execution Date</label>
              <input type="date" className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-3xl font-black uppercase text-sm focus:border-indigo-600 outline-none" value={exMeta.date || ''} onChange={(e) => updateMetadata(activeEx, 'date', e.target.value)} />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Score (Threshold)</label>
              <div className="bg-slate-950 p-4 rounded-[3rem] flex items-center gap-6 shadow-2xl shadow-indigo-900/20">
                <button onClick={() => updateMetadata(activeEx, 'maxScore', Math.max(1, parseInt(exMeta.maxScore) - 1).toString())} className="w-14 h-14 bg-white/10 text-white rounded-2xl font-black text-2xl hover:bg-rose-600 transition-all">-</button>
                <div className="flex-1 text-center">
                  <span className="text-4xl font-black text-white">{exMeta.maxScore || '10'}</span>
                  <p className="text-[8px] font-black text-indigo-400 uppercase mt-1 tracking-widest">Points</p>
                </div>
                <button onClick={() => updateMetadata(activeEx, 'maxScore', (parseInt(exMeta.maxScore) + 1).toString())} className="w-14 h-14 bg-indigo-600 text-white rounded-2xl font-black text-2xl hover:bg-emerald-600 transition-all shadow-lg">+</button>
              </div>
            </div>

            {availableIndicators.length > 0 && (
              <div className="p-6 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-4">Planned Roadmap Codes</label>
                <div className="flex flex-wrap gap-2">
                  {availableIndicators.map(code => (
                    <button key={code} onClick={() => addCode(code)} className="px-4 py-1.5 bg-white border border-indigo-100 rounded-xl text-[10px] font-black text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">{code}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4 flex flex-col">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Target Indicators</label>
              <span className="text-[8px] font-bold text-indigo-500 uppercase">Custom Entry Allowed</span>
            </div>
            <textarea 
              className="flex-1 w-full min-h-[300px] bg-slate-50 border-2 border-slate-100 p-8 rounded-[3.5rem] font-black text-indigo-600 text-xs shadow-inner focus:border-indigo-600 focus:bg-white outline-none transition-all resize-none"
              placeholder="e.g. B1.1.2.2, M1.2..."
              value={localText}
              onChange={(e) => handleIndicatorInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 bg-white border-2 border-slate-200 text-slate-400 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.2em]">Scope Settings</button>
        <button onClick={onNext} className="flex-[2] bg-indigo-600 text-white py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl hover:bg-indigo-700 transition-all">Launch Official Entry</button>
      </div>
    </div>
  );
};

export default WizardRigor;