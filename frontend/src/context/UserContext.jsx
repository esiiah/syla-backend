// frontend/src/context/UserContext.jsx
import React, { createContext, useState, useEffect } from "react";

export const UserContext = createContext();

export default function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // ---- Theme handling ----
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // ---- Hydrate user on app load ----
  useEffect(() => {
    // Pull user from localStorage if present
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    // Always try to pull fresh user from backend using auth cookie
    fetch("/api/profile", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setUser(data);
          localStorage.setItem("user", JSON.stringify(data));
        }
      })
      .catch(() => {});
  }, []);

  // ---- Auth actions ----
  const login = async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include", // send/receive auth cookie
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();

    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
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
