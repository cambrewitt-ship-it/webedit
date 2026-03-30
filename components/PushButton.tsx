"use client";

interface PushButtonProps {
  hasChanges: boolean;
  isPushing: boolean;
  pushStep: string;
  onPush: () => void;
}

export default function PushButton({
  hasChanges,
  isPushing,
  pushStep,
  onPush,
}: PushButtonProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Unsaved changes pill */}
      {hasChanges && !isPushing && (
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
          Unsaved changes
        </span>
      )}

      {/* Push button */}
      <button
        onClick={onPush}
        disabled={isPushing || !hasChanges}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        style={{ background: "#BAA649", color: "#113D79" }}
      >
        {isPushing ? (
          <>
            <div
              className="w-3.5 h-3.5 border-2 border-[#113D79]/30 rounded-full"
              style={{ borderTopColor: "#113D79", animation: "spin 0.8s linear infinite" }}
            />
            <span>{pushStep || "Pushing..."}</span>
          </>
        ) : (
          <>
            <span>🚀</span>
            <span>Push Live</span>
          </>
        )}
      </button>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
