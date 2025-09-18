// frontend/src/pages/SettingsPage.jsx
import { useContext } from "react";
import { UserContext } from "../context/UserContext";

export default function SettingsPage() {
  const { theme, setTheme } = useContext(UserContext);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">General Settings</h1>
      <div className="flex items-center gap-4">
        <span>Theme:</span>
        <button onClick={() => setTheme("light")} className={`px-3 py-1 rounded ${theme==="light"?"bg-blue-500 text-white":""}`}>Light</button>
        <button onClick={() => setTheme("dark")} className={`px-3 py-1 rounded ${theme==="dark"?"bg-blue-500 text-white":""}`}>Dark</button>
      </div>
    </div>
  );
}
