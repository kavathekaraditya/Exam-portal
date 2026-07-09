import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Phone, GraduationCap, BookOpen, Calendar, Hash, Key, Lock, ArrowRight } from "lucide-react";

export function RegistrationPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    college: "",
    branch: "",
    yearOfPassing: "",
    rollNumber: "",
    accessCode: "",
  });

  const [errors, setErrors] = useState({});

  const colleges = [
    "Indian Institute of Technology (IIT)",
    "National Institute of Technology (NIT)",
    "Birla Institute of Technology and Science (BITS)",
    "Delhi Technological University (DTU)",
    "Vellore Institute of Technology (VIT)",
    "Manipal Institute of Technology (MIT)",
    "Government Engineering College",
  ];

  const branches = [
    "Computer Science & Engineering",
    "Information Technology",
    "Electronics & Communication Engineering",
    "Electrical & Electronics Engineering",
    "Mechanical Engineering",
    "Civil Engineering",
    "Chemical Engineering",
  ];

  const handleAutofill = () => {
    setFormData({
      fullName: "Jane Doe",
      email: "jane.doe@nit.edu",
      phone: "9876543210",
      college: "National Institute of Technology (NIT)",
      branch: "Computer Science & Engineering",
      yearOfPassing: "2026",
      rollNumber: "CS2022095",
      accessCode: "CAMPUS2026",
    });
    setErrors({});
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10}$/.test(formData.phone.replace(/[-+\s]/g, ""))) {
      newErrors.phone = "Enter a valid 10-digit phone number";
    }
    if (!formData.college) newErrors.college = "College selection is required";
    if (!formData.branch) newErrors.branch = "Department/Branch is required";
    if (!formData.yearOfPassing) newErrors.yearOfPassing = "Year of passing is required";
    if (!formData.rollNumber.trim()) newErrors.rollNumber = "Roll number is required";
    if (!formData.accessCode.trim()) {
      newErrors.accessCode = "Access code is required";
    } else if (formData.accessCode !== "CAMPUS2026") {
      newErrors.accessCode = "Invalid access code (Try CAMPUS2026)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    // Simulate API registration call
    setTimeout(() => {
      setLoading(false);
      // Create session
      const userSession = {
        id: "usr_" + Math.random().toString(36).substr(2, 9),
        ...formData,
        registeredAt: new Date().toISOString(),
        examToken: "tok_" + Math.random().toString(36).substr(2, 24),
        violations: 0,
        examStarted: false,
        examFinished: false,
        answers: {},
      };
      
      localStorage.setItem("exam_session", JSON.stringify(userSession));
      navigate("/rules");
    }, 1500);
  };

  return (
    <div className="min-h-screen py-12 px-4 flex flex-col justify-center items-center bg-slate-950 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-45 -left-45 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />

      {/* Main Container */}
      <div className="w-full max-w-4xl glass-panel rounded-3xl p-8 md:p-12 shadow-2xl relative border border-slate-800 z-10">
        
        {/* Header */}
        <div className="text-center max-w-xl mx-auto mb-10 space-y-3">
          <div className="flex flex-wrap justify-center items-center gap-3 mb-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 text-xs font-semibold tracking-wider uppercase">
              <Lock className="w-3 h-3" /> Secure Exam Environment
            </div>
            <button
              type="button"
              onClick={handleAutofill}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer border border-indigo-500/30 transition-all hover:scale-105 active:scale-95"
            >
              Autofill Demo Data
            </button>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Campus Drive <span className="text-gradient-purple">Aptitude Portal</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Please register with your official details. Ensure you have a stable connection and are ready for the security controls.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-4 h-4 text-indigo-400" /> Full Name
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                className={`w-full bg-slate-900 border ${errors.fullName ? 'border-red-500' : 'border-slate-800'} focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none`}
              />
              {errors.fullName && <p className="text-red-500 text-xs">{errors.fullName}</p>}
            </div>

            {/* Email Address */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-400" /> Email Address
              </label>
              <input
                type="email"
                name="email"
                placeholder="johndoe@college.edu"
                value={formData.email}
                onChange={handleChange}
                className={`w-full bg-slate-900 border ${errors.email ? 'border-red-500' : 'border-slate-800'} focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none`}
              />
              {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-indigo-400" /> Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="9876543210"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full bg-slate-900 border ${errors.phone ? 'border-red-500' : 'border-slate-800'} focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none`}
              />
              {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
            </div>

            {/* College (Dropdown) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-400" /> Institution / College
              </label>
              <select
                name="college"
                value={formData.college}
                onChange={handleChange}
                className={`w-full bg-slate-900 border ${errors.college ? 'border-red-500' : 'border-slate-800'} focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none appearance-none`}
              >
                <option value="">Select College</option>
                {colleges.map((col, idx) => (
                  <option key={idx} value={col}>{col}</option>
                ))}
              </select>
              {errors.college && <p className="text-red-500 text-xs">{errors.college}</p>}
            </div>

            {/* Branch / Department */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-400" /> Branch / Department
              </label>
              <select
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className={`w-full bg-slate-900 border ${errors.branch ? 'border-red-500' : 'border-slate-800'} focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none`}
              >
                <option value="">Select Branch</option>
                {branches.map((br, idx) => (
                  <option key={idx} value={br}>{br}</option>
                ))}
              </select>
              {errors.branch && <p className="text-red-500 text-xs">{errors.branch}</p>}
            </div>

            {/* Year of Passing */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" /> Year of Passing
              </label>
              <input
                type="number"
                name="yearOfPassing"
                placeholder="2026"
                min="2020"
                max="2035"
                value={formData.yearOfPassing}
                onChange={handleChange}
                className={`w-full bg-slate-900 border ${errors.yearOfPassing ? 'border-red-500' : 'border-slate-800'} focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none`}
              />
              {errors.yearOfPassing && <p className="text-red-500 text-xs">{errors.yearOfPassing}</p>}
            </div>

            {/* Roll Number */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Hash className="w-4 h-4 text-indigo-400" /> Roll Number / UID
              </label>
              <input
                type="text"
                name="rollNumber"
                placeholder="CS2022095"
                value={formData.rollNumber}
                onChange={handleChange}
                className={`w-full bg-slate-900 border ${errors.rollNumber ? 'border-red-500' : 'border-slate-800'} focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none`}
              />
              {errors.rollNumber && <p className="text-red-500 text-xs">{errors.rollNumber}</p>}
            </div>

            {/* Access Code */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-indigo-400" /> Exam Access Code
              </label>
              <input
                type="text"
                name="accessCode"
                placeholder="CAMPUS2026"
                value={formData.accessCode}
                onChange={handleChange}
                className={`w-full bg-slate-900 border ${errors.accessCode ? 'border-red-500' : 'border-slate-800'} focus:border-indigo-500 rounded-xl px-4 py-3 text-white transition-all outline-none`}
              />
              {errors.accessCode && <p className="text-red-500 text-xs">{errors.accessCode}</p>}
              <span className="text-[10px] text-slate-500">Demo Code: CAMPUS2026</span>
            </div>

          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-4 px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] disabled:opacity-50 transition-all text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer text-base"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Register & Proceed</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
