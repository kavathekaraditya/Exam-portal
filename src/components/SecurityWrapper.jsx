import React, { useState, useEffect } from "react";
import { ShieldAlert, Maximize, AlertOctagon } from "lucide-react";

export function SecurityWrapper({ 
  children, 
  isActive, 
  warnings, 
  isFullscreen, 
  lastViolationReason, 
  showWarningModal, 
  onCloseWarning, 
  onEnterFullscreen 
}) {
  const [toastMessage, setToastMessage] = useState("");

  // Handler to prevent copy, paste, cut, and right-click
  const blockAction = (e, actionType) => {
    e.preventDefault();
    setToastMessage(`Action Blocked: ${actionType} is strictly prohibited!`);
  };

  // Clear toast message after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  return (
    <div 
      className="relative min-h-screen w-full select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none", MozUserSelect: "none", msUserSelect: "none" }}
      onCopy={(e) => blockAction(e, "Copying text")}
      onPaste={(e) => blockAction(e, "Pasting text")}
      onCut={(e) => blockAction(e, "Cutting text")}
      onContextMenu={(e) => blockAction(e, "Right-clicking (Context Menu)")}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50 bg-red-600/90 text-white font-medium px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-red-500/30 backdrop-blur-md animate-bounce">
          <ShieldAlert className="w-5 h-5 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content */}
      <div className={!isFullscreen && isActive ? "filter blur-md pointer-events-none transition duration-300" : "transition duration-300"}>
        {children}
      </div>

      {/* Fullscreen Enforcer Overlay */}
      {!isFullscreen && isActive && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md p-6 text-center">
          <div className="max-w-md w-full bg-slate-900 border border-indigo-500/30 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto text-indigo-400">
              <Maximize className="w-10 h-10 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white tracking-tight">Fullscreen Mode Required</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                To ensure exam integrity, this assessment must be taken in Full Screen mode. Exiting full screen is logged as a security infraction.
              </p>
            </div>

            {warnings > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-left flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-amber-500 font-semibold block text-sm">Active Warnings: {warnings} / 3</span>
                  <span className="text-slate-400 text-xs">Exiting fullscreen mode contributed to your infractions. At 4 infractions, your exam will auto-submit.</span>
                </div>
              </div>
            )}

            <button
              onClick={onEnterFullscreen}
              className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] transition-all text-white font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize className="w-5 h-5" />
              <span>Enter Fullscreen & Resume</span>
            </button>
          </div>
        </div>
      )}

      {/* Warning Modal (Tab Switch or Focus Loss) */}
      {showWarningModal && isFullscreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto text-red-400">
              <AlertOctagon className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold text-red-500 tracking-tight">Security Violation Warning</h2>
              <p className="text-slate-300 text-sm font-semibold">
                Reason: {lastViolationReason}
              </p>
              <p className="text-slate-400 text-xs leading-relaxed">
                Your actions are being actively monitored. Navigating away from this window, switching tabs, or losing focus is strictly prohibited.
              </p>
            </div>

            <div className="bg-red-500/15 border border-red-500/30 rounded-xl p-4 text-center">
              <span className="text-red-400 font-bold block text-lg">
                Warning {warnings} of 3
              </span>
              <span className="text-slate-400 text-xs block mt-1">
                Your exam will be automatically submitted on the 4th infraction.
              </span>
            </div>

            <button
              onClick={onCloseWarning}
              className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-500 active:scale-[0.98] transition-all text-white font-semibold rounded-xl shadow-lg shadow-red-600/30 cursor-pointer"
            >
              I Understand & Resume Exam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
