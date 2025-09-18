// frontend/src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from "./App.jsx";
import FileToolPage from "./pages/FileToolPage.jsx"; // Page for individual tools
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import "./index.css"; // Tailwind styles

import * as serviceWorkerRegistration from "./serviceWorkerRegistration";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Dashboard */}
        <Route path="/" element={<App />} />

        {/* Authentication */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Dynamic tool pages */}
        <Route path="/tools/:action" element={<FileToolPage />} />

        {/* Catch-all for undefined routes */}
        <Route
          path="*"
          element={<div className="p-6 text-center">Page Not Found</div>}
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

// Keep service worker registration
serviceWorkerRegistration.register();
