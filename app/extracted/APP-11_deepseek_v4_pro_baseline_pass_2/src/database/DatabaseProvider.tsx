import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import {
  initializeDatabase,
  closeDatabase,
  openDatabase,
  DatabaseError,
} from './Database';

interface DatabaseContextValue {
  isReady: boolean;
  isInitializing: boolean;
  error: DatabaseError | null;
  retryInitialization: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextValue>({
  isReady: false,
  isInitializing: false,
  error: null,
  retryInitialization: async () => {},
});

interface DatabaseProviderProps {
  children: ReactNode;
}

/**
 * React Context Provider that manages the SQLite database lifecycle.
 * Initializes the database on mount and closes it on unmount.
 */
export function DatabaseProvider({
  children,
}: DatabaseProviderProps): JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<DatabaseError | null>(null);

  const initialize = useCallback(async () => {
    setIsInitializing(true);
    setError(null);

    try {
      await initializeDatabase();
      setIsReady(true);
    } catch (err) {
      const dbError =
        err instanceof DatabaseError
          ? err
          : new DatabaseError('Unknown database initialization error', err);
      setError(dbError);
      setIsReady(false);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    initialize();

    return () => {
      closeDatabase().catch(() => {
        // Ignore close errors during cleanup
      });
    };
  }, [initialize]);

  const retryInitialization = useCallback(async () => {
    await initialize();
  }, [initialize]);

  const contextValue: DatabaseContextValue = {
    isReady,
    isInitializing,
    error,
    retryInitialization,
  };

  return (
    <DatabaseContext.Provider value={contextValue}>
      {children}
    </DatabaseContext.Provider>
  );
}

/**
 * Hook to access the database context.
 */
export function useDatabase(): DatabaseContextValue {
  const context = useContext(DatabaseContext);

  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }

  return context;
}