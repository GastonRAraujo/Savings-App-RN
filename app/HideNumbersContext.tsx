import React, { createContext, useContext, useState, ReactNode } from 'react';

type HideNumbersContextType = {
  hideNumbers: boolean;
  setHideNumbers: (value: boolean) => void;
};

const HideNumbersContext = createContext<HideNumbersContextType | undefined>(undefined);

export const HideNumbersProvider = ({ children }: { children: ReactNode }) => {
  const [hideNumbers, setHideNumbers] = useState(false);

  return (
    <HideNumbersContext.Provider value={{ hideNumbers, setHideNumbers }}>
      {children}
    </HideNumbersContext.Provider>
  );
};

export const useHideNumbers = () => {
  const context = useContext(HideNumbersContext);
  if (!context) {
    throw new Error('useHideNumbers must be used within a HideNumbersProvider');
  }
  return context;
};
