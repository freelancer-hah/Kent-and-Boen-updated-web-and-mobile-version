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
  ChevronLeft,
  ArrowLeft,
  LayoutGrid,
  List,
  Stethoscope,
  LogIn,
  LogOut,
  ShieldCheck,
  Mic,
  MicOff,
  Wand2,
  Brain,
  Bot,
  Settings,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import type { ExtractedRubricCandidate, DifferentialResult, AiConfig } from '@/lib/ai';

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

  // AI Clinical Assistant State
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [aiNarrative, setAiNarrative] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiRubrics, setAiRubrics] = useState<ExtractedRubricCandidate[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLang, setSpeechLang] = useState<'ur-PK' | 'en-US'>('ur-PK');
  const [aiConfig, setAiConfig] = useState<AiConfig>({
    provider: 'gemini',
    apiKey: '',
    model: 'gemini-2.0-flash',
  });
  const [showAiSettings, setShowAiSettings] = useState<boolean>(false);

  // AI Differential Analysis State
  const [showDifferentialModal, setShowDifferentialModal] = useState<boolean>(false);
  const [differentialLoading, setDifferentialLoading] = useState<boolean>(false);
  const [differentialResult, setDifferentialResult] = useState<DifferentialResult | null>(null);

  // Mobile View Navigation State
  const [mobileMateriaView, setMobileMateriaView] = useState<'list' | 'detail'>('list');
  const [mobilePatientView, setMobilePatientView] = useState<'list' | 'detail'>('list');
  const [mobileResultsView, setMobileResultsView] = useState<'cards' | 'matrix'>('cards');

  // Load AI configuration from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kb_ai_config');
      if (saved) {
        setAiConfig(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to parse saved AI config', e);
    }
  }, []);

  const saveAiConfig = (newConfig: AiConfig) => {
    setAiConfig(newConfig);
    try {
      localStorage.setItem('kb_ai_config', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Failed to save AI config', e);
    }
  };

  // Web Speech API Voice Dictation
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;

    if (isListening) {
      if ((window as any).__kb_speech_rec) {
        (window as any).__kb_speech_rec.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.lang = speechLang;
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      rec.onerror = (e: any) => {
        console.warn('Speech recognition error:', e);
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setAiNarrative((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      (window as any).__kb_speech_rec = rec;
      rec.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  // AI Extract Rubrics
  const handleAiExtractRubrics = async () => {
    if (!aiNarrative.trim()) return;
    setAiLoading(true);
    setAiRubrics([]);
    try {
      const res = await fetch('/api/ai/rubrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative: aiNarrative,
          repertory_id: repertoryId,
          config: aiConfig,
        }),
      });
      const data = await res.json();
      if (data.success && data.rubrics) {
        setAiRubrics(data.rubrics);
      } else {
        alert(data.error || 'Failed to extract rubrics.');
      }
    } catch (err: any) {
      alert(err.message || 'Error communicating with AI service.');
    } finally {
      setAiLoading(false);
    }
  };

  // Add all AI extracted rubrics into active case basket
  const addAllAiRubrics = () => {
    const newItems = aiRubrics.filter((r) => !basket.some((b) => b.sym_id === r.sym_id));
    if (newItems.length === 0) {
      alert('All suggested rubrics are already in your case basket.');
      return;
    }
    setBasket((prev) => [...prev, ...newItems]);
    setShowAiModal(false);
  };

  // Run AI Differential Diagnosis
  const handleRunDifferential = async () => {
    if (basket.length === 0) {
      alert('Please add at least one rubric into your case basket.');
      return;
    }
    setShowDifferentialModal(true);
    setDifferentialLoading(true);
    setDifferentialResult(null);

    try {
      const res = await fetch('/api/ai/differential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedSymptoms: basket,
          topRemedies: rankedRemedies.slice(0, 5),
          patientInfo: {
            age: prescriptionData.age,
            gender: prescriptionData.gender,
          },
          config: aiConfig,
        }),
      });
      const data = await res.json();
      if (data.success && data.analysis) {
        setDifferentialResult(data.analysis);
      } else {
        alert(data.error || 'Failed to generate differential analysis.');
      }
    } catch (err: any) {
      alert(err.message || 'Error running differential analysis.');
    } finally {
      setDifferentialLoading(false);
    }
  };

  // Apply Differential to Prescription
  const applyDifferentialToPrescription = () => {
    if (!differentialResult) return;
    setPrescriptionData((prev) => ({
      ...prev,
      prescribedRemedy: differentialResult.similimum.remedyName,
      potency: differentialResult.potencyAdvice.suggestedPotency || prev.potency,
      dosage: differentialResult.potencyAdvice.posology || prev.dosage,
      notes: differentialResult.restrictions && differentialResult.restrictions.length > 0
        ? `Dietary & Antidote Instructions:\n• ${differentialResult.restrictions.join('\n• ')}`
        : prev.notes,
    }));
    setShowDifferentialModal(false);
    setActiveTab('prescription');
  };

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
      {/* 1. COMPACT TOP HEADER */}
      {/* ========================================================================= */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4">
          <div className="flex items-center justify-between h-13 sm:h-14 gap-2 sm:gap-3">
            {/* Left: Brand Identity */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-700 flex items-center justify-center text-white shadow-xs">
                <Stethoscope className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <span className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight whitespace-nowrap">
                <span className="hidden sm:inline">Kent & Boenninghausen</span>
                <span className="sm:hidden">Kent & Boen</span>
              </span>
            </div>

            {/* Center: Tabs (Desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setActiveTab('repertorize')}
                className={`h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition ${
                  activeTab === 'repertorize'
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span>Repertory</span>
                {basket.length > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${activeTab === 'repertorize' ? 'bg-white text-teal-800' : 'bg-teal-700 text-white'}`}>
                    {basket.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('patients')}
                className={`h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition ${
                  activeTab === 'patients'
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Patients</span>
              </button>
              <button
                onClick={() => setActiveTab('browser')}
                className={`h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition ${
                  activeTab === 'browser'
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Chapters</span>
              </button>
              <button
                onClick={() => setActiveTab('materia')}
                className={`h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition ${
                  activeTab === 'materia'
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Pill className="w-3.5 h-3.5 shrink-0" />
                <span>Materia Medica</span>
              </button>
              <button
                onClick={() => setActiveTab('prescription')}
                className={`h-9 px-3 rounded-lg text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 transition ${
                  activeTab === 'prescription'
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>Prescription</span>
              </button>
            </nav>

            {/* Right: Mode & Doctor Auth */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Repertory Select */}
              <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 h-8 sm:h-9">
                <button
                  onClick={() => setRepertoryId(1)}
                  className={`h-6.5 sm:h-7 px-2 sm:px-2.5 rounded-md text-[11px] sm:text-xs font-semibold transition whitespace-nowrap ${
                    repertoryId === 1
                      ? 'bg-white text-teal-800 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Kent Repertory (64,000+ rubrics)"
                >
                  Kent
                </button>
                <button
                  onClick={() => setRepertoryId(2)}
                  className={`h-6.5 sm:h-7 px-2 sm:px-2.5 rounded-md text-[11px] sm:text-xs font-semibold transition whitespace-nowrap ${
                    repertoryId === 2
                      ? 'bg-white text-teal-800 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Boenninghausen Repertory (2,500+ rubrics)"
                >
                  <span className="hidden sm:inline">Boenninghausen</span>
                  <span className="sm:hidden">Boen</span>
                </button>
              </div>

              {/* Doctor Sign In / Account Icon Button */}
              {currentDoctor ? (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="h-8 sm:h-9 px-2 sm:px-2.5 inline-flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 hover:bg-teal-100 transition text-xs font-semibold whitespace-nowrap shadow-xs"
                  title={`Signed in as ${currentDoctor.doctor_name} (Click to manage)`}
                >
                  <div className="w-5 h-5 rounded-full bg-teal-700 text-white font-bold flex items-center justify-center text-[10px]">
                    DR
                  </div>
                  <LogOut className="w-3.5 h-3.5 text-slate-500 hover:text-rose-600 ml-0.5" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  }}
                  className="h-8 sm:h-9 px-2 sm:px-2.5 inline-flex items-center gap-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition shadow-xs text-xs font-bold"
                  title="Doctor Sign In"
                >
                  <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto p-2.5 sm:p-4 pb-24 md:pb-6">
        {/* ======================================================================= */}
        {/* TAB 1: REPERTORIZE (CLASSIC CLINIC DESKTOP GRID & SPLIT VIEW) */}
        {/* ======================================================================= */}
        {activeTab === 'repertorize' && (
          <div className="space-y-3">
            {/* Top Command Bar: Search + Chapter Filter + Quick Test Cases */}
            <div className="bg-white border border-slate-200 p-2 sm:p-2.5 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              {/* Search & Chapter inputs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-1 w-full">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 sm:top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search rubric in English or Urdu (e.g. headache, سر درد, restlessness)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 sm:h-9 w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-8 text-sm sm:text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-700 focus:ring-1 focus:ring-teal-700 transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 sm:top-2 text-slate-400 hover:text-slate-600 text-xs w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center rounded-full hover:bg-slate-200"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(Number(e.target.value))}
                  className="h-10 sm:h-9 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm sm:text-xs text-slate-800 font-medium focus:outline-none focus:bg-white focus:border-teal-700 w-full sm:w-44 shrink-0 cursor-pointer"
                >
                  <option value="0">All Chapters ({categories.length})</option>
                  {categories.map((c) => (
                    <option key={c.cat_id} value={c.cat_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Benchmark Test Cases + AI Button */}
              <div className="flex items-center gap-1.5 text-xs overflow-x-auto pb-1 sm:pb-0 no-scrollbar w-full md:w-auto shrink-0">
                {/* AI Case Intake Button */}
                <button
                  onClick={() => setShowAiModal(true)}
                  className="h-8.5 sm:h-8 inline-flex items-center gap-1.5 px-3 rounded-lg bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white text-xs font-bold shadow-xs transition whitespace-nowrap shrink-0"
                  title="Open AI Natural Language & Voice Case Intake"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI Case Intake</span>
                </button>

                <button
                  onClick={() => loadVerifiedTestCase(1)}
                  className="h-8.5 sm:h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 text-xs font-semibold transition whitespace-nowrap shrink-0"
                >
                  1. Headache
                </button>
                <button
                  onClick={() => loadVerifiedTestCase(2)}
                  className="h-8.5 sm:h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 text-xs font-semibold transition whitespace-nowrap shrink-0"
                >
                  2. Gastric
                </button>
                <button
                  onClick={() => loadVerifiedTestCase(3)}
                  className="h-8.5 sm:h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-200 text-xs font-semibold transition whitespace-nowrap shrink-0"
                >
                  3. Chill
                </button>

                {basket.length > 0 && (
                  <button
                    onClick={() => setBasket([])}
                    className="h-8.5 sm:h-8 inline-flex items-center gap-1 px-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Rubrics Compact Data Grid & Mobile Card List */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Rubrics Explorer ({searchResults.length} matches)
                </span>
                <span className="text-slate-500 text-[11px] hidden sm:inline">
                  Click <strong>+ Add</strong> or double-click to select rubric into case
                </span>
              </div>

              {/* Mobile Card List (< md) */}
              <div className="block md:hidden max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                {isSearching ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin inline-block mr-1 text-teal-700" />
                    Searching rubrics...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="py-8 px-4 text-center text-slate-400 text-xs">
                    No matching rubrics found. Type keywords like "headache", "سر درد", or select a chapter.
                  </div>
                ) : (
                  searchResults.map((sym) => {
                    const inBasket = basket.some((s) => s.sym_id === sym.sym_id);
                    return (
                      <div
                        key={sym.sym_id}
                        className={`p-3 transition flex items-start justify-between gap-2.5 ${
                          inBasket ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => (inBasket ? removeFromBasket(sym.sym_id) : addToBasket(sym))}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">
                              {sym.category_name || 'Chapter'}
                            </span>
                            {sym.remedy_count ? (
                              <span className="text-[10px] font-mono text-slate-500">
                                {sym.remedy_count} meds
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {sym.name_en}
                          </p>
                          {sym.name_ur && (
                            <p className="text-xs font-urdu text-teal-800 leading-normal mt-1" dir="rtl">
                              {sym.name_ur}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => (inBasket ? removeFromBasket(sym.sym_id) : addToBasket(sym))}
                          className={`min-h-[34px] px-3 rounded-lg text-xs font-bold shrink-0 transition ${
                            inBasket
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-teal-700 hover:text-white'
                          }`}
                        >
                          {inBasket ? 'Added ✓' : '+ Add'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block max-h-[300px] overflow-y-auto">
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
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-3 space-y-3">
              {/* Header: Selected Rubrics Pills */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2.5 gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800 flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-teal-700" />
                    <span>Selected Case Rubrics ({basket.length})</span>
                  </span>
                  {basket.length > 0 && (
                    <span className="text-[10px] sm:text-[11px] font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Calculated in {calcDuration} ms • {rankedRemedies.length} remedies
                    </span>
                  )}
                </div>

                {basket.length > 0 && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleRunDifferential}
                      className="h-8 sm:h-7.5 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 rounded-lg bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold text-xs shadow-xs transition"
                      title="Run AI Differential Materia Medica Analysis on Top Remedies"
                    >
                      <Brain className="w-3.5 h-3.5 text-amber-300" />
                      <span>AI Differential</span>
                    </button>

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
                      className="h-8 sm:h-7.5 flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs shadow-xs transition"
                    >
                      <Printer className="w-3 h-3 text-slate-600" />
                      <span>Prescribe ({rankedRemedies[0]?.shortcut || 'Rx'})</span>
                    </button>
                  </div>
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

                  {/* Results View Switcher (Visible on Mobile) */}
                  <div className="flex md:hidden items-center justify-between bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 px-2">Results View:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setMobileResultsView('cards')}
                        className={`h-7 px-2.5 rounded-md text-xs font-bold inline-flex items-center gap-1 transition ${
                          mobileResultsView === 'cards'
                            ? 'bg-white text-teal-800 shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Cards</span>
                      </button>
                      <button
                        onClick={() => setMobileResultsView('matrix')}
                        className={`h-7 px-2.5 rounded-md text-xs font-bold inline-flex items-center gap-1 transition ${
                          mobileResultsView === 'matrix'
                            ? 'bg-white text-teal-800 shadow-xs'
                            : 'text-slate-600'
                        }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Matrix</span>
                      </button>
                    </div>
                  </div>

                  {/* Mobile Top Ranked Remedies Cards (< md when view is cards) */}
                  <div className={`${mobileResultsView === 'cards' ? 'block md:hidden' : 'hidden'} space-y-2`}>
                    {rankedRemedies.slice(0, 10).map((r, rowIdx) => (
                      <div
                        key={r.rem_id}
                        className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2 hover:border-teal-300 transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                              rowIdx === 0
                                ? 'bg-amber-400 text-amber-950 font-black'
                                : rowIdx === 1
                                ? 'bg-slate-300 text-slate-900 font-bold'
                                : rowIdx === 2
                                ? 'bg-amber-700/30 text-amber-900 font-bold'
                                : 'bg-slate-100 text-slate-600 text-[11px]'
                            }`}>
                              #{rowIdx + 1}
                            </span>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm">{r.name}</h4>
                              {r.shortcut && (
                                <span className="text-[10px] font-mono text-teal-800 font-semibold bg-teal-50 px-1 rounded">
                                  ({r.shortcut})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 block">
                              Score: {r.grade}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Covered: {r.matched}/{basket.length}
                            </span>
                          </div>
                        </div>

                        {/* Covered rubrics badges */}
                        <div className="flex flex-wrap gap-1 pt-1 border-t border-slate-100">
                          {basket.map((sym, i) => {
                            const weight = r.weights[sym.sym_id];
                            if (!weight) return null;
                            return (
                              <span
                                key={sym.sym_id}
                                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  weight === 4
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : weight === 3
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-teal-50 text-teal-800 border border-teal-200'
                                }`}
                                title={`${sym.name_en} (Grade ${weight})`}
                              >
                                S{i + 1}: Grade {weight}
                              </span>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              setSelectedRemedyId(r.rem_id);
                              setMobileMateriaView('detail');
                              setActiveTab('materia');
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold text-center transition"
                          >
                            View Materia
                          </button>
                          <button
                            onClick={() => {
                              setPrescriptionData((prev) => ({ ...prev, prescribedRemedy: r.name }));
                              setActiveTab('prescription');
                            }}
                            className="flex-1 py-1.5 px-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold text-center transition"
                          >
                            Prescribe Rx
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Classical Cross-Matrix Heatmap Table (Desktop or mobile matrix view) */}
                  <div className={`${mobileResultsView === 'matrix' ? 'block' : 'hidden md:block'} border border-slate-300 rounded-xl overflow-hidden`}>
                    <div className="md:hidden bg-slate-50 px-3 py-1.5 border-b border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>← Swipe table left/right to view all rubrics →</span>
                    </div>
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
            <div className="bg-white border border-slate-300 p-3 rounded-lg shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Users className="w-4 h-4 text-teal-700" />
                  <span>Patient Electronic Health Records (EHR) & Consultation History</span>
                </h1>
              </div>
              <button
                onClick={() => setShowNewPatientModal(true)}
                className="flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs w-full sm:w-auto"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Register New Patient</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Left Column: Patients Directory */}
              <div className={`${selectedPatientId && mobilePatientView === 'detail' ? 'hidden md:block' : 'block'} md:col-span-4 bg-white border border-slate-300 p-3 rounded-lg shadow-xs space-y-2.5`}>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search patient by name or phone..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-700"
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
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setMobilePatientView('detail');
                        }}
                        className={`w-full text-left py-2 px-2.5 rounded-lg transition flex items-center justify-between ${
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
              <div className={`${selectedPatientId && mobilePatientView === 'detail' ? 'block' : 'hidden md:block'} md:col-span-8 space-y-4`}>
                {selectedPatientId && patients.find((p) => p.id === selectedPatientId) ? (
                  <>
                    {/* Mobile Back Button */}
                    <button
                      onClick={() => setMobilePatientView('list')}
                      className="md:hidden inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg mb-1"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>← Back to Patients Directory</span>
                    </button>

                    {(() => {
                      const p = patients.find((pt) => pt.id === selectedPatientId)!;
                      return (
                        <div className="bg-white border border-slate-300 p-4 rounded-lg shadow-xs space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                            <div>
                              <h2 className="text-base font-bold text-slate-900">{p.name}</h2>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 mt-0.5">
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
                              className="flex items-center justify-center space-x-1 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 w-full sm:w-auto"
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-teal-700" />
                          <span>Past Consultation Visits ({selectedPatientVisits.length})</span>
                        </h3>
                        <button
                          onClick={handleSaveVisit}
                          className="flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs w-full sm:w-auto"
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
                              className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1 text-xs"
                            >
                              <div className="flex flex-wrap items-center justify-between text-slate-600 gap-1">
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
          <div className="space-y-3">
            {/* Mobile Chapter Selector (< md) */}
            <div className="md:hidden bg-white border border-slate-300 p-3 rounded-xl shadow-xs space-y-1.5">
              <label className="text-xs font-bold text-slate-800 block">Select Repertory Chapter</label>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(Number(e.target.value))}
                className="w-full h-10 bg-slate-50 border border-slate-300 rounded-lg px-3 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-700"
              >
                <option value="0">All Chapters ({categories.length})</option>
                {categories.map((c) => (
                  <option key={c.cat_id} value={c.cat_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Desktop Chapters Sidebar (>= md) */}
              <div className="hidden md:block bg-white border border-slate-300 p-2.5 rounded-xl max-h-[700px] overflow-y-auto space-y-1 shadow-xs">
                <p className="text-xs font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">
                  Chapters ({categories.length})
                </p>
                {categories.map((c) => (
                  <button
                    key={c.cat_id}
                    onClick={() => setSelectedCatId(c.cat_id)}
                    className={`w-full text-left px-2 py-1 rounded-md text-xs font-semibold transition flex items-center justify-between ${
                      selectedCatId === c.cat_id
                        ? 'bg-teal-700 text-white shadow-2xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>

              {/* Chapter Rubrics List */}
              <div className="md:col-span-3 bg-white border border-slate-300 p-3 sm:p-4 rounded-xl space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase">
                    {selectedCatId
                      ? categories.find((c) => c.cat_id === selectedCatId)?.name
                      : 'All Symptoms'}
                  </h2>
                  <span className="text-xs text-slate-500 font-mono">
                    {searchResults.length} rubrics
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
                  {searchResults.map((sym) => {
                    const inBasket = basket.some((s) => s.sym_id === sym.sym_id);
                    return (
                      <div
                        key={sym.sym_id}
                        className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex items-start justify-between gap-3 hover:border-slate-300 transition"
                      >
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 leading-snug">{sym.name_en}</p>
                          {sym.name_ur && (
                            <p className="text-xs font-urdu text-teal-800 leading-normal mt-1" dir="rtl">
                              {sym.name_ur}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => (inBasket ? removeFromBasket(sym.sym_id) : addToBasket(sym))}
                          className={`min-h-[32px] px-3 rounded-lg text-xs font-bold transition shrink-0 ${
                            inBasket
                              ? 'bg-teal-700 text-white shadow-2xs'
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
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 4: MATERIA MEDICA */}
        {/* ======================================================================= */}
        {activeTab === 'materia' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className={`${selectedRemedyId && mobileMateriaView === 'detail' ? 'hidden md:flex' : 'flex'} md:col-span-4 bg-white border border-slate-300 p-3 rounded-xl shadow-xs space-y-2 max-h-[750px] flex-col`}>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search remedy (e.g. Lycopodium)..."
                  value={materiaSearch}
                  onChange={(e) => setMateriaSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-teal-700"
                />
              </div>

              <div className="divide-y divide-slate-100 overflow-y-auto flex-1 pr-1">
                {remediesList.map((rem) => (
                  <button
                    key={rem.rem_id}
                    onClick={() => {
                      setSelectedRemedyId(rem.rem_id);
                      setMobileMateriaView('detail');
                    }}
                    className={`w-full text-left py-2 px-2.5 rounded-lg text-xs transition flex items-center justify-between ${
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

            <div className={`${selectedRemedyId && mobileMateriaView === 'detail' ? 'block' : 'hidden md:block'} md:col-span-8 space-y-4`}>
              {/* Mobile Back Button */}
              <button
                onClick={() => setMobileMateriaView('list')}
                className="md:hidden inline-flex items-center gap-1 text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-lg mb-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>← Back to Remedies List</span>
              </button>

              {loadingRemedy ? (
                <div className="bg-white border border-slate-300 p-8 text-center text-slate-500 text-xs rounded-xl">
                  <RefreshCw className="w-4 h-4 animate-spin text-teal-700 inline-block mr-1" />
                  Loading Materia Medica...
                </div>
              ) : selectedRemedyDetail ? (
                <div className="space-y-3">
                  <div className="bg-white border border-slate-300 p-3 sm:p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold self-start sm:self-auto">
                        ★ Polychrest
                      </span>
                    )}
                  </div>

                  {/* Relationships */}
                  {selectedRemedyDetail.relations.length > 0 && (
                    <div className="bg-white border border-slate-300 p-3 sm:p-4 rounded-xl shadow-xs space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1">
                        <SlidersHorizontal className="w-3 h-3 text-teal-700" />
                        <span>Drug Relationships</span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
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
                  <div className="bg-white border border-slate-300 p-3 sm:p-4 rounded-xl shadow-xs space-y-2">
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
            <div className="no-print bg-white border border-slate-300 p-3 sm:p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div>
                <h1 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <Printer className="w-4 h-4 text-teal-700" />
                  <span>Clinical Prescription Slip & PDF Export</span>
                </h1>
                <p className="text-xs text-slate-500">
                  Formatted cleanly for A4 printing and PDF export with clinic header.
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center space-x-1 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition w-full sm:w-auto"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Prescription (Save PDF)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="no-print lg:col-span-4 bg-white border border-slate-300 p-3.5 sm:p-4 rounded-xl shadow-xs space-y-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Prescription Details</h2>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-600 font-semibold block mb-0.5">Patient Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Tariq Mahmood"
                      value={prescriptionData.patientName}
                      onChange={(e) => setPrescriptionData({ ...prescriptionData, patientName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
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
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 font-semibold block mb-0.5">Gender</label>
                      <select
                        value={prescriptionData.gender}
                        onChange={(e) => setPrescriptionData({ ...prescriptionData, gender: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
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
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
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
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-bold text-teal-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-slate-600 font-semibold block mb-0.5">Potency</label>
                        <input
                          type="text"
                          value={prescriptionData.potency}
                          onChange={(e) => setPrescriptionData({ ...prescriptionData, potency: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-600 font-semibold block mb-0.5">Dosage</label>
                        <input
                          type="text"
                          placeholder="e.g. 1 dose morning"
                          value={prescriptionData.dosage}
                          onChange={(e) => setPrescriptionData({ ...prescriptionData, dosage: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-slate-600 font-semibold block mb-0.5">Dietary & Lifestyle Advice</label>
                      <textarea
                        rows={2}
                        value={prescriptionData.notes}
                        onChange={(e) => setPrescriptionData({ ...prescriptionData, notes: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* A4 Paper Sheet Preview */}
              <div className="lg:col-span-8 print-card bg-white text-slate-900 p-4 sm:p-6 md:p-8 rounded-xl shadow-xs border border-slate-300 space-y-5 sm:space-y-6">
                <div className="border-b-2 border-teal-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                  <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
                    <p><strong>Phone:</strong> {currentDoctor?.phone || '—'}</p>
                    <p><strong>Date:</strong> {new Date().toLocaleDateString('en-GB')}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between text-xs font-medium text-slate-800 gap-1.5">
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

      {/* ========================================================================= */}
      {/* 5. AI CLINICAL CASE INTAKE MODAL (NATURAL LANGUAGE & VOICE) */}
      {/* ========================================================================= */}
      {showAiModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-800 to-emerald-800 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">AI Clinical Case Intake</h3>
                  <p className="text-[11px] text-teal-100">
                    Natural Language & Voice to Kent/Boenninghausen Rubrics
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/15 text-emerald-200 border border-white/20">
                  ⚡ Gemini Clinical AI Active
                </span>
                <button
                  onClick={() => {
                    if (isListening && (window as any).__kb_speech_rec) {
                      (window as any).__kb_speech_rec.stop();
                      setIsListening(false);
                    }
                    setShowAiModal(false);
                  }}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>


            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Patient Complaint & Modalities (Urdu, Roman Urdu, or English)
                </label>
                <div className="relative">
                  <textarea
                    rows={4}
                    placeholder="e.g. 3 din se sar ke dayen taraf shadeed dard hai jo dhoop me barhta hai, thandi patti se sakoon milta hai, pyas bilkul nahi lagti aur bohot ghussa aata hai..."
                    value={aiNarrative}
                    onChange={(e) => setAiNarrative(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700 leading-relaxed"
                  />
                  {aiNarrative && (
                    <button
                      onClick={() => setAiNarrative('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-200"
                      title="Clear text"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Dictation & Language Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSpeechRecognition}
                    className={`h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse shadow-sm'
                        : 'bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-900 border border-slate-300 shadow-2xs'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-3.5 h-3.5" />
                        <span>Stop Listening</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3.5 h-3.5 text-teal-700" />
                        <span>Voice Dictate (بول کر لکھیں)</span>
                      </>
                    )}
                  </button>

                  {/* Speech Language Switcher */}
                  <select
                    value={speechLang}
                    onChange={(e) => setSpeechLang(e.target.value as any)}
                    className="h-8 bg-white border border-slate-300 rounded-lg px-2 text-[11px] font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="ur-PK">Urdu (اردو پاکستان)</option>
                    <option value="en-US">English (US)</option>
                  </select>
                </div>

                <button
                  onClick={handleAiExtractRubrics}
                  disabled={aiLoading || !aiNarrative.trim()}
                  className="h-8 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs inline-flex items-center gap-1.5 transition"
                >
                  {aiLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing Totality...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                      <span>Find Matching Rubrics</span>
                    </>
                  )}
                </button>
              </div>

              {/* Listening Active Indicator */}
              {isListening && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-2 flex items-center gap-2 text-rose-800 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                  <span className="font-semibold">
                    Microphone is live ({speechLang === 'ur-PK' ? 'اردو' : 'English'}). Bolna shuru karein...
                  </span>
                </div>
              )}

              {/* Extracted Rubric Candidates */}
              {aiRubrics.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-700" />
                      <span>Matched Database Rubrics ({aiRubrics.length})</span>
                    </span>
                    <button
                      onClick={addAllAiRubrics}
                      className="h-7 px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-[11px] font-bold shadow-xs transition inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add All to Case</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[240px] overflow-y-auto pr-1">
                    {aiRubrics.map((r) => {
                      const inBasket = basket.some((b) => b.sym_id === r.sym_id);
                      return (
                        <div
                          key={r.sym_id}
                          className="bg-slate-50 hover:bg-teal-50/60 border border-slate-200 rounded-lg p-2 flex items-center justify-between gap-3 text-xs transition"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[10px] font-bold uppercase">
                                {r.category_name || 'Chapter'}
                              </span>
                              {r.matchReason && (
                                <span className="text-[10px] text-teal-800 font-medium truncate">
                                  {r.matchReason}
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-slate-900 truncate">{r.name_en}</p>
                            {r.name_ur && (
                              <p className="text-[11px] font-urdu text-teal-700 leading-snug mt-0.5" dir="rtl">
                                {r.name_ur}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-slate-500">
                              {r.remedy_count ? `${r.remedy_count} meds` : ''}
                            </span>
                            <button
                              onClick={() => {
                                if (inBasket) {
                                  removeFromBasket(r.sym_id);
                                } else {
                                  addToBasket(r);
                                }
                              }}
                              className={`h-6.5 px-2.5 rounded text-[11px] font-bold transition ${
                                inBasket
                                  ? 'bg-teal-700 text-white'
                                  : 'bg-white border border-slate-300 text-slate-700 hover:bg-teal-700 hover:text-white'
                              }`}
                            >
                              {inBasket ? 'Added ✓' : '+ Add'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. AI DIFFERENTIAL MATERIA MEDICA CONSULTANT MODAL */}
      {/* ========================================================================= */}
      {showDifferentialModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-800 to-emerald-800 px-5 py-3.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Brain className="w-4.5 h-4.5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">AI Differential Materia Medica</h3>
                  <p className="text-[11px] text-teal-100">
                    Clinical Totality & Similimum Analysis ({basket.length} Rubrics)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDifferentialModal(false)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs">
              {differentialLoading ? (
                <div className="py-12 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto text-teal-700" />
                  <p className="font-bold text-slate-800 text-sm">
                    Analyzing Materia Medica Keynotes...
                  </p>
                  <p className="text-slate-500 text-xs max-w-sm mx-auto">
                    Evaluating modalities, eliminating symptoms, and calculating the most suitable Similimum for your case totality.
                  </p>
                </div>
              ) : differentialResult ? (
                <>
                  {/* Top Similimum Card */}
                  <div className="bg-gradient-to-br from-amber-50 to-teal-50 border border-amber-200/80 rounded-xl p-3.5 shadow-2xs">
                    <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase tracking-wider mb-1">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Recommended Similimum</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">
                      {differentialResult.similimum.remedyName}
                    </h4>
                    <p className="text-slate-700 text-xs leading-relaxed mt-1">
                      {differentialResult.similimum.keynoteReasoning}
                    </p>
                  </div>

                  {/* Comparative Analysis */}
                  {differentialResult.comparisons && differentialResult.comparisons.length > 0 && (
                    <div className="space-y-2">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] block">
                        Differential Breakdown (Top Candidates)
                      </span>
                      <div className="space-y-2">
                        {differentialResult.comparisons.map((c, idx) => (
                          <div
                            key={idx}
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900 text-xs">
                                {idx + 1}. {c.remedyName}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-teal-100/70 text-teal-900 font-mono text-[10px] font-bold">
                                Score {c.score}
                              </span>
                            </div>
                            <p className="text-slate-600 text-[11px]">
                              <strong className="text-teal-900">Indication:</strong> {c.indication}
                            </p>
                            <p className="text-slate-600 text-[11px]">
                              <strong className="text-amber-900">Differentia:</strong>{' '}
                              {c.contraindicationOrDifferentia}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Potency & Posology Advice */}
                  {differentialResult.potencyAdvice && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <Pill className="w-3.5 h-3.5 text-teal-700" />
                        <span>Potency & Posology Guidance</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Suggested Potency
                          </span>
                          <span className="text-sm font-extrabold text-teal-800">
                            {differentialResult.potencyAdvice.suggestedPotency}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">
                            Repetition Rule
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            {differentialResult.potencyAdvice.posology}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 italic mt-1">
                        {differentialResult.potencyAdvice.rationale}
                      </p>
                    </div>
                  )}

                  {/* Dietary & Antidote Restrictions */}
                  {differentialResult.restrictions && differentialResult.restrictions.length > 0 && (
                    <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3 space-y-1">
                      <span className="font-bold text-rose-900 uppercase tracking-wider text-[11px] block">
                        Homeopathic Dietary & Antidote Restrictions (پرہیز)
                      </span>
                      <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-0.5">
                        {differentialResult.restrictions.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Modal Footer Action */}
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                    <button
                      onClick={() => setShowDifferentialModal(false)}
                      className="h-8 px-3 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-semibold transition"
                    >
                      Close
                    </button>
                    <button
                      onClick={applyDifferentialToPrescription}
                      className="h-8 px-4 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Apply to Prescription (Rx)</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {/* ========================================================================= */}
      <nav className="no-print fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 md:hidden safe-area-bottom shadow-lg">
        <div className="grid grid-cols-5 h-16">
          <button
            onClick={() => setActiveTab('repertorize')}
            className={`flex flex-col items-center justify-center py-1 transition relative ${
              activeTab === 'repertorize' ? 'text-teal-700 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-semibold'
            }`}
          >
            <div className="relative">
              <Activity className={`w-5 h-5 ${activeTab === 'repertorize' ? 'stroke-[2.5]' : 'stroke-2'}`} />
              {basket.length > 0 && (
                <span className="absolute -top-1.5 -right-2.5 bg-teal-700 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                  {basket.length}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight mt-1">Repertory</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('patients');
              setMobilePatientView('list');
            }}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'patients' ? 'text-teal-700 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-semibold'
            }`}
          >
            <Users className={`w-5 h-5 ${activeTab === 'patients' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight mt-1">Patients</span>
          </button>

          <button
            onClick={() => setActiveTab('browser')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'browser' ? 'text-teal-700 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-semibold'
            }`}
          >
            <BookOpen className={`w-5 h-5 ${activeTab === 'browser' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight mt-1">Chapters</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('materia');
              setMobileMateriaView('list');
            }}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'materia' ? 'text-teal-700 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-semibold'
            }`}
          >
            <Pill className={`w-5 h-5 ${activeTab === 'materia' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight mt-1">Materia</span>
          </button>

          <button
            onClick={() => setActiveTab('prescription')}
            className={`flex flex-col items-center justify-center py-1 transition ${
              activeTab === 'prescription' ? 'text-teal-700 font-extrabold' : 'text-slate-500 hover:text-slate-900 font-semibold'
            }`}
          >
            <Printer className={`w-5 h-5 ${activeTab === 'prescription' ? 'stroke-[2.5]' : 'stroke-2'}`} />
            <span className="text-[10px] tracking-tight mt-1">Prescription</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
