import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  icon: string;
  type: 'expense' | 'deposit';
}

interface WalletContextType {
  balance: number;
  addFunds: (amount: number, description?: string) => void;
  deductFunds: (amount: number, description: string) => boolean;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const INITIAL_TRANSACTIONS = [
  {
    id: '1',
    title: 'HSR Ticket',
    date: 'Sep 12 • 09:41 AM',
    amount: -45.0,
    icon: 'train-outline',
    type: 'expense',
  },
  {
    id: '2',
    title: 'Blue Bottle Coffee',
    date: 'Sep 11 • 04:20 PM',
    amount: -5.5,
    icon: 'cafe-outline',
    type: 'expense',
  },
  {
    id: '3',
    title: 'Silk Road Hotel',
    date: 'Sep 10 • 11:15 AM',
    amount: -200.0,
    icon: 'bed-outline',
    type: 'expense',
  },
];

export function WalletProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(1240.5);
  // @ts-ignore
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  const getCurrentDateFormatted = () => {
    const now = new Date();
    const month = now.toLocaleString('default', { month: 'short' });
    const day = now.getDate();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${month} ${day} • ${hours}:${minutes} ${ampm}`;
  };

  const addFunds = (amount: number, description: string = 'Deposit') => {
    setBalance((prev) => prev + amount);
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      title: description,
      date: getCurrentDateFormatted(),
      amount: amount,
      icon: 'wallet-outline',
      type: 'deposit',
    };
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  const deductFunds = (amount: number, description: string): boolean => {
    if (balance >= amount) {
      setBalance((prev) => prev - amount);
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        title: description,
        date: getCurrentDateFormatted(),
        amount: -amount,
        icon: 'cart-outline',
        type: 'expense',
      };
      setTransactions((prev) => [newTransaction, ...prev]);
      return true;
    }
    return false;
  };

  return (
    <WalletContext.Provider 
      value={{ 
        balance, 
        addFunds, 
        deductFunds, 
        transactions,
        setTransactions 
      }}
    >
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
