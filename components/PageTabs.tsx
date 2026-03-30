"use client";

import { Page } from "@/config/clients";

interface PageTabsProps {
  pages: Page[];
  activePage: string;
  onPageChange: (filename: string) => void;
}

export default function PageTabs({ pages, activePage, onPageChange }: PageTabsProps) {
  if (pages.length <= 1) return null;

  return (
    <div className="flex gap-1 px-4 pt-2 border-b border-gray-200 bg-gray-50">
      {pages.map((page) => {
        const isActive = page.filename === activePage;
        return (
          <button
            key={page.filename}
            onClick={() => onPageChange(page.filename)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all cursor-pointer ${
              isActive
                ? "border-[#113D79] text-[#113D79] bg-white"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            }`}
          >
            {page.label}
          </button>
        );
      })}
    </div>
  );
}
