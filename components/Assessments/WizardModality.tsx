import React from 'react';
import { AssessmentType } from '../../types';

interface Props {
  currentType: AssessmentType;
  onSelect: (type: AssessmentType) => void;
  onBack: () => void;
}

const WizardModality: React.FC<Props> = ({ currentType, onSelect, onBack }) => {
  const options: { id: AssessmentType; label: string; icon: string; color: string }[] = [
    { id: 'CLASS', label: 'Class Work', icon: '📝', color: 'indigo' },
    { id: 'HOME', label: 'Home Work', icon: '🏠', color: 'emerald' },
    { id: 'PROJECT', label: 'Project Work', icon: '🚀', color: 'amber' },
    { id: 'CRITERION', label: 'Criterion Growth', icon: '📈', color: 'rose' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in zoom-in-95">
      <div className="text-center">
        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Assessment Modality</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select the category of academic output</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {options.map(opt => (
          <button 
            key={opt.id} 
            onClick={() => onSelect(opt.id)}
            className={`p-10 rounded-[3rem] border-4 transition-all text-center group flex flex-col items-center justify-center gap-4 ${
              currentType === opt.id 
                ? `bg-${opt.color}-600 border-${opt.color}-700 text-white shadow-2xl scale-105` 
                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
            }`}
          >
            <div className="text-5xl group-hover:scale-125 transition-transform">{opt.icon}</div>
            <div className="text-[11px] font-black uppercase tracking-widest leading-tight">{opt.label}</div>
          </button>
        ))}
      </div>

      <button onClick={onBack} className="w-full text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-900 transition-colors">Return to Timeline</button>
    </div>
  );
};

export default WizardModality;