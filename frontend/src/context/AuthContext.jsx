import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../api/client";
import { supabase } from "../api/supabase";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("stockpilot_token"));
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem("stockpilot_token");
      if (storedToken) {
        try {
          const resp = await apiClient.get("/auth/me");
          setUser(resp.data);
          localStorage.setItem("stockpilot_user", JSON.stringify(resp.data));
        } catch (err) {
          console.error("Failed to restore session from token:", err);
          logout();
        }
      } else {
        // Auto-login with default dev admin for seamless developer experience if empty
        try {
          const resp = await apiClient.post("/auth/dev-login", {
            email: "admin@stockpilot.io",
            role: "ADMIN",
            full_name: "Alex Mercer (Admin)"
          });
          setToken(resp.data.access_token);
          setUser(resp.data.user);
          localStorage.setItem("stockpilot_token", resp.data.access_token);
          localStorage.setItem("stockpilot_user", JSON.stringify(resp.data.user));
        } catch (e) {
          console.warn("Bootstrap dev login failed, user will see login screen:", e);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginWithSupabase = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw error;
    }
    const accessToken = data.session.access_token;
    localStorage.setItem("stockpilot_token", accessToken);
    setToken(accessToken);

    // Fetch user profile from backend
    const resp = await apiClient.get("/auth/me");
    setUser(resp.data);
    localStorage.setItem("stockpilot_user", JSON.stringify(resp.data));
    return resp.data;
  };

  const loginDev = async (email, role = "ADMIN", fullName = "Demo User") => {
    const resp = await apiClient.post("/auth/dev-login", {
      email,
      role,
      full_name: fullName
    });
    const accessToken = resp.data.access_token;
    localStorage.setItem("stockpilot_token", accessToken);
    localStorage.setItem("stockpilot_user", JSON.stringify(resp.data.user));
    setToken(accessToken);
    setUser(resp.data.user);
    return resp.data.user;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem("stockpilot_token");
    localStorage.removeItem("stockpilot_user");
    setToken(null);
    setUser(null);
  };

  const isAdmin = user?.role === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAdmin,
        loginWithSupabase,
        loginDev,
        logout,
        setUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
