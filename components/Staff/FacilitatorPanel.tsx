
import React, { useState } from 'react';
import { ManagementState, AppState, FacilitatorRoleType, EmploymentType } from '../../types';
import StaffRoster from './StaffRoster';
import StaffSummary from './StaffSummary';
import StaffCompliance from './StaffCompliance';

interface Props {
  data: ManagementState;
  onUpdate: (data: ManagementState) => void;
  fullAppState?: AppState;
}

type StaffSubTab = 'ROSTER' | 'SUMMARY' | 'COMPLIANCE';

const FacilitatorPanel: React.FC<Props> = ({ data, onUpdate, fullAppState }) => {
  const [activeSubTab, setActiveSubTab] = useState<StaffSubTab>('ROSTER');
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [activeMappingType, setActiveMappingType] = useState<FacilitatorRoleType>('CLASS_BASED');
  const [activeEmployment, setActiveEmployment] = useState<EmploymentType>('FULL_TIME');

  return (
    <div className="animate-in space-y-8 pb-20">
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Staff Roster</h2>
          <p className="text-[10px] font-bold text-sky-600 uppercase tracking-[0.3em] mt-2">United Baylor Institutional Intelligence</p>
        </div>
        <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 shadow-inner no-print">
          <button onClick={() => setActiveSubTab('ROSTER')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'ROSTER' ? 'bg-sky-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Roster</button>
          <button onClick={() => setActiveSubTab('SUMMARY')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'SUMMARY' ? 'bg-sky-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Summary</button>
          <button onClick={() => setActiveSubTab('COMPLIANCE')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === 'COMPLIANCE' ? 'bg-sky-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Compliance</button>
        </div>
      </div>

      {activeSubTab === 'ROSTER' && (
        <StaffRoster 
          data={data} 
          onUpdate={onUpdate} 
          selectedStaffId={selectedStaffId} 
          // Fix: Removed extraneous props 'onOpenMatrix' and 'onOpenStats' and wrapped 'onSelectStaff' to fix type mismatch
          onSelectStaff={(id) => setSelectedStaffId(id)} 
          activeMappingType={activeMappingType} 
          setActiveMappingType={setActiveMappingType} 
          activeEmployment={activeEmployment} 
          setActiveEmployment={setActiveEmployment} 
        />
      )}
      {activeSubTab === 'SUMMARY' && <StaffSummary data={data} fullAppState={fullAppState} />}
      {activeSubTab === 'COMPLIANCE' && <StaffCompliance data={data} fullAppState={fullAppState} />}
    </div>
  );
};

export default FacilitatorPanel;
