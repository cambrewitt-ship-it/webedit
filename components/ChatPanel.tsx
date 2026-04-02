"use client";

import { useRef, useEffect, useState } from "react";
import MessageBubble, { TypingIndicator, Message } from "./MessageBubble";
import { Send, Camera, X, ChevronDown, MousePointer } from "lucide-react";
import { Page } from "@/config/clients";
import { SelectedElement } from "./PreviewPanel";

const SUGGESTION_CHIPS = [
  "Change phone number",
  "Update business hours",
  "Change hero headline",
  "Add a new service",
];

interface UploadedImage {
  data: string;
  name: string;
  type: string;
}

interface ChatPanelProps {
  isPlaceholder?: boolean;
  messages: Message[];
  isLoading: boolean;
  uploadedImage: UploadedImage | null;
  selectedElement: SelectedElement | null;
  pickerMode: boolean;
  activePageLabel?: string;
  pages?: Page[];
  activePage?: string;
  onPageChange?: (filename: string) => void;
  onSendMessage: (text: string) => void;
  onImageUpload: (image: UploadedImage) => void;
  onImageRemove: () => void;
  onClearElement: () => void;
  onTogglePicker: () => void;
}

export default function ChatPanel({
  isPlaceholder = false,
  messages,
  isLoading,
  uploadedImage,
  selectedElement,
  pickerMode,
  activePageLabel,
  pages,
  activePage,
  onPageChange,
  onSendMessage,
  onImageUpload,
  onImageRemove,
  onClearElement,
  onTogglePicker,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasMessages = messages.length > 0;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = 24;
    const maxHeight = lineHeight * 4 + 24;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
  }, [inputText]);

  function handleSend() {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText("");
    onSendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      alert("Image must be under 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      // Strip data URL prefix to get raw base64
      const base64 = result.split(",")[1];
      onImageUpload({ data: base64, name: file.name, type: file.type });
    };
    reader.readAsDataURL(file);
    // Reset so same file can be picked again
    e.target.value = "";
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-base">Website Editor</h2>
          {pages && pages.length > 1 && !isPlaceholder && onPageChange ? (
            <div className="relative">
              <select
                value={activePage}
                onChange={(e) => onPageChange(e.target.value)}
                disabled={isLoading}
                className="appearance-none text-xs font-medium pl-2.5 pr-7 py-1 rounded-full bg-[#113D79]/10 text-[#113D79] border-0 outline-none cursor-pointer disabled:opacity-60"
              >
                {pages.map((p) => (
                  <option key={p.filename} value={p.filename}>
                    {p.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#113D79] pointer-events-none" />
            </div>
          ) : activePageLabel && !isPlaceholder ? (
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#113D79]/10 text-[#113D79]">
              {activePageLabel}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Tell me what to change in plain English
        </p>

        {/* Select Area button */}
        {!isPlaceholder && (
          <button
            onClick={onTogglePicker}
            className={`mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all cursor-pointer border-2 ${
              pickerMode
                ? "border-blue-500 bg-blue-500 text-white shadow-md"
                : "border-blue-500 bg-blue-50 text-blue-600 hover:bg-blue-500 hover:text-white"
            }`}
          >
            <MousePointer size={15} />
            {pickerMode ? "Picking… click an element" : "Select Area to Edit"}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!hasMessages && (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 leading-relaxed">
              {isPlaceholder
                ? "Upload your HTML file on the right to get started."
                : "Describe what you'd like to change on your website and I'll update it instantly."}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion chips */}
      {!hasMessages && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setInputText(chip);
                textareaRef.current?.focus();
              }}
              className="px-3 py-1.5 text-xs rounded-full border border-gray-200 text-gray-600 hover:border-[#113D79] hover:text-[#113D79] transition-colors cursor-pointer bg-white"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Selected element chip */}
      {selectedElement && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
            <MousePointer size={13} className="text-blue-500 flex-shrink-0" />
            <span className="text-xs text-blue-700 flex-1 truncate font-mono">
              {selectedElement.label}
            </span>
            <button
              onClick={onClearElement}
              className="text-blue-400 hover:text-blue-600 cursor-pointer flex-shrink-0"
              title="Clear selection"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Image preview strip */}
      {uploadedImage && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
              <img
                src={`data:${uploadedImage.type};base64,${uploadedImage.data}`}
                alt={uploadedImage.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-xs text-gray-600 flex-1 truncate">{uploadedImage.name}</span>
            <button
              onClick={onImageRemove}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-[#113D79]/50 focus-within:ring-2 focus-within:ring-[#113D79]/10 transition-all">
          {/* Image upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-[#113D79] transition-colors cursor-pointer flex-shrink-0 mb-1"
            title="Upload image"
          >
            <Camera size={18} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isPlaceholder ? "Upload your HTML file first →" : "What would you like to change?"}
            className="flex-1 bg-transparent text-sm resize-none outline-none text-gray-800 placeholder-gray-400 leading-6 min-h-[24px]"
            rows={1}
            disabled={isLoading || isPlaceholder}
          />

          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading || isPlaceholder}
            className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mb-0.5"
            style={{ background: "#113D79", color: "white" }}
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          Type a change or upload a photo · Changes preview instantly
        </p>
      </div>
    </div>
  );
}
