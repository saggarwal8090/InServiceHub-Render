/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Determine API base URL — in production, use relative URLs (same origin)
const API_URL = import.meta.env.VITE_API_URL || '/api';

const readStoredUser = () => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) return null;

    try {
        const parsedUser = JSON.parse(storedUser);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return parsedUser;
    } catch {
        // Corrupted localStorage data — clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
    }
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(readStoredUser);
    const loading = false;

    const persistSession = (token, user) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && user) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    }, [user]);

    const login = async (email, password) => {
        try {
            const res = await axios.post(`${API_URL}/login`, { email, password });
            const { token, user } = res.data;
            persistSession(token, user);
            return { success: true, role: user.role };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed. Please check your credentials and try again.'
            };
        }
    };

    const register = async (userData) => {
        try {
            const res = await axios.post(`${API_URL}/register`, userData);
            const { token, user } = res.data;
            persistSession(token, user);
            return { success: true, role: user.role };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Registration failed. Please try again.'
            };
        }
    };

    const loginWithGoogle = async (credential, userData = {}) => {
        try {
            const res = await axios.post(`${API_URL}/auth/google`, { credential, ...userData });
            const { token, user } = res.data;
            persistSession(token, user);
            return { success: true, role: user.role };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Google sign-in failed. Please try again.'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, loginWithGoogle, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
