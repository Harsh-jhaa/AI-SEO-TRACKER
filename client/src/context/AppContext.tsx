import type { AxiosInstance } from 'axios';
import axios from 'axios';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  analysisCount: number;
}

interface AppContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  api: AxiosInstance;
  loginUser: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message?: string }>;
  registerUser: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message?: string }>;
  logoutUser: () => void;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token'),
  );
  const [loading, setLoading] = useState(true);

  // axios instance with base URL and authorization header

  const api = axios.create({
    baseURL: BACKEND_URL,
  });

  // update axios header when token changes

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  const loginUser = async (email: string, password: string) => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/auth/login`, {
        email,
        password,
      });
      if (res.data.success) {
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        return { success: true };
      } else {
        return { success: false, message: res.data.message };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed',
      };
    }
  };
  const registerUser = async (
    name: string,
    email: string,
    password: string,
  ) => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        name,
        email,
        password,
      });
      if (res.data.success) {
        const { token, user } = res.data;
        localStorage.setItem('token', token);
        setToken(token);
        setUser(user);
        return { success: true };
      } else {
        return { success: false, message: res.data.message };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed',
      };
    }
  };
  const logoutUser = async () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };
  const loadUser = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/api/auth/user');
      if (data.success) {
        setUser(data.user);
      }
    } catch (error) {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUser();
  }, [token]);

  const value = {
    user,
    token,
    loading,
    api,
    loginUser,
    registerUser,
    logoutUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
