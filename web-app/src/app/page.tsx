'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  BookOpen,
  Activity,
  Pill,
  Users,
  Printer,
  Sparkles,
  Trash2,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Check,
  UserPlus,
  Calendar,
  Clock,
  FileText,
  X,
  ChevronRight,
  Stethoscope,
  LogIn,
  LogOut,
  ShieldCheck,
} from 'lucide-react';

interface Category {
  cat_id: number;
  name: string;
}

interface Symptom {
  sym_id: number;
  cat_id: number;
  category_name?: string;
  name_en: string;
  name_ur: string;
  remedy_count?: number;
}

interface RepertorizationRemedy {
  rem_id: number;
  name: string;
  shortcut: string | null;
  grade: number;
  matched: number;
  percent: number;
  weights: Record<number, number>;
}

interface Patient {
  id: number;
  name: string;
  age: string;
  gender: string;
  phone: string;
  city: string;
  history: string;
  created_at: string;
}

interface PatientVisit {
  id: number;
  patient_id: number;
  repertory_id: number;
  complaint: string;
  symptoms_json: string;
  prescribed_remedy: string;
  potency: string;
  dosage: string;
  notes: string;
  visited_at: string;
}

interface DoctorUser {
  id: number;
  username: string;
  email: string;
  doctor_name: string;
  degree: string;
  clinic_name: string;
  address: string;
  phone: string;
}

