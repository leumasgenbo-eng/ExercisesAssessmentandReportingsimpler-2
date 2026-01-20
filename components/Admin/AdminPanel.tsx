import React, { useRef, useState, useMemo } from 'react';
import { ManagementState, AppState, RegisteredSchool, MasterPupilEntry, ManagementSubView, AssessmentData, AssessmentType } from '../../types';
import { SCHOOL_HIERARCHY, INITIAL_MANAGEMENT_DATA } from '../../constants';
import ArchivePortal from './ArchivePortal';
import FacilitatorRewardPortal from './FacilitatorRewardPortal';
import { GoogleGenAI, Type } from "@google/genai";

interface AdminPanelProps {
  data: ManagementState;
  fullState: AppState;
  onUpdateManagement: (newData: ManagementState) => void;
  onResetSystem: () => void;
  onRestoreSystem: (newState: AppState) => void;
  isSuperAdminAuthenticated?: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  data, fullState, onUpdateManagement, onResetSystem, onRestoreSystem, isSuperAdminAuthenticated = false 
}) => {
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const pupilInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'ADMIN' | 'REGISTRY' | 'REWARDS' | 'ARCHIVE' | 'SUPER_REGISTRY'>('ADMIN');
  const [registryClass, setRegistryClass] = useState('Basic 1A');
  const [sortOrder, setSortOrder] = useState<'A-Z' | 'Z-A' | 'GENDER'>('A-Z');
  
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  // Movement State
  const [movingPupil, setMovingPupil] = useState<{ entry: MasterPupilEntry, index: number } | null>(null);
  const [moveTargetClass, setMoveTargetClass] = useState('');

  // Edit Registry State
  const [editingPupil, setEditingPupil] = useState<{ entry: MasterPupilEntry, index: number } | null>(null);
  const [editForm, setEditForm] = useState<MasterPupilEntry>({ name: '', gender: 'M', studentId: '' });

  // Provisioning Form
  const [provisionForm, setProvisionForm] = useState({
    schoolName: '',
    location: '',
    email: '',
    contact: '',
    clearExistingData: false 
  });

  const totalVerifiedPupils = useMemo(() => {
    return (Object.values(data.masterPupils || {}) as MasterPupilEntry[][]).reduce((acc, curr) => acc + curr.length, 0);
  }, [data.masterPupils]);

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

  const handleClearClassRegistry = () => {
    if (!confirm(`Wipe all registry data for ${registryClass}?`)) return;
    const newMaster = { ...(data.masterPupils || {}) };
    delete newMaster[registryClass];
    onUpdateManagement({ ...data, masterPupils: newMaster });
  };

  const handleDeletePupil = (name: string) => {
    if (!confirm(`Permanently remove ${name} from the registry?`)) return;
    const newMaster = { ...(data.masterPupils || {}) };
    if (newMaster[registryClass]) {
      newMaster[registryClass] = newMaster[registryClass].filter(p => p.name !== name);
      onUpdateManagement({ ...data, masterPupils: newMaster });
    }
  };

  const openEditPupil = (p: MasterPupilEntry, idx: number) => {
    setEditingPupil({ entry: p, index: idx });
    setEditForm({ ...p });
  };

  const handleEditPupilSave = () => {
    if (!editingPupil || !editForm.name) return;
    const newMaster = { ...(data.masterPupils || {}) };
    if (newMaster[registryClass]) {
      newMaster[registryClass] = newMaster[registryClass].map((p, idx) => 
        idx === editingPupil.index ? { ...editForm, name: editForm.name.toUpperCase() } : p
      );
      onUpdateManagement({ ...data, masterPupils: newMaster });
    }
    setEditingPupil(null);
  };

  const handleMovePupilExecute = () => {
    if (!movingPupil || !moveTargetClass || moveTargetClass === registryClass) {
      setMovingPupil(null);
      return;
    }

    const { entry } = movingPupil;
    const oldClass = registryClass;
    const newClass = moveTargetClass;

    const newState: AppState = JSON.parse(JSON.stringify(fullState));

    if (newState.management.masterPupils) {
      newState.management.masterPupils[oldClass] = (newState.management.masterPupils[oldClass] || [])
        .filter(p => p.name !== entry.name);
      if (!newState.management.masterPupils[newClass]) newState.management.masterPupils[newClass] = [];
      newState.management.masterPupils[newClass].push(entry);
    }

    const categories: (keyof AppState)[] = ['classWork', 'homeWork', 'projectWork', 'criterionWork'];
    
    categories.forEach(catKey => {
      const categoryData = newState[catKey] as Record<string, AssessmentData>;
      if (!categoryData) return;

      Object.entries(categoryData).forEach(([key, assessment]) => {
        const parts = key.split('|');
        if (parts[4] === oldClass) {
          const pupilIdx = assessment.pupils.findIndex(p => p.name === entry.name);
          if (pupilIdx !== -1) {
            const pupilData = assessment.pupils[pupilIdx];
            assessment.pupils.splice(pupilIdx, 1);
            const targetParts = [...parts];
            targetParts[4] = newClass;
            const targetKey = targetParts.join('|');
            if (!categoryData[targetKey]) {
              categoryData[targetKey] = {
                ...assessment,
                className: newClass,
                pupils: []
              };
            }
            categoryData[targetKey].pupils.push(pupilData);
          }
        }
      });
    });

    onRestoreSystem(newState);
    setMovingPupil(null);
    setMoveTargetClass('');
    alert(`MIGRATION SUCCESSFUL: ${entry.name} transferred to ${newClass} with historical logs.`);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const newState = JSON.parse(event.target?.result as string);
        if (newState.management && (newState.classWork || newState.homeWork)) {
          onRestoreSystem(newState);
          alert("SYSTEM RESTORE SUCCESSFUL.");
        } else {
          throw new Error("Invalid structure");
        }
      } catch (err) {
        alert("CRITICAL ERROR: The selected file is not a valid SSMAP System Archive.");
      }
    };
    reader.readAsText(file);
  };

  const handlePupilBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split(/\r?\n/);
      const newMaster = { ...(data.masterPupils || {}) };
      let count = 0;
      lines.forEach((line) => {
        const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
        if (parts.length >= 2) {
          const cls = parts[0];
          if (cls.toLowerCase() === 'class') return;
          const name = parts[1].toUpperCase();
          const gender = (parts[2]?.charAt(0).toUpperCase() === 'F' ? 'F' : 'M');
          const studentId = parts[3] || `ID-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          if (cls && name) {
            if (!newMaster[cls]) newMaster[cls] = [];
            if (!newMaster[cls].some((p: MasterPupilEntry) => p.name === name)) {
              newMaster[cls].push({ name, gender, studentId });
              count++;
            }
          }
        }
      });
      onUpdateManagement({ ...data, masterPupils: newMaster });
      alert(`Imported ${count} pupils successfully.`);
    };
    reader.readAsText(file);
  };

  const activeRoster = useMemo(() => {
    const list = data.masterPupils?.[registryClass] || [];
    const sorted = [...list];
    
    if (sortOrder === 'A-Z') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOrder === 'Z-A') {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOrder === 'GENDER') {
      sorted.sort((a, b) => a.gender.localeCompare(b.gender) || a.name.localeCompare(b.name));
    }
    
    return sorted;
  }, [data.masterPupils, registryClass, sortOrder]);

  const processPastedDataWithAI = async () => {
    if (!pastedText.trim()) return;
    setIsSyncing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Identify name, gender, and class. Input: ${pastedText}`,
        config: {
          systemInstruction: "Extract pupil records as JSON array: {name, gender, className}.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { name: { type: Type.STRING }, gender: { type: Type.STRING }, className: { type: Type.STRING } },
              required: ["name", "gender"],
            }
          }
        },
      });
      const results = JSON.parse(response.text || "[]");
      if (Array.isArray(results)) {
        const currentMaster = { ...(data.masterPupils || {}) };
        results.forEach((item: any) => {
          const target = item.className || registryClass;
          if (!currentMaster[target]) currentMaster[target] = [];
          if (!currentMaster[target].some((p: MasterPupilEntry) => p.name === item.name)) {
            currentMaster[target].push({ name: item.name.toUpperCase(), gender: (item.gender?.charAt(0).toUpperCase() === 'F' ? 'F' : 'M'), studentId: `ID-${Math.random().toString(36).substr(2, 5).toUpperCase()}` });
          }
        });
        onUpdateManagement({ ...data, masterPupils: currentMaster });
        setIsPasteModalOpen(false);
      }
    } catch (error) {
      alert("AI Sync Failed.");
    } finally { setIsSyncing(false); }
  };

  const handleProvisionNode = (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = provisionForm.schoolName.replace(/[^a-zA-Z]/g, '').substring(0, 5).toUpperCase();
    const nodeID = `${prefix}-SSM-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const newSchoolRecord: RegisteredSchool = {
      id: nodeID,
      name: provisionForm.schoolName.toUpperCase(),
      location: provisionForm.location,
      email: provisionForm.email,
      contact: provisionForm.contact,
      timestamp: new Date().toISOString()
    };

    const newM: ManagementState = {
      ...data,
      settings: { 
        ...data.settings, 
        name: provisionForm.schoolName.toUpperCase(), 
        address: provisionForm.location, 
        contact: provisionForm.contact, 
        email: provisionForm.email, 
        institutionalId: nodeID 
      },
      superAdminRegistry: [...(data.superAdminRegistry || []), newSchoolRecord]
    };

    onUpdateManagement(newM);
    setShowProvisionModal(false);
    alert(`NODE PROVISIONED: ${nodeID}`);
  };

  const tabs = useMemo(() => {
    const base = [
      { id: 'ADMIN', label: 'Identity', icon: '🆔' },
      { id: 'REGISTRY', label: 'Registry', icon: '👤' },
      { id: 'REWARDS', label: 'Rewards', icon: '🏆' },
      { id: 'ARCHIVE', label: 'Archive', icon: '🏛️' },
    ];
    if (isSuperAdminAuthenticated) {
      base.push({ id: 'SUPER_REGISTRY', label: 'Global Node Registry', icon: '🌍' });
    }
    return base;
  }, [isSuperAdminAuthenticated]);

  const allClassesList = useMemo(() => Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes), []);

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
        {activeTab === 'ADMIN' && (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-bottom-4">
              {/* Existing Identity View Content */}
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
                             <p className="text-[9px] font-bold text-indigo-100/60 uppercase mt-4 leading-relaxed">Extracts all Class Work, Home Work, Project sheets, Pupil Registries and Mappings into a secure SSMAP archive.</p>
                          </button>
                          <button onClick={() => restoreInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 p-6 rounded-[2rem] text-left transition-all border border-slate-700 flex flex-col justify-between h-full">
                             <div>
                                <div className="text-2xl mb-4">📥</div>
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Safe Restore</div>
                                <div className="font-black text-lg uppercase leading-tight">Restore System State</div>
                             </div>
                             <p className="text-[9px] font-bold text-slate-500 uppercase mt-4 leading-relaxed">Import a previous SSMAP System Archive to instantly reconstruct your school node across any authorized device.</p>
                             <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestoreBackup} />
                          </button>
                       </div>
                    </div>
                 </div>

                 <div className="bg-indigo-600 rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl group-hover:scale-110 transition-transform"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                       <div className="text-center md:text-left">
                          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-indigo-200 block mb-6">Active Node Identity</span>
                          <h4 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-4 leading-none">{data.settings.name}</h4>
                          <div className="inline-flex flex-col gap-1 bg-white/10 px-5 py-3 rounded-2xl border border-white/20">
                             <span className="text-[8px] font-black uppercase text-indigo-200 opacity-60">Active Node ID:</span>
                             <span className="font-black text-base tracking-widest">{data.settings.institutionalId || 'UNPROVISIONED'}</span>
                          </div>
                       </div>
                       <button onClick={() => setShowProvisionModal(true)} className="bg-white text-indigo-600 px-10 py-6 rounded-[2.2rem] font-black uppercase text-xs shadow-2xl hover:scale-105 transition-all">Establish New Node</button>
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-5 space-y-10">
                  <div className="bg-white rounded-[3.5rem] p-12 shadow-xl border border-slate-200">
                    <h4 className="text-lg font-black text-slate-900 uppercase mb-8">Node Environment</h4>
                    <div className="space-y-8">
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Academic Year</label>
                          <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 font-black text-lg text-slate-900 uppercase">{data.settings.currentYear}</div>
                       </div>
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Active Term Cycle</label>
                          <div className="p-5 bg-indigo-50 rounded-2xl border-2 border-indigo-100 font-black text-lg text-indigo-900 uppercase">{data.settings.currentTerm}</div>
                       </div>
                       <div className="pt-6 border-t border-slate-50 space-y-4">
                          <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-indigo-600 transition-all">
                             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-inner">📍</div>
                             <div className="truncate"><span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Location</span><span className="font-black text-[11px] uppercase truncate text-slate-900">{data.settings.address || 'Not Configured'}</span></div>
                          </div>
                          <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-sky-600 transition-all">
                             <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center text-xl shadow-inner">📧</div>
                             <div className="truncate"><span className="text-[8px] font-black text-slate-400 uppercase block mb-0.5">Official Email</span><span className="font-black text-[11px] lowercase truncate text-slate-900">{data.settings.email || 'Not Configured'}</span></div>
                          </div>
                       </div>
                    </div>
                  </div>
              </div>
           </div>
        )}

        {activeTab === 'REGISTRY' && (
           <div className="space-y-12 animate-in slide-in-from-bottom-4">
              <div className="bg-sky-950 rounded-[4rem] p-12 md:p-16 text-white shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                 
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
                        <p className="text-[8px] font-bold text-white/30 uppercase mt-1">AI Data Extraction</p>
                     </div>
                   </button>
                   <button onClick={handleExportMasterPupils} className="bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all group">
                     <div className="text-4xl group-hover:scale-125 transition-transform">📤</div>
                     <div className="text-center">
                        <div className="font-black uppercase tracking-widest text-[11px]">Export CSV</div>
                        <p className="text-[8px] font-bold text-white/30 uppercase mt-1">Institutional Backup</p>
                     </div>
                   </button>
                   <button onClick={() => pupilInputRef.current?.click()} className="bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/20 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all group">
                     <div className="text-4xl group-hover:scale-125 transition-transform">📥</div>
                     <div className="text-center">
                        <div className="font-black uppercase tracking-widest text-[11px]">Import File</div>
                        <p className="text-[8px] font-bold text-white/30 uppercase mt-1">Standard CSV Protocol</p>
                     </div>
                   </button>
                   <button onClick={handleWipeAllMasterPupils} className="bg-rose-500/10 hover:bg-rose-500/20 border-2 border-dashed border-rose-500/30 p-8 rounded-[2.5rem] flex flex-col items-center gap-4 transition-all group">
                     <div className="text-4xl group-hover:scale-125 transition-transform">💀</div>
                     <div className="text-center">
                        <div className="font-black uppercase tracking-widest text-[11px] text-rose-400">Wipe All</div>
                        <p className="text-[8px] font-bold text-rose-500/40 uppercase mt-1">Critical Purge</p>
                     </div>
                   </button>
                   <input type="file" ref={pupilInputRef} className="hidden" accept=".csv" onChange={handlePupilBulkUpload} />
                 </div>
              </div>

              <div className="bg-white rounded-[3.5rem] p-10 md:p-12 shadow-2xl border border-slate-200">
                 <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                    <div>
                       <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Roster Explorer</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Deep Lens into class configurations</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                       <select 
                         className="bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-3 font-black text-slate-900 text-[10px] uppercase outline-none cursor-pointer" 
                         value={sortOrder} 
                         onChange={(e) => setSortOrder(e.target.value as any)}
                       >
                          <option value="A-Z">SORT: A-Z</option>
                          <option value="Z-A">SORT: Z-A</option>
                          <option value="GENDER">SORT: GENDER</option>
                       </select>
                       <select className="bg-slate-50 border-2 border-slate-100 rounded-xl px-5 py-3 font-black text-slate-900 text-[10px] uppercase outline-none cursor-pointer" value={registryClass} onChange={(e) => setRegistryClass(e.target.value)}>
                          {Object.values(SCHOOL_HIERARCHY).flatMap(g => g.classes).map(c => <option key={c} value={c}>{c}</option>)}
                       </select>
                       <button onClick={handleClearClassRegistry} className="bg-rose-50 text-rose-600 border border-rose-100 px-6 py-3 rounded-xl font-black uppercase text-[10px] hover:bg-rose-600 hover:text-white transition-all">Clear Class</button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeRoster.length > 0 ? activeRoster.map((p, pidx) => (
                      <div key={p.name + pidx} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-indigo-600 hover:shadow-2xl transition-all duration-300">
                         <div className="flex items-center gap-4 truncate">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors ${p.gender === 'F' ? 'bg-rose-100 text-rose-600' : 'bg-slate-900 text-white'}`}>{p.name.charAt(0)}</div>
                            <div className="truncate">
                               <div className="font-black uppercase text-[11px] text-slate-900 truncate mb-0.5">{p.name}</div>
                               <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{p.gender === 'F' ? 'Female' : 'Male'} • {p.studentId || 'No ID'}</div>
                            </div>
                         </div>
                         <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEditPupil(p, pidx)} className="p-2 bg-white border border-slate-100 text-sky-600 rounded-lg hover:bg-sky-600 hover:text-white shadow-sm" title="Edit Pupil">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button onClick={() => { setMovingPupil({ entry: p, index: pidx }); setMoveTargetClass(registryClass); }} className="p-2 bg-white border border-slate-100 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white shadow-sm" title="Move Pupil">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                            </button>
                            <button onClick={() => handleDeletePupil(p.name)} className="p-2 bg-white border border-slate-100 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white shadow-sm" title="Delete Pupil">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
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

        {activeTab === 'REWARDS' && (
           <div className="animate-in slide-in-from-bottom-4">
             <FacilitatorRewardPortal data={data} fullState={fullState} />
           </div>
        )}

        {activeTab === 'ARCHIVE' && (
           <div className="animate-in slide-in-from-bottom-4">
             <ArchivePortal fullState={fullState} />
           </div>
        )}

        {activeTab === 'SUPER_REGISTRY' && isSuperAdminAuthenticated && (
          <div className="space-y-12 animate-in slide-in-from-bottom-4">
             <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-slate-200">
                <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-10 border-b-2 border-slate-50 pb-6">Provisioned Schools Matrix</h4>
                {/* School Registry Table Content */}
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead>
                         <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Institution Name</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Node ID</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Registration Date</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact Identity</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Action</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {data.superAdminRegistry && data.superAdminRegistry.length > 0 ? (
                            data.superAdminRegistry.map((school) => (
                               <tr key={school.id} className="hover:bg-indigo-50/20 transition-colors">
                                  <td className="px-8 py-6">
                                     <div className="font-black text-slate-900 uppercase text-sm tracking-tight">{school.name}</div>
                                     <div className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest mt-1">{school.location || 'Unknown Location'}</div>
                                  </td>
                                  <td className="px-8 py-6">
                                     <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">{school.id}</span>
                                  </td>
                                  <td className="px-8 py-6">
                                     <div className="text-[10px] font-black text-slate-900 uppercase">{new Date(school.timestamp).toLocaleDateString()}</div>
                                     <div className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">{new Date(school.timestamp).toLocaleTimeString()}</div>
                                  </td>
                                  <td className="px-8 py-6">
                                     <div className="text-[10px] font-black text-slate-600 lowercase">{school.email || 'N/A'}</div>
                                     <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{school.contact || 'No Phone'}</div>
                                  </td>
                                  <td className="px-8 py-6 text-right">
                                     <button onClick={() => { if(confirm(`Erase Registry Record for ${school.name}?`)) onUpdateManagement({...data, superAdminRegistry: data.superAdminRegistry?.filter(s => s.id !== school.id)})}} className="text-slate-300 hover:text-rose-500 transition-colors">
                                        <svg className="w-5 h-5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                     </button>
                                  </td>
                               </tr>
                            ))
                         ) : (
                            <tr>
                               <td colSpan={5} className="py-32 text-center">
                                  <div className="flex flex-col items-center opacity-20">
                                     <div className="text-6xl mb-4">🌍</div>
                                     <p className="font-black uppercase tracking-[0.4em] text-[10px]">Registry is currently vacant</p>
                                  </div>
                               </td>
                            </tr>
                         )}
                      </tbody>
                   </table>
                </div>
             </div>
          </div>
        )}
      </div>

      {showProvisionModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white rounded-[4rem] p-12 md:p-16 w-full max-w-xl shadow-2xl border-4 border-indigo-600 relative overflow-hidden flex flex-col max-h-[95vh]">
              <div className="text-center mb-8 shrink-0"><div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-4">🏢</div><h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Establish New School Node</h4></div>
              <form onSubmit={handleProvisionNode} className="space-y-5 overflow-y-auto pr-2 scrollbar-hide">
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Official School Name</label><input required className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-black text-slate-900 text-sm focus:border-indigo-600 outline-none uppercase" value={provisionForm.schoolName} onChange={(e) => setProvisionForm({...provisionForm, schoolName: e.target.value})} placeholder="Enter Full Name" /></div>
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Location of school</label><input required className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-black text-slate-900 text-sm focus:border-indigo-600 outline-none uppercase" value={provisionForm.location} onChange={(e) => setProvisionForm({...provisionForm, location: e.target.value})} placeholder="Enter location" /></div>
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Administrative Email</label><input type="email" className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-black text-slate-900 text-sm focus:border-indigo-600 outline-none" value={provisionForm.email} onChange={(e) => setProvisionForm({...provisionForm, email: e.target.value})} placeholder="admin@school.com" /></div>
                 <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label><input className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl font-black text-slate-900 text-sm focus:border-indigo-600 outline-none" value={provisionForm.contact} onChange={(e) => setProvisionForm({...provisionForm, contact: e.target.value})} placeholder="+233..." /></div>
                 <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-100"><button type="button" onClick={() => setShowProvisionModal(false)} className="py-5 border-2 border-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[11px]">Cancel</button><button type="submit" className="py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] shadow-2xl">Provision Node</button></div>
              </form>
           </div>
        </div>
      )}

      {movingPupil && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white rounded-[3.5rem] p-10 md:p-14 w-full max-w-lg shadow-2xl border-4 border-indigo-600 relative overflow-hidden">
              <div className="text-center mb-10">
                 <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner">🚛</div>
                 <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">Migration Protocol</h4>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Transferring <span className="text-indigo-600">{movingPupil.entry.name}</span></p>
              </div>
              <div className="space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Destination Class</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 uppercase text-sm outline-none focus:border-indigo-600 transition-all shadow-inner" value={moveTargetClass} onChange={(e) => setMoveTargetClass(e.target.value)}>
                       {allClassesList.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-4">
                    <button onClick={() => setMovingPupil(null)} className="py-5 border-2 border-slate-100 text-slate-400 rounded-[1.8rem] font-black uppercase text-[10px]">Cancel</button>
                    <button onClick={handleMovePupilExecute} className="py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black uppercase text-[10px] shadow-2xl">Commit Transfer</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {editingPupil && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in">
           <div className="bg-white rounded-[3.5rem] p-10 md:p-14 w-full max-w-lg shadow-2xl border-4 border-sky-600 relative overflow-hidden">
              <div className="text-center mb-10">
                 <div className="w-20 h-20 bg-sky-50 text-sky-600 rounded-[2rem] flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner">✏️</div>
                 <h4 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">Edit Record</h4>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modifying registry entry</p>
              </div>
              <div className="space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Pupil Name</label>
                    <input className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 uppercase text-sm outline-none focus:border-sky-600 transition-all shadow-inner" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                      <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 uppercase text-sm outline-none focus:border-sky-600 transition-all shadow-inner" value={editForm.gender} onChange={(e) => setEditForm({...editForm, gender: e.target.value as any})}>
                         <option value="M">Male</option>
                         <option value="F">Female</option>
                      </select>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Student ID</label>
                      <input className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl font-black text-slate-900 uppercase text-sm outline-none focus:border-sky-600 transition-all shadow-inner" value={editForm.studentId} onChange={(e) => setEditForm({...editForm, studentId: e.target.value})} />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4 pt-4">
                    <button onClick={() => setEditingPupil(null)} className="py-5 border-2 border-slate-100 text-slate-400 rounded-[1.8rem] font-black uppercase text-[10px]">Discard</button>
                    <button onClick={handleEditPupilSave} className="py-5 bg-sky-600 text-white rounded-[1.8rem] font-black uppercase text-[10px] shadow-2xl">Update Record</button>
                 </div>
              </div>
           </div>
        </div>
      )}

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