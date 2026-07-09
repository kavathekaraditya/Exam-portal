import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { examQuestions } from "../mocks/examData";
import { Shield, Eye, BarChart3, ListOrdered, FilePlus, UserCheck, ShieldAlert, Award, FileQuestion, Trash2, Home, LogOut } from "lucide-react";

export function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("monitor"); // "monitor" | "results" | "create"
  const [currentQuestions, setCurrentQuestions] = useState(examQuestions);
  
  // New Question Form state
  const [newQuestion, setNewQuestion] = useState({
    text: "",
    category: "Quantitative",
    options: ["", "", "", ""],
    correctAnswer: "",
  });

  const [toast, setToast] = useState("");

  // Re-fetch current student session if writing
  const [activeCandidate, setActiveCandidate] = useState(null);

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

  // Mock Live Candidates data
  const mockLiveStudents = [
    {
      id: "live_1",
      fullName: "Aniket Sharma",
      rollNumber: "CS2022045",
      branch: "Computer Science & Engineering",
      progress: "8/10",
      warnings: 1,
      status: "Active",
      lastUpdated: "Just now",
    },
    {
      id: "live_2",
      fullName: "Rohan Varma",
      rollNumber: "ME2022102",
      branch: "Mechanical Engineering",
      progress: "4/10",
      warnings: 3,
      status: "Critical Focus Warning",
      lastUpdated: "1m ago",
    },
    {
      id: "live_3",
      fullName: "Sneha Patel",
      rollNumber: "EC2022012",
      branch: "Electronics & Communication Engineering",
      progress: "10/10",
      warnings: 0,
      status: "Reviewing",
      lastUpdated: "2m ago",
    },
  ];

  // If a student is currently taking the test locally, merge them into live monitor
  if (activeCandidate && !activeCandidate.examFinished && activeCandidate.examStarted) {
    const answeredCount = Object.keys(activeCandidate.answers || {}).length;
    mockLiveStudents.unshift({
      id: activeCandidate.id,
      fullName: `${activeCandidate.fullName} (You)`,
      rollNumber: activeCandidate.rollNumber,
      branch: activeCandidate.branch,
      progress: `${answeredCount}/10`,
      warnings: activeCandidate.warnings || 0,
      status: "Active Test Session",
      lastUpdated: "Just now",
    });
  }

  // Mock Completed Results
  const mockCompletedResults = [
    {
      id: "res_1",
      fullName: "Kabir Mehta",
      rollNumber: "CS2022031",
      branch: "Computer Science & Engineering",
      answered: "10/10",
      score: "90%",
      warnings: 0,
      submission: "Manual Submit",
      referenceId: "REF-983842",
      date: "Today, 11:30 AM",
    },
    {
      id: "res_2",
      fullName: "Pooja Hegde",
      rollNumber: "IT2022088",
      branch: "Information Technology",
      answered: "10/10",
      score: "70%",
      warnings: 2,
      submission: "Manual Submit",
      referenceId: "REF-294810",
      date: "Today, 10:15 AM",
    },
    {
      id: "res_3",
      fullName: "Vikram Sen",
      rollNumber: "EE2022056",
      branch: "Electrical & Electronics Engineering",
      answered: "6/10",
      score: "40%",
      warnings: 4,
      submission: "Auto-Submitted (Violations Limit)",
      referenceId: "REF-109283",
      date: "Yesterday, 3:45 PM",
    },
  ];

  // Add current active candidate if they have finished the test
  if (activeCandidate && activeCandidate.examFinished) {
    const answeredCount = Object.keys(activeCandidate.answers || {}).length;
    
    // Simple mock grading (e.g. check answers against mock data)
    let correct = 0;
    currentQuestions.forEach((q, idx) => {
      const selected = activeCandidate.answers[idx];
      if (selected === q.correctAnswer) {
        correct++;
      }
    });

    const scorePercentage = Math.round((correct / currentQuestions.length) * 100) + "%";

    mockCompletedResults.unshift({
      id: activeCandidate.id,
      fullName: `${activeCandidate.fullName} (You)`,
      rollNumber: activeCandidate.rollNumber,
      branch: activeCandidate.branch,
      answered: `${answeredCount}/10`,
      score: scorePercentage,
      warnings: activeCandidate.warnings || 0,
      submission: activeCandidate.submissionReason || "Manual Submit",
      referenceId: activeCandidate.referenceId || "REF-XXXXXX",
      date: new Date(activeCandidate.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ", Today",
    });
  }

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
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              A
            </div>
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
        <div className="pt-6 border-t border-slate-800 space-y-2.5">
          <button
            onClick={() => navigate("/")}
            className="w-full px-4 py-2.5 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/50 text-slate-400 hover:text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" /> Portal Homepage
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
              <strong className="text-white text-2xl font-bold">42</strong>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-rose-500/10 rounded-xl text-rose-400">
              <Eye className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="text-slate-400 text-xs block font-medium">Active Test Takers</span>
              <strong className="text-white text-2xl font-bold">{mockLiveStudents.length}</strong>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-amber-500/10 rounded-xl text-amber-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs block font-medium">Security Alerts</span>
              <strong className="text-white text-2xl font-bold">
                {mockLiveStudents.reduce((sum, stu) => sum + (stu.warnings > 0 ? 1 : 0), 0) + 1}
              </strong>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-sm">
            <div className="p-3.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-slate-400 text-xs block font-medium">Average Score</span>
              <strong className="text-white text-2xl font-bold">68.5%</strong>
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
                    {mockLiveStudents.map((student) => (
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
            <h3 className="text-white font-extrabold text-xl">Completed Submissions Logs</h3>

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
                    {mockCompletedResults.map((result) => {
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
