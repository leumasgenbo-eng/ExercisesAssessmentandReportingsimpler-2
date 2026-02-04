import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AssessmentType, AppState, AssessmentData, SchoolGroup, ManagementState, Pupil, UserSession, Message, RegisteredSchool } from './types';
import { INITIAL_MANAGEMENT_DATA, createInitialAssessmentData } from './constants';
import AssessmentSheet from './components/Assessments/AssessmentSheet';
import Topbar from './components/Layout/Topbar';
import FacilitatorPanel from './components/Staff/FacilitatorPanel';
import PlanningPanel from './components/Planning/PlanningPanel';
import AdminPanel from './components/Admin/AdminPanel';
import PupilPortal from './components/Pupils/PupilPortal';
import HomeDashboard from './components/Dashboard/HomeDashboard';
import IdentityGateway from './components/Layout/IdentityGateway';
import SuperAdminPortal from './components/Admin/SuperAdminPortal';

type ViewType = 'HOME' | 'ASSESSMENT' | 'FACILITATORS' | 'PLANNING' | 'ADMIN' | 'PUPILS' | 'MESSAGES' | 'SUPER_ADMIN';

const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(null);
  const [activeView, setActiveView] = useState<ViewType>('HOME');
  const [viewHistory, setViewHistory] = useState<ViewType[]>(['HOME']);
  
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
  
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('uba_assessment_v5');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          management: {
            ...INITIAL_MANAGEMENT_DATA,
            ...parsed.management,
            messages: parsed.management.messages || []
          }
        };
      } catch (e) {}
    }
    return { 
      classWork: {}, 
      homeWork: {}, 
      projectWork: {}, 
      criterionWork: {}, 
      bookCountRecords: {},
      management: { ...INITIAL_MANAGEMENT_DATA, messages: [] } 
    };
  });

  useEffect(() => {
    localStorage.setItem('uba_assessment_v5', JSON.stringify(state));
  }, [state]);

  const navigateToView = useCallback((view: ViewType) => {
    setViewHistory(prev => {
      if (prev[prev.length - 1] === view) return prev;
      return [...prev, view];
    });
    setActiveView(view);
  }, []);

  const goBack = useCallback(() => {
    setViewHistory(prev => {
      if (prev.length <= 1) {
        setActiveView('HOME');
        return ['HOME'];
      }
      const newHistory = [...prev];
      newHistory.pop();
      const lastView = newHistory[newHistory.length - 1];
      setActiveView(lastView);
      return newHistory;
    });
  }, []);

  const updateManagementData = useCallback((newData: ManagementState) => {
    setState(prev => ({ ...prev, management: newData }));
  }, []);

  // Contextual Planned Indicators from Broadsheet v9.6.0
  const plannedIndicators = useMemo(() => {
    const activeRoadmaps = state.management.weeklyMappings.filter(m => 
      m.className === activeClass && 
      m.subject === activeSubject && 
      m.week === activeWeek
    );
    const codes = activeRoadmaps.flatMap(r => r.indicators ? r.indicators.split(',').map(s => s.trim()) : []);
    return Array.from(new Set(codes)).filter(c => c !== '');
  }, [state.management.weeklyMappings, activeClass, activeSubject, activeWeek]);

  const sendMessage = (text: string, to: 'ADMIN' | 'FACILITATORS') => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      from: session?.facilitatorName || session?.role || 'User',
      to,
      text,
      timestamp: new Date().toISOString(),
      read: false
    };
    updateManagementData({
      ...state.management,
      messages: [newMessage, ...state.management.messages]
    });
  };

  const handleAuthenticate = (userSession: UserSession, hydratedState?: AppState) => {
    if (hydratedState) {
      setState(hydratedState);
      const settings = hydratedState.management.settings;
      setActiveYear(settings.currentYear);
      setActiveTerm(settings.currentTerm);
      setActiveMonth(settings.activeMonth);
    }
    setSession(userSession);
  };

  const dataKey = `${activeYear}|${activeTerm}|${activeMonth}|${activeWeek}|${activeClass}|${activeSubject}`;
  const activeAssessmentData = useMemo(() => {
    const category = activeTab === 'CLASS' ? state.classWork : activeTab === 'HOME' ? state.homeWork : activeTab === 'PROJECT' ? state.projectWork : state.criterionWork;
    const existing = category[dataKey];
    
    if (!existing) {
      const base = createInitialAssessmentData(activeWeek, activeTab);
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

  if (!session) {
    return (
      <IdentityGateway 
        management={state.management}
        onAuthenticate={handleAuthenticate}
        onSuperAdminTrigger={() => handleAuthenticate({ role: 'super_admin', nodeName: 'MASTER', nodeId: 'GLOBAL' })}
        onRegisterSchool={(school) => updateManagementData({ ...state.management, superAdminRegistry: [...(state.management.superAdminRegistry || []), school] })}
        isSuperAdminAuth={false}
        isGeneratingToken={false}
      />
    );
  }

  if (session.role === 'pupil' && activeView !== 'PUPILS') {
    setActiveView('PUPILS');
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-700 ${isFocusMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {!isFocusMode && (
        <Topbar 
          activeView={activeView} 
          onViewChange={(v) => navigateToView(v as ViewType)} 
          onBack={goBack}
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
          onLogout={() => setSession(null)}
          userRole={session.role}
          isFocusMode={isFocusMode}
        />
      )}

      <main className={`flex-1 transition-all duration-700 ${isFocusMode ? 'pt-0' : 'pt-6 md:pt-10 px-4 md:px-12 pb-24'}`}>
        <div className={`mx-auto transition-all duration-700 ${isFocusMode ? 'max-w-full' : 'max-w-[1500px]'}`}>
          {activeView === 'HOME' && (
            <HomeDashboard 
              fullState={state} 
              onNavigate={(view) => navigateToView(view as ViewType)} 
              userRole={session.role}
              onAnnouncementPost={(text) => updateManagementData({
                ...state.management,
                settings: { ...state.management.settings, announcement: { id: Date.now().toString(), text, timestamp: new Date().toISOString(), active: true } }
              })}
              session={session}
            />
          )}

          {activeView === 'ASSESSMENT' && (
            <div className={`space-y-6 ${isFocusMode ? 'mt-0' : ''}`}>
              {!isFocusMode && (
                <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white flex justify-between items-center shadow-xl no-print">
                   <div className="flex items-center gap-4">
                      <span className="bg-indigo-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">1: Class Assignment/ACTIVITIES</span>
                      <h2 className="text-2xl font-black uppercase tracking-tighter">SCHOOL: {state.management.settings.name} • CLS: ASSESSMENT SHEET</h2>
                   </div>
                </div>
              )}
              <AssessmentSheet 
                type={activeTab} data={activeAssessmentData} 
                onUpdate={(newData) => setState(prev => ({...prev, [activeTab === 'CLASS' ? 'classWork' : activeTab === 'HOME' ? 'homeWork' : activeTab === 'PROJECT' ? 'projectWork' : 'criterionWork']: {...prev[activeTab === 'CLASS' ? 'classWork' : activeTab === 'HOME' ? 'homeWork' : activeTab === 'PROJECT' ? 'projectWork' : 'criterionWork'], [dataKey]: newData}}))} 
                selectedExercise={selectedExercise} onExerciseChange={setSelectedExercise}
                availableIndicators={plannedIndicators} 
                activeSchoolGroup={activeSchoolGroup} 
                managementData={state.management}
                isFocusMode={isFocusMode} setIsFocusMode={setIsFocusMode}
                onYearChange={setActiveYear} onTermChange={setActiveTerm} onMonthChange={setActiveMonth} onWeekChange={setActiveWeek}
                onTabChange={setActiveTab} onSchoolGroupChange={setActiveSchoolGroup} onClassChange={setActiveClass} onSubjectChange={setActiveSubject}
              />
            </div>
          )}

          {activeView === 'PLANNING' && <PlanningPanel data={state.management} onUpdate={updateManagementData} fullAppState={state} />}
          
          {activeView === 'PUPILS' && (
            <PupilPortal 
              fullState={state} 
              onUpdateState={(type, key, data) => setState(prev => ({...prev, [type === 'CLASS' ? 'classWork' : 'homeWork']: {...prev[type === 'CLASS' ? 'classWork' : 'homeWork'], [key]: data}}))}
              isFocusMode={isFocusMode} 
              setIsFocusMode={setIsFocusMode}
              isIndividualOnly={session.role === 'pupil'}
            />
          )}

          {activeView === 'ADMIN' && session.role === 'school_admin' && (
            <AdminPanel 
              data={state.management} 
              fullState={state} 
              onUpdateManagement={updateManagementData} 
              onResetSystem={() => setState({ classWork: {}, homeWork: {}, projectWork: {}, criterionWork: {}, bookCountRecords: {}, management: INITIAL_MANAGEMENT_DATA })}
              onRestoreSystem={setState}
            />
          )}

          {activeView === 'SUPER_ADMIN' && session.role === 'super_admin' && (
            <SuperAdminPortal state={state} onUpdateState={setState} onUpdateManagement={updateManagementData} />
          )}

          {activeView === 'MESSAGES' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in">
              <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-slate-200">
                <h3 className="text-3xl font-black uppercase tracking-tight mb-8">
                  {session.role === 'school_admin' ? 'Message Facilitators' : 'Message School Admin'}
                </h3>
                <textarea 
                  className="w-full bg-slate-50 border-2 border-slate-100 p-8 rounded-[2.5rem] font-bold text-slate-900 outline-none focus:border-indigo-500 transition-all resize-none h-48 shadow-inner"
                  placeholder="Draft your communication node here..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage((e.target as HTMLTextAreaElement).value, session.role === 'school_admin' ? 'FACILITATORS' : 'ADMIN');
                      (e.target as HTMLTextAreaElement).value = '';
                      alert("Message Dispatched Successfully.");
                    }
                  }}
                />
                <div className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Press Enter to Dispatch to {session.role === 'school_admin' ? 'All Staff' : 'Admin Hub'}</div>
              </div>

              <div className="space-y-4">
                {state.management.messages
                  .filter(m => (session.role === 'school_admin' && m.to === 'ADMIN') || (session.role === 'facilitator' && m.to === 'FACILITATORS'))
                  .map(msg => (
                    <div key={msg.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-lg">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-[10px] font-black text-indigo-600 uppercase">Origin: {msg.from}</span>
                        <span className="text-[9px] font-bold text-slate-300 uppercase">{new Date(msg.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-base font-bold text-slate-700 leading-relaxed italic">"{msg.text}"</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {!isFocusMode && (
        <footer className="no-print py-6 px-12 bg-white/80 backdrop-blur-md border-t border-slate-200 flex justify-between items-center z-50">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.4em]">SSMAP Core v9.6.0 • Secured Session</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Active Identity: {session.role}</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;