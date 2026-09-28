import React, { Suspense, lazy, useState, useEffect } from 'react';
import { FirebaseProvider } from './context/FirebaseContext';
import { ThemeProvider } from './context/ThemeContext';
import { NavigationProvider } from './context/NavigationContext';
import { CartProvider } from './context/CartContext';
import { MenuProvider } from './context/MenuContext';
import { LanguageProvider } from './context/LanguageContext';
import { Layout } from './components/Layout';
import SplashScreen from './components/SplashScreen';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationCenter from './components/NotificationCenter';
import AISaki from './components/AISaki';

// Main Hub (Single Page Super-Component)
const SuperPage = lazy(() => import('./pages/SuperPage'));

function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <LanguageProvider>
          {showSplash ? (
            <SplashScreen onFinish={() => setShowSplash(false)} />
          ) : (
            <ThemeProvider>
              <NavigationProvider>
                <CartProvider>
                  <MenuProvider>
                    <NotificationCenter />
                    <AISaki />
                    <Layout>
                      <Suspense fallback={
                        <div className="flex items-center justify-center min-h-screen bg-stone-950">
                          <div className="w-24 h-24 border-t-2 border-primary-gold rounded-full animate-spin shadow-[0_0_50px_#D4AF37]" />
                        </div>
                      }>
                        <SuperPage />
                      </Suspense>
                    </Layout>
                  </MenuProvider>
                </CartProvider>
              </NavigationProvider>
            </ThemeProvider>
          )}
        </LanguageProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}

export default App;
