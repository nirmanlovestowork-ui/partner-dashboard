import { Task, Assignee } from '../types';
import TaskItem from './TaskItem';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface TaskColumnProps {
  assignee: Assignee;
  tasks: Task[];
  onAddTask: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onToggleCompletion: (id: string) => void;
}

export default function TaskColumn({
  assignee,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleCompletion
}: TaskColumnProps) {
  const pendingTasks = tasks.filter(t => !t.status);
  const completedTasks = tasks.filter(t => t.status);

  return (
    <section className={`h-full flex flex-col p-6 md:p-8 overflow-hidden ${
      assignee === 'BIBHU' ? 'border-r border-blue-100' : 'bg-white/40'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 shrink-0">
        <div>
          <h2 className={`text-3xl font-black uppercase tracking-widest ${
            assignee === 'BIBHU' ? 'text-blue-600' : 'text-slate-800'
          }`}>{assignee}</h2>
          <p className="text-sm text-slate-400 font-medium">{pendingTasks.length} {pendingTasks.length === 1 ? 'Task' : 'Tasks'} Remaining</p>
        </div>
        <button
          onClick={onAddTask}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 ${
            assignee === 'BIBHU'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 hover:bg-blue-700'
              : 'bg-slate-800 text-white shadow-lg shadow-slate-200 hover:bg-slate-900'
          }`}
        >
          <Plus className="w-5 h-5" />
          <span>Add Task</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {tasks.length === 0 ? (
          <div className="text-center py-16 px-4 border-2 border-dashed border-blue-100 rounded-2xl bg-blue-50/30">
            <p className="text-slate-500 mb-2 font-medium">No tasks yet</p>
            <p className="text-sm text-slate-400">Click the button above to add a task.</p>
          </div>
        ) : (
          <div className="space-y-3 pb-8">
            <AnimatePresence mode="popLayout">
              {pendingTasks.map((task) => (
                <TaskItem
                  key={task.task_id}
                  task={task}
                  onEdit={() => onEditTask(task)}
                  onDelete={() => onDeleteTask(task.task_id)}
                  onToggle={() => onToggleCompletion(task.task_id)}
                />
              ))}
              {completedTasks.length > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-6 mt-8 border-t border-slate-100/80"
                >
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
                    <span>Completed</span>
                    <span className="flex-1 h-px bg-slate-100/80"></span>
                  </h3>
                  <div className="space-y-3 opacity-75 grayscale-[20%]">
                    {completedTasks.map((task) => (
                      <TaskItem
                        key={task.task_id}
                        task={task}
                        onEdit={() => onEditTask(task)}
                        onDelete={() => onDeleteTask(task.task_id)}
                        onToggle={() => onToggleCompletion(task.task_id)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
