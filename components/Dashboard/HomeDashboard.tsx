import React, { useMemo } from 'react';
import { AppState, MasterPupilEntry } from '../../types';
import { SCHOOL_NAME } from '../../constants';

interface HomeDashboardProps {
  fullState: AppState;
  onNavigate: (view: string) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ fullState, onNavigate }) => {
  const settings = fullState.management.settings;
  const staffCount = fullState.management.staff.length;
  
  const totalPupils = useMemo(() => {
    return Object.values(fullState.management.masterPupils || {}).reduce(
      // Added explicit type 'number' to 'acc' to fix "Operator '+' cannot be applied to types 'unknown' and 'number'" error
      (acc: number, curr) => acc + (curr as MasterPupilEntry[]).length, 
      0
    );
  }, [fullState.management.masterPupils]);

  const activeAssessmentsCount = useMemo(() => {
    return Object.keys(fullState.classWork).length + 
           Object.keys(fullState.homeWork).length + 
           Object.keys(fullState.projectWork).length;
  }, [fullState.classWork, fullState.homeWork, fullState.projectWork]);

  const stats = [
    { label: 'Total Pupils', value: totalPupils, icon: '🎓', color: 'bg-blue-500' },
    { label: 'Facilitators', value: staffCount, icon: '👨‍🏫', color: 'bg-indigo-500' },
    { label: 'Active Logs', value: activeAssessmentsCount, icon: '📝', color: 'bg-emerald-500' },
    { label: 'Compliance', value: `${(settings.complianceThreshold * 100).toFixed(0)}%`, icon: '⚖️', color: 'bg-amber-500' },
  ];

  const quickActions = [
    { id: 'ASSESSMENT', label: 'Assessments', desc: 'Log scores and activities', icon: '📝', color: 'border-blue-200 hover:bg-blue-50' },
    { id: 'PUPILS', label: 'Pupil Portal', desc: 'Registry and interventions', icon: '🎓', color: 'border-indigo-200 hover:bg-indigo-50' },
    { id: 'PLANNING', label: 'Planning', desc: 'Curriculum broadsheets', icon: '📅', color: 'border-emerald-200 hover:bg-emerald-50' },
    { id: 'FACILITATORS', label: 'Staff Hub', desc: 'Duty mapping and rosters', icon: '👨‍🏫', color: 'border-amber-200 hover:bg-amber-50' },
  ];

  return (
    <div className="animate-in space-y-10 pb-20 max-w-6xl mx-auto px-4">
      {/* Welcome Hero */}
      <div className="bg-sky-950 rounded-[3rem] p-10 md:p-16 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-400/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
             <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-inner border border-white/5">🏛️</div>
             <div>
                <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-1">
                  {settings.name || SCHOOL_NAME}
                </h1>
                <p className="text-sky-300 font-bold uppercase tracking-[0.4em] text-[10px] md:text-xs opacity-70">
                  {settings.slogan || "Knowledge is Power"}
                </p>
             </div>
          </div>
          
          <div className="max-w-2xl">
             <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight mb-4">Institutional Command Center</h2>
             <p className="text-sky-100/60 text-xs md:text-sm font-medium leading-relaxed uppercase tracking-widest">
               Centralized node for managing academic rigor, facilitator accountability, and learner progression.
             </p>
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
             <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                <span className="text-[10px] font-black text-sky-400 uppercase">Active Year</span>
                <span className="font-black text-white">{settings.currentYear}</span>
             </div>
             <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
                <span className="text-[10px] font-black text-sky-400 uppercase">Active Term</span>
                <span className="font-black text-white">{settings.currentTerm}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col items-center text-center group hover:scale-[1.02] transition-all">
             <div className={`w-14 h-14 ${s.color} text-white rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-lg`}>
               {s.icon}
             </div>
             <span className="text-3xl font-black text-slate-900 mb-1">{s.value}</span>
             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Main Sections Navigation */}
      <div className="space-y-6">
         <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.5em] ml-2">Quick Navigation Hub</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => (
              <button 
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className={`p-8 rounded-[3rem] bg-white border-2 ${action.color} text-left transition-all shadow-lg flex flex-col gap-4 group`}
              >
                <div className="text-4xl group-hover:scale-110 transition-transform duration-300">{action.icon}</div>
                <div>
                   <h4 className="font-black text-slate-900 uppercase text-lg leading-none mb-2">{action.label}</h4>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">{action.desc}</p>
                </div>
              </button>
            ))}
         </div>
      </div>

      {/* Activity Pulse / Institutional Node Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <div className="lg:col-span-8 bg-white rounded-[3.5rem] p-10 border border-slate-200 shadow-xl overflow-hidden relative">
            <h4 className="text-xl font-black text-slate-900 uppercase mb-8 flex items-center gap-3">
               <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl">🗺️</span>
               Institutional Roadmap
            </h4>
            <div className="space-y-6">
               <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4">Core Objectives</h5>
                  <ul className="space-y-3">
                     {[
                       'Digitize all assessment logs for centralized reporting.',
                       'Monitor facilitator curriculum coverage weekly.',
                       'Track learner interventions and remedial outcomes.',
                       'Maintain institutional data integrity via Cloud Sync.'
                     ].map((item, idx) => (
                       <li key={idx} className="flex items-center gap-4 text-xs font-bold text-slate-600 uppercase tracking-tight">
                         <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                         {item}
                       </li>
                     ))}
                  </ul>
               </div>
            </div>
         </div>

         <div className="lg:col-span-4 bg-indigo-600 rounded-[3.5rem] p-10 text-white shadow-2xl flex flex-col justify-between group overflow-hidden">
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent"></div>
            <div className="relative z-10">
               <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Node Pulse</span>
               <h4 className="text-2xl font-black uppercase tracking-tighter mt-2 mb-6">Real-Time Sync State</h4>
               <div className="space-y-6">
                  <div className="flex items-center gap-4">
                     <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                     <span className="text-[11px] font-black uppercase tracking-widest">Master Cloud Active</span>
                  </div>
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/10">
                     <p className="text-[8px] font-black text-sky-200 uppercase tracking-widest mb-1">Institutional ID</p>
                     <p className="text-sm font-black tracking-widest">{settings.institutionalId || "NOT_PROVISIONED"}</p>
                  </div>
               </div>
            </div>
            <button 
              onClick={() => onNavigate('ADMIN')}
              className="relative z-10 w-full py-4 mt-8 bg-white text-indigo-700 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-sky-50 transition-colors"
            >
              System Configuration
            </button>
         </div>
      </div>
    </div>
  );
};

export default HomeDashboard;