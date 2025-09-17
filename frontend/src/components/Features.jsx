import React from "react";
import { Link } from "react-router-dom";
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
  { title: "PDF → Excel", description: "Convert PDF to Excel.", icon: FileSpreadsheet, link: "/tools/pdf-to-excel" },
  { title: "Merge PDF", description: "Combine multiple PDFs.", icon: FilePlus, link: "/tools/merge" },
  { title: "Compress File", description: "Reduce PDF/Excel/CSV size.", icon: FileArchive, link: "/tools/compress" },
  { title: "CSV → Excel", description: "Convert CSV to Excel.", icon: FileUp, link: "/tools/csv-to-excel" },
  { title: "Excel → CSV", description: "Export Excel to CSV.", icon: FileDown, link: "/tools/excel-to-csv" },
  { title: "CSV → PDF", description: "Convert CSV into PDF.", icon: FileText, link: "/tools/csv-to-pdf" },
  { title: "Excel → PDF", description: "Turn Excel into PDF.", icon: FileType, link: "/tools/excel-to-pdf" },
  { title: "PDF → CSV", description: "Extract tables from PDF into CSV.", icon: FileInput, link: "/tools/pdf-to-csv" },
  { title: "PDF → Excel (alt)", description: "Alternative conversion route (if needed).", icon: FileSpreadsheet, link: "/tools/pdf-to-excel" },
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
              <Link
                key={index}
                to={feature.link}
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
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
