"use client";

import { useEffect, useRef, useState } from "react";
import PageTabs from "./PageTabs";
import { Page } from "@/config/clients";
import { Upload, X } from "lucide-react";

interface PushStep {
  label: string;
  done: boolean;
}

interface PreviewPanelProps {
  html: string;
  isPlaceholder: boolean;
  domain: string;
  pages: Page[];
  activePage: string;
  onPageChange: (filename: string) => void;
  onFileUpload: (file: File) => void;
  onClear: () => void;
  isPushing: boolean;
  pushSteps: PushStep[];
  pushSuccess: boolean;
  pushError: string | null;
  isLoading: boolean;
}

/**
 * Inject a <base> tag (for asset resolution) and a nav-intercept script
 * that catches all internal link clicks and sends them via postMessage
 * to the parent instead of navigating the iframe.
 */
function injectHelpers(html: string, domain: string): string {
  const baseTag = `<base href="https://${domain}/" target="_self">`;

  // Intercept internal link clicks → postMessage to parent
  const interceptScript = `<script>
(function(){
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href');
    if(!href) return;
    // Leave external, anchor, mailto, tel, javascript: links alone
    if(/^(https?:|\/\/|mailto:|tel:|javascript:|#)/.test(href)) return;
    e.preventDefault();
    window.parent.postMessage({type:'webedit-navigate',href:href},'*');
  }, true);
})();
</script>`;

  const inject = `\n  ${baseTag}\n  ${interceptScript}`;
  if (/<head[\s>]/i.test(html)) {
    return html.replace(/(<head[^>]*>)/i, `$1${inject}`);
  }
  return inject + "\n" + html;
}

export default function PreviewPanel({
  html,
  isPlaceholder,
  domain,
  pages,
  activePage,
  onPageChange,
  onFileUpload,
  onClear,
  isPushing,
  pushSteps,
  pushSuccess,
  pushError,
  isLoading,
}: PreviewPanelProps) {
  const [flash, setFlash] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const prevHtmlRef = useRef(html);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (html !== prevHtmlRef.current) {
      prevHtmlRef.current = html;
      if (!isPlaceholder) {
        setFlash(true);
        const t = setTimeout(() => setFlash(false), 800);
        return () => clearTimeout(t);
      }
    }
  }, [html, isPlaceholder]);

  // Listen for nav-intercept messages from the iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type !== "webedit-navigate") return;
      const href: string = e.data.href ?? "";
      // Extract the basename and normalise to a .html filename
      let target = href.split("/").pop()?.split("?")[0].split("#")[0] ?? "";
      if (!target || target === "") target = "index.html";
      if (!/\.html?$/i.test(target)) target += ".html";
      // Only switch if we actually have that page loaded
      const match = pages.find((p) => p.filename === target);
      if (match) onPageChange(match.filename);
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [pages, onPageChange]);

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileUpload(file);
  }

  const previewHtml = html ? injectHelpers(html, domain) : "";

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Browser chrome */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>

        <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
          <span className="text-xs text-gray-600 truncate font-mono">{domain}</span>
        </div>

        {/* Clear button — only when a file is loaded */}
        {!isPlaceholder && (
          <button
            onClick={onClear}
            title="Clear and load a new file"
            className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-red-400 hover:text-red-500 transition-colors cursor-pointer bg-white"
          >
            <X size={12} />
            <span>Clear</span>
          </button>
        )}

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload HTML or ZIP file"
          className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-[#113D79] hover:text-[#113D79] transition-colors cursor-pointer bg-white"
        >
          <Upload size={12} />
          <span>Upload</span>
        </button>

        <span className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
          LIVE PREVIEW
        </span>
      </div>

      {/* Hidden file input — accepts HTML and ZIP */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.zip"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Page tabs */}
      <PageTabs pages={pages} activePage={activePage} onPageChange={onPageChange} />

      {/* Preview area */}
      <div
        className="flex-1 relative overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#113D79]/10 border-4 border-dashed border-[#113D79]/40 rounded-lg m-3 pointer-events-none">
            <div className="text-center">
              <Upload size={36} className="mx-auto mb-3 text-[#113D79]" />
              <p className="font-semibold text-[#113D79]">Drop your file here</p>
            </div>
          </div>
        )}

        {/* Placeholder drop zone */}
        {isPlaceholder && !isDragging ? (
          <div
            className="flex items-center justify-center h-full cursor-pointer group"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-center max-w-sm px-8">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 border-2 border-dashed border-gray-300 group-hover:border-[#113D79]/50 group-hover:bg-blue-50 transition-all">
                <Upload size={28} className="text-gray-400 group-hover:text-[#113D79] transition-colors" />
              </div>
              <p className="font-semibold text-gray-700 mb-1 group-hover:text-[#113D79] transition-colors">
                Drop your website files here
              </p>
              <p className="text-sm text-gray-400 mb-4">or click to browse</p>
              <div className="flex items-center justify-center gap-3 text-xs text-gray-400">
                <span className="bg-gray-100 px-2 py-1 rounded font-mono">.zip</span>
                <span className="text-gray-300">—</span>
                <span>whole site (multiple pages)</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-xs text-gray-400 mt-1.5">
                <span className="bg-gray-100 px-2 py-1 rounded font-mono">.html</span>
                <span className="text-gray-300">—</span>
                <span>single page</span>
              </div>
            </div>
          </div>
        ) : !isPlaceholder ? (
          <iframe
            srcDoc={previewHtml}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="Website Preview"
          />
        ) : null}

        {/* Green flash on update */}
        {flash && (
          <div
            className="absolute inset-0 pointer-events-none preview-flash"
            style={{ background: "rgba(34, 197, 94, 0.2)" }}
          />
        )}

        {/* Loading overlay */}
        {isLoading && !isPlaceholder && (
          <div className="absolute inset-0 bg-white/40 pointer-events-none" />
        )}

        {/* Push overlay */}
        {(isPushing || pushSuccess || pushError) && (
          <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
            <div className="text-center max-w-xs px-6">
              {pushError ? (
                <>
                  <div className="text-4xl mb-3">❌</div>
                  <p className="font-semibold text-red-600 mb-1">Push failed</p>
                  <p className="text-sm text-gray-500">{pushError}</p>
                </>
              ) : pushSuccess ? (
                <>
                  <div className="text-5xl mb-3">✅</div>
                  <p className="font-semibold text-green-700 text-lg mb-1">You're live!</p>
                  <p className="text-sm text-gray-500">
                    Your changes are being deployed to {domain}
                  </p>
                </>
              ) : (
                <>
                  <div className="mb-5">
                    <div
                      className="w-10 h-10 border-4 border-gray-200 rounded-full mx-auto"
                      style={{ borderTopColor: "#113D79", animation: "spin 0.8s linear infinite" }}
                    />
                  </div>
                  <div className="space-y-2">
                    {pushSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={step.done ? "text-green-500" : "text-gray-400"}>
                          {step.done ? "✓" : "○"}
                        </span>
                        <span className={step.done ? "text-gray-800" : "text-gray-400"}>
                          {step.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
