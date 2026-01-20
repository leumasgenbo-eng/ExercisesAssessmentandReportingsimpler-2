import React, { useMemo } from 'react';
import { AssessmentData, SchoolGroup } from '../../types';
import { SCHOOL_HIERARCHY, SUBJECTS_BY_GROUP, WEEK_COUNT } from '../../constants';

interface Props {
  data: AssessmentData;
  activeGroup: SchoolGroup;
  onClassChange: (cls: string) => void;
  onSubjectChange: (sub: string) => void;
  onWeekChange: (w: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const WizardScope: React.FC<Props> = ({ data, activeGroup, onClassChange, onSubjectChange, onWeekChange, onNext, onBack }) => {
  const allowedSubjects = useMemo(() => SUBJECTS_BY_GROUP[activeGroup] || [], [activeGroup]);

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in zoom-in-95">
      <div className="text-center">
        <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Scope & Environment</h3>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Identify specific node and academic domain</p>
      </div>

      <div className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-xl space-y-12">
        <div className="space-y-6">
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block text-center">Specific Class Unit</label>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
             {SCHOOL_HIERARCHY[activeGroup].classes.map(cls => (
               <button 
                key={cls} 
                onClick={() => onClassChange(cls)}
                className={`py-5 rounded-[1.8rem] font-black uppercase text-[10px] border-2 transition-all ${
                  data.className === cls ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-white hover:border-slate-200'
                }`}
               >
                 {cls}
               </button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Area</label>
            <select 
              className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] font-black text-slate-900 uppercase text-xs outline-none focus:border-indigo-600 shadow-inner"
              value={data.subject || ''}
              onChange={(e) => onSubjectChange(e.target.value)}
            >
              <option value="">- SELECT DOMAIN -</option>
              {allowedSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Academic Week</label>
            <select 
              className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] font-black text-slate-900 uppercase text-xs outline-none focus:border-indigo-600 shadow-inner"
              value={data.week}
              onChange={(e) => onWeekChange(e.target.value)}
            >
              {Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 bg-white border-2 border-slate-200 text-slate-400 py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.2em]">Back</button>
        <button disabled={!data.subject} onClick={onNext} className="flex-[2] bg-slate-950 text-white py-6 rounded-[2.5rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl disabled:opacity-50">Setup Exercise Setup</button>
      </div>
    </div>
  );
};

export default WizardScope;