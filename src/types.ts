export type Language = 'en' | 'gu';
export type UserRole = 'owner' | 'sub-admin' | 'employee';

export interface Employee {
  id: number;
  name: string;
  mobile: string;
  password?: string;
  role: UserRole;
  salary: number;
  shift_start: string;
  shift_end: string;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  name: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  is_late: boolean;
  status: 'present' | 'absent' | 'leave';
  latitude?: number;
  longitude?: number;
  selfie_url?: string;
  hours?: number;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  name: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
}

export const translations = {
  en: {
    title: "Attendora",
    dashboard: "Dashboard",
    employees: "Employees",
    attendance: "Attendance",
    reports: "Reports",
    leaves: "Leaves",
    totalEmployees: "Total Employees",
    presentToday: "Present Today",
    absentToday: "Absent Today",
    lateToday: "Late Today",
    addEmployee: "Add Employee",
    editEmployee: "Edit Employee",
    name: "Name",
    mobile: "Mobile Number",
    password: "Password",
    role: "Role",
    salary: "Monthly Salary",
    shiftStart: "Shift Start",
    shiftEnd: "Shift End",
    save: "Save",
    cancel: "Cancel",
    checkIn: "Check In",
    checkOut: "Check Out",
    late: "Late",
    onTime: "On Time",
    status: "Status",
    date: "Date",
    time: "Time",
    salaryReport: "Salary Report",
    calculateSalary: "Calculate Salary",
    payableSalary: "Payable Salary",
    leaveRequests: "Leave Requests",
    approve: "Approve",
    reject: "Reject",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    reason: "Reason",
    startDate: "Start Date",
    endDate: "End Date",
    requestLeave: "Request Leave",
    language: "ગુજરાતી",
    export: "Export PDF",
    noRecords: "No records found",
    confirmDelete: "Are you sure you want to delete this employee?",
    delete: "Delete",
    login: "Login",
    welcome: "Welcome Back",
    employeeApp: "Employee Portal",
    takeSelfie: "Take Selfie",
    locationAccess: "Allow Location Access",
    gpsRequired: "GPS location is required for attendance",
    selfieRequired: "Selfie is required for attendance",
    subAdmin: "Sub Admin",
    employee: "Employee",
    owner: "Owner",
    medical: "Medical",
    family: "Family",
    personal: "Personal",
    other: "Other",
    specifyReason: "Specify Reason",
    lateAlert: "You are late today!",
    manualPunch: "Manual Punch",
    history: "History",
    from: "From",
    to: "To",
    settings: "Settings",
    businessName: "Business Name",
    employeeLimit: "Employee Limit",
    salaryRule: "Salary Rule",
    latePenalty: "Late Penalty",
    whatsappNumber: "WhatsApp Number",
    backup: "Backup Database",
    monthlySummary: "Monthly Summary",
    hoursWorked: "Hours Worked",
    totalSalary: "Total Salary",
    daysPresent: "Days Present",
    daysAbsent: "Days Absent",
    lateDays: "Late Days",
    whatsappExport: "Share on WhatsApp",
    monthly: "Monthly",
    hourly: "Hourly",
    salarySummary: "Salary Summary"
  },
  gu: {
    title: "Attendora",
    dashboard: "ડેશબોર્ડ",
    employees: "કર્મચારીઓ",
    attendance: "હાજરી",
    reports: "રિપોર્ટ્સ",
    leaves: "રજાઓ",
    totalEmployees: "કુલ કર્મચારીઓ",
    presentToday: "આજે હાજર",
    absentToday: "આજે ગેરહાજર",
    lateToday: "આજે મોડા",
    addEmployee: "કર્મચારી ઉમેરો",
    editEmployee: "કર્મચારી સુધારો",
    name: "નામ",
    mobile: "મોબાઇલ નંબર",
    password: "પાસવર્ડ",
    role: "ભૂમિકા",
    salary: "માસિક પગાર",
    shiftStart: "શિફ્ટ શરૂઆત",
    shiftEnd: "શિફ્ટ અંત",
    save: "સાચવો",
    cancel: "રદ કરો",
    checkIn: "હાજરી પૂરો",
    checkOut: "છૂટવાનો સમય",
    late: "મોડા",
    onTime: "સમયસર",
    status: "સ્થિતિ",
    date: "તારીખ",
    time: "સમય",
    salaryReport: "પગાર રિપોર્ટ",
    calculateSalary: "પગાર ગણતરી",
    payableSalary: "ચૂકવવાપાત્ર પગાર",
    leaveRequests: "રજાની વિનંતીઓ",
    approve: "મંજૂર કરો",
    reject: "નામંજૂર કરો",
    pending: "બાકી",
    approved: "મંજૂર",
    rejected: "નામંજૂર",
    reason: "કારણ",
    startDate: "શરૂઆતની તારીખ",
    endDate: "અંતની તારીખ",
    requestLeave: "રજા માંગો",
    language: "English",
    export: "PDF ડાઉનલોડ",
    noRecords: "કોઈ રેકોર્ડ મળ્યા નથી",
    confirmDelete: "શું તમે ખરેખર આ કર્મચારીને કાઢી નાખવા માંગો છો?",
    delete: "કાઢી નાખો",
    login: "લોગિન",
    welcome: "સ્વાગત છે",
    employeeApp: "કર્મચારી પોર્ટલ",
    takeSelfie: "સેલ્ફી લો",
    locationAccess: "લોકેશન પરવાનગી આપો",
    gpsRequired: "હાજરી માટે GPS લોકેશન જરૂરી છે",
    selfieRequired: "હાજરી માટે સેલ્ફી જરૂરી છે",
    subAdmin: "સબ એડમિન",
    employee: "કર્મચારી",
    owner: "માલિક",
    medical: "તબીબી",
    family: "કૌટુંબિક",
    personal: "વ્યક્તિગત",
    other: "અન્ય",
    specifyReason: "કારણ જણાવો",
    lateAlert: "તમે આજે મોડા છો!",
    manualPunch: "મેન્યુઅલ હાજરી",
    history: "ઇતિહાસ",
    from: "થી",
    to: "સુધી",
    settings: "સેટિંગ્સ",
    businessName: "વ્યવસાયનું નામ",
    employeeLimit: "કર્મચારી મર્યાદા",
    salaryRule: "પગારનો નિયમ",
    latePenalty: "મોડા આવવાનો દંડ",
    whatsappNumber: "WhatsApp નંબર",
    backup: "ડેટાબેઝ બેકઅપ",
    monthlySummary: "માસિક સારાંશ",
    hoursWorked: "કામના કલાકો",
    totalSalary: "કુલ પગાર",
    daysPresent: "હાજર દિવસો",
    daysAbsent: "ગેરહાજર દિવસો",
    lateDays: "મોડા દિવસો",
    whatsappExport: "WhatsApp પર શેર કરો",
    monthly: "માસિક",
    hourly: "કલાકદીઠ",
    salarySummary: "પગાર સારાંશ"
  }
};
