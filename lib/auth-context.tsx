'use client';

import { createContext, useContext, ReactNode } from 'react';
import { APP_USERNAME } from './constants';

interface AuthContextType {
  user: { uid: string };
  loading: false;
  userProfile: { username: string };
}

const authValue: AuthContextType = {
  user: { uid: 'owner' },
  loading: false,
  userProfile: { username: APP_USERNAME },
};

const AuthContext = createContext<AuthContextType>(authValue);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContext.Provider value={authValue}>{children}</AuthContext.Provider>;
}
