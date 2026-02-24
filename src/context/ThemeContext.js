import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const systemColorScheme = useColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            let savedTheme = null;
            if (Platform.OS === 'web') {
                savedTheme = localStorage.getItem('appTheme');
            } else {
                savedTheme = await SecureStore.getItemAsync('appTheme');
            }
            if (savedTheme) {
                setIsDarkMode(savedTheme === 'dark');
            } else {
                setIsDarkMode(false);
            }
        } catch (e) {
            console.error("Failed to load theme:", e);
        }
    };

    const toggleTheme = async () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        try {
            if (Platform.OS === 'web') {
                localStorage.setItem('appTheme', newTheme ? 'dark' : 'light');
            } else {
                await SecureStore.setItemAsync('appTheme', newTheme ? 'dark' : 'light');
            }
        } catch (e) {
            console.error("Failed to save theme:", e);
        }
    };

    const colors = isDarkMode ? {
        background: '#121212',
        surface: '#1E1E1E',
        surfaceDeeper: '#2C2C2C',
        text: '#FFFFFF',
        textDim: '#A0A0A0',
        border: '#333333',
        primary: '#059669',     // emerald-600
        primaryLight: '#4ade80',// green-400
        danger: '#ef4444',
        shadow: '#000000',
        iconBg: '#333333'
    } : {
        background: '#F9FAFB',
        surface: '#FFFFFF',
        surfaceDeeper: '#F3F4F6',
        text: '#111827',
        textDim: '#6B7280',
        border: '#F3F4F6',
        primary: '#059669',     // emerald-600
        primaryLight: '#34D399',// emerald-400
        danger: '#ef4444',
        shadow: '#000000',
        iconBg: '#F1F5F9'
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
            {children}
        </ThemeContext.Provider>
    );
};
