
import React, { useState, useRef, useMemo } from 'react';
import { AssessmentType, AssessmentData, Pupil, ExerciseMetadata, SchoolGroup, ManagementState, InterventionRecord } from '../types';
import { EXERCISES_PER_TYPE, SUBJECTS_BY_GROUP, INTERVENTION_REASONS, INTERVENTION_ACTIONS } from '../constants';

interface Props {
  type: AssessmentType;
  data: AssessmentData;
  onUpdate: (data: AssessmentData) => void;
  selectedExercise: number | 'ALL';
  availableIndicators: string[];
  activeSchoolGroup: SchoolGroup;
  managementData?: ManagementState;
}

const AssessmentSheet: React.FC<Props> = ({ type, data, onUpdate, selectedExercise, availableIndicators, activeSchoolGroup, managementData }) => {
  const [printOrientation, setPrintOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [activeInterventionPupil, setActiveInterventionPupil] = useState<Pupil | null>(null);
  const [activeCellRemark, setActiveCellRemark] = useState<{pupilId: string, exId: number} | null>(null);
  const [tempReason, setTempReason] = useState('');
  const [tempAction, setTempAction] = useState('');
  const [tempNotes, setTempNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'IDLE' | 'SAVING' | 'SAVED'>('IDLE');
  
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const schoolName = managementData?.settings.name || "UNITED BAYLOR A.";
  const schoolLogo = managementData?.settings.logo;
  const poorThreshold = managementData?.settings.poorPerformanceThreshold ?? 10;
  const freqTrigger = managementData?.settings.poorPerformanceFrequency ?? 3;
  const currentTerm = managementData?.settings.currentTerm || data.term;
  const currentYear = managementData?.settings.currentYear || data.year;

  const totalPossibleExercises = EXERCISES_PER_TYPE[type];
  const indicatorOptions = useMemo(() => availableIndicators, [availableIndicators]);

  const mappedSubjects = useMemo(() => {
    if (!managementData?.subjects) return [];
    const groupSubjectsNames = SUBJECTS_BY_GROUP[activeSchoolGroup] || [];
    return managementData.subjects.filter(s => groupSubjectsNames.includes(s.name));
  }, [managementData?.subjects, activeSchoolGroup]);

  const handleMetaChange = (field: keyof AssessmentData, value: string) => {
    onUpdate({ ...data, [field]: value });
  };

  const handleExerciseChange = (id: number, field: keyof ExerciseMetadata, value: any) => {
    onUpdate({
      ...data,
      exercises: {
        ...data.exercises,
        [id]: { ...data.exercises[id], [field]: value }
      }
    });
  };

  const handleIndicatorChange = (exId: number, index: number, value: string) => {
    const currentCodes = [...(data.exercises[exId]?.indicatorCodes || ['', '', '', '', ''])];
    currentCodes[index] = value;
    handleExerciseChange(exId, 'indicatorCodes', currentCodes);
  };

  const applyToAll = (field: keyof ExerciseMetadata) => {
    const sourceExId = selectedExercise === 'ALL' ? 1 : selectedExercise;
    const sourceValue = data.exercises[sourceExId]?.[field];
    if (sourceValue === undefined || sourceValue === '') return;

    const newExercises = { ...data.exercises };
    Object.keys(newExercises).forEach(id => {
      (newExercises[parseInt(id)] as any)[field] = Array.isArray(sourceValue) ? [...sourceValue] : sourceValue;
    });
    onUpdate({ ...data, exercises: newExercises });
  };

  const ensurePupilExists = (pupilId: string) => {
    if (!data.pupils.find(p => p.id === pupilId)) {
      const newPupil: Pupil = {
        id: pupilId,
        name: `Pupil ${pupilId.split('-')[1]}`,
        scores: {},
        scoreReasons: {},
        interventionReason: "",
        interventions: []
      };
      return [...data.pupils, newPupil];
    }
    return data.pupils;
  };

  const handleScoreChange = (pupilId: string, exerciseId: number, value: string) => {
    const max = parseInt(data.exercises[exerciseId]?.maxScore || '100') || 100;
    const valAsInt = parseFloat(value);
    let finalValue = value;
    
    if (!isNaN(valAsInt)) {
      if (valAsInt < 0) finalValue = '0';
      if (valAsInt > max) finalValue = max.toString();
    }

    const pupilsWithNew = ensurePupilExists(pupilId);
    const updatedPupils = pupilsWithNew.map(p => {
      if (p.id === pupilId) {
        return { ...p, scores: { ...p.scores, [exerciseId]: finalValue } };
      }
      return p;
    });

    onUpdate({ ...data, pupils: updatedPupils });
  };

  const adjustPupilScore = (pupilId: string, exId: number, delta: number) => {
    const p = data.pupils.find(p => p.id === pupilId);
    const currentScore = parseFloat(p?.scores[exId] || '0') || 0;
    handleScoreChange(pupilId, exId, (currentScore + delta).toString());
  };

  const handleCellRemarkChange = (pupilId: string, exId: number, remark: string) => {
    const updatedPupils = data.pupils.map(p => {
      if (p.id === pupilId) {
        return { ...p, scoreReasons: { ...(p.scoreReasons || {}), [exId]: remark } };
      }
      return p;
    });
    onUpdate({ ...data, pupils: updatedPupils });
  };

  const saveIntervention = () => {
    if (!activeInterventionPupil || !tempReason || !tempAction) {
      alert("Please select both a reason and an action.");
      return;
    }

    const newIntervention: InterventionRecord = {
      id: `int-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      week: data.week,
      subject: data.subject || 'N/A',
      reasonCategory: tempReason,
      actionTaken: tempAction,
      notes: tempNotes,
      facilitator: data.facilitator || 'System'
    };

    onUpdate({
      ...data,
      pupils: data.pupils.map(p => {
        if (p.id === activeInterventionPupil.id) {
          return {
            ...p,
            interventions: [...(p.interventions || []), newIntervention],
            interventionReason: tempReason 
          };
        }
        return p;
      })
    });

    setActiveInterventionPupil(null);
    setTempReason('');
    setTempAction('');
    setTempNotes('');
  };

  const handleManualSave = () => {
    setSaveStatus('SAVING');
    setTimeout(() => {
      setSaveStatus('SAVED');
      setTimeout(() => setSaveStatus('IDLE'), 2000);
    }, 800);
  };

  const exerciseNumbers = selectedExercise === 'ALL' 
    ? Array.from({ length: totalPossibleExercises }, (_, i) => i + 1)
    : [typeof selectedExercise === 'number' ? selectedExercise : 1];

  const gridRows = Array.from({ length: Math.max(25, data.pupils.length) }, (_, i) => {
    const p = data.pupils[i];
    return p || { id: `auto-${i + 1}`, name: '', scores: {}, scoreReasons: {}, interventionReason: "", interventions: [] };
  });

  const updatePupilName = (id: string, name: string) => {
    const pupilsWithNew = ensurePupilExists(id);
    onUpdate({
      ...data,
      pupils: pupilsWithNew.map(p => p.id === id ? { ...p, name } : p)
    });
  };

  const downloadCSV = () => {
    const exCount = EXERCISES_PER_TYPE[type];
    const headers = ['SN', 'Name of Pupil'];
    for (let i = 1; i <= exCount; i++) {
      headers.push(`Ex ${i}`);
    }
    headers.push('Total');

    const csvRows = [];
    csvRows.push([`"School: ${schoolName}"`]);
    csvRows.push([`"Assessment Type: ${type} ASSIGNMENT / ACTIVITIES"`]);
    csvRows.push([`"Term: ${currentTerm}"`]);
    csvRows.push([`"Year: ${currentYear}"`]);
    csvRows.push([`"Class: ${data.className}"`]);
    csvRows.push([`"Subject: ${data.subject || 'Not Specified'}"`]);
    csvRows.push([`"Week: ${data.week}"`]);
    csvRows.push([]); 
    csvRows.push(headers.map(h => `"${h}"`));

    gridRows.forEach((p, idx) => {
      const rowData = [(idx + 1).toString(), `"${p.name || ''}"` ];
      let total = 0;
      for (let i = 1; i <= exCount; i++) {
        const score = p.scores[i] || '';
        rowData.push(score);
        total += parseFloat(score) || 0;
      }
      rowData.push(total > 0 ? total.toString() : '0');
      csvRows.push(rowData);
    });

    const csvContent = csvRows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${type}_Assessment_${data.className}_Wk${data.week}.csv`);
    link.click();
  };

  const downloadPupilTemplate = () => {
    const exCount = EXERCISES_PER_TYPE[type];
    const headers = ['SN', 'Name of Pupil'];
    for (let i = 1; i <= exCount; i++) {
      headers.push(`Exercise ${i} Score`);
    }
    const csvContent = [headers.join(','), ...Array.from({length: 25}, (_, i) => `${i+1},`)].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PUPIL_IMPORT_TEMPLATE_${type}.csv`);
    link.click();
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      let startIdx = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes('name of pupil')) {
          startIdx = i + 1;
          break;
        }
      }

      const newPupils: Pupil[] = lines.slice(startIdx)
        .filter(l => l.trim() !== '')
        .map((line, idx) => {
          const parts = line.split(',').map(p => p.replace(/^"|"$/g, '').trim());
          const name = parts[1];
          if (!name) return null;

          const scores: Record<number, string> = {};
          for (let i = 1; i <= totalPossibleExercises; i++) {
            if (parts[i + 1]) scores[i] = parts[i + 1];
          }

          return {
            id: `p-up-${Date.now()}-${idx}`,
            name: name.toUpperCase(),
            scores,
            scoreReasons: {},
            interventionReason: "",
            interventions: []
          };
        }).filter(p => p !== null) as Pupil[];

      if (newPupils.length > 0) {
        onUpdate({ ...data, pupils: newPupils });
        alert(`Successfully imported ${newPupils.length} pupils.`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearAllPupils = () => {
    if (confirm("CRITICAL: This will remove ALL pupils and their scores from this specific sheet. Continue?")) {
      onUpdate({ ...data, pupils: [] });
    }
  };

  const processPastedList = () => {
    const names = pastedText.split('\n')
      .map(n => n.trim())
      .filter(n => n !== '');
    
    if (names.length === 0) {
      alert("Please paste at least one name.");
      return;
    }

    const newPupils: Pupil[] = names.map((name, idx) => ({
      id: `p-paste-${Date.now()}-${idx}`,
      name: name.toUpperCase(),
      scores: {},
      scoreReasons: {},
      interventionReason: "",
      interventions: []
    }));

    onUpdate({ ...data, pupils: [...data.pupils, ...newPupils] });
    setPastedText('');
    setIsPasteModalOpen(false);
  };

  return (
    <div className="p-1 md:p-2 print:p-0 relative" id={`assessment-sheet-inner-${type}`}>
      {/* HEADER ACTIONS */}
      <div className="text-center border-b-2 border-sky-900 pb-2 mb-2">
        <div className="flex flex-col gap-3 no-print mb-4 items-center">
           <div className="flex flex-wrap gap-2 items-center justify-center w-full">
             <div className="flex bg-sky-50 rounded-lg p-1 border border-sky-100 shadow-inner shrink-0">
                <button onClick={() => setPrintOrientation('landscape')} className={`px-2 md:px-3 py-1 text-[8px] font-black uppercase rounded-md transition-all ${printOrientation === 'landscape' ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-400'}`}>Land</button>
                <button onClick={() => setPrintOrientation('portrait')} className={`px-2 md:px-3 py-1 text-[8px] font-black uppercase rounded-md transition-all ${printOrientation === 'portrait' ? 'bg-sky-600 text-white shadow-sm' : 'text-sky-400'}`}>Port</button>
             </div>
             <button onClick={downloadCSV} className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase rounded-lg shadow-sm">Export</button>
             
             <div className="flex flex-wrap gap-1 bg-sky-950/5 p-1 rounded-xl border border-sky-100 justify-center">
               <button onClick={downloadPupilTemplate} className="px-2 py-2 bg-white border border-sky-200 text-sky-900 text-[8px] font-black uppercase rounded-lg flex items-center gap-1">
                 <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 Temp
               </button>
               <button onClick={() => fileInputRef.current?.click()} className="px-2 py-2 bg-white border border-sky-200 text-sky-900 text-[8px] font-black uppercase rounded-lg flex items-center gap-1">
                 <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                 CSV
               </button>
               <button onClick={() => setIsPasteModalOpen(true)} className="px-2 py-2 bg-sky-600 text-white text-[8px] font-black uppercase rounded-lg shadow-md flex items-center gap-1">
                 <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                 Paste
               </button>
               <input type="file" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" accept=".csv" />
             </div>
           </div>

           <div className="flex flex-wrap gap-1.5 justify-center w-full">
              <button onClick={clearAllPupils} className="bg-white border border-rose-200 text-rose-600 text-[8px] font-black px-3 py-2 rounded-lg uppercase">Wipe</button>
              <button 
                onClick={handleManualSave} 
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[8px] font-black uppercase shadow-md transition-all ${
                  saveStatus === 'SAVED' ? 'bg-emerald-600 text-white' : 
                  saveStatus === 'SAVING' ? 'bg-amber-500 text-white animate-pulse' : 
                  'bg-white border border-sky-200 text-sky-950'
                }`}
              >
                {saveStatus === 'SAVED' ? 'Saved' : saveStatus === 'SAVING' ? 'Saving' : 'Save'}
              </button>
              <button onClick={() => onUpdate({...data, pupils: [...data.pupils, {id: Date.now().toString(), name: '', scores: {}, scoreReasons: {}, interventionReason: "", interventions: []}]})} className="bg-sky-950 text-white text-[8px] font-black px-3 py-2 rounded-lg uppercase shadow-lg">New Pupil +</button>
           </div>
        </div>

        {/* LOGO & TITLE */}
        <div className="flex items-center justify-center gap-2 mb-1">
          {schoolLogo && <img src={schoolLogo} alt="Logo" className="w-6 h-6 md:w-8 md:h-8 object-contain" />}
          <h2 className="text-sm md:text-xl font-black text-sky-950 uppercase tracking-tighter leading-none">{schoolName}</h2>
        </div>
        <div className="inline-block bg-sky-700 text-white py-0.5 px-2 font-black text-[7px] md:text-[9px] tracking-widest uppercase rounded mb-2">
            1: Class Assignment/ACTIVITIES
        </div>
        
        {/* ACADEMIC CONTEXT BAR */}
        <div className="flex justify-center items-center gap-4 mb-2">
          <div className="flex gap-3">
             <div className="flex items-center gap-1">
               <span className="text-[6px] md:text-[7px] font-black text-sky-400 uppercase tracking-widest">Term:</span>
               <span className="text-[8px] md:text-[9px] font-black text-sky-900 border-b border-sky-100">{currentTerm}</span>
             </div>
             <div className="flex items-center gap-1">
               <span className="text-[6px] md:text-[7px] font-black text-sky-400 uppercase tracking-widest">Year:</span>
               <span className="text-[8px] md:text-[9px] font-black text-sky-900 border-b border-sky-100">{currentYear}</span>
             </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-center items-center gap-3 md:gap-6">
          <div className="text-center">
            <span className="block text-[7px] md:text-[8px] font-black text-sky-400 uppercase tracking-widest leading-none mb-1">SCHOOL: {schoolName} • CLS: {data.className}</span>
            <h3 className="text-[9px] md:text-[10px] font-black text-sky-900 uppercase leading-none tracking-tight">ASSESSMENT SHEET</h3>
          </div>
          <div className="flex gap-1.5">
            <div className="bg-sky-50 px-2 py-0.5 rounded border border-sky-100"><span className="block text-[6px] font-black text-sky-400 uppercase leading-none">Class</span><div className="text-[9px] font-black text-sky-700 uppercase leading-none">{data.className}</div></div>
            <div className="bg-white px-2 py-0.5 rounded border border-sky-100">
                <span className="block text-[6px] font-black text-sky-400 uppercase leading-none">Area</span>
                <select className="bg-transparent font-black text-sky-900 text-[8px] md:text-[9px] focus:outline-none appearance-none cursor-pointer" value={data.subject || ''} onChange={(e) => handleMetaChange('subject', e.target.value)}>
                    <option value="">- PICK -</option>
                    {mappedSubjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
            </div>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="border border-sky-100 rounded-xl overflow-x-auto shadow-sm scrollbar-hide">
        <table className="w-full border-collapse text-[8px] md:text-[9px] table-fixed min-w-[600px] md:min-w-0">
          <thead>
            <tr className="bg-sky-50/50 border-b border-sky-100">
              <th className="w-8 md:w-10 p-1 border-r border-sky-200 font-black text-sky-900">SN</th>
              <th className="w-48 md:w-60 p-1 border-r border-sky-200 font-black text-sky-900 text-left uppercase tracking-tighter">Name of Pupil</th>
              {exerciseNumbers.map(num => (
                <th key={num} className="p-1 border-r border-sky-100 font-black text-sky-800 text-center">EX.{num}</th>
              ))}
              <th className="w-14 md:w-16 p-1 bg-sky-100 font-black text-sky-900 uppercase tracking-widest">Total</th>
            </tr>
            <tr className="bg-white border-b border-sky-50">
              <td colSpan={2} className="p-1 text-right pr-3 group">
                <div className="flex items-center justify-end gap-1 h-6">
                  <span className="text-[7px] md:text-[8px] font-black text-sky-300 uppercase tracking-widest">Date:</span>
                  <button onClick={() => applyToAll('date')} className="no-print p-0.5 bg-sky-50 text-sky-400 rounded hover:bg-sky-500 hover:text-white"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 13l-7 7-7-7" /></svg></button>
                </div>
              </td>
              {exerciseNumbers.map(num => (
                <td key={num} className="border-r border-sky-50 p-0 text-center relative">
                  <input type="date" className="w-full h-6 text-[7px] md:text-[8px] text-center font-bold border-none focus:outline-none bg-transparent" value={data.exercises[num]?.date || ''} onChange={(e) => handleExerciseChange(num, 'date', e.target.value)} />
                </td>
              ))}
              <td className="bg-sky-50/20"></td>
            </tr>
            <tr className="bg-white border-b border-sky-50">
              <td colSpan={2} className="p-1 text-right pr-3">
                <div className="flex flex-col justify-center gap-0.5 py-1">
                   {[0,1,2,3,4].map(idx => (
                      <div key={idx} className="flex items-center justify-end gap-1 h-5">
                        <span className="text-[6px] md:text-[7px] font-black text-sky-200 uppercase tracking-widest leading-none">Ind {idx + 1}:</span>
                        {idx === 0 && <button onClick={() => applyToAll('indicatorCodes')} className="no-print p-0.5 bg-sky-50 text-sky-400 rounded hover:bg-sky-500 hover:text-white"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 13l-7 7-7-7" /></svg></button>}
                      </div>
                   ))}
                </div>
              </td>
              {exerciseNumbers.map(num => (
                <td key={num} className="border-r border-sky-50 p-0 text-center align-top">
                  <div className="flex flex-col gap-0.5 py-1">
                    {[0,1,2,3,4].map(idx => (
                      <div key={idx} className="h-5 flex items-center border-b border-sky-50/50 last:border-0">
                        <select className="w-full text-[7px] md:text-[8px] font-black border-none bg-transparent p-0 focus:outline-none appearance-none cursor-pointer text-emerald-700 text-center" value={(data.exercises[num]?.indicatorCodes || [])[idx] || ''} onChange={(e) => handleIndicatorChange(num, idx, e.target.value)}>
                          <option value="">-</option>
                          {indicatorOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </td>
              ))}
              <td className="bg-sky-50/20"></td>
            </tr>
            <tr className="bg-sky-50 border-b-2 border-sky-100">
              <td colSpan={2} className="p-1 text-right pr-3">
                <div className="flex items-center justify-end gap-1 h-6">
                  <span className="text-[7px] md:text-[8px] font-black text-sky-900 uppercase tracking-widest">Max:</span>
                  <button onClick={() => applyToAll('maxScore')} className="no-print p-0.5 bg-white text-sky-600 rounded shadow-sm hover:bg-sky-950 hover:text-white"><svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 13l-7 7-7-7" /></svg></button>
                </div>
              </td>
              {exerciseNumbers.map(num => (
                <td key={num} className="border-r border-sky-100 p-0 text-center relative group/max">
                  <div className="flex items-center justify-center h-6">
                    <input type="text" className="w-full border-none text-center font-black text-sky-950 bg-transparent focus:outline-none text-[8px] md:text-[10px]" value={data.exercises[num]?.maxScore || ''} onChange={(e) => handleExerciseChange(num, 'maxScore', e.target.value)} placeholder="-" />
                  </div>
                </td>
              ))}
              <td className="text-center font-black text-sky-900 text-[8px] md:text-[10px]">100%</td>
            </tr>
          </thead>
          <tbody className="divide-y divide-sky-50">
            {gridRows.map((pup, index) => {
              const scores = Object.values(pup.scores) as string[];
              const total = scores.reduce((acc, s) => acc + (parseFloat(s) || 0), 0);
              
              const lowScoreCount = scores.filter(s => {
                const val = parseFloat(s);
                return !isNaN(val) && val <= poorThreshold;
              }).length;
              
              const requiresReason = lowScoreCount >= freqTrigger;
              const hasIntervention = (pup.interventions || []).some(int => int.week === data.week && int.subject === data.subject);

              return (
                <tr key={pup.id} className="h-[32px] hover:bg-sky-50/50 transition-colors">
                  <td className="border-r border-sky-100 text-center font-black text-sky-200">{index + 1}</td>
                  <td className="border-r border-sky-100 p-0 relative">
                    <div className="flex items-center h-full">
                      <input 
                          className={`w-full h-full px-2 border-none bg-transparent font-black uppercase focus:bg-sky-100 outline-none text-[8px] md:text-[10px] ${requiresReason ? 'text-rose-600' : 'text-sky-900'}`} 
                          value={pup.name} 
                          onChange={(e) => updatePupilName(pup.id, e.target.value)} 
                          placeholder="Name..."
                      />
                      {requiresReason && (
                        <button 
                          onClick={() => setActiveInterventionPupil(pup)}
                          className={`mr-1.5 p-0.5 rounded-full no-print ${hasIntervention ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-500 animate-pulse'}`} 
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                        </button>
                      )}
                    </div>
                  </td>
                  {exerciseNumbers.map(num => {
                    const score = pup.scores[num];
                    const isLow = score !== undefined && score !== '' && parseFloat(score) <= poorThreshold;
                    const cellRemark = (pup.scoreReasons || {})[num];
                    
                    return (
                      <td key={num} className={`border-r border-sky-50 p-0 relative group/score ${isLow ? 'bg-rose-50/30' : ''}`}>
                        <div className="flex items-center justify-center h-full relative">
                          <button 
                            onClick={() => adjustPupilScore(pup.id, num, -1)}
                            className="no-print absolute left-0 top-0 bottom-0 opacity-0 group-hover/score:opacity-100 text-sky-300 hover:text-sky-600 px-0.5"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M20 12H4" /></svg>
                          </button>
                          <input 
                            type="number" 
                            className={`w-full h-full border-none text-center font-bold bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none text-[9px] md:text-[10px] ${isLow ? 'text-rose-500 font-black' : 'text-sky-800'}`} 
                            value={score || ''} 
                            onChange={(e) => handleScoreChange(pup.id, num, e.target.value)} 
                          />
                          <button 
                            onClick={() => adjustPupilScore(pup.id, num, 1)}
                            className="no-print absolute right-0 top-0 bottom-0 opacity-0 group-hover/score:opacity-100 text-sky-300 hover:text-sky-600 px-0.5"
                          >
                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" d="M12 4v16m8-8H4" /></svg>
                          </button>
                          {isLow && (
                            <button 
                              onClick={() => setActiveCellRemark({pupilId: pup.id, exId: num})}
                              className={`absolute right-0 top-0 no-print p-0.5 ${cellRemark ? 'text-indigo-600' : 'text-slate-200'}`}
                            >
                              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="bg-sky-50 text-center font-black text-sky-950 text-[9px] md:text-[10px]">{total > 0 ? total : ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="mt-4 flex flex-col md:flex-row justify-between items-center md:items-end px-2 gap-4 font-black text-[8px] md:text-[9px]">
        <div className="flex items-center gap-2 border-b border-sky-900 pb-1 w-full md:w-1/3">
          <span className="uppercase text-sky-400 text-[7px] md:text-[8px] shrink-0">Facilitator:</span>
          <select className="flex-1 bg-transparent font-black uppercase text-sky-900 outline-none cursor-pointer" value={data.facilitator || ''} onChange={(e) => handleMetaChange('facilitator', e.target.value)}>
            <option value="">- SELECT -</option>
            {managementData?.staff.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
          </select>
        </div>
        <div className="text-[7px] italic text-sky-300 uppercase font-bold tracking-widest no-print text-center md:text-right">
          Triggers: <span className="text-rose-500">{freqTrigger}x</span> below <span className="text-rose-500">{poorThreshold}</span>
        </div>
      </div>

      {/* MODALS */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center p-3 md:p-4 bg-sky-950/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-300 border-2 border-sky-100 flex flex-col">
            <div className="flex justify-between items-start mb-4">
               <div>
                  <h4 className="text-xl md:text-2xl font-black text-sky-950 uppercase tracking-tighter leading-none mb-1">Batch Class List</h4>
                  <p className="text-[8px] md:text-[10px] font-bold text-sky-400 uppercase tracking-widest">One name per line</p>
               </div>
               <button onClick={() => setIsPasteModalOpen(false)} className="text-slate-300 hover:text-rose-500 p-1">
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
            <textarea 
               className="w-full bg-slate-50 border-2 border-slate-100 focus:border-sky-600 p-4 rounded-xl font-black text-sky-900 text-xs md:text-sm focus:outline-none resize-none h-48 md:h-64 shadow-inner"
               placeholder="Example:&#10;John Doe&#10;Jane Smith"
               value={pastedText}
               onChange={(e) => setPastedText(e.target.value)}
               autoFocus
            />
            <div className="mt-6 grid grid-cols-2 gap-3">
               <button onClick={() => setIsPasteModalOpen(false)} className="py-3 border-2 border-slate-100 text-slate-400 rounded-xl font-black uppercase text-[10px]">Cancel</button>
               <button onClick={processPastedList} className="py-3 bg-sky-950 text-white rounded-xl font-black uppercase text-[10px] shadow-lg">Import</button>
            </div>
          </div>
        </div>
      )}

      {activeCellRemark && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4 bg-sky-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-4 w-full max-w-sm shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Quick Remark</span>
              <button onClick={() => setActiveCellRemark(null)} className="text-slate-300"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <textarea 
              className="w-full bg-slate-50 border-2 border-transparent focus:border-indigo-500 p-2 rounded-lg font-bold text-sky-900 text-[11px] focus:outline-none resize-none h-20"
              placeholder="..."
              autoFocus
              value={data.pupils.find(p => p.id === activeCellRemark.pupilId)?.scoreReasons?.[activeCellRemark.exId] || ''}
              onChange={(e) => handleCellRemarkChange(activeCellRemark.pupilId, activeCellRemark.exId, e.target.value)}
            />
            <button onClick={() => setActiveCellRemark(null)} className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest">Save</button>
          </div>
        </div>
      )}

      {activeInterventionPupil && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-3 md:p-4 bg-sky-950/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white rounded-2xl p-5 md:p-6 w-full max-w-2xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border-2 border-slate-200">
              <div className="flex justify-between items-start mb-4 border-b-2 border-slate-50 pb-3 shrink-0">
                 <div>
                    <h4 className="text-base md:text-lg font-black text-sky-950 uppercase tracking-tighter leading-none mb-1">Intervention Matrix</h4>
                    <p className="text-[8px] md:text-[9px] font-bold text-rose-500 uppercase tracking-widest">{activeInterventionPupil.name}</p>
                 </div>
                 <button onClick={() => setActiveInterventionPupil(null)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                    <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
                 <div className="space-y-1.5">
                    <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Reason Taxonomy</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                       {INTERVENTION_REASONS.map(reason => (
                         <button 
                           key={reason} 
                           onClick={() => setTempReason(reason)}
                           className={`p-2 rounded-lg text-[8px] font-black uppercase text-left transition-all border-2 flex items-center gap-2 ${tempReason === reason ? 'bg-rose-600 border-rose-600 text-white shadow-sm' : 'bg-slate-50 border-transparent text-slate-600'}`}
                         >
                           <span className={`w-1.5 h-1.5 rounded-full ${tempReason === reason ? 'bg-white' : 'bg-rose-200'}`}></span>
                           {reason}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Prescribed Action</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                       {INTERVENTION_ACTIONS.map(action => (
                         <button 
                           key={action} 
                           onClick={() => setTempAction(action)}
                           className={`p-2 rounded-lg text-[8px] font-black uppercase text-left transition-all border-2 flex items-center gap-2 ${tempAction === action ? 'bg-sky-600 border-sky-600 text-white shadow-sm' : 'bg-slate-50 border-transparent text-slate-600'}`}
                         >
                           <span className={`w-1.5 h-1.5 rounded-full ${tempAction === action ? 'bg-white' : 'bg-sky-200'}`}></span>
                           {action}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest">Observations</label>
                    <textarea 
                       className="w-full bg-slate-50 border-2 border-transparent focus:border-sky-500 p-2.5 rounded-xl font-bold text-sky-900 text-[10px] focus:outline-none resize-none h-16 shadow-inner"
                       placeholder="Markers..."
                       value={tempNotes}
                       onChange={(e) => setTempNotes(e.target.value)}
                    />
                 </div>
              </div>

              <div className="mt-4 pt-3 border-t-2 border-slate-50 shrink-0">
                 <button 
                   onClick={saveIntervention}
                   className="w-full bg-sky-950 text-white py-3.5 rounded-xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 text-[10px]"
                 >
                   Secure Record
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentSheet;
