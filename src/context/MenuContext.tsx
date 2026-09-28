import React, { createContext, useContext, useState, useEffect } from 'react';
import { MenuItem, AppSettings } from '../types';
import { subscribeToMenu, subscribeToSettings } from '../services/firestore';
import { MENU_ITEMS } from '../data/db';

interface MenuContextType {
  items: MenuItem[];
  settings: AppSettings | null;
  loading: boolean;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubMenu = subscribeToMenu((newItems) => {
      if (newItems && newItems.length > 0) {
        setItems(newItems);
      } else {
        setItems(MENU_ITEMS);
      }
      setLoading(false);
    });

    const unsubSettings = subscribeToSettings((newSettings) => {
      setSettings(newSettings);
    });

    return () => {
      unsubMenu();
      unsubSettings();
    };
  }, []);

  return (
    <MenuContext.Provider value={{ items, settings, loading }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}
