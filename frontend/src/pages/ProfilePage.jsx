// frontend/src/pages/ProfilePage.jsx
import { useContext, useState } from "react";
import { UserContext } from "../context/UserContext";

export default function ProfilePage() {
  const { user, setUser } = useContext(UserContext);
  const [name, setName] = useState(user?.name || "");

  const saveProfile = async () => {
    const res = await fetch("/api/users/update", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    setUser(data.user);
    alert("Profile updated!");
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Profile Settings</h1>
      <input value={name} onChange={(e) => setName(e.target.value)} className="border p-2 rounded w-full mb-4" />
      <button onClick={saveProfile} className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
    </div>
  );
}
