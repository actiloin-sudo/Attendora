export type Language = 'en' | 'gu';
export type UserRole = 'master' | 'owner' | 'sub-admin' | 'employee';

export interface Employee {
  id: number;
  business_id?: number;
  name: string;
  mobile: string;
  email?: string;
  password?: string;
  role: UserRole;
  salary: number;
  shift_start: string;
  shift_end: string;
  is_first_login?: number;
}

export interface Business {
  id: number;
  name: string;
  email: string;
  owner_id: number;
  plan_name: string;
  employee_limit: number;
  activation_key: string;
  status: 'active' | 'inactive';
  office_lat?: number;
  office_lng?: number;
  geofence_radius?: number;
  owner_name?: string;
  owner_mobile?: string;
  employee_count?: number;
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
  distance_from_office?: number;
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
    salarySummary: "Salary Summary",
    masterDashboard: "Master Admin Panel",
    totalBusinesses: "Total Businesses",
    activeBusinesses: "Active Businesses",
    adminCount: "Admin Count",
    subAdminCount: "Sub Admin Count",
    generateKey: "Generate Product Key",
    activationKey: "Activation Key",
    selectPlan: "Select Your Plan",
    starterPlan: "Starter Pack",
    growthPlan: "Growth Pack",
    proPlan: "Pro Pack",
    free: "Free",
    upTo3: "Up to 3 Employees",
    upTo10: "Up to 10 Employees",
    upTo20: "Up to 20 Employees",
    upgrade: "Upgrade Now",
    active: "Active",
    inactive: "Inactive",
    businessList: "Business List",
    signup: "Sign Up",
    alreadyHaveAccount: "Already have an account?",
    noAccount: "Don't have an account?",
    businessEmail: "Business Email",
    productKey: "17-Digit Product Key",
    changePin: "Change PIN",
    newPin: "New PIN",
    confirmPin: "Confirm PIN",
    firstLoginPinChange: "Please change your PIN for security",
    officeLocation: "Office Location",
    setOfficeLocation: "Set Office Location",
    geofenceRadius: "Geofence Radius (metres)",
    distance: "Distance",
    selfie: "Selfie",
    map: "Map",
    outOfRange: "Out of Range",
    paymentSuccess: "Payment Successful! Your Product Key has been sent to your email.",
    regenerateKey: "Regenerate Key",
    uploadPaymentScreenshot: "Upload Payment Screenshot",
    pendingApproval: "Pending Approval",
    approveBusiness: "Approve Business",
    rejectBusiness: "Reject Business",
    addBusiness: "Add Business",
    ownerName: "Owner Name",
    ownerMobile: "Owner Mobile",
    ownerPassword: "Owner Password",
    editAttendance: "Edit Attendance",
    checkInTime: "Check In Time",
    checkOutTime: "Check Out Time",
    isLate: "Is Late?",
    paymentQR: "Scan to Pay (UPI)",
    paymentInstructions: "Scan the QR code, pay the amount, and upload the screenshot of the transaction."
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
    salarySummary: "પગાર સારાંશ",
    masterDashboard: "માસ્ટર એડમિન પેનલ",
    totalBusinesses: "કુલ વ્યવસાયો",
    activeBusinesses: "સક્રિય વ્યવસાયો",
    adminCount: "એડમિન સંખ્યા",
    subAdminCount: "સબ એડમિન સંખ્યા",
    generateKey: "પ્રોડક્ટ કી બનાવો",
    activationKey: "એક્ટિવેશન કી",
    selectPlan: "તમારો પ્લાન પસંદ કરો",
    starterPlan: "સ્ટાર્ટર પેક",
    growthPlan: "ગ્રોથ પેક",
    proPlan: "પ્રો પેક",
    free: "મફત",
    upTo3: "3 કર્મચારીઓ સુધી",
    upTo10: "10 કર્મચારીઓ સુધી",
    upTo20: "20 કર્મચારીઓ સુધી",
    upgrade: "અત્યારે અપગ્રેડ કરો",
    active: "સક્રિય",
    inactive: "નિષ્ક્રિય",
    businessList: "વ્યવસાય યાદી",
    signup: "સાઇન અપ",
    alreadyHaveAccount: "પહેલેથી જ એકાઉન્ટ છે?",
    noAccount: "એકાઉન્ટ નથી?",
    businessEmail: "વ્યવસાય ઇમેઇલ",
    productKey: "17-અંકની પ્રોડક્ટ કી",
    changePin: "પિન બદલો",
    newPin: "નવો પિન",
    confirmPin: "પિનની પુષ્ટિ કરો",
    firstLoginPinChange: "સુરક્ષા માટે કૃપા કરીને તમારો પિન બદલો",
    officeLocation: "ઓફિસ લોકેશન",
    setOfficeLocation: "ઓફિસ લોકેશન સેટ કરો",
    geofenceRadius: "જીઓફેન્સ ત્રિજ્યા (મીટર)",
    distance: "અંતર",
    selfie: "સેલ્ફી",
    map: "નકશો",
    outOfRange: "ઓફિસની બહાર",
    paymentSuccess: "ચુકવણી સફળ! તમારી પ્રોડક્ટ કી તમારા ઇમેઇલ પર મોકલવામાં આવી છે.",
    regenerateKey: "કી ફરીથી બનાવો",
    uploadPaymentScreenshot: "ચુકવણીનો સ્ક્રીનશોટ અપલોડ કરો",
    pendingApproval: "મંજૂરી બાકી છે",
    approveBusiness: "વ્યવસાય મંજૂર કરો",
    rejectBusiness: "વ્યવસાય નામંજૂર કરો",
    addBusiness: "વ્યવસાય ઉમેરો",
    ownerName: "માલિકનું નામ",
    ownerMobile: "માલિકનો મોબાઇલ",
    ownerPassword: "માલિકનો પાસવર્ડ",
    editAttendance: "હાજરી સુધારો",
    checkInTime: "આવવાનો સમય",
    checkOutTime: "જવાનો સમય",
    isLate: "મોડા છે?",
    paymentQR: "ચુકવણી માટે સ્કેન કરો (UPI)",
    paymentInstructions: "QR કોડ સ્કેન કરો, રકમ ચૂકવો અને વ્યવહારનો સ્ક્રીનશોટ અપલોડ કરો."
  }
};
