import React from 'react';
import { AssessmentType, SchoolGroup, UserRole } from '../../types';
import { SCHOOL_HIERARCHY, WEEK_COUNT } from '../../constants';

interface TopbarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onBack?: () => void;
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
  userRole: UserRole;
  isFocusMode?: boolean;
}

const Topbar: React.FC<TopbarProps> = ({ 
  activeView, onViewChange, onBack, activeTab, onTabChange, activeSchoolGroup, 
  onSchoolGroupChange, activeClass, onClassChange, activeTerm, onTermChange, 
  activeWeek, onWeekChange, onLogout, userRole, isFocusMode = false
}) => {
  if (isFocusMode) return null;

  const getPortalOptions = () => {
    switch(userRole) {
      case 'super_admin':
        return [{ id: 'SUPER_ADMIN', label: 'Global Registry', icon: '🌍' }];
      case 'school_admin':
        return [
          { id: 'HOME', label: 'Home', icon: '🏠' },
          { id: 'ASSESSMENT', label: 'Assess', icon: '📝' },
          { id: 'PLANNING', label: 'Plan', icon: '📅' },
          { id: 'PUPILS', label: 'Pupils', icon: '🎓' },
          { id: 'MESSAGES', label: 'Messages', icon: '💬' },
          { id: 'ADMIN', label: 'Identity', icon: '⚙️' }
        ];
      case 'facilitator':
        return [
          { id: 'HOME', label: 'Home', icon: '🏠' },
          { id: 'ASSESSMENT', label: 'Assess', icon: '📝' },
          { id: 'PLANNING', label: 'Plan', icon: '📅' },
          { id: 'MESSAGES', label: 'Support', icon: '💬' }
        ];
      case 'pupil':
        return [{ id: 'PUPILS', label: 'My Performance', icon: '📊' }];
      default:
        return [];
    }
  };

  const handleNavWeek = (dir: 'prev' | 'next') => {
    const current = parseInt(activeWeek);
    if (dir === 'prev' && current > 1) onWeekChange((current - 1).toString());
    if (dir === 'next' && current < WEEK_COUNT) onWeekChange((current + 1).toString());
  };

  const options = getPortalOptions();

  return (
    <header className="no-print sticky top-0 z-[110] animate-in">
      <div className={`bg-slate-950 text-white shadow-xl border-b border-white/5`}>
        <div className="max-w-[1500px] mx-auto px-4 h-16 flex justify-between items-center gap-1">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center justify-center w-12 h-12 bg-white/10 rounded-2xl cursor-pointer hover:bg-white/20 transition-all shrink-0 shadow-lg" onClick={() => onViewChange('HOME')}>
              <span className="text-2xl">🏛️</span>
            </div>

            {activeView !== 'HOME' && activeView !== 'SUPER_ADMIN' && userRole !== 'pupil' && (
              <button onClick={onBack} className="flex items-center justify-center w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl shrink-0 border border-white/10 transition-all">
                <span className="text-lg">⬅️</span>
              </button>
            )}
            
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide py-1 ml-4">
              {options.map((p) => (
                <button 
                  key={p.id}
                  onClick={() => onViewChange(p.id)}
                  className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 shrink-0 transition-all select-none ${
                    activeView === p.id ? 'bg-white text-slate-950 shadow-2xl scale-105' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{p.icon}</span>
                  <span className={`${activeView === p.id ? 'inline' : 'hidden sm:inline'}`}>{p.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 shrink-0">
             {userRole !== 'pupil' && (
               <>
                 <div className="hidden md:flex bg-white/5 px-4 py-2 rounded-xl items-center gap-3 border border-white/10">
                    <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest">Term</span>
                    <select className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer" value={activeTerm} onChange={(e) => onTermChange(e.target.value)}>
                       {["1ST TERM", "2ND TERM", "3RD TERM"].map(t => <option key={t} value={t} className="text-slate-900">{t}</option>)}
                    </select>
                 </div>
                 
                 <div className="bg-white/5 px-2 py-1 rounded-xl flex items-center gap-2 border border-white/10">
                    <button onClick={() => handleNavWeek('prev')} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="flex flex-col items-center">
                      <span className="text-[7px] font-black text-sky-400 uppercase leading-none">Week</span>
                      <select className="bg-transparent text-[10px] font-black text-white outline-none cursor-pointer" value={activeWeek} onChange={(e) => onWeekChange(e.target.value)}>
                        {Array.from({ length: WEEK_COUNT }, (_, i) => (i + 1).toString()).map(w => <option key={w} value={w} className="text-slate-900">{w}</option>)}
                      </select>
                    </div>
                    <button onClick={() => handleNavWeek('next')} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-lg text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                    </button>
                 </div>
               </>
             )}

             <button onClick={onLogout} className="bg-rose-500 text-white px-6 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-950/40 hover:bg-rose-600 active:scale-95">
                Log Out
             </button>
          </div>
        </div>
      </div>

      {activeView === 'ASSESSMENT' && (
        <div className="bg-white border-b border-slate-200 shadow-2xl">
          <div className="max-w-[1500px] mx-auto px-6 pt-4 pb-3 flex flex-col gap-4">
            <div className="flex bg-slate-100 p-1.5 rounded-2xl shrink-0 overflow-x-auto scrollbar-hide">
              {(['CLASS', 'HOME', 'PROJECT', 'CRITERION'] as AssessmentType[]).map(tab => (
                <button 
                  key={tab} 
                  onClick={() => onTabChange(tab)}
                  className={`flex-1 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                    activeTab === tab ? `bg-slate-950 text-white shadow-xl` : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {Object.entries(SCHOOL_HIERARCHY).map(([key, group]) => (
                <button 
                  key={key} 
                  onClick={() => { onSchoolGroupChange(key as SchoolGroup); onClassChange(group.classes[0]); }}
                  className={`shrink-0 px-5 py-2 rounded-full text-[9px] font-black uppercase border-2 transition-all ${
                    activeSchoolGroup === key 
                    ? `bg-indigo-600 border-indigo-600 text-white shadow-lg` 
                    : `bg-white border-slate-100 text-slate-300 hover:border-slate-200 hover:text-slate-500`
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-[2rem] border border-slate-100 overflow-x-auto scrollbar-hide mb-2">
                {SCHOOL_HIERARCHY[activeSchoolGroup].classes.map(cls => (
                  <button 
                    key={cls} 
                    onClick={() => onClassChange(cls)}
                    className={`shrink-0 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase border-2 transition-all ${
                      activeClass === cls 
                      ? 'bg-white border-slate-950 text-slate-950 shadow-md scale-105' 
                      : 'bg-transparent border-transparent text-slate-300 hover:text-slate-500'
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