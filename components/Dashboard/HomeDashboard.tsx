import React, { useMemo, useState } from 'react';
import { AppState, MasterPupilEntry, UserRole } from '../../types';
import { SCHOOL_NAME } from '../../constants';

interface HomeDashboardProps {
  fullState: AppState;
  onNavigate: (view: any) => void;
  userRole: UserRole;
  onAnnouncementPost?: (text: string) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ fullState, onNavigate, userRole, onAnnouncementPost }) => {
  const settings = fullState.management.settings;
  const staffCount = fullState.management.staff.length;
  const [announcementText, setAnnouncementText] = useState('');
  
  const totalPupils = useMemo(() => {
    return Object.values(fullState.management.masterPupils || {}).reduce(
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
    { label: 'Total Pupils', value: totalPupils, icon: '🎓', color: 'bg-blue-500 shadow-blue-200' },
    { label: 'Facilitators', value: staffCount, icon: '👨‍🏫', color: 'bg-indigo-500 shadow-indigo-200' },
    { label: 'Active Logs', value: activeAssessmentsCount, icon: '📝', color: 'bg-emerald-500 shadow-emerald-200' },
    { label: 'Compliance', value: `${(settings.complianceThreshold * 100).toFixed(0)}%`, icon: '⚖️', color: 'bg-amber-500 shadow-amber-200' },
  ];

  const quickActions = useMemo(() => {
    if (userRole === 'SCHOOL_ADMIN') {
      return [
        { id: 'ASSESSMENT', label: 'Assess', desc: 'Logging System', icon: '📝', accent: 'bg-blue-50 text-blue-600' },
        { id: 'PLANNING', label: 'Plan', desc: 'Curriculum Roadmap', icon: '📅', accent: 'bg-indigo-50 text-indigo-600' },
        { id: 'MESSAGES', label: 'Notify Hub', desc: 'Contact Staff', icon: '💬', accent: 'bg-emerald-50 text-emerald-600' },
        { id: 'ADMIN', label: 'Identity', desc: 'School Settings', icon: '⚙️', accent: 'bg-amber-50 text-amber-600' },
      ];
    }
    if (userRole === 'FACILITATOR') {
      return [
        { id: 'ASSESSMENT', label: 'Assess', desc: 'Activity Logs', icon: '📝', accent: 'bg-blue-50 text-blue-600' },
        { id: 'PLANNING', label: 'Plan', desc: 'My Broadsheets', icon: '📅', accent: 'bg-indigo-50 text-indigo-600' },
        { id: 'MESSAGES', label: 'Support Hub', desc: 'Contact Admin', icon: '💬', accent: 'bg-emerald-50 text-emerald-600' },
        { id: 'PUPILS', label: 'Registry', desc: 'Pupil Data', icon: '🎓', accent: 'bg-amber-50 text-amber-600' },
      ];
    }
    return [
      { id: 'PUPILS', label: 'My Performance', desc: 'Academic Summary', icon: '📊', accent: 'bg-indigo-50 text-indigo-600' },
    ];
  }, [userRole]);

  return (
    <div className="animate-in space-y-12 pb-24 max-w-7xl mx-auto px-4">
      {/* Required Header Context */}
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-1000"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 w-full">
            <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-4xl shadow-inner backdrop-blur-md">🏛️</div>
            <div className="text-center md:text-left flex-1">
               <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                 <span className="bg-indigo-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">1: Class Assignment/ACTIVITIES</span>
                 <p className="text-[10px] md:text-sm font-black text-indigo-400 uppercase tracking-widest">SCHOOL: {settings.name || SCHOOL_NAME} • CLS: ASSESSMENT SHEET</p>
               </div>
               <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tighter leading-none mb-1">
                 Node Control Center
               </h1>
               <p className="text-sky-100/40 text-[10px] font-black uppercase tracking-[0.4em]">
                 Role: {userRole} • Identity Node: {settings.institutionalId || 'PRIMARY'}
               </p>
            </div>
         </div>
      </div>

      {/* Admin Announcement Creator */}
      {userRole === 'SCHOOL_ADMIN' && (
        <div className="bg-amber-50 rounded-[3rem] p-10 border-2 border-amber-200 shadow-xl animate-in slide-in-from-bottom-2">
           <h4 className="text-2xl font-black text-amber-950 uppercase tracking-tight mb-6 flex items-center gap-4">
              <span className="w-12 h-12 rounded-2xl bg-amber-200 flex items-center justify-center text-2xl shadow-sm">📢</span>
              Institutional Announcement Broadcast
           </h4>
           <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="text" 
                className="flex-1 bg-white border-2 border-amber-100 p-6 rounded-[2rem] font-bold text-slate-800 outline-none focus:border-amber-500 transition-all shadow-inner"
                placeholder="Broadcast a critical message to all facilitators in this node..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
              />
              <button 
                onClick={() => { if(announcementText) { onAnnouncementPost?.(announcementText); setAnnouncementText(''); alert('Broadcast Dispatched.'); } }}
                className="bg-amber-600 text-white px-12 py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-amber-700 active:scale-95 transition-all"
              >Dispatch Mode</button>
           </div>
        </div>
      )}

      {/* Active Announcement (Visible to Facilitators/Pupils) */}
      {userRole !== 'SCHOOL_ADMIN' && settings.announcement?.active && (
        <div className="bg-indigo-600 rounded-[3.5rem] p-12 text-white shadow-2xl animate-pulse flex flex-col md:flex-row items-center gap-8 border-4 border-white/10">
           <div className="text-5xl">📡</div>
           <div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-200 block mb-2">Internal Node Broadcast</span>
              <p className="text-2xl md:text-3xl font-black uppercase tracking-tight italic leading-snug">
                "{settings.announcement.text}"
              </p>
              <div className="mt-4 text-[9px] font-black opacity-60 uppercase tracking-widest">Administrative Timestamp: {new Date(settings.announcement.timestamp).toLocaleTimeString()}</div>
           </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s, idx) => (
          <div key={idx} className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-xl flex flex-col items-center text-center group hover:scale-[1.05] transition-all duration-500">
             <div className={`w-16 h-16 ${s.color} text-white rounded-2xl flex items-center justify-center text-3xl mb-6 shadow-xl group-hover:rotate-12 transition-transform`}>
               {s.icon}
             </div>
             <span className="text-4xl font-black text-slate-900 mb-2">{s.value}</span>
             <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.3em]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Quick Navigation Hub */}
      <div className="space-y-8">
         <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.6em] ml-6">Quick Navigation Hub</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action) => (
              <button 
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className="p-10 rounded-[4rem] bg-white border-2 border-slate-50 hover:border-indigo-600 text-left transition-all duration-500 shadow-2xl flex flex-col gap-6 group hover:-translate-y-3"
              >
                <div className={`w-16 h-16 ${action.accent} rounded-[1.8rem] flex items-center justify-center text-3xl shadow-inner transition-colors duration-500`}>
                  {action.icon}
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">{action.label}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed tracking-wider">{action.desc}</p>
                </div>
              </button>
            ))}
         </div>
      </div>
    </div>
  );
};

export default HomeDashboard;