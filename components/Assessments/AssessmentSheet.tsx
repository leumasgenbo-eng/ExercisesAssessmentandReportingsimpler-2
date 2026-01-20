import React, { useState, useMemo } from 'react';
import { AssessmentType, AssessmentData, SchoolGroup, ManagementState, Pupil } from '../../types';
import { EXERCISES_PER_TYPE, SUBJECTS_BY_GROUP } from '../../constants';

// Sub-components for neatness
import WizardProcess from './WizardProcess';
import WizardTemporal from './WizardTemporal';
import WizardModality from './WizardModality';
import WizardDepartment from './WizardDepartment';
import WizardScope from './WizardScope';
import WizardRigor from './WizardRigor';
import ScoringDesk from './ScoringDesk';

interface Props {
  type: AssessmentType;
  data: AssessmentData;
  onUpdate: (data: AssessmentData) => void;
  selectedExercise: number[] | 'ALL';
  onExerciseChange: (ex: number[] | 'ALL') => void;
  availableIndicators: string[];
  activeSchoolGroup: SchoolGroup;
  managementData?: ManagementState;
  isFocusMode: boolean;
  setIsFocusMode: (focus: boolean) => void;
  onYearChange: (y: string) => void;
  onTermChange: (t: string) => void;
  onMonthChange: (m: string) => void;
  onWeekChange: (w: string) => void;
  onTabChange: (tab: AssessmentType) => void;
  onSchoolGroupChange: (group: SchoolGroup) => void;
  onClassChange: (cls: string) => void;
  onSubjectChange: (sub: string) => void;
}

export type WizardStep = 'PROCESS' | 'TEMPORAL' | 'MODALITY' | 'DEPARTMENT' | 'SCOPE' | 'RIGOR' | 'SCORING';

const AssessmentSheet: React.FC<Props> = (props) => {
  const [wizardStep, setWizardStep] = useState<WizardStep>('PROCESS');
  const [viewMode, setViewMode] = useState<'TABLE' | 'INTERVIEW'>('TABLE');

  const next = (step: WizardStep) => setWizardStep(step);

  const renderContent = () => {
    switch (wizardStep) {
      case 'PROCESS':
        return (
          <WizardProcess 
            onSelect={(mode) => { setViewMode(mode); next('TEMPORAL'); }} 
          />
        );
      case 'TEMPORAL':
        return (
          <WizardTemporal 
            data={props.data} 
            onYearChange={props.onYearChange}
            onTermChange={props.onTermChange}
            onMonthChange={props.onMonthChange}
            onNext={() => next('MODALITY')}
            onBack={() => next('PROCESS')}
          />
        );
      case 'MODALITY':
        return (
          <WizardModality 
            currentType={props.type}
            onSelect={(type) => { props.onTabChange(type); next('DEPARTMENT'); }}
            onBack={() => next('TEMPORAL')}
          />
        );
      case 'DEPARTMENT':
        return (
          <WizardDepartment 
            activeGroup={props.activeSchoolGroup}
            onSelect={(group) => { props.onSchoolGroupChange(group); next('SCOPE'); }}
            onBack={() => next('MODALITY')}
          />
        );
      case 'SCOPE':
        return (
          <WizardScope 
            data={props.data}
            activeGroup={props.activeSchoolGroup}
            onClassChange={props.onClassChange}
            onSubjectChange={props.onSubjectChange}
            onWeekChange={props.onWeekChange}
            onNext={() => next('RIGOR')}
            onBack={() => next('DEPARTMENT')}
          />
        );
      case 'RIGOR':
        return (
          <WizardRigor 
            data={props.data}
            type={props.type}
            availableIndicators={props.availableIndicators}
            onUpdate={props.onUpdate}
            onNext={() => next('SCORING')}
            onBack={() => next('SCOPE')}
          />
        );
      case 'SCORING':
        return (
          <ScoringDesk 
            {...props}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onExit={() => next('RIGOR')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-[500px] transition-all duration-700 ${props.isFocusMode ? 'bg-slate-950' : 'bg-white'}`}>
      <div className={`max-w-6xl mx-auto ${props.isFocusMode ? 'py-0' : 'py-6 md:py-8'}`}>
        {!props.isFocusMode && wizardStep !== 'SCORING' && (
          <div className="flex justify-center mb-6 md:mb-12 overflow-x-auto scrollbar-hide px-2">
            <div className="flex bg-slate-100 p-1 rounded-full shadow-inner border border-slate-200">
              {(['PROCESS', 'TEMPORAL', 'MODALITY', 'DEPARTMENT', 'SCOPE', 'RIGOR'] as WizardStep[]).map((s, idx) => (
                <div key={s} className={`px-4 md:px-5 py-2 rounded-full text-[7px] md:text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${wizardStep === s ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400'}`}>
                  {idx + 1}. {s.charAt(0)}{s.slice(1).toLowerCase()}
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="px-2 md:px-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AssessmentSheet;