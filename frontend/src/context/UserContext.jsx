import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export default function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
  const storedUser = localStorage.getItem("user");
  return storedUser ? JSON.parse(storedUser) : null;
});

  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(true);

  // Optional: sync user state across browser tabs
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
    // Load theme from localStorage
    const storedTheme = localStorage.getItem("theme") || "light";
    setTheme(storedTheme);
    document.body.classList.remove("dark", "light");
    document.body.classList.add(storedTheme);

    // Check authentication status
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
      
      // First try to get user from localStorage for immediate display
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          localStorage.removeItem("user");
        }
      }

      // Then verify with backend
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include", // Include cookies
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } else {
        // Clear user data if authentication failed
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token"); // Remove old token if exists
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
        credentials: "include", // Include cookies
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Login failed");
      }

      const data = await response.json();
      
      // Update user state and localStorage
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Store token as backup (though we're using cookies primarily)
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
        credentials: "include", // Include cookies
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Signup failed");
      }

      const data = await response.json();
      
      // Update user state and localStorage
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Store token as backup
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
      const formData = new FormData();
      formData.append("token", token);

      const response = await fetch("/api/auth/google", {
        method: "POST",
        credentials: "include", // Include cookies
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Google sign-in failed");
      }

      const data = await response.json();
      
      // Update user state and localStorage
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      
      // Store token as backup
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
      // Call logout endpoint to clear server-side cookie
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      }).catch(() => {
        // Ignore errors for logout endpoint
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Always clear local state
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
    }
  };

  const updateUser = (updatedUserData) => {
    setUser(updatedUserData);
    localStorage.setItem("user", JSON.stringify(updatedUserData));
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
