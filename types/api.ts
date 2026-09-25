/**
 * types/api.ts
 * Mirrors the backend DTO shapes used in robot-recommendation-api.
 */

import type { MonthlyPerformanceReport } from '@/lib/reports/types';

/* ─── Common wrappers ─────────────────────────────────────────────────────── */

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

/* ─── Auth ────────────────────────────────────────────────────────────────── */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  user: UserResponse;
}

/**
 * Mirrors the backend's Role enum. There is no SPECIALIST - the RE team signs in
 * as RAASPAL_TEAM, and INVENTORY_STAFF is the RIMS warehouse login, which shares
 * this backend but may not email customers.
 */
export type UserRole = 'ADMIN' | 'RAASPAL_TEAM' | 'CUSTOMER' | 'INVENTORY_STAFF';

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

/** Self-service only: the account is always the caller's own, so there is no id. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/*
 * RegisterRequest was removed along with the /register page. This is an internal
 * platform: accounts are created by an admin via CreateUserRequest against
 * POST /api/v1/users (now ADMIN-only). There is deliberately no public signup.
 */

/* ─── File upload ─────────────────────────────────────────────────────────── */

export interface FileUploadResponse {
  id: string;
  originalFileName: string;
  storedFileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedById: string;
}

/* ─── Requirements ────────────────────────────────────────────────────────── */

/** Mirrors the backend `RobotType` enum. Both must be changed together. */
export type RobotType =
  | 'CLEANING'
  | 'CLEANING_EQUIPMENT'
  | 'DELIVERY'
  | 'MOWING'
  | 'SECURITY'
  | 'COOKING'
  | 'RECEPTION';

