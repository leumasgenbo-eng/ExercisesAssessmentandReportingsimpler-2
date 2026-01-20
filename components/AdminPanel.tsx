
import React, { useRef, useState } from 'react';
import { ManagementState, AppState, AssessmentData, Pupil, InterventionRecord } from '../types';
import { INTERVENTION_REASONS, INTERVENTION_ACTIONS, INITIAL_MANAGEMENT_DATA } from '../constants';

interface AdminPanelProps {
  data: ManagementState;
  fullState: AppState;
  onUpdateManagement: (newData: ManagementState) => void;
  onResetSystem: () => void;
  onRestoreSystem: (newState: AppState) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  data, 
  fullState, 
  onUpdateManagement, 
  onResetSystem, 
  onRestoreSystem 
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleUpdateSetting = (field: string, value: any) => {
    onUpdateManagement({
      ...data,
      settings: {
        ...data.settings,
        [field]: value
      }
    });
  };

  const handleBackup = () => {
    const dataStr = JSON.stringify(fullState, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const newState = JSON.parse(event.target?.result as string);
        if (newState.management && newState.classWork) {
          onRestoreSystem(newState);
          alert("Restore Successful!");
        } else {
          throw new Error("Invalid format");
        }
      } catch (err) {
        alert("Failed to restore: Invalid backup file format.");
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSimulationData = () => {
    if (!confirm("Load simulation data? Current data will be replaced.")) return;
    setIsSimulating(true);
    setTimeout(() => {
      const dummyPupil: Pupil = {
        id: 'p-sim-1',
        name: 'SIM STUDENT',
        scores: { 1: '8', 2: '7', 3: '9', 4: '8', 5: '10' },
        scoreReasons: { 1: 'Review' },
        interventions: [
          {
            id: 'int-sim-1',
            date: '2024-01-15',
            week: '1',
            subject: 'Mathematics',
            reasonCategory: INTERVENTION_REASONS[0],
            actionTaken: INTERVENTION_ACTIONS[0],
            notes: 'Simulation active.',
            facilitator: 'John Doe'
          }
        ]
      };

      const baseState: AppState = {
        classWork: {},
        homeWork: {},
        projectWork: {},
        criterionWork: {},
        bookCountRecords: {},
        management: {
          ...INITIAL_MANAGEMENT_DATA,
          settings: {
            ...INITIAL_MANAGEMENT_DATA.settings,
            name: "SIMULATION U",
          }
        }
      };

      for(let w = 1; w <= 4; w++) {
        const key = `${w}|Basic 7|Mathematics`;
        baseState.classWork[key] = {
          term: baseState.management.settings.currentTerm,
          year: baseState.management.settings.currentYear,
          // Fix: Added missing required 'month' property
          month: "MONTH 1",
          week: w.toString(),
          className: 'Basic 7',
          facilitator: 'John Doe',
          subject: 'Mathematics',
          exercises: { 1: { id: 1, date: '2024-01-10', maxScore: '20', indicatorCodes: ['M1.1'] } },
          pupils: [ { ...dummyPupil, name: `SIM STUDENT Wk${w}` } ]
        } as AssessmentData;
      }

      onRestoreSystem(baseState);
      setIsSimulating(false);
      alert("Simulation Data Loaded.");
    }, 1000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 space-y-6 pb-12">
      <div className="flex flex-col gap-6 border-b-2 border-rose-900 pb-6">
        <div>
          <span className="bg-rose-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-xl">H.Q. Control</span>
          <h3 className="text-2xl md:text-5xl font-black text-rose-950 tracking-tighter uppercase leading-tight mt-2">Administrative Hub</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button onClick={handleLoadSimulationData} disabled={isSimulating} className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isSimulating ? 'bg-slate-100 text-slate-300' : 'bg-amber-500 text-white shadow-lg'}`}>Simulation Test</button>
          <div className="flex gap-2">
            <button onClick={handleBackup} className="flex-1 bg-white border border-rose-100 text-rose-600 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest">Backup</button>
            <button onClick={() => restoreInputRef.current?.click()} className="flex-1 bg-white border border-rose-100 text-rose-600 p-4 rounded-xl text-[10px] font-black uppercase tracking-widest">Restore</button>
            <input type="file" ref={restoreInputRef} onChange={handleRestore} className="hidden" accept=".json" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-xl border border-sky-100">
            <h4 className="text-lg font-black text-sky-950 uppercase mb-6">Academic Context</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Active Term</label>
                <select 
                  className="w-full bg-sky-50 border-none p-4 rounded-xl font-black text-sky-950 uppercase text-xs focus:outline-none appearance-none"
                  value={data.settings.currentTerm}
                  onChange={(e) => handleUpdateSetting('currentTerm', e.target.value)}
                >
                  <option value="1ST TERM">1st Term</option>
                  <option value="2ND TERM">2nd Term</option>
                  <option value="3RD TERM">3rd Term</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-sky-400 uppercase tracking-widest">Active Year</label>
                <input 
                  className="w-full bg-sky-50 border-none p-4 rounded-xl font-black text-sky-950 text-xs focus:outline-none"
                  value={data.settings.currentYear}
                  onChange={(e) => handleUpdateSetting('currentYear', e.target.value)}
                  placeholder="2024/2025"
                />
              </div>
            </div>
          </div>

          <div className="bg-rose-950 rounded-[2rem] p-6 md:p-10 shadow-2xl text-white">
             <h4 className="text-xl font-black uppercase mb-8">System Policies</h4>
             <div className="space-y-10">
                <div>
                   <div className="flex justify-between items-end mb-3">
                      <label className="text-[9px] font-black text-rose-300 uppercase tracking-widest block">Weak Score Threshold</label>
                      <span className="text-3xl font-black">{data.settings.poorPerformanceThreshold}</span>
                   </div>
                   <input type="range" min="0" max="100" step="1" className="w-full h-3 bg-white/10 rounded-full appearance-none accent-rose-500" value={data.settings.poorPerformanceThreshold} onChange={(e) => handleUpdateSetting('poorPerformanceThreshold', parseInt(e.target.value))} />
                </div>
                <div>
                   <label className="text-[9px] font-black text-rose-300 uppercase tracking-widest block mb-3">Reason Requirement Frequency</label>
                   <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                     {[0, 1, 2, 3, 4, 5].map(f => (
                       <button key={f} onClick={() => handleUpdateSetting('poorPerformanceFrequency', f)} className={`py-3 rounded-xl font-black text-[10px] transition-all border ${data.settings.poorPerformanceFrequency === f ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white/5 border-white/10 text-rose-300'}`}>
                         {f === 0 ? 'All' : `${f}x`}
                       </button>
                     ))}
                   </div>
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-4">
          <button onClick={onResetSystem} className="w-full bg-rose-50 hover:bg-rose-600 p-6 rounded-[2rem] transition-all border border-rose-100 flex items-center justify-between group">
            <div className="text-left"><div className="font-black text-rose-950 group-hover:text-white uppercase text-xs">Factory Reset</div></div>
            <span className="text-2xl">☢️</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
