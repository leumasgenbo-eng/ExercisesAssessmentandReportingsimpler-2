/**
 * SSMAP CORE SCHEMA v9.5.0
 * United Baylor Academy - Daily Activity Pulse System
 */

export type AssessmentType = 'CLASS' | 'HOME' | 'PROJECT' | 'CRITERION';

export type SchoolGroup = 'DAYCARE' | 'KINDERGARTEN' | 'LOWER_BASIC' | 'UPPER_BASIC' | 'JHS';

export type FacilitatorCategory = 
  | 'DAYCARE_FACILITATOR' 
  | 'KG_FACILITATOR' 
  | 'BASIC_SUBJECT_LEVEL' 
  | 'JHS_SPECIALIST'      
  | 'ADMINISTRATOR';

export type FacilitatorRoleType = 'CLASS_BASED' | 'SUBJECT_BASED';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME';

export type UserRole = 'super_admin' | 'school_admin' | 'facilitator' | 'pupil';

export type ManagementSubView = 'COMPLIANCE' | 'PLANNING' | 'SUBJECT_MAPPING';

export interface UserSession {
  role: UserRole;
  nodeName: string;
  nodeId: string;
  hubId?: string;
  facilitatorId?: string;
  facilitatorName?: string;
  facilitatorCategory?: FacilitatorCategory;
  pupilId?: string;
  meritBalance?: number;    // v9.5 Financials
  monetaryBalance?: number; // v9.5 Financials
}

export interface Staff {
  id: string;               
  name: string;
  role: string;
  category: FacilitatorCategory; 
  email: string;
  uniqueCode: string;       
  meritBalance?: number;
  monetaryBalance?: number;
}

export interface MasterPupilEntry {
  studentId: string;        
  name: string;
  gender: 'M' | 'F' | 'Other';
  isJhsLevel: boolean;      
}

export interface InterventionRecord {
  id: string;
  date: string;
  week: string;
  subject: string;
  reasonCategory: string;
  actionTaken: string;
  notes: string;
  facilitator: string;
}

export interface Pupil {
  id: string;               
  studentId: string;        
  name: string;
  gender?: 'M' | 'F' | 'Other';
  bookOpen?: boolean;       
  scores: Record<number, string>; 
  interventions?: InterventionRecord[];
  correctionStatus?: Record<number, { done: boolean; marked: boolean }>;
  scoreReasons?: Record<number, string>;
  interventionReason?: string;
}

export interface ExerciseMetadata {
  id: number;
  date: string;
  maxScore: string;
  indicatorCodes?: string[]; 
  skillLabel?: string;
}

export interface AssessmentAttachment {
  name: string;
  data: string;
  mimeType: string;
}

export interface AssessmentData {
  term: string;
  year: string;
  month: string;
  week: string;
  className: string;
  facilitator: string;
  subject?: string;
  exercises: Record<number, ExerciseMetadata>;
  pupils: Pupil[];
  attachment?: AssessmentAttachment;
}

export interface Message {
  id: string;
  from: string;
  to: 'ADMIN' | 'FACILITATORS';
  text: string;
  timestamp: string;
  read: boolean;
}

export interface RegisteredSchool {
  id: string;
  name: string;
  location: string;
  timestamp: string;
  email?: string;
  contact?: string;
  notified?: boolean;
}

export type PlanningRemarks = 'Completed successfully' | 'Partially completed' | 'Uncompleted' | 'Repeated' | '';

export interface WeeklyMapping {
  id: string;
  className: string;
  subject: string;
  week: string;
  weekStartDate?: string;
  weekEndDate?: string;
  strand: string;
  substrand: string;
  contentStandard: string;
  indicators: string;
  resources: string[];
  pages: string;
  areasCovered: string;
  remarks: PlanningRemarks;
  classWorkCount: number;
  homeWorkCount: number;
  projectWorkCount: number;
  bloomsLevels?: string[];
}

export interface FacilitatorSubjectMapping {
  id: string;
  staffId: string;
  className: string;
  subjectId: string;
  type: FacilitatorRoleType;
  employmentType: EmploymentType;
}

export interface ManagementState {
  settings: {
    name: string;
    institutionalId: string;
    hubId: string;
    currentTerm: string;
    currentYear: string;
    activeMonth: string;
    poorPerformanceThreshold: number;
    poorPerformanceFrequency: number;
    complianceThreshold: number;
    slogan?: string;
    logo?: string;
    address?: string;
    contact?: string;
    email?: string;
    website?: string;
    excludedDepartments?: string[];
    announcement?: {
      id: string;
      text: string;
      timestamp: string;
      active: boolean;
    };
  };
  staff: Staff[];
  subjects: { id: string; name: string }[];
  mappings: FacilitatorSubjectMapping[];
  weeklyMappings: WeeklyMapping[];
  masterPupils: Record<string, MasterPupilEntry[]>;
  messages: Message[];
  superAdminRegistry?: RegisteredSchool[];
  logs?: any[];
  curriculum?: any[];
}

export interface AppState {
  classWork: Record<string, AssessmentData>;
  homeWork: Record<string, AssessmentData>;
  projectWork: Record<string, AssessmentData>;
  criterionWork: Record<string, AssessmentData>;
  bookCountRecords: Record<string, any>;
  management: ManagementState;
}