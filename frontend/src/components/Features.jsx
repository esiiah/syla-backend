// frontend/src/components/Features.jsx
import React from "react";
import {
  FileSpreadsheet,
  FileType,
  FileDown,
  FileUp,
  FilePlus,
  FileArchive,
  FileText,
  FileInput,
} from "lucide-react";

const features = [
  {
    title: "PDF to Excel",
    description: "Convert PDF documents into editable Excel spreadsheets.",
    icon: FileSpreadsheet,
    link: "/tools/pdf-to-excel",
  },
  {
    title: "Excel to PDF",
    description: "Turn your Excel spreadsheets into PDF documents easily.",
    icon: FileType,
    link: "/tools/excel-to-pdf",
  },
  {
    title: "Excel to CSV",
    description: "Export Excel files to CSV for easier data handling.",
    icon: FileDown,
    link: "/tools/excel-to-csv",
  },
  {
    title: "CSV to Excel",
    description: "Convert CSV files into Excel spreadsheets in seconds.",
    icon: FileUp,
    link: "/tools/csv-to-excel",
  },
  {
    title: "PDF to CSV",
    description: "Extract tables from PDF files into clean CSV format.",
    icon: FileInput,
    link: "/tools/pdf-to-csv",
  },
  {
    title: "CSV to PDF",
    description: "Convert CSV data into a neatly formatted PDF.",
    icon: FileText,
    link: "/tools/csv-to-pdf",
  },
  {
    title: "Merge PDF",
    description: "Combine multiple PDFs into one seamless document.",
    icon: FilePlus,
    link: "/tools/merge",
  },
  {
    title: "Compress File",
    description: "Reduce the size of PDF, Excel, or CSV files.",
    icon: FileArchive,
    link: "/tools/compress",
  },
  {
    title: "Word to PDF",
    description: "Convert DOC/DOCX files into high-quality PDFs.",
    icon: FileText,
    link: "/tools/word-to-pdf",
  },
  {
    title: "PDF to Word",
    description: "Turn your PDF files into editable Word documents.",
    icon: FileText,
    link: "/tools/pdf-to-word",
  },
];

export default function Features() {
  return (
    <section className="py-6 bg-transparent">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <h2 className="text-3xl font-display text-center mb-8 text-primary">Our File Tools</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <a
                key={index}
                href={feature.link}
                target="_blank"                // <-- opens in new tab
                rel="noopener noreferrer"      // <-- security best practice
                className="p-6 bg-white dark:bg-ink/80 rounded-2xl shadow-sm hover:shadow-md transform hover:scale-101 transition-all duration-300 flex flex-col items-start space-y-4 border border-gray-200 dark:border-white/5 neon-border"
                title={feature.title}
              >
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
                  <Icon size={28} />
                </div>
                <h3 className="text-lg font-display font-semibold text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{feature.description}</p>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
