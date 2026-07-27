/**
 * lib/api.ts
 * Axios instance pre-configured for the RAASPAL backend.
 *
 * - Base URL: http://localhost:8080 (overridable via NEXT_PUBLIC_API_URL)
 * - Request interceptor: attaches Authorization: Bearer <token> from localStorage
 * - Response interceptor: on 401 → clear stored token (but NOT auto-redirect
 *   because this code also runs on the server; redirects are handled by proxy.ts)
 */

import axios from 'axios';

// Opt a request out of the automatic network-error retry below — for
// long-running operations (e.g. a Gausium sync) where a timeout means "still
// working", not "flaky network", so retrying would just fire a second one.
declare module 'axios' {
  export interface AxiosRequestConfig {
    skipRetry?: boolean;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60_000,
});

/* ─── Request interceptor ─────────────────────────────────────────────────── */

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('raaspal_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

/* ─── Response interceptor ────────────────────────────────────────────────── */

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('raaspal_token');
    }

    // No response = network error (cold start / timeout). Retry once automatically,
    // unless the request opted out (skipRetry) — a slow long-running operation like
    // a Gausium sync isn't a flaky blip, and retrying it would fire a second one
    // while the first may still be running server-side.
    const isNetworkError = !error.response;
    const alreadyRetried = error.config?._retried;
    const skipRetry = error.config?.skipRetry;
    if (isNetworkError && !alreadyRetried && !skipRetry && error.config) {
      error.config._retried = true;
      await new Promise((r) => setTimeout(r, 3000));
      return api(error.config);
    }

    return Promise.reject(error as Error);
  },
);

/* ─── Typed helpers ───────────────────────────────────────────────────────── */

import type {
  ApiResponse,
  AutoxingDeliveryReport,
  AuthResponse,
  CreateUserRequest,
  CvteDeviceResponse,
  CvteDeviceSyncRequest,
  DeliveryRunStatus,
  FileUploadResponse,
  GenerateProposalRequest,
  GeneratedProposalResponse,
  LoginRequest,
  PagedResponse,
  PartnerResponse,
  ApiKeyResponse,
  CreatedApiKeyResponse,
  CreatePartnerRequest,
  UpdatePartnerRequest,
  CreateApiKeyRequest,
  RegisterRequest,
  RecommendationResponse,
  RequirementResponse,
  RobotImportResult,
  AnnouncementResult,
  CustomerRequest,
  CustomerResponse,
  RobotRequest,
  RobotResponse,
  RobotType,
  RobotUnitResponse,
  RegisterRobotRequest,
  UpdateRobotRequest,
  ReportCadence,
  ReportSend,
  TelemetrySyncSummary,
  TestStatus,
  TranslationResponse,
  UserResponse,
} from '@/types/api';
import type { MonthlyPerformanceReport } from '@/lib/reports/types';

// Users
export const userApi = {
  getAll: (page = 0, size = 50) =>
    api.get<ApiResponse<PagedResponse<UserResponse>>>('/api/v1/users', { params: { page, size, sort: 'createdAt,asc' } }),

  create: (body: CreateUserRequest) =>
    api.post<ApiResponse<UserResponse>>('/api/v1/users', body),
};

// Robots
export const robotApi = {
  getAll: (page = 0, size = 100) =>
    api.get<ApiResponse<PagedResponse<RobotResponse>>>('/api/v1/robots', { params: { page, size, sort: 'brand,asc' } }),

  getById: (id: string) =>
    api.get<ApiResponse<RobotResponse>>(`/api/v1/robots/${id}`),

  create: (body: RobotRequest) =>
    api.post<ApiResponse<RobotResponse>>('/api/v1/robots', body),

  update: (id: string, body: RobotRequest) =>
    api.put<ApiResponse<RobotResponse>>(`/api/v1/robots/${id}`, body),

  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/api/v1/robots/${id}`),

  importCatalog: (file: File, robotType: RobotType = 'CLEANING', testStatus: TestStatus = 'PENDING') => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<RobotImportResult>>(
      '/api/v1/robots/import',
      form,
      { headers: { 'Content-Type': undefined }, params: { robotType, testStatus } },
    );
  },
};

// Customers (admin CRUD — report recipients, not login accounts)
export const customerApi = {
  list: () =>
    api.get<ApiResponse<CustomerResponse[]>>('/api/v1/customers'),

  getById: (id: string) =>
    api.get<ApiResponse<CustomerResponse>>(`/api/v1/customers/${id}`),

  create: (body: CustomerRequest) =>
    api.post<ApiResponse<CustomerResponse>>('/api/v1/customers', body),

  update: (id: string, body: CustomerRequest) =>
    api.put<ApiResponse<CustomerResponse>>(`/api/v1/customers/${id}`, body),

  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/api/v1/customers/${id}`),

  /**
   * Send a plain-text announcement to selected customers. The email body is
   * EXACTLY `message` — no report links or template. Optional `cc` is added to
   * every email. Long timeout + skipRetry: sending to many customers takes a
   * while, and a retry would double-send.
   */
  sendAnnouncement: (body: {
    customerProfileIds: string[];
    subject: string;
    message: string;
    cc?: string[];
  }) =>
    api.post<ApiResponse<AnnouncementResult>>('/api/v1/customers/announcements', body, {
      timeout: 300_000,
      skipRetry: true,
    }),
};

