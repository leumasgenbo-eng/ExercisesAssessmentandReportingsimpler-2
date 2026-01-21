import React, { useRef, useState, useMemo, useEffect } from 'react';
import { ManagementState, AppState, RegisteredSchool, MasterPupilEntry, Staff, AssessmentData } from '../../types';
import { SCHOOL_HIERARCHY, INITIAL_MANAGEMENT_DATA } from '../../constants';
import ArchivePortal from './ArchivePortal';
import FacilitatorRewardPortal from './FacilitatorRewardPortal';
import { GoogleGenAI, Type } from "@google/genai";
import { SupabaseSync } from '../../lib/supabase';

interface AdminPanelProps {
  data: ManagementState;
  fullState: AppState;
  onUpdateManagement: (newData: ManagementState) => void;
  onResetSystem: () => void;
  onRestoreSystem: (newState: AppState) => void;
  isSuperAdminAuthenticated?: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  data, fullState, onUpdateManagement, onResetSystem, onRestoreSystem
}) => {
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const pupilInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'ADMIN' | 'REGISTRY' | 'REWARDS' | 'ARCHIVE' | 'SYNC'>('ADMIN');
  const [registryClass, setRegistryClass] = useState('Basic 1A');
  const [sortOrder, setSortOrder] = useState<'A-Z' | 'Z-A' | 'GENDER'>('A-Z');
  
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Cloud Sync State
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'FETCHING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const totalVerifiedPupils = useMemo(() => {
    return (Object.values(data.masterPupils || {}) as MasterPupilEntry[][]).reduce((acc, curr) => acc + curr.length, 0);
  }, [data.masterPupils]);

  const handleCloudPull = async () => {
    setSyncStatus('FETCHING');
    try {
      // 1. Fetch Staff
      const remoteStaff = await SupabaseSync.fetchStaff();
      // 2. Fetch Pupils
      const remotePupils = await SupabaseSync.fetchPupils();
      
      const newManagement = { ...data };
      
      if (remoteStaff.length > 0) {
        newManagement.staff = remoteStaff.map((s: any) => ({
          id: s.id.toString(),
          name: s.name,
          role: s.role,
          email: s.email,
          uniqueCode: s.unique_code
        }));
      }

      if (remotePupils.length > 0) {
        const master: Record<string, MasterPupilEntry[]> = {};
        remotePupils.forEach((p: any) => {
          if (!master[p.class_name]) master[p.class_name] = [];
          master[p.class_name].push({
            name: p.name,
            gender: p.gender as any,
            studentId: p.student_id
          });
        });
        newManagement.masterPupils = master;
      }

      onUpdateManagement(newManagement);
      setSyncStatus('SUCCESS');
      setLastSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setSyncStatus('IDLE'), 3000);
    } catch (err) {
      console.error(err);
      setSyncStatus('ERROR');
      alert("Failed to sync with Supabase. Ensure tables 'staff' and 'pupils' exist.");
    }
  };

  const handleCloudPush = async () => {
    setSyncStatus('FETCHING');
    try {
      const nodeId = data.settings.institutionalId || 'PRIMARY-NODE';
      await SupabaseSync.pushGlobalState(nodeId, fullState);
      setSyncStatus('SUCCESS');
      setLastSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setSyncStatus('IDLE'), 3000);
    } catch (err) {
      console.error(err);
      setSyncStatus('ERROR');
      alert("Push to Supabase failed. Ensure 'app_state' table is configured.");
    }
  };

  const handleBackup = () => {
    const backupPayload = {
      ...fullState,
      backupMetadata: {
        timestamp: new Date().toISOString(),
        nodeId: data.settings.institutionalId,
        schoolName: data.settings.name,
        version: "7.4.2-CORE"
      }
    };
    const dataStr = JSON.stringify(backupPayload, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ENTIRE_SYSTEM_BACKUP_${data.settings.name}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleExportMasterPupils = () => {
    if (!data.masterPupils) return;
    const rows = [['Class', 'Name', 'Gender', 'Student ID']];
    (Object.entries(data.masterPupils) as [string, MasterPupilEntry[]][]).forEach(([cls, pupils]) => {
      pupils.forEach(p => {
        rows.push([cls, p.name, p.gender, p.studentId || '']);
      });
    });
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Institutional_Pupil_Registry_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleWipeAllMasterPupils = () => {
    if (!confirm("💀 CRITICAL PURGE: Wipe the ENTIRE institutional pupil registry? This cannot be undone.")) return;
    onUpdateManagement({ ...data, masterPupils: {} });
  };

  const handlePupilBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      try {
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (lines.length < 2) return;
        const newPupils: MasterPupilEntry[] = lines.slice(1).map(line => {
          const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
          return {
            name: (parts[0] || '').toUpperCase(),
            gender: (parts[1]?.toUpperCase() === 'F' ? 'F' : 'M') as any,
            studentId: parts[2] || undefined
          };
        }).filter(p => p.name);
        if (newPupils.length > 0) {
          const currentMaster = { ...(data.masterPupils || {}) };
          currentMaster[registryClass] = [...(currentMaster[registryClass] || []), ...newPupils];
          onUpdateManagement({ ...data, masterPupils: currentMaster });
          alert(`Successfully ingested ${newPupils.length} pupils into ${registryClass}.`);
        }
      } catch (err) {
        alert("Failed to process CSV file.");
      }
    };
    reader.readAsText(file);
  };

  const processPastedDataWithAI = async () => {
    if (!pastedText.trim()) return;
    setIsSyncing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Extract a list of students for class "${registryClass}" from this text. Keys: name, gender (M/F), studentId. Text:\n${pastedText}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                gender: { type: Type.STRING, enum: ['M', 'F'] },
                studentId: { type: Type.STRING }
              }
            }
          }
        }
      });
      const result = JSON.parse(response.text || "[]");
      if (result.length > 0) {
        const currentMaster = { ...(data.masterPupils || {}) };
        currentMaster[registryClass] = [...(currentMaster[registryClass] || []), ...result];
        onUpdateManagement({ ...data, masterPupils: currentMaster });
        setIsPasteModalOpen(false);
        setPastedText('');
      }
    } catch (err) {
      alert("AI Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const tabs = [
    { id: 'ADMIN', label: 'Identity', icon: '🆔' },
    { id: 'REGISTRY', label: 'Registry', icon: '👤' },
    { id: 'SYNC', label: 'Cloud Bridge', icon: '☁️' },
    { id: 'REWARDS', label: 'Rewards', icon: '🏆' },
    { id: 'ARCHIVE', label: 'Archive', icon: '🏛️' },
  ] as const;

  return (
    <div className="animate-in space-y-12 pb-24 max-w-[1400px] mx-auto">
      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-10">
        <div>
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-1">Institutional Control</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Node Matrix Administration</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-[2rem] w-full md:w-auto overflow-x-auto scrollbar-hide">
           {tabs.map(t => (
             <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex-1 px-8 py-4 rounded-[1.8rem] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === t.id ? 'bg-sky-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
               <span className="mr-2">{t.icon}</span> {t.label}
             </button>
           ))}
        </div>
        <button onClick={onResetSystem} className="px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black uppercase text-[10px] hover:bg-rose-600 hover:text-white transition-all">Wipe Node</button>
      </div>

      <div className="transition-all duration-500">
        {activeTab === 'SYNC' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-4">
             <div className="bg-slate-900 rounded-[4rem] p-12 text-white shadow-2xl relative overflow-hidden border-b-8 border-emerald-500">
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
                   <div className="max-w-xl">
                      <div className="flex items-center gap-3 mb-6">
                        <span className="bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">Active Link</span>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: zokbowglwohpfqmjnemc</p>
                      </div>
                      <h4 className="text-4xl font-black uppercase tracking-tighter mb-4">Supabase Integration Hub</h4>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest leading-relaxed">
                        Your application is now linked to your remote Supabase database. Pull staff and pupil directories directly from your host or push your current assessment state for secure off-site backup.
                      </p>
                   </div>
                   <div className="bg-white/5 border border-white/10 p-10 rounded-[3.5rem] backdrop-blur-md w-full lg:w-96 text-center">
                      <div className="text-5xl mb-4">⚡</div>
                      <div className="text-[9px] font-black uppercase text-emerald-400 tracking-widest mb-2">Sync Intelligence</div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase leading-relaxed">
                        {lastSyncTime ? `Last successful handshake at ${lastSyncTime}` : 'Node waiting for initial handshake...'}
                      </p>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl">
                   <h5 className="text-xl font-black text-slate-900 uppercase mb-8 flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl">📥</span>
                      Pull Registry
                   </h5>
                   <div className="space-y-6">
                      <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed">
                        Fetch the master Staff and Pupil lists from Supabase. This will sync your local environment with the latest institutional records.
                      </p>
                      <button 
                        onClick={handleCloudPull}
                        disabled={syncStatus === 'FETCHING'}
                        className={`w-full py-6 rounded-[1.8rem] font-black uppercase text-xs tracking-widest transition-all shadow-2xl ${
                          syncStatus === 'FETCHING' ? 'bg-amber-500 text-white animate-pulse' : 
                          syncStatus === 'SUCCESS' ? 'bg-emerald-600 text-white' :
                          'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                         {syncStatus === 'FETCHING' ? 'CONTACTING NODE...' : 'Download Registry Data'}
                      </button>
                   </div>
                </div>

                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-xl">
                   <h5 className="text-xl font-black text-slate-900 uppercase mb-8 flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center text-xl">📤</span>
                      Push System State
                   </h5>
                   <div className="space-y-6">
                      <p className="text-[11px] font-bold text-slate-400 uppercase leading-relaxed">
                        Upload your entire Class Work, Home Work, and Project data to Supabase. This creates a secure cloud snapshot for administrative review.
                      </p>
                      <button 
                        onClick={handleCloudPush}
                        disabled={syncStatus === 'FETCHING'}
                        className={`w-full py-6 rounded-[1.8rem] font-black uppercase text-xs tracking-widest transition-all shadow-2xl ${
                          syncStatus === 'FETCHING' ? 'bg-amber-500 text-white animate-pulse' : 
                          syncStatus === 'SUCCESS' ? 'bg-emerald-600 text-white' :
                          'bg-slate-900 text-white hover:bg-black'
                        }`}
                      >
                         {syncStatus === 'FETCHING' ? 'UPLOADING MANIFEST...' : 'Push Snapshot to Cloud'}
                      </button>
                   </div>
                </div>
             </div>

             <div className="bg-slate-50 rounded-[3rem] p-12 border border-slate-200">
                <h5 className="text-xl font-black uppercase mb-10 tracking-widest text-slate-900">Required Table Schema</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                   <div className="space-y-4">
                      <h6 className="font-black uppercase text-xs text-indigo-600">Table: staff</h6>
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Fields: name (text), role (text), email (text), unique_code (text)</p>
                   </div>
                   <div className="space-y-4">
                      <h6 className="font-black uppercase text-xs text-indigo-600">Table: pupils</h6>
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Fields: name (text), gender (text), student_id (text), class_name (text)</p>
                   </div>
                   <div className="space-y-4">
                      <h6 className="font-black uppercase text-xs text-indigo-600">Table: app_state</h6>
                      <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Fields: node_id (text PK), state_json (jsonb), last_sync (timestamp)</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'ADMIN' && (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-bottom-4">
              <div className="lg:col-span-7 space-y-10">
                 <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden border-t-4 border-indigo-500">
                    <div className="relative z-10">
                       <div className="flex items-center gap-4 mb-8">
                          <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center text-3xl border border-indigo-500/30">🔐</div>
                          <div>
                             <h4 className="text-2xl font-black uppercase tracking-tighter">System Data Vault</h4>
                             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Institutional Disaster Recovery & Mobility</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                          <button onClick={handleBackup} className="bg-indigo-600 hover:bg-indigo-700 p-6 rounded-[2rem] text-left transition-all shadow-xl border border-indigo-400/30 flex flex-col justify-between h-full">
                             <div>
                                <div className="text-2xl mb-4">📤</div>
                                <div className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1">Active Export</div>
                                <div className="font-black text-lg uppercase leading-tight">Full System Backup</div>
                             </div>
                             <p className="text-[9px] font-bold text-indigo-100/60 uppercase mt-4 leading-relaxed">Extracts all Data into a secure SSMAP archive.</p>
                          </button>
                          <button onClick={() => restoreInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 p-6 rounded-[2rem] text-left transition-all border border-slate-700 flex flex-col justify-between h-full">
                             <div>
                                <div className="text-2xl mb-4">📥</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Safe Restore</div>
                                <div className="font-black text-lg uppercase leading-tight">Restore System State</div>
                             </div>
                             <p className="text-[9px] font-bold text-slate-500 uppercase mt-4 leading-relaxed">Import a previous SSMAP System Archive.</p>
                             <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestoreBackup} />
                          </button>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'REGISTRY' && (
           <div className="space-y-12 animate-in slide-in-from-bottom-4">
              <div className="bg-sky-950 rounded-[4rem] p-12 md:p-16 text-white shadow-2xl relative overflow-hidden">
                 <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center mb-16 gap-10">
                     <div>
                       <h4 className="text-4xl md:text-5xl font-black uppercase mb-4 tracking-tighter">Data Command Center</h4>
                       <p className="text-sky-400 text-xs font-black uppercase tracking-[0.4em]">Bulk Intelligence Synchronization</p>
                     </div>
                     <div className="bg-white/5 border border-white/10 px-10 py-6 rounded-[2.5rem] backdrop-blur-md text-center flex flex-col items-center">
                        <div className="text-5xl font-black text-sky-400 mb-1">{totalVerifiedPupils}</div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Total Verified Pupils</span>
                     </div>
                 </div>

                 <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
                   <button onClick={() => setIsPasteModalOpen(true)} className="bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all group">
                     <div className="text-4xl group-hover:scale-125 transition-transform">✨</div>
                     <div className="text-center">
                        <div className="font-black uppercase tracking-widest text-[11px]">Magic Paste</div>
                     </div>
                   </button>
                   <button onClick={handleExportMasterPupils} className="bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all group">
                     <div className="text-4xl group-hover:scale-125 transition-transform">📤</div>
                     <div className="text-center">
                        <div className="font-black uppercase tracking-widest text-[11px]">Export CSV</div>
                     </div>
                   </button>
                   <button onClick={() => pupilInputRef.current?.click()} className="bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all group">
                     <div className="text-4xl group-hover:scale-125 transition-transform">📥</div>
                     <div className="text-center">
                        <div className="font-black uppercase tracking-widest text-[11px]">Import File</div>
                     </div>
                   </button>
                   <button onClick={handleWipeAllMasterPupils} className="bg-rose-500/10 hover:bg-rose-500/20 border-2 border-dashed border-rose-500/30 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all group">
                     <div className="text-4xl group-hover:scale-125 transition-transform">💀</div>
                     <div className="text-center">
                        <div className="font-black uppercase tracking-widest text-[11px] text-rose-400">Wipe All</div>
                     </div>
                   </button>
                   <input type="file" ref={pupilInputRef} className="hidden" accept=".csv" onChange={handlePupilBulkUpload} />
                 </div>
              </div>

              <div className="bg-white rounded-[3.5rem] p-10 md:p-12 shadow-2xl border border-slate-200">
                 <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                    <div>
                       <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Roster Explorer</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                       <select className="bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-3 font-black text-slate-900 text-[10px] uppercase outline-none cursor-pointer" value={registryClass} onChange={(e) => setRegistryClass(e.target.value)}>
                          {Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {(data.masterPupils?.[registryClass] || []).length > 0 ? (data.masterPupils?.[registryClass] || []).map((p, pidx) => (
                      <div key={p.name + pidx} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-600 hover:shadow-2xl transition-all duration-300">
                         <div className="flex items-center gap-4 truncate">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors ${p.gender === 'F' ? 'bg-rose-100 text-rose-600' : 'bg-slate-900 text-white'}`}>{p.name.charAt(0)}</div>
                            <div className="truncate">
                               <div className="font-black uppercase text-[11px] text-slate-900 truncate mb-0.5">{p.name}</div>
                               <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.gender === 'F' ? 'Female' : 'Male'} • {p.studentId || 'No ID'}</div>
                            </div>
                         </div>
                      </div>
                    )) : (
                      <div className="col-span-full py-32 text-center opacity-30">
                         <p className="font-black uppercase tracking-[0.6em] text-xs">Registry segment vacant</p>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'REWARDS' && <FacilitatorRewardPortal data={data} fullState={fullState} />}
        {activeTab === 'ARCHIVE' && <ArchivePortal fullState={fullState} />}
      </div>

      {isPasteModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="bg-white rounded-t-[3rem] md:rounded-[4rem] p-8 md:p-16 w-full max-w-2xl shadow-2xl border-x-4 border-t-4 md:border-4 border-indigo-600 relative overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-full duration-700">
              <div className="text-center mb-10 shrink-0">
                 <div className={`w-20 h-20 md:w-24 md:h-24 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-inner ring-4 ring-indigo-50/50 ${isSyncing ? 'animate-pulse' : ''}`}>✨</div>
                 <h4 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter mb-3">Intelligence Ingestion</h4>
              </div>
              <textarea className="flex-1 w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[2rem] font-black text-slate-900 text-xs focus:border-indigo-600 outline-none transition-all resize-none min-h-[250px]" placeholder="Paste student data..." value={pastedText} onChange={(e) => setPastedText(e.target.value)} autoFocus disabled={isSyncing} />
              <div className="grid grid-cols-2 gap-4 mt-8">
                 <button onClick={() => { setIsPasteModalOpen(false); setPastedText(''); }} className="py-5 border-2 border-slate-100 text-slate-400 rounded-[1.5rem] font-black uppercase text-[10px]">Abort</button>
                 <button onClick={processPastedDataWithAI} className="py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] shadow-2xl" disabled={isSyncing}>{isSyncing ? 'Syncing...' : 'Start Sync'}</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;