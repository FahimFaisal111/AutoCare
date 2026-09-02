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
  odometer?: number;
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
export interface RecommendedSlot {
  mechanicId: number;
  mechanicName: string;
  scheduledStart: string;
  displayTime: string;
  displayDate: string;
  durationMinutes: number;
}

export interface TechnicianAvailabilityInfo {
  mechanicId: number;
  name: string;
  role: string;
  employeeCode?: string;
  status: string;
  isAvailable: boolean;
  busyUntil?: string | null;
  nextAvailableSlot?: string | null;
  availableSlotsCount: number;
  totalAppointmentsToday: number;
}

export interface TechnicianAvailabilityResponse {
  date: string;
  durationMinutes: number;
  isClosed: boolean;
  message?: string;
  workingHours: { open: string; close: string };
  technicians: TechnicianAvailabilityInfo[];
  recommendedSlots: RecommendedSlot[];
}

/*Comment : One row from the CONVERSATION table (Hero Feature 7), already joined with the sender's name/role on the backend so the chat UI never has to look that up separately. */
export interface Message {
  conversationId: number;
  appointmentId: number;
  senderId: number;
  senderName: string;
  senderRole: "ADMIN" | "CUSTOMER" | "MECHANIC";
  content: string;
  sentAt: string;
}

/*Comment : One row per appointment that has at least one message - just enough to know "did something new happen here since I last looked", without fetching every thread in full. */
export interface LatestActivity {
  appointmentId: number;
  lastMessageAt: string;
  lastSenderId: number;
}

export interface Reminder {
  reminderId: number;
  vehicleId: number;
  vehicleInfo?: string;
  vin?: string;
  currentOdometer?: number | null;
  reminderType: string;
  dueDate: string;
  message: string;
  status: "ACTIVE" | "DUE" | "COMPLETED" | "DISMISSED" | string;
  isDue?: boolean;
  dueReason?: "CALENDAR_DUE" | "MILEAGE_DUE" | "UPCOMING";
  milestoneKm?: number | null;
  createdAt?: string;
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

  /*Comment : The mechanic's "automatic reply" for a diagnosis with no appointment yet - creates a real Reminder on the customer's vehicle rather than requiring a chat thread that can't exist without an appointment. */
  async requestAppointment(reportId: number): Promise<ProblemReport> {
    return this.request<ProblemReport>(`/api/problem-reports/${reportId}/request-appointment`, {
      method: "POST",
    });
  }

  // Appointments
  async getAppointments(): Promise<Appointment[]> {
    return this.request<Appointment[]>("/api/appointments", {
      method: "GET",
    });
  }

  async getTechnicianAvailability(params?: {
    date?: string;
    durationMinutes?: number;
    targetDateTime?: string;
  }): Promise<TechnicianAvailabilityResponse> {
    const query = new URLSearchParams();
    if (params?.date) query.set("date", params.date);
    if (params?.durationMinutes) query.set("durationMinutes", params.durationMinutes.toString());
    if (params?.targetDateTime) query.set("targetDateTime", params.targetDateTime);

    const qs = query.toString();
    return this.request<TechnicianAvailabilityResponse>(
      `/api/appointments/availability${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
      }
    );
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

  async updateInvoiceStatus(id: number, status: "PENDING" | "PAID"): Promise<Appointment> {
    return this.request<Appointment>(`/api/appointments/${id}/invoice/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  }

  /*Comment : Hero Feature 7 - fetches one appointment's message thread. This is also what the chat modal's background poll calls repeatedly while it's open. */
  async getMessages(appointmentId: number): Promise<Message[]> {
    return this.request<Message[]>(`/api/appointments/${appointmentId}/messages`, {
      method: "GET",
    });
  }

  /*Comment : Hero Feature 7 - posts one new message onto an appointment's thread. */
  async sendMessage(appointmentId: number, content: string): Promise<Message> {
    return this.request<Message>(`/api/appointments/${appointmentId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  /*Comment : One call covering every appointment the caller is party to - powers the "new message" badges and the sort-to-top ordering, without fetching each thread individually. */
  async getLatestMessageActivity(): Promise<LatestActivity[]> {
    return this.request<LatestActivity[]>("/api/appointments/messages/latest", {
      method: "GET",
    });
  }

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    return this.request<Reminder[]>("/api/reminders", {
      method: "GET",
    });
  }

  async getVehicleReminders(vehicleId: number): Promise<Reminder[]> {
    return this.request<Reminder[]>(`/api/vehicles/${vehicleId}/reminders`, {
      method: "GET",
    });
  }

  async createVehicleReminder(
    vehicleId: number,
    data: { reminderType: string; dueDate: string; message?: string }
  ): Promise<Reminder> {
    return this.request<Reminder>(`/api/vehicles/${vehicleId}/reminders`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateReminderStatus(
    reminderId: number,
    status: "ACTIVE" | "DUE" | "COMPLETED" | "DISMISSED"
  ): Promise<Reminder> {
    return this.request<Reminder>(`/api/reminders/${reminderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
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
