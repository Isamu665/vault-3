import React, { createContext, useContext, useState, useCallback } from 'react';

// `ready` defaults to true so components rendered outside the provider
// (edge cases) animate normally. Inside the provider it starts false and
// flips to true only after the splash entrance finishes.
const AppReadyContext = createContext({ ready: true, markReady: () => {} });

export const useAppReady = () => useContext(AppReadyContext);

export const AppReadyProvider = ({ children }) => {
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  return (
    <AppReadyContext.Provider value={{ ready, markReady }}>
      {children}
    </AppReadyContext.Provider>
  );
};