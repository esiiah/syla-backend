// frontend/src/pages/FileToolPage.jsx
import React from "react";
import { useParams } from "react-router-dom";
import FileUpload from "../components/FileUpload.jsx";
import FileList from "../components/FileList.jsx";

export default function FileToolPage() {
  const { action } = useParams(); // e.g., compress, merge, pdf-to-excel

  // Format action nicely: "pdf-to-excel" -> "Pdf To Excel"
  const formattedAction = action
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Page Title */}
      <h1 className="text-2xl font-display mb-6">
        {formattedAction} Tool
      </h1>

      {/* Upload Panel */}
      <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6 mb-6">
        <FileUpload endpoint={`/api/filetools/${action}`} />
      </section>

      {/* List of Uploaded Files */}
      <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6 mb-6">
        <FileList />
      </section>

      {/* Optional Info / Footer Section */}
      <section className="text-sm text-gray-500 dark:text-gray-400 mt-6">
        <p>
          Uploaded files for <span className="font-medium">{formattedAction}</span> are listed above. You can remove or process them as needed.
        </p>
      </section>
    </div>
  );
}
