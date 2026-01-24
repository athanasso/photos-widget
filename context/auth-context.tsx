/**
 * Authentication Context
 * Provides auth state management using Vercel backend for OAuth
 */

import {
    registerBackgroundFetch,
    unregisterBackgroundFetch,
} from "@/services/background-fetch";
import {
    signOut as authSignOut,
    isAuthenticated as checkIsAuthenticated,
    getValidAccessToken,
    handleOAuthCallback,
    startOAuthFlow,
} from "@/services/google-auth";
import { getUserInfo, type UserInfo } from "@/services/secure-storage";
import { clearWidgetData } from "@/services/widget-storage";
import * as Linking from "expo-linking";
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
    
    // Set up deep link listener for OAuth callback
    const subscription = Linking.addEventListener("url", handleDeepLink);
    
    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.includes("oauth")) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDeepLink = async (event: { url: string }) => {
    console.log("Deep link received:", event.url);
    
    if (event.url.includes("oauth")) {
      setIsLoading(true);
      try {
        const tokens = await handleOAuthCallback(event.url);
        
        if (tokens) {
          setIsAuthenticated(true);
          const userInfo = await getUserInfo();
          setUser(userInfo);
          await registerBackgroundFetch();
          console.log("Sign in successful!");
        }
      } catch (error) {
        console.error("Error handling OAuth callback:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const authenticated = await checkIsAuthenticated();
      
      if (authenticated) {
        const userInfo = await getUserInfo();
        setUser(userInfo);
        
        const token = await getValidAccessToken();
        if (token) {
          setIsAuthenticated(true);
          console.log("Session restored successfully");
        } else {
          console.log("Session expired, user needs to sign in again");
          setIsAuthenticated(false);
          setUser(null);
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = useCallback(async () => {
    try {
      setIsLoading(true);
      await startOAuthFlow();
      // The actual sign-in completion will be handled by the deep link listener
    } catch (error) {
      console.error("Error during sign in:", error);
    } finally {
      // Don't set loading to false here - wait for the callback
      // But add a timeout in case the user cancels
      setTimeout(() => {
        setIsLoading(false);
      }, 60000);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true);
      await unregisterBackgroundFetch();
      await clearWidgetData();
      await authSignOut();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error("Error during sign out:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    await checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        signIn,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
