/**
 * AutoCare AI - API Client Layer
 * Handles communication with Spring Boot 3 Backend (http://localhost:8080)
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
        message: "Unable to connect to backend server. Make sure Spring Boot is running on port 8080.",
      } as ApiError;
    }
  }

  // Auth Endpoints
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

  async getMe(): Promise<UserProfile> {
    return this.request<UserProfile>("/api/auth/me", {
      method: "GET",
    });
  }
}

export const api = new ApiClient();
