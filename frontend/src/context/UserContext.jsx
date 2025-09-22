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

    // Pull fresh user from backend if token exists
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            setUser(data);
            localStorage.setItem("user", JSON.stringify(data));
          }
        })
        .catch(() => {});
    }
  }, []);

  // ---- Auth actions ----
  const login = async (email, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();

    setUser(data.user);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <UserContext.Provider
      value={{ user, setUser, login, logout, theme, setTheme }}
    >
      {children}
    </UserContext.Provider>
  );
}
