import React, { createContext, useContext, useState } from 'react';

export type Section = 'home' | 'hero' | 'menu' | 'gallery' | 'loyalty' | 'admin' | 'profile' | 'support' | 'diary' | 'kindness' | 'orders' | 'contact' | 'chat' | 'settings';

interface NavigationContextType {
  activeSection: Section;
  setActiveSection: (section: Section) => void;
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  isReservationOpen: boolean;
  setReservationOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  isQRScannerOpen: boolean;
  setQRScannerOpen: (open: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [activeSection, setActiveSection] = useState<Section>('home');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCartOpen, setCartOpen] = useState(false);
  const [isReservationOpen, setReservationOpen] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isQRScannerOpen, setQRScannerOpen] = useState(false);

  return (
    <NavigationContext.Provider
      value={{
        activeSection,
        setActiveSection,
        isSidebarOpen,
        setSidebarOpen,
        isCartOpen,
        setCartOpen,
        isReservationOpen,
        setReservationOpen,
        isSearchOpen,
        setSearchOpen,
        isSettingsOpen,
        setSettingsOpen,
        isQRScannerOpen,
        setQRScannerOpen
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

