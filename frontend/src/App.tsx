import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Upload, CheckCircle2, Trash2, Loader2,
  AlertCircle, Tag, User, Store, Calendar,
  LayoutList, ScanLine, Filter, ArrowRight, Copy, RefreshCcw, PieChart
} from 'lucide-react';

const BACKEND_URL = `http://localhost:3000`; 

interface Transaction {
  id?: number; date: string; expense: string; to: string; category: string;
  total: number; payment: string; by: string; remarks: string;
  status?: string; isValid?: boolean; isDuplicate?: boolean;
}

// New Type for Dashboard
interface CategoryTotal { name: string; total: number; }

export default function App() {
  // Navigation State - Added 'dash'
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'dash'>('scan');

  const [loading, setLoading] = useState(false);
  const [scanData, setScanData] = useState<Transaction[]>([]);
  const [defaultUser, setDefaultUser] = useState("Kris");

  const [historyData, setHistoryData] = useState<Transaction[]>([]);
  const [dateFilter, setDateFilter] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0] 
  });
  const [historyLoading, setHistoryLoading] = useState(false);

  // New Dashboard State
  const [dashData, setDashData] = useState<CategoryTotal[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${BACKEND_URL}/transactions/upload`, formData);
      const dupRes = await axios.post(`${BACKEND_URL}/transactions/check-duplicates`, res.data);
      const enrichedData = res.data.map((item: any, idx: number) => ({
        ...item, by: defaultUser, remarks: "", isValid: item.isValid ?? true,
        isDuplicate: dupRes.data[idx].exists || (item.isValid === false)
      }));
      setScanData(enrichedData);
    } catch (err) { alert("Error processing image."); } finally { setLoading(false); }
  };

  const updateScanField = (index: number, field: keyof Transaction, value: any) => {
    const updated = [...scanData];
    updated[index] = { ...updated[index], [field]: value };
    setScanData(updated);
  };

  const toggleDuplicate = (index: number) => {
    const updated = [...scanData];
    updated[index].isDuplicate = !updated[index].isDuplicate;
    setScanData(updated);
  };

  const saveToDatabase = async () => {
    const itemsToSave = scanData.filter(tx => !tx.isDuplicate);
    if (!itemsToSave.length) { alert("No new items to save."); return; }
    try {
      setLoading(true);
      await axios.post(`${BACKEND_URL}/transactions/confirm`, itemsToSave);
      setScanData([]);
      setActiveTab('history');
      fetchHistory();
    } catch (err) { alert("Save failed."); } finally { setLoading(false); }
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${BACKEND_URL}/transactions/history`, {
        params: { startDate: dateFilter.start, endDate: dateFilter.end }
      });
      setHistoryData(res.data);
    } catch (err) { console.error(err); } finally { setHistoryLoading(false); }
  };

  // New Fetcher for Dashboard
  const fetchDash = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/transactions/dashboard`, {
        params: { startDate: dateFilter.start, endDate: dateFilter.end }
      });
      setDashData(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'dash') fetchDash();
  }, [activeTab, dateFilter]);

  const calculateTotal = (data: any[]) => data.reduce((acc, curr) => acc + (curr.total || 0), 0);
  const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-900 pb-24 font-sans">
      
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <h1 className="text-xl font-black text-blue-600 tracking-tight">EXP_LEDGER</h1>
          {activeTab === 'scan' && (
            <select 
              className="bg-slate-100 text-xs font-bold px-2 py-1 rounded-lg border-none outline-none text-slate-600"
              value={defaultUser} onChange={(e) => setDefaultUser(e.target.value)}
            >
              <option value="Kris">👤 Kris</option>
              <option value="Iven">👤 Iven</option>
            </select>
          )}
        </div>
      </nav>

      <main className="max-w-lg mx-auto p-4">
        
        {/* Date Filter (Shared by History and Dash) */}
        {activeTab !== 'scan' && (
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 sticky top-[72px] z-10 mb-4">
                <div className="flex items-center gap-2">
                <div className="flex-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase ml-1">From</span>
                    <input type="date" className="w-full text-xs font-bold bg-slate-50 rounded-xl p-2 outline-none"
                    value={dateFilter.start} onChange={(e) => setDateFilter({...dateFilter, start: e.target.value})} />
                </div>
                <ArrowRight size={12} className="text-slate-300 mt-4" />
                <div className="flex-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase ml-1">To</span>
                    <input type="date" className="w-full text-xs font-bold bg-slate-50 rounded-xl p-2 outline-none"
                    value={dateFilter.end} onChange={(e) => setDateFilter({...dateFilter, end: e.target.value})} />
                </div>
                </div>
            </div>
        )}

        {/* SCANNER TAB (Your Original Code) */}
        {activeTab === 'scan' && (
          <div className="space-y-4">
            {scanData.length === 0 && (
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
            {scanData.map((tx, index) => (
              <div key={index} className={`bg-white rounded-3xl p-5 border transition-all ${tx.isDuplicate ? 'border-orange-200 ring-4 ring-orange-50 bg-orange-50/10' : 'border-slate-100 shadow-sm'}`}>
                {tx.isDuplicate && (
                  <div className="flex items-center justify-between mb-4 bg-orange-100/50 p-2 rounded-xl">
                    <div className="flex items-center gap-1.5 text-orange-700 text-[10px] font-black uppercase tracking-widest">
                      <Copy size={12} /> {tx.isValid === false ? 'Failed Transaction' : 'Potential Duplicate'}
                    </div>
                    <button onClick={() => toggleDuplicate(index)} className="flex items-center gap-1 text-[10px] font-bold bg-white text-orange-700 px-3 py-1 rounded-lg shadow-sm active:scale-90 transition-transform">
                      <RefreshCcw size={10} /> Mark as New
                    </button>
                  </div>
                )}
                <div className="flex justify-between items-center mb-4">
                   <input type="date" className="text-xs font-bold text-slate-500 bg-slate-50 rounded-lg px-2 py-1 outline-none" value={tx.date} onChange={(e) => updateScanField(index, 'date', e.target.value)} />
                    <button onClick={() => setScanData(scanData.filter((_, i) => i !== index))}><Trash2 size={16} className="text-slate-300 hover:text-red-400" /></button>
                </div>
                <div className="mb-6">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block mb-1">Total Expense</span>
                  <div className="flex items-center text-3xl font-mono font-bold text-slate-800 tracking-tighter">
                    <span className="text-lg text-slate-300 mr-1">Rp</span>
                    <input type="number" className="bg-transparent outline-none w-full" value={tx.total} onChange={(e) => updateScanField(index, 'total', Number(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="relative flex items-center bg-slate-50 rounded-xl px-3 py-2.5">
                    <Tag size={14} className="text-slate-400 mr-3" />
                    <input className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none" value={tx.expense} onChange={(e) => updateScanField(index, 'expense', e.target.value)} placeholder="Item Description" />
                  </div>
                  <div className="relative flex items-center bg-slate-50 rounded-xl px-3 py-2.5">
                    <Store size={14} className="text-slate-400 mr-3" />
                    <input className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none" value={tx.to} onChange={(e) => updateScanField(index, 'to', e.target.value)} placeholder="Merchant" />
                  </div>
                  <div className="flex gap-2">
                    <select className="flex-[2] bg-slate-50 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 outline-none" value={tx.category} onChange={(e) => updateScanField(index, 'category', e.target.value)}>
                       <option value="Food">🍔 Food</option><option value="Transport">🚗 Transport</option><option value="Wifi">📶 Wifi</option><option value="Insurance">🛡️ Insurance</option><option value="Rent">🏠 Rent</option><option value="Others">📦 Others</option>
                    </select>
                    <div className="flex-1 flex items-center bg-slate-50 rounded-xl px-2">
                      <User size={12} className="text-slate-400 mr-1" />
                      <select className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none" value={tx.by} onChange={(e) => updateScanField(index, 'by', e.target.value)}>
                        <option value="Kris">Kris</option><option value="Iven">Iven</option>
                      </select>
                    </div>
                  </div>
                  <input className="w-full text-center text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50/50 py-3 rounded-xl outline-none" value={tx.payment} onChange={(e) => updateScanField(index, 'payment', e.target.value)} placeholder="SOURCE (e.g. JAGO)" />
                  <input className="w-full text-xs font-medium text-slate-400 bg-transparent py-1 border-b border-dashed border-slate-200 outline-none italic" value={tx.remarks} onChange={(e) => updateScanField(index, 'remarks', e.target.value)} placeholder="Remarks..." />
                </div>
              </div>
            ))}
            {scanData.length > 0 && (
              <button onClick={saveToDatabase} disabled={loading} className="w-full bg-slate-900 py-4 rounded-2xl font-bold text-white shadow-xl flex flex-col items-center justify-center active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin" /> : <><div className="flex items-center gap-2"><CheckCircle2 size={18} /><span>Record to Ledger</span></div><span className="text-[10px] opacity-50 uppercase tracking-widest font-black">Saving {scanData.filter(t => !t.isDuplicate).length} New Items</span></>}
              </button>
            )}
          </div>
        )}

        {/* HISTORY TAB (Your Original Code) */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-50 pb-3 px-1">
                <span className="text-xs font-bold text-slate-400">Total Spending</span>
                <span className="text-xl font-black text-slate-800 tracking-tight">{formatCurrency(calculateTotal(historyData))}</span>
            </div>
            {historyLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-300" /></div>
            ) : historyData.length === 0 ? (
              <div className="text-center py-12 text-slate-300 text-sm font-bold">No records found.</div>
            ) : (
              <div className="space-y-3">
                {historyData.map((tx) => (
                  <div key={tx.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex flex-col gap-2 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{tx.date}</div>
                        <h3 className="font-bold text-slate-800 text-sm leading-tight">{tx.expense}</h3>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-1"><Store size={10} /> {tx.to} <span className="text-slate-200 mx-1">|</span> {tx.category}</div>
                      </div>
                      <div className="text-right">
                         <div className="font-mono font-bold text-blue-600 tracking-tighter">{formatCurrency(tx.total)}</div>
                         <div className="text-[9px] font-black text-slate-400 bg-slate-100 inline-block px-1.5 py-0.5 rounded-md mt-1.5 uppercase">{tx.by} • {tx.payment}</div>
                      </div>
                    </div>
                    {tx.remarks && <div className="text-[10px] text-slate-500 italic bg-slate-50 p-2.5 rounded-xl mt-1">"{tx.remarks}"</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NEW DASHBOARD TAB */}
        {activeTab === 'dash' && (
            <div className="space-y-6">
                <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100">
                    <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Total Period Spending</p>
                    <h2 className="text-3xl font-black tracking-tighter">{formatCurrency(calculateTotal(dashData))}</h2>
                </div>
                
                <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 px-1">Breakdown</h3>
                    <div className="space-y-6">
                        {dashData.map(cat => {
                            const percentage = (cat.total / calculateTotal(dashData)) * 100;
                            return (
                                <div key={cat.name}>
                                    <div className="flex justify-between text-[11px] font-black mb-2 uppercase tracking-wide">
                                        <span className="text-slate-600">{cat.name}</span>
                                        <span className="text-slate-400">{percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full transition-all duration-700" style={{ width: `${percentage}%` }}></div>
                                    </div>
                                    <p className="text-right text-[10px] font-mono font-bold text-slate-400 mt-2">{formatCurrency(cat.total)}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}

      </main>

      {/* UPDATED BOTTOM NAV BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 pb-8 pt-2 z-40">
        <div className="max-w-lg mx-auto grid grid-cols-3">
          <button onClick={() => setActiveTab('scan')} className={`flex flex-col items-center justify-center py-2 transition-all ${activeTab === 'scan' ? 'text-blue-600' : 'text-slate-300'}`}>
            <ScanLine size={24} strokeWidth={activeTab === 'scan' ? 3 : 2} />
            <span className="text-[10px] font-black uppercase tracking-widest mt-1">Scanner</span>
          </button>

          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center justify-center py-2 transition-all ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-300'}`}>
            <LayoutList size={24} strokeWidth={activeTab === 'history' ? 3 : 2} />
            <span className="text-[10px] font-black uppercase tracking-widest mt-1">History</span>
          </button>

          <button onClick={() => setActiveTab('dash')} className={`flex flex-col items-center justify-center py-2 transition-all ${activeTab === 'dash' ? 'text-blue-600' : 'text-slate-300'}`}>
            <PieChart size={24} strokeWidth={activeTab === 'dash' ? 3 : 2} />
            <span className="text-[10px] font-black uppercase tracking-widest mt-1">Dash</span>
          </button>
        </div>
      </div>
    </div>
  );
}