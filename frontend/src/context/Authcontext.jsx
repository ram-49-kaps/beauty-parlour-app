import { createContext, useContext, useState, useEffect } from 'react';
import { login as loginApi, register as registerApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // 1. Loading state starts as true to prevent premature redirects
  const [loading, setLoading] = useState(true);

  // 🔐 Load user safely from localStorage on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData && userData !== 'undefined') {
          // If data exists, parse and set it
          setUser(JSON.parse(userData));
        } else {
          // If data is invalid/missing, clear everything
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Invalid user data in localStorage:', error);
        // On error (e.g., corrupted JSON), force logout
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        // 2. ALWAYS set loading to false when check is done
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 🔑 Login
  const login = async (credentials) => {
    try {
      const response = await loginApi(credentials);

      if (response?.data?.user && response?.data?.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        return response.data;
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error; // Let the UI handle the specific error message
    }
  };

  // 📝 Register
  const register = async (userData) => {
    try {
      const response = await registerApi(userData);

      if (response?.data?.user && response?.data?.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        return response.data;
      }
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  // 🚪 Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    // Optional: Navigate to home here if you want to force redirect from context
    // window.location.href = '/'; 
  };

  return (
    // 3. Pass 'loading' to the Provider so other components can use it
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};