import { useState, useEffect, FormEvent } from 'react';
import { Eye, EyeOff, LayoutDashboard, ListTodo, Receipt, Menu, X } from 'lucide-react';
import { Task, Assignee } from './types';
import TaskColumn from './components/TaskColumn';
import TaskFormModal from './components/TaskFormModal';
import { db } from './firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAssignee, setModalAssignee] = useState<Assignee>('BIBHU');
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('partner-dashboard-auth') === 'true';
  });
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'work-list' | 'invoices'>('work-list');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const fetchedTasks = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          task_id: doc.id,
          task_name: data.task_name,
          due_date: data.due_date?.toDate ? data.due_date.toDate().toISOString() : data.due_date,
          status: data.status,
          assignee: data.assignee as Assignee,
        };
      });
      setTasks(fetchedTasks);
    }, (error) => {
      console.error('Firestore Error: ', error);
      const errInfo = {
        error: error instanceof Error ? error.message : String(error),
        operationType: 'get',
        path: 'tasks',
        authInfo: {}
      };
      throw new Error(JSON.stringify(errInfo));
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (assignee: Assignee, task?: Task) => {
    setModalAssignee(assignee);
    setTaskToEdit(task || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTaskToEdit(null);
  };

  const handleSaveTask = async (taskData: Omit<Task, 'task_id'> | Task) => {
    const firestoreDueDate = taskData.due_date ? Timestamp.fromDate(new Date(taskData.due_date)) : null;
    
    if ('task_id' in taskData && taskData.task_id) {
      await updateDoc(doc(db, 'tasks', taskData.task_id), {
        task_name: taskData.task_name,
        due_date: firestoreDueDate,
        status: taskData.status,
        assignee: taskData.assignee
      });
    } else {
      const newRef = doc(collection(db, 'tasks'));
      await setDoc(newRef, {
        task_name: taskData.task_name,
        due_date: firestoreDueDate,
        status: taskData.status,
        assignee: taskData.assignee,
        created_at: serverTimestamp()
      });
    }
    handleCloseModal();
  };

  const handleDeleteTask = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
  };

  const handleToggleCompletion = async (id: string) => {
    const task = tasks.find(t => t.task_id === id);
    if (task) {
      await updateDoc(doc(db, 'tasks', id), {
        status: !task.status
      });
    }
  };

  const sortTasks = (a: Task, b: Task) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  };

  const bibhuTasks = tasks.filter(t => t.assignee === 'BIBHU').sort(sortTasks);
  const adminTasks = tasks.filter(t => t.assignee === 'ADMIN').sort(sortTasks);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    if (password.trim() === 'Bibhu@2026') {
      setIsAuthenticated(true);
      localStorage.setItem('partner-dashboard-auth', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    localStorage.removeItem('partner-dashboard-auth');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-blue-200">
        <div className="bg-white p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-sm border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Partner Dashboard</h1>
            <p className="text-slate-500 text-sm mt-2">Enter the password to access.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAuthError(false);
                  }}
                  placeholder="Password"
                  className={`w-full px-4 py-3.5 pr-12 rounded-xl border ${authError ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100'} bg-slate-50 focus:bg-white outline-none focus:ring-4 transition-all`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {authError && <p className="text-red-500 text-xs mt-2.5 font-medium ml-1">Incorrect password.</p>}
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-medium rounded-xl transition-colors focus:outline-none focus:ring-4 focus:ring-slate-200 shadow-sm"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-blue-50 flex overflow-hidden font-sans text-slate-800 selection:bg-blue-200 selection:text-blue-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-blue-100 flex flex-col shrink-0 hidden md:flex z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="h-20 flex items-center gap-3 px-6 border-b border-blue-100/50">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
            <span className="text-white font-bold tracking-tighter text-lg">PD</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-blue-900">Partner Dashboard</h1>
        </div>
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveTab('work-list')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'work-list' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ListTodo className={`w-5 h-5 ${activeTab === 'work-list' ? 'text-blue-600' : 'text-slate-400'}`} />
            Work List
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'invoices' 
                ? 'bg-blue-50 text-blue-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Receipt className={`w-5 h-5 ${activeTab === 'invoices' ? 'text-blue-600' : 'text-slate-400'}`} />
            Invoices
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div 
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative flex w-full max-w-xs flex-col bg-white shadow-xl">
            <div className="h-20 flex items-center justify-between px-6 border-b border-blue-100/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
                  <span className="text-white font-bold tracking-tighter text-lg">PD</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-blue-900">Dashboard</h1>
              </div>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 focus:outline-none"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
              <button
                onClick={() => {
                  setActiveTab('work-list');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'work-list' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ListTodo className={`w-5 h-5 ${activeTab === 'work-list' ? 'text-blue-600' : 'text-slate-400'}`} />
                Work List
              </button>
              <button
                onClick={() => {
                  setActiveTab('invoices');
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'invoices' 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Receipt className={`w-5 h-5 ${activeTab === 'invoices' ? 'text-blue-600' : 'text-slate-400'}`} />
                Invoices
              </button>
            </div>
            <div className="p-4 border-t border-blue-100/50">
              <button 
                onClick={handleLogout}
                className="w-full flex justify-center text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/60 hover:border-slate-300 hover:bg-slate-50 px-4 py-3 rounded-xl transition-colors shadow-sm"
              >
                Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full relative">
        <header className="h-20 bg-white/80 backdrop-blur-md md:bg-transparent md:backdrop-blur-none md:border-none border-b border-blue-100 flex items-center justify-between px-6 md:px-10 shrink-0 z-10">
          <div className="flex items-center gap-3 md:hidden">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg focus:outline-none"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold tracking-tighter text-sm">PD</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight text-blue-900">Partner Dashboard</h1>
          </div>
          <div className="hidden md:block">
            <h2 className="text-2xl font-bold tracking-tight text-blue-900">
              {activeTab === 'work-list' ? 'Work List' : 'Invoices'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-full hidden sm:block border border-slate-200/60 shadow-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <button 
              onClick={handleLogout}
              className="text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200/60 hover:border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-sm"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex flex-1 w-full h-[calc(100vh-5rem)] overflow-hidden">
          {activeTab === 'work-list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full">
              <TaskColumn
                assignee="BIBHU"
                tasks={bibhuTasks}
                onAddTask={() => handleOpenModal('BIBHU')}
                onEditTask={(task) => handleOpenModal('BIBHU', task)}
                onDeleteTask={handleDeleteTask}
                onToggleCompletion={handleToggleCompletion}
              />
              <TaskColumn
                assignee="ADMIN"
                tasks={adminTasks}
                onAddTask={() => handleOpenModal('ADMIN')}
                onEditTask={(task) => handleOpenModal('ADMIN', task)}
                onDeleteTask={handleDeleteTask}
                onToggleCompletion={handleToggleCompletion}
              />
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-2xl bg-white/60 backdrop-blur-sm border border-slate-200/60 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center">
                <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <Receipt className="w-12 h-12 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3 tracking-tight">Invoices coming soon</h3>
                <p className="text-slate-500 max-w-md text-lg">
                  We're currently building the invoices feature. It will be available in a future update.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <TaskFormModal
          assignee={modalAssignee}
          initialData={taskToEdit}
          onSave={handleSaveTask}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
