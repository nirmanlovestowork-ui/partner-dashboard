import { Task } from '../types';
import { Check, Clock, MoreVertical, Pencil, Trash2, Calendar } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskItemProps {
  key?: React.Key;
  task: Task;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}

export default function TaskItem({ task, onEdit, onDelete, onToggle }: TaskItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTiming = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === today.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const isOverdue = task.due_date ? new Date(task.due_date) < new Date() && !task.status : false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      className={`group relative p-5 rounded-2xl flex items-center transition-all duration-200 ${
        task.status 
          ? 'bg-blue-100/30 border border-dashed border-blue-200 opacity-60' 
          : isOverdue 
            ? 'bg-white shadow-md border border-slate-100 ring-2 ring-red-400 ring-offset-2' 
            : 'bg-white shadow-sm border border-blue-50'
      }`}
    >
      <div className="flex-1 min-w-0 pr-4">
        <div className={`text-xs font-bold uppercase tracking-tighter mb-1 ${
          task.status 
            ? 'text-blue-400' 
            : isOverdue 
              ? 'text-red-500' 
              : 'text-blue-500'
        }`}>
          {isOverdue && !task.status ? `OVERDUE • ${formatTiming(task.due_date!)}` : task.status ? 'COMPLETED' : task.due_date ? formatTiming(task.due_date) : 'NO DUE DATE'}
        </div>
        <div className={`text-lg font-semibold truncate ${
          task.status ? 'text-slate-500 line-through' : 'text-slate-800'
        }`}>
          {task.task_name}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-slate-300 hover:text-slate-500 rounded-lg transition-colors md:opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <MoreVertical className="w-6 h-6" />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden z-10 origin-top-right"
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <button
          onClick={onToggle}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
            task.status
              ? 'bg-blue-600 text-white scale-100'
              : 'border-2 border-blue-100 text-blue-500 hover:bg-blue-50 scale-95 hover:scale-100'
          }`}
        >
          <Check className="w-5 h-5" strokeWidth={3} />
        </button>
      </div>
    </motion.div>
  );
}
