import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is authenticated on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsAuthenticated(true);
      // Fetch user details
      client.get('/auth/user/')
        .then(res => setUser(res.data))
        .catch(() => {
          // If fetching user fails, token might be invalid
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setIsAuthenticated(false);
        });
    }
    setIsLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await client.post('/auth/login/', { email, password });
      const { access, refresh } = response.data;
      
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      setIsAuthenticated(true);
      setUser(response.data.user);
      
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const register = async (email, password, firstName, lastName) => {
    try {
      const response = await client.post('/auth/registration/', {
        email,
        password1: password,
        password2: password,
        first_name: firstName,
        last_name: lastName,
      });

      const { access, refresh } = response.data;
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      setIsAuthenticated(true);
      
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
