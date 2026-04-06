"use client";

import { useEffect, useRef, useState } from "react";
import PageTabs from "./PageTabs";
import { Page } from "@/config/clients";
import { Upload, X } from "lucide-react";

interface PushStep {
  label: string;
  done: boolean;
}

export interface SelectedElement {
  outerHTML: string;
  selector: string;
  label: string;
}

interface PreviewPanelProps {
  html: string;
  isPlaceholder: boolean;
  domain: string;
  pages: Page[];
  activePage: string;
  pickerMode: boolean;
  onPageChange: (filename: string) => void;
  onFileUpload: (file: File) => void;
  onClear: () => void;
  onElementSelect: (el: SelectedElement) => void;
  isPushing: boolean;
  pushSteps: PushStep[];
  pushSuccess: boolean;
  pushError: string | null;
  isLoading: boolean;
}

// Picker script injected into the iframe — highlights hovered elements and
// postMessages the selected element back to the parent on click.
const PICKER_SCRIPT = `
<script id="__webedit_picker__">
(function(){
  var pickerActive = false;

  var overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;pointer-events:none;border:2px solid #3b82f6;background:rgba(59,130,246,0.08);z-index:2147483647;border-radius:2px;box-sizing:border-box;display:none;';

  var badge = document.createElement('div');
  badge.style.cssText = 'position:fixed;pointer-events:none;background:#3b82f6;color:#fff;font:bold 11px/1 monospace;padding:3px 8px 4px;border-radius:3px;z-index:2147483647;display:none;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

  function mount() {
    if (!document.body) return;
    if (!overlay.parentNode) document.body.appendChild(overlay);
    if (!badge.parentNode) document.body.appendChild(badge);
  }

  function ignored(el) {
    return !el || el === overlay || el === badge || el === document.body || el === document.documentElement;
  }

  function sel(el) {
    var s = el.tagName.toLowerCase();
    if (el.id) { s += '#' + el.id; return s; }
    if (el.className && typeof el.className === 'string') {
      var cls = el.className.trim().split(/\\s+/).slice(0,2).join('.');
      if (cls) s += '.' + cls;
    }
    return s;
  }

  function highlight(el) {
    if (ignored(el)) { hide(); return; }
    mount();
    var r = el.getBoundingClientRect();
    overlay.style.cssText += ';display:block;top:' + r.top + 'px;left:' + r.left + 'px;width:' + r.width + 'px;height:' + r.height + 'px;';
    overlay.style.display = 'block';
    overlay.style.top = r.top + 'px';
    overlay.style.left = r.left + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';

    var s = sel(el);
    var txt = (el.textContent || '').trim().replace(/\\s+/g,' ').slice(0,40);
    badge.textContent = txt ? s + ' \u2014 "' + txt + '"' : s;
    badge.style.display = 'block';
    badge.style.top = (r.top > 24 ? r.top - 22 : r.bottom + 4) + 'px';
    badge.style.left = Math.max(4, r.left) + 'px';
    document.body.style.cursor = 'crosshair';
  }

  function hide() {
    overlay.style.display = 'none';
    badge.style.display = 'none';
    if (document.body) document.body.style.cursor = '';
  }

  document.addEventListener('mouseover', function(e) {
    if (!pickerActive) return;
    ignored(e.target) ? hide() : highlight(e.target);
  }, true);

  document.addEventListener('click', function(e) {
    if (!pickerActive) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    var el = e.target;
    if (ignored(el)) return;
    var s = sel(el);
    var txt = (el.textContent || '').trim().replace(/\\s+/g,' ').slice(0,60);
    window.parent.postMessage({
      type: 'webedit-select-element',
      outerHTML: el.outerHTML,
      selector: s,
      label: txt ? s + ' \u2014 "' + txt + '"' : s
    }, '*');
  }, true);

  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'webedit-picker-toggle') {
      pickerActive = !!e.data.active;
      if (!pickerActive) hide();
    }
  });
})();
</script>`;

/**
 * Inject base tag, nav-intercept script, and element picker script into HTML.
 */
function injectHelpers(html: string, domain: string): string {
  const baseTag = `<base href="https://${domain}/" target="_self">`;

  const interceptScript = `<script>
(function(){
  var baseDomain = ${JSON.stringify(domain)};
  document.addEventListener('click', function(e){
    var a = e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href');
    if(!href) return;
    if(/^(mailto:|tel:|javascript:|#)/.test(href)) return;
    // For absolute or protocol-relative URLs, only intercept same-domain links
    if(/^https?:/.test(href) || href.startsWith('//')) {
      try {
        var url = new URL(href.startsWith('//') ? 'https:' + href : href);
        var hHost = url.hostname.replace(/^www\\./, '');
        var bHost = baseDomain.replace(/^www\\./, '');
        if (hHost !== bHost) return;
        href = url.pathname;
      } catch(err) { return; }
    }
    e.preventDefault();
    window.parent.postMessage({type:'webedit-navigate',href:href},'*');
  }, true);
})();
</script>`;

  const inject = `\n  ${baseTag}\n  ${interceptScript}\n  ${PICKER_SCRIPT}`;
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
  pickerMode,
  onPageChange,
  onFileUpload,
  onClear,
  onElementSelect,
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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Flash on HTML update
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

  // Toggle picker mode in the iframe
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "webedit-picker-toggle", active: pickerMode },
      "*"
    );
  }, [pickerMode]);

  // Turn picker off when HTML reloads (iframe remounts)
  useEffect(() => {
    if (pickerMode) {
      // Re-send toggle after iframe reloads
      const timer = setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "webedit-picker-toggle", active: true },
          "*"
        );
      }, 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  // Listen for messages from the iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data) return;

      if (e.data.type === "webedit-navigate") {
        const href: string = e.data.href ?? "";
        let target = href.split("/").pop()?.split("?")[0].split("#")[0] ?? "";
        if (!target || target === "") target = "index.html";
        if (!/\.html?$/i.test(target)) target += ".html";
        const match = pages.find((p) => p.filename === target);
        if (match) onPageChange(match.filename);
        return;
      }

      if (e.data.type === "webedit-select-element") {
        onElementSelect({
          outerHTML: e.data.outerHTML,
          selector: e.data.selector,
          label: e.data.label,
        });
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [pages, onPageChange, onElementSelect]);

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

        {/* Clear button */}
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

      {/* Hidden file input */}
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

        {/* Picker mode hint */}
        {pickerMode && !isPlaceholder && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
            Hover to highlight · Click to select
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
            ref={iframeRef}
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
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  </div>
                  <p className="font-semibold text-red-600 mb-1">Publish failed</p>
                  <p className="text-sm text-gray-500">{pushError}</p>
                </>
              ) : pushSuccess ? (
                <>
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <p className="font-semibold text-green-700 text-lg mb-1">You&apos;re live!</p>
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
