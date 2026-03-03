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
  Database
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
  const [loginData, setLoginData] = useState({ mobile: '', password: '' });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'attendance' | 'reports' | 'leaves'>('dashboard');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
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
  }, [activeTab, user]);

  const fetchData = async () => {
    try {
      const [empRes, statsRes, attRes, leaveRes, settingsRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/stats'),
        fetch('/api/attendance/today'),
        fetch(`/api/leaves${user?.role === 'employee' ? `?employee_id=${user.id}` : ''}`),
        fetch('/api/settings')
      ]);
      
      setEmployees(await empRes.json());
      setStats(await statsRes.json());
      setTodayAttendance(await attRes.json());
      setSettings(await settingsRes.json());
      const leaveData = await leaveRes.json();
      if (user?.role === 'employee') {
        setMyLeaves(leaveData);
      } else {
        setLeaves(leaveData);
      }

      // Fetch history
      if (user?.role === 'employee' || activeTab === 'attendance') {
        const histRes = await fetch(`/api/attendance/report?year=${historyFilter.year}&month=${historyFilter.month}${user?.role === 'employee' ? `&employee_id=${user.id}` : ''}`);
        setAttendanceHistory(await histRes.json());
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      } else {
        alert("Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
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
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          employee_id: employeeId, 
          time, 
          is_late: isLate,
          latitude: location.lat,
          longitude: location.lng,
          selfie_url: selfie
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
      const res = await fetch(`/api/attendance/report?year=${year}&month=${month}`);
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
      salary: parseFloat(formData.get('salary') as string),
      shift_start: formData.get('shift_start'),
      shift_end: formData.get('shift_end'),
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
    const type = formData.get('punch_type');
    const data = {
      employee_id: parseInt(formData.get('employee_id') as string),
      time: formData.get('time'),
      date: formData.get('date'),
      is_late: false // Admin manual punch is usually considered on-time or handled manually
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
      onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
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
            <p className="text-xs text-slate-400 text-center bg-slate-50 p-2 rounded-lg">
              {lang === 'en' ? 'Employees: Use your mobile number to login.' : 'કર્મચારીઓ: લોગિન કરવા માટે તમારા મોબાઈલ નંબરનો ઉપયોગ કરો.'}
            </p>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.mobile}</label>
              <input 
                type="text"
                required
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
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
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
          <button 
            onClick={() => setLang(lang === 'en' ? 'gu' : 'en')}
            className="w-full mt-6 text-emerald-600 font-bold flex items-center justify-center gap-2"
          >
            <Languages size={20} />
            {t.language}
          </button>
        </motion.div>
      </div>
    );
  }

  if (user.role === 'employee') {
    const myAttendance = todayAttendance.find(a => a.employee_id === user.id);
    return (
      <div className="min-h-screen bg-slate-50 p-4">
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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 md:pb-0">
      {/* Mobile Header */}
      <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30 md:hidden">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
          <Menu size={28} />
        </button>
        <h1 className="text-xl font-bold text-emerald-700">{t.title}</h1>
        <button 
          onClick={() => setLang(lang === 'en' ? 'gu' : 'en')}
          className="flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm font-medium"
        >
          <Languages size={16} />
          {t.language}
        </button>
      </header>

      {/* Sidebar / Desktop Nav */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:h-screen
      `}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-black text-emerald-700 tracking-tight">{t.title}</h1>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
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
            {user.role === 'owner' && <NavItem id="settings" icon={Settings} label={t.settings} />}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <button 
              onClick={() => setLang(lang === 'en' ? 'gu' : 'en')}
              className="flex items-center gap-3 w-full p-4 rounded-xl text-slate-600 hover:bg-slate-100 mb-2 hidden md:flex"
            >
              <Languages size={24} />
              <span className="font-semibold">{t.language}</span>
            </button>
            <button 
              onClick={() => setUser(null)}
              className="flex items-center gap-3 w-full p-4 rounded-xl text-red-600 hover:bg-red-50"
            >
              <LogOut size={24} />
              <span className="font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

                <div className="overflow-x-auto">
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
                  <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option>March 2026</option>
                    <option>February 2026</option>
                  </select>
                  <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold focus:ring-2 focus:ring-emerald-500 outline-none">
                    <option>All Employees</option>
                    {employees.map(e => <option key={e.id}>{e.name}</option>)}
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-sm uppercase tracking-wider">
                        <th className="pb-4 font-medium">{t.name}</th>
                        <th className="pb-4 font-medium">{t.daysPresent}</th>
                        <th className="pb-4 font-medium">{t.hoursWorked}</th>
                        <th className="pb-4 font-medium">{t.lateDays}</th>
                        <th className="pb-4 font-medium">{t.payableSalary}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {employees.map(emp => {
                        const empRecords = attendanceHistory.filter(r => r.employee_id === emp.id);
                        const present = empRecords.filter(r => r.status === 'present').length;
                        const hours = empRecords.reduce((acc, r) => acc + (r.hours || 0), 0);
                        const late = empRecords.filter(r => r.is_late).length;
                        const penalty = late * (parseInt(settings.late_penalty) || 0);
                        const payable = settings.salary_rule === 'hourly' 
                          ? (hours * emp.salary) - penalty 
                          : ((emp.salary / 30) * present) - penalty;

                        return (
                          <tr key={emp.id} className="group hover:bg-slate-50 transition-colors">
                            <td className="py-4 font-bold text-slate-900">{emp.name}</td>
                            <td className="py-4 font-bold text-slate-600">{present}</td>
                            <td className="py-4 font-bold text-slate-600">{hours.toFixed(1)}h</td>
                            <td className="py-4 font-bold text-amber-600">{late}</td>
                            <td className="py-4 font-black text-emerald-700">₹{Math.max(0, payable).toFixed(0)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const data = Object.fromEntries(formData.entries());
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
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.businessName}</label>
                      <input name="business_name" defaultValue={settings.business_name} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.employeeLimit}</label>
                      <input name="employee_limit" type="number" defaultValue={settings.employee_limit} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
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
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.whatsappNumber}</label>
                      <input name="whatsapp_number" defaultValue={settings.whatsapp_number} placeholder="e.g. 919876543210" className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </div>
                  <div className="pt-6 border-t border-slate-100 flex gap-4">
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
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex justify-around p-2 md:hidden z-30">
        <button onClick={() => setActiveTab('dashboard')} className={`p-3 rounded-2xl flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
          <ClipboardCheck size={24} />
          <span className="text-[10px] font-bold uppercase">{t.dashboard}</span>
        </button>
        <button onClick={() => setActiveTab('employees')} className={`p-3 rounded-2xl flex flex-col items-center gap-1 ${activeTab === 'employees' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
          <Users size={24} />
          <span className="text-[10px] font-bold uppercase">{t.employees}</span>
        </button>
        <button onClick={() => setActiveTab('attendance')} className={`p-3 rounded-2xl flex flex-col items-center gap-1 ${activeTab === 'attendance' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
          <Clock size={24} />
          <span className="text-[10px] font-bold uppercase">{t.attendance}</span>
        </button>
        <button onClick={() => setActiveTab('reports')} className={`p-3 rounded-2xl flex flex-col items-center gap-1 ${activeTab === 'reports' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400'}`}>
          <FileText size={24} />
          <span className="text-[10px] font-bold uppercase">{t.reports}</span>
        </button>
      </nav>

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
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-emerald-700 mb-6">{t.manualPunch}</h3>
              <form onSubmit={handleManualPunch} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.employees}</label>
                  <select name="employee_id" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none">
                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.date}</label>
                  <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">{t.time}</label>
                    <input type="time" name="time" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Type</label>
                    <select name="punch_type" required className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-bold outline-none">
                      <option value="in">{t.checkIn}</option>
                      <option value="out">{t.checkOut}</option>
                    </select>
                  </div>
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
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-black text-slate-900">{editingEmployee ? t.editEmployee : t.addEmployee}</h3>
                  <button onClick={() => setShowAddEmployee(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleSaveEmployee} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.name}</label>
                    <input 
                      name="name" 
                      required 
                      defaultValue={editingEmployee?.name}
                      placeholder="e.g. Ramesh Patel"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.mobile}</label>
                    <input 
                      name="mobile" 
                      required 
                      defaultValue={editingEmployee?.mobile}
                      placeholder="9876543210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.password}</label>
                    <input 
                      name="password" 
                      type="password"
                      required 
                      defaultValue={editingEmployee?.password}
                      placeholder="******"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.role}</label>
                    <select 
                      name="role" 
                      required 
                      defaultValue={editingEmployee?.role || 'employee'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    >
                      <option value="employee">{t.employee}</option>
                      <option value="sub-admin">{t.subAdmin}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.salary}</label>
                    <input 
                      name="salary" 
                      type="number" 
                      required 
                      defaultValue={editingEmployee?.salary}
                      placeholder="15000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.shiftStart}</label>
                      <input 
                        name="shift_start" 
                        type="time" 
                        required 
                        defaultValue={editingEmployee?.shift_start || "09:00"}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">{t.shiftEnd}</label>
                      <input 
                        name="shift_end" 
                        type="time" 
                        required 
                        defaultValue={editingEmployee?.shift_end || "18:00"}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 font-bold focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowAddEmployee(false)}
                      className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                    >
                      {t.cancel}
                    </button>
                    <button 
                      type="submit"
                      className="flex-2 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
                    >
                      {t.save}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
