/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ClipboardCheck, 
  FileText, 
  Calendar, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronRight,
  ChevronLeft,
  Languages,
  LogOut,
  Menu,
  X,
  Download,
  Camera,
  MapPin,
  ShieldCheck,
  UserCircle,
  Settings,
  TrendingUp,
  Share2,
  Database,
  Palmtree,
  CalendarDays as CalendarIcon,
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Employee, 
  AttendanceRecord, 
  LeaveRequest, 
  DashboardStats, 
  translations, 
  Language,
  UserRole
} from './types';

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const [user, setUser] = useState<Employee | null>(null);
  const [loginData, setLoginData] = useState({ mobile: '', password: '', productKey: '', email: '' });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'attendance' | 'reports' | 'leaves' | 'settings' | 'master' | 'holidays' | 'calendar'>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [masterStats, setMasterStats] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [businessInfo, setBusinessInfo] = useState<any>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [signupData, setSignupData] = useState({ 
    name: '', 
    business_name: '', 
    email: '', 
    mobile: '', 
    password: '', 
    plan_name: 'Starter', 
    employee_limit: 3 
  });
  const [showPinChange, setShowPinChange] = useState(false);
  const [newPinData, setNewPinData] = useState({ pin: '', confirm: '' });
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editingAttendance, setEditingAttendance] = useState<AttendanceRecord | null>(null);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [lateAlert, setLateAlert] = useState(false);
  const [showManualPunch, setShowManualPunch] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState({ month: String(new Date().getMonth() + 1).padStart(2, '0'), year: '2026' });
  const [settings, setSettings] = useState<any>({});
  
  // Camera & GPS State
  const [showCamera, setShowCamera] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);

  const t = translations[lang];

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [activeTab, user, selectedEmployeeId, historyFilter.month, historyFilter.year]);

  const fetchData = async () => {
    if (!user) return;
    try {
      if (user.role === 'master') {
        const [statsRes, bizRes] = await Promise.all([
          fetch('/api/master/stats'),
          fetch('/api/master/businesses')
        ]);
        setMasterStats(await statsRes.json());
        setBusinesses(await bizRes.json());
        return;
      }

      const bId = user.business_id;
      const [empRes, statsRes, attRes, leaveRes, settingsRes, bizInfoRes, holidayRes] = await Promise.all([
        fetch(`/api/employees?business_id=${bId}`),
        fetch(`/api/stats?business_id=${bId}`),
        fetch(`/api/attendance/today?business_id=${bId}`),
        fetch(`/api/leaves?business_id=${bId}${user?.role === 'employee' ? `&employee_id=${user.id}` : ''}`),
        fetch(`/api/settings?business_id=${bId}`),
        fetch(`/api/business/info/${bId}`),
        fetch(`/api/holidays?business_id=${bId}`)
      ]);
      
      setEmployees(await empRes.json());
      setStats(await statsRes.json());
      setTodayAttendance(await attRes.json());
      setSettings(await settingsRes.json());
      setBusinessInfo(await bizInfoRes.json());
      setHolidays(await holidayRes.json());
      
      const leaveData = await leaveRes.json();
      if (user?.role === 'employee') {
        setMyLeaves(leaveData);
      } else {
        setLeaves(leaveData);
      }

      // Fetch history
      if (user?.role === 'employee' || activeTab === 'attendance' || activeTab === 'calendar') {
        const targetEmpId = user?.role === 'employee' ? user.id : (activeTab === 'calendar' ? selectedEmployeeId : '');
        const histRes = await fetch(`/api/attendance/report?business_id=${bId}&year=${historyFilter.year}&month=${historyFilter.month}${targetEmpId ? `&employee_id=${targetEmpId}` : ''}`);
        setAttendanceHistory(await histRes.json());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Attempting login with:", { ...loginData, password: '***' });
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || contentType.indexOf("application/json") === -1) {
        const text = await res.text();
        console.error("Non-JSON response received:", text);
        alert("Server Error: Received non-JSON response. This usually means the API route is not working or being redirected. Please check if you are using the correct URL.");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setUser(data);
        if (data.is_first_login) {
          setShowPinChange(true);
        }
        if (data.role === 'master') {
          setActiveTab('master');
        } else {
          setActiveTab('dashboard');
        }
      } else {
        alert(data.error || "Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Network Error: Could not connect to the server. Please check your internet connection.");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.plan_name !== 'Starter' && !signupData.payment_screenshot) {
      alert(t.uploadPaymentScreenshot);
      return;
    }
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });
      if (res.ok) {
        const data = await res.json();
        alert(`${t.paymentSuccess}\n\n${t.productKey}: ${data.productKey}\n\nAccount will be active after Master Admin approval.`);
        setShowSignup(false);
      } else {
        const err = await res.json();
        alert(err.error || "Signup failed");
      }
    } catch (error) {
      console.error("Signup error:", error);
    }
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendance) return;
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = {
      check_in: formData.get('check_in'),
      check_out: formData.get('check_out'),
      status: formData.get('status'),
      is_late: formData.get('is_late') === 'on'
    };
    try {
      const res = await fetch(`/api/attendance/${editingAttendance.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setEditingAttendance(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error updating attendance:", error);
    }
  };

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    try {
      const res = await fetch('/api/master/add-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Business added! Product Key: ${result.productKey}`);
        setShowAddBusiness(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error adding business:", error);
    }
  };

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPinData.pin !== newPinData.confirm) {
      alert("PINs do not match");
      return;
    }
    try {
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: user?.id, new_password: newPinData.pin })
      });
      if (res.ok) {
        setShowPinChange(false);
        alert("PIN changed successfully");
      }
    } catch (error) {
      console.error("PIN change error:", error);
    }
  };

  const captureSelfie = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/jpeg');
      setSelfie(dataUrl);
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    } catch (error) {
      alert("Camera access denied");
    }
  };

  const getGPS = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => alert("Location access denied")
    );
  };

  const handleCheckIn = async (employeeId: number, shiftStart: string) => {
    const today = new Date().toISOString().split('T')[0];
    const isHoliday = holidays.find(h => h.date === today);
    if (isHoliday) {
      alert(`Today is a holiday: ${isHoliday.reason}. Attendance cannot be marked.`);
      return;
    }

    const emp = employees.find(e => e.id === employeeId);
    if (emp && emp.role === 'employee' && !emp.is_approved) {
      alert("Your account is not approved by employer.");
      return;
    }

    if (!selfie || !location) {
      alert(t.gpsRequired + " & " + t.selfieRequired);
      return;
    }

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const isLate = time > shiftStart;

    if (isLate) {
      setLateAlert(true);
    }

    try {
      const bId = user.business_id;
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employee_id: employeeId, 
          time, 
          is_late: isLate,
          latitude: location.lat,
          longitude: location.lng,
          selfie_url: selfie,
          business_id: bId
        })
      });
      if (res.ok) {
        setSelfie(null);
        setLocation(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error checking in:", error);
    }
  };

  const exportPDF = async () => {
    const doc = new jsPDF();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    doc.text(`${settings.business_name || t.title} - ${t.salarySummary}`, 14, 15);
    
    try {
      const bId = user.business_id;
      const res = await fetch(`/api/attendance/report?business_id=${bId}&year=${year}&month=${month}`);
      const records: AttendanceRecord[] = await res.json();
      
      const tableData = employees.map(emp => {
        const empRecords = records.filter(r => r.employee_id === emp.id);
        const present = empRecords.filter(r => r.status === 'present').length;
        const hours = empRecords.reduce((acc, r) => acc + (r.hours || 0), 0);
        const late = empRecords.filter(r => r.is_late).length;
        const penalty = late * (parseInt(settings.late_penalty) || 0);
        const payable = settings.salary_rule === 'hourly' 
          ? (hours * emp.salary) - penalty 
          : ((emp.salary / 30) * present) - penalty;
          
        return [
          emp.name,
          present,
          hours.toFixed(1),
          late,
          `Rs. ${Math.max(0, payable).toFixed(0)}`
        ];
      });

      autoTable(doc, {
        head: [[t.name, t.daysPresent, t.hoursWorked, t.lateDays, t.payableSalary]],
        body: tableData,
        startY: 25,
      });

      doc.save(`${settings.business_name || 'Attendora'}_Salary_Report_${now.toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF. Please try again.");
    }
  };

  const handleCheckOut = async (employeeId: number) => {
    const today = new Date().toISOString().split('T')[0];
    const isHoliday = holidays.find(h => h.date === today);
    if (isHoliday) {
      alert(`Today is a holiday: ${isHoliday.reason}. Attendance cannot be marked.`);
      return;
    }

    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    try {
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, time })
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Error checking out:", error);
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name'),
      mobile: formData.get('mobile'),
      password: formData.get('password') || editingEmployee?.password || '123456',
      role: formData.get('role') || editingEmployee?.role || 'employee',
      salary: parseFloat(formData.get('salary') as string),
      shift_start: formData.get('shift_start'),
      shift_end: formData.get('shift_end'),
      business_id: user?.business_id
    };

    const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
    const method = editingEmployee ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setShowAddEmployee(false);
        setEditingEmployee(null);
        fetchData();
      }
    } catch (error) {
      console.error("Error saving employee:", error);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (user?.role !== 'owner') {
      alert("Only owners can delete employees.");
      return;
    }
    if (!confirm(t.confirmDelete)) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Error deleting employee:", error);
    }
  };

  const handleLeaveStatus = async (id: number, status: string) => {
    try {
      const res = await fetch(`/api/leaves/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error("Error updating leave:", error);
    }
  };

  const handleManualPunch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const date = formData.get('date') as string;
    
    const isHoliday = holidays.find(h => h.date === date);
    if (isHoliday) {
      alert(`Selected date is a holiday: ${isHoliday.reason}. Attendance cannot be marked.`);
      return;
    }

    const type = formData.get('punch_type');
    const data = {
      employee_id: parseInt(formData.get('employee_id') as string),
      time: formData.get('time'),
      date: formData.get('date'),
      is_late: false,
      business_id: user?.business_id
    };

    try {
      const url = type === 'in' ? '/api/attendance/check-in' : '/api/attendance/check-out';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setShowManualPunch(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Error saving attendance");
      }
    } catch (error) {
      console.error("Error manual punch:", error);
    }
  };

  const submitLeaveRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      employee_id: user?.id,
      business_id: user?.business_id,
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      reason: `${formData.get('reason_type')}: ${formData.get('reason_detail')}`,
    };

    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        setShowLeaveModal(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error requesting leave:", error);
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => { 
        setActiveTab(id); 
        if (window.innerWidth < 768) setIsSidebarOpen(false); 
      }}
      className={`flex items-center gap-4 w-full p-4 rounded-xl transition-all ${
        activeTab === id 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      <Icon size={24} />
      <span className="font-semibold text-lg">{label}</span>
    </button>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-emerald-600 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-emerald-700 mb-2">{t.title}</h1>
            <p className="text-slate-500 font-bold">{t.welcome}</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.mobile}</label>
              <input 
                type="text"
                required
                placeholder="Mobile Number"
                value={loginData.mobile}
                onChange={(e) => setLoginData({ ...loginData, mobile: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.password}</label>
              <input 
                type="password"
                required
                placeholder="PIN / Password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.productKey} (Optional for Employees)</label>
              <input 
                type="text"
                placeholder="17-Digit Key (Required for Owners)"
                value={(loginData as any).productKey || ''}
                onChange={(e) => setLoginData({ ...loginData, [ 'productKey' as any]: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-200 hover:bg-emerald-700 active:scale-95 transition-all"
            >
              {t.login}
            </button>
          </form>

          <div className="mt-6 text-center space-y-4">
            <button 
              onClick={() => setShowSignup(true)}
              className="text-emerald-600 font-bold hover:underline"
            >
              {t.noAccount} {t.signup}
            </button>
            
            <button 
              onClick={() => setLang(lang === 'en' ? 'gu' : 'en')}
              className="w-full text-emerald-600 font-bold flex items-center justify-center gap-2"
            >
              <Languages size={20} />
              {t.language}
            </button>
          </div>
        </motion.div>

        {/* Signup Modal */}
        <AnimatePresence>
          {showSignup && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-900/80 backdrop-blur-md overflow-y-auto">
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="bg-white w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl my-8"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-black text-emerald-700">{t.signup}</h2>
                  <button onClick={() => setShowSignup(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24}/></button>
                </div>

                <form onSubmit={handleSignup} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase">{t.name}</label>
                    <input type="text" required value={signupData.name} onChange={e => setSignupData({...signupData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase">{t.businessName}</label>
                    <input type="text" required value={signupData.business_name} onChange={e => setSignupData({...signupData, business_name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase">{t.businessEmail}</label>
                    <input type="email" required value={signupData.email} onChange={e => setSignupData({...signupData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase">{t.mobile}</label>
                    <input type="text" required value={signupData.mobile} onChange={e => setSignupData({...signupData, mobile: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase">{t.password}</label>
                    <input type="password" required value={signupData.password} onChange={e => setSignupData({...signupData, password: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 font-bold outline-none" />
                  </div>
                  
                  <div className="md:col-span-2 space-y-4">
                    <label className="text-sm font-bold text-slate-500 uppercase">{t.selectPlan}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { name: 'Starter', limit: 3, price: t.free },
                        { name: 'Growth', limit: 10, price: 'Rs. 99/mo' },
                        { name: 'Pro', limit: 20, price: 'Rs. 199/mo' }
                      ].map(plan => (
                        <button
                          key={plan.name}
                          type="button"
                          onClick={() => setSignupData({...signupData, plan_name: plan.name, employee_limit: plan.limit})}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${signupData.plan_name === plan.name ? 'border-emerald-600 bg-emerald-50' : 'border-slate-100 hover:border-emerald-200'}`}
                        >
                          <p className="font-black text-emerald-700">{plan.name}</p>
                          <p className="text-xs font-bold text-slate-500">{plan.limit} Employees</p>
                          <p className="text-sm font-black mt-2">{plan.price}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {signupData.plan_name !== 'Starter' && (
                    <div className="md:col-span-2 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-xs font-black text-emerald-800 uppercase mb-3">{t.paymentQR}</p>
                      <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="w-32 h-32 bg-white p-2 rounded-xl border border-emerald-200 flex items-center justify-center">
                          <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=actilo.in@gmail.com&pn=Attendora&am=99&cu=INR" alt="UPI QR" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-emerald-700 leading-relaxed mb-3">
                            {t.paymentInstructions}
                          </p>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setSignupData({...signupData, payment_screenshot: reader.result as string});
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-[10px] font-bold text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-emerald-600 file:text-white hover:file:bg-emerald-700"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="md:col-span-2 pt-4">
                    <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100">
                      Sign Up & Pay
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (user.role === 'employee') {
    const myAttendance = todayAttendance.find(a => a.employee_id === user.id);
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <AnimatePresence>
          {showPinChange && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-900/80 backdrop-blur-md">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
              >
                <h3 className="text-2xl font-black text-emerald-700 mb-2">{t.changePin}</h3>
                <p className="text-slate-500 font-bold mb-6">{t.firstLoginPinChange}</p>
                <form onSubmit={handlePinChange} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.newPin}</label>
                    <input 
                      type="password" 
                      required 
                      value={newPinData.pin}
                      onChange={e => setNewPinData({...newPinData, pin: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.confirmPin}</label>
                    <input 
                      type="password" 
                      required 
                      value={newPinData.confirm}
                      onChange={e => setNewPinData({...newPinData, confirm: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none" 
                    />
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 mt-4">
                    {t.save}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-emerald-700">{t.title}</h1>
            <p className="font-bold text-slate-500">{user.name}</p>
          </div>
          <button onClick={() => setUser(null)} className="p-3 bg-white rounded-2xl text-red-600 shadow-sm">
            <LogOut size={24} />
          </button>
        </header>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 text-center">
            <h2 className="text-xl font-bold mb-6">{t.attendance}</h2>
            
            {!myAttendance ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowCamera(true)}
                    className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${selfie ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}
                  >
                    <Camera size={32} />
                    <span className="font-bold text-sm">{t.takeSelfie}</span>
                  </button>
                  <button 
                    onClick={getGPS}
                    className={`flex-1 p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${location ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}
                  >
                    <MapPin size={32} />
                    <span className="font-bold text-sm">{t.locationAccess}</span>
                  </button>
                </div>
                
                <button 
                  onClick={() => handleCheckIn(user.id, user.shift_start)}
                  className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xl shadow-xl shadow-emerald-100 active:scale-95 transition-all"
                >
                  {t.checkIn}
                </button>
              </div>
            ) : !myAttendance.check_out ? (
              <div className="space-y-4">
                <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-700 font-bold">
                  {t.checkIn}: {myAttendance.check_in}
                </div>
                <button 
                  onClick={() => handleCheckOut(user.id)}
                  className="w-full bg-slate-800 text-white py-6 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all"
                >
                  {t.checkOut}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-100 p-8 rounded-3xl text-emerald-700">
                <CheckCircle2 size={48} className="mx-auto mb-2" />
                <p className="font-black text-lg">{t.onTime}</p>
                <p className="font-bold">{myAttendance.check_in} - {myAttendance.check_out}</p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold mb-4">{t.monthlySummary}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{t.daysPresent}</p>
                <p className="text-lg font-black">{attendanceHistory.filter(r => r.status === 'present').length}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase">{t.hoursWorked}</p>
                <p className="text-lg font-black">{attendanceHistory.reduce((acc, r) => acc + (r.hours || 0), 0).toFixed(1)}h</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold mb-4">{t.leaves}</h3>
            <button 
              onClick={() => setShowLeaveModal(true)}
              className="w-full bg-slate-100 text-slate-700 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 mb-4"
            >
              <Calendar size={20} />
              {t.requestLeave}
            </button>

            <div className="space-y-3">
              {myLeaves.map(leave => (
                <div key={leave.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold">{leave.start_date} {t.to} {leave.end_date}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[150px]">{leave.reason}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                    leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {t[leave.status as keyof typeof t]}
                  </span>
                </div>
              ))}
              {myLeaves.length === 0 && <p className="text-center text-slate-400 text-sm py-4">{t.noRecords}</p>}
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold mb-4">{t.attendance} {t.history}</h3>
            <div className="space-y-3">
              {attendanceHistory.map(rec => (
                <div key={rec.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold">{rec.date}</p>
                    <p className="text-xs text-slate-500">{rec.check_in} - {rec.check_out || '--:--'}</p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                    rec.is_late ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {rec.is_late ? t.late : t.onTime}
                  </span>
                </div>
              ))}
              {attendanceHistory.length === 0 && <p className="text-center text-slate-400 text-sm py-4">{t.noRecords}</p>}
            </div>
          </div>
        </div>

        {lateAlert && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-red-600/90 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white p-8 rounded-[2.5rem] text-center shadow-2xl max-w-sm"
            >
              <XCircle size={64} className="text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-red-600 mb-2">{t.lateAlert}</h2>
              <p className="text-slate-500 font-bold mb-6">{t.checkIn}: {myAttendance?.check_in}</p>
              <button 
                onClick={() => setLateAlert(false)}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black shadow-lg"
              >
                OK
              </button>
            </motion.div>
          </div>
        )}

        {showAddHoliday && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAddHoliday(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-slate-800">{t.addHoliday}</h3>
                <button onClick={() => setShowAddHoliday(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24}/></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const date = formData.get('date') as string;
                const reason = formData.get('reason') as string;
                if (date && reason) {
                  await fetch('/api/holidays', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ business_id: user?.business_id, date, reason })
                  });
                  setShowAddHoliday(false);
                  fetchData();
                }
              }} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.date}</label>
                  <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.holidayReason}</label>
                  <input type="text" name="reason" required placeholder="e.g. Diwali" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddHoliday(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">{t.cancel}</button>
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100">{t.save}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showLeaveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLeaveModal(false)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-emerald-700 mb-6">{t.requestLeave}</h3>
              <form onSubmit={submitLeaveRequest} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.from}</label>
                    <input type="date" name="start_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.to}</label>
                    <input type="date" name="end_date" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.reason}</label>
                  <select name="reason_type" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none">
                    <option value="Medical">{t.medical}</option>
                    <option value="Family">{t.family}</option>
                    <option value="Personal">{t.personal}</option>
                    <option value="Other">{t.other}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.specifyReason}</label>
                  <textarea name="reason_detail" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none h-24" />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowLeaveModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">{t.cancel}</button>
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100">{t.save}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showCamera && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md aspect-square bg-slate-800 rounded-3xl overflow-hidden mb-8">
              {/* Camera view would be here, simulated with captureSelfie */}
            </div>
            <button 
              onClick={captureSelfie}
              className="bg-white text-black p-6 rounded-full shadow-2xl"
            >
              <Camera size={32} />
            </button>
            <button onClick={() => setShowCamera(false)} className="mt-8 text-white font-bold underline">
              {t.cancel}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex overflow-hidden">
      <AnimatePresence>
        {showPinChange && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-emerald-900/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-emerald-700 mb-2">{t.changePin}</h3>
              <p className="text-slate-500 font-bold mb-6">{t.firstLoginPinChange}</p>
              <form onSubmit={handlePinChange} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.newPin}</label>
                  <input 
                    type="password" 
                    required 
                    value={newPinData.pin}
                    onChange={e => setNewPinData({...newPinData, pin: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.confirmPin}</label>
                  <input 
                    type="password" 
                    required 
                    value={newPinData.confirm}
                    onChange={e => setNewPinData({...newPinData, confirm: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-bold outline-none" 
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 mt-4">
                  {t.save}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Sidebar / Desktop Nav */}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isSidebarOpen ? 288 : 0,
          opacity: isSidebarOpen ? 1 : 0,
          x: isSidebarOpen ? 0 : -288
        }}
        className={`
          fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 overflow-hidden
          md:relative md:h-screen md:translate-x-0
        `}
      >
        <div className="w-72 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-black text-emerald-700 tracking-tight">{t.title}</h1>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto">
            {user.role === 'master' ? (
              <NavItem id="master" icon={ShieldCheck} label={t.masterDashboard} />
            ) : (
              <>
                <NavItem id="dashboard" icon={ClipboardCheck} label={t.dashboard} />
                <NavItem id="employees" icon={Users} label={t.employees} />
                <NavItem id="attendance" icon={Clock} label={t.attendance} />
                <div className="relative">
                  <NavItem id="leaves" icon={Calendar} label={t.leaves} />
                  {leaves.filter(l => l.status === 'pending').length > 0 && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {leaves.filter(l => l.status === 'pending').length}
                    </span>
                  )}
                </div>
                <NavItem id="reports" icon={FileText} label={t.reports} />
                <NavItem id="calendar" icon={CalendarIcon} label={t.calendar} />
                <NavItem id="holidays" icon={Palmtree} label={t.holidays} />
                {user.role === 'owner' && <NavItem id="settings" icon={Settings} label={t.settings} />}
              </>
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold uppercase">
                {user.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user.role}</p>
              </div>
            </div>
            
            <button 
              onClick={() => setLang(lang === 'en' ? 'gu' : 'en')}
              className="w-full flex items-center gap-3 p-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all"
            >
              <Languages size={20} />
              <span>{t.language}</span>
            </button>

            <button 
              onClick={() => setUser(null)}
              className="w-full flex items-center gap-3 p-3 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-all"
            >
              <LogOut size={20} />
              <span>{t.login}</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <Menu size={28} />
              </button>
            )}
            <h2 className="text-xl font-black text-slate-800 capitalize">{activeTab}</h2>
          </div>
          
          {user.role === 'owner' && businessInfo && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.selectPlan}</span>
                <span className="text-sm font-black text-emerald-700">{businessInfo.plan_name}</span>
              </div>
              <button 
                onClick={() => setShowPlanModal(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
              >
                {t.upgrade}
              </button>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-wrap">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">{t.totalEmployees}</p>
                  <h2 className="text-4xl font-black text-slate-900">{stats?.totalEmployees || 0}</h2>
                </div>
                <div className="bg-emerald-50 p-6 rounded-3xl shadow-sm border border-emerald-100">
                  <p className="text-emerald-600 text-sm font-medium uppercase tracking-wider mb-1">{t.presentToday}</p>
                  <h2 className="text-4xl font-black text-emerald-700">{stats?.presentToday || 0}</h2>
                </div>
                <div className="bg-red-50 p-6 rounded-3xl shadow-sm border border-red-100">
                  <p className="text-red-600 text-sm font-medium uppercase tracking-wider mb-1">{t.absentToday}</p>
                  <h2 className="text-4xl font-black text-red-700">{stats?.absentToday || 0}</h2>
                </div>
                <div className="bg-amber-50 p-6 rounded-3xl shadow-sm border border-amber-100">
                  <p className="text-amber-600 text-sm font-medium uppercase tracking-wider mb-1">{t.lateToday}</p>
                  <h2 className="text-4xl font-black text-amber-700">{stats?.lateToday || 0}</h2>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-black text-slate-900">{t.monthlySummary}</h3>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <TrendingUp size={24} />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.daysPresent}</p>
                    <p className="text-2xl font-black text-slate-900">{attendanceHistory.filter(r => r.status === 'present').length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.daysAbsent}</p>
                    <p className="text-2xl font-black text-slate-900">{attendanceHistory.filter(r => r.status === 'absent').length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.hoursWorked}</p>
                    <p className="text-2xl font-black text-slate-900">{attendanceHistory.reduce((acc, r) => acc + (r.hours || 0), 0).toFixed(1)}h</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{t.lateDays}</p>
                    <p className="text-2xl font-black text-amber-600">{attendanceHistory.filter(r => r.is_late).length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xl font-bold">{t.attendance} - {new Date().toLocaleDateString()}</h3>
                </div>
                <div className="divide-y divide-slate-100">
                  {employees.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <Users size={48} className="mx-auto mb-4 opacity-20" />
                      <p>{t.noRecords}</p>
                    </div>
                  ) : (
                    employees.map(emp => {
                      const record = todayAttendance.find(a => a.employee_id === emp.id);
                      return (
                        <div key={emp.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-bold text-lg">{emp.name}</p>
                            <p className="text-slate-500 text-sm">{emp.shift_start} - {emp.shift_end}</p>
                          </div>
                          <div className="flex gap-2">
                            {!record ? (
                              <button 
                                onClick={() => handleCheckIn(emp.id, emp.shift_start)}
                                className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-emerald-700 active:scale-95 transition-all"
                              >
                                {t.checkIn}
                              </button>
                            ) : !record.check_out ? (
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${record.is_late ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {record.is_late ? t.late : t.onTime} ({record.check_in})
                                </span>
                                <button 
                                  onClick={() => handleCheckOut(emp.id)}
                                  className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-slate-900 active:scale-95 transition-all"
                                >
                                  {t.checkOut}
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-emerald-600 font-bold">
                                <CheckCircle2 size={20} />
                                <span>{record.check_in} - {record.check_out}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'employees' && (
            <motion.div
              key="employees"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-slate-900">{t.employees}</h2>
                <button 
                  onClick={() => { setEditingEmployee(null); setShowAddEmployee(true); }}
                  className="bg-emerald-600 text-white p-4 rounded-2xl shadow-lg shadow-emerald-200 flex items-center gap-2 font-bold hover:bg-emerald-700 transition-all"
                >
                  <Plus size={24} />
                  <span className="hidden sm:inline">{t.addEmployee}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {employees.map(emp => (
                  <div key={emp.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-900">{emp.name}</h3>
                        <p className="text-slate-500 font-medium">{emp.mobile}</p>
                        <p className="text-xs text-emerald-600 font-bold">PW: {emp.password || '123456'}</p>
                      </div>
                      <div className="flex gap-2">
                        {user.role === 'owner' && !emp.is_approved && (
                          <button 
                            onClick={async () => {
                              await fetch(`/api/employees/${emp.id}/approve`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: true })
                              });
                              fetchData();
                            }}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                            title="Approve Employee"
                          >
                            <CheckCircle2 size={20} />
                            Approve
                          </button>
                        )}
                        <button 
                          onClick={() => { setEditingEmployee(emp); setShowAddEmployee(true); }}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={20} />
                        </button>
                        <button 
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-slate-50">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t.salary}</span>
                        <span className="font-bold text-slate-900">₹{emp.salary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t.shiftStart}</span>
                        <span className="font-bold text-slate-900">{emp.shift_start}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">{t.shiftEnd}</span>
                        <span className="font-bold text-slate-900">{emp.shift_end}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'attendance' && (
            <motion.div
              key="attendance"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-slate-900">{t.attendance} {t.history}</h2>
                <button 
                  onClick={() => setShowManualPunch(true)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:bg-emerald-700 transition-all"
                >
                  <Plus size={20} />
                  {t.manualPunch}
                </button>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex gap-4 mb-6">
                  <select 
                    value={historyFilter.month}
                    onChange={(e) => setHistoryFilter({ ...historyFilter, month: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold outline-none"
                  >
                    <option value="01">January</option>
                    <option value="02">February</option>
                    <option value="03">March</option>
                    <option value="04">April</option>
                    <option value="05">May</option>
                    <option value="06">June</option>
                    <option value="07">July</option>
                    <option value="08">August</option>
                    <option value="09">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                  </select>
                  <button onClick={fetchData} className="bg-slate-800 text-white px-6 py-2 rounded-xl font-bold">Filter</button>
                </div>

                <div className="table-container">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-xs uppercase tracking-wider">
                        <th className="pb-4 font-medium">{t.date}</th>
                        <th className="pb-4 font-medium">{t.name}</th>
                        <th className="pb-4 font-medium">{t.checkIn}</th>
                        <th className="pb-4 font-medium">{t.checkOut}</th>
                        <th className="pb-4 font-medium">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attendanceHistory.map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 font-medium text-slate-600">{rec.date}</td>
                          <td className="py-4 font-bold text-slate-900">{rec.name}</td>
                          <td className="py-4 font-bold text-emerald-600">{rec.check_in || '-'}</td>
                          <td className="py-4 font-bold text-slate-800">{rec.check_out || '-'}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${rec.is_late ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {rec.is_late ? t.late : t.onTime}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'leaves' && (
            <motion.div
              key="leaves"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-black text-slate-900">{t.leaveRequests}</h2>
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {leaves.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                      <p>{t.noRecords}</p>
                    </div>
                  ) : (
                    leaves.map(leave => (
                      <div key={leave.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold text-lg">{leave.name}</h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                              leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                              leave.status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {t[leave.status as keyof typeof t]}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium">{leave.start_date} to {leave.end_date}</p>
                          <p className="text-slate-400 text-sm mt-1 italic">"{leave.reason}"</p>
                        </div>
                        {leave.status === 'pending' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => handleLeaveStatus(leave.id, 'approved')}
                              className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold shadow-md hover:bg-emerald-700 transition-all"
                            >
                              {t.approve}
                            </button>
                            <button 
                              onClick={() => handleLeaveStatus(leave.id, 'rejected')}
                              className="flex-1 sm:flex-none bg-white text-red-600 border border-red-200 px-6 py-2 rounded-xl font-bold hover:bg-red-50 transition-all"
                            >
                              {t.reject}
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-black text-slate-900">{t.reports}</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const text = `*${settings.business_name} Attendance Report*\nMonth: ${historyFilter.month}/${historyFilter.year}\n\n` +
                        attendanceHistory.map(r => `• ${r.date}: ${r.name} (${r.check_in || '-'}/${r.check_out || '-'})`).join('\n');
                      const url = `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(text)}`;
                      window.open(url, '_blank');
                    }}
                    className="bg-emerald-500 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:bg-emerald-600 transition-all"
                  >
                    <Share2 size={20} />
                    {t.whatsappExport}
                  </button>
                  <button 
                    onClick={exportPDF}
                    className="bg-slate-800 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-bold hover:bg-slate-900 transition-all"
                  >
                    <Download size={20} />
                    {t.export}
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex flex-wrap gap-4 mb-8">
                  <select 
                    value={historyFilter.month}
                    onChange={(e) => setHistoryFilter({ ...historyFilter, month: e.target.value })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map(m => (
                      <option key={m} value={m}>{new Date(2026, parseInt(m)-1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                  </select>
                </div>

                <div className="table-container">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-sm uppercase tracking-wider">
                        <th className="pb-4 font-medium">{t.name}</th>
                        <th className="pb-4 font-medium">{t.date}</th>
                        <th className="pb-4 font-medium">{t.selfie}</th>
                        <th className="pb-4 font-medium">{t.location}</th>
                        <th className="pb-4 font-medium">{t.payableSalary}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attendanceHistory.map((rec) => (
                        <tr key={rec.id} className="group hover:bg-slate-50 transition-colors">
                          <td className="py-4 font-bold text-slate-900">{rec.name}</td>
                          <td className="py-4 font-bold text-slate-600">{rec.date}</td>
                          <td className="py-4">
                            {rec.selfie_url ? (
                              <img src={rec.selfie_url} className="w-10 h-10 rounded-lg object-cover border border-slate-200" referrerPolicy="no-referrer" />
                            ) : '-'}
                          </td>
                          <td className="py-4">
                            {rec.latitude ? (
                              <a 
                                href={`https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`} 
                                target="_blank" 
                                className="text-emerald-600 flex items-center gap-1 hover:underline text-xs font-bold"
                              >
                                <MapPin size={14} />
                                {Math.round(rec.distance_from_office || 0)}m
                              </a>
                            ) : '-'}
                          </td>
                          <td className="py-4 font-black text-emerald-700">
                            <div className="flex items-center gap-2">
                              ₹{((rec.hours || 0) * (employees.find(e => e.id === rec.employee_id)?.salary || 0) / 160).toFixed(0)}
                              {(user?.role === 'owner' || user?.role === 'sub-admin') && (
                                <button 
                                  onClick={() => setEditingAttendance(rec)}
                                  className="p-1 text-slate-400 hover:text-emerald-600 transition-colors"
                                >
                                  <Edit2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {attendanceHistory.length === 0 && (
                    <div className="text-center py-12">
                      <FileText size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold">{t.noRecords}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-black text-slate-900">{t.settings}</h2>
              <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                <form 
                  key={JSON.stringify(settings)}
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const data = { ...Object.fromEntries(formData.entries()), business_id: user?.business_id };
                    const res = await fetch('/api/settings', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data)
                    });
                    if (res.ok) {
                      alert("Settings saved successfully!");
                      fetchData();
                    }
                  }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.businessName}</label>
                      <input name="business_name" defaultValue={settings.business_name} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.whatsappNumber}</label>
                      <input name="whatsapp_number" defaultValue={settings.whatsapp_number} placeholder="e.g. 919876543210" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.salaryRule}</label>
                      <select name="salary_rule" defaultValue={settings.salary_rule} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                        <option value="monthly">{t.monthly}</option>
                        <option value="hourly">{t.hourly}</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.latePenalty}</label>
                      <input name="late_penalty" type="number" defaultValue={settings.late_penalty} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <h4 className="text-lg font-black text-emerald-700 mb-6 flex items-center gap-2">
                      <MapPin size={24} />
                      {t.officeLocation}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Latitude</label>
                        <input 
                          name="office_lat" 
                          type="number" 
                          step="any"
                          defaultValue={businessInfo?.office_lat} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Longitude</label>
                        <input 
                          name="office_lng" 
                          type="number" 
                          step="any"
                          defaultValue={businessInfo?.office_lng} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">{t.geofenceRadius}</label>
                        <input 
                          name="geofence_radius" 
                          type="number" 
                          defaultValue={businessInfo?.geofence_radius || 100} 
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none" 
                        />
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          const lat = pos.coords.latitude;
                          const lng = pos.coords.longitude;
                          fetch('/api/business/update-geofence', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ business_id: user?.business_id, lat, lng, radius: 100 })
                          }).then(() => {
                            alert("Office location set to your current position!");
                            fetchData();
                          });
                        });
                      }}
                      className="mt-4 text-emerald-600 font-bold flex items-center gap-2 hover:underline"
                    >
                      <MapPin size={18} />
                      {t.setOfficeLocation}
                    </button>
                  </div>

                  <div className="pt-8 border-t border-slate-100 flex gap-4">
                    <button type="submit" className="bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all">
                      {t.save}
                    </button>
                    <a 
                      href="/api/backup" 
                      className="bg-slate-100 text-slate-700 px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all"
                    >
                      <Database size={20} />
                      {t.backup}
                    </a>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
          {activeTab === 'master' && (
            <motion.div
              key="master"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">{t.masterDashboard}</h2>
                  <p className="text-slate-500 font-bold">Developer Dashboard - Default Credentials: admin@attendora.com / masteradmin</p>
                </div>
                <button 
                  onClick={() => setShowAddBusiness(true)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 flex items-center gap-2"
                >
                  <Plus size={20} />
                  {t.addBusiness}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{t.totalBusinesses}</p>
                  <h3 className="text-4xl font-black text-slate-900">{masterStats?.totalBusinesses || 0}</h3>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{t.activeBusinesses}</p>
                  <h3 className="text-4xl font-black text-emerald-600">{masterStats?.activeBusinesses || 0}</h3>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{t.adminCount}</p>
                  <h3 className="text-4xl font-black text-blue-600">{masterStats?.adminCount || 0}</h3>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">{t.totalEmployees}</p>
                  <h3 className="text-4xl font-black text-slate-900">{masterStats?.totalEmployees || 0}</h3>
                </div>
              </div>

              <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-8 border-b border-slate-100">
                  <h3 className="text-xl font-black text-slate-900">{t.businessList}</h3>
                </div>
                <div className="table-container">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <tr>
                        <th className="px-8 py-4">{t.businessName}</th>
                        <th className="px-8 py-4">{t.owner}</th>
                        <th className="px-8 py-4">Plan</th>
                        <th className="px-8 py-4">Employees</th>
                        <th className="px-8 py-4">{t.activationKey}</th>
                        <th className="px-8 py-4">{t.status}</th>
                        <th className="px-8 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {businesses.map(biz => (
                        <tr key={biz.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-8 py-6 font-bold text-slate-900">{biz.name}</td>
                          <td className="px-8 py-6">
                            <p className="font-bold text-slate-900">{biz.owner_name}</p>
                            <p className="text-xs text-slate-500">{biz.owner_mobile}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-black uppercase">
                              {biz.plan_name}
                            </span>
                          </td>
                          <td className="px-8 py-6 font-bold text-slate-600">{biz.employee_count} / {biz.employee_limit}</td>
                          <td className="px-8 py-6 font-mono text-xs font-bold text-slate-500">{biz.activation_key}</td>
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${biz.status === 'active' ? 'bg-emerald-100 text-emerald-700' : (biz.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}`}>
                                {biz.status === 'active' ? t.active : (biz.status === 'pending' ? t.pending : t.inactive)}
                              </span>
                              {biz.payment_screenshot && (
                                <button 
                                  onClick={() => window.open(biz.payment_screenshot, '_blank')}
                                  className="text-blue-600 hover:underline text-[10px] font-bold uppercase"
                                >
                                  View Payment
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex gap-2">
                              {biz.status === 'pending' && (
                                <button 
                                  onClick={async () => {
                                    await fetch('/api/master/approve-business', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ business_id: biz.id, status: 'active' })
                                    });
                                    fetchData();
                                  }}
                                  className="bg-emerald-600 text-white px-3 py-1 rounded-lg font-bold text-[10px] uppercase"
                                >
                                  {t.approve}
                                </button>
                              )}
                              <button 
                                onClick={async () => {
                                  const res = await fetch('/api/master/regenerate-key', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ business_id: biz.id })
                                  });
                                  const { key } = await res.json();
                                  alert(`${t.regenerateKey}: ${key}`);
                                  fetchData();
                                }}
                                className="text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase"
                              >
                                {t.regenerateKey}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
            {activeTab === 'holidays' && (
              <motion.div
                key="holidays"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-black text-slate-900">{t.holidays}</h3>
                  {user.role === 'owner' && (
                    <button 
                      onClick={() => setShowAddHoliday(true)}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-emerald-100"
                    >
                      <Plus size={20} />
                      {t.addHoliday}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {holidays.map(h => (
                    <div key={h.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center">
                      <div>
                        <p className="text-lg font-black text-slate-900">{h.date}</p>
                        <p className="text-slate-500 font-bold">{h.reason}</p>
                      </div>
                      {user.role === 'owner' && (
                        <button 
                          onClick={() => {
                            if (confirm(t.confirmDeleteHoliday)) {
                              fetch(`/api/holidays/${h.id}`, { method: 'DELETE' }).then(() => fetchData());
                            }
                          }}
                          className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>
                  ))}
                  {holidays.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <Palmtree size={64} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold">{t.noRecords}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div
                key="calendar"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100"
              >
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-black text-slate-900">{t.calendar}</h3>
                  <div className="flex flex-wrap items-center gap-4">
                    {user.role === 'owner' && (
                      <select 
                        value={selectedEmployeeId || ''}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          setSelectedEmployeeId(val);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold outline-none text-sm"
                      >
                        <option value="">All Employees</option>
                        {employees.map(e => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const prev = new Date(Number(historyFilter.year), Number(historyFilter.month) - 2, 1);
                        setHistoryFilter({ month: String(prev.getMonth() + 1).padStart(2, '0'), year: String(prev.getFullYear()) });
                      }}
                      className="p-3 hover:bg-slate-100 rounded-xl"
                    >
                      <PrevIcon size={24} />
                    </button>
                    <span className="text-lg font-black text-emerald-700">
                      {new Date(Number(historyFilter.year), Number(historyFilter.month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      onClick={() => {
                        const next = new Date(Number(historyFilter.year), Number(historyFilter.month), 1);
                        setHistoryFilter({ month: String(next.getMonth() + 1).padStart(2, '0'), year: String(next.getFullYear()) });
                      }}
                      className="p-3 hover:bg-slate-100 rounded-xl"
                    >
                      <NextIcon size={24} />
                    </button>
                  </div>
                </div>
              </div>

                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="text-center text-xs font-black text-slate-400 uppercase py-2">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: new Date(Number(historyFilter.year), Number(historyFilter.month) - 1, 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square"></div>
                  ))}
                  {Array.from({ length: new Date(Number(historyFilter.year), Number(historyFilter.month), 0).getDate() }).map((_, i) => {
                    const day = i + 1;
                    const dateStr = `${historyFilter.year}-${historyFilter.month}-${String(day).padStart(2, '0')}`;
                    const record = attendanceHistory.find(r => r.date === dateStr);
                    const holiday = holidays.find(h => h.date === dateStr);
                    
                    return (
                      <div 
                        key={day} 
                        className={`aspect-square rounded-2xl border flex flex-col items-center justify-center relative transition-all ${
                          holiday ? 'bg-amber-50 border-amber-200' :
                          record?.status === 'present' ? 'bg-emerald-50 border-emerald-200' :
                          record?.status === 'absent' ? 'bg-red-50 border-red-200' :
                          record?.status === 'leave' ? 'bg-blue-50 border-blue-200' :
                          'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <span className="text-sm font-black">{day}</span>
                        {holiday && <span className="text-[8px] font-bold text-amber-600 truncate w-full text-center px-1">{holiday.reason}</span>}
                        {record?.check_in && <span className="text-[8px] font-bold text-emerald-600">{record.check_in}</span>}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Plan Selection Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPlanModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden p-8 md:p-12"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl font-black text-slate-900 mb-4">{t.selectPlan}</h2>
                <p className="text-slate-500 font-bold">Choose the best plan for your growing business</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Starter Plan */}
                <div className={`p-8 rounded-[2.5rem] border-2 transition-all ${businessInfo?.plan_name === 'Starter' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}>
                  <h3 className="text-xl font-black text-slate-900 mb-2">{t.starterPlan}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-black text-emerald-600">{t.free}</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      {t.upTo3}
                    </li>
                    <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      Basic Reports
                    </li>
                  </ul>
                  <button 
                    disabled={businessInfo?.plan_name === 'Starter'}
                    onClick={async () => {
                      await fetch('/api/business/select-plan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ business_id: user?.business_id, plan_name: 'Starter', employee_limit: 3 })
                      });
                      setShowPlanModal(false);
                      fetchData();
                    }}
                    className={`w-full py-4 rounded-2xl font-black transition-all ${businessInfo?.plan_name === 'Starter' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                  >
                    {businessInfo?.plan_name === 'Starter' ? 'Current Plan' : 'Select Plan'}
                  </button>
                </div>

                {/* Growth Plan */}
                <div className={`p-8 rounded-[2.5rem] border-2 transition-all relative ${businessInfo?.plan_name === 'Growth' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}>
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Popular</div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">{t.growthPlan}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-black text-emerald-600">₹99</span>
                    <span className="text-slate-400 font-bold">/mo</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      {t.upTo10}
                    </li>
                    <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      Advanced Reports
                    </li>
                  </ul>
                  <button 
                    disabled={businessInfo?.plan_name === 'Growth'}
                    onClick={async () => {
                      await fetch('/api/business/select-plan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ business_id: user?.business_id, plan_name: 'Growth', employee_limit: 10 })
                      });
                      setShowPlanModal(false);
                      fetchData();
                    }}
                    className={`w-full py-4 rounded-2xl font-black transition-all ${businessInfo?.plan_name === 'Growth' ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100'}`}
                  >
                    {businessInfo?.plan_name === 'Growth' ? 'Current Plan' : 'Select Plan'}
                  </button>
                </div>

                {/* Pro Plan */}
                <div className={`p-8 rounded-[2.5rem] border-2 transition-all ${businessInfo?.plan_name === 'Pro' ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-100 bg-white'}`}>
                  <h3 className="text-xl font-black text-slate-900 mb-2">{t.proPlan}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-black text-emerald-600">₹199</span>
                    <span className="text-slate-400 font-bold">/mo</span>
                  </div>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      {t.upTo20}
                    </li>
                    <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                      <CheckCircle2 size={18} className="text-emerald-500" />
                      Priority Support
                    </li>
                  </ul>
                  <button 
                    disabled={businessInfo?.plan_name === 'Pro'}
                    onClick={async () => {
                      await fetch('/api/business/select-plan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ business_id: user?.business_id, plan_name: 'Pro', employee_limit: 20 })
                      });
                      setShowPlanModal(false);
                      fetchData();
                    }}
                    className={`w-full py-4 rounded-2xl font-black transition-all ${businessInfo?.plan_name === 'Pro' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                  >
                    {businessInfo?.plan_name === 'Pro' ? 'Current Plan' : 'Select Plan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add/Edit Employee Modal */}
      <AnimatePresence>
        {showAddEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddEmployee(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-emerald-700 mb-6">{editingEmployee ? t.editEmployee : t.addEmployee}</h3>
              <form onSubmit={handleSaveEmployee} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.name}</label>
                  <input name="name" defaultValue={editingEmployee?.name} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.mobile}</label>
                  <input name="mobile" defaultValue={editingEmployee?.mobile} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.password}</label>
                  <input name="password" type="text" defaultValue={editingEmployee?.password || '123456'} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.role}</label>
                  <select name="role" defaultValue={editingEmployee?.role || 'employee'} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="employee">{t.employee}</option>
                    <option value="sub-admin">{t.subAdmin}</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.salary}</label>
                  <input name="salary" type="number" defaultValue={editingEmployee?.salary} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.shiftStart}</label>
                    <input name="shift_start" type="time" defaultValue={editingEmployee?.shift_start || '09:00'} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.shiftEnd}</label>
                    <input name="shift_end" type="time" defaultValue={editingEmployee?.shift_end || '18:00'} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddEmployee(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">{t.cancel}</button>
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100">{t.save}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Punch Modal */}
      <AnimatePresence>
        {showManualPunch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManualPunch(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-emerald-700 mb-6">{t.manualPunch}</h3>
              <form onSubmit={handleManualPunch} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.employees}</label>
                  <select name="employee_id" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.date}</label>
                    <input name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.time}</label>
                    <input name="time" type="time" defaultValue={new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.status}</label>
                  <select name="punch_type" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="in">{t.checkIn}</option>
                    <option value="out">{t.checkOut}</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowManualPunch(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">{t.cancel}</button>
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100">{t.save}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Attendance Modal */}
      <AnimatePresence>
        {editingAttendance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingAttendance(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-emerald-700 mb-6">{t.editAttendance}</h3>
              <form onSubmit={handleSaveAttendance} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.checkInTime}</label>
                    <input name="check_in" type="time" defaultValue={editingAttendance.check_in || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.checkOutTime}</label>
                    <input name="check_out" type="time" defaultValue={editingAttendance.check_out || ''} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.status}</label>
                  <select name="status" defaultValue={editingAttendance.status} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="present">{t.presentToday}</option>
                    <option value="absent">{t.absentToday}</option>
                    <option value="leave">{t.leaves}</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <input name="is_late" type="checkbox" defaultChecked={editingAttendance.is_late} className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                  <label className="text-sm font-bold text-slate-700">{t.isLate}</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setEditingAttendance(null)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">{t.cancel}</button>
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100">{t.save}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Business Modal (Master Admin) */}
      <AnimatePresence>
        {showAddBusiness && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddBusiness(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-emerald-700 mb-6">{t.addBusiness}</h3>
              <form onSubmit={handleAddBusiness} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.businessName}</label>
                  <input name="name" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.businessEmail}</label>
                  <input name="email" type="email" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.ownerName}</label>
                  <input name="owner_name" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.ownerMobile}</label>
                    <input name="owner_mobile" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.ownerPassword}</label>
                    <input name="owner_password" type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Plan</label>
                    <select name="plan_name" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="Starter">Starter</option>
                      <option value="Growth">Growth</option>
                      <option value="Pro">Pro</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Limit</label>
                    <input name="employee_limit" type="number" defaultValue={3} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAddBusiness(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold">{t.cancel}</button>
                  <button type="submit" className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100">{t.save}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
