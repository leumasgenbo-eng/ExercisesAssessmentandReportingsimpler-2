/**
 * SSMAP CORE SCHEMA v7.5.0
 * United Baylor Academy - Daily Activity Pulse System
 * 
 * Note: This system tracks DAILY CLASSROOM ACTIVITIES.
 * High-stakes Mock/Test data resides in the companion Assessment Node.
 */

// --- ENUMERATIONS & LITERALS ---

export type AssessmentType = 'CLASS' | 'HOME' | 'PROJECT' | 'CRITERION';

export type SchoolGroup = 'DAYCARE' | 'KINDERGARTEN' | 'LOWER_BASIC' | 'UPPER_BASIC' | 'JHS';

/**
 * Facilitator Category distinguishes staff roles within the same node
 */
export type FacilitatorCategory = 
  | 'DAYCARE_FACILITATOR' 
  | 'KG_FACILITATOR' 
  | 'BASIC_SUBJECT_LEVEL' // Basic 1 - 6
  | 'JHS_SPECIALIST'      // Basic 7 - 9
  | 'ADMINISTRATOR';

export type FacilitatorRoleType = 'CLASS_BASED' | 'SUBJECT_BASED';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME';

export type UserRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'FACILITATOR' | 'PUPIL';

export type ManagementSubView = 'COMPLIANCE' | 'PLANNING' | 'SUBJECT_MAPPING';

// --- IDENTITY & SESSION SCHEMA ---

export interface UserSession {
  role: UserRole;
  nodeName: string;
  nodeId: string;
  facilitatorId?: string;
  facilitatorName?: string;
  facilitatorCategory?: FacilitatorCategory;
  pupilId?: string;
}

/**
 * Staff Identity with Teaching Category to prevent role overlap on the same node
 */
export interface Staff {
  id: string;               // Global UID
  name: string;
  role: string;
  category: FacilitatorCategory; 
  email: string;
  uniqueCode: string;       // Local Node Auth Token
}

// --- PUPIL SCHEMA (Cross-App Integrity) ---

export interface MasterPupilEntry {
  studentId: string;        // SHARED ID for Basic 9 across apps
  name: string;
  gender: 'M' | 'F' | 'Other';
  isJhsLevel: boolean;      // If true, uses shared studentId protocol
}

/**
 * Added missing InterventionRecord type
 */
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
  id: string;               // Local activity record ID
  studentId: string;        // Shared identifier (Basic 9 cross-app)
  name: string;
  gender?: 'M' | 'F' | 'Other';
  bookOpen?: boolean;       
  scores: Record<number, string>; 
  interventions?: InterventionRecord[];
  correctionStatus?: Record<number, { done: boolean; marked: boolean }>;
  /**
   * Added missing properties to Pupil interface
   */
  scoreReasons?: Record<number, string>;
  interventionReason?: string;
}

// --- CORE SYSTEM STATE ---

export interface ExerciseMetadata {
  id: number;
  date: string;
  maxScore: string;
  indicatorCodes?: string[]; 
  /**
   * Added skillLabel for criterion based assessments
   */
  skillLabel?: string;
}

/**
 * Added missing AssessmentAttachment type
 */
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
  /**
   * Added attachment property
   */
  attachment?: AssessmentAttachment;
}

/**
 * Added missing Message interface
 */
export interface Message {
  id: string;
  from: string;
  to: 'ADMIN' | 'FACILITATORS';
  text: string;
  timestamp: string;
  read: boolean;
}

/**
 * Added missing RegisteredSchool interface
 */
export interface RegisteredSchool {
  id: string;
  name: string;
  location: string;
  timestamp: string;
  email?: string;
  contact?: string;
  notified?: boolean;
}

/**
 * Added missing planning types
 */
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
    currentTerm: string;
    currentYear: string;
    activeMonth: string;
    poorPerformanceThreshold: number;
    poorPerformanceFrequency: number;
    complianceThreshold: number;
    /**
     * Added missing settings properties
     */
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
  /**
   * Added correct types for mappings
   */
  mappings: FacilitatorSubjectMapping[];
  weeklyMappings: WeeklyMapping[];
  masterPupils: Record<string, MasterPupilEntry[]>;
  messages: Message[];
  /**
   * Added registry and logs for administrative tracking
   */
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