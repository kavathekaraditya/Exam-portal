import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { RegistrationPage } from "./components/RegistrationPage";
import { RulesPage } from "./components/RulesPage";
import { ExamPage } from "./components/ExamPage";
import { SuccessPage } from "./components/SuccessPage";
import { AdminDashboard } from "./components/AdminDashboard";

function App() {
  return (
    <Router>
      <Routes>
        {/* Candidate Routes */}
        <Route path="/" element={<RegistrationPage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/exam" element={<ExamPage />} />
        <Route path="/success" element={<SuccessPage />} />

        {/* Admin Console Route */}
        <Route path="/admin/*" element={<AdminDashboard />} />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
