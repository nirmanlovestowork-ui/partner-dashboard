import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, getDoc, setDoc, updateDoc, addDoc, onSnapshot, query, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Party, Service, InvoiceItem, Invoice } from '../types';
import { Plus, Trash2, Search, Calendar, FileText, X, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InvoicesView() {
  const [viewState, setViewState] = useState<'list' | 'create'>('list');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const [invoiceNumber, setInvoiceNumber] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  const [parties, setParties] = useState<Party[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partySearch, setPartySearch] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);
  const [showPartyModal, setShowPartyModal] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);
  
  const [serviceSearch, setServiceSearch] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  
  const [isSaving, setIsSaving] = useState(false);

  // New Party Form State
  const [newParty, setNewParty] = useState({ name: '', address: '', city: '', state: '', pincode: '', gstin: '' });
  
  // New Service Form State
  const [newService, setNewService] = useState({ name: '', unit_price: 0 });

  useEffect(() => {
    // Fetch counter
    const fetchCounter = async () => {
      const counterRef = doc(db, 'counters', 'invoice_counter');
      const counterSnap = await getDoc(counterRef);
      if (counterSnap.exists()) {
        setInvoiceNumber(counterSnap.data().last_number);
      } else {
        await setDoc(counterRef, { last_number: 0 });
        setInvoiceNumber(0);
      }
    };
    fetchCounter();

    // Listen to parties
    const unsubParties = onSnapshot(collection(db, 'parties'), (snap) => {
      setParties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Party)));
    });

    // Listen to services
    const unsubServices = onSnapshot(collection(db, 'services'), (snap) => {
      setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    });
    
    // Listen to invoices
    const invoicesQuery = query(collection(db, 'invoices'), orderBy('created_at', 'desc'));
    const unsubInvoices = onSnapshot(invoicesQuery, (snap) => {
      setInvoices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
    });

    return () => {
      unsubParties();
      unsubServices();
      unsubInvoices();
    };
  }, []);

  // Handle outside clicks for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(event.target as Node)) {
        setShowPartyDropdown(false);
      }
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target as Node)) {
        setShowServiceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatInvoiceNumber = (num: number) => {
    const padded = String(num + 1).padStart(3, '0');
    return `TTS/26-27/${padded}`;
  };

  const filteredParties = parties.filter(p => p.name.toLowerCase().includes(partySearch.toLowerCase()));
  const filteredServices = services.filter(s => s.name.toLowerCase().includes(serviceSearch.toLowerCase()));

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const handleAddParty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, 'parties'), newParty);
      const addedParty = { id: docRef.id, ...newParty };
      setSelectedParty(addedParty);
      setPartySearch(addedParty.name);
      setShowPartyModal(false);
      setNewParty({ name: '', address: '', city: '', state: '', pincode: '', gstin: '' });
    } catch (error) {
      console.error('Error adding party:', error);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const docRef = await addDoc(collection(db, 'services'), newService);
      const addedService = { id: docRef.id, ...newService };
      handleSelectService(addedService);
      setShowServiceModal(false);
      setNewService({ name: '', unit_price: 0 });
    } catch (error) {
      console.error('Error adding service:', error);
    }
  };

  const handleSelectService = (service: Service) => {
    const newItem: InvoiceItem = {
      id: crypto.randomUUID(),
      serviceId: service.id,
      name: service.name,
      unit_price: service.unit_price,
      quantity: 1,
      total: service.unit_price * 1
    };
    setItems([...items, newItem]);
    setServiceSearch('');
    setShowServiceDropdown(false);
  };

  const updateQuantity = (id: string, qty: number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const quantity = Math.max(1, qty);
        return { ...item, quantity, total: quantity * item.unit_price };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSaveInvoice = async () => {
    if (!selectedParty || items.length === 0) return;
    
    setIsSaving(true);
    try {
      const newInvNumber = invoiceNumber + 1;
      const invoiceData = {
        invoice_number: formatInvoiceNumber(invoiceNumber),
        date,
        party: selectedParty,
        items,
        subtotal,
        discount,
        grand_total: grandTotal,
        created_at: serverTimestamp()
      };

      await addDoc(collection(db, 'invoices'), invoiceData);
      
      const counterRef = doc(db, 'counters', 'invoice_counter');
      await updateDoc(counterRef, { last_number: newInvNumber });
      
      setInvoiceNumber(newInvNumber);
      setSelectedParty(null);
      setPartySearch('');
      setItems([]);
      setDiscount(0);
      setViewState('list');
      // No alert needed for better UX, could use a toast in future
    } catch (error) {
      console.error('Error saving invoice:', error);
      alert('Failed to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  if (viewState === 'list') {
    return (
      <div className="w-full h-full p-6 md:p-8 overflow-y-auto bg-slate-50">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Card */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 md:px-8 md:py-6 rounded-2xl border border-slate-200/60 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-[#0056D2] rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                Invoices
              </h2>
              <p className="text-slate-500 mt-1 text-sm font-medium">Manage and track your generated invoices</p>
            </div>
            <button
              onClick={() => setViewState('create')}
              className="px-6 py-3.5 bg-[#0056D2] hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Invoice
            </button>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-5 w-48">Invoice No</th>
                    <th className="px-6 py-5 w-48">Date</th>
                    <th className="px-6 py-5">Billed To</th>
                    <th className="px-6 py-5 text-right w-48">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-blue-50/30 transition-all group cursor-pointer">
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 font-mono text-sm font-semibold rounded-lg border border-slate-200/60 group-hover:bg-white group-hover:text-[#0056D2] group-hover:border-blue-200 group-hover:shadow-sm transition-all">
                          {invoice.invoice_number}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-slate-600 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                          {new Date(invoice.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-full bg-blue-50 text-[#0056D2] flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100/50 group-hover:bg-[#0056D2] group-hover:text-white transition-colors">
                            {invoice.party?.name?.charAt(0)?.toUpperCase() || 'P'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 text-base">{invoice.party?.name}</div>
                            <div className="text-sm text-slate-500 truncate max-w-[280px]">{invoice.party?.city}, {invoice.party?.state}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="font-bold text-slate-800 text-lg group-hover:text-[#0056D2] transition-colors">₹{invoice.grand_total.toFixed(2)}</div>
                      </td>
                    </tr>
                  ))}
                  {invoices.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-slate-100 shadow-inner">
                          <FileText className="w-10 h-10 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">No invoices yet</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-8 text-base">Create your first invoice to start tracking your billing and payments.</p>
                        <button
                          onClick={() => setViewState('create')}
                          className="px-6 py-3 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-[#0056D2] font-semibold rounded-xl shadow-sm transition-all inline-flex items-center gap-2"
                        >
                          <Plus className="w-5 h-5" />
                          Create First Invoice
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 md:p-8 overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <button 
              onClick={() => setViewState('list')}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-bold text-slate-800">New Invoice</h2>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Invoice No.</span>
                <div className="px-4 py-2 bg-slate-100 rounded-lg font-mono text-slate-800 font-semibold">
                  {formatInvoiceNumber(invoiceNumber)}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Date</span>
                <div className="relative">
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          </div>

          {/* Party Selection */}
          <div className="mb-6 relative" ref={partyDropdownRef}>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Billed To (Party)</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search or add party..."
                value={partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setShowPartyDropdown(true);
                  if (selectedParty && e.target.value !== selectedParty.name) {
                    setSelectedParty(null);
                  }
                }}
                onFocus={() => setShowPartyDropdown(true)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            
            <AnimatePresence>
              {showPartyDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                >
                  {filteredParties.map((party) => (
                    <div 
                      key={party.id}
                      onClick={() => {
                        setSelectedParty(party);
                        setPartySearch(party.name);
                        setShowPartyDropdown(false);
                      }}
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                    >
                      <div className="font-semibold text-slate-800">{party.name}</div>
                      <div className="text-xs text-slate-500 mt-1 truncate">{party.address}, {party.city}</div>
                    </div>
                  ))}
                  {partySearch && !filteredParties.some(p => p.name.toLowerCase() === partySearch.toLowerCase()) && (
                    <div 
                      onClick={() => {
                        setNewParty({ ...newParty, name: partySearch });
                        setShowPartyModal(true);
                        setShowPartyDropdown(false);
                      }}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-blue-600 flex items-center gap-2 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add "{partySearch}"
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected Party Details */}
            {selectedParty && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="font-semibold text-slate-800 text-lg mb-1">{selectedParty.name}</div>
                <div className="text-slate-600 text-sm whitespace-pre-line">
                  {selectedParty.address}<br />
                  {selectedParty.city}, {selectedParty.state} - {selectedParty.pincode}<br />
                  <span className="font-medium text-slate-700 mt-1 inline-block">GSTIN: {selectedParty.gstin || 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8">
          <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Line Items</h3>
          
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 font-semibold w-1/2">Service / Item</th>
                  <th className="pb-3 font-semibold text-right w-1/6">Rate</th>
                  <th className="pb-3 font-semibold text-center w-1/6">Qty</th>
                  <th className="pb-3 font-semibold text-right w-1/6">Total</th>
                  <th className="pb-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="group">
                    <td className="py-4 font-medium text-slate-800">{item.name}</td>
                    <td className="py-4 text-right text-slate-600">₹{item.unit_price.toFixed(2)}</td>
                    <td className="py-4 text-center">
                      <input 
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-16 px-2 py-1 text-center bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-4 text-right font-semibold text-slate-800">₹{item.total.toFixed(2)}</td>
                    <td className="py-4 text-right">
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic">No items added yet. Search below to add services.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Service Search/Add */}
          <div className="relative max-w-md" ref={serviceDropdownRef}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search or add service to invoice..."
                value={serviceSearch}
                onChange={(e) => {
                  setServiceSearch(e.target.value);
                  setShowServiceDropdown(true);
                }}
                onFocus={() => setShowServiceDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-slate-800 text-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <AnimatePresence>
              {showServiceDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto"
                >
                  {filteredServices.map((service) => (
                    <div 
                      key={service.id}
                      onClick={() => handleSelectService(service)}
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center"
                    >
                      <div className="font-semibold text-slate-800 text-sm">{service.name}</div>
                      <div className="text-sm font-medium text-blue-600">₹{service.unit_price}</div>
                    </div>
                  ))}
                  {serviceSearch && !filteredServices.some(s => s.name.toLowerCase() === serviceSearch.toLowerCase()) && (
                    <div 
                      onClick={() => {
                        setNewService({ ...newService, name: serviceSearch });
                        setShowServiceModal(true);
                        setShowServiceDropdown(false);
                      }}
                      className="px-4 py-3 hover:bg-blue-50 cursor-pointer text-blue-600 flex items-center gap-2 font-medium text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add "{serviceSearch}"
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Totals & Save */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Discount Amount (₹)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full max-w-xs px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
              />
            </div>
            
            <div className="w-full md:w-72 space-y-4">
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Subtotal</span>
                <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="font-medium">Discount</span>
                <span className="font-semibold text-red-500">-₹{discount.toFixed(2)}</span>
              </div>
              <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                <span className="text-lg font-bold text-slate-800">Grand Total</span>
                <span className="text-2xl font-bold text-blue-600">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-slate-100 flex justify-end gap-4">
            <button
              onClick={() => setViewState('list')}
              className="px-8 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveInvoice}
              disabled={!selectedParty || items.length === 0 || isSaving}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-sm shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center gap-2"
            >
              {isSaving ? 'Saving...' : 'Save Invoice'}
            </button>
          </div>
        </div>

      </div>

      {/* Add Party Modal */}
      <AnimatePresence>
        {showPartyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowPartyModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">Add New Party</h3>
                <button onClick={() => setShowPartyModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddParty} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Party Name</label>
                  <input required type="text" value={newParty.name} onChange={e => setNewParty({...newParty, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                  <input required type="text" value={newParty.address} onChange={e => setNewParty({...newParty, address: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">City</label>
                    <input required type="text" value={newParty.city} onChange={e => setNewParty({...newParty, city: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">State</label>
                    <input required type="text" value={newParty.state} onChange={e => setNewParty({...newParty, state: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pincode</label>
                    <input required type="text" value={newParty.pincode} onChange={e => setNewParty({...newParty, pincode: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">GSTIN (Optional)</label>
                    <input type="text" value={newParty.gstin} onChange={e => setNewParty({...newParty, gstin: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all uppercase" />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowPartyModal(false)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">Save Party</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Service Modal */}
      <AnimatePresence>
        {showServiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowServiceModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">Add New Service</h3>
                <button onClick={() => setShowServiceModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddService} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Service/Item Name</label>
                  <input required type="text" value={newService.name} onChange={e => setNewService({...newService, name: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Unit Price (₹)</label>
                  <input required type="number" step="0.01" min="0" value={newService.unit_price || ''} onChange={e => setNewService({...newService, unit_price: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all" />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowServiceModal(false)} className="px-5 py-2.5 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20">Save Service</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

