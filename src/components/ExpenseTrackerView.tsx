import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, setDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Transaction, TransactionCategory, TransactionAccount } from '../types';
import { Plus, X, ArrowUpRight, ArrowDownRight, Wallet, PieChart, Landmark, CreditCard, Banknote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const CATEGORIES: TransactionCategory[] = [
  'Food & Dining', 'Groceries', 'Fitness', 'Software & Tools', 
  'Education', 'Utilities', 'Miscellaneous', 'Salary', 'Freelance', 'Other'
];

const ACCOUNTS: TransactionAccount[] = ['Bank Account', 'Cash', 'Credit Card'];

// Colors for the donut chart matching blue and white theme with distinct shades
const COLORS = [
  '#002B5B', // Deep Navy
  '#0056D2', // Primary Blue
  '#0284C7', // Sky Blue Dark
  '#0EA5E9', // Sky Blue Light
  '#0D9488', // Teal
  '#4F46E5', // Indigo
  '#7C3AED', // Violet
  '#2563EB', // Royal Blue
  '#64748B', // Slate
  '#94A3B8'  // Slate Light
];

export default function ExpenseTrackerView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state
  const [type, setType] = useState<'Income' | 'Expense'>('Expense');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<string>('Food & Dining');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [account, setAccount] = useState<TransactionAccount>('Bank Account');
  const [description, setDescription] = useState<string>('');
  const [bankTxnId, setBankTxnId] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'transactions'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'transaction_categories'), orderBy('created_at', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setCustomCategories(snap.docs.map(doc => doc.data().name as string));
    });
    return () => unsub();
  }, []);

  const ALL_CATEGORIES = [...CATEGORIES, ...customCategories];

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || !description) return;
    if (category === 'ADD_NEW' && !newCategoryName.trim()) return;
    
    setIsSaving(true);
    try {
      let finalCategory = category;
      
      // Handle new custom category
      if (category === 'ADD_NEW' && newCategoryName.trim()) {
        finalCategory = newCategoryName.trim();
        // Check if it already exists to avoid duplicates
        if (!ALL_CATEGORIES.includes(finalCategory)) {
          const categoryDocId = finalCategory.toLowerCase().replace(/\s+/g, '-');
          await setDoc(doc(db, 'transaction_categories', categoryDocId), {
            name: finalCategory,
            created_at: serverTimestamp()
          });
        }
      }
      let nextSerial = 1;
      if (transactions.length > 0) {
        const maxSerial = Math.max(...transactions.map(t => typeof t.serial_number === 'number' ? t.serial_number : 0));
        nextSerial = maxSerial + 1;
      }
      
      const docId = nextSerial.toString();
      await setDoc(doc(db, 'transactions', docId), {
        serial_number: nextSerial,
        bank_transaction_id: bankTxnId,
        type,
        amount: Number(amount),
        date: new Date(date).toISOString(),
        category: finalCategory,
        account,
        description,
        created_at: serverTimestamp()
      });
      
      setIsModalOpen(false);
      setAmount('');
      setDescription('');
      setBankTxnId('');
      setNewCategoryName('');
      if (category === 'ADD_NEW') {
        setCategory(finalCategory);
      }
      setDate(new Date().toISOString().split('T')[0]);
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Failed to save transaction');
    } finally {
      setIsSaving(false);
    }
  };

  // Calculations for current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const currentMonthTransactions = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalIncome = currentMonthTransactions
    .filter(t => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = currentMonthTransactions
    .filter(t => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpenses;

  // Chart data
  const expensesByCategory = currentMonthTransactions
    .filter(t => t.type === 'Expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.entries(expensesByCategory)
    .map(([name, value]) => ({ name, value: value as number }))
    .sort((a, b) => b.value - a.value);

  const getAccountIcon = (acc: string) => {
    switch(acc) {
      case 'Bank Account': return <Landmark className="w-4 h-4" />;
      case 'Credit Card': return <CreditCard className="w-4 h-4" />;
      case 'Cash': return <Banknote className="w-4 h-4" />;
      default: return <Wallet className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-full h-full p-6 md:p-8 overflow-y-auto bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 md:px-8 md:py-6 rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 text-[#0056D2] rounded-xl">
                <Wallet className="w-6 h-6" />
              </div>
              Expense Tracker
            </h2>
            <p className="text-slate-500 mt-1 text-sm font-medium">Manage your finances for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3.5 bg-[#0056D2] hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Transaction
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Income</p>
              <h3 className="text-2xl font-bold text-green-600 mt-1">₹{totalIncome.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Expenses</p>
              <h3 className="text-2xl font-bold text-red-600 mt-1">₹{totalExpenses.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 text-[#0056D2]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Net Balance</p>
              <h3 className={`text-2xl font-bold mt-1 ${netBalance >= 0 ? 'text-slate-800' : 'text-red-600'}`}>
                ₹{netBalance.toLocaleString()}
              </h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-500" />
              Expense Allocation
            </h3>
            <div className="flex-1 min-h-[300px] w-full flex items-center justify-center">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-400">
                  <PieChart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No expenses this month</p>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Recent Transactions
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4 w-16 text-center">S.No</th>
                    <th className="px-6 py-4 w-32">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 w-40">Category</th>
                    <th className="px-6 py-4 w-40">Account</th>
                    <th className="px-6 py-4 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.slice(0, 15).map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-medium text-center">
                        {txn.serial_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                        {new Date(txn.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-800">{txn.description}</div>
                        {txn.bank_transaction_id && (
                          <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {txn.bank_transaction_id}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                          {txn.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          {getAccountIcon(txn.account)}
                          {txn.account}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`font-bold ${txn.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.type === 'Income' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                          <Wallet className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-lg font-medium text-slate-600 mb-1">No transactions</p>
                        <p className="text-sm text-slate-400">Add a transaction to get started.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-800">Add Transaction</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    onClick={() => setType('Expense')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                      type === 'Expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    onClick={() => setType('Income')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                      type === 'Income' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Income
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-bold text-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What was this for?"
                    className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium appearance-none"
                    >
                      {ALL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      <option value="ADD_NEW">+ Add New Category...</option>
                    </select>
                  </div>
                </div>

                {category === 'ADD_NEW' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">New Category Name</label>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. Subscriptions"
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Account</label>
                    <select
                      value={account}
                      onChange={(e) => setAccount(e.target.value as TransactionAccount)}
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-medium appearance-none"
                    >
                      {ACCOUNTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Bank Txn ID <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <input
                      type="text"
                      value={bankTxnId}
                      onChange={(e) => setBankTxnId(e.target.value)}
                      placeholder="e.g. TXN12345"
                      className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={handleSave}
                  disabled={!amount || !description || isSaving}
                  className="w-full py-3.5 bg-[#0056D2] hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Saving...' : 'Save Transaction'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
