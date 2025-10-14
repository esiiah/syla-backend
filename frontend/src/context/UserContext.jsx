// frontend/src/context/UserContext.jsx - FIXED VERSION
import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export default function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(true);

  // Sync user state across browser tabs
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === "user") {
        setUser(event.newValue ? JSON.parse(event.newValue) : null);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Initialize theme and check authentication on mount
  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") || "light";
    setTheme(storedTheme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(storedTheme);
    checkAuthStatus();
  }, []);

  // Update theme when it changes
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(theme);
  }, [theme]);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem("user");
        }
      }

      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        headers: { "Content-Type": "application/json" }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (contact, password) => {
    try {
      const formData = new FormData();
      formData.append("contact", contact);
      formData.append("password", password);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Login failed");
      }

      const data = await response.json();
      
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signup = async (name, email, phone, password) => {
    try {
      const formData = new FormData();
      formData.append("name", name);
      if (email) formData.append("email", email);
      if (phone) formData.append("phone", phone);
      formData.append("password", password);

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Signup failed");
      }

      const data = await response.json();
      
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      return data;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const googleSignIn = async (token) => {
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ credential: token })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Google sign-in failed");
      }

      const data = await response.json();
      
      // IMPORTANT: Update user state immediately
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      return data;
    } catch (error) {
      console.error("Google sign-in error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      }).catch(() => {});
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  };

  // FIXED: Force re-render when user is updated
  const updateUser = (updatedUserData) => {
    console.log("Updating user:", updatedUserData);
    const newUser = { ...updatedUserData };
    setUser(newUser);
    localStorage.setItem("user", JSON.stringify(newUser));
    
    // Trigger storage event for other tabs
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'user',
      newValue: JSON.stringify(newUser),
      oldValue: localStorage.getItem("user")
    }));
  };

  const refreshAuth = async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);
        }
        // Also refresh user data
        await checkAuthStatus();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return false;
    }
  };

  const contextValue = {
    user,
    setUser: updateUser,
    theme,
    setTheme,
    loading,
    login,
    signup,
    googleSignIn,
    logout,
    checkAuthStatus,
    refreshAuth
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}