// Robot units & deployments (register robots, link to customers, set cadence)
export const robotUnitApi = {
  /** List robots: all, or filtered by `customerId` (→ that customer's robots) or `serialNumber` (→ the robot + its customer). */
  list: (params?: { customerId?: string; serialNumber?: string }) =>
    api.get<ApiResponse<RobotUnitResponse[]>>('/api/v1/robot-units', { params }),

  register: (body: RegisterRobotRequest) =>
    api.post<ApiResponse<RobotUnitResponse>>('/api/v1/robot-units', body),

  update: (id: string, body: UpdateRobotRequest) =>
    api.put<ApiResponse<RobotUnitResponse>>(`/api/v1/robot-units/${id}`, body),

  updateCadence: (deploymentId: string, reportCadence: ReportCadence) =>
    api.patch<ApiResponse<RobotUnitResponse>>(`/api/v1/robot-units/deployments/${deploymentId}/cadence`, { reportCadence }),

  /**
   * Bulk cadence change. With no ids → every active deployment; with ids → just
   * that selection. Returns the count updated.
   */
  updateAllCadence: (reportCadence: ReportCadence, deploymentIds?: string[]) =>
    api.patch<ApiResponse<number>>('/api/v1/robot-units/deployments/cadence', { reportCadence, deploymentIds }),

  deactivate: (deploymentId: string) =>
    api.delete<ApiResponse<void>>(`/api/v1/robot-units/deployments/${deploymentId}`),
};

// Partners — distributor/service partners (e.g. PCS) and their API keys.
// Admin side only (JWT); the partner-facing /api/partner/v1 API is key-authed
// and never called from this app.
export const partnerApi = {
  list: () =>
    api.get<ApiResponse<PartnerResponse[]>>('/api/v1/partners'),

  create: (body: CreatePartnerRequest) =>
    api.post<ApiResponse<PartnerResponse>>('/api/v1/partners', body),

  /** Rename and/or enable/disable (disable = instant kill-switch for all its keys). */
  update: (id: string, body: UpdatePartnerRequest) =>
    api.patch<ApiResponse<PartnerResponse>>(`/api/v1/partners/${id}`, body),

  listKeys: (partnerId: string) =>
    api.get<ApiResponse<ApiKeyResponse[]>>(`/api/v1/partners/${partnerId}/keys`),

  /** Mint a key — the response carries the plaintext ONCE (never recoverable after). */
  createKey: (partnerId: string, body: CreateApiKeyRequest) =>
    api.post<ApiResponse<CreatedApiKeyResponse>>(`/api/v1/partners/${partnerId}/keys`, body),

  revokeKey: (keyId: string) =>
    api.delete<ApiResponse<void>>(`/api/v1/partners/keys/${keyId}`),

  /** Assign a deployment to a partner, or un-assign it (partnerId = null). */
  assignDeployment: (deploymentId: string, partnerId: string | null) =>
    api.put<ApiResponse<void>>(`/api/v1/partners/deployments/${deploymentId}`, { partnerId }),

  /** Bulk-assign many deployments to a partner in one call. Returns the count assigned. */
  assignDeployments: (partnerId: string, deploymentIds: string[]) =>
    api.put<ApiResponse<number>>(`/api/v1/partners/${partnerId}/deployments`, { deploymentIds }),
};

