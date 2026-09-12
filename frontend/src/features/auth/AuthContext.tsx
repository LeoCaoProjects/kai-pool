import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  getAuthenticatedUser,
  login as loginRequest,
  register as registerRequest,
} from "../../api/auth";
import {
  ACCESS_TOKEN_KEY,
  AUTH_USER_KEY,
  ApiError,
  setApiToken,
  setUnauthorizedHandler,
} from "../../api/client";
import { updateCurrentUser as updateCurrentUserRequest } from "../../api/users";
import {
  clearScreenCache,
  hydrateScreenCache,
  setScreenCacheOwner,
} from "../../api/screenCache";
import type { User } from "../../types/models";
import type {
  LoginRequest,
  RegisterRequest,
  UpdateUserRequest,
} from "../../types/requests";

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
    setUnauthorizedHandler(() => {
      clearScreenCache();
      setApiToken(null);
      setUser(null);
      void AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, AUTH_USER_KEY]);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const [token, cachedUserJson] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(AUTH_USER_KEY),
      ]);
      if (!token) {
        setLoading(false);
        return;
      }

      let cachedUser: User | null = null;
      if (cachedUserJson) {
        try {
          cachedUser = JSON.parse(cachedUserJson) as User;
          await hydrateScreenCache(cachedUser.id);
          setUser(cachedUser);
        } catch {
          await AsyncStorage.removeItem(AUTH_USER_KEY);
        }
      }

      setApiToken(token);
      try {
        const authenticatedUser = await getAuthenticatedUser();
        setUser(authenticatedUser);
        await AsyncStorage.setItem(
          AUTH_USER_KEY,
          JSON.stringify(authenticatedUser),
        );
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 401) {
          setApiToken(null);
          setUser(null);
          await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, AUTH_USER_KEY]);
        } else if (!cachedUser) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    void restoreSession();
  }, []);

  useEffect(() => {
    if (!user) return;
    const expectedUserId = user.id;
    const reconcileStoredToken = async () => {
      const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) {
        setApiToken(token);
        return;
      }
      clearScreenCache();
      setApiToken(null);
      setUser((current) =>
        current?.id === expectedUserId ? null : current,
      );
      await AsyncStorage.removeItem(AUTH_USER_KEY);
    };
    void reconcileStoredToken();
  }, [user?.id]);

  const saveSession = async (token: string, authenticatedUser: User) => {
    clearScreenCache();
    setScreenCacheOwner(authenticatedUser.id);
    setApiToken(token);
    await AsyncStorage.multiSet([
      [ACCESS_TOKEN_KEY, token],
      [AUTH_USER_KEY, JSON.stringify(authenticatedUser)],
    ]);
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
    const updatedUser = await updateCurrentUserRequest(request);
    setUser(updatedUser);
    await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(updatedUser));
  };

  const logout = async () => {
    clearScreenCache();
    setApiToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, AUTH_USER_KEY]);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, updateUser, logout }}
    >
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
