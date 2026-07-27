/**
 * types/api.ts
 * Mirrors the backend DTO shapes used in robot-recommendation-api.
 */

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

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  role: 'ADMIN' | 'SPECIALIST';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'ADMIN' | 'SPECIALIST';
}

/**
 * Public self-service sign-up payload.
 * NOTE: the backend does not expose `POST /api/v1/auth/register` yet — this
 * shape is defined ahead of time so the /register page can be wired with a
 * single flag flip once that endpoint exists. No `role` here: a public sign-up
 * would default server-side (e.g. SPECIALIST) rather than letting users self-assign.
 */
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

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

export type RobotType = 'CLEANING' | 'DELIVERY' | 'MOWING';

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
}

export interface RobotUnitResponse {
  id: string;
  serialNumber: string;
  brand: string;
  model: string | null;
  name: string | null;
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
}

// Edit an existing robot — serial number is immutable, so it is not included.
export interface UpdateRobotRequest {
  brand: string;
  model?: string | null;
  name?: string | null;
  customerProfileId: string;
  site?: string | null;
  reportCadence?: ReportCadence | null;
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

/** The one-time response when a key is minted — carries the plaintext apiKey. */
export interface CreatedApiKeyResponse {
  id: string;
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
  skipped: number;
}

/** Aggregate outcome of a fleet-wide sync run. */
export interface TelemetrySyncSummary {
  from: string;
  to: string;
  robotsSynced: number;
  robotsSkipped: number;
  robotsFailed: number;
  saved: number;
  duplicatesSkipped: number;
  durationMs: number;
}

// Automated report delivery history (report_sends)
export type ReportSendStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface ReportSend {
  id: string;
  customerProfileId: string;
  customerName: string;
  reportMonth: string;
  status: ReportSendStatus;
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
