"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  api,
  AuthResponse,
  UserProfile,
  LoginPayload,
  WorkshopRegisterPayload,
  CustomerRegisterPayload,
  MechanicRegisterPayload,
} from "@/lib/api";

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<AuthResponse>;
  loginAsDemo: (role: "ADMIN" | "MECHANIC" | "CUSTOMER") => void;
  registerWorkshop: (payload: WorkshopRegisterPayload) => Promise<AuthResponse>;
  registerCustomer: (payload: CustomerRegisterPayload) => Promise<AuthResponse>;
  registerMechanic: (payload: MechanicRegisterPayload) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveAuthSession = (auth: AuthResponse) => {
    localStorage.setItem("autocare_token", auth.token);
    localStorage.removeItem("autocare_demo_role");
    setToken(auth.token);
    setUser({
      userId: auth.userId,
      workshopId: auth.workshopId,
      workshopName: auth.workshopName,
      email: auth.email,
      firstName: auth.firstName,
      lastName: auth.lastName,
      role: auth.role,
    });
  };

  const logout = useCallback(() => {
    localStorage.removeItem("autocare_token");
    localStorage.removeItem("autocare_demo_role");
    setToken(null);
    setUser(null);
  }, []);

  // Initialize session on mount by checking token and verifying with backend
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("autocare_token");
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      const demoRole = localStorage.getItem("autocare_demo_role") as ("ADMIN" | "MECHANIC" | "CUSTOMER") | null;
      if (demoRole) {
        const demoProfiles: Record<string, UserProfile> = {
          ADMIN: {
            userId: 1,
            workshopId: 1,
            workshopName: "Apex Auto Dynamics (Primary Tenant)",
            email: "admin@apexauto.com",
            firstName: "Alexander",
            lastName: "Wright",
            role: "ADMIN",
          },
          MECHANIC: {
            userId: 2,
            workshopId: 1,
            workshopName: "Apex Auto Dynamics (Primary Tenant)",
            email: "mechanic@apexauto.com",
            firstName: "Marcus",
            lastName: "Vance",
            role: "MECHANIC",
            employeeCode: "TECH-9081",
          },
          CUSTOMER: {
            userId: 3,
            workshopId: 1,
            workshopName: "Apex Auto Dynamics (Primary Tenant)",
            email: "customer@apexauto.com",
            firstName: "Elena",
            lastName: "Rostova",
            role: "CUSTOMER",
            phone: "+1 (555) 234-5678",
          },
        };
        setToken(storedToken);
        setUser(demoProfiles[demoRole] || demoProfiles.ADMIN);
        setIsLoading(false);
        return;
      }

      setToken(storedToken);
      try {
        const profile = await api.getMe();
        setUser(profile);
      } catch (err) {
        console.warn("Session expired or invalid, logging out.", err);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [logout]);

  const login = async (payload: LoginPayload) => {
    const res = await api.login(payload);
    saveAuthSession(res);
    return res;
  };

  const loginAsDemo = (role: "ADMIN" | "MECHANIC" | "CUSTOMER") => {
    const demoProfiles: Record<string, UserProfile> = {
      ADMIN: {
        userId: 1,
        workshopId: 1,
        workshopName: "Apex Auto Dynamics (Primary Tenant)",
        email: "admin@apexauto.com",
        firstName: "Alexander",
        lastName: "Wright",
        role: "ADMIN",
      },
      MECHANIC: {
        userId: 2,
        workshopId: 1,
        workshopName: "Apex Auto Dynamics (Primary Tenant)",
        email: "mechanic@apexauto.com",
        firstName: "Marcus",
        lastName: "Vance",
        role: "MECHANIC",
        employeeCode: "TECH-9081",
      },
      CUSTOMER: {
        userId: 3,
        workshopId: 1,
        workshopName: "Apex Auto Dynamics (Primary Tenant)",
        email: "customer@apexauto.com",
        firstName: "Elena",
        lastName: "Rostova",
        role: "CUSTOMER",
        phone: "+1 (555) 234-5678",
      },
    };

    const selectedProfile = demoProfiles[role];
    const demoToken = "demo-jwt-token-" + role.toLowerCase();
    localStorage.setItem("autocare_token", demoToken);
    localStorage.setItem("autocare_demo_role", role);
    setToken(demoToken);
    setUser(selectedProfile);
  };

  const registerWorkshop = async (payload: WorkshopRegisterPayload) => {
    const res = await api.registerWorkshop(payload);
    saveAuthSession(res);
    return res;
  };

  const registerCustomer = async (payload: CustomerRegisterPayload) => {
    const res = await api.registerCustomer(payload);
    saveAuthSession(res);
    return res;
  };

  const registerMechanic = async (payload: MechanicRegisterPayload) => {
    const res = await api.registerMechanic(payload);
    saveAuthSession(res);
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        registerWorkshop,
        registerCustomer,
        registerMechanic,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