export interface RequirementResponse {
  id: string;
  robotType: RobotType;
  rawInput: string | null;
  extractedData: Record<string, unknown> | null;
  sourceFileId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

/* ─── Robots ──────────────────────────────────────────────────────────────── */

export type TestStatus = 'DRAFT' | 'PENDING' | 'UNDER_TESTING' | 'VERIFIED' | 'REJECTED';
export type BudgetBand = 'LOW' | 'MEDIUM' | 'MODERATE' | 'HIGH' | 'PREMIUM';

export interface RobotResponse {
  id: string;
  brand: string;
  model: string;
  robotType: RobotType;
  testStatus: TestStatus;
  priceBand: BudgetBand;
  rentalPrice: number | null;
  sellingPrice: number | null;
  imageUrl: string | null;
  datasheetUrl: string | null;
  createdAt: string;
  spec: RobotSpecResponse | null;
}

/**
 * One model's row in the spec matrix.
 *
 * `specs` is deliberately untyped: it comes from `to_jsonb(robot_specs_cleaning)`,
 * so the keys are database column names and the set changes whenever the datasheet
 * gains a field. Presentation metadata (label, unit, group) lives in
 * `lib/robot-spec-fields.ts`, keyed by those same column names.
 */
export interface RobotSpecMatrixRow {
  robotId: string;
  brand: string;
  model: string;
  testStatus: TestStatus;
  specs: Record<string, string | number | boolean | null>;
}

export interface RobotSpecResponse {
  id: string;
  robotId: string;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  robotWeightKg: number | null;
  widthCleaningMm: number | null;
  brushPressureKg: number | null;
  vacuumPressureKpa: number | null;
  speedMs: number | null;
  noiseLevelDb: number | null;
  workStation: boolean | null;
  dockCharge: boolean | null;
  manualCharge: boolean | null;
  cleaningEfficiencySweepSqmH: number | null;
  cleaningEfficiencyScrubSqmH: number | null;
  cleaningEfficiencyMopSqmH: number | null;
  cleaningEfficiencySweepScrubSqmH: number | null;
  cleaningEfficiencyVacuumSqmH: number | null;
  tankCapacityCleanL: number | null;
  tankCapacityWasteL: number | null;
  tankCapacityTrashL: number | null;
  tankCapacityDustBagL: number | null;
  cleaningFunctionSweepNoVacuum: boolean | null;
  cleaningFunctionSweepVacuum: boolean | null;
  cleaningFunctionMopDry: boolean | null;
  cleaningFunctionMopWet: boolean | null;
  cleaningFunctionScrubBrushRoller: boolean | null;
  cleaningFunctionScrubBrushDisc: boolean | null;
  navigationLidar2d: boolean | null;
  navigationLidar3d: boolean | null;
  navigationCameraVslam: boolean | null;
  batteryType: string | null;
  batteryVoltageV: number | null;
  batteryCapacityAh: number | null;
  batteryChargingTimeHr: number | null;
  batteryWorkTimeSweepHr: number | null;
  batteryWorkTimeScrubHr: number | null;
  batteryWorkTimeSweepVacuumHr: number | null;
  minimumPassableWidthMm: number | null;
  minimumPassableHeightMm: number | null;
  maximumNarrowCrossMm: number | null;
  minimumTurnWidthMm: number | null;
  minimumEdgeFromWallMm: number | null;
  maximumStepHeightMm: number | null;
  slopeAngleDeg: number | null;
  spotAi: boolean | null;
  outdoorIndoor: string | null;
  ipRating: string | null;
  hepa: boolean | null;
  floorTypePavingBlocks: boolean | null;
  floorTypeGranite: boolean | null;
  floorTypeMarble: boolean | null;
  floorTypeTerrazzo: boolean | null;
  floorTypeTerracotta: boolean | null;
  floorTypeCeramic: boolean | null;
  floorTypeSmoothConcrete: boolean | null;
  floorTypeCoarseConcrete: boolean | null;
  floorTypeStampedConcrete: boolean | null;
  floorTypeAsphalt: boolean | null;
  floorTypeEpoxy: boolean | null;
  floorTypeTile: boolean | null;
  floorTypeShortCarpet: boolean | null;
  floorTypeLongCarpet: boolean | null;
  floorTypeSpc: boolean | null;
  floorTypeLaminate: boolean | null;
  floorTypeVinyl: boolean | null;
  floorLayout2x2: boolean | null;
  floorLayout4x4: boolean | null;
  floorLayout8x8: boolean | null;
  floorLayout10x10: boolean | null;
  floorLayout12x12: boolean | null;
  floorLayout20x20: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface RobotSpecRequest {
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  robotWeightKg?: number | null;
  widthCleaningMm?: number | null;
  brushPressureKg?: number | null;
  vacuumPressureKpa?: number | null;
  speedMs?: number | null;
  noiseLevelDb?: number | null;
  workStation?: boolean | null;
  dockCharge?: boolean | null;
  manualCharge?: boolean | null;
  cleaningEfficiencySweepSqmH?: number | null;
  cleaningEfficiencyScrubSqmH?: number | null;
  cleaningEfficiencyMopSqmH?: number | null;
  cleaningEfficiencySweepScrubSqmH?: number | null;
  cleaningEfficiencyVacuumSqmH?: number | null;
  tankCapacityCleanL?: number | null;
  tankCapacityWasteL?: number | null;
  tankCapacityTrashL?: number | null;
  tankCapacityDustBagL?: number | null;
  cleaningFunctionSweepNoVacuum?: boolean | null;
  cleaningFunctionSweepVacuum?: boolean | null;
  cleaningFunctionMopDry?: boolean | null;
  cleaningFunctionMopWet?: boolean | null;
  cleaningFunctionScrubBrushRoller?: boolean | null;
  cleaningFunctionScrubBrushDisc?: boolean | null;
  navigationLidar2d?: boolean | null;
  navigationLidar3d?: boolean | null;
  navigationCameraVslam?: boolean | null;
  batteryType?: string | null;
  batteryVoltageV?: number | null;
  batteryCapacityAh?: number | null;
  batteryChargingTimeHr?: number | null;
  batteryWorkTimeSweepHr?: number | null;
  batteryWorkTimeScrubHr?: number | null;
  batteryWorkTimeSweepVacuumHr?: number | null;
  minimumPassableWidthMm?: number | null;
  minimumPassableHeightMm?: number | null;
  maximumNarrowCrossMm?: number | null;
  minimumTurnWidthMm?: number | null;
  minimumEdgeFromWallMm?: number | null;
  maximumStepHeightMm?: number | null;
  slopeAngleDeg?: number | null;
  spotAi?: boolean | null;
  outdoorIndoor?: string | null;
  ipRating?: string | null;
  hepa?: boolean | null;
  floorTypePavingBlocks?: boolean | null;
  floorTypeGranite?: boolean | null;
  floorTypeMarble?: boolean | null;
  floorTypeTerrazzo?: boolean | null;
  floorTypeTerracotta?: boolean | null;
  floorTypeCeramic?: boolean | null;
  floorTypeSmoothConcrete?: boolean | null;
  floorTypeCoarseConcrete?: boolean | null;
  floorTypeStampedConcrete?: boolean | null;
  floorTypeAsphalt?: boolean | null;
  floorTypeEpoxy?: boolean | null;
  floorTypeTile?: boolean | null;
  floorTypeShortCarpet?: boolean | null;
  floorTypeLongCarpet?: boolean | null;
  floorTypeSpc?: boolean | null;
  floorTypeLaminate?: boolean | null;
  floorTypeVinyl?: boolean | null;
  floorLayout2x2?: boolean | null;
  floorLayout4x4?: boolean | null;
  floorLayout8x8?: boolean | null;
  floorLayout10x10?: boolean | null;
  floorLayout12x12?: boolean | null;
  floorLayout20x20?: boolean | null;
}

export interface RobotRequest {
  brand: string;
  model: string;
  robotType: RobotType;
  testStatus?: TestStatus | null;
  priceBand?: BudgetBand | null;
  rentalPrice?: number | null;
  sellingPrice?: number | null;
  imageUrl?: string | null;
  datasheetUrl?: string | null;
  spec?: RobotSpecRequest | null;
}

export interface RobotImportResult {
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/* ─── Recommendations ─────────────────────────────────────────────────────── */

export type RecommendationStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface RecommendationItemResponse {
  id: string;
  recommendationId: string;
  robot: RobotResponse;
  rankPosition: number;
  totalScore: number | null;
  aiReasoning: string | null;
  fitLevel: string | null;
  proposalTitle: string | null;
  proposalSummary: string | null;
  whyRecommended: string | null;
  customerSummary: string | null;
  matchedRequirements: string | null;
  businessValue: string | null;
  limitations: string | null;
  missingInformation: string | null;
  suggestedNextStep: string | null;
  createdAt: string;
}

export interface RecommendationResponse {
  id: string;
  name: string | null;
  requirementId: string;
  status: RecommendationStatus;
  aiExplanation: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  options: RecommendationItemResponse[];
}

/* ─── Proposals ───────────────────────────────────────────────────────────── */

export interface GenerateProposalRequest {
  recommendationItemId: string;
  proposalTemplateId?: string | null;
}

export interface GeneratedProposalResponse {
  id: string;
  recommendationId: string | null;
  recommendationName: string | null;
  recommendationItemId: string | null;
  requirementId: string | null;
  proposalTemplateId: string | null;
  title: string | null;
  proposalContent: string | null;
  contentFormat: string | null;
  status: string;
  generatedById: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ─── Translation ─────────────────────────────────────────────────────────── */

export interface TranslationRequest {
  texts: string[];
}

export interface TranslationResponse {
  translations: string[];
}

/* ─── CVTE C3 status ──────────────────────────────────────────────────────── */
/* Kept separate from Robot/RobotSpec — see [[CvteDevice]] on the backend. */

export interface CvteDeviceResponse {
  id: string;
  /** String, not number — Kava device IDs exceed JS's safe integer range (see backend CvteDeviceResponse). */
  deviceId: string;
  factorySn: string;
  deviceName: string | null;
  orgCode: string | null;
  onlineStatus: boolean | null;
  runningState: string | null;
  batteryPercentage: number | null;
  lastCheckedAt: string | null;
  lastMessage: string | null;
}

export interface CvteDeviceSyncRequest {
  factorySn?: string;
  deviceName?: string;
  orgCode?: string;
}

/* ─── Customers ───────────────────────────────────────────────────────────── */
/* Mirrors customer/dto/CustomerResponse + CustomerRequest on the backend. */

export interface CustomerResponse {
  id: string;
  companyName: string;
  industry: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  branch: string | null;
  notes: string | null;
  /** Active deployments (robots) currently linked to this customer. */
  robotCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementResult {
  sent: number;
  failed: number;
  items: {
    customerName: string;
    recipients: string;
    ok: boolean;
    error: string | null;
  }[];
}

export interface CustomerRequest {
  companyName: string;
  industry?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  branch?: string | null;
  notes?: string | null;
}

/* ─── Robot units & deployments ───────────────────────────────────────────── */
/* Mirrors robotunit/dto/RobotUnitResponse on the backend. */

export type ReportCadence = 'MONTHLY' | 'WEEKLY' | 'OFF';

/** The active deployment side of a robot link (its owning customer + cadence). */
export interface DeploymentInfo {
  deploymentId: string;
  customerProfileId: string;
  customerName: string;
  site: string | null;
  reportCadence: ReportCadence;
  active: boolean;
  /** Distributor/service partner servicing this deployment; null = RAASPAL-direct. */
  partnerId: string | null;
  /**
   * ISO date this robot's contract with the customer began. The first monthly report
   * clips to it, so a robot deployed mid-month does not report work done before the
   * customer had it. Null reports whole months.
   */
  contractStartDate: string | null;
  /**
   * ISO date the contract ends, inclusive. The last monthly report clips to it, and
   * a month that begins after it produces no report. Null = no end known.
   */
  contractEndDate: string | null;
  /** NONE (no end date) / ACTIVE / ENDING_SOON (within 30 days) / ENDED, as of today. */
  contractStatus: ContractStatus;
  /** Days from today to the end date; negative once ended; null when no end date. */
  daysToContractEnd: number | null;
}

export type ContractStatus = 'NONE' | 'ACTIVE' | 'ENDING_SOON' | 'ENDED';

export interface RobotUnitResponse {
  id: string;
  serialNumber: string;
  brand: string;
  model: string | null;
  name: string | null;
  /** CLEANING or DELIVERY. Delivery robots are left out of the cleaning report email. */
  robotType: RobotType;
  /** Null when the robot is registered but not deployed to a customer. */
  deployment: DeploymentInfo | null;
}

export interface RegisterRobotRequest {
  serialNumber: string;
  brand: string;
  model?: string | null;
  name?: string | null;
  customerProfileId: string;
  site?: string | null;
  reportCadence?: ReportCadence | null;
  /** ISO date (YYYY-MM-DD), or null for whole-month reports. */
  contractStartDate?: string | null;
  /** ISO date (YYYY-MM-DD) the contract ends, inclusive; null = no end known. */
  contractEndDate?: string | null;
}

// Edit an existing robot — serial number is immutable, so it is not included.
export interface UpdateRobotRequest {
  brand: string;
  model?: string | null;
  name?: string | null;
  customerProfileId: string;
  site?: string | null;
  reportCadence?: ReportCadence | null;
  /** ISO date (YYYY-MM-DD), or null for whole-month reports. */
  contractStartDate?: string | null;
  /** ISO date (YYYY-MM-DD) the contract ends, inclusive; null = no end known. */
  contractEndDate?: string | null;
}

/* ─── Partners (distributor/service partners + their API keys) ─────────────── */
/* Mirrors the partner/* DTOs on the backend. */

export interface PartnerResponse {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
}

/** Metadata for one API key — never the secret (only the display prefix). */
export interface ApiKeyResponse {
  id: string;
  /** Public OAuth client identifier — safe to show, and re-readable later. */
  clientId: string | null;
  keyPrefix: string;
  label: string | null;
  /** Live: active, not revoked, and not expired. */
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  /** When the key stops working; null = never expires. */
  expiresAt: string | null;
  expired: boolean;
  /** Rotation nudge: still usable but expiring within a week. */
  expiringSoon: boolean;
}

/** The one-time response when a credential is minted — carries the plaintext secret. */
export interface CreatedApiKeyResponse {
  id: string;
  /** Public OAuth client identifier — pairs with apiKey at the token endpoint. */
  clientId: string;
  /** The client secret. Shown once and never recoverable. */
  apiKey: string;
  keyPrefix: string;
  label: string | null;
  expiresAt: string | null;
  warning: string;
}

export interface CreatePartnerRequest {
  name: string;
}

export interface UpdatePartnerRequest {
  name?: string | null;
  active?: boolean | null;
}

export interface CreateApiKeyRequest {
  label?: string | null;
  /** Optional lifetime in days; omit for a key that never expires. */
  expiresInDays?: number | null;
}

/* ─── Telemetry sync ──────────────────────────────────────────────────────── */

/** Result of syncing one robot from its brand API. */
export interface TelemetrySyncResult {
  serialNumber: string;
  saved: number;
  /** Existing rows re-read and overwritten (refresh mode only). */
  updated: number;
  skipped: number;
}

/** Live progress of a background fleet sync, plus the last finished summary. */
export interface TelemetrySyncStatus {
  running: boolean;
  processed: number;
  total: number;
  lastSummary: TelemetrySyncSummary | null;
}

/* ─── Robots with no data (the customer success worklist) ─────────────────── */

/** Why a robot logged nothing — the three cases that need different people. */
export type ZeroDataReason = 'NEVER_SYNCED' | 'SYNC_FAILING' | 'NO_TASKS';

export type FollowupStatus = 'TO_CONTACT' | 'CONTACTED' | 'RESOLVED';
export type FollowupOutcome =
  | 'ROBOT_OFFLINE'
  | 'IN_STORAGE'
  | 'CONTRACT_ENDED'
  | 'REGISTRATION_ERROR'
  | 'SYNC_PROBLEM'
  | 'OTHER';

/** One in-contract robot that logged no task in the month, with its follow-up. */
export interface ZeroDataRobot {
  robotUnitId: string;
  serialNumber: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  customerProfileId: string;
  customerName: string;
  site: string | null;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractStatus: ContractStatus;
  daysToContractEnd: number | null;
  /** Business-zone date of the last task it ever logged; null if never. */
  lastDataDate: string | null;
  daysSinceLastData: number | null;
  lastSyncAttemptAt: string | null;
  lastSyncSuccessAt: string | null;
  /** The last sync failure's message; null after a success. */
  lastSyncError: string | null;
  reason: ZeroDataReason;
  followupStatus: FollowupStatus | null;
  followupOutcome: FollowupOutcome | null;
  followupNote: string | null;
  followupUpdatedBy: string | null;
  followupUpdatedAt: string | null;
  /** Already held back from this month's customer report. */
  excludedFromReport: boolean;
}

export interface ZeroDataRobotsResponse {
  month: string;
  monthLabel: string;
  /** Active deployments whose contract overlaps the month. */
  inScope: number;
  zeroData: number;
  toContact: number;
  contacted: number;
  resolved: number;
  robots: ZeroDataRobot[];
}

export interface ZeroDataFollowupRequest {
  status: FollowupStatus;
  outcome?: FollowupOutcome | null;
  note?: string | null;
}

/* ─── Contracts ending / ended ────────────────────────────────────────────── */

export interface ExpiringContract {
  robotUnitId: string;
  serialNumber: string;
  name: string | null;
  brand: string | null;
  model: string | null;
  customerProfileId: string;
  customerName: string;
  site: string | null;
  contractStartDate: string | null;
  /** Null on the All view for a robot whose contract has no end date. */
  contractEndDate: string | null;
  /** Negative once ended; null when there is no end date. */
  daysToEnd: number | null;
  status: ContractStatus;
  /** When the ending-soon alert was emailed; null if not yet. */
  alertedAt: string | null;
  /** The signed contract PDF attached to this deployment; null if none. */
  document: ContractDocumentInfo | null;
  /** What the CS team has done about renewing; never null. */
  followup: ContractRenewalFollowup;
}

/**
 * A contract PDF as the Contracts page sees it. Never a link: the page asks for one
 * when somebody clicks, and gets a five-minute pre-signed URL into the private bucket.
 */
export interface ContractDocumentInfo {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedBy: string | null;
  uploadedAt: string;
  /** How many deployments share this document, this one included. */
  sharedWith: number;
}

/* ─── Renewal follow-up ─────────────────────────────────────────────────── */

/** Where the CS team is with a contract that is ending. NOT_CONTACTED is the unset state. */
export type ContractRenewalStatus = 'NOT_CONTACTED' | 'CONTACTED' | 'WILL_RENEW' | 'WILL_NOT_RENEW';

export interface ContractRenewalFollowup {
  status: ContractRenewalStatus;
  note: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface UpdateRenewalFollowupRequest {
  status: ContractRenewalStatus;
  note?: string | null;
  /** Also record it on the customer's other robots with the same contract dates. Default true. */
  applyToSameContract?: boolean;
}

export interface ContractRenewalFollowupUpdated {
  followup: ContractRenewalFollowup;
  deploymentsUpdated: number;
}

export interface ContractDocumentAttached {
  document: ContractDocumentInfo;
  deploymentsLinked: number;
}

export interface ContractExpiryResponse {
  asOf: string;
  windowDays: number;
  endingSoon: ExpiringContract[];
  ended: ExpiringContract[];
}

/** Every active deployment as a contract row, soonest end first, no-end-date last. */
export interface ContractListResponse {
  asOf: string;
  windowDays: number;
  contracts: ExpiringContract[];
}

/** Aggregate outcome of a fleet-wide sync run. */
export interface TelemetrySyncSummary {
  from: string;
  to: string;
  robotsSynced: number;
  robotsSkipped: number;
  robotsFailed: number;
  saved: number;
  /** Existing rows re-read and overwritten (refresh mode only). */
  updated: number;
  duplicatesSkipped: number;
  durationMs: number;
}

// Automated report delivery history (report_sends)
export type ReportSendStatus = 'SENT' | 'FAILED' | 'SKIPPED';

/**
 * BUNDLE is the month's deliverable (Manage automation / Company report). ROBOT_REPORT
 * is one robot's report sent from the Preview tab — in the history so it is visible,
 * but never counted as the customer having been delivered to.
 */
export type ReportSendKind = 'BUNDLE' | 'ROBOT_REPORT';

export interface ReportSend {
  id: string;
  customerProfileId: string;
  customerName: string;
  reportMonth: string;
  status: ReportSendStatus;
  kind: ReportSendKind;
  /** Set for ROBOT_REPORT rows only. */
  robotSerial: string | null;
  recipientEmail: string | null;
  errorMessage: string | null;
  sentAt: string;
}

/** Summary of a finished whole-month delivery run. */
export interface DeliveryRunSummary {
  month: string;
  sent: number;
  skipped: number;
  failed: number;
}

/** Whether a delivery run is executing, for which month, and the last finished summary. */
export interface DeliveryRunStatus {
  running: boolean;
  month: string | null;
  lastSummary: DeliveryRunSummary | null;
}

/* ─── AutoXing on-demand delivery report ──────────────────────────────────── */

/** "Right now" snapshot — shown in the operator UI, never in the printable report. */
export interface AutoxingLiveStatus {
  batteryPct: number | null;
  moveState: string | null;
  isOnline: boolean | null;
  isCharging: boolean | null;
  isEmergencyStop: boolean | null;
  isManualMode: boolean | null;
  errors: string[];
  timestamp: number | null;
}

export interface AutoxingCategoryStat {
  category: string;
  count: number;
  mileageMeters: number;
  durationSeconds: number;
}

export interface AutoxingDailyStat {
  date: string;
  count: number;
  mileageMeters: number;
  durationSeconds: number;
}

export interface AutoxingSummary {
  totalTasks: number;
  deliveryTasks: number;
  deliverySharePct: number;
  totalMileageMeters: number;
  totalDurationSeconds: number;
  activeDays: number;
  totalDays: number;
  tasksPerActiveDay: number;
  avgTaskSeconds: number;
  avgMileagePerActiveDayMeters: number;
  busiestDate: string | null;
  busiestCount: number;
  busiestMileageMeters: number;
  busiestDurationSeconds: number;
}

export interface AutoxingDeliveryReport {
  robotId: string;
  robotName: string;
  model: string | null;
  customerName: string;
  siteBranch: string;
  periodLabel: string;
  liveStatus: AutoxingLiveStatus | null;
  summary: AutoxingSummary;
  categories: AutoxingCategoryStat[];
  daily: AutoxingDailyStat[];
  note: string;
}

/* ─── Corrective Maintenance reports ──────────────────────────────────────── */

/**
 * What the AI pulled out of a pasted service ticket. Every field is nullable —
 * a real ticket often omits several, and the prompt returns null rather than
 * inventing a value. This is always reviewed before it becomes a CmReport.
 */
export interface CmReportDraft {
  reportDate: string | null;
  ticketNo: string | null;
  customerName: string | null;
  technicianName: string | null;
  robotModel: string | null;
  serialNumber: string | null;
  causeDetail: string | null;
  inspectionResult: string | null;
  /** Repair steps, already stripped of any "1." prefix — the report numbers them. */
  correctiveActions: string[];
  testResult: string | null;
}

/** Which synced monday board a ticket came from. */
export type CmTicketBoard = 'CLEANING' | 'DELIVERY';

/** One monday ticket a CM report can be started from (All Case group, as last synced). */
export interface CmTicketSummary {
  caseTicketId: string;
  /** The monday item id — what the report calls "Ticket No.". */
  caseId: string;
  board: CmTicketBoard;
  itemName: string | null;
  project: string | null;
  branch: string | null;
  province: string | null;
  robotModel: string | null;
  serialNumbers: string | null;
  status: string | null;
  supStatus: string | null;
  mainIssue: string | null;
  openDate: string | null;
  commentCount: number;
  lastCommentAt: string | null;
  /** A CM report with this ticket number already exists. */
  hasReport: boolean;
}

/** A report drafted from a ticket: the text it was read from, and the fields. */
export interface CmTicketDraft {
  ticket: CmTicketSummary;
  sourceText: string;
  draft: CmReportDraft;
}

export interface CmReportRequest {
  reportDate: string;
  ticketNo: string;
  customerName: string;
  technicianName: string;
  robotModel: string;
  serialNumber: string;
  causeDetail: string;
  inspectionResult: string;
  /** One repair step per line, unnumbered. */
  correctiveActions: string;
  testResult: string;
  sourceText: string;
  /** base64 data: URI, or '' to print a blank box for a wet signature. */
  providerSignature: string;
  receiverSignature: string;
}

export interface CmReportResponse {
  id: string;
  reportDate: string;
  ticketNo: string | null;
  customerName: string;
  technicianName: string | null;
  robotModel: string | null;
  serialNumber: string | null;
  causeDetail: string | null;
  inspectionResult: string | null;
  correctiveActions: string | null;
  testResult: string | null;
  /** Omitted on the history list, which serves summaries only. */
  sourceText: string | null;
  providerSignature: string | null;
  receiverSignature: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ─── Customer report bundle curation ─────────────────────────────────────── */

/**
 * One robot inside the staff review view of a customer's combined report.
 *
 * `hasData` is false when the robot logged no tasks that month — almost always
 * because it was offline. Its report still renders, as a page of zeros, which is
 * why the UI offers to hold it back.
 */
export interface CustomerBundleRobot {
  robotUnitId: string;
  serialNumber: string;
  robotName: string;
  site: string;
  hasData: boolean;
  excluded: boolean;
  report: MonthlyPerformanceReport;
}

export interface CustomerBundlePreview {
  customerProfileId: string;
  customerName: string;
  periodLabel: string;
  month: string;
  /** How many robots the customer would currently see. */
  includedCount: number;
  robots: CustomerBundleRobot[];
}

// Daily Pending Case Report

/** Mirrors the backend SlaStatus enum. UNKNOWN prints as a blank cell, not a word. */
export type SlaStatus = 'WITHIN' | 'BREACHED' | 'ON_HOLD' | 'UNKNOWN';

/**
 * One printed line of a pending-case report.
 *
 * Field order matches the Raw_Delivery sheet, so the table and the Excel agree.
 * `province` and `sourceItemId` are not printed on the sheet: the first explains why an
 * SLA cell is blank, the second links a row back to the ticket a fix belongs on.
 */
export interface CaseReportRow {
  no: number;
  project: string | null;
  branch: string | null;
  robot: string | null;
  serialNumber: string | null;
  problem: string | null;
  solution: string | null;
  openDate: string | null;
  reOnSite: string | null;
  /** Days since the open date, not counting it: a case opened today reads 0. */
  days: number | null;
  sla: SlaStatus;
  /** The sheet's own wording: 'over SLA', 'Within SLA', 'On Hold', or empty. */
  slaLabel: string;
  province: string | null;
  /**
   * On Hold only: which board the ticket came from. That sheet is the one that reads
   * two boards, so this drives its Cleaning/Delivery filter and the ticket link. Null on
   * every single-board sheet, and on rows frozen before the field existed.
   */
  board?: CaseBoard | null;
  /** AOTGA only. The board's Spare Parts Name. Null on every other sheet. */
  requiredPart?: string | null;
  /** AOTGA only. What the case is waiting on, in the RE team's words. */
  waiting?: string | null;
  /** AOTGA only. Whose court the wait is in: AOTGA, the supplier, or RAASPAL. */
  waitingFrom?: string | null;
  /** AOTGA only. When the part arrived; null while it is still on its way. */
  partReceived?: string | null;
  /** AOTGA only. Days since partReceived, counted like `days`. Null until received. */
  agingAfterReceived?: number | null;
  /**
   * The monday ticket id, or a `manual-…` id for a row a person added by hand
   * (see `isManualCaseRow`). Rows added by hand can be removed; board rows cannot.
   */
  sourceItemId: string | null;
  /** True once somebody has saved a correction; such a row survives a regeneration. */
  edited: boolean;
  /**
   * True once a person has taken this board row off the report. Still returned, so the
   * sheet can show what was removed and put it back; never on the Excel. Rows added by
   * hand are deleted outright instead. Absent on rows frozen before the field existed.
   */
  removed?: boolean;
}

/** Prefix of the ids the backend gives rows added by hand. */
export const MANUAL_CASE_ROW_PREFIX = 'manual-';

export type CaseBoard = 'CLEANING' | 'DELIVERY';

export function isManualCaseRow(row: Pick<CaseReportRow, 'sourceItemId'>): boolean {
  return row.sourceItemId?.startsWith(MANUAL_CASE_ROW_PREFIX) ?? false;
}

/**
 * A row as the edit form sends it, for a correction or a new row. The whole row goes
 * every time; a null `days` or `sla` asks the backend to recompute them from `openDate`
 * and `province`.
 */
export interface CaseRowEdit {
  project: string | null;
  branch: string | null;
  robot: string | null;
  serialNumber: string | null;
  problem: string | null;
  solution: string | null;
  openDate: string | null;
  reOnSite: string | null;
  days: number | null;
  sla: SlaStatus | null;
  province: string | null;
}