// Auth
export const authApi = {
  login: (body: LoginRequest) =>
    api.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', body),

  me: () =>
    api.get<ApiResponse<UserResponse>>('/api/v1/auth/me'),

  verifyPassword: (password: string) =>
    api.post<ApiResponse<void>>('/api/v1/auth/verify-password', { password }),

  /**
   * Public self-service registration.
   * ⚠ The backend endpoint does not exist yet — calling this today will 404.
   * The /register page keeps it behind a feature flag (REGISTRATION_ENABLED)
   * until `POST /api/v1/auth/register` ships and is whitelisted in SecurityConfig.
   */
  register: (body: RegisterRequest) =>
    api.post<ApiResponse<AuthResponse>>('/api/v1/auth/register', body),
};

// File upload
export const fileApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<FileUploadResponse>>(
      '/api/v1/files/upload',
      form,
      { headers: { 'Content-Type': undefined } },
    );
  },
};

// Requirements
export const requirementApi = {
  extractFromFile: (fileId: string, robotType: RobotType) =>
    api.post<ApiResponse<RequirementResponse>>(
      `/api/v1/requirements/extract-from-file/${fileId}`,
      { robotType },
    ),
};

// Recommendations
export const recommendationApi = {
  generate: (requirementId: string, body?: { name?: string; optionCount?: number }) =>
    api.post<ApiResponse<RecommendationResponse>>(
      `/api/v1/recommendations/generate/${requirementId}`,
      body ?? {},
    ),

  getAll: (page = 0, size = 20) =>
    api.get<ApiResponse<PagedResponse<RecommendationResponse>>>('/api/v1/recommendations', { params: { page, size, sort: 'createdAt,desc' } }),

  getById: (id: string) =>
    api.get<ApiResponse<RecommendationResponse>>(`/api/v1/recommendations/${id}`),
};

// Proposals
export const proposalApi = {
  generate: (body: GenerateProposalRequest) =>
    api.post<ApiResponse<GeneratedProposalResponse>>('/api/v1/proposals/generate', body),

  getAll: (page = 0, size = 20) =>
    api.get<ApiResponse<PagedResponse<GeneratedProposalResponse>>>('/api/v1/proposals', { params: { page, size, sort: 'createdAt,desc' } }),

  getById: (id: string) =>
    api.get<ApiResponse<GeneratedProposalResponse>>(`/api/v1/proposals/${id}`),

  exportPptx: (id: string) =>
    api.get(`/api/v1/proposals/${id}/export/pptx`, { responseType: 'blob' }),

  delete: (id: string) =>
    api.delete<ApiResponse<void>>(`/api/v1/proposals/${id}`),
};

// Translation
export const translateApi = {
  toThai: (texts: string[]) =>
    api.post<ApiResponse<TranslationResponse>>('/api/v1/translate/thai', { texts }),
};

// CVTE C3 status (kept separate from robotApi — see [[CvteDevice]] on the backend)
export const cvteApi = {
  getAll: (page = 0, size = 100) =>
    api.get<ApiResponse<PagedResponse<CvteDeviceResponse>>>('/api/v1/cvte/devices', { params: { page, size, sort: 'deviceName,asc' } }),

  sync: (body: CvteDeviceSyncRequest) =>
    api.post<ApiResponse<CvteDeviceResponse[]>>('/api/v1/cvte/devices/sync', body),

  pollAll: () =>
    api.post<ApiResponse<CvteDeviceResponse[]>>('/api/v1/cvte/devices/poll-now'),

  pollOne: (deviceId: string) =>
    api.post<ApiResponse<CvteDeviceResponse>>(`/api/v1/cvte/devices/${deviceId}/poll-now`),
};

