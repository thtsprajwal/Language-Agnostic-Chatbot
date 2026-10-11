import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { configureApiClient } from "@/lib/apiClient";

type Role = "student" | "faculty" | "admin";

interface User {
  id: string;
  email: string;
  role: Role;
  approvalStatus?: "pending" | "approved" | "rejected";
  emailVerified?: boolean;
  mfaEnabled?: boolean;
}

interface AuthResponse {
  accessToken: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: Role, mfaCode?: string) => Promise<void>;
  register: (email: string, password: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
}

type AuthError = Error & {
  requiresMfa?: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setToken(null);
  }, []);

  const getCsrfToken = useCallback(async () => {
    const response = await fetch("/api/auth/csrf-token", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { csrfToken?: string };
    return data.csrfToken ?? null;
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const csrfToken = await getCsrfToken();
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: csrfToken ? { "X-CSRF-Token": csrfToken } : undefined,
    });

    if (!response.ok) {
      clearAuthState();
      return null;
    }

    const data = (await response.json()) as AuthResponse;
    setToken(data.accessToken);
    setUser(data.user);
    return data.accessToken;
  }, [clearAuthState, getCsrfToken]);

  useEffect(() => {
    configureApiClient({
      getToken: () => token,
      handleUnauthorized: refreshAccessToken,
      getCsrfToken,
    });
  }, [token, refreshAccessToken, getCsrfToken]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshAccessToken();
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();
  }, [refreshAccessToken]);

  const login = useCallback(async (email: string, password: string, role: Role, mfaCode?: string) => {
    setIsLoading(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ email, password, role, ...(mfaCode ? { mfaCode } : {}) }),
      });

      if (!response.ok) {
        const error = await response.json();
        const authError: AuthError = new Error(error.message || "Login failed");
        authError.requiresMfa = Boolean(error.requiresMfa);
        throw authError;
      }

      const data = (await response.json()) as AuthResponse;
      setToken(data.accessToken);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, [getCsrfToken]);

  const register = useCallback(async (email: string, password: string, role: Role) => {
    setIsLoading(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ email, password, role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      const data = (await response.json()) as AuthResponse & { message?: string; approvalStatus?: string };
      if (data.accessToken) {
        setToken(data.accessToken);
        setUser(data.user);
      } else {
        setToken(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [getCsrfToken]);

  const logout = useCallback(async () => {
    try {
      const csrfToken = await getCsrfToken();
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
        },
      });
    } finally {
      clearAuthState();
    }
  }, [token, clearAuthState, getCsrfToken]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
    }),
    [user, token, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
