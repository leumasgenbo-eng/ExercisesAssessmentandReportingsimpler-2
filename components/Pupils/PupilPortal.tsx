
import React, { useState } from 'react';
import { AppState, AssessmentData, AssessmentType } from '../../types';
import Registry from './Registry';
import ExerciseBroadsheet from './ExerciseBroadsheet';
import InterventionBroadsheet from './InterventionBroadsheet';
import InterventionMatrix from './InterventionMatrix';
import CorrectionsBroadsheet from './CorrectionsBroadsheet';
import CriterionGrowthMatrix from './CriterionGrowthMatrix';
import BookCountRegistry from './BookCountRegistry';
import DefaulterList from './DefaulterList';

interface Props {
  fullState: AppState;
  onUpdateState?: (type: AssessmentType, key: string, data: AssessmentData) => void;
  onUpdateBookCounts?: (key: string, data: { count: number; date: string; enrollment?: number }) => void;
  isFocusMode?: boolean;
  setIsFocusMode?: (focus: boolean) => void;
}

type PupilSubView = 'REGISTRY' | 'CORRECTIONS' | 'INT_HUB' | 'INT_MATRIX' | 'GROWTH' | 'HEAD_COUNT' | 'BROADSHEET' | 'DEFAULTERS';

const PupilPortal: React.FC<Props> = ({ fullState, onUpdateState, onUpdateBookCounts, isFocusMode = false, setIsFocusMode }) => {
  const [activeTab, setActiveTab] = useState<PupilSubView>('REGISTRY');

  const handleUpdate = onUpdateState || (() => {});
  const handleBookUpdate = onUpdateBookCounts || (() => {});

  const tabs = [
    { id: 'REGISTRY', label: 'Pupil Registry', color: 'bg-slate-900', hover: 'hover:text-slate-600' },
    { id: 'DEFAULTERS', label: 'Defaulter List', color: 'bg-rose-700', hover: 'hover:text-rose-600' },
    { id: 'HEAD_COUNT', label: 'Head Count', color: 'bg-sky-600', hover: 'hover:text-slate-600' },
    { id: 'CORRECTIONS', label: 'Corrections', color: 'bg-indigo-600', hover: 'hover:text-indigo-600' },
    { id: 'GROWTH', label: 'Growth Matrix', color: 'bg-rose-600', hover: 'hover:text-rose-600' },
    { id: 'INT_HUB', label: 'Interventions', color: 'bg-rose-600', hover: 'hover:text-rose-600' },
    { id: 'BROADSHEET', label: 'Broad Sheet', color: 'bg-slate-900', hover: 'hover:text-slate-600' },
  ] as const;

  return (
    <div className={`space-y-8 animate-in transition-all duration-700 ${isFocusMode ? 'p-0 pt-8' : ''}`}>
      {/* SUB-TABS */}
      <div className={`no-print flex flex-col md:flex-row items-center justify-center gap-4 ${isFocusMode ? 'mb-12' : ''}`}>
        <div className="bg-white p-1.5 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-wrap justify-center gap-1">
          {tabs.map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PupilSubView)}
              className={`px-4 md:px-6 py-3 rounded-[1.8rem] text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? `${tab.color} text-white shadow-lg` : `text-slate-400 ${tab.hover}`}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setIsFocusMode?.(!isFocusMode)}
          className={`p-3 rounded-full border-2 transition-all ${isFocusMode ? 'bg-amber-500 border-amber-600 text-white rotate-180' : 'bg-white border-slate-200 text-slate-400'}`}
          title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode (Hide Header)"}
        >
          {isFocusMode ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
          )}
        </button>
      </div>

      <div className="transition-all duration-500">
        {activeTab === 'REGISTRY' && <Registry fullState={fullState} />}
        {activeTab === 'DEFAULTERS' && <DefaulterList fullState={fullState} />}
        {activeTab === 'CORRECTIONS' && <CorrectionsBroadsheet fullState={fullState} onUpdateState={handleUpdate} />}
        {activeTab === 'INT_HUB' && <InterventionBroadsheet fullState={fullState} />}
        {activeTab === 'INT_MATRIX' && <InterventionMatrix fullState={fullState} />}
        {activeTab === 'GROWTH' && <CriterionGrowthMatrix fullState={fullState} />}
        {activeTab === 'HEAD_COUNT' && <BookCountRegistry fullState={fullState} onUpdateBookCounts={handleBookUpdate} />}
        {activeTab === 'BROADSHEET' && <ExerciseBroadsheet fullState={fullState} />}
      </div>
    </div>
  );
};

export default PupilPortal;
