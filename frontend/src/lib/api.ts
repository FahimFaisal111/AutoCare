/**
 * AutoCare AI - API Client Layer
 * Handles communication with Node.js / Express Backend (http://localhost:8080)
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: number;
  workshopId: number;
  workshopName: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "CUSTOMER" | "MECHANIC";
}

export interface UserProfile {
  userId: number;
  workshopId: number;
  workshopName: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "CUSTOMER" | "MECHANIC";
  phone?: string;
  employeeCode?: string;
}

export interface WorkshopSummary {
  workshopId: number;
  name: string;
  address: string;
  accessCode: string;
}

export interface WorkshopRegisterPayload {
  workshopName: string;
  workshopAddress?: string;
  accessCode?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface CustomerRegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  workshopAccessCode: string;
  phone?: string;
}

export interface MechanicRegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  workshopAccessCode: string;
  employeeCode: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken: string;
}

export interface ResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}


export interface VehiclePayload {
  vin: string;
  make: string;
  model: string;
  year: number;
  odometer: number;
}

export interface Vehicle {
  vehicleId: number;
  ownerId: number;
  ownerName: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  odometer: number;
  createdAt: string;
}

export interface SolutionReport {
  solutionId: number;
  description: string;
  probableCause: string;
  recommendedAction: string;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  confidenceScore: number;
  reviewedBy?: number;
  reviewerName?: string;
  keywords: string[];
}

export interface ProblemReportPayload {
  vehicleId: number;
  description: string;
}

export interface ProblemReport {
  reportId: number;
  customerId: number;
  customerName: string;
  vehicleId: number;
  vehicleInfo: string;
  description: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  solution?: SolutionReport;
}

export interface AppointmentPayload {
  vehicleId: number;
  mechanicId: number;
  reportId?: number;
  scheduledStart: string;
  durationMinutes: number;
  serviceDescription?: string;
}

export interface AppointmentStatusUpdatePayload {
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  partsCost?: number;
  laborCost?: number;
  serviceDescription?: string;
}

export interface Appointment {
  appointmentId: number;
  vehicleId: number;
  vehicleInfo: string;
  ownerId: number;
  ownerName: string;
  mechanicId: number;
  mechanicName: string;
  reportId?: number;
  scheduledStart: string;
  durationMinutes: number;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  serviceDescription?: string;
  partsCost: number;
  laborCost: number;
  totalAmount: number;
  invoiceStatus?: string;
  createdAt: string;
}

export interface Reminder {
  reminderId: number;
  vehicleId: number;
  vehicleInfo: string;
  reminderType: string;
  dueDate: string;
  message: string;
  status: string;
}

export interface WorkshopStats {
  workshopId: number;
  workshopName: string;
  workshopAddress: string;
  accessCode: string;
  customerCount: number;
  vehicleCount: number;
  mechanicCount: number;
  scheduledAppointmentsCount: number;
  completedAppointmentsCount: number;
  totalRevenue: number;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  validationErrors?: Record<string, string>;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("autocare_token");
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle non-2xx responses
      if (!response.ok) {
        let errorData: Partial<ApiError> = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        const error: ApiError = {
          status: response.status,
          error: errorData.error || "Request Failed",
          message: errorData.message || "An unexpected error occurred",
          validationErrors: errorData.validationErrors,
        };
        throw error;
      }

      return await response.json();
    } catch (err: unknown) {
      if ((err as ApiError).status) {
        throw err;
      }
      throw {
        status: 500,
        error: "Network Error",
        message: "Unable to connect to backend server. Make sure the Express backend is running on port 8080.",
      } as ApiError;
    }
  }

  // Auth Endpoints
  async registerWorkshop(payload: WorkshopRegisterPayload): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/register/workshop", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getWorkshops(): Promise<WorkshopSummary[]> {
    return this.request<WorkshopSummary[]>("/api/auth/workshops", {
      method: "GET",
    });
  }

  async registerCustomer(payload: CustomerRegisterPayload): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/register/customer", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async registerMechanic(payload: MechanicRegisterPayload): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/register/mechanic", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async login(payload: LoginPayload): Promise<AuthResponse> {
    return this.request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async forgotPassword(payload: ForgotPasswordPayload): Promise<ForgotPasswordResponse> {
    return this.request<ForgotPasswordResponse>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    return this.request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getMe(): Promise<UserProfile> {

    return this.request<UserProfile>("/api/auth/me", {
      method: "GET",
    });
  }

  // Vehicles
  async getVehicles(): Promise<Vehicle[]> {
    return this.request<Vehicle[]>("/api/vehicles", {
      method: "GET",
    });
  }

  async registerVehicle(payload: VehiclePayload): Promise<Vehicle> {
    return this.request<Vehicle>("/api/vehicles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  // Problem Reports
  async getProblemReports(): Promise<ProblemReport[]> {
    return this.request<ProblemReport[]>("/api/problem-reports", {
      method: "GET",
    });
  }

  async createProblemReport(payload: ProblemReportPayload): Promise<ProblemReport> {
    return this.request<ProblemReport>("/api/problem-reports", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async reviewProblemReport(reportId: number): Promise<ProblemReport> {
    return this.request<ProblemReport>(`/api/problem-reports/${reportId}/review`, {
      method: "PATCH",
    });
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>("/api/appointments", {
      method: "GET",
    });
  }

  async createAppointment(payload: AppointmentPayload): Promise<Appointment> {
    return this.request<Appointment>("/api/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async updateAppointmentStatus(id: number, payload: AppointmentStatusUpdatePayload): Promise<Appointment> {
    return this.request<Appointment>(`/api/appointments/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    return this.request<Reminder[]>("/api/reminders", {
      method: "GET",
    });
  }

  // Workshop Admin
  async getWorkshopStats(): Promise<WorkshopStats> {
    return this.request<WorkshopStats>("/api/workshops/stats", {
      method: "GET",
    });
  }

  async getWorkshopMechanics(): Promise<UserProfile[]> {
    return this.request<UserProfile[]>("/api/workshops/mechanics", {
      method: "GET",
    });
  }
}

export const api = new ApiClient();
