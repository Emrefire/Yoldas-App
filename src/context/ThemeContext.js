import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false); // Yüklenme durumunu takip et

  useEffect(() => {
    // Uygulama açıldığında kaydedilmiş temayı yükle
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('appTheme');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        } else {
          // Eğer daha önce kaydedilmemişse telefonun sistem temasına bak
          setIsDarkMode(systemColorScheme === 'dark');
        }
      } catch (error) {
        console.log("Tema yüklenirken hata:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      // Değişikliği telefonun hafızasına kaydet
      await AsyncStorage.setItem('appTheme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.log("Tema kaydedilirken hata:", error);
    }
  };

  // Renk Paletleri
  const theme = isDarkMode ? {
    background: '#121212',
    card: '#1C1C1E',
    text: '#FFFFFF',
    subText: '#A0A0A0',
    primary: '#4CAF50', // Koyu mod yeşili
    border: '#2C2C2E',
    iconBg: '#2C2C2E'
  } : {
    background: '#F5F7FA',
    card: '#FFFFFF',
    text: '#1A1A1A',
    subText: '#757575',
    primary: '#2D5A27', // Açık mod yeşili
    border: '#E5E5E5',
    iconBg: '#E8F5E9'
  };

  // Eğer tema hafızadan okunmadan ekran çizilirse yanıp sönme olur, bunu engelliyoruz
  if (!isLoaded) return null; 

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);