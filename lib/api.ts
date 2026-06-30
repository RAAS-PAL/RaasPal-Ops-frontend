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

    // No response = network error (cold start / timeout). Retry once automatically.
    const isNetworkError = !error.response;
    const alreadyRetried = error.config?._retried;
    if (isNetworkError && !alreadyRetried && error.config) {
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
  AuthResponse,
  CreateUserRequest,
  CvteDeviceResponse,
  CvteDeviceSyncRequest,
  FileUploadResponse,
  GenerateProposalRequest,
  GeneratedProposalResponse,
  LoginRequest,
  PagedResponse,
  RegisterRequest,
  RecommendationResponse,
  RequirementResponse,
  RobotImportResult,
  CustomerRequest,
  CustomerResponse,
  RobotRequest,
  RobotResponse,
  RobotType,
  RobotUnitResponse,
  RegisterRobotRequest,
  ReportCadence,
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
};

// Robot units & deployments (register robots, link to customers, set cadence)
export const robotUnitApi = {
  /** List robots: all, or filtered by `customerId` (→ that customer's robots) or `serialNumber` (→ the robot + its customer). */
  list: (params?: { customerId?: string; serialNumber?: string }) =>
    api.get<ApiResponse<RobotUnitResponse[]>>('/api/v1/robot-units', { params }),

  register: (body: RegisterRobotRequest) =>
    api.post<ApiResponse<RobotUnitResponse>>('/api/v1/robot-units', body),

  updateCadence: (deploymentId: string, reportCadence: ReportCadence) =>
    api.patch<ApiResponse<RobotUnitResponse>>(`/api/v1/robot-units/deployments/${deploymentId}/cadence`, { reportCadence }),

  deactivate: (deploymentId: string) =>
    api.delete<ApiResponse<void>>(`/api/v1/robot-units/deployments/${deploymentId}`),
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

  /** Email the report link for a robot+month to its customer's contact email. */
  sendEmail: (serialNumber: string, month: string) =>
    api.post<ApiResponse<{ recipient: string; customerName: string; url: string }>>(
      '/api/v1/reports/email',
      null,
      { params: { serialNumber, month } },
    ),
};

// Telemetry — on-demand sync from the brand API (e.g. Gausium) into robot_task_reports
export const telemetryApi = {
  /** Pull a robot's task reports from its brand API for [from, to] ("YYYY-MM-DD"). */
  sync: (serialNumber: string, from: string, to: string) =>
    api.post<ApiResponse<{ serialNumber: string; saved: number; skipped: number }>>(
      `/api/v1/telemetry/sync/${encodeURIComponent(serialNumber)}`,
      null,
      { params: { from, to } },
    ),
};
