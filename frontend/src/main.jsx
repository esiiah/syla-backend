import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App.jsx";
import FileToolPage from "./pages/FileToolPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import UserProvider from "./context/UserContext.jsx";    // ✅ added
import ForecastPage from "./pages/ForecastPage.jsx";
import EditingPage from "./pages/EditingPage.jsx";
import "./index.css";

import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UserProvider>            {/* ✅ wrap everything in the provider */}
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/tools/:action" element={<FileToolPage />} />
          <Route path="/forecast" element={<ForecastPage />} />
          <Route path="/editing" element={<EditingPage />} />
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-200 mb-2">
                    Page Not Found
                  </h1>
                  <p className="text-gray-600 dark:text-slate-400 mb-4">
                    The page you're looking for doesn't exist.
                  </p>
                  <a
                    href="/"
                    className="px-4 py-2 bg-neonBlue text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
                  >
                    Go Home
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
    </UserProvider>
  </React.StrictMode>
);

serviceWorkerRegistration.register();
