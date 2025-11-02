import React from "react";
import { Link } from "react-router-dom";
import {
  FileSpreadsheet, FileImage, FileType, FileDown,
  FileUp, FilePlus, FileArchive, FileText,
  FileInput,
} from "lucide-react";

const features = [
  { title: "PDF → Word", description: "Convert PDF to editable Word document.", icon: FileText, link: "/tools/pdf-to-word" },
  { title: "Word → PDF", description: "Convert Word to PDF document.", icon: FileType, link: "/tools/word-to-pdf" },
  { title: "Image → PDF", description: "Convert images to PDF.", icon: FileImage, link: "/tools/image-to-pdf" },
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
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Link
                key={index}
                to={feature.link}
                className="group p-3 sm:p-4 md:p-5 flex flex-col items-center text-center 
                           rounded-2xl bg-gradient-to-br from-blue-400/40 to-blue-600/40 
                           border border-blue-200/30 shadow-lg shadow-blue-300/40
                           hover:scale-105 active:scale-95 transition-all duration-200"
                title={feature.title}
              >
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 flex items-center justify-center">
                  <Icon size={24} className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-white drop-shadow-lg" />
                  <span className="absolute top-1 left-1 w-2 h-2 rounded-full bg-white/30 blur-sm"></span>
                </div>
                <h3 className="mt-2 sm:mt-3 md:mt-4 font-display font-semibold text-xs sm:text-sm md:text-base text-white">{feature.title}</h3>
                <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-white/80 line-clamp-2">{feature.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
