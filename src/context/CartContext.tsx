import React, { createContext, useContext, useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { triggerHaptic } from '../lib/haptics';

interface CartItem extends MenuItem {
  quantity: number;
  selectedVariant?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: MenuItem, quantity?: number, variant?: string) => void;
  removeFromCart: (id: string, variant?: string) => void;
  updateQuantity: (id: string, quantity: number, variant?: string) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = (item: MenuItem, quantity = 1, variant?: string) => {
    triggerHaptic('medium');
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id && i.selectedVariant === variant);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && i.selectedVariant === variant
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      }
      return [...prev, { ...item, quantity, selectedVariant: variant }];
    });
  };

  const removeFromCart = (id: string, variant?: string) => {
    triggerHaptic('warning');
    setItems((prev) => prev.filter((i) => !(i.id === id && i.selectedVariant === variant)));
  };

  const updateQuantity = (id: string, quantity: number, variant?: string) => {
    triggerHaptic('light');
    if (quantity <= 0) {
      removeFromCart(id, variant);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === id && i.selectedVariant === variant ? { ...i, quantity } : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
