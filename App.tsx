import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AssessmentType, AppState, AssessmentData, SchoolGroup, ManagementState, UserSession, RegisteredSchool, Pupil } from './types';
import { INITIAL_MANAGEMENT_DATA, createInitialAssessmentData, SUPER_ADMIN_EMAIL, SUPER_ADMIN_CONTACT } from './constants';
import AssessmentSheet from './components/Assessments/AssessmentSheet';
import Topbar from './components/Layout/Topbar';
import FacilitatorPanel from './components/Staff/FacilitatorPanel';
import PlanningPanel from './components/Planning/PlanningPanel';
import AdminPanel from './components/Admin/AdminPanel';
import PupilPortal from './components/Pupils/PupilPortal';
import IdentityGateway from './components/Layout/IdentityGateway';

type ViewType = 'ASSESSMENT' | 'FACILITATORS' | 'PLANNING' | 'ADMIN' | 'PUPILS';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('ASSESSMENT');
  const [activeTab, setActiveTab] = useState<AssessmentType>('CLASS');
  const [activeSchoolGroup, setActiveSchoolGroup] = useState<SchoolGroup>('LOWER_BASIC');
  const [activeClass, setActiveClass] = useState<string>('Basic 1A');
  const [activeSubject, setActiveSubject] = useState<string>('');
  
  const [activeYear, setActiveYear] = useState<string>("2024/2025");
  const [activeTerm, setActiveTerm] = useState<string>("1ST TERM");
  const [activeMonth, setActiveMonth] = useState<string>("MONTH 1");
  const [activeWeek, setActiveWeek] = useState<string>("1");

  const [selectedExercise, setSelectedExercise] = useState<number[] | 'ALL'>('ALL');
  const [isFocusMode, setIsFocusMode] = useState(false);
  
  // CONNECTIVITY & SYNC STATE
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingSyncKeys, setPendingSyncKeys] = useState<string[]>(() => {
    const saved = localStorage.getItem('uba_sync_queue');
    return saved ? JSON.parse(saved) : [];
  });

  // SESSION & SECURITY STATE
  const [session, setSession] = useState<UserSession | null>(null);
  const [isSuperAdminAuth, setIsSuperAdminAuth] = useState(false);
  const [showOtpGate, setShowOtpGate] = useState(false);
  const [currentOtp, setCurrentOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<'IDLE' | 'SENDING' | 'SENT'>('IDLE');

  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('uba_assessment_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          bookCountRecords: parsed.bookCountRecords || {}
        };
      } catch (e) {}
    }
    return { 
      classWork: {}, 
      homeWork: {}, 
      projectWork: {}, 
      criterionWork: {}, 
      bookCountRecords: {},
      management: { ...INITIAL_MANAGEMENT_DATA } 
    };
  });

  // Sync state and pending keys to localStorage
  useEffect(() => {
    localStorage.setItem('uba_assessment_v3', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    localStorage.setItem('uba_sync_queue', JSON.stringify(pendingSyncKeys));
  }, [pendingSyncKeys]);

  // Listener for browser connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerSyncHandshake();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if (navigator.onLine && pendingSyncKeys.length > 0) {
      triggerSyncHandshake();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerSyncHandshake = useCallback(() => {
    if (pendingSyncKeys.length === 0) return;
    setIsSyncing(true);
    setTimeout(() => {
      console.log(`📡 SYNC SUCCESS: Secured ${pendingSyncKeys.length} items to Matrix Intelligence.`);
      setPendingSyncKeys([]);
      setIsSyncing(false);
    }, 2500);
  }, [pendingSyncKeys]);

  useEffect(() => {
    setActiveYear(state.management.settings.currentYear);
    setActiveTerm(state.management.settings.currentTerm);
    setActiveMonth(state.management.settings.activeMonth || "MONTH 1");
  }, [state.management.settings]);

  const onExerciseChange = useCallback((ex: number[] | 'ALL') => {
    setSelectedExercise(ex);
  }, []);

  useEffect(() => {
    setSelectedExercise('ALL');
  }, [activeTab]);

  const availableIndicators = useMemo(() => {
    const activePlans = state.management.weeklyMappings.filter(wm => 
      wm.className === activeClass && 
      wm.subject === activeSubject && 
      wm.week === activeWeek
    );
    
    const indicators: string[] = [];
    activePlans.forEach(plan => {
      if (plan.indicators) {
        const parts = plan.indicators.split(/[,\.;\n]+/).map(i => i.trim()).filter(i => i);
        indicators.push(...parts);
      }
    });
    
    if (indicators.length === 0) {
      state.management.curriculum.forEach(strand => 
        strand.substrands.forEach(ss => indicators.push(...ss.indicators))
      );
    }

    return Array.from(new Set(indicators)).sort();
  }, [state.management.weeklyMappings, state.management.curriculum, activeClass, activeSubject, activeWeek]);

  const updateAssessmentData = useCallback((type: AssessmentType, key: string, newData: AssessmentData) => {
    setState(prev => {
      const stateKey = type === 'CLASS' ? 'classWork' : type === 'HOME' ? 'homeWork' : type === 'PROJECT' ? 'projectWork' : 'criterionWork';
      return { ...prev, [stateKey]: { ...prev[stateKey], [key]: newData } };
    });
    setPendingSyncKeys(prev => prev.includes(key) ? prev : [...prev, key]);
  }, []);

  const updateBookCountRecord = useCallback((key: string, data: { count: number; date: string; enrollment?: number }) => {
    setState(prev => ({
      ...prev,
      bookCountRecords: { ...prev.bookCountRecords, [key]: data }
    }));
    setPendingSyncKeys(prev => prev.includes(key) ? prev : [...prev, key]);
  }, []);

  const updateManagementData = useCallback((newData: ManagementState) => {
    setState(prev => ({ ...prev, management: newData }));
    setPendingSyncKeys(prev => prev.includes('MANAGEMENT_CONFIG') ? prev : [...prev, 'MANAGEMENT_CONFIG']);
  }, []);

  const handleRegisterSchool = (newSchool: RegisteredSchool) => {
    setState(prev => ({
      ...prev,
      management: {
        ...prev.management,
        superAdminRegistry: [...(prev.management.superAdminRegistry || []), newSchool]
      }
    }));
  };

  const resetSystem = useCallback(() => {
    if (confirm("ERASE ALL SYSTEM DATA?")) {
      setState({ 
        classWork: {}, 
        homeWork: {}, 
        projectWork: {}, 
        criterionWork: {}, 
        bookCountRecords: {},
        management: { ...INITIAL_MANAGEMENT_DATA } 
      });
      setPendingSyncKeys([]);
      setIsSuperAdminAuth(false);
      setSession(null);
      setActiveView('ASSESSMENT');
    }
  }, []);

  const restoreSystem = useCallback((newState: AppState) => { setState(newState); }, []);

  const handleLogout = useCallback(() => {
    if (confirm("Terminate authorized session?")) {
      setSession(null);
      setIsSuperAdminAuth(false);
      setActiveView('ASSESSMENT');
    }
  }, []);

  const handleSuperAdminPrompt = () => {
    if (isSuperAdminAuth) {
      handleLogout();
      return;
    }
    setIsGeneratingToken(true);
    setDispatchStatus('SENDING');
    setTimeout(() => {
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setCurrentOtp(newOtp);
      setDispatchStatus('SENT');
      console.group("📡 SSMAP_MATRIX_INTELLIGENCE: SECURE PAYLOAD DISPATCHED");
      console.log(`%cVERIFICATION_TOKEN: %c${newOtp}`, "color: #6366f1; font-weight: bold;", "background: #6366f1; color: white; padding: 2px 8px; border-radius: 4px; font-weight: black;");
      console.groupEnd();
      setTimeout(() => {
        setShowOtpGate(true);
        setOtpInput('');
        setIsGeneratingToken(false);
        setDispatchStatus('IDLE');
      }, 800);
    }, 1500);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput === currentOtp) {
      setIsSuperAdminAuth(true);
      setShowOtpGate(false);
      setActiveView('ADMIN');
    } else {
      alert("Invalid security token. Access Denied.");
      setOtpInput('');
    }
  };

  const dataKey = `${activeYear}|${activeTerm}|${activeMonth}|${activeWeek}|${activeClass}|${activeSubject}`;
  const activeAssessmentData = useMemo(() => {
    const category = activeTab === 'CLASS' ? state.classWork : activeTab === 'HOME' ? state.homeWork : activeTab === 'PROJECT' ? state.projectWork : state.criterionWork;
    const existing = category[dataKey];
    
    if (!existing) {
      const base = createInitialAssessmentData(activeWeek, activeTab);
      // Pre-populate with pupils from Registry if it's a new sheet
      const masterList = state.management.masterPupils?.[activeClass] || [];
      const initialPupils: Pupil[] = masterList.map((m, idx) => ({
        id: `m-${idx}-${Date.now()}`,
        name: m.name,
        gender: m.gender,
        studentId: m.studentId,
        bookOpen: true,
        scores: {},
        interventions: []
      }));
      
      return { 
        ...base, 
        year: activeYear, 
        term: activeTerm, 
        month: activeMonth, 
        className: activeClass, 
        subject: activeSubject,
        pupils: initialPupils
      };
    }
    return existing;
  }, [activeTab, dataKey, state, activeClass, activeSubject, activeWeek, activeYear, activeTerm, activeMonth]);

  const getTabBgColor = () => {
    if (isFocusMode) return 'bg-slate-950';
    if (activeView !== 'ASSESSMENT') return 'bg-slate-50';
    switch (activeTab) {
      case 'HOME': return 'bg-emerald-50/50';
      case 'PROJECT': return 'bg-amber-50/50';
      case 'CRITERION': return 'bg-rose-50/50';
      default: return 'bg-slate-50';
    }
  };

  const isInstitutionalized = !!state.management.settings.institutionalId;
  const isAuthGatewayVisible = !isSuperAdminAuth && isInstitutionalized && !session;

  return (
    <div className={`min-h-screen relative flex flex-col font-sans transition-colors duration-700 ${getTabBgColor()}`}>
      {!isOnline && (
        <div className="no-print sticky top-0 z-[100] bg-amber-500 text-white py-2 px-4 text-center text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 animate-pulse shadow-md">
           <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
           OFFLINE MODE: Changes cached locally • {pendingSyncKeys.length} items awaiting sync
        </div>
      )}
      {isSyncing && (
        <div className="no-print sticky top-0 z-[100] bg-indigo-600 text-white py-2 px-4 text-center text-[9px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3 shadow-md">
           <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
           SYNCING: Securing academic roadmap to cloud...
        </div>
      )}

      {isAuthGatewayVisible ? (
        <IdentityGateway 
          management={state.management} 
          onAuthenticate={setSession} 
          onSuperAdminTrigger={handleSuperAdminPrompt}
          onRegisterSchool={handleRegisterSchool}
          isSuperAdminAuth={isSuperAdminAuth}
          isGeneratingToken={isGeneratingToken}
        />
      ) : (
        <>
          <Topbar 
            activeView={activeView} 
            onViewChange={(v) => setActiveView(v as ViewType)} 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            activeSchoolGroup={activeSchoolGroup} 
            onSchoolGroupChange={setActiveSchoolGroup} 
            activeClass={activeClass} 
            onClassChange={setActiveClass} 
            activeYear={activeYear}
            onYearChange={setActiveYear}
            activeTerm={activeTerm}
            onTermChange={setActiveTerm}
            activeMonth={activeMonth}
            onMonthChange={setActiveMonth}
            activeWeek={activeWeek} 
            onWeekChange={setActiveWeek} 
            onPrint={() => window.print()}
            onLogout={handleLogout}
            isFocusMode={isFocusMode}
            isAdminUnlocked={isSuperAdminAuth} 
            isInstitutionalized={isInstitutionalized}
            userRole={isSuperAdminAuth ? 'SUPER_ADMIN' : session?.role || 'GUEST'}
          />
          <main className={`flex-1 relative z-10 transition-all duration-700 ${isFocusMode ? 'pt-0' : 'pt-6 md:pt-10 px-4 md:px-12'}`}>
            <div className={`mx-auto transition-all duration-700 ${isFocusMode ? 'max-w-full' : 'max-w-[1500px]'}`}>
              {activeView === 'ASSESSMENT' && (
                <div className="animate-in">
                  {!isFocusMode && (
                    <div className="mb-4 no-print flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-[2rem] shadow-sm">
                      <div className="flex items-center gap-4">
                        <span className={`text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                          activeTab === 'HOME' ? 'bg-emerald-600' : activeTab === 'PROJECT' ? 'bg-amber-500' : activeTab === 'CRITERION' ? 'bg-rose-600' : 'bg-sky-950'
                        }`}>{activeTab} ENTRY</span>
                        <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">{activeClass}</h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black border transition-colors ${isOnline ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          <span className={`w-1.5 h-1.5 ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'} rounded-full animate-pulse`}></span>
                          {isOnline ? 'CLOUD SYNC ACTIVE' : 'OFFLINE STORAGE'}
                        </div>
                      </div>
                    </div>
                  )}
                  <div id={`assessment-sheet-${activeTab}`} className={`transition-all duration-700 ${isFocusMode ? '' : 'bg-white shadow-xl rounded-[2.5rem] border border-slate-200 overflow-hidden'}`}>
                    <AssessmentSheet 
                      type={activeTab} data={activeAssessmentData} 
                      onUpdate={(newData) => { if (newData.subject !== activeSubject) setActiveSubject(newData.subject || ''); updateAssessmentData(activeTab, dataKey, newData); }} 
                      selectedExercise={selectedExercise} onExerciseChange={onExerciseChange}
                      availableIndicators={availableIndicators} activeSchoolGroup={activeSchoolGroup} managementData={state.management}
                      isFocusMode={isFocusMode} setIsFocusMode={setIsFocusMode}
                      onYearChange={setActiveYear} onTermChange={setActiveTerm} onMonthChange={setActiveMonth} onWeekChange={setActiveWeek}
                      onTabChange={setActiveTab} onSchoolGroupChange={setActiveSchoolGroup} onClassChange={setActiveClass} onSubjectChange={setActiveSubject}
                    />
                  </div>
                </div>
              )}
              {activeView === 'FACILITATORS' && (isSuperAdminAuth || session?.role === 'SCHOOL_ADMIN') && <FacilitatorPanel data={state.management} onUpdate={updateManagementData} fullAppState={state} />}
              {activeView === 'PLANNING' && <PlanningPanel data={state.management} onUpdate={updateManagementData} fullAppState={state} />}
              {activeView === 'ADMIN' && (isSuperAdminAuth || session?.role === 'SCHOOL_ADMIN') && (
                <AdminPanel 
                  data={state.management} fullState={state} onUpdateManagement={updateManagementData} 
                  onResetSystem={resetSystem} onRestoreSystem={restoreSystem} isSuperAdminAuthenticated={isSuperAdminAuth}
                />
              )}
              {activeView === 'PUPILS' && (
                <PupilPortal 
                  fullState={state} onUpdateState={updateAssessmentData} onUpdateBookCounts={updateBookCountRecord}
                  isFocusMode={isFocusMode} setIsFocusMode={setIsFocusMode}
                />
              )}
            </div>
          </main>
          {!isFocusMode && (
            <footer className="no-print mt-10 pt-6 pb-12 md:pb-8 border-t border-slate-200 bg-white">
              <div className="max-w-7xl mx-auto px-6 text-center flex flex-col items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleSuperAdminPrompt} disabled={isGeneratingToken}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-500 hover:scale-150 shadow-md cursor-pointer ${
                        isSuperAdminAuth ? 'bg-indigo-600 shadow-indigo-300 animate-pulse scale-110' : isInstitutionalized ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                      }`}
                      title="Super Admin Identity Gateway"
                    ></button>
                    <p className="text-[9px] text-slate-500 font-black tracking-widest uppercase">Institutional Node Core v7.4.2 • {isOnline ? 'Online Sync' : 'Local Offline Storage'}</p>
                  </div>
                </div>
              </div>
            </footer>
          )}
        </>
      )}
      {isGeneratingToken && dispatchStatus === 'SENDING' && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in">
           <div className="text-center">
              <div className="w-20 h-20 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-6 shadow-[0_0_20px_rgba(56,189,248,0.3)]"></div>
              <h4 className="text-xl font-black text-white uppercase tracking-tighter">Initializing Dispatch</h4>
           </div>
        </div>
      )}
      {showOtpGate && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/98 backdrop-blur-3xl animate-in fade-in">
           <div className="bg-white rounded-[3.5rem] p-10 md:p-14 w-full max-w-md shadow-2xl border-4 border-indigo-600 relative overflow-hidden text-center">
              <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner ring-4 ring-indigo-50/50">🔒</div>
              <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">Super Admin Gate</h4>
              <form onSubmit={handleVerifyOtp} className="space-y-8 mt-10">
                 <input type="text" maxLength={6} value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] text-center text-4xl font-black tracking-[0.4em] text-indigo-950 focus:border-indigo-600 outline-none transition-all shadow-inner" placeholder="••••••" autoFocus />
                 <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setShowOtpGate(false)} className="py-5 border-2 border-slate-100 text-slate-400 rounded-[1.8rem] font-black uppercase text-[11px] tracking-widest hover:bg-slate-50 transition-all">Abort</button>
                    <button type="submit" className="py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-indigo-700 transition-all">Verify Identity</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;