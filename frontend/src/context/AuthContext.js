import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('qc_token') || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          // Use the API service which already handles token headers
          const response = await api.auth.getCurrentUser();
          setCurrentUser(response.data);
          setError(null);
        } catch (err) {
          console.error('Error fetching user:', err);
          logout();
          setError('Session expired. Please login again.');
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const login = async (username, password) => {
    setLoading(true);
    try {
      // Use our API service for login
      const response = await api.auth.login(username, password);

      const { access_token } = response.data;
      
      // Store token in localStorage
      localStorage.setItem('qc_token', access_token);
      
      // Set token in state and headers for future API calls
      setToken(access_token);
      
      // Fetch user data after successful login
      const userResponse = await api.auth.getCurrentUser();
      setCurrentUser(userResponse.data);
      setError(null);
      
      return response.data;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Failed to login. Please check your credentials.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      // Use our API service for registration
      console.log('Attempting registration with:', userData);
      
      const response = await api.auth.register(userData);
      console.log('Registration successful:', response.data);
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Failed to register. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    // Remove token from localStorage
    localStorage.removeItem('qc_token');
    
    // Reset state
    setToken(null);
    setCurrentUser(null);
    
    // Clear axios headers
    delete axios.defaults.headers.common['Authorization'];
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    loading,
    error,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};