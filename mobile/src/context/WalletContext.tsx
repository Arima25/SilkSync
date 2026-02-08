import React, { createContext, useContext, useState, ReactNode } from 'react';

interface WalletContextType {
  balance: number;
  setBalance: (balance: number) => void;
  addFunds: (amount: number) => void;
  deductFunds: (amount: number) => boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(1240.5);

  const addFunds = (amount: number) => {
    setBalance((prev) => prev + amount);
  };

  const deductFunds = (amount: number): boolean => {
    if (balance >= amount) {
      setBalance((prev) => prev - amount);
      return true;
    }
    return false;
  };

  return (
    <WalletContext.Provider value={{ balance, setBalance, addFunds, deductFunds }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
