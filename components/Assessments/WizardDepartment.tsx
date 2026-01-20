import React from 'react';
import { SchoolGroup } from '../../types';
import { SCHOOL_HIERARCHY } from '../../constants';

interface Props {
  activeGroup: SchoolGroup;
  onSelect: (group: SchoolGroup) => void;
  onBack: () => void;
}

const WizardDepartment: React.FC<Props> = ({ activeGroup, onSelect, onBack }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-in fade-in zoom-in-95">
      <div className="text-center">
        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Institutional Stage</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Define the department scope for this entry</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {Object.entries(SCHOOL_HIERARCHY).map(([key, group]) => (
          <button 
            key={key} 
            onClick={() => onSelect(key as SchoolGroup)}
            className={`p-10 rounded-[3rem] border-2 flex justify-between items-center transition-all ${
              activeGroup === key 
                ? 'bg-sky-600 border-sky-700 text-white shadow-2xl' 
                : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <div>
              <span className="text-lg font-black uppercase tracking-tight">{group.label} Department</span>
              <p className="text-[9px] font-bold uppercase opacity-60 mt-1 tracking-widest">Active Curriculum Active</p>
            </div>
            <div className="flex items-center gap-4">
               <span className="text-[10px] font-black opacity-40 uppercase">{group.classes.length} Classes</span>
               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${activeGroup === key ? 'bg-white/20' : 'bg-slate-100'}`}>➔</div>
            </div>
          </button>
        ))}
      </div>

      <button onClick={onBack} className="w-full text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-slate-900 transition-colors">Change Modality</button>
    </div>
  );
};

export default WizardDepartment;