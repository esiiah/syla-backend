import React from "react";
import { useParams } from "react-router-dom";
import FileUpload from "../components/FileUpload.jsx";
import FileList from "../components/FileList.jsx";

export default function FileToolPage() {
  const { action } = useParams(); // e.g. compress, merge, convert

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-display mb-6 capitalize">
        {action} Tool
      </h1>

      {/* Upload Panel */}
      <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6 mb-6">
        <FileUpload endpoint={`/api/filetools/${action}`} />
      </section>

      {/* List of Uploaded Files */}
      <section className="rounded-2xl bg-white border border-gray-200 shadow-sm dark:bg-ink/80 dark:border-white/5 neon-border p-6">
        <FileList />
      </section>
    </div>
  );
}
