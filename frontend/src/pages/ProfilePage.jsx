// frontend/src/pages/ProfilePage.jsx
import { useContext, useState, useRef } from "react";
import AvatarEditor from "react-avatar-editor";
import { UserContext } from "../context/UserContext";

export default function ProfilePage() {
  const { user, setUser } = useContext(UserContext);

  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [scale, setScale] = useState(1);
  const editorRef = useRef(null);

  const saveProfile = async () => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("phone", phone);

    if (editorRef.current) {
      const canvas = editorRef.current.getImageScaledToCanvas();
      canvas.toBlob((blob) => {
        if (blob) {
          formData.append("avatar", blob, avatarFile?.name || "avatar.png");
        }
        sendProfile(formData);
      }, "image/png");
    } else {
      sendProfile(formData);
    }
  };

  const sendProfile = async (formData) => {
    try {
      const res = await fetch("/api/profile", {
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
    } catch (err) {
      console.error(err);
      alert("Failed to update profile: Network error");
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
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
    } catch (err) {
      console.error(err);
      alert("Failed to change password: Network error");
    }
  };

  return (
    <div className="p-6 space-y-4 max-w-md mx-auto">
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

      <div className="flex flex-col items-center space-y-2">
        {avatarFile ? (
          <AvatarEditor
            ref={editorRef}
            image={avatarFile}
            width={150}
            height={150}
            border={50}
            borderRadius={75}
            scale={scale}
          />
        ) : (
          <img
            src={user?.avatar_url || "/default-avatar.png"}
            alt="Avatar"
            className="w-36 h-36 rounded-full object-cover"
          />
        )}

        <input
          type="file"
          accept="image/*"
          onChange={(e) => setAvatarFile(e.target.files[0])}
          className="w-full"
        />

        {avatarFile && (
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
          />
        )}
      </div>

      <button
        onClick={saveProfile}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full"
      >
        Save Profile
      </button>

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
          className="bg-green-600 text-white px-4 py-2 rounded w-full"
        >
          Change Password
        </button>
      </div>
    </div>
  );
}
