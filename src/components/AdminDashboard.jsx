import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { examQuestions } from "../mocks/examData";
import { Shield, Eye, BarChart3, ListOrdered, FilePlus, UserCheck, ShieldAlert, Award, FileQuestion, Trash2, Home, LogOut, Lock, User } from "lucide-react";
import * as XLSX from "xlsx";
import { db } from "../firebase";
import { collection, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";

export function AdminDashboard() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("admin_authenticated") === "true";
  });
  const [loginForm, setLoginForm] = useState({ username: "", password: "" });
  const [loginError, setLoginError] = useState("");

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (loginForm.username === "admin" && loginForm.password === "admin123") {
      sessionStorage.setItem("admin_authenticated", "true");
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Invalid admin username or password");
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("admin_authenticated");
    setIsAuthenticated(false);
  };

  const [activeTab, setActiveTab] = useState("monitor"); // "monitor" | "results" | "create"
  const [currentQuestions, setCurrentQuestions] = useState(() => {
    const stored = localStorage.getItem("exam_question_pool");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Error reading question pool in admin:", e);
      }
    }
    return examQuestions;
  });

  // Keep localStorage and Firestore settings in sync when currentQuestions state changes
  useEffect(() => {
    localStorage.setItem("exam_question_pool", JSON.stringify(currentQuestions));
    const poolRef = doc(db, "exam_sessions", "question_pool");
    setDoc(poolRef, { questions: currentQuestions }).catch((err) => {
      console.error("Error syncing question pool to Firestore:", err);
    });
  }, [currentQuestions]);

  // Load question pool from Firestore on mount
  useEffect(() => {
    const fetchQuestionPool = async () => {
      try {
        const poolRef = doc(db, "exam_sessions", "question_pool");
        const docSnap = await getDoc(poolRef);
        if (docSnap.exists() && docSnap.data().questions) {
          setCurrentQuestions(docSnap.data().questions);
        }
      } catch (err) {
        console.error("Error fetching live question pool from Firestore:", err);
      }
    };
    fetchQuestionPool();
  }, []);
  
  // New Question Form state
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    category: "Quantitative",
    options: ["", "", "", ""],
    correctAnswer: "",
  });

  const [toast, setToast] = useState("");
  const [activeCandidate, setActiveCandidate] = useState(null);
  
  // Real-time Firestore sync states
  const [liveStudents, setLiveStudents] = useState([]);
  const [completedResults, setCompletedResults] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("All");
  const [availableBatches, setAvailableBatches] = useState(["All"]);

  useEffect(() => {
    const sessionStr = localStorage.getItem("exam_session");
    if (sessionStr) {
      setActiveCandidate(JSON.parse(sessionStr));
    }
  }, []);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // Listen to exam_sessions updates in real-time
  useEffect(() => {
    const sessionsRef = collection(db, "exam_sessions");
    
    const unsubscribe = onSnapshot(sessionsRef, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by registered date descending
      docs.sort((a, b) => new Date(b.registeredAt) - new Date(a.registeredAt));

      const liveList = [];
      const completedList = [];
      const batches = new Set();

      docs.forEach(session => {
        if (session.accessCode) {
          batches.add(session.accessCode.trim().toUpperCase());
        }

        const answeredCount = Object.keys(session.answers || {}).length;

        if (session.examFinished) {
          completedList.push({
            id: session.id,
            fullName: session.fullName,
            rollNumber: session.rollNumber,
            branch: session.branch,
            email: session.email,
            phone: session.phone,
            college: session.college,
            yearOfPassing: session.yearOfPassing,
            answered: `${answeredCount}/${currentQuestions.length}`,
            score: session.score || "0%",
            warnings: session.warnings || 0,
            submission: session.submissionReason || "Manual Submit",
            referenceId: session.referenceId || "REF-XXXXXX",
            date: session.submittedAt 
              ? new Date(session.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ", " + new Date(session.submittedAt).toLocaleDateString()
              : "N/A",
            accessCode: (session.accessCode || "").trim().toUpperCase()
          });
        } else {
          let statusText = "Active";
          if (session.warnings >= 3) statusText = "Critical Focus Warning";
          else if (session.warnings > 0) statusText = "Focus Warned";

          liveList.push({
            id: session.id,
            fullName: session.fullName,
            rollNumber: session.rollNumber,
            branch: session.branch,
            progress: `${answeredCount}/${currentQuestions.length}`,
            warnings: session.warnings || 0,
            status: statusText,
            lastUpdated: "Live",
            accessCode: (session.accessCode || "").trim().toUpperCase()
          });
        }
      });



      setLiveStudents(liveList);
      setCompletedResults(completedList);
      setAvailableBatches(["All", ...Array.from(batches)]);
    }, (err) => {
      console.error("Firestore onSnapshot error:", err);
    });

    return () => unsubscribe();
  }, [currentQuestions]);

  const filteredResults = selectedBatch === "All"
    ? completedResults
    : completedResults.filter(r => r.accessCode === selectedBatch);

  const avgScore = completedResults.length > 0
    ? Math.round(completedResults.reduce((sum, res) => sum + parseInt(res.score || 0), 0) / completedResults.length) + "%"
    : "0%";



  // Handle Question Creation
  const handleOptionChange = (idx, value) => {
    const updatedOptions = [...newQuestion.options];
    updatedOptions[idx] = value;
    setNewQuestion((prev) => ({ ...prev, options: updatedOptions }));
  };

  const handleAddQuestion = (e) => {
    e.preventDefault();
    if (!newQuestion.text.trim() || !newQuestion.correctAnswer || newQuestion.options.some(opt => !opt.trim())) {
      triggerToast("Please fill all question fields and select the correct option!");
      return;
    }

    const added = {
      id: currentQuestions.length + 1,
      ...newQuestion,
    };

    setCurrentQuestions((prev) => [...prev, added]);
    triggerToast("Question successfully added to pool!");
    
    // Reset Form
    setNewQuestion({
      text: "",
      category: "Quantitative",
      options: ["", "", "", ""],
      correctAnswer: "",
    });
  };

  const handleDeleteQuestion = (id) => {
    setCurrentQuestions((prev) => prev.filter(q => q.id !== id));
    triggerToast("Question removed from pool.");
  };

  const downloadTemplate = () => {
    const headers = ["Question", "Option 1", "Option 2", "Option 3", "Option 4", "Correct Answer", "Category"];
    const exampleRow = [
      "A car travels at 60 km/h. How far does it travel in 2.5 hours?",
      "120 km",
      "150 km",
      "180 km",
      "200 km",
      "150 km",
      "Quantitative"
    ];
    
    // Construct CSV content safely with UTF-8 BOM
    const csvContent = "\uFEFF" + [headers, exampleRow].map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "aptitude_question_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Template downloaded successfully!");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert worksheet to raw arrays
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (rawRows.length < 2) {
          triggerToast("The sheet is empty or lacks headers!");
          return;
        }

        // Header mapping (case-insensitive & whitespace trimmed)
        const headers = rawRows[0].map(h => String(h || "").trim().toLowerCase());
        const rows = rawRows.slice(1);

        // Map column indexes
        const qIdx = headers.findIndex(h => h.includes("question") || h.includes("statement") || h.includes("text"));
        const opt1Idx = headers.findIndex(h => h.includes("option 1") || h.includes("option1") || h.includes("option a") || h.includes("optiona") || h === "a" || h === "op1" || h === "opt1" || h.includes("opt a") || h.includes("op a"));
        const opt2Idx = headers.findIndex(h => h.includes("option 2") || h.includes("option2") || h.includes("option b") || h.includes("optionb") || h === "b" || h === "op2" || h === "opt2" || h.includes("opt b") || h.includes("op b"));
        const opt3Idx = headers.findIndex(h => h.includes("option 3") || h.includes("option3") || h.includes("option c") || h.includes("optionc") || h === "c" || h === "op3" || h === "opt3" || h.includes("opt c") || h.includes("op c"));
        const opt4Idx = headers.findIndex(h => h.includes("option 4") || h.includes("option4") || h.includes("option d") || h.includes("optiond") || h === "d" || h === "op4" || h === "opt4" || h.includes("opt d") || h.includes("op d"));
        const ansIdx = headers.findIndex(h => h.includes("correct answer") || h.includes("answer") || h.includes("correct") || h === "correctanswer" || h === "ans" || h === "key");
        const catIdx = headers.findIndex(h => h.includes("category") || h === "cat");

        if (qIdx === -1 || opt1Idx === -1 || opt2Idx === -1 || opt3Idx === -1 || opt4Idx === -1 || ansIdx === -1) {
          triggerToast("Invalid file structure. Ensure columns for Question, Option 1-4, and Correct Answer exist.");
          return;
        }

        const importedQuestions = [];
        let skippedCount = 0;

        rows.forEach((row) => {
          const text = String(row[qIdx] || "").trim();
          const option1 = String(row[opt1Idx] || "").trim();
          const option2 = String(row[opt2Idx] || "").trim();
          const option3 = String(row[opt3Idx] || "").trim();
          const option4 = String(row[opt4Idx] || "").trim();
          const rawAnswer = String(row[ansIdx] || "").trim();
          const category = catIdx !== -1 && row[catIdx] ? String(row[catIdx]).trim() : "Quantitative";

          if (!text || !option1 || !option2 || !option3 || !option4 || !rawAnswer) {
            skippedCount++;
            return;
          }

          const options = [option1, option2, option3, option4];
          let correctAnswer = rawAnswer;

          // If answer is not already the exact option text, try resolving "A", "B", "C", "D" or "Option 1" or "1" to the option text
          if (!options.includes(correctAnswer)) {
            const cleanAns = correctAnswer.toLowerCase().replace(/[\s_-]/g, "");
            if (cleanAns === "a" || cleanAns === "option1" || cleanAns === "1" || cleanAns === "op1") {
              correctAnswer = option1;
            } else if (cleanAns === "b" || cleanAns === "option2" || cleanAns === "2" || cleanAns === "op2") {
              correctAnswer = option2;
            } else if (cleanAns === "c" || cleanAns === "option3" || cleanAns === "3" || cleanAns === "op3") {
              correctAnswer = option3;
            } else if (cleanAns === "d" || cleanAns === "option4" || cleanAns === "4" || cleanAns === "op4") {
              correctAnswer = option4;
            }
          }

          // Double check that final resolved answer matches one of the options
          if (!options.includes(correctAnswer)) {
            skippedCount++;
            return;
          }

          importedQuestions.push({
            id: currentQuestions.length + importedQuestions.length + 1,
            text,
            options,
            correctAnswer,
            category,
          });
        });

        if (importedQuestions.length === 0) {
          triggerToast(`No valid questions imported. (Skipped ${skippedCount} rows)`);
          return;
        }

        setCurrentQuestions((prev) => [...prev, ...importedQuestions]);
        triggerToast(`Successfully imported ${importedQuestions.length} questions!${skippedCount > 0 ? ` (Skipped ${skippedCount} rows)` : ""}`);
        e.target.value = ""; // clear input
      } catch (err) {
        console.error("Error reading file:", err);
        triggerToast("Failed to parse sheet. Ensure it is a valid Excel or CSV file.");
      }
    };

    reader.readAsBinaryString(file);
  };

  const exportResultsToExcel = () => {
    // Compile full reports (Registration details + Assessment marks)
    const dataToExport = filteredResults.map((result) => {
      return {
        "Candidate Name": result.fullName,
        "Roll Number": result.rollNumber,
        "Email Address": result.email || "n/a",
        "Phone Number": result.phone || "n/a",
        "Institution / College": result.college || "n/a",
        "Branch / Department": result.branch,
        "Year of Passing": result.yearOfPassing || "n/a",
        "Questions Answered": result.answered,
        "Percentage Score": result.score,
        "Proctoring Warnings": result.warnings,
        "Submission Mode": result.submission,
        "Reference ID": result.referenceId,
        "Submitted Date/Time": result.date,
        "Batch / Access Code": result.accessCode || "N/A"
      };
    });

    if (dataToExport.length === 0) {
      triggerToast("No records available to export for this batch!");
      return;
    }

    try {
      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      
      // Auto-fit column widths
      const maxLens = {};
      dataToExport.forEach(row => {
        Object.keys(row).forEach(key => {
          const valLen = String(row[key] || "").length;
          const keyLen = key.length;
          maxLens[key] = Math.max(maxLens[key] || 0, valLen, keyLen);
        });
      });
      worksheet["!cols"] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] + 3 }));

      const workbook = XLSX.utils.book_new();
      const sheetName = selectedBatch === "All" ? "All Batches" : `Batch_${selectedBatch}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      const fileName = selectedBatch === "All" ? "CampusDrive_All_Results.xlsx" : `CampusDrive_${selectedBatch}_Results.xlsx`;
      XLSX.writeFile(workbook, fileName);
      triggerToast(`Excel report for batch '${selectedBatch}' exported successfully!`);
    } catch (err) {
      console.error("Error exporting report to Excel:", err);
      triggerToast("Failed to export Excel report.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-12 px-4 flex flex-col justify-center items-center bg-slate-950 relative overflow-hidden font-sans w-full">
        {/* Logo in top left corner */}
        <div className="absolute top-6 left-6 z-20">
          <img src="/itpllogo.png" alt="ITPL Logo" className="h-12 md:h-16 w-auto object-contain rounded-xl" />
        </div>

        {/* Background Orbs */}
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-45 -left-45 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

        {/* Main Card Container */}
        <div className="w-full max-w-md glass-panel rounded-3xl p-8 md:p-10 shadow-2xl relative border border-slate-800 z-10 space-y-8">
          
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mx-auto animate-pulse">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Admin Console</h1>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              Sign in with your administrator credentials to monitor live proctoring and manage test sessions.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-400" /> Username
              </label>
              <input
                type="text"
                name="username"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-indigo-400" /> Password
              </label>
              <input
                type="password"
                name="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none"
                required
              />
            </div>

            {loginError && (
              <p className="text-red-500 text-xs font-semibold text-center">{loginError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] transition-all text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer text-sm"
            >
              <span>Sign In</span>
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              onClick={() => navigate("/")}
              className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              Return to Candidate Registration
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row text-sans select-none">
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-8 left-1/2 transform -translate-x-1/2 z-50 bg-indigo-600 text-white font-medium px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-indigo-500/30 backdrop-blur-md">
          <Shield className="w-5 h-5 animate-pulse" />
          <span>{toast}</span>
        </div>
      )}

      {/* Admin Sidebar Navigation */}
      <aside className="w-full lg:w-72 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          
          {/* Dashboard Header */}
          <div className="flex items-center gap-3">
            <img src="/itpllogo.png" alt="Logo" className="w-10 h-10 rounded-xl object-contain bg-white shadow-lg" />
            <div>
              <h2 className="text-white font-bold text-base leading-tight">Admin Console</h2>
              <span className="text-indigo-400 text-xs font-semibold tracking-wider uppercase">Proctor Control</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab("monitor")}
              className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "monitor"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <Eye className="w-4.5 h-4.5" />
              <span>Live Proctor Monitor</span>
              <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </button>

            <button
              onClick={() => setActiveTab("results")}
              className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "results"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <ListOrdered className="w-4.5 h-4.5" />
              <span>Completed Results</span>
            </button>

            <button
              onClick={() => setActiveTab("create")}
              className={`w-full px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "create"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <FilePlus className="w-4.5 h-4.5" />
              <span>Manage Question Pool</span>
            </button>
          </nav>

        </div>

        {/* Return buttons */}
        <div className="pt-6 border-t border-slate-800 space-y-2">
          <button
            onClick={() => navigate("/")}
            className="w-full px-4 py-2.5 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" /> Portal Homepage
          </button>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2.5 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 hover:text-rose-300 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout Dashboard
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto max-h-screen">
        
        {/* Banner Summary Metrics */}
        <header className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-indigo-500/10 rounded-xl text-indigo-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs block font-medium">Total Registered</span>
              <strong className="text-white text-2xl font-bold">{liveStudents.length + completedResults.length}</strong>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-rose-500/10 rounded-xl text-rose-400">
              <Eye className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-slate-400 text-xs block font-medium">Active Test Takers</span>
              <strong className="text-white text-2xl font-bold">{liveStudents.length}</strong>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs block font-medium">Security Alerts</span>
              <strong className="text-white text-2xl font-bold">
                {liveStudents.reduce((sum, stu) => sum + (stu.warnings > 0 ? 1 : 0), 0)}
              </strong>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs block font-medium">Average Score</span>
              <strong className="text-white text-2xl font-bold">{avgScore}</strong>
            </div>
          </div>

        </header>

        {/* Tab content monitors */}
        
        {/* Tab 1: Live Proctor Monitor */}
        {activeTab === "monitor" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-extrabold text-xl">Active Candidates Tracking</h3>
              <span className="px-2.5 py-1 rounded bg-red-950 text-red-400 border border-red-500/20 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" /> Live Feed Active
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="px-6 py-4">Student Info</th>
                      <th className="px-6 py-4">Branch</th>
                      <th className="px-6 py-4 text-center">Progress (MCQ)</th>
                      <th className="px-6 py-4 text-center">Security Violations</th>
                      <th className="px-6 py-4">Status State</th>
                      <th className="px-6 py-4 text-right">Ping</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {liveStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">{student.fullName}</div>
                          <div className="text-xs text-slate-400">Roll: {student.rollNumber}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-medium">{student.branch}</td>
                        <td className="px-6 py-4 text-center text-white font-mono font-bold">{student.progress}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                            student.warnings >= 3 
                              ? "bg-red-500/20 text-red-500 border border-red-500/30 animate-pulse" 
                              : student.warnings > 0 
                              ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" 
                              : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                          }`}>
                            {student.warnings} / 3 Warnings
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${
                            student.warnings >= 3 ? "text-red-400" : "text-slate-300"
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-xs text-slate-500 font-medium">{student.lastUpdated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Completed Results */}
        {activeTab === "results" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-white font-extrabold text-xl">Completed Submissions Logs</h3>
                <p className="text-slate-400 text-xs">View scores, answers, warnings, and export batch reports.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Batch Filter Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap">Filter Batch:</span>
                  <select
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:border-indigo-500 outline-none cursor-pointer"
                  >
                    {availableBatches.map(batch => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={exportResultsToExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-600/10 flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4" /> Export Batch to Excel
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="px-6 py-4">Candidate Details</th>
                      <th className="px-6 py-4 text-center">Score %</th>
                      <th className="px-6 py-4 text-center">Answered</th>
                      <th className="px-6 py-4 text-center">Warnings</th>
                      <th className="px-6 py-4">Submission Mode</th>
                      <th className="px-6 py-4">Reference ID</th>
                      <th className="px-6 py-4 text-right">Finished At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredResults.map((result) => {
                      const scoreVal = parseInt(result.score);
                      const isFailed = scoreVal < 50;
                      return (
                        <tr key={result.id} className="hover:bg-slate-800/30 transition">
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">{result.fullName}</div>
                            <div className="text-xs text-slate-400">{result.branch}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`text-lg font-extrabold font-mono ${
                              isFailed ? "text-red-400" : "text-emerald-400"
                            }`}>
                              {result.score}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-mono font-medium text-slate-300">{result.answered}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`font-semibold ${result.warnings > 0 ? "text-amber-500" : "text-slate-400"}`}>
                              {result.warnings}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-medium ${
                              result.submission.includes("Auto") ? "text-red-400" : "text-emerald-400"
                            }`}>
                              {result.submission}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-indigo-400 font-semibold">{result.referenceId}</td>
                          <td className="px-6 py-4 text-right text-xs text-slate-500 font-medium">{result.date}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Manage Question Pool */}
        {activeTab === "create" && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            
            <div className="space-y-8">
              
              {/* Spreadsheet Bulk Import Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-extrabold text-lg flex items-center gap-2">
                    <FilePlus className="w-5 h-5 text-indigo-400" /> Excel / CSV Bulk Import
                  </h3>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="px-3.5 py-1.5 border border-indigo-500/20 hover:border-indigo-500/50 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-600 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    Download Template
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Upload an Excel spreadsheet (`.xlsx`, `.xls`) or a standard text file (`.csv`) to batch import questions into the portal. Ensure your headers match the downloadable template columns.
                  </p>

                  <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-slate-950/20 transition-all">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-500">
                      <FilePlus className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="text-center space-y-1">
                      <span className="text-slate-300 font-semibold text-sm block">Choose Excel or CSV File</span>
                      <span className="text-slate-500 text-[10px] block">Drag & drop or click to browse</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Create Form */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
                <h3 className="text-white font-extrabold text-lg flex items-center gap-2">
                  <FileQuestion className="w-5 h-5 text-indigo-400" /> Create Aptitude MCQ Question
                </h3>

              <form onSubmit={handleAddQuestion} className="space-y-4">
                
                {/* Textarea */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Question Statement</label>
                  <textarea
                    rows="3"
                    placeholder="Enter the question text here..."
                    value={newQuestion.text}
                    onChange={(e) => setNewQuestion((prev) => ({ ...prev, text: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-4 text-white transition-all outline-none text-sm resize-none"
                  />
                </div>

                {/* Grid category and selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Category</label>
                    <select
                      value={newQuestion.category}
                      onChange={(e) => setNewQuestion((prev) => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none text-sm"
                    >
                      <option value="Quantitative">Quantitative</option>
                      <option value="Logical">Logical</option>
                      <option value="Verbal">Verbal</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Correct Answer</label>
                    <select
                      value={newQuestion.correctAnswer}
                      onChange={(e) => setNewQuestion((prev) => ({ ...prev, correctAnswer: e.target.value }))}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none text-sm"
                    >
                      <option value="">Select Option</option>
                      {newQuestion.options.map((opt, i) => (
                        <option key={i} value={opt} disabled={!opt.trim()}>
                          {opt.trim() ? `Option ${i + 1}: ${opt.substring(0, 20)}...` : `Option ${i + 1} (Empty)`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4 Options */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Answer Options</label>
                  {newQuestion.options.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-6 text-xs text-slate-500 font-bold uppercase">OP {i+1}</span>
                      <input
                        type="text"
                        placeholder={`Enter Option ${i+1}`}
                        value={opt}
                        onChange={(e) => handleOptionChange(i, e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-white transition-all outline-none text-sm"
                      />
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg transition-all text-sm cursor-pointer"
                >
                  Append to Question Pool
                </button>

              </form>
            </div>

          </div>

            {/* List current pool */}
            <div className="space-y-4">
              <h3 className="text-white font-extrabold text-lg">Active Question Pool ({currentQuestions.length})</h3>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {currentQuestions.map((q) => (
                  <div key={q.id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 relative group">
                    <span className="text-[10px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-bold text-slate-400 uppercase">
                      {q.category}
                    </span>
                    <h4 className="text-white font-bold text-sm leading-relaxed pr-6">{q.id}. {q.text}</h4>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`p-2 rounded ${opt === q.correctAnswer ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/20' : 'bg-slate-950/40 text-slate-400'}`}>
                          {opt}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="absolute top-2.5 right-4 p-1.5 text-slate-500 hover:text-red-400 transition cursor-pointer"
                      title="Remove Question"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
