'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface SpecLoadingContextType {
  isGeneratingRequirements: boolean;
  isGeneratingDesign: boolean;
  isGeneratingTasks: boolean;
  setGeneratingRequirements: (loading: boolean) => void;
  setGeneratingDesign: (loading: boolean) => void;
  setGeneratingTasks: (loading: boolean) => void;
}

const SpecLoadingContext = createContext<SpecLoadingContextType | undefined>(undefined);

export function SpecLoadingProvider({ children }: { children: ReactNode }) {
  const [isGeneratingRequirements, setGeneratingRequirements] = useState(false);
  const [isGeneratingDesign, setGeneratingDesign] = useState(false);
  const [isGeneratingTasks, setGeneratingTasks] = useState(false);

  return (
    <SpecLoadingContext.Provider
      value={{
        isGeneratingRequirements,
        isGeneratingDesign,
        isGeneratingTasks,
        setGeneratingRequirements,
        setGeneratingDesign,
        setGeneratingTasks,
      }}
    >
      {children}
    </SpecLoadingContext.Provider>
  );
}

export function useSpecLoading() {
  const context = useContext(SpecLoadingContext);
  if (!context) {
    throw new Error('useSpecLoading must be used within SpecLoadingProvider');
  }
  return context;
}