export const reportApi = {
  /** Aggregated monthly report for one robot, computed from its synced task reports. */
  preview: (serialNumber: string, month: string) =>
    api.get<ApiResponse<MonthlyPerformanceReport>>('/api/v1/reports/preview', {
      params: { serialNumber, month },
    }),

  /** Mint (or reuse) the shareable public link token for a robot+month. */
  createLink: (serialNumber: string, month: string) =>
    api.post<ApiResponse<{ token: string }>>('/api/v1/reports/links', null, {
      params: { serialNumber, month },
    }),

  /** Public, no-auth report for a shared token (used by /report/{token}). */
  publicReport: (token: string) =>
    api.get<ApiResponse<MonthlyPerformanceReport>>(`/api/v1/reports/public/${encodeURIComponent(token)}`),

  /** Public, no-auth bundle for a customer token — all their robots for one month. */
  publicBundle: (token: string) =>
    api.get<ApiResponse<{ customerName: string; periodLabel: string; robots: MonthlyPerformanceReport[] }>>(
      `/api/v1/reports/public/customer/${encodeURIComponent(token)}`,
    ),

  /** Mint (or reuse) a customer-level bundle link token. */
  createCustomerLink: (customerProfileId: string, month: string) =>
    api.post<ApiResponse<{ token: string }>>('/api/v1/reports/links/customer', null, {
      params: { customerProfileId, month },
    }),

  /** Email the report link for a robot+month to its customer's contact email. */
  sendEmail: (serialNumber: string, month: string) =>
    api.post<ApiResponse<{ recipient: string; customerName: string; url: string }>>(
      '/api/v1/reports/email',
      null,
      { params: { serialNumber, month } },
    ),

  /**
   * Start the whole-month delivery in the background (returns immediately — the
   * run syncs each customer's robots as it sends them, which takes minutes).
   * Idempotent per customer; a second start while one is running is rejected.
   * `excludedCustomerIds` holds back specific customers for this run only (e.g.
   * a site not fully registered yet) — they stay eligible for a later run.
   */
  runDelivery: (month: string, excludedCustomerIds?: string[]) =>
    api.post<ApiResponse<DeliveryRunStatus>>('/api/v1/reports/delivery/run', null, {
      params: {
        month,
        excludedCustomerIds: excludedCustomerIds?.length ? excludedCustomerIds.join(',') : undefined,
      },
    }),

  /** Poll whether a delivery run is executing + the last finished summary. */
  deliveryStatus: () =>
    api.get<ApiResponse<DeliveryRunStatus>>('/api/v1/reports/delivery/status'),

  /**
   * Send (or resend) one customer's bundle for the month. Runs in the background
   * on the server (syncing a large site's robots can take minutes) and returns
   * immediately; the outcome appears in the delivery history. Rejected while
   * another delivery is running.
   */
  sendCustomerBundle: (customerProfileId: string, month: string) =>
    api.post<ApiResponse<DeliveryRunStatus>>('/api/v1/reports/delivery/send', null, {
      params: { customerProfileId, month },
    }),

  /** Delivery history for a month, newest first. */
  deliveryHistory: (month: string) =>
    api.get<ApiResponse<ReportSend[]>>('/api/v1/reports/delivery/history', {
      params: { month },
    }),
};

// AutoXing — on-demand delivery report preview (no persistence). Fetches live
// statistics + robot state directly from the AutoXing API for an urgent report.
export const autoxingApi = {
  /**
   * Delivery report for one AutoXing robot. `from`/`to` are "YYYY-MM-DD" and
   * optional (backend defaults to the last 30 days). Range max is 30 days.
   * The AutoXing statistics endpoint caches results for 5 minutes, and a
   * whole-month sync can be slow, so this gets a longer timeout.
   */
  preview: (
    robotId: string,
    from?: string,
    to?: string,
    robotName?: string,
    model?: string,
  ) =>
    api.get<ApiResponse<AutoxingDeliveryReport>>('/api/v1/autoxing/report/preview', {
      params: { robotId, from, to, robotName: robotName || undefined, model: model || undefined },
      timeout: 120_000,
      skipRetry: true,
    }),
};

// Telemetry — on-demand sync from the brand API (e.g. Gausium) into robot_task_reports
export const telemetryApi = {
  /**
   * Pull a robot's task reports from its brand API for [from, to] ("YYYY-MM-DD").
   * A busy robot can mean several paginated calls to the brand's cloud API, which
   * can legitimately take longer than the default timeout — so this gets a longer
   * one, and skips the automatic retry (a timeout here means "still working," not
   * a flaky network blip; retrying would just fire a second concurrent sync).
   */
  sync: (serialNumber: string, from: string, to: string) =>
    api.post<ApiResponse<{ serialNumber: string; saved: number; skipped: number }>>(
      `/api/v1/telemetry/sync/${encodeURIComponent(serialNumber)}`,
      null,
      { params: { from, to }, timeout: 180_000, skipRetry: true },
    ),

  /**
   * Sync actively deployed robots for [from, to] — the whole fleet, or just one
   * partner's robots when `partnerId` is given. Runs inline on the server and
   * loops every robot, so it can take minutes — hence the long timeout and
   * skipRetry (a timeout means "still working", and retrying would start a second
   * concurrent sync). Idempotent: re-running a range never duplicates rows.
   */
  syncAll: (from: string, to: string, partnerId?: string) =>
    api.post<ApiResponse<TelemetrySyncSummary>>(
      '/api/v1/telemetry/sync-all',
      null,
      { params: { from, to, partnerId: partnerId || undefined }, timeout: 600_000, skipRetry: true },
    ),
};