export default function Home() {
  // Navigation & Mode
  const [activeTab, setActiveTab] = useState<'repertorize' | 'patients' | 'browser' | 'materia' | 'prescription'>('repertorize');
  const [repertoryId, setRepertoryId] = useState<number>(1); // 1 = Kent, 2 = Boenninghausen

  // Chapters & Search
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Symptom[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Rubric Basket (Selected Symptoms)
  const [basket, setBasket] = useState<Symptom[]>([]);
  const [intensityWeights, setIntensityWeights] = useState<Record<number, number>>({});

  // Calculation Results
  const [rankedRemedies, setRankedRemedies] = useState<RepertorizationRemedy[]>([]);
  const [calcDuration, setCalcDuration] = useState<number>(0);

  // Doctor Auth State
  const [currentDoctor, setCurrentDoctor] = useState<DoctorUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');

  // Login Form
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });

  // Signup Form
  const [signupForm, setSignupForm] = useState({
    doctor_name: '',
    degree: 'B.H.M.S',
    clinic_name: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    address: '',
  });

  // Patients EHR State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [selectedPatientVisits, setSelectedPatientVisits] = useState<PatientVisit[]>([]);
  const [patientSearch, setPatientSearch] = useState<string>('');
  const [showNewPatientModal, setShowNewPatientModal] = useState<boolean>(false);

  // New Patient Form
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: 'Male',
    phone: '',
    city: '',
    history: '',
  });

  // Prescription Form
  const [prescriptionData, setPrescriptionData] = useState({
    patientName: '',
    age: '',
    gender: 'Male',
    phone: '',
    complaint: '',
    prescribedRemedy: '',
    potency: '30C',
    dosage: '',
    notes: 'Avoid raw onions, strong coffee, and mint during homeopathic treatment.',
  });

  // Materia Medica State
  const [remediesList, setRemediesList] = useState<{ rem_id: number; name: string; shortcut: string | null; symptom_count: number }[]>([]);
  const [materiaSearch, setMateriaSearch] = useState<string>('');
  const [selectedRemedyId, setSelectedRemedyId] = useState<number | null>(null);
  const [selectedRemedyDetail, setSelectedRemedyDetail] = useState<any>(null);
  const [loadingRemedy, setLoadingRemedy] = useState<boolean>(false);

  // 1. Initial Load: Doctor session & Categories
  useEffect(() => {
    async function loadDoctor() {
      try {
        const res = await fetch('/api/auth');
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentDoctor(data.user);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadDoctor();
  }, []);

  useEffect(() => {
    async function loadCats() {
      try {
        const res = await fetch(`/api/categories?repertoryId=${repertoryId}`);
        const data = await res.json();
        if (data.success) setCategories(data.categories);
      } catch (e) {
        console.error(e);
      }
    }
    loadCats();
  }, [repertoryId]);

  // 2. Load Patients
  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await fetch(`/api/patients?q=${encodeURIComponent(patientSearch)}`);
        const data = await res.json();
        if (data.success) setPatients(data.patients);
      } catch (e) {
        console.error(e);
      }
    }
    loadPatients();
  }, [patientSearch]);

  // 3. Load Selected Patient Visits
  useEffect(() => {
    async function loadVisits() {
      if (!selectedPatientId) return;
      try {
        const res = await fetch(`/api/patients?id=${selectedPatientId}`);
        const data = await res.json();
        if (data.success) {
          setSelectedPatientVisits(data.visits);
          if (data.patient) {
            setPrescriptionData((prev) => ({
              ...prev,
              patientName: data.patient.name,
              age: data.patient.age,
              gender: data.patient.gender,
              phone: data.patient.phone,
              complaint: data.patient.history || prev.complaint,
            }));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadVisits();
  }, [selectedPatientId]);

  // 4. Search Symptoms
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const catQuery = selectedCatId ? `&catId=${selectedCatId}` : '';
        const q = searchQuery.trim();
        const res = await fetch(
          `/api/symptoms?repertoryId=${repertoryId}&q=${encodeURIComponent(q)}${catQuery}&limit=100`
        );
        const data = await res.json();
        if (data.success) setSearchResults(data.symptoms);
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearching(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCatId, repertoryId]);

  // 5. Repertorization Calculation
  useEffect(() => {
    async function runCalc() {
      if (basket.length === 0) {
        setRankedRemedies([]);
        setCalcDuration(0);
        return;
      }

      try {
        const symIds = basket.map((s) => s.sym_id);
        const res = await fetch('/api/repertorize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            repertoryId,
            symptomIds: symIds,
            intensityWeights,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setRankedRemedies(data.remedies);
          setCalcDuration(data.durationMs);
          if (data.remedies.length > 0) {
            setPrescriptionData((prev) => ({ ...prev, prescribedRemedy: data.remedies[0].name }));
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    runCalc();
  }, [basket, intensityWeights, repertoryId]);

  // 6. Materia Medica
  useEffect(() => {
    async function loadRemedies() {
      try {
        const res = await fetch(`/api/remedies?repertoryId=${repertoryId}&search=${encodeURIComponent(materiaSearch)}`);
        const data = await res.json();
        if (data.success) {
          setRemediesList(data.remedies);
          if (!selectedRemedyId && data.remedies.length > 0) {
            setSelectedRemedyId(data.remedies[0].rem_id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (activeTab === 'materia') loadRemedies();
  }, [activeTab, repertoryId, materiaSearch]);

  useEffect(() => {
    async function loadDetails() {
      if (!selectedRemedyId) return;
      setLoadingRemedy(true);
      try {
        const res = await fetch(`/api/remedies?repertoryId=${repertoryId}&remId=${selectedRemedyId}`);
        const data = await res.json();
        if (data.success) setSelectedRemedyDetail(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingRemedy(false);
      }
    }
    if (activeTab === 'materia' && selectedRemedyId) loadDetails();
  }, [selectedRemedyId, repertoryId, activeTab]);

  // Basket Handlers
  const addToBasket = (symptom: Symptom) => {
    if (!basket.some((s) => s.sym_id === symptom.sym_id)) {
      setBasket((prev) => [...prev, symptom]);
      setIntensityWeights((prev) => ({ ...prev, [symptom.sym_id]: 1 }));
    }
  };

  const removeFromBasket = (symId: number) => {
    setBasket((prev) => prev.filter((s) => s.sym_id !== symId));
    setIntensityWeights((prev) => {
      const copy = { ...prev };
      delete copy[symId];
      return copy;
    });
  };

  const toggleIntensity = (symId: number) => {
    setIntensityWeights((prev) => {
      const current = prev[symId] || 1;
      const next = current === 1 ? 2 : current === 2 ? 3 : 1;
      return { ...prev, [symId]: next };
    });
  };

  // Quick Test Case Handlers
  const loadVerifiedTestCase = async (caseNum: 1 | 2 | 3) => {
    try {
      if (caseNum === 1) {
        const res = await fetch(`/api/symptoms?repertoryId=1&q=Head,%20pain,%20pulsating&limit=1`);
        const d1 = await res.json();
        const res2 = await fetch(`/api/symptoms?repertoryId=1&q=Mind,%20restlessness,%20nervousness&limit=1`);
        const d2 = await res2.json();
        const res3 = await fetch(`/api/symptoms?repertoryId=1&q=Stomach,%20thirst,%20unquenchable&limit=1`);
        const d3 = await res3.json();
        setRepertoryId(1);
        setBasket([...(d1.symptoms || []), ...(d2.symptoms || []), ...(d3.symptoms || [])]);
      } else if (caseNum === 2) {
        const res = await fetch(`/api/symptoms?repertoryId=1&q=Abdomen,%20distension&limit=1`);
        const d1 = await res.json();
        const res2 = await fetch(`/api/symptoms?repertoryId=1&q=Stomach,%20eructations&limit=1`);
        const d2 = await res2.json();
        const res3 = await fetch(`/api/symptoms?repertoryId=1&q=Stomach,%20fullness,%20sensation%20of&limit=1`);
        const d3 = await res3.json();
        setRepertoryId(1);
        setBasket([...(d1.symptoms || []), ...(d2.symptoms || []), ...(d3.symptoms || [])]);
      } else {
        const res = await fetch(`/api/symptoms?repertoryId=1&q=Chill,%20shaking&limit=1`);
        const d1 = await res.json();
        const res2 = await fetch(`/api/symptoms?repertoryId=1&q=Mind,%20anxiety&limit=1`);
        const d2 = await res2.json();
        setRepertoryId(1);
        setBasket([...(d1.symptoms || []), ...(d2.symptoms || [])]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auth Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const payload =
        authMode === 'login'
          ? { action: 'login', ...loginForm }
          : { action: 'register', ...signupForm };

      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success && data.user) {
        setCurrentDoctor(data.user);
        setShowAuthModal(false);
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error occurred');
    } finally {
      setAuthLoading(false);
    }
  };

  // Register New Patient Handler
  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatient.name.trim()) return;
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPatient),
      });
      const data = await res.json();
      if (data.success) {
        setShowNewPatientModal(false);
        setNewPatient({ name: '', age: '', gender: 'Male', phone: '', city: '', history: '' });
        const refresh = await fetch('/api/patients');
        const refreshedData = await refresh.json();
        if (refreshedData.success) {
          setPatients(refreshedData.patients);
          setSelectedPatientId(data.patientId);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Visit Consultation
  const handleSaveVisit = async () => {
    if (!selectedPatientId) {
      alert('Please select a patient first from the Patients directory');
      return;
    }
    try {
      const res = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: selectedPatientId,
          repertory_id: repertoryId,
          complaint: prescriptionData.complaint,
          symptoms_json: basket.map((s) => ({
            sym_id: s.sym_id,
            name_en: s.name_en,
            name_ur: s.name_ur,
            weight: intensityWeights[s.sym_id] || 1,
          })),
          prescribed_remedy: prescriptionData.prescribedRemedy,
          potency: prescriptionData.potency,
          dosage: prescriptionData.dosage,
          notes: prescriptionData.notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('Case saved successfully to patient file!');
        const refresh = await fetch(`/api/patients?id=${selectedPatientId}`);
        const refreshedData = await refresh.json();
        if (refreshedData.success) setSelectedPatientVisits(refreshedData.visits);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      {/* ========================================================================= */}
      {/* 1. COMPACT TOP DESKTOP HEADER */}
      {/* ========================================================================= */}
      <header className="no-print bg-white border-b border-slate-300 sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4">
          <div className="flex items-center justify-between h-13">
            {/* Left: Brand Identity */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="w-7 h-7 rounded-md bg-teal-700 flex items-center justify-center text-white shadow-xs">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-900 tracking-tight">
                Kent & Boenninghausen
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                Clinic 2026
              </span>
            </div>

            {/* Center: Tabs */}
            <nav className="flex items-center space-x-0.5">
              <button
                onClick={() => setActiveTab('repertorize')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  activeTab === 'repertorize'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Repertory Grid</span>
                {basket.length > 0 && (
                  <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${activeTab === 'repertorize' ? 'bg-white text-teal-800' : 'bg-teal-700 text-white'}`}>
                    {basket.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('patients')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  activeTab === 'patients'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Patients (EHR)</span>
              </button>
              <button
                onClick={() => setActiveTab('browser')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  activeTab === 'browser'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Chapters</span>
              </button>
              <button
                onClick={() => setActiveTab('materia')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  activeTab === 'materia'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                <span>Materia Medica</span>
              </button>
              <button
                onClick={() => setActiveTab('prescription')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                  activeTab === 'prescription'
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Prescription (Rx)</span>
              </button>
            </nav>

            {/* Right: Mode & Doctor Auth */}
            <div className="flex items-center space-x-2 shrink-0">
              {/* Repertory Select */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded border border-slate-300 text-xs">
                <button
                  onClick={() => setRepertoryId(1)}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    repertoryId === 1
                      ? 'bg-white text-teal-800 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kent (64k)
                </button>
                <button
                  onClick={() => setRepertoryId(2)}
                  className={`px-2 py-0.5 rounded font-semibold transition ${
                    repertoryId === 2
                      ? 'bg-white text-teal-800 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Boenninghausen (2.5k)
                </button>
              </div>

              {/* Doctor Sign In Button */}
              {currentDoctor ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-teal-50 border border-teal-200 text-teal-900 hover:bg-teal-100 transition text-xs font-semibold"
                >
                  <div className="w-4 h-4 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-[9px]">
                    DR
                  </div>
                  <span className="truncate max-w-[120px]">{currentDoctor.doctor_name}</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition shadow-xs"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Doctor Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-3 sm:p-4">
        {/* ======================================================================= */}
        {/* TAB 1: REPERTORIZE (CLASSIC CLINIC DESKTOP GRID & SPLIT VIEW) */}
        {/* ======================================================================= */}
        {activeTab === 'repertorize' && (
          <div className="space-y-3">
            {/* Top Command Bar: Search + Chapter Filter + Quick Test Cases */}
            <div className="bg-white border border-slate-300 p-2.5 rounded-lg shadow-xs flex flex-wrap items-center justify-between gap-2.5">
              {/* Search & Chapter inputs */}
              <div className="flex items-center space-x-2 flex-1 min-w-[320px]">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search rubric in English or Urdu (e.g. headache, سر درد, restlessness, کھانسی)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-7 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-700 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 focus:outline-none focus:bg-white focus:border-teal-700 w-44"
                >
                  <option value="0">All Chapters ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.cat_id} value={c.cat_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Benchmark Test Cases */}
              <div className="flex items-center space-x-1.5 text-xs shrink-0">
                <span className="font-bold text-slate-600 flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Test Cases:</span>
                </span>
                <button
                  onClick={() => loadVerifiedTestCase(1)}
                  className="px-2 py-0.5 rounded bg-slate-50 hover:bg-teal-50 text-teal-900 border border-slate-300 text-xs font-semibold"
                >
                  1. Headache & Fever
                </button>
                <button
                  onClick={() => loadVerifiedTestCase(2)}
                  className="px-2 py-0.5 rounded bg-slate-50 hover:bg-teal-50 text-teal-900 border border-slate-300 text-xs font-semibold"
                >
                  2. Gastric Fullness
                </button>
                <button
                  onClick={() => loadVerifiedTestCase(3)}
                  className="px-2 py-0.5 rounded bg-slate-50 hover:bg-teal-50 text-teal-900 border border-slate-300 text-xs font-semibold"
                >
                  3. Chill & Anxiety
                </button>

                {basket.length > 0 && (
                  <button
                    onClick={() => setBasket([])}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hover:bg-rose-100 ml-2"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Rubrics Compact Data Grid */}
            <div className="bg-white border border-slate-300 rounded-lg shadow-xs overflow-hidden">
              <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-300 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Repertory Rubrics Explorer ({searchResults.length} matches)
                </span>
                <span className="text-slate-500 text-[11px]">
                  Double click or click <strong>+ Add</strong> to select rubric into case
                </span>
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold sticky top-0 z-10 text-[11px]">
                      <th className="py-1 px-3 w-28">Chapter</th>
                      <th className="py-1 px-3">Rubric (English) & Urdu Meaning</th>
                      <th className="py-1 px-2 text-center w-24">Remedies</th>
                      <th className="py-1 px-3 text-center w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {isSearching ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                          <RefreshCw className="w-4 h-4 animate-spin inline-block mr-1 text-teal-700" />
                          Searching rubrics...
                        </td>
                      </tr>
                    ) : searchResults.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                          No matching rubrics found. Type keywords like "headache", "stomach", or Urdu in the search box above.
                        </td>
                      </tr>
                    ) : (
                      searchResults.map((sym) => {
                        const inBasket = basket.some((s) => s.sym_id === sym.sym_id);
                        return (
                          <tr
                            key={sym.sym_id}
                            onDoubleClick={() => (inBasket ? removeFromBasket(sym.sym_id) : addToBasket(sym))}
                            className={`hover:bg-teal-50/60 transition cursor-pointer select-none ${
                              inBasket ? 'bg-teal-50/80 font-medium' : ''
                            }`}
                          >
                            <td className="py-1.5 px-3 font-semibold text-slate-600 text-[11px] align-top">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
                                {sym.category_name || 'Chapter'}
                              </span>
                            </td>
                            <td className="py-1.5 px-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900 leading-tight">
                                  {sym.name_en}
                                </span>
                                {sym.name_ur && (
                                  <span className="text-[11px] font-urdu text-teal-800 leading-tight mt-0.5" dir="rtl">
                                    {sym.name_ur}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-1.5 px-2 text-center text-[11px] font-mono text-slate-600 align-top">
                              {sym.remedy_count ? `${sym.remedy_count} meds` : '—'}
                            </td>
                            <td className="py-1.5 px-3 text-center align-top">
                              <button
                                onClick={() => (inBasket ? removeFromBasket(sym.sym_id) : addToBasket(sym))}
                                className={`px-2 py-0.5 rounded text-xs font-bold transition ${
                                  inBasket
                                    ? 'bg-teal-700 text-white'
                                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-teal-700 hover:text-white'
                                }`}
                              >
                                {inBasket ? 'Added ✓' : '+ Add'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Split View: Active Case Sheet & Live Repertorization Heatmap Matrix */}
            <div className="bg-white border border-slate-300 rounded-lg shadow-xs p-3 space-y-3">
              {/* Header: Selected Rubrics Pills */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-teal-700" />
                    <span>Selected Case Rubrics ({basket.length})</span>
                  </span>
                  {basket.length > 0 && (
                    <span className="text-[11px] font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Calculated in {calcDuration} ms • {rankedRemedies.length} remedies
                    </span>
                  )}
                </div>

                {basket.length > 0 && (
                  <button
                    onClick={() => {
                      if (rankedRemedies.length > 0) {
                        setPrescriptionData((prev) => ({
                          ...prev,
                          prescribedRemedy: rankedRemedies[0].name,
                        }));
                        setActiveTab('prescription');
                      }
                    }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
                  >
                    <Printer className="w-3 h-3" />
                    <span>Prescribe Top Remedy ({rankedRemedies[0]?.shortcut || 'Rx'})</span>
                  </button>
                )}
              </div>

              {basket.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs bg-slate-50 rounded border border-dashed border-slate-200">
                  No rubrics in case basket. Click <strong>+ Add</strong> on any rubric in the table above or choose a <strong>Test Case</strong> to see the live calculation.
                </div>
              ) : (
                <>
                  {/* Selected Rubrics Pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {basket.map((sym, idx) => {
                      const intensity = intensityWeights[sym.sym_id] || 1;
                      return (
                        <div
                          key={sym.sym_id}
                          className="bg-slate-50 border border-slate-300 px-2 py-1 rounded flex items-center space-x-1.5 text-xs"
                        >
                          <span className="w-4 h-4 rounded bg-teal-700 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                            S{idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800 max-w-[200px] truncate" title={sym.name_en}>
                            {sym.name_en}
                          </span>
                          <button
                            onClick={() => toggleIntensity(sym.sym_id)}
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              intensity === 3
                                ? 'bg-amber-200 text-amber-900 border border-amber-400'
                                : intensity === 2
                                ? 'bg-teal-200 text-teal-900 border border-teal-400'
                                : 'bg-white border border-slate-300 text-slate-700'
                            }`}
                            title="Toggle weight importance (1x, 2x, 3x)"
                          >
                            {intensity}x
                          </button>
                          <button
                            onClick={() => removeFromBasket(sym.sym_id)}
                            className="text-slate-400 hover:text-rose-600 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Classical Cross-Matrix Heatmap Table */}
                  <div className="border border-slate-300 rounded overflow-hidden">
                    <div className="overflow-x-auto max-h-[360px]">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-bold sticky top-0 z-10 text-[11px]">
                            <th className="py-1.5 px-3 sticky left-0 bg-slate-100 z-20 min-w-[180px] border-r border-slate-300">
                              Remedy (Ranking Leaderboard)
                            </th>
                            <th className="py-1.5 px-2 text-center w-16 bg-teal-50 border-r border-slate-300">Total Score</th>
                            <th className="py-1.5 px-2 text-center w-16 border-r border-slate-300">Covered</th>
                            {basket.map((sym, i) => (
                              <th
                                key={sym.sym_id}
                                className="py-1.5 px-2 text-center border-r border-slate-200 text-[10px] truncate max-w-[120px]"
                                title={`${sym.category_name}: ${sym.name_en}`}
                              >
                                S{i + 1}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-sans">
                          {rankedRemedies.slice(0, 20).map((r, rowIdx) => (
                            <tr
                              key={r.rem_id}
                              className="hover:bg-teal-50/50 transition cursor-pointer"
                              onClick={() => {
                                setSelectedRemedyId(r.rem_id);
                                setActiveTab('materia');
                              }}
                            >
                              <td className="py-1 px-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-300">
                                <div className="flex items-center space-x-1.5">
                                  <span className="font-mono text-slate-400 text-[10px] w-4">
                                    {rowIdx + 1}.
                                  </span>
                                  <span className="font-bold text-slate-900 hover:text-teal-700">
                                    {r.name}
                                  </span>
                                  {r.shortcut && (
                                    <span className="text-[10px] font-mono text-slate-500">
                                      ({r.shortcut})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-1 px-2 text-center font-bold text-teal-900 bg-teal-50/50 border-r border-slate-300">
                                {r.grade}
                              </td>
                              <td className="py-1 px-2 text-center text-slate-700 font-mono text-[11px] border-r border-slate-300">
                                {r.matched}/{basket.length}
                              </td>
                              {basket.map((sym) => {
                                const weight = r.weights[sym.sym_id];
                                return (
                                  <td
                                    key={sym.sym_id}
                                    className="py-1 px-2 text-center border-r border-slate-100 font-mono"
                                  >
                                    {weight ? (
                                      <span
                                        className={`inline-block w-4 h-4 rounded text-[10px] leading-4 font-bold ${
                                          weight === 4
                                            ? 'bg-rose-200 text-rose-900 border border-rose-300'
                                            : weight === 3
                                            ? 'bg-amber-200 text-amber-900 border border-amber-300'
                                            : weight === 2
                                            ? 'bg-teal-100 text-teal-900 border border-teal-300'
                                            : 'bg-slate-200 text-slate-800'
                                        }`}
                                      >
                                        {weight}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: PATIENTS DIRECTORY (EHR) */}
        {/* ======================================================================= */}
        {activeTab === 'patients' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-300 p-3 rounded-lg shadow-xs flex items-center justify-between">
              <div>
                <h1 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-teal-700" />
                  <span>Patient Electronic Health Records (EHR) & Consultation History</span>
                </h1>
              </div>
              <button
                onClick={() => setShowNewPatientModal(true)}
                className="flex items-center space-x-1 px-3 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Register New Patient</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Patients Directory */}
              <div className="md:col-span-4 bg-white border border-slate-300 p-3 rounded-lg shadow-xs space-y-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search patient by name or phone..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-700"
                  />
                </div>

                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-1">
                  {patients.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      No patients registered yet. Click <strong>+ Register New Patient</strong> above to add your first clinic patient.
                    </div>
                  ) : (
                    patients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPatientId(p.id)}
                        className={`w-full text-left py-2 px-2 rounded transition flex items-center justify-between ${
                          selectedPatientId === p.id
                            ? 'bg-teal-50 border border-teal-200'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{p.name}</p>
                          <p className="text-[11px] text-slate-500">
                            {p.age} Yrs • {p.gender} • {p.city || 'Pakistan'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Selected Patient Profile & History */}
              <div className="md:col-span-8 space-y-4">
                {selectedPatientId && patients.find((p) => p.id === selectedPatientId) ? (
                  <>
                    {(() => {
                      const p = patients.find((pt) => pt.id === selectedPatientId)!;
                      return (
                        <div className="bg-white border border-slate-300 p-4 rounded-lg shadow-xs space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h2 className="text-base font-bold text-slate-900">{p.name}</h2>
                              <div className="flex items-center space-x-3 text-xs text-slate-600 mt-0.5">
                                <span><strong>Age:</strong> {p.age} Yrs</span>
                                <span>•</span>
                                <span><strong>Sex:</strong> {p.gender}</span>
                                <span>•</span>
                                <span><strong>Phone:</strong> {p.phone || 'N/A'}</span>
                                <span>•</span>
                                <span><strong>City:</strong> {p.city || 'N/A'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                setPrescriptionData((prev) => ({
                                  ...prev,
                                  patientName: p.name,
                                  age: p.age,
                                  gender: p.gender,
                                  phone: p.phone,
                                  complaint: p.history || prev.complaint,
                                }));
                                setActiveTab('repertorize');
                              }}
                              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200"
                            >
                              <Activity className="w-3.5 h-3.5" />
                              <span>Start Consultation</span>
                            </button>
                          </div>
                          {p.history && (
                            <div className="p-2 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700">
                              <strong>Past History:</strong> {p.history}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Visits Timeline */}
                    <div className="bg-white border border-slate-300 p-4 rounded-lg shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-teal-700" />
                          <span>Past Consultation Visits ({selectedPatientVisits.length})</span>
                        </h3>
                        <button
                          onClick={handleSaveVisit}
                          className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Save Current Case to Patient</span>
                        </button>
                      </div>

                      {selectedPatientVisits.length === 0 ? (
                        <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded">
                          No past visits recorded for this patient yet. Click "Save Current Case to Patient" to record consultation.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {selectedPatientVisits.map((v) => (
                            <div
                              key={v.id}
                              className="p-2.5 rounded border border-slate-200 bg-slate-50 space-y-1 text-xs"
                            >
                              <div className="flex items-center justify-between text-slate-600">
                                <span className="font-semibold text-slate-800 flex items-center space-x-1">
                                  <Calendar className="w-3 h-3 text-teal-700" />
                                  <span>{new Date(v.visited_at).toLocaleDateString('en-GB')} at {new Date(v.visited_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                                <span className="font-mono text-teal-900 font-bold px-1.5 py-0.5 rounded bg-teal-100">
                                  Rx: {v.prescribed_remedy} {v.potency}
                                </span>
                              </div>
                              <p className="text-slate-800">
                                <strong>Complaint:</strong> {v.complaint || 'Follow-up'}
                              </p>
                              <p className="text-slate-700">
                                <strong>Dosage:</strong> {v.dosage}
                              </p>
                              {v.notes && (
                                <p className="text-slate-500 text-[11px] italic">
                                  <strong>Doctor Advice:</strong> {v.notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="bg-white border border-slate-300 p-8 text-center text-slate-400 text-xs rounded-lg">
                    Select a patient from the directory on the left or register a new patient.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: CHAPTERS EXPLORER */}
        {/* ======================================================================= */}
        {activeTab === 'browser' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-300 p-2.5 rounded-lg max-h-[700px] overflow-y-auto space-y-1 shadow-xs">
              <p className="text-xs font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">
                Chapters ({categories.length})
              </p>
              {categories.map((c) => (
                <button
                  key={c.cat_id}
                  onClick={() => setSelectedCatId(c.cat_id)}
                  className={`w-full text-left px-2 py-1 rounded text-xs font-semibold transition flex items-center justify-between ${
                    selectedCatId === c.cat_id
                      ? 'bg-teal-700 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{c.name}</span>
                </button>
              ))}
            </div>

            <div className="md:col-span-3 bg-white border border-slate-300 p-3 rounded-lg space-y-2 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-bold text-slate-900 uppercase">
                  {selectedCatId
                    ? categories.find((c) => c.cat_id === selectedCatId)?.name
                    : 'All Symptoms'}
                </h2>
                <span className="text-xs text-slate-500">
                  {searchResults.length} rubrics
                </span>
              </div>

              <div className="space-y-1 max-h-[620px] overflow-y-auto pr-1">
                {searchResults.map((sym) => {
                  const inBasket = basket.some((s) => s.sym_id === sym.sym_id);
                  return (
                    <div
                      key={sym.sym_id}
                      className="bg-slate-50 border border-slate-200 p-2 rounded flex items-start justify-between gap-3 hover:border-slate-300 transition"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-slate-900">{sym.name_en}</p>
                        {sym.name_ur && (
                          <p className="text-xs font-urdu text-teal-800" dir="rtl">
                            {sym.name_ur}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => (inBasket ? removeFromBasket(sym.sym_id) : addToBasket(sym))}
                        className={`px-2 py-0.5 rounded text-xs font-bold transition shrink-0 ${
                          inBasket
                            ? 'bg-teal-700 text-white'
                            : 'bg-white border border-slate-300 hover:bg-teal-700 hover:text-white text-slate-700'
                        }`}
                      >
                        {inBasket ? 'Added ✓' : '+ Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 4: MATERIA MEDICA */}
        {/* ======================================================================= */}
        {activeTab === 'materia' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-4 bg-white border border-slate-300 p-3 rounded-lg shadow-xs space-y-2 max-h-[750px] flex flex-col">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search remedy (e.g. Lycopodium)..."
                  value={materiaSearch}
                  onChange={(e) => setMateriaSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded pl-8 pr-2 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-700"
                />
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto flex-1 pr-1">
                {remediesList.map((rem) => (
                  <button
                    key={rem.rem_id}
                    onClick={() => setSelectedRemedyId(rem.rem_id)}
                    className={`w-full text-left py-1.5 px-2 rounded text-xs transition flex items-center justify-between ${
                      selectedRemedyId === rem.rem_id
                        ? 'bg-teal-700 text-white font-bold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="truncate">
                      <span>{rem.name}</span>
                      {rem.shortcut && (
                        <span className={`text-[10px] ml-1.5 ${selectedRemedyId === rem.rem_id ? 'text-teal-100' : 'text-slate-400'}`}>
                          ({rem.shortcut})
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono px-1 rounded ${
                      selectedRemedyId === rem.rem_id ? 'bg-teal-800 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {rem.symptom_count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-8 space-y-4">
              {loadingRemedy ? (
                <div className="bg-white border border-slate-300 p-8 text-center text-slate-500 text-xs rounded-lg">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-700 inline-block mr-1" />
                  Loading Materia Medica...
                </div>
              ) : selectedRemedyDetail ? (
                <div className="space-y-3">
                  <div className="bg-white border border-slate-300 p-3 rounded-lg shadow-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-lg font-bold text-slate-900">
                          {selectedRemedyDetail.remedy.name}
                        </h2>
                        {selectedRemedyDetail.remedy.shortcut && (
                          <span className="text-xs font-mono font-bold text-teal-900 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                            {selectedRemedyDetail.remedy.shortcut}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Symptoms Count: <strong className="text-slate-800">{selectedRemedyDetail.remedy.symptom_count} rubrics</strong>
                      </p>
                    </div>
                    {selectedRemedyDetail.remedy.is_polychrest === 1 && (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
                        ★ Polychrest
                      </span>
                    )}
                  </div>

                  {/* Relationships */}
                  {selectedRemedyDetail.relations.length > 0 && (
                    <div className="bg-white border border-slate-300 p-3 rounded-lg shadow-xs space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                        <SlidersHorizontal className="w-3 h-3 text-teal-700" />
                        <span>Drug Relationships</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {['antidoted_by', 'complementary', 'follows_well', 'incompatible'].map((relType) => {
                          const group = selectedRemedyDetail.relations.filter((r: any) => r.relation === relType);
                          if (group.length === 0) return null;
                          const title =
                            relType === 'antidoted_by'
                              ? '🛡️ Antidoted By'
                              : relType === 'complementary'
                              ? '🤝 Complementary'
                              : relType === 'follows_well'
                              ? '➡️ Follows Well'
                              : '⚠️ Incompatible';
                          return (
                            <div key={relType} className="p-2 rounded bg-slate-50 border border-slate-200 space-y-1">
                              <span className="text-[10px] font-bold text-slate-700 block">{title}</span>
                              <div className="flex flex-wrap gap-1">
                                {group.map((item: any) => (
                                  <button
                                    key={item.rem_id}
                                    onClick={() => setSelectedRemedyId(item.rem_id)}
                                    className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-teal-700 hover:text-white text-[11px]"
                                  >
                                    {item.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Top Keynotes */}
                  <div className="bg-white border border-slate-300 p-3 rounded-lg shadow-xs space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Top Keynote Symptoms (Grade 3 & 4)
                    </h3>
                    <div className="space-y-1 max-h-[360px] overflow-y-auto pr-1">
                      {selectedRemedyDetail.topSymptoms.map((s: any) => (
                        <div
                          key={s.sym_id}
                          className="bg-slate-50 border border-slate-200 p-1.5 rounded flex items-start justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="text-[9px] uppercase font-bold text-slate-500 block">
                              {s.category_name}
                            </span>
                            <span className="font-semibold text-slate-900">{s.name_en}</span>
                            {s.name_ur && (
                              <p className="text-[11px] font-urdu text-teal-800" dir="rtl">
                                {s.name_ur}
                              </p>
                            )}
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              s.weight === 4
                                ? 'bg-rose-200 text-rose-900'
                                : 'bg-amber-200 text-amber-900'
                            }`}
                          >
                            Grade {s.weight}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 5: PRESCRIPTIONS & PDF EXPORT */}
        {/* ======================================================================= */}
        {activeTab === 'prescription' && (
          <div className="space-y-4">
            <div className="no-print bg-white border border-slate-300 p-3 rounded-lg shadow-xs flex items-center justify-between">
              <div>
                <h1 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Printer className="w-4 h-4 text-teal-700" />
                  <span>Clinical Prescription Slip & PDF Export</span>
                </h1>
                <p className="text-xs text-slate-500">
                  Formatted cleanly for A4 printing and PDF export with clinic header.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center space-x-1 px-3.5 py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Prescription (Save PDF)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="no-print lg:col-span-4 bg-white border border-slate-300 p-3.5 rounded-lg shadow-xs space-y-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Prescription Details</h2>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-600 font-semibold block mb-0.5">Patient Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Tariq Mahmood"
                      value={prescriptionData.patientName}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, patientName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-600 font-semibold block mb-0.5">Age</label>
                      <input
                        type="text"
                        placeholder="35"
                        value={prescriptionData.age}
                        onChange={(e) => setPrescriptionData({ ...prescriptionData, age: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 font-semibold block mb-0.5">Gender</label>
                      <select
                        value={prescriptionData.gender}
                        onChange={(e) => setPrescriptionData({ ...prescriptionData, gender: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                      >
                        <option>Male</option>
                        <option>Female</option>
                        <option>Child</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-600 font-semibold block mb-0.5">Chief Complaints</label>
                    <textarea
                      rows={2}
                      placeholder="Describe complaints..."
                      value={prescriptionData.complaint}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, complaint: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <h3 className="font-bold text-teal-800 text-xs">Prescribed Remedy (Rx)</h3>
                    <div>
                      <label className="text-slate-600 font-semibold block mb-0.5">Remedy Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Arsenicum Album"
                        value={prescriptionData.prescribedRemedy}
                        onChange={(e) => setPrescriptionData({ ...prescriptionData, prescribedRemedy: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900 font-bold text-teal-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-600 font-semibold block mb-0.5">Potency</label>
                        <input
                          type="text"
                          value={prescriptionData.potency}
                          onChange={(e) => setPrescriptionData({ ...prescriptionData, potency: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 font-semibold block mb-0.5">Dosage</label>
                        <input
                          type="text"
                          placeholder="e.g. 1 dose morning"
                          value={prescriptionData.dosage}
                          onChange={(e) => setPrescriptionData({ ...prescriptionData, dosage: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-600 font-semibold block mb-0.5">Dietary & Lifestyle Advice</label>
                      <textarea
                        rows={2}
                        value={prescriptionData.notes}
                        onChange={(e) => setPrescriptionData({ ...prescriptionData, notes: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* A4 Paper Sheet Preview */}
              <div className="lg:col-span-8 print-card bg-white text-slate-900 p-8 rounded-lg shadow-xs border border-slate-300 space-y-6">
                <div className="border-b-2 border-teal-800 pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-teal-950 tracking-tight">
                      {currentDoctor?.clinic_name || 'Homeopathic Clinic & Research Centre'}
                    </h2>
                    <p className="text-sm font-bold text-teal-800">
                      {currentDoctor?.doctor_name || 'Homeopathic Consultant'}
                    </p>
                    <p className="text-xs text-slate-600">
                      {currentDoctor?.degree || 'B.H.M.S, R.H.M.P'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {currentDoctor?.address || 'Pakistan'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-600 space-y-0.5">
                    <p><strong>Phone:</strong> {currentDoctor?.phone || '—'}</p>
                    <p><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded border border-slate-200 flex items-center justify-between text-xs font-medium text-slate-800">
                  <span><strong>Patient:</strong> {prescriptionData.patientName || '—'}</span>
                  <span><strong>Age:</strong> {prescriptionData.age ? `${prescriptionData.age} Yrs` : '—'}</span>
                  <span><strong>Sex:</strong> {prescriptionData.gender}</span>
                  <span><strong>Contact:</strong> {prescriptionData.phone || '—'}</span>
                </div>

                {prescriptionData.complaint && (
                  <div className="text-xs text-slate-700">
                    <strong>Chief Complaints:</strong> {prescriptionData.complaint}
                  </div>
                )}

                {basket.length > 0 && (
                  <div className="space-y-1 text-xs text-slate-700">
                    <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                      Recorded Repertory Rubrics:
                    </h3>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 pl-1">
                      {basket.map((sym) => (
                        <li key={sym.sym_id}>
                          <strong>{sym.category_name}:</strong> {sym.name_en}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <div className="text-2xl font-serif font-black text-teal-900">
                    ℞
                  </div>

                  <div className="pl-4 space-y-1 border-l-2 border-teal-800">
                    <div className="flex items-baseline space-x-3">
                      <span className="text-base font-bold text-slate-950">
                        {prescriptionData.prescribedRemedy || 'Prescribed Remedy'}
                      </span>
                      <span className="text-xs font-mono font-bold text-teal-800">
                        {prescriptionData.potency}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium">
                      <strong>Dosage:</strong> {prescriptionData.dosage || 'As directed by physician'}
                    </p>
                  </div>
                </div>

                {prescriptionData.notes && (
                  <div className="bg-teal-50/70 border border-teal-200 p-2 rounded text-xs text-teal-950 space-y-0.5">
                    <strong className="block font-bold">Doctor's Advice:</strong>
                    <p className="text-slate-700">{prescriptionData.notes}</p>
                  </div>
                )}

                <div className="pt-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200 mt-8">
                  <span>Homeopathic Repertory System</span>
                  <div className="text-center">
                    <div className="w-36 border-b border-slate-400 mb-1"></div>
                    <span className="font-semibold text-slate-700">Doctor Signature & Stamp</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* MODAL: DOCTOR SIGN IN / SIGN UP */}
      {/* ========================================================================= */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-3.5 border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-700" />
                  <span>{authMode === 'login' ? 'Doctor Sign In' : 'Register Doctor Account'}</span>
                </h3>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {authError && (
              <div className="p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-2.5 text-xs">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="text-slate-700 font-semibold block mb-0.5">Doctor Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Tariq Mahmood"
                      value={signupForm.doctor_name}
                      onChange={(e) => setSignupForm({ ...signupForm, doctor_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-700 font-semibold block mb-0.5">Degree</label>
                      <input
                        type="text"
                        placeholder="B.H.M.S"
                        value={signupForm.degree}
                        onChange={(e) => setSignupForm({ ...signupForm, degree: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-slate-700 font-semibold block mb-0.5">Phone</label>
                      <input
                        type="text"
                        placeholder="0300-1234567"
                        value={signupForm.phone}
                        onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-0.5">Clinic Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Tariq Homeopathic Clinic"
                      value={signupForm.clinic_name}
                      onChange={(e) => setSignupForm({ ...signupForm, clinic_name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-slate-700 font-semibold block mb-0.5">Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Lahore"
                      value={signupForm.address}
                      onChange={(e) => setSignupForm({ ...signupForm, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-slate-700 font-semibold block mb-0.5">
                  {authMode === 'login' ? 'Username or Email' : 'Email *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="doctor@example.com"
                  value={authMode === 'login' ? loginForm.identifier : signupForm.email}
                  onChange={(e) =>
                    authMode === 'login'
                      ? setLoginForm({ ...loginForm, identifier: e.target.value })
                      : setSignupForm({ ...signupForm, email: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-0.5">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authMode === 'login' ? loginForm.password : signupForm.password}
                  onChange={(e) =>
                    authMode === 'login'
                      ? setLoginForm({ ...loginForm, password: e.target.value })
                      : setSignupForm({ ...signupForm, password: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900"
                />
              </div>

              <div className="pt-1.5">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-1.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition flex items-center justify-center space-x-1"
                >
                  {authLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{authMode === 'login' ? 'Sign In' : 'Register Account'}</span>
                </button>
              </div>
            </form>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              {authMode === 'login' ? (
                <>
                  <span>New Doctor?</span>
                  <button
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError('');
                    }}
                    className="font-bold text-teal-800 hover:underline"
                  >
                    Register Account
                  </button>
                </>
              ) : (
                <>
                  <span>Already have an account?</span>
                  <button
                    onClick={() => {
                      setAuthMode('login');
                      setAuthError('');
                    }}
                    className="font-bold text-teal-800 hover:underline"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>

            {currentDoctor && (
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Logged in as: <strong>{currentDoctor.doctor_name}</strong></span>
                <button
                  onClick={() => {
                    setCurrentDoctor(null);
                    setShowAuthModal(false);
                  }}
                  className="text-rose-600 hover:underline font-semibold flex items-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REGISTER NEW PATIENT */}
      {/* ========================================================================= */}
      {showNewPatientModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-3.5 border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center space-x-1.5">
                <UserPlus className="w-4 h-4 text-teal-700" />
                <span>Register New Patient</span>
              </h3>
              <button
                onClick={() => setShowNewPatientModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterPatient} className="space-y-2.5 text-xs">
              <div>
                <label className="text-slate-700 font-semibold block mb-0.5">Patient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Mahmood"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-semibold block mb-0.5">Age</label>
                  <input
                    type="text"
                    placeholder="35"
                    value={newPatient.age}
                    onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold block mb-0.5">Gender</label>
                  <select
                    value={newPatient.gender}
                    onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Child</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-0.5">Phone / WhatsApp</label>
                <input
                  type="text"
                  placeholder="0300-1234567"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-0.5">City</label>
                <input
                  type="text"
                  placeholder="Lahore"
                  value={newPatient.city}
                  onChange={(e) => setNewPatient({ ...newPatient, city: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                />
              </div>

              <div>
                <label className="text-slate-700 font-semibold block mb-0.5">Medical Background</label>
                <textarea
                  rows={2}
                  placeholder="Chronic complaints, past medications..."
                  value={newPatient.history}
                  onChange={(e) => setNewPatient({ ...newPatient, history: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewPatientModal(false)}
                  className="px-2.5 py-1 rounded text-slate-600 hover:bg-slate-100 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
                >
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
