import { useState, useEffect } from 'react';
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
    const firestoreDueDate = Timestamp.fromDate(new Date(taskData.due_date));
    
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

  const bibhuTasks = tasks.filter(t => t.assignee === 'BIBHU').sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const adminTasks = tasks.filter(t => t.assignee === 'ADMIN').sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Bibhu@2026') {
      setIsAuthenticated(true);
      localStorage.setItem('partner-dashboard-auth', 'true');
      setAuthError(false);
    } else {
      setAuthError(true);
    }
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
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setAuthError(false);
                }}
                placeholder="Password"
                className={`w-full px-4 py-3.5 rounded-xl border ${authError ? 'border-red-300 focus:ring-red-100' : 'border-slate-200 focus:border-slate-400 focus:ring-slate-100'} bg-slate-50 focus:bg-white outline-none focus:ring-4 transition-all`}
                autoFocus
              />
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
    <div className="h-screen w-full bg-blue-50 flex flex-col overflow-hidden font-sans text-slate-800 selection:bg-blue-200 selection:text-blue-900">
      <header className="h-20 bg-white border-b border-blue-100 flex items-center justify-between px-6 md:px-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
            <span className="text-white font-bold tracking-tighter text-lg">PD</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-blue-900">Partner Dashboard</h1>
        </div>
        <div className="text-sm font-medium text-slate-500 bg-blue-50 px-4 py-2 rounded-full hidden sm:block">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </header>

      <main className="flex flex-1 w-full h-[calc(100vh-5rem)] overflow-hidden">
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
      </main>

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
