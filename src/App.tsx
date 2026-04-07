import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './firebase';
import { userService, scheduleService, notificationService } from './firebaseService';
import { User, Schedule, Notification, UserRole } from './types';
import { 
  Calendar, 
  Bell, 
  LogOut, 
  Plus, 
  User as UserIcon, 
  Shield, 
  ChevronRight,
  Info,
  AlertTriangle,
  AlertCircle,
  FileText,
  Menu,
  X,
  Upload,
  File
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// --- Components ---

const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setErrorInfo(event.message);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-6 border border-red-100">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle size={32} />
            <h2 className="text-xl font-bold">Đã xảy ra lỗi hệ thống</h2>
          </div>
          <p className="text-gray-600 mb-6">Vui lòng thử lại sau hoặc liên hệ quản trị viên.</p>
          {errorInfo && (
            <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-40 mb-6">
              {errorInfo}
            </pre>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Tải lại trang
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mb-4"
    />
    <p className="text-slate-600 font-medium animate-pulse">Đang tải dữ liệu...</p>
  </div>
);

const LoginScreen = () => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Calendar className="text-blue-600" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Trường TH&THCS Thống Nhất</h1>
          <p className="text-slate-500 mb-8">Hệ thống quản lý lịch công tác & thông báo</p>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Đăng nhập bằng Google
          </button>
          
          <p className="mt-8 text-xs text-slate-400">
            Dành cho cán bộ giáo viên nhà trường. Vui lòng sử dụng email công vụ.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'schedules' | 'notifications'>('schedules');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let userData = await userService.getUser(firebaseUser.uid);
        if (!userData) {
          // Default role is teacher, unless it's the admin email
          const role: UserRole = firebaseUser.email === "minhhuythcshonghai@gmail.com" ? 'admin' : 'teacher';
          userData = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Giáo viên',
            email: firebaseUser.email || '',
            role,
            photoURL: firebaseUser.photoURL || undefined
          };
          await userService.createUser(firebaseUser.uid, userData);
        }
        setCurrentUser(userData as User);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      const unsubSchedules = scheduleService.subscribeToSchedules(setSchedules);
      const unsubNotifications = notificationService.subscribeToNotifications(setNotifications);
      return () => {
        unsubSchedules();
        unsubNotifications();
      };
    }
  }, [currentUser]);

  if (loading) return <LoadingScreen />;
  if (!currentUser) return <LoginScreen />;

  const isAdmin = currentUser.role === 'admin';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
        {/* Sidebar / Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            <span className="font-bold text-slate-800">TH&THCS Thống Nhất</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <AnimatePresence>
          {(isSidebarOpen || window.innerWidth >= 768) && (
            <motion.aside 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className={`fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-40 flex flex-col transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
            >
              <div className="p-6 hidden md:block">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 leading-tight">TH&THCS</h2>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Thống Nhất</p>
                  </div>
                </div>
              </div>

              <nav className="flex-1 px-4 space-y-1">
                <button 
                  onClick={() => { setActiveTab('schedules'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'schedules' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <FileText size={20} />
                  Lịch công tác
                </button>
                <button 
                  onClick={() => { setActiveTab('notifications'); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${activeTab === 'notifications' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <Bell size={20} />
                  Thông báo
                  {notifications.length > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {notifications.length}
                    </span>
                  )}
                </button>
              </nav>

              <div className="p-4 border-t border-slate-100">
                <div className="bg-slate-50 rounded-2xl p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <img 
                      src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName)}&background=random`} 
                      alt={currentUser.displayName} 
                      className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
                    />
                    <div className="overflow-hidden">
                      <p className="font-bold text-slate-900 text-sm truncate">{currentUser.displayName}</p>
                      <div className="flex items-center gap-1">
                        {isAdmin ? <Shield size={12} className="text-amber-500" /> : <UserIcon size={12} className="text-blue-500" />}
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">
                          {isAdmin ? 'Quản trị viên' : 'Giáo viên'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => signOut(auth)}
                    className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-600 py-2 text-sm font-medium transition-colors"
                  >
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {activeTab === 'schedules' ? 'Lịch công tác tuần' : 'Thông báo mới'}
              </h1>
              <p className="text-slate-500">Trường TH&THCS Thống Nhất</p>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setShowAddForm(true)}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
              >
                <Plus size={20} />
                {activeTab === 'schedules' ? 'Tạo lịch mới' : 'Gửi thông báo'}
              </button>
            )}
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'schedules' ? (
              <motion.div 
                key="schedules"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid gap-6"
              >
                {schedules.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                    <FileText size={48} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Chưa có lịch công tác nào được đăng tải.</p>
                  </div>
                ) : (
                  schedules.map((schedule) => (
                    <ScheduleCard key={schedule.id} schedule={schedule} />
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid gap-4"
              >
                {notifications.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                    <Bell size={48} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Hiện không có thông báo nào.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <NotificationCard key={notif.id} notification={notif} />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Modal for adding content */}
        <AnimatePresence>
          {showAddForm && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAddForm(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    {activeTab === 'schedules' ? 'Đăng lịch công tác mới' : 'Gửi thông báo mới'}
                  </h2>
                  <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X size={24} className="text-slate-400" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                  {activeTab === 'schedules' ? (
                    <ScheduleForm onSuccess={() => setShowAddForm(false)} />
                  ) : (
                    <NotificationForm onSuccess={() => setShowAddForm(false)} />
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

// --- Sub-components ---

function ScheduleCard({ schedule }: { schedule: Schedule }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div 
      layout
      className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden"
    >
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center text-blue-600 font-bold border border-blue-100">
              <span className="text-[10px] uppercase leading-none mb-0.5">Tuần</span>
              <span className="text-lg leading-none">{schedule.weekNumber}</span>
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Lịch công tác tuần {schedule.weekNumber}</h3>
              <p className="text-sm text-slate-500">
                {format(new Date(schedule.startDate), 'dd/MM/yyyy')} - {format(new Date(schedule.endDate), 'dd/MM/yyyy')}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-blue-600 font-bold text-sm hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors"
          >
            {expanded ? 'Thu gọn' : 'Xem chi tiết'}
            <ChevronRight size={16} className={`transition-transform duration-300 ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-slate-100 prose prose-slate max-w-none">
                <div className="markdown-body">
                  <Markdown>{schedule.content}</Markdown>
                </div>
              </div>
              <div className="mt-6 flex items-center gap-2 text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                <Info size={12} />
                Đăng lúc {format(schedule.createdAt.toDate(), "HH:mm, 'ngày' dd/MM/yyyy", { locale: vi })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function NotificationCard({ notification }: { notification: Notification }) {
  const getIcon = () => {
    switch (notification.type) {
      case 'urgent': return <AlertTriangle className="text-red-500" />;
      case 'warning': return <AlertCircle className="text-amber-500" />;
      default: return <Info className="text-blue-500" />;
    }
  };

  const getBg = () => {
    switch (notification.type) {
      case 'urgent': return 'bg-red-50 border-red-100';
      case 'warning': return 'bg-amber-50 border-amber-100';
      default: return 'bg-blue-50 border-blue-100';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-5 rounded-2xl border ${getBg()} flex gap-4`}
    >
      <div className="shrink-0 mt-1">
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-bold text-slate-900">{notification.title}</h3>
          <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
            {format(notification.createdAt.toDate(), 'HH:mm dd/MM', { locale: vi })}
          </span>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed">{notification.message}</p>
      </div>
    </motion.div>
  );
}

function ScheduleForm({ onSuccess }: { onSuccess: () => void }) {
  const [weekNumber, setWeekNumber] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const fileName = file.name.toLowerCase();
    
    try {
      if (fileName.endsWith('.docx')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            const result = await (mammoth as any).convertToMarkdown({ arrayBuffer });
            setContent(result.value);
          } catch (err) {
            console.error("Error parsing Word file:", err);
          } finally {
            setIsParsing(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            let markdown = "";
            if (Array.isArray(json) && json.length > 0) {
              const rows = json as any[][];
              const maxCols = Math.max(...rows.map(r => r.length));
              
              const headers = rows[0] || [];
              const paddedHeaders = [...headers];
              while (paddedHeaders.length < maxCols) paddedHeaders.push("");
              
              markdown += "| " + paddedHeaders.map(h => h === undefined || h === null ? "" : String(h).replace(/\|/g, '\\|')).join(" | ") + " |\n";
              markdown += "| " + paddedHeaders.map(() => "---").join(" | ") + " |\n";
              
              for (let i = 1; i < rows.length; i++) {
                const row = rows[i] || [];
                const paddedRow = [...row];
                while (paddedRow.length < maxCols) paddedRow.push("");
                markdown += "| " + paddedRow.map(cell => cell === undefined || cell === null ? "" : String(cell).replace(/\|/g, '\\|')).join(" | ") + " |\n";
              }
            }
            setContent(markdown);
          } catch (err) {
            console.error("Error parsing Excel file:", err);
          } finally {
            setIsParsing(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setIsParsing(false);
      }
    } catch (error) {
      console.error("File upload error:", error);
      setIsParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      await scheduleService.addSchedule({
        weekNumber,
        startDate,
        endDate,
        content,
        authorId: auth.currentUser?.uid
      });
      onSuccess();
    } catch (error) {
      console.error("Add Schedule Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Tuần số</label>
          <input 
            type="number" 
            value={weekNumber} 
            onChange={(e) => setWeekNumber(parseInt(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Từ ngày</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Đến ngày</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-slate-700">Nội dung lịch công tác</label>
          <div className="flex gap-2">
            <label className="cursor-pointer flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
              <Upload size={14} />
              {isParsing ? 'Đang xử lý...' : 'Tải lên Word/Excel'}
              <input 
                type="file" 
                accept=".docx,.xlsx,.xls" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={isParsing}
              />
            </label>
          </div>
        </div>
        <textarea 
          value={content} 
          onChange={(e) => setContent(e.target.value)}
          placeholder="Nhập nội dung hoặc tải lên file Word/Excel để tự động điền..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
        />
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
      >
        {isSubmitting ? 'Đang xử lý...' : 'Đăng lịch công tác'}
      </button>
    </form>
  );
}

function NotificationForm({ onSuccess }: { onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'urgent'>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !message) return;

    setIsSubmitting(true);
    try {
      await notificationService.addNotification({
        title,
        message,
        type,
        authorId: auth.currentUser?.uid
      });
      onSuccess();
    } catch (error) {
      console.error("Add Notification Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Tiêu đề thông báo</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nhập tiêu đề ngắn gọn..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Mức độ ưu tiên</label>
        <div className="grid grid-cols-3 gap-3">
          {(['info', 'warning', 'urgent'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`py-3 rounded-xl text-sm font-bold border transition-all ${type === t ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
            >
              {t === 'info' ? 'Thông tin' : t === 'warning' ? 'Cảnh báo' : 'Khẩn cấp'}
            </button>
          ))}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">Nội dung chi tiết</label>
        <textarea 
          value={message} 
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Nhập nội dung thông báo..."
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 h-40 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
      >
        {isSubmitting ? 'Đang xử lý...' : 'Gửi thông báo ngay'}
      </button>
    </form>
  );
}
