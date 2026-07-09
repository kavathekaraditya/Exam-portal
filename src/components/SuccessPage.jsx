import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Copy, AlertTriangle, ShieldCheck, ExternalLink, RefreshCw } from "lucide-react";

export function SuccessPage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [copied, setCopied] = useState(false);

  // Re-push history states to block browser back button navigation
  useEffect(() => {
    window.history.pushState(null, null, window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, null, window.location.href);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Fetch session details on mount
  useEffect(() => {
    const sessionStr = localStorage.getItem("exam_session");
    if (!sessionStr) {
      navigate("/");
      return;
    }

    const session = JSON.parse(sessionStr);
    if (!session.examFinished) {
      navigate("/exam");
      return;
    }

    setStudent(session);
  }, [navigate]);

  const copyToClipboard = () => {
    if (!student) return;
    navigator.clipboard.writeText(student.referenceId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegisterNew = () => {
    localStorage.removeItem("exam_session");
    navigate("/", { replace: true });
  };

  if (!student) return null;

  const answeredCount = Object.keys(student.answers || {}).length;
  const warningsCount = student.warnings || 0;
  const isAutoSubmitted = student.submissionReason?.includes("Auto-Submitted") || false;

  return (
    <div className="min-h-screen py-12 px-4 flex flex-col justify-center items-center bg-slate-950 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-lg glass-panel rounded-3xl p-8 md:p-10 shadow-2xl relative border border-slate-800 z-10 text-center space-y-8">
        
        {/* Status Check Circle Header */}
        <div className="relative">
          <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle2 className="w-14 h-14" />
          </div>
          <div className="absolute -top-1 right-[38%] bg-indigo-600 p-1.5 rounded-full border-2 border-slate-900 text-white">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>

        {/* Core Submission Status text */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Assessment Submitted!</h1>
          <p className="text-slate-400 text-sm">
            Thank you, <span className="text-slate-200 font-semibold">{student.fullName}</span>. Your test responses have been logged and locked.
          </p>
        </div>

        {/* Access Code Reference Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Reference ID</span>
          
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl font-mono font-bold text-indigo-400 tracking-wider">
              {student.referenceId}
            </span>
            <button
              onClick={copyToClipboard}
              className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition active:scale-95 cursor-pointer"
              title="Copy Reference ID"
            >
              {copied ? (
                <span className="text-xs text-emerald-400 font-semibold px-1">Copied!</span>
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Security / Submission Meta Grid */}
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 divide-y divide-slate-800 text-xs">
          
          <div className="py-2.5 flex justify-between items-center">
            <span className="text-slate-400">Branch / Department</span>
            <span className="text-white font-medium">{student.branch}</span>
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-slate-400">Answered Questions</span>
            <span className="text-emerald-400 font-bold">{answeredCount} / 10</span>
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-slate-400">Total Warnings</span>
            <span className={`font-semibold ${warningsCount > 0 ? "text-amber-500" : "text-slate-400"}`}>
              {warningsCount} / 3
            </span>
          </div>

          <div className="py-2.5 flex justify-between items-center">
            <span className="text-slate-400">Submission Mode</span>
            {isAutoSubmitted ? (
              <span className="text-red-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 animate-pulse" /> Auto-Submitted
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold">Standard Manual</span>
            )}
          </div>

        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <button
            onClick={handleRegisterNew}
            className="w-full sm:w-auto px-5 py-3 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-Register Candidate
          </button>

          <button
            onClick={() => navigate("/admin")}
            className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/10 transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>View Admin Panel</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}
