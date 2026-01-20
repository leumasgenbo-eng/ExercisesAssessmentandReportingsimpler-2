
import React from 'react';
import { AssessmentType, SchoolGroup } from '../types';
import { SCHOOL_HIERARCHY, EXERCISES_PER_TYPE, WEEK_COUNT } from '../constants';

interface TopbarProps {
  activeView: 'ASSESSMENT' | 'FACILITATORS' | 'PLANNING' | 'ADMIN' | 'PUPILS';
  onViewChange: (view: string) => void;
  activeTab: AssessmentType;
  onTabChange: (tab: AssessmentType) => void;
  activeSchoolGroup: SchoolGroup;
  onSchoolGroupChange: (group: SchoolGroup) => void;
  activeClass: string;
  onClassChange: (className: string) => void;
  activeWeek: string;
  onWeekChange: (week: string) => void;
  selectedExercise: number | 'ALL';
  onExerciseChange: (ex: number | 'ALL') => void;
  onPrint: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ 
  activeView,
  onViewChange,
  activeTab, 
  onTabChange, 
  activeSchoolGroup,
  onSchoolGroupChange,
  activeClass,
  onClassChange,
  activeWeek,
  onWeekChange,
  selectedExercise,
  onExerciseChange,
  onPrint 
}) => {
  const assessmentCategories: { id: AssessmentType; label: string }[] = [
    { id: 'CLASS', label: 'Class Work' },
    { id: 'HOME', label: 'Home Work' },
    { id: 'PROJECT', label: 'Project Work' },
  ];

  const exerciseOptionsCount = EXERCISES_PER_TYPE[activeTab];
  const exerciseOptions = Array.from({ length: exerciseOptionsCount }, (_, i) => i + 1);
  const weekOptions = Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString());

  return (
    <header className="no-print bg-white border-b border-sky-100 sticky top-0 z-50 shadow-sm">
      <div className="bg-sky-950 text-white shadow-inner">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-3 md:py-0 md:h-14 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex flex-col cursor-pointer group shrink-0" onClick={() => onViewChange('ASSESSMENT')}>
              <h1 className="text-sm md:text-lg font-black tracking-tighter uppercase leading-none group-hover:text-sky-300 transition-colors">Portal</h1>
              <span className="text-[7px] md:text-[9px] text-sky-400 uppercase tracking-widest font-black">Management</span>
            </div>
            
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide pb-1 md:pb-0 md:gap-4 w-full border-l border-white/10 pl-3">
              <button 
                onClick={() => onViewChange('ASSESSMENT')}
                className={`shrink-0 px-3 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all rounded-md ${activeView === 'ASSESSMENT' ? 'bg-sky-600 text-white shadow-lg' : 'text-sky-400 hover:text-white'}`}
              >
                Assess
              </button>
              <button 
                onClick={() => onViewChange('PUPILS')}
                className={`shrink-0 px-3 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all rounded-md ${activeView === 'PUPILS' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:text-white'}`}
              >
                Pupils
              </button>
              <button 
                onClick={() => onViewChange('PLANNING')}
                className={`shrink-0 px-3 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all rounded-md ${activeView === 'PLANNING' ? 'bg-sky-600 text-white shadow-lg' : 'text-sky-400 hover:text-white'}`}
              >
                Plan
              </button>
              <button 
                onClick={() => onViewChange('FACILITATORS')}
                className={`shrink-0 px-3 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all rounded-md ${activeView === 'FACILITATORS' ? 'bg-sky-600 text-white shadow-lg' : 'text-sky-400 hover:text-white'}`}
              >
                Staff
              </button>
              <button 
                onClick={() => onViewChange('ADMIN')}
                className={`shrink-0 px-3 py-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all rounded-md ${activeView === 'ADMIN' ? 'bg-rose-600 text-white shadow-lg' : 'text-rose-400 hover:text-rose-600'}`}
              >
                Admin
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {activeView === 'ASSESSMENT' && (
              <>
                <div className="flex items-center gap-2">
                   <div className="flex items-center bg-white/10 rounded-lg px-2 py-1 gap-1 border border-white/5">
                    <span className="text-[8px] md:text-[10px] font-black uppercase text-sky-300">Wk:</span>
                    <select className="bg-transparent text-[9px] md:text-[10px] font-black uppercase focus:outline-none cursor-pointer" value={activeWeek} onChange={(e) => onWeekChange(e.target.value)}>
                      {weekOptions.map(wk => (
                        <option key={wk} value={wk} className="text-sky-950">Wk {wk}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center bg-white/10 rounded-lg px-2 py-1 gap-1 border border-white/5">
                    <span className="text-[8px] md:text-[10px] font-black uppercase text-sky-300">Ex:</span>
                    <select className="bg-transparent text-[9px] md:text-[10px] font-black uppercase focus:outline-none cursor-pointer" value={selectedExercise} onChange={(e) => onExerciseChange(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}>
                      <option value="ALL" className="text-sky-950">All</option>
                      {exerciseOptions.map(ex => (
                        <option key={ex} value={ex} className="text-sky-950">No. {ex}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={onPrint} className="bg-white/10 hover:bg-white text-white hover:text-sky-950 px-3 py-2 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                  </svg>
                  Export
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {activeView === 'ASSESSMENT' && (
        <div className="bg-sky-50/50 border-b border-sky-100 overflow-hidden">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-2 flex items-center gap-3 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 w-full">
              <div className="flex gap-1 border-r border-sky-200 pr-2 mr-1 shrink-0">
                {assessmentCategories.map(cat => (
                  <button key={cat.id} onClick={() => { onTabChange(cat.id); onExerciseChange('ALL'); }} className={`px-2 py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-tight transition-all ${activeTab === cat.id ? 'bg-sky-600 text-white shadow-md' : 'text-sky-700/60 hover:text-sky-900'}`}>{cat.label.replace(' Work', '')}</button>
                ))}
              </div>

              <div className="flex gap-1 items-center overflow-x-auto scrollbar-hide py-1">
                {Object.entries(SCHOOL_HIERARCHY).map(([key, group]) => (
                  <button key={key} onClick={() => { onSchoolGroupChange(key as SchoolGroup); onClassChange(group.classes[0]); }} className={`shrink-0 px-3 py-1 text-[9px] md:text-[11px] font-black uppercase tracking-tighter rounded-full transition-all border ${activeSchoolGroup === key ? 'border-sky-900 bg-sky-900 text-white' : 'border-transparent text-sky-700/50 hover:bg-sky-100'}`}>{group.label}</button>
                ))}
              </div>

              <div className="h-4 w-px bg-sky-200 mx-1 shrink-0"></div>

              <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1">
                {SCHOOL_HIERARCHY[activeSchoolGroup].classes.map(cls => (
                  <button key={cls} onClick={() => onClassChange(cls)} className={`shrink-0 px-2.5 py-1 rounded-lg text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeClass === cls ? 'bg-sky-700 text-white shadow-md' : 'bg-white text-sky-600 border border-sky-100'}`}>{cls}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Topbar;
