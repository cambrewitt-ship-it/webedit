"use client";

import { useEffect, useState, useCallback, use, useRef } from "react";
import JSZip from "jszip";
import { getClient, Page } from "@/config/clients";
import PasswordGate from "@/components/PasswordGate";
import ChatPanel from "@/components/ChatPanel";
import PreviewPanel, { SelectedElement } from "@/components/PreviewPanel";
import PushButton from "@/components/PushButton";
import BuyCreditsModal from "@/components/BuyCreditsModal";
import { Message } from "@/components/MessageBubble";
import { RotateCcw, RotateCw, Trash2 } from "lucide-react";

interface UploadedImage {
  data: string;
  name: string;
  type: string;
}

interface PushStep {
  label: string;
  done: boolean;
}

// Used when no file is loaded yet
const EMPTY_HTML = "";

/** Turn a filename into a readable tab label */
function filenameToLabel(filename: string): string {
  const base = filename.replace(/\.html?$/i, "");
  if (base === "index") return "Home";
  return base.charAt(0).toUpperCase() + base.slice(1).replace(/[-_]/g, " ");
}

/** Map file extension to MIME type */
function getMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    ico: "image/x-icon", bmp: "image/bmp", avif: "image/avif",
  };
  return map[ext] ?? "application/octet-stream";
}

/** Resolve a relative path against a base directory */
function resolvePath(baseDir: string, relative: string): string {
  if (relative.startsWith("/")) return relative.slice(1);
  const parts = (baseDir + relative).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== ".") out.push(p);
  }
  return out.join("/");
}

