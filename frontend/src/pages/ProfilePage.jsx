// frontend/src/pages/ProfilePage.jsx
import { useContext, useState } from "react";
import { UserContext } from "../context/UserContext";

export default function ProfilePage() {
  const { user, setUser } = useContext(UserContext);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatarFile, setAvatarFile] = useState(null);

  const saveProfile = async () => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);
    if (avatarFile) formData.append("avatar", avatarFile);

    const res = await fetch("/api/profile/", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      alert(`Failed to update profile: ${err.detail}`);
      return;
    }

    const updatedUser = await res.json();
    setUser(updatedUser);
    alert("Profile updated!");
  };

  const changePassword = async (currentPassword, newPassword) => {
    const formData = new FormData();
    formData.append("current_password", currentPassword);
    formData.append("new_password", newPassword);

    const res = await fetch("/api/profile/change-password", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json();
      alert(`Password change failed: ${err.detail}`);
      return;
    }

    alert("Password changed successfully!");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold mb-4">Profile Settings</h1>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2 rounded w-full"
        placeholder="Full Name"
      />

      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 rounded w-full"
        placeholder="Email"
      />

      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="border p-2 rounded w-full"
        placeholder="Phone"
      />

      <input
        type="file"
        onChange={(e) => setAvatarFile(e.target.files[0])}
        className="w-full"
      />

      <button
        onClick={saveProfile}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Save Profile
      </button>

      {/* Example: Change password */}
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Change Password</h2>
        <input
          type="password"
          placeholder="Current Password"
          id="currentPassword"
          className="border p-2 rounded w-full mb-2"
        />
        <input
          type="password"
          placeholder="New Password"
          id="newPassword"
          className="border p-2 rounded w-full mb-2"
        />
        <button
          onClick={() =>
            changePassword(
              document.getElementById("currentPassword").value,
              document.getElementById("newPassword").value
            )
          }
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Change Password
        </button>
      </div>
    </div>
  );
}
