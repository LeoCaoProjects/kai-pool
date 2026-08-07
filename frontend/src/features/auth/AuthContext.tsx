import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  getAuthenticatedUser,
  login as loginRequest,
  register as registerRequest,
} from "../../api/auth";
import { setApiToken } from "../../api/client";
import { updateCurrentUser as updateCurrentUserRequest } from "../../api/users";
import type { User } from "../../types/models";
import type { LoginRequest, RegisterRequest, UpdateUserRequest } from "../../types/requests";

const TOKEN_KEY = "kai-pool-token";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  updateUser: (request: UpdateUserRequest) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      setApiToken(token);
      try {
        setUser(await getAuthenticatedUser());
      } catch {
        setApiToken(null);
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    };

    void restoreSession();
  }, []);

  const saveSession = async (token: string, authenticatedUser: User) => {
    setApiToken(token);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    setUser(authenticatedUser);
  };

  const login = async (request: LoginRequest) => {
    const response = await loginRequest(request);
    await saveSession(response.token, response.user);
  };

  const register = async (request: RegisterRequest) => {
    const response = await registerRequest(request);
    await saveSession(response.token, response.user);
  };

  const updateUser = async (request: UpdateUserRequest) => {
    setUser(await updateCurrentUserRequest(request));
  };

  const logout = async () => {
    setApiToken(null);
    setUser(null);
    await AsyncStorage.removeItem(TOKEN_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
