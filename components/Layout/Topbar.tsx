import React, { useState, useRef, useEffect } from 'react';
import { AssessmentType, SchoolGroup, UserRole } from '../../types';
import { SCHOOL_HIERARCHY, WEEK_COUNT, ACADEMIC_YEAR_RANGE } from '../../constants';

interface TopbarProps {
  activeView: 'ASSESSMENT' | 'FACILITATORS' | 'PLANNING' | 'ADMIN' | 'PUPILS';
  onViewChange: (view: string) => void;
  activeTab: AssessmentType;
  onTabChange: (tab: AssessmentType) => void;
  activeSchoolGroup: SchoolGroup;
  onSchoolGroupChange: (group: SchoolGroup) => void;
  activeClass: string;
  onClassChange: (className: string) => void;
  activeYear: string;
  onYearChange: (year: string) => void;
  activeTerm: string;
  onTermChange: (term: string) => void;
  activeMonth: string;
  onMonthChange: (month: string) => void;
  activeWeek: string;
  onWeekChange: (week: string) => void;
  onPrint: () => void;
  onLogout: () => void;
  isFocusMode?: boolean;
  isAdminUnlocked?: boolean; 
  isInstitutionalized?: boolean;
  userRole?: UserRole;
}

const Topbar: React.FC<TopbarProps> = ({ 
  activeView, onViewChange, activeTab, onTabChange, activeSchoolGroup, 
  onSchoolGroupChange, activeClass, onClassChange, activeYear, onYearChange,
  activeTerm, onTermChange, activeMonth, onMonthChange, activeWeek, onWeekChange,
  onPrint, isFocusMode = false
}) => {
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const yearScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isYearPickerOpen && yearScrollRef.current) {
      const index = ACADEMIC_YEAR_RANGE.indexOf(activeYear);
      if (index !== -1) {
        yearScrollRef.current.scrollTop = index * 48;
      }
    }
  }, [isYearPickerOpen, activeYear]);

  const handleYearScroll = () => {
    if (yearScrollRef.current) {
      const index = Math.round(yearScrollRef.current.scrollTop / 48);
      if (ACADEMIC_YEAR_RANGE[index] && ACADEMIC_YEAR_RANGE[index] !== activeYear) {
        onYearChange(ACADEMIC_YEAR_RANGE[index]);
      }
    }
  };

  if (isFocusMode) return null;

  const getStageColor = (group: string) => {
    switch(group) {
      case 'DAYCARE': return 'bg-rose-600 border-rose-600';
      case 'KINDERGARTEN': return 'bg-amber-50 border-amber-500';
      case 'LOWER_BASIC': return 'bg-sky-600 border-sky-600';
      case 'UPPER_BASIC': return 'bg-indigo-600 border-indigo-600';
      case 'JHS': return 'bg-slate-800 border-slate-800';
      default: return 'bg-slate-600 border-slate-600';
    }
  };

  const portalOptions = [
    { id: 'ASSESSMENT', label: 'Assess', icon: '📝' },
    { id: 'PUPILS', label: 'Pupil', icon: '🎓' },
    { id: 'PLANNING', label: 'Plan', icon: '📅' },
    { id: 'FACILITATORS', label: 'Staff', icon: '👨‍🏫' },
    { id: 'ADMIN', label: 'Admin', icon: '⚙️' },
    { id: 'DRIVE', label: 'Drive', icon: '☁️', url: 'https://ai.studio/apps/drive/12_hFsiSfEl86pBuqsuoH-RBtgvymEJ-p', isExternal: true }
  ];

  return (
    <header className="no-print sticky top-0 z-[110] animate-in">
      <div className="bg-sky-950 text-white shadow-xl">
        <div className="max-w-[1500px] mx-auto px-2 md:px-4 h-14 flex justify-between items-center gap-1">
          <div className="flex items-center gap-1 md:gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-8 h-8 md:w-11 md:h-11 bg-white/10 rounded-lg cursor-pointer shrink-0" onClick={() => onViewChange('ASSESSMENT')}>
              <span className="text-base md:text-xl">🏛️</span>
            </div>
            
            <nav className="flex gap-0.5 overflow-x-auto scrollbar-hide py-1">
              {portalOptions.map((p) => (
                <button 
                  key={p.id}
                  onClick={() => {
                    if (p.isExternal && p.url) {
                      window.open(p.url, '_blank');
                    } else {
                      onViewChange(p.id as any);
                    }
                  }}
                  className={`px-2 md:px-5 py-1.5 md:py-2 text-[8px] md:text-[10px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 shrink-0 transition-all select-none ${
                    activeView === p.id ? 'bg-white text-sky-950 shadow-lg' : 'text-sky-300 hover:text-white'
                  } ${p.isExternal ? 'border border-sky-400/30 bg-sky-900/40' : ''}`}
                >
                  <span className="text-[10px] md:text-xs">{p.icon}</span>
                  <span className={`${activeView === p.id ? 'inline' : 'hidden sm:inline'}`}>{p.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1 shrink-0">
             <button 
               onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
               className={`bg-white/10 px-2 py-1 rounded-lg flex flex-col items-center justify-center border transition-all ${isYearPickerOpen ? 'border-sky-400 bg-white/20' : 'border-white/10'}`}
             >
                <span className="text-[6px] font-black text-sky-400 uppercase leading-none mb-0.5">Year</span>
                <span className="text-[8px] md:text-[9px] font-black text-white leading-none">{activeYear}</span>
             </button>

             {isYearPickerOpen && (
               <>
                 <div className="fixed inset-0 z-[120]" onClick={() => setIsYearPickerOpen(false)}></div>
                 <div className="absolute top-12 right-4 z-[130] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden w-28 animate-in slide-in-from-top-2">
                    <div className="relative h-32 bg-slate-50 shadow-inner">
                       <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-white via-white/40 to-transparent z-10 pointer-events-none"></div>
                       <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white via-white/40 to-transparent z-10 pointer-events-none"></div>
                       <div className="absolute top-10 left-1 right-1 h-10 border-y-2 border-indigo-600/30 bg-indigo-50/50 rounded-lg pointer-events-none"></div>
                       <div 
                         ref={yearScrollRef}
                         onScroll={handleYearScroll}
                         className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-hide py-10"
                       >
                         {ACADEMIC_YEAR_RANGE.map((y) => (
                           <div key={y} className={`h-10 flex items-center justify-center snap-center transition-all ${activeYear === y ? 'font-black text-indigo-600' : 'opacity-20 text-slate-400'}`}>
                             <span className="text-[10px] uppercase">{y}</span>
                           </div>
                         ))}
                       </div>
                    </div>
                    <button onClick={() => setIsYearPickerOpen(false)} className="w-full py-1.5 bg-indigo-600 text-white text-[8px] font-black uppercase tracking-widest">Set</button>
                 </div>
               </>
             )}

             <div className="hidden md:flex bg-white/10 px-2 py-1 rounded-lg items-center gap-1 border border-white/10">
                <span className="text-[7px] font-black text-sky-400 uppercase">Term</span>
                <select className="bg-transparent text-[9px] font-black text-white outline-none cursor-pointer" value={activeTerm} onChange={(e) => onTermChange(e.target.value)}>
                   {["1ST TERM", "2ND TERM", "3RD TERM"].map(t => <option key={t} value={t} className="text-sky-950">{t}</option>)}
                </select>
             </div>
             
             <div className="bg-white/10 px-1.5 py-1 rounded-lg flex items-center gap-1 border border-white/10">
                <span className="text-[7px] font-black text-sky-400 uppercase">Wk</span>
                <select className="bg-transparent text-[9px] font-black text-white outline-none cursor-pointer" value={activeWeek} onChange={(e) => onWeekChange(e.target.value)}>
                  {Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()).map(w => <option key={w} value={w} className="text-sky-950">{w}</option>)}
                </select>
             </div>

             <button onClick={onPrint} className="bg-slate-800 hover:bg-indigo-600 text-white p-2 rounded-lg transition-all group">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4" /></svg>
             </button>
          </div>
        </div>
      </div>

      {activeView === 'ASSESSMENT' && (
        <div className="bg-white border-b border-slate-200 shadow-md">
          <div className="max-w-[1500px] mx-auto px-2 pt-2 flex flex-col gap-2">
            <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto scrollbar-hide">
              {(['CLASS', 'HOME', 'PROJECT', 'CRITERION'] as AssessmentType[]).map(tab => (
                <button 
                  key={tab} 
                  onClick={() => onTabChange(tab)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-tighter transition-all shrink-0 ${
                    activeTab === tab 
                      ? `${tab === 'HOME' ? 'bg-emerald-600' : tab === 'PROJECT' ? 'bg-amber-500' : tab === 'CRITERION' ? 'bg-rose-600' : 'bg-indigo-600'} text-white shadow-sm` 
                      : 'text-slate-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex gap-1 overflow-x-auto scrollbar-hide py-0.5">
              {Object.entries(SCHOOL_HIERARCHY).map(([key, group]) => (
                <button 
                  key={key} 
                  onClick={() => { onSchoolGroupChange(key as SchoolGroup); onClassChange(group.classes[0]); }}
                  className={`shrink-0 px-2 py-1 rounded-lg text-[7px] md:text-[8px] font-black uppercase border transition-all ${
                    activeSchoolGroup === key 
                    ? `${getStageColor(key)} text-white shadow-sm border-transparent` 
                    : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  {group.label.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-100 overflow-x-auto scrollbar-hide mb-2">
                {SCHOOL_HIERARCHY[activeSchoolGroup].classes.map(cls => (
                  <button 
                    key={cls} 
                    onClick={() => onClassChange(cls)}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[8px] md:text-[9px] font-black uppercase border transition-all ${
                      activeClass === cls 
                      ? 'bg-slate-800 border-slate-800 text-white shadow-sm' 
                      : 'bg-white border-slate-100 text-slate-400'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Topbar;