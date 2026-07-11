import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { examQuestions } from "../mocks/examData";
import { useExamSecurity } from "../hooks/useExamSecurity";
import { SecurityWrapper } from "./SecurityWrapper";
import { Clock, CheckCircle, ChevronLeft, ChevronRight, Bookmark, CircleDot, Shield, RefreshCw, Send, AlertTriangle } from "lucide-react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

export function ExamPage() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [markedQuestions, setMarkedQuestions] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState({ 0: true });
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(3600); // 60 minutes standard
  const [isExamActive, setIsExamActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Auto-save feedback state
  const [saveStatus, setSaveStatus] = useState("Saved"); // "Saved" | "Saving..." | "Changes Saved to Cloud"
  const saveTimeoutRef = useRef(null);

  // Shuffles options for questions once on startup
  const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // Check session on mount
  useEffect(() => {
    const sessionStr = localStorage.getItem("exam_session");
    if (!sessionStr) {
      navigate("/");
      return;
    }

    const session = JSON.parse(sessionStr);
    if (session.examFinished) {
      navigate("/success");
      return;
    }

    setStudent(session);

    // Rehydrate timer & answers if refreshing
    if (session.timeLeft !== undefined) {
      setTimeLeft(session.timeLeft);
    }
    if (session.answers) {
      setSelectedAnswers(session.answers);
    }
    if (session.markedQuestions) {
      setMarkedQuestions(session.markedQuestions);
    }
    if (session.visitedQuestions) {
      setVisitedQuestions(session.visitedQuestions);
    }

    // Load or generate candidate-specific shuffled questions pool
    let activeQuestions = session.questions;

    if (!activeQuestions) {
      // Load question pool from local storage or initialize with default mock ones
      let activePool = examQuestions;
      const storedPool = localStorage.getItem("exam_question_pool");
      if (storedPool) {
        try {
          activePool = JSON.parse(storedPool);
        } catch (e) {
          console.error("Error parsing stored question pool:", e);
        }
      } else {
        localStorage.setItem("exam_question_pool", JSON.stringify(examQuestions));
      }

      // Shuffle the questions list
      const shuffledQuestions = shuffleArray(activePool);

      // Shuffle the options for each question
      activeQuestions = shuffledQuestions.map((q) => ({
        ...q,
        options: shuffleArray(q.options),
      }));

      // Persist the shuffled questions to localStorage and sync with Firestore
      session.questions = activeQuestions;
      localStorage.setItem("exam_session", JSON.stringify(session));

      const sessionDocRef = doc(db, "exam_sessions", session.id);
      updateDoc(sessionDocRef, { questions: activeQuestions }).catch((err) => {
        console.error("Failed to sync shuffled questions to Firestore:", err);
      });
    }

    setQuestions(activeQuestions);
    setIsExamActive(true);
  }, [navigate]);

  // Ref to store the latest definition of handleFinalSubmit to avoid TDZ and stale closures
  const handleFinalSubmitRef = useRef();

  // Stable callback for security violation limit exceeded
  const onViolationLimitExceeded = useCallback((reason) => {
    handleFinalSubmitRef.current?.(`Auto-Submitted: Security Violations Limit Exceeded (${reason})`);
  }, []);

  // Instantiate security hook first to declare 'warnings' before it is used in handleFinalSubmit's dependency array
  const {
    warnings,
    isFullscreen,
    lastViolationReason,
    showWarningModal,
    setShowWarningModal,
    enterFullscreen,
    setWarnings
  } = useExamSecurity(isExamActive, onViolationLimitExceeded);

  // Submission handler
  const handleFinalSubmit = useCallback(async (reason = "Manual Submission") => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    const referenceId = "REF-" + Math.floor(100000 + Math.random() * 900000);
    
    // Calculate final score
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });
    const scorePercentage = Math.round((correctCount / (questions.length || 10)) * 100) + "%";

    let finishedSession = null;

    // Update local storage to lock out the student
    const sessionStr = localStorage.getItem("exam_session");
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      finishedSession = {
        ...session,
        examFinished: true,
        answers: selectedAnswers,
        markedQuestions,
        timeLeft: 0,
        warnings,
        submissionReason: reason,
        referenceId,
        score: scorePercentage,
        submittedAt: new Date().toISOString(),
      };
      localStorage.setItem("exam_session", JSON.stringify(finishedSession));
    }

    // Sync finished session state to Cloud Firestore
    if (student) {
      try {
        const sessionDocRef = doc(db, "exam_sessions", student.id);
        await updateDoc(sessionDocRef, {
          examFinished: true,
          answers: selectedAnswers,
          markedQuestions,
          timeLeft: 0,
          warnings,
          submissionReason: reason,
          referenceId,
          score: scorePercentage,
          submittedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Firestore final submission update failed:", err);
      }
    }

    // Attempt to exit fullscreen on successful finish
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }

    setIsExamActive(false);
    navigate("/success", { replace: true });
  }, [isSubmitting, selectedAnswers, markedQuestions, navigate, student, questions, warnings]);

  // Keep the ref up-to-date
  handleFinalSubmitRef.current = handleFinalSubmit;

  // Keep track of warnings in session storage & Firestore
  useEffect(() => {
    if (student && isExamActive) {
      const session = JSON.parse(localStorage.getItem("exam_session"));
      if (session) {
        session.warnings = warnings;
        localStorage.setItem("exam_session", JSON.stringify(session));
      }
      
      // Update warning count in Firestore
      const sessionDocRef = doc(db, "exam_sessions", student.id);
      updateDoc(sessionDocRef, { warnings }).catch(err => {
        console.error("Failed to sync warnings to Firestore:", err);
      });
    }
  }, [warnings, student, isExamActive]);

  // Timer Tick
  useEffect(() => {
    if (!isExamActive) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const nextTime = prev - 1;
        
        // Save time to local storage every second
        const session = JSON.parse(localStorage.getItem("exam_session"));
        if (session) {
          session.timeLeft = nextTime;
          localStorage.setItem("exam_session", JSON.stringify(session));
        }

        if (nextTime <= 0) {
          clearInterval(timer);
          handleFinalSubmit("Time Expired");
          return 0;
        }
        return nextTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamActive, handleFinalSubmit]);

  // Format time
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Nav helper
  const navigateToQuestion = (idx) => {
    if (idx < 0 || idx >= questions.length) return;
    setCurrentIdx(idx);
    setVisitedQuestions((prev) => {
      const updated = { ...prev, [idx]: true };
      // Save state
      const session = JSON.parse(localStorage.getItem("exam_session"));
      if (session) {
        session.visitedQuestions = updated;
        localStorage.setItem("exam_session", JSON.stringify(session));
      }
      return updated;
    });
  };

  // Option change handler with debounced auto-save simulator
  const handleSelectOption = (option) => {
    // Optimistically update answers
    const updatedAnswers = { ...selectedAnswers, [currentIdx]: option };
    setSelectedAnswers(updatedAnswers);

    // Save index state to session
    const session = JSON.parse(localStorage.getItem("exam_session"));
    if (session) {
      session.answers = updatedAnswers;
      localStorage.setItem("exam_session", JSON.stringify(session));
    }

    // Auto-save logic
    setSaveStatus("Saving...");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      // Sync answers to Firestore
      if (student) {
        try {
          const sessionDocRef = doc(db, "exam_sessions", student.id);
          await updateDoc(sessionDocRef, { 
            answers: updatedAnswers,
            visitedQuestions
          });
        } catch (err) {
          console.error("Failed to auto-save answers to Firestore:", err);
        }
      }
      setSaveStatus("Changes Saved to Cloud");
      setTimeout(() => {
        setSaveStatus("Saved");
      }, 1000);
    }, 500);
  };

  const toggleMarkForReview = () => {
    const updatedMarked = { ...markedQuestions, [currentIdx]: !markedQuestions[currentIdx] };
    setMarkedQuestions(updatedMarked);

    const session = JSON.parse(localStorage.getItem("exam_session"));
    if (session) {
      session.markedQuestions = updatedMarked;
      localStorage.setItem("exam_session", JSON.stringify(session));
    }
  };

  const clearOptionSelection = () => {
    const updatedAnswers = { ...selectedAnswers };
    delete updatedAnswers[currentIdx];
    setSelectedAnswers(updatedAnswers);

    const session = JSON.parse(localStorage.getItem("exam_session"));
    if (session) {
      session.answers = updatedAnswers;
      localStorage.setItem("exam_session", JSON.stringify(session));
    }

    setSaveStatus("Saving...");
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(async () => {
      if (student) {
        try {
          const sessionDocRef = doc(db, "exam_sessions", student.id);
          await updateDoc(sessionDocRef, { answers: updatedAnswers });
        } catch (err) {
          console.error("Failed to auto-save cleared selection to Firestore:", err);
        }
      }
      setSaveStatus("Changes Saved to Cloud");
      setTimeout(() => setSaveStatus("Saved"), 1000);
    }, 500);
  };

  if (!student || questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const activeAnswer = selectedAnswers[currentIdx];
  const isMarked = markedQuestions[currentIdx];

  // Colors for side palette buttons
  const getPaletteStatusColor = (idx) => {
    const isCurrent = idx === currentIdx;
    const isAnswered = selectedAnswers[idx] !== undefined;
    const isMarkedReview = markedQuestions[idx] === true;
    const isVisited = visitedQuestions[idx] === true;

    if (isCurrent) {
      return "ring-2 ring-indigo-500 scale-105 border-white bg-slate-800 text-white font-bold";
    }
    if (isMarkedReview) {
      return "bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700";
    }
    if (isAnswered) {
      return "bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-700";
    }
    if (isVisited) {
      return "bg-rose-900/60 border-rose-800 text-rose-200 hover:bg-rose-800";
    }
    return "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800";
  };

  // Stats calculation
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(selectedAnswers).length;
  const markedCount = Object.values(markedQuestions).filter(Boolean).length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <SecurityWrapper
      isActive={isExamActive}
      warnings={warnings}
      isFullscreen={isFullscreen}
      lastViolationReason={lastViolationReason}
      showWarningModal={showWarningModal}
      onCloseWarning={() => setShowWarningModal(false)}
      onEnterFullscreen={enterFullscreen}
    >
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans select-none">
        
        {/* Header bar */}
        <header className="sticky top-0 z-30 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
              CD
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">Campus Aptitude Assessment</h2>
              <p className="text-slate-400 text-xs mt-0.5">Candidate: {student.fullName} ({student.rollNumber})</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            
            {/* Auto Save Feedback */}
            <div className="flex items-center gap-1.5 text-xs">
              {saveStatus === "Saving..." ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span className="text-indigo-400">Saving draft...</span>
                </>
              ) : saveStatus === "Changes Saved to Cloud" ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-medium">Auto-saved</span>
                </>
              ) : (
                <span className="text-slate-500">Connected to secure server</span>
              )}
            </div>

            {/* Warning Tracker Badge */}
            {warnings > 0 && (
              <div className="px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/30 flex items-center gap-1.5 text-xs text-red-400 font-semibold animate-pulse">
                <Shield className="w-3.5 h-3.5" />
                <span>Warnings: {warnings}/3</span>
              </div>
            )}

            {/* Countdown timer */}
            <div className={`px-4 py-2 rounded-xl flex items-center gap-2.5 font-bold tracking-tight shadow-md border ${
              timeLeft < 300 
                ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse" 
                : "bg-slate-800 border-slate-700 text-indigo-400"
            }`}>
              <Clock className="w-4 h-4" />
              <span className="text-lg tabular-nums">{formatTime(timeLeft)}</span>
            </div>

          </div>
        </header>

        {/* Workspace Layout */}
        <div className="flex-1 flex flex-col lg:flex-row">
          
          {/* Main workspace */}
          <main className="flex-1 p-6 md:p-8 flex flex-col justify-between max-w-4xl mx-auto w-full">
            
            {/* Question Container */}
            <div className="space-y-6 flex-1 flex flex-col justify-center">
              
              {/* Category & Info */}
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {currentQuestion.category} Section
                </span>
                <span className="text-slate-400 text-sm">
                  Question <strong className="text-white font-bold">{currentIdx + 1}</strong> of {totalQuestions}
                </span>
              </div>

              {/* Question Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl space-y-6">
                <h3 className="text-white font-bold text-lg md:text-xl leading-relaxed">
                  {currentQuestion.text}
                </h3>

                {/* Option Radio Selector Grid */}
                <div className="space-y-3.5 pt-2">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = activeAnswer === option;
                    return (
                      <label
                        key={idx}
                        onClick={() => handleSelectOption(option)}
                        className={`w-full text-left p-4 rounded-xl border flex items-center gap-3.5 cursor-pointer transition-all hover:bg-slate-800/50 ${
                          isSelected 
                            ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-200" 
                            : "bg-slate-950/40 border-slate-800 text-slate-300"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected 
                            ? "border-indigo-500 text-indigo-500" 
                            : "border-slate-700 text-transparent"
                        }`}>
                          {isSelected && <CircleDot className="w-3.5 h-3.5 fill-current" />}
                        </div>
                        <span className="text-sm font-medium">{option}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Reset Control */}
              {activeAnswer && (
                <div className="flex justify-end">
                  <button
                    onClick={clearOptionSelection}
                    className="text-xs font-medium text-slate-500 hover:text-slate-300 flex items-center gap-1 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Clear Selection
                  </button>
                </div>
              )}

            </div>

            {/* Action Footer */}
            <footer className="mt-8 pt-6 border-t border-slate-900 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-3">
                <button
                  onClick={() => navigateToQuestion(currentIdx - 1)}
                  disabled={currentIdx === 0}
                  className="px-5 py-3 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white font-semibold rounded-xl text-sm flex items-center gap-1 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <button
                  onClick={() => navigateToQuestion(currentIdx + 1)}
                  disabled={currentIdx === totalQuestions - 1}
                  className="px-5 py-3 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white font-semibold rounded-xl text-sm flex items-center gap-1 transition cursor-pointer"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={toggleMarkForReview}
                className={`px-5 py-3 border rounded-xl text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                  isMarked
                    ? "bg-indigo-600/10 border-indigo-500/50 text-indigo-400 hover:bg-indigo-600/20"
                    : "border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 hover:text-white"
                }`}
              >
                <Bookmark className="w-4 h-4 fill-current" />
                <span>{isMarked ? "Marked for Review" : "Mark for Review"}</span>
              </button>

              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] transition-all text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer text-sm"
              >
                <Send className="w-4 h-4" /> Submit Exam
              </button>
            </footer>

          </main>

          {/* Sidebar - Palette & Navigation */}
          <aside className="w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-6 space-y-6 shrink-0">
            
            {/* Status Statistics panel */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider text-slate-400">Exam Statistics</h4>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950 p-2.5 rounded-xl text-center border border-slate-800">
                  <span className="text-emerald-500 text-lg font-bold block">{answeredCount}</span>
                  <span className="text-[10px] text-slate-400 block font-medium">Answered</span>
                </div>
                
                <div className="bg-slate-950 p-2.5 rounded-xl text-center border border-slate-800">
                  <span className="text-indigo-400 text-lg font-bold block">{markedCount}</span>
                  <span className="text-[10px] text-slate-400 block font-medium">Review</span>
                </div>
                
                <div className="bg-slate-950 p-2.5 rounded-xl text-center border border-slate-800">
                  <span className="text-red-400 text-lg font-bold block">{unansweredCount}</span>
                  <span className="text-[10px] text-slate-400 block font-medium">Unanswered</span>
                </div>
              </div>
            </div>

            {/* Questions Grid Selector */}
            <div className="space-y-3">
              <h4 className="text-white font-bold text-xs uppercase tracking-wider text-slate-400">Question Palette</h4>
              
              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => navigateToQuestion(idx)}
                    className={`h-11 rounded-xl border flex items-center justify-center text-xs font-semibold transition-all cursor-pointer ${getPaletteStatusColor(idx)}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Legends */}
            <div className="pt-4 border-t border-slate-800 space-y-2.5">
              <h4 className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Legend</h4>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-emerald-600" />
                  <span className="text-slate-300">Answered ({answeredCount})</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-indigo-600" />
                  <span className="text-slate-300">Marked for Review ({markedCount})</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-rose-900/60 border border-rose-800" />
                  <span className="text-slate-300">Visited but Unanswered</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded bg-slate-900 border border-slate-800" />
                  <span className="text-slate-300">Not Visited</span>
                </div>
              </div>
            </div>

            {/* Quick Warning Notice */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-2.5 text-xs text-amber-500/80 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>Full Screen and Single Tab monitoring is active. DO NOT press Esc or switch tabs.</span>
            </div>

          </aside>

        </div>

        {/* Confirmation Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-250 text-center">
              
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                <Send className="w-8 h-8 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-white tracking-tight">Submit Assessment?</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Are you sure you want to end your test session? You will not be able to change your responses after submission.
                </p>
              </div>

              {/* Status breakdown table */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 divide-y divide-slate-800 text-sm">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Total Questions</span>
                  <span className="text-white font-bold">{totalQuestions}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Answered Questions</span>
                  <span className="text-emerald-400 font-bold">{answeredCount}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Marked for Review</span>
                  <span className="text-indigo-400 font-bold">{markedCount}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Unanswered Questions</span>
                  <span className="text-red-400 font-bold text-right">{unansweredCount}</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-3 px-5 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    setShowSubmitModal(false);
                    handleFinalSubmit();
                  }}
                  className="flex-1 py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-emerald-600/10 cursor-pointer"
                >
                  Yes, Submit Exam
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </SecurityWrapper>
  );
}
