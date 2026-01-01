import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Upload, CheckCircle2, Trash2, Loader2,
  Tag, User, Store, LayoutList, ScanLine, 
  ArrowRight, Copy, RefreshCcw, PieChart, 
  ChevronDown, ChevronUp, Maximize2, X
} from 'lucide-react';

const BACKEND_URL = `http://localhost:3000`; 

interface Transaction {
  id?: number; date: string; expense: string; to: string; category: string;
  total: number; payment: string; by: string; remarks: string;
  status?: string; isValid?: boolean; isDuplicate?: boolean;
}

interface CategoryTotal { name: string; total: number; }

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'dash'>('scan');
  const [loading, setLoading] = useState(false);
  const [scanData, setScanData] = useState<Transaction[]>([]);
  const [historyData, setHistoryData] = useState<Transaction[]>([]);
  const [dashData, setDashData] = useState<CategoryTotal[]>([]);
  const [defaultUser, setDefaultUser] = useState("Kris");
  
  // Image States
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false); // New state for in-app zoom

  const [dateFilter, setDateFilter] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0] 
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewImage(URL.createObjectURL(file));
    setShowImage(true);
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${BACKEND_URL}/transactions/upload`, formData);
      const dupRes = await axios.post(`${BACKEND_URL}/transactions/check-duplicates`, res.data);
      setScanData(res.data.map((item: any, idx: number) => ({
        ...item, by: defaultUser, remarks: "", isValid: item.isValid ?? true,
        isDuplicate: dupRes.data[idx].exists || (item.isValid === false)
      })));
    } catch (err) { alert("Error processing image."); } finally { setLoading(false); }
  };

  const updateScanField = (index: number, field: keyof Transaction, value: any) => {
    const updated = [...scanData];
    updated[index] = { ...updated[index], [field]: value };
    setScanData(updated);
  };

  const saveToDatabase = async () => {
    const itemsToSave = scanData.filter(tx => !tx.isDuplicate);
    if (!itemsToSave.length) { alert("No new items to save."); return; }
    try {
      setLoading(true);
      await axios.post(`${BACKEND_URL}/transactions/confirm`, itemsToSave);
      setScanData([]);
      setPreviewImage(null);
      setActiveTab('history');
    } catch (err) { alert("Save failed."); } finally { setLoading(false); }
  };

  const fetchTabData = async () => {
    try {
      if (activeTab === 'history') {
        const res = await axios.get(`${BACKEND_URL}/transactions/history`, { params: { startDate: dateFilter.start, endDate: dateFilter.end } });
        setHistoryData(res.data);
      }
      if (activeTab === 'dash') {
        const res = await axios.get(`${BACKEND_URL}/transactions/dashboard`, { params: { startDate: dateFilter.start, endDate: dateFilter.end } });
        setDashData(res.data);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchTabData(); }, [activeTab, dateFilter]);

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className={`min-h-screen bg-[#F8F9FD] text-slate-900 pb-32 font-sans ${isZoomed ? 'overflow-hidden' : ''}`}>
      
      {/* ZOOM MODAL (LIGHTBOX) */}
      {isZoomed && previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
          <button 
            onClick={() => setIsZoomed(false)}
            className="absolute top-6 right-6 bg-white/10 text-white p-3 rounded-full backdrop-blur-md active:scale-90 transition-transform"
          >
            <X size={24} />
          </button>
          <img 
            src={previewImage} 
            alt="Full Receipt" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />
          <p className="mt-4 text-slate-400 text-xs font-bold uppercase tracking-widest text-center">
            Pinch to zoom or scroll to check details
          </p>
        </div>
      )}

      {/* HEADER */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-black text-blue-600 tracking-tight">EXP_PRO</h1>
        {activeTab === 'scan' && (
          <select className="bg-slate-100 text-xs font-bold px-3 py-1.5 rounded-xl border-none outline-none text-slate-600"
            value={defaultUser} onChange={(e) => setDefaultUser(e.target.value)}>
            <option value="Kris">👤 Kris</option>
            <option value="Iven">👤 Iven</option>
          </select>
        )}
      </nav>

      <main className="max-w-lg mx-auto p-4">
        
        {/* DATE FILTER */}
        {activeTab !== 'scan' && (
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-4 sticky top-[72px] z-20">
            <div className="flex items-center gap-2">
              <input type="date" className="flex-1 text-xs font-bold bg-slate-50 rounded-xl p-2.5 outline-none" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} />
              <ArrowRight size={14} className="text-slate-300" />
              <input type="date" className="flex-1 text-xs font-bold bg-slate-50 rounded-xl p-2.5 outline-none" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} />
            </div>
          </div>
        )}

        {/* SCANNER TAB */}
        {activeTab === 'scan' && (
          <div className="flex flex-col">
            {/* STICKY PREVIEW */}
            {previewImage && scanData.length > 0 && (
              <div className={`transition-all duration-300 ease-in-out ${showImage ? 'h-64' : 'h-12'} bg-slate-900 sticky top-[70px] z-40 overflow-hidden rounded-[2rem] shadow-xl mb-4`}>
                {showImage ? (
                  <div className="relative h-full w-full flex items-center justify-center">
                    <img src={previewImage} alt="Receipt" className="h-full object-contain" />
                    <div className="absolute bottom-3 right-3 flex gap-2">
                        <button onClick={() => setIsZoomed(true)} className="bg-white/20 backdrop-blur-lg text-white p-2 rounded-full active:scale-90"><Maximize2 size={16}/></button>
                        <button onClick={() => setShowImage(false)} className="bg-white/20 backdrop-blur-lg text-white p-2 rounded-full active:scale-90"><ChevronUp size={16}/></button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowImage(true)} className="w-full h-full text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    <ChevronDown size={14} /> View Receipt Reference
                  </button>
                )}
              </div>
            )}

            <div className="space-y-4">
              {scanData.length === 0 && (
                <label className="mt-8 block cursor-pointer group h-64 border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-white flex flex-col items-center justify-center transition-all active:scale-95 hover:border-blue-200">
                  {loading ? <Loader2 className="w-12 h-12 text-blue-500 animate-spin" /> : (
                    <>
                      <Upload size={32} className="text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="font-black text-slate-400 uppercase tracking-tighter">Tap to Scan Receipt</p>
                    </>
                  )}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                </label>
              )}

              {scanData.map((tx, i) => (
                <div key={i} className={`bg-white rounded-[2rem] p-5 border shadow-sm transition-all ${tx.isDuplicate ? 'border-orange-200 bg-orange-50/20 ring-4 ring-orange-50' : 'border-slate-100'}`}>
                  {tx.isDuplicate && (
                    <div className="flex items-center justify-between mb-4 bg-orange-100/50 p-2 rounded-xl">
                      <span className="text-[10px] font-black text-orange-700 uppercase flex items-center gap-1"><Copy size={12}/> Duplicate?</span>
                      <button onClick={() => {const n = [...scanData]; n[i].isDuplicate = !n[i].isDuplicate; setScanData(n);}} 
                        className="text-[10px] font-bold bg-white px-2 py-1 rounded-lg text-orange-700 shadow-sm"><RefreshCcw size={10} className="inline mr-1"/>Keep</button>
                    </div>
                  )}
                  <div className="flex justify-between items-center mb-4">
                    <input type="date" className="text-xs font-bold text-slate-500 bg-slate-50 rounded-lg px-2 py-1" value={tx.date} onChange={e => updateScanField(i, 'date', e.target.value)} />
                    <button onClick={() => setScanData(scanData.filter((_, idx) => idx !== i))}><Trash2 size={16} className="text-slate-300" /></button>
                  </div>
                  <div className="flex items-center text-3xl font-mono font-bold text-slate-800 mb-6 tracking-tighter">
                    <span className="text-lg text-slate-300 mr-1 font-sans">Rp</span>
                    <input type="number" className="bg-transparent outline-none w-full" value={tx.total} onChange={e => updateScanField(i, 'total', Number(e.target.value))} />
                  </div>
                  <div className="space-y-3">
                    <div className="relative flex items-center bg-slate-50 rounded-xl px-3 py-3">
                      <Tag size={14} className="text-slate-400 mr-3" />
                      <input className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none" value={tx.expense} placeholder="Expense Name" onChange={e => updateScanField(i, 'expense', e.target.value)} />
                    </div>
                    <div className="relative flex items-center bg-slate-50 rounded-xl px-3 py-3">
                      <Store size={14} className="text-slate-400 mr-3" />
                      <input className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none" value={tx.to} placeholder="To (Merchant)" onChange={e => updateScanField(i, 'to', e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <select className="flex-[2] bg-slate-50 rounded-xl px-3 py-3 text-xs font-bold text-slate-600 outline-none" value={tx.category} onChange={e => updateScanField(i, 'category', e.target.value)}>
                        <option value="Food">🍔 Food</option><option value="Transport">🚗 Transport</option><option value="Wifi">📶 Wifi</option><option value="Insurance">🛡️ Insurance</option><option value="Rent">🏠 Rent</option><option value="Others">📦 Others</option>
                      </select>
                      <select className="flex-1 bg-slate-50 rounded-xl px-3 py-3 text-xs font-bold text-slate-600 outline-none" value={tx.by} onChange={e => updateScanField(i, 'by', e.target.value)}>
                        <option value="Kris">Kris</option><option value="Iven">Iven</option>
                      </select>
                    </div>
                    <input className="w-full text-center text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50/50 py-3 rounded-xl outline-none" value={tx.payment} onChange={e => updateScanField(i, 'payment', e.target.value)} placeholder="PAYMENT SOURCE (e.g. JAGO)" />
                    <input className="w-full text-xs font-medium text-slate-400 bg-transparent py-1 border-b border-dashed border-slate-200 outline-none italic" value={tx.remarks} onChange={e => updateScanField(i, 'remarks', e.target.value)} placeholder="Add remarks..." />
                  </div>
                </div>
              ))}

              {scanData.length > 0 && (
                <button onClick={saveToDatabase} disabled={loading} className="w-full bg-slate-900 py-4 rounded-2xl font-bold text-white shadow-xl active:scale-95 transition-all disabled:opacity-50 flex flex-col items-center">
                  {loading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <span>Record to Ledger</span>
                      <span className="text-[10px] opacity-40 uppercase tracking-widest font-black">Saving {scanData.filter(t => !t.isDuplicate).length} New Items</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-3">
             <div className="text-right px-2 pb-2 text-xs font-bold text-slate-400">Total: <span className="font-black text-slate-800 text-lg ml-1">{formatIDR(historyData.reduce((s,t)=>s+t.total,0))}</span></div>
             {historyData.map((tx) => (
               <div key={tx.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-2">
                 <div className="flex justify-between items-start">
                   <div className="flex-1">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{tx.date}</p>
                     <h3 className="font-bold text-slate-800 leading-tight">{tx.expense}</h3>
                     <p className="text-[11px] text-slate-500 font-medium mt-1">{tx.to} • <span className="text-blue-500 uppercase font-black text-[9px]">{tx.category}</span></p>
                   </div>
                   <div className="text-right">
                     <p className="font-mono font-bold text-slate-900 tracking-tighter">{formatIDR(tx.total)}</p>
                     <p className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded mt-2 inline-block uppercase">{tx.by} • {tx.payment}</p>
                   </div>
                 </div>
                 {tx.remarks && <p className="text-[10px] text-slate-400 italic bg-slate-50/50 p-2 rounded-lg">"{tx.remarks}"</p>}
               </div>
             ))}
          </div>
        )}

        {/* DASHBOARD TAB */}
        {activeTab === 'dash' && (
          <div className="space-y-6">
            <div className="bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100">
                <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Total Spending</p>
                <h2 className="text-3xl font-black tracking-tighter">{formatIDR(dashData.reduce((s, c) => s + c.total, 0))}</h2>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6">By Category</h3>
                <div className="space-y-6">
                    {dashData.map(cat => {
                        const total = dashData.reduce((s, c) => s + c.total, 0);
                        return (
                          <div key={cat.name}>
                              <div className="flex justify-between text-[11px] font-black mb-2 uppercase tracking-wide">
                                  <span className="text-slate-600">{cat.name}</span>
                                  <span className="text-slate-400">{total > 0 ? ((cat.total/total)*100).toFixed(1) : 0}%</span>
                              </div>
                              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${total > 0 ? (cat.total/total)*100 : 0}%` }}></div>
                              </div>
                              <p className="text-right text-[10px] font-mono font-bold text-slate-400 mt-1.5">{formatIDR(cat.total)}</p>
                          </div>
                        )
                    })}
                </div>
            </div>
          </div>
        )}

      </main>

      {/* BOTTOM NAV BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-10 pt-3 px-8 z-50">
        <div className="max-w-lg mx-auto flex justify-between">
          <button onClick={() => setActiveTab('scan')} className={`flex flex-col items-center transition-all ${activeTab === 'scan' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}><ScanLine size={24} strokeWidth={activeTab === 'scan' ? 3 : 2} /><span className="text-[9px] font-black mt-1 uppercase">Scan</span></button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center transition-all ${activeTab === 'history' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}><LayoutList size={24} strokeWidth={activeTab === 'history' ? 3 : 2} /><span className="text-[9px] font-black mt-1 uppercase">Ledger</span></button>
          <button onClick={() => setActiveTab('dash')} className={`flex flex-col items-center transition-all ${activeTab === 'dash' ? 'text-blue-600 scale-110' : 'text-slate-300'}`}><PieChart size={24} strokeWidth={activeTab === 'dash' ? 3 : 2} /><span className="text-[9px] font-black mt-1 uppercase">Dash</span></button>
        </div>
      </div>
    </div>
  );
}