/** Replace relative src/url() references in HTML with base64 data URLs */
function embedAssets(
  html: string,
  byPath: Record<string, string>,
  byBasename: Record<string, string>,
  htmlDir: string
): string {
  function resolve(src: string): string | null {
    if (!src || src.startsWith("data:") || src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//")) return null;
    const stripped = src.startsWith("/") ? src.slice(1) : src;
    const full = resolvePath(htmlDir, src);
    return byPath[full] ?? byPath[stripped] ?? byBasename[src.split("/").pop()?.split("?")[0] ?? ""] ?? null;
  }

  // Replace img src, video poster, source src, link href (favicons)
  html = html.replace(/((?:src|poster|href)=["'])([^"']+)(["'])/gi, (match, pre, val, post) => {
    const replacement = resolve(val);
    return replacement ? `${pre}${replacement}${post}` : match;
  });

  // Replace CSS url()
  html = html.replace(/url\(\s*["']?([^"')]+)["']?\s*\)/gi, (match, val) => {
    const replacement = resolve(val.trim());
    return replacement ? `url('${replacement}')` : match;
  });

  return html;
}

export default function EditorPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params);
  const client = getClient(clientId);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Which pages are available (either from client config or from an uploaded ZIP)
  const [sessionPages, setSessionPages] = useState<Page[] | null>(null);
  const activePagesConfig = sessionPages ?? client?.pages ?? [];

  // Map of filename → html for ALL pages in the session
  const [htmlMap, setHtmlMap] = useState<Record<string, string>>({});
  const [savedHtmlMap, setSavedHtmlMap] = useState<Record<string, string>>({});

  const [activePage, setActivePage] = useState(client?.pages[0]?.filename ?? "index.html");
  const [isPlaceholder, setIsPlaceholder] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [pickerMode, setPickerMode] = useState(false);

  // Undo / redo stacks keyed by filename
  const undoStack = useRef<Record<string, string[]>>({});
  const redoStack = useRef<Record<string, string[]>>({});
  const [historySize, setHistorySize] = useState({ undo: 0, redo: 0 });

  function refreshHistorySize() {
    setHistorySize({
      undo: (undoStack.current[activePage] ?? []).length,
      redo: (redoStack.current[activePage] ?? []).length,
    });
  }

  function pushUndo(page: string, html: string) {
    undoStack.current[page] = [...(undoStack.current[page] ?? []), html];
    redoStack.current[page] = [];
    refreshHistorySize();
  }

  function handleUndo() {
    const stack = undoStack.current[activePage] ?? [];
    if (!stack.length) return;
    const prev = stack[stack.length - 1];
    undoStack.current[activePage] = stack.slice(0, -1);
    redoStack.current[activePage] = [...(redoStack.current[activePage] ?? []), currentHtml];
    setCurrentHtml(prev);
    refreshHistorySize();
  }

  function handleRedo() {
    const stack = redoStack.current[activePage] ?? [];
    if (!stack.length) return;
    const next = stack[stack.length - 1];
    redoStack.current[activePage] = stack.slice(0, -1);
    undoStack.current[activePage] = [...(undoStack.current[activePage] ?? []), currentHtml];
    setCurrentHtml(next);
    refreshHistorySize();
  }

  function handleClearAllChanges() {
    if (!confirm("Discard all unsaved changes and revert to the last saved version?")) return;
    setCurrentHtml(savedHtml);
    undoStack.current[activePage] = [];
    redoStack.current[activePage] = [];
    refreshHistorySize();
  }

  // Push state
  const [isPushing, setIsPushing] = useState(false);

  // Password change modal
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);
  const [changePasswordDone, setChangePasswordDone] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangePasswordError(null);
    if (newPassword !== confirmPassword) {
      setChangePasswordError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError("Password must be at least 6 characters.");
      return;
    }
    setChangingPassword(true);
    const res = await fetch("/api/client/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    setChangingPassword(false);
    if (res.ok) {
      setChangePasswordDone(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => { setShowChangePassword(false); setChangePasswordDone(false); }, 2000);
    } else {
      const data = await res.json();
      setChangePasswordError(data.error ?? "Failed to update password.");
    }
  }
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [budgetInfo, setBudgetInfo] = useState<{ usedTokens: number; budgetTokens: number } | null>(null);
  const [pushStep, setPushStep] = useState("");
  const [pushSteps, setPushSteps] = useState<PushStep[]>([]);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  // Current and saved HTML for the active page
  const currentHtml = htmlMap[activePage] ?? EMPTY_HTML;
  const savedHtml = savedHtmlMap[activePage] ?? EMPTY_HTML;
  const hasChanges = currentHtml !== savedHtml && !isPlaceholder;

  function setCurrentHtml(html: string) {
    setHtmlMap((prev) => ({ ...prev, [activePage]: html }));
  }

  // ---------- Auth ----------

  // Detect Stripe payment success redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setPaymentSuccess(true);
      // Clean the URL without reloading
      window.history.replaceState({}, "", window.location.pathname);
      const t = setTimeout(() => setPaymentSuccess(false), 6000);
      return () => clearTimeout(t);
    }
  }, []);

  // Check for existing server-side session on mount
  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((data) => {
        if (data.clientId === clientId) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePasswordSubmit = useCallback(async (pw: string) => {
    setAuthError(false);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, password: pw }),
    });
    if (res.ok) {
      setIsAuthenticated(true);
    } else {
      setAuthError(true);
    }
  }, [clientId]);

  // ---------- GitHub fetch ----------

  const fetchPage = useCallback(async (filename: string) => {
    setIsPlaceholder(true);
    try {
      const res = await fetch("/api/fetch-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (!res.ok) {
        let errMessage = `Failed to fetch page: ${res.status} ${res.statusText}`;
        try {
          const errBody = await res.json();
          if (errBody?.error) errMessage = `Failed to fetch page: ${errBody.error}`;
        } catch {}
        console.error(errMessage);
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: "Could not load page content from GitHub. Please check repository config or upload a file.",
            timestamp: new Date(),
          },
        ]);
        // keep placeholder state when fetch fails, so chat remains disabled until valid HTML is loaded
        setIsPlaceholder(true);
        return;
      }

      const data = await res.json();
      setHtmlMap((prev) => ({ ...prev, [filename]: data.html }));
      setSavedHtmlMap((prev) => ({ ...prev, [filename]: data.html }));
      setIsPlaceholder(false);
    } catch (err) {
      console.error("Failed to fetch page:", err);
      setIsPlaceholder(true);
    }
  }, [clientId]);

  // Load initial page after auth
  useEffect(() => {
    if (isAuthenticated && client) {
      fetchPage(client.pages[0].filename);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ---------- File upload handlers ----------

  /** Single .html file uploaded */
  function handleSingleFileUpload(html: string, filename: string) {
    const label = filenameToLabel(filename);
    const page: Page = { label, filename };
    setSessionPages([page]);
    setHtmlMap({ [filename]: html });
    setSavedHtmlMap({ [filename]: html });
    setActivePage(filename);
    setIsPlaceholder(false);
    setMessages([]);
  }

  /** ZIP uploaded — extract all HTML files and embed images as base64 */
  async function handleZipUpload(file: File) {
    try {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter(
        (f) => !f.dir && !f.name.startsWith("__MACOSX") && !f.name.startsWith(".")
      );

      // --- Extract images ---
      const imageExts = /\.(jpg|jpeg|png|gif|webp|svg|ico|bmp|avif)$/i;
      const byPath: Record<string, string> = {};
      const byBasename: Record<string, string> = {};

      await Promise.all(
        entries
          .filter((f) => imageExts.test(f.name))
          .map(async (f) => {
            const b64 = await f.async("base64");
            const mime = getMimeType(f.name);
            const dataUrl = `data:${mime};base64,${b64}`;
            byPath[f.name] = dataUrl;
            byBasename[f.name.split("/").pop()!] = dataUrl;
          })
      );

      // --- Extract HTML files ---
      const rawHtmlFiles = entries.filter((f) => /\.(html|htm)$/i.test(f.name));

      if (rawHtmlFiles.length === 0) {
        alert("No HTML files found in this ZIP.");
        return;
      }

      const htmlFiles: { filename: string; html: string }[] = [];
      for (const entry of rawHtmlFiles) {
        const raw = await entry.async("string");
        const htmlDir = entry.name.includes("/")
          ? entry.name.split("/").slice(0, -1).join("/") + "/"
          : "";
        const html = embedAssets(raw, byPath, byBasename, htmlDir);
        const filename = entry.name.split("/").pop()!;
        htmlFiles.push({ filename, html });
      }

      // Sort: index.html first, then alphabetically
      htmlFiles.sort((a, b) => {
        if (a.filename === "index.html") return -1;
        if (b.filename === "index.html") return 1;
        return a.filename.localeCompare(b.filename);
      });

      const pages: Page[] = htmlFiles.map(({ filename }) => ({
        label: filenameToLabel(filename),
        filename,
      }));

      const newHtmlMap: Record<string, string> = {};
      for (const { filename, html } of htmlFiles) {
        newHtmlMap[filename] = html;
      }

      setSessionPages(pages);
      setHtmlMap(newHtmlMap);
      setSavedHtmlMap({ ...newHtmlMap });
      setActivePage(pages[0].filename);
      setIsPlaceholder(false);
      setMessages([]);
    } catch (e) {
      console.error(e);
      alert("Failed to read ZIP file. Make sure it's a valid ZIP.");
    }
  }

  /** Called by PreviewPanel when a file is dropped/picked */
  function handleFileUpload(file: File) {
    if (file.name.toLowerCase().endsWith(".zip")) {
      handleZipUpload(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleSingleFileUpload(e.target?.result as string, file.name);
      };
      reader.readAsText(file);
    }
  }

  /** Clear everything and return to upload state */
  function handleClear() {
    setSessionPages(null);
    setHtmlMap({});
    setSavedHtmlMap({});
    setActivePage(client?.pages[0]?.filename ?? "index.html");
    setIsPlaceholder(true);
    setMessages([]);
    setPushSuccess(false);
    setPushError(null);
  }

  // ---------- Page switching ----------

  function handlePageChange(filename: string) {
    if (filename === activePage) return;
    // If this page hasn't been fetched from GitHub yet, fetch it
    if (!htmlMap[filename] && isAuthenticated && !sessionPages) {
      fetchPage(filename);
    }
    setActivePage(filename);
    setMessages([]);
    setPushSuccess(false);
    setPushError(null);
  }

  // ---------- AI ----------

  function buildHistory() {
    return messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  async function handleSendMessage(text: string) {
    if (!isAuthenticated || isLoading || isPlaceholder || !currentHtml) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
      imageData: uploadedImage?.data ?? undefined,
      imageType: uploadedImage?.type ?? undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    const imageToSend = uploadedImage;
    const elementToSend = selectedElement;
    setUploadedImage(null);
    setSelectedElement(null);

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentHtml,
          userMessage: text,
          imageBase64: imageToSend?.data ?? null,
          imageMediaType: imageToSend?.type ?? null,
          selectedElementHtml: elementToSend?.outerHTML ?? null,
          selectedElementLabel: elementToSend?.label ?? null,
          history: buildHistory(),
        }),
      });

      let data: { error?: string; usedTokens?: number; budgetTokens?: number; message?: string; html?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error(
          res.status === 413
            ? "Image is too large to upload. Please use a smaller image (under 2MB)."
            : `Server error (${res.status}). Please try again.`
        );
      }

      // Budget exceeded — show upgrade modal instead of an error message
      if (res.status === 402 && data.error === "BUDGET_EXCEEDED") {
        setBudgetInfo({ usedTokens: data.usedTokens ?? 0, budgetTokens: data.budgetTokens ?? 0 });
        setShowBuyCredits(true);
        setIsLoading(false);
        return;
      }

      if (!res.ok || data.error) throw new Error(data.error || "Unknown error");

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
        },
      ]);
      pushUndo(activePage, currentHtml);
      setCurrentHtml(data.html);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Sorry, something went wrong. ${err instanceof Error ? err.message : "Please try again."}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  // ---------- Push ----------

  async function handlePush() {
    if (!isAuthenticated || !hasChanges || isPushing) return;

    setIsPushing(true);
    setPushError(null);
    setPushSuccess(false);

    const steps: PushStep[] = [
      { label: "Committing to GitHub...", done: false },
      { label: "Triggering deploy...", done: false },
      { label: "Going live...", done: false },
    ];
    setPushSteps([...steps]);
    setPushStep("Committing to GitHub...");

    try {
      await new Promise((r) => setTimeout(r, 600));
      steps[0].done = true;
      setPushSteps([...steps]);
      setPushStep("Triggering deploy...");

      const res = await fetch("/api/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: activePage, html: currentHtml }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Push failed");

      steps[1].done = true;
      setPushSteps([...steps]);
      setPushStep("Going live...");
      await new Promise((r) => setTimeout(r, 800));

      steps[2].done = true;
      setPushSteps([...steps]);
      await new Promise((r) => setTimeout(r, 400));

      setSavedHtmlMap((prev) => ({ ...prev, [activePage]: currentHtml }));
      setPushSuccess(true);
      setPushStep("");

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "Your changes have been published! They'll be visible on your website in a minute or two.",
          timestamp: new Date(),
        },
      ]);

      setTimeout(() => setPushSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setPushError(msg);
      setPushStep("");
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: `Publish failed: ${msg}. Please try again or contact your web team.`,
          timestamp: new Date(),
        },
      ]);
      setTimeout(() => setPushError(null), 5000);
    } finally {
      setIsPushing(false);
    }
  }

  // ---------- Render ----------

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Client not found</h1>
          <p className="text-gray-500 text-sm">Check the URL and try again.</p>
        </div>
      </div>
    );
  }

  if (checkingSession) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <PasswordGate
        clientName={client.name}
        onSuccess={handlePasswordSubmit}
        externalError={authError ? "Incorrect password. Please try again." : undefined}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "#f8f9fc" }}>
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-5 py-3 border-b border-white/10 flex-shrink-0"
        style={{ background: "#113D79" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 whitespace-nowrap">
            {client.resellerBrandName ? (
              <>
                {client.resellerBrandLogo ? (
                  <img src={client.resellerBrandLogo} alt={client.resellerBrandName} className="h-8 w-auto object-contain" />
                ) : (
                  <span className="text-base font-bold text-white tracking-wide">{client.resellerBrandName}</span>
                )}
              </>
            ) : (
              <>
                <span className="text-base text-white tracking-wide" style={{ fontFamily: "Inter, sans-serif" }}>
                  <span className="font-bold">WebEdit</span> by
                </span>
                <img
                  src="/Logo_Drafts__1_-removebg-preview.png"
                  alt="113 Digital"
                  className="h-8 w-auto"
                />
              </>
            )}
          </div>
          <div className="w-px h-5 bg-white/20" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-400/50" />
            <span className="text-sm font-medium text-white/90">{client.name}</span>
          </div>
        </div>

        {/* Undo / Redo / Clear */}
        {!isPlaceholder && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={historySize.undo === 0}
              title="Undo last change"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <RotateCcw size={15} />
            </button>
            <button
              onClick={handleRedo}
              disabled={historySize.redo === 0}
              title="Redo"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <RotateCw size={15} />
            </button>
            <button
              onClick={handleClearAllChanges}
              disabled={!hasChanges}
              title="Clear all unsaved changes"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Clear all</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChangePassword(true)}
            title="Change your password"
            className="text-xs text-white/50 hover:text-white/80 transition-colors hidden sm:block"
          >
            Change password
          </button>
          <PushButton
            hasChanges={hasChanges}
            isPushing={isPushing}
            pushStep={pushStep}
            onPush={handlePush}
          />
        </div>
      </header>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-800">Change Password</h3>
              <button onClick={() => { setShowChangePassword(false); setChangePasswordError(null); setNewPassword(""); setConfirmPassword(""); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            {changePasswordDone ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">✓</div>
                <p className="text-gray-700 font-medium">Password updated!</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">New password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoFocus
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Confirm new password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#113D79]"
                  />
                </div>
                {changePasswordError && <p className="text-red-500 text-sm">{changePasswordError}</p>}
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-50"
                  style={{ background: "#113D79" }}
                >
                  {changingPassword ? "Saving…" : "Update password"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main panels */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="h-[45vh] md:h-full md:w-[380px] md:flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col overflow-hidden">
          <ChatPanel
            isPlaceholder={isPlaceholder}
            messages={messages}
            isLoading={isLoading}
            uploadedImage={uploadedImage}
            selectedElement={selectedElement}
            pickerMode={pickerMode}
            activePageLabel={activePagesConfig.find((p) => p.filename === activePage)?.label}
            pages={activePagesConfig}
            activePage={activePage}
            onPageChange={handlePageChange}
            onSendMessage={handleSendMessage}
            onImageUpload={setUploadedImage}
            onImageRemove={() => setUploadedImage(null)}
            onClearElement={() => setSelectedElement(null)}
            onTogglePicker={() => setPickerMode((v) => !v)}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <PreviewPanel
            html={currentHtml}
            isPlaceholder={isPlaceholder}
            domain={client.domain}
            pages={activePagesConfig}
            activePage={activePage}
            onPageChange={handlePageChange}
            onFileUpload={handleFileUpload}
            onClear={handleClear}
            onElementSelect={(el) => { setSelectedElement(el); setPickerMode(false); }}
            pickerMode={pickerMode}
            isPushing={isPushing}
            pushSteps={pushSteps}
            pushSuccess={pushSuccess}
            pushError={pushError}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Buy credits modal */}
      {showBuyCredits && isAuthenticated && (
        <BuyCreditsModal
          clientId={clientId}
          usedTokens={budgetInfo?.usedTokens}
          budgetTokens={budgetInfo?.budgetTokens}
          onClose={() => setShowBuyCredits(false)}
        />
      )}

      {/* Payment success toast */}
      {paymentSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-white text-sm font-medium" style={{ background: "#16a34a" }}>
          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Payment successful — your tokens have been added. You&apos;re good to keep editing!
        </div>
      )}
    </div>
  );
}
