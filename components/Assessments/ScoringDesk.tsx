import React, { useState, useMemo, useRef } from 'react';
import { AssessmentType, AssessmentData, Pupil, ExerciseMetadata, SchoolGroup, InterventionRecord, AssessmentAttachment, ManagementState } from '../../types';
import { EXERCISES_PER_TYPE } from '../../constants';
import AssessmentHeader from './AssessmentHeader';
import AssessmentRow from './AssessmentRow';
import InterventionModal from './InterventionModal';
import CapiPulseView from './CapiPulseView';

interface Props {
  type: AssessmentType;
  data: AssessmentData;
  onUpdate: (data: AssessmentData) => void;
  selectedExercise: number[] | 'ALL';
  onExerciseChange: (ex: number[] | 'ALL') => void;
  availableIndicators: string[];
  activeSchoolGroup: SchoolGroup;
  viewMode: 'TABLE' | 'INTERVIEW';
  setViewMode: (mode: 'TABLE' | 'INTERVIEW') => void;
  managementData?: ManagementState;
  onExit: () => void;
}

const ScoringDesk: React.FC<Props> = ({ 
  type, data, onUpdate, selectedExercise, onExerciseChange, availableIndicators, activeSchoolGroup, 
  viewMode, setViewMode, managementData, onExit
}) => {
  const [pupilSearch, setPupilSearch] = useState('');
  const [activeInterventionPupil, setActiveInterventionPupil] = useState<null | Pupil>(null);
  const [activePulseEx, setActivePulseEx] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gridRows = useMemo(() => {
    const masterList = managementData?.masterPupils?.[data.className] || [];
    const existingByName = new Map<string, Pupil>(data.pupils.map(p => [p.name, p]));
    const existingByStudentId = new Map<string, Pupil>(
      data.pupils
        .filter(p => !!p.studentId)
        .map(p => [p.studentId!, p])
    );

    let syncedList: Pupil[] = [];

    if (masterList.length > 0) {
      syncedList = masterList.map((m, idx) => {
        const existing = (m.studentId ? existingByStudentId.get(m.studentId) : null) || existingByName.get(m.name);
        return {
          id: existing?.id || `m-${idx}-${Date.now()}`,
          name: m.name, 
          gender: m.gender,
          studentId: m.studentId,
          bookOpen: existing?.bookOpen ?? true,
          scores: existing?.scores || {},
          interventions: existing?.interventions || [],
          scoreReasons: existing?.scoreReasons || {},
          correctionStatus: existing?.correctionStatus || {}
        };
      });
    } else {
      syncedList = data.pupils.length > 0 ? data.pupils : Array.from({ length: 30 }, (_, i) => ({
        id: `auto-${i}`, name: '', bookOpen: true, scores: {}, interventions: []
      } as Pupil));
    }

    if (!pupilSearch) return syncedList;
    return syncedList.filter(p => p.name.toLowerCase().includes(pupilSearch.toLowerCase()));
  }, [data.pupils, managementData?.masterPupils, data.className, pupilSearch]);

  const updatePupil = (pupilId: string, updates: Partial<Pupil>) => {
    let updatedPupils = [...data.pupils];
    const exists = updatedPupils.some(p => p.id === pupilId);
    if (!exists) {
      const template = gridRows.find(p => p.id === pupilId);
      if (template) updatedPupils.push({ ...template, ...updates });
    } else {
      updatedPupils = updatedPupils.map(p => p.id === pupilId ? { ...p, ...updates } : p);
    }
    onUpdate({ ...data, pupils: updatedPupils });
  };

  const handleExerciseMetadataUpdate = (id: number, field: keyof ExerciseMetadata, value: any) => {
    onUpdate({ ...data, exercises: { ...data.exercises, [id]: { ...data.exercises[id], [field]: value } } });
  };

  const saveIntervention = (reason: string, action: string, notes: string) => {
    if (!activeInterventionPupil) return;
    const newInt: InterventionRecord = {
      id: `int-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      week: data.week,
      subject: data.subject || 'N/A',
      reasonCategory: reason,
      actionTaken: action,
      notes: notes,
      facilitator: data.facilitator || 'System'
    };
    updatePupil(activeInterventionPupil.id, { 
      interventions: [...(activeInterventionPupil.interventions || []), newInt],
      interventionReason: reason
    });
    setActiveInterventionPupil(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const attachment: AssessmentAttachment = {
        name: file.name,
        data: base64,
        mimeType: file.type
      };
      onUpdate({ ...data, attachment });
    };
    reader.readAsDataURL(file);
  };

  const downloadAttachment = () => {
    if (!data.attachment) return;
    const link = document.createElement('a');
    link.href = data.attachment.data;
    link.download = data.attachment.name;
    link.click();
  };

  const removeAttachment = () => {
    if (confirm("Remove the attached external card?")) {
      const newData = { ...data };
      delete newData.attachment;
      onUpdate(newData);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-40">
      {/* REQUESTED HEADER FORMAT */}
      <div className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 no-print border-b-2 border-slate-100 pb-6 md:pb-8">
        <div className="w-full md:w-auto">
           <div className="flex items-center gap-2 mb-1 justify-start">
             <span className="bg-indigo-600 text-white text-[7px] md:text-[8px] font-black px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-widest shadow-md">1: Class Assignment/ACTIVITIES</span>
             <p className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">SCHOOL: {managementData?.settings.name || 'UNITED BAYLOR A.'} • CLS: ASSESSMENT SHEET</p>
           </div>
           <h2 className="text-2xl md:text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none truncate">
             {data.className} <span className="text-slate-300 mx-2">/</span> {data.subject || 'GENERAL'}
           </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,image/*" />
           
           {data.attachment ? (
             <div className="flex gap-1.5 shrink-0">
                <button onClick={downloadAttachment} className="bg-sky-600 text-white px-3 md:px-5 py-2 md:py-3 rounded-xl md:rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all shadow-md hover:bg-sky-700 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Attached Card
                </button>
                <button onClick={removeAttachment} className="bg-rose-50 text-rose-500 w-8 h-8 md:w-11 md:h-11 flex items-center justify-center rounded-xl md:rounded-full hover:bg-rose-500 hover:text-white shadow-sm shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
           ) : (
             <button onClick={() => fileInputRef.current?.click()} className="bg-slate-100 text-slate-500 px-3 md:px-5 py-2 md:py-3 rounded-xl md:rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all border-2 border-dashed border-slate-200 hover:bg-white hover:border-sky-500 hover:text-sky-600 flex items-center gap-1.5 shrink-0">
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
               Attach Card
             </button>
           )}

           <div className="hidden md:block h-10 w-px bg-slate-100"></div>

           <div className="relative flex-1 md:flex-none">
              <input type="text" className="bg-white border-2 border-slate-100 p-2 md:p-4 pl-8 md:pl-12 rounded-xl md:rounded-full font-black text-slate-900 text-[8px] md:text-[10px] w-full md:w-64 outline-none focus:border-indigo-600 transition-all shadow-sm" placeholder="FILTER ROSTER..." value={pupilSearch} onChange={(e) => setPupilSearch(e.target.value)} />
              <svg className="w-3.5 h-3.5 absolute left-2.5 md:left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
           </div>

           <div className="flex bg-slate-100 p-1 rounded-xl md:rounded-full gap-1 shadow-inner shrink-0 w-full md:w-auto mt-2 md:mt-0">
              <button onClick={() => setViewMode('TABLE')} className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'TABLE' ? 'bg-white text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Table</button>
              <button onClick={() => setViewMode('INTERVIEW')} className={`flex-1 md:flex-none px-4 md:px-8 py-2 md:py-2.5 rounded-lg md:rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'INTERVIEW' ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Pulse</button>
           </div>
        </div>
      </div>

      {viewMode === 'TABLE' ? (
        <div className="bg-white rounded-2xl md:rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full border-collapse">
              <AssessmentHeader 
                type={type} data={data} 
                exerciseNumbers={selectedExercise === 'ALL' ? Array.from({length: EXERCISES_PER_TYPE[type]}, (_, i) => i+1) : selectedExercise} 
                availableIndicators={availableIndicators} 
                onExerciseChange={onExerciseChange} 
                onMetadataChange={handleExerciseMetadataUpdate} 
                onApplyAll={handleExerciseMetadataUpdate as any} 
                showTotal={true} 
              />
              <tbody className="divide-y divide-slate-100">
                {gridRows.map((pup, pidx) => (
                  <AssessmentRow 
                    key={pup.id} index={pidx} pupil={pup} 
                    exerciseNumbers={selectedExercise === 'ALL' ? Array.from({length: EXERCISES_PER_TYPE[type]}, (_, i) => i+1) : selectedExercise} 
                    exercisesMetadata={data.exercises} availableIndicators={availableIndicators} 
                    onUpdatePupil={updatePupil} onInterventionClick={setActiveInterventionPupil} 
                    showTotal={true} type={type} 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <CapiPulseView 
          data={data}
          gridRows={gridRows}
          activeEx={activePulseEx}
          setActiveEx={setActivePulseEx}
          updatePupil={updatePupil}
          onInterventionClick={setActiveInterventionPupil}
        />
      )}

      {/* FOOTER ACTION */}
      <div className="fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-50 no-print w-[90%] md:w-auto">
        <button onClick={onExit} className="w-full md:w-auto bg-slate-950 text-white px-8 md:px-16 py-4 md:py-6 rounded-2xl md:rounded-full font-black uppercase text-[9px] md:text-[10px] tracking-[0.2em] md:tracking-[0.4em] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4 md:gap-6">
           <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
           Secure & Exit
        </button>
      </div>

      {activeInterventionPupil && (
        <InterventionModal pupil={activeInterventionPupil} onClose={() => setActiveInterventionPupil(null)} onSave={saveIntervention} />
      )}
    </div>
  );
};

export default ScoringDesk;