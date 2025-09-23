// frontend/src/context/UserContext.jsx
import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export default function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // ---- Theme handling ----
  useEffect(() => {
    // Pull user from localStorage if present
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Always try to pull fresh user from backend using auth cookie
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          localStorage.setItem("user", JSON.stringify(data));
        } else {
          // If auth check fails, clear stale data
          setUser(null);
          localStorage.removeItem("user");
        }
      } catch (error) {
        console.log("Auth check failed:", error);
      }
    };

    checkAuth();
  }, []);

  // ---- Auth actions ----
  const login = async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact: email, password }), // Make sure it's 'contact'
      credentials: "include",
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();

    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.access_token); // Make sure this is saved
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    // optionally call a logout endpoint to clear the cookie if you add one
  };

  return (
    <UserContext.Provider
      value={{ user, setUser, login, logout, theme, setTheme }}
    >
      {children}
    </UserContext.Provider>
  );
}
