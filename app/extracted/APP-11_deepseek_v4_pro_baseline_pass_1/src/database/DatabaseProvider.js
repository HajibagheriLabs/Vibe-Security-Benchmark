// src/database/DatabaseProvider.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDatabase, closeDatabase } from './Database';

const DatabaseContext = createContext(null);

export const DatabaseProvider = ({ children }) => {
  const [db, setDb] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initDatabase = async () => {
      try {
        const database = await getDatabase();
        setDb(database);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setIsReady(false);
      }
    };

    initDatabase();

    return () => {
      closeDatabase();
    };
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, isReady }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};