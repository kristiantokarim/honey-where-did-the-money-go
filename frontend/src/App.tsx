import React, { useState } from 'react';
import axios from 'axios';
import {
  Upload, CheckCircle2, Trash2, Loader2,
  User, Store, Tag
} from 'lucide-react';

const BACKEND_URL = `http://localhost:3000`; // Update your IP

interface Transaction {
  date: string;
  expense: string;     // Column: Expense
  to: string;          // Column: To (Merchant)
  category: string;    // Column: Category
  total: number;       // Column: Total
  price: number;       // Column: Price (Hidden default = total)
  quantity: number;    // Column: Quantity (Hidden default = 1)
  payment: string;     // Column: Payment
  by: string;          // Column: By (Kris/Iven)
  remarks: string;     // Column: Remarks
  status?: string;
  isValid?: boolean;
  isDuplicate?: boolean;
}

export default function App() {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Default user profile
  const [defaultUser, setDefaultUser] = useState("Kris");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${BACKEND_URL}/transactions/upload`, formData);
      const parsedData = res.data.map((item: any) => ({
        ...item,
        price: item.total,
        quantity: 1,
        by: defaultUser, // Auto-fill current user
        remarks: "",
        isValid: item.isValid ?? true
      }));

      // Dedupe check logic here (omitted for brevity, same as before)
      // For now, just set data:
      setTransactions(parsedData);
    } catch (err) {
      alert("Error processing image.");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (index: number, field: keyof Transaction, value: any) => {
    const updated = [...transactions];
    updated[index] = { ...updated[index], [field]: value };
    setTransactions(updated);
  };

  const saveToDatabase = async () => {
    const itemsToSave = transactions.filter(tx => !tx.isDuplicate);
    if (!itemsToSave.length) return;

    try {
      setLoading(true);
      await axios.post(`${BACKEND_URL}/transactions/confirm`, itemsToSave);
      alert(`✅ Saved ${itemsToSave.length} entries!`);
      setTransactions([]);
    } catch (err) {
      alert("Save failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-900 pb-32">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black text-blue-600 tracking-tight">EXP_LEDGER</h1>
          <select 
            className="bg-slate-100 text-xs font-bold px-2 py-1 rounded-lg border-none outline-none text-slate-600"
            value={defaultUser}
            onChange={(e) => setDefaultUser(e.target.value)}
          >
            <option value="Kris">👤 Kris</option>
            <option value="Iven">👤 Iven</option>
          </select>
        </div>
      </nav>

      <main className="max-w-lg mx-auto p-4">
        {transactions.length === 0 && (
          <label className="mt-8 block cursor-pointer group">
            <div className="h-64 w-full border-4 border-dashed border-slate-200 rounded-[2rem] bg-white flex flex-col items-center justify-center group-active:scale-95 transition-all group-hover:border-blue-300">
              {loading ? <Loader2 className="w-12 h-12 text-blue-500 animate-spin" /> : (
                <>
                  <Upload size={32} className="text-blue-600 mb-2" />
                  <p className="font-bold uppercase tracking-tight text-slate-600">Scan Receipt</p>
                </>
              )}
            </div>
            <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
          </label>
        )}

        <div className="space-y-4">
          {transactions.map((tx, index) => (
            <div key={index} className={`bg-white rounded-3xl p-5 border transition-all ${tx.isDuplicate ? 'border-orange-200 ring-4 ring-orange-50' : 'border-slate-100 shadow-sm'}`}>
              
              {/* Header: Date & Valid Status */}
              <div className="flex justify-between items-center mb-4">
                 <input
                    type="date"
                    className="text-xs font-bold text-slate-500 bg-slate-50 rounded-lg px-2 py-1 outline-none focus:bg-blue-50 transition-colors"
                    value={tx.date}
                    onChange={(e) => updateField(index, 'date', e.target.value)}
                  />
                  <button onClick={() => setTransactions(transactions.filter((_, i) => i !== index))}>
                    <Trash2 size={16} className="text-slate-300 hover:text-red-400" />
                  </button>
              </div>

              {/* Main Amount */}
              <div className="mb-6">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Total Expense</span>
                <div className="flex items-center text-3xl font-mono font-bold text-slate-800 tracking-tighter">
                  <span className="text-lg text-slate-300 mr-1">Rp</span>
                  <input
                    type="number"
                    className="bg-transparent outline-none w-full placeholder-slate-200"
                    value={tx.total}
                    onChange={(e) => updateField(index, 'total', Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Grid Form */}
              <div className="grid grid-cols-1 gap-3">
                
                {/* 1. Item Name (Expense) */}
                <div className="relative flex items-center bg-slate-50 rounded-xl px-3 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Tag size={14} className="text-slate-400 mr-3" />
                  <input 
                    className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none"
                    placeholder="Item Name (Expense)"
                    value={tx.expense}
                    onChange={(e) => updateField(index, 'expense', e.target.value)}
                  />
                </div>

                {/* 2. Merchant (To) */}
                <div className="relative flex items-center bg-slate-50 rounded-xl px-3 py-2.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Store size={14} className="text-slate-400 mr-3" />
                  <input 
                    className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none"
                    placeholder="Merchant (To)"
                    value={tx.to}
                    onChange={(e) => updateField(index, 'to', e.target.value)}
                  />
                </div>

                {/* 3. Category & Payer (Split Row) */}
                <div className="flex gap-2">
                  <select
                    className="flex-[2] bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 outline-none"
                    value={tx.category}
                    onChange={(e) => updateField(index, 'category', e.target.value)}
                  >
                     <option value="Food">🍔 Food</option>
                    <option value="Transport">🚗 Transport</option>
                    <option value="Wifi">📶 Wifi</option>
                    <option value="Insurance">🛡️ Insurance</option>
                    <option value="Rent">🏠 Rent</option>
                    <option value="Others">📦 Others</option>
                  </select>

                  <div className="flex-1 flex items-center bg-slate-50 rounded-xl px-2">
                    <User size={12} className="text-slate-400 mr-1" />
                    <select
                      className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none"
                      value={tx.by}
                      onChange={(e) => updateField(index, 'by', e.target.value)}
                    >
                      <option value="Kris">Kris</option>
                      <option value="Iven">Iven</option>
                    </select>
                  </div>
                </div>

                {/* 4. Payment Source (Full Row) */}
                <div className="flex items-center gap-2 mt-2">
                   <div className="flex-1 h-px bg-slate-100"></div>
                   <span className="text-[9px] font-black text-slate-300 uppercase">Paid Via</span>
                   <div className="flex-1 h-px bg-slate-100"></div>
                </div>

                <input 
                  className="w-full text-center text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50/50 py-3 rounded-xl outline-none focus:bg-blue-100 transition-colors"
                  value={tx.payment}
                  onChange={(e) => updateField(index, 'payment', e.target.value)}
                  placeholder="SOURCE (e.g. JAGO)"
                />
                
                {/* 5. Remarks (Optional) */}
                <input 
                  className="w-full text-xs font-medium text-slate-500 bg-transparent py-2 border-b border-dashed border-slate-200 outline-none focus:border-blue-300 placeholder:italic"
                  value={tx.remarks}
                  onChange={(e) => updateField(index, 'remarks', e.target.value)}
                  placeholder="Add remarks..."
                />

              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Sync Button */}
      {transactions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-slate-100 z-20">
          <button 
            onClick={saveToDatabase}
            disabled={loading}
            className="w-full bg-slate-900 py-4 rounded-2xl font-bold text-white shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />}
            <span>Record to Ledger</span>
          </button>
        </div>
      )}
    </div>
  );
}