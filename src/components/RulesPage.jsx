import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, HelpCircle, ShieldAlert, Award, FileCheck, CheckCircle2, ChevronRight, User } from "lucide-react";

export function RulesPage() {
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [student, setStudent] = useState(null);

  useEffect(() => {
    const session = localStorage.getItem("exam_session");
    if (!session) {
      navigate("/");
    } else {
      setStudent(JSON.parse(session));
    }
  }, [navigate]);

  const handleStartExam = async () => {
    if (!agreed) return;

    // Update session to show exam started
    if (student) {
      const updated = { ...student, examStarted: true, startTime: new Date().toISOString() };
      localStorage.setItem("exam_session", JSON.stringify(updated));
    }

    // Direct redirection, the SecurityWrapper on /exam will enforce entering fullscreen immediately.
    navigate("/exam");
  };

  if (!student) return null;

  return (
    <div className="min-h-screen py-12 px-4 flex flex-col justify-center items-center bg-slate-950 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

      <div className="w-full max-w-3xl glass-panel rounded-3xl p-8 md:p-12 shadow-2xl relative border border-slate-800 z-10">
        
        {/* Welcome Greeting */}
        <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white">
            <User className="w-5 h-5" />
          </div>
          <div>
            <span className="text-slate-400 text-xs block">Candidate Profile</span>
            <span className="text-white font-bold text-base">{student.fullName} ({student.rollNumber})</span>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2 mb-8">
          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
            Exam Instructions & <span className="text-gradient-purple">Guidelines</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Please read the following instructions carefully before starting the exam. This is a proctored environment.
          </p>
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          
          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-start gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Exam Duration</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                You have exactly 60 minutes to complete the test. A persistent countdown timer is shown at the top.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-start gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Question Count</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                The test contains 10 multiple choice questions. You can toggle between questions using the sidebar palette.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-start gap-4">
            <div className="p-3 bg-red-500/10 rounded-xl text-red-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Proctoring Constraints</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Switching tabs, leaving the window focus, or exiting full screen is prohibited. You are allowed at most 3 violations.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 flex items-start gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Interaction Controls</h3>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                Copy, paste, cut, and right-click actions are disabled. Auto-save triggers automatically as you make choices.
              </p>
            </div>
          </div>

        </div>

        {/* Terms Box */}
        <div className="p-5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-4 mb-8">
          <h4 className="font-bold text-indigo-400 text-sm flex items-center gap-2">
            <FileCheck className="w-4 h-4" /> Integrity Declaration
          </h4>
          <p className="text-slate-300 text-xs leading-relaxed">
            By clicking the checkbox below, you declare that you will write this assessment honestly without resorting to external aid, screen sharing, or search queries. Any breach of rules will lead to immediate cancellation of your application.
          </p>

          <label className="flex items-center gap-3 cursor-pointer pt-2 group select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="w-5 h-5 rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span className="text-xs text-slate-300 group-hover:text-white transition">
              I have read, understood, and agree to the exam rules and guidelines.
            </span>
          </label>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <button
            onClick={() => {
              localStorage.removeItem("exam_session");
              navigate("/");
            }}
            className="w-full sm:w-auto px-6 py-3 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-400 hover:text-white font-semibold rounded-xl text-sm transition cursor-pointer"
          >
            Cancel Session
          </button>

          <button
            onClick={handleStartExam}
            disabled={!agreed}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 active:scale-[0.98] transition-all text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer text-sm"
          >
            <span>Start Assessment</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
