import React, { createContext, useState, useContext, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
    const [selectedState, setSelectedState] = useState(null);

    useEffect(() => {
        const loadLocation = async () => {
            try {
                const saved = Platform.OS === 'web' ? localStorage.getItem('selectedState') : await SecureStore.getItemAsync('selectedState');
                if (saved) setSelectedState(saved);
            } catch (error) {
                console.log(error);
            }
        };
        loadLocation();
    }, []);

    const setLocation = async (newState) => {
        setSelectedState(newState);
        try {
            if (Platform.OS === 'web') {
                localStorage.setItem('selectedState', newState);
            } else {
                await SecureStore.setItemAsync('selectedState', newState);
            }
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <LocationContext.Provider value={{ selectedState, setLocation }}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => useContext(LocationContext);
