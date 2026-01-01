import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Upload, CheckCircle2, Trash2, Loader2,
  Tag, User, Store, LayoutList, ScanLine, 
  ArrowRight, Copy, RefreshCcw, PieChart, 
  ChevronDown, ChevronUp, Maximize2, X, Edit3, Ban, Save
} from 'lucide-react';

const BACKEND_URL = `http://localhost:3000`; 

interface Transaction {
  id?: number; date: string; expense: string; to: string; category: string;
  total: number; payment: string; by: string; remarks: string;
  isExcluded?: boolean; isDuplicate?: boolean;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'dash'>('scan');
  const [loading, setLoading] = useState(false);
  const [scanData, setScanData] = useState<Transaction[]>([]);
  const [historyData, setHistoryData] = useState<Transaction[]>([]);
  const [dashData, setDashData] = useState<{name: string, total: number}[]>([]);
  const [defaultUser, setDefaultUser] = useState("Kris");
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);

  const [dateFilter, setDateFilter] = useState({ 
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
    end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0] 
  });

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

  const updateHistoryItem = async (item: Transaction) => {
    try {
      await axios.put(`${BACKEND_URL}/transactions/${item.id}`, item);
      setEditingId(null);
      fetchTabData();
    } catch (err) { alert("Update failed"); }
  };

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
        ...item, by: defaultUser, remarks: "", isExcluded: false,
        isDuplicate: dupRes.data[idx].exists
      })));
    } catch (err) { alert("Error processing image."); } finally { setLoading(false); }
  };

  const saveToDatabase = async () => {
    const itemsToSave = scanData.filter(tx => !tx.isDuplicate);
    if (!itemsToSave.length) return;
    try {
      setLoading(true);
      await axios.post(`${BACKEND_URL}/transactions/confirm`, itemsToSave);
      setScanData([]); setPreviewImage(null); setActiveTab('history');
    } catch (err) { alert("Save failed."); } finally { setLoading(false); }
  };

  const formatIDR = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className={`min-h-screen bg-[#F8F9FD] text-slate-900 pb-32 font-sans ${isZoomed ? 'overflow-hidden' : ''}`}>
      
      {/* LIGHTBOX */}
      {isZoomed && previewImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
          <button onClick={() => setIsZoomed(false)} className="absolute top-6 right-6 bg-white/10 text-white p-3 rounded-full backdrop-blur-md active:scale-90"><X size={24} /></button>
          <img src={previewImage} alt="Full Receipt" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
        </div>
      )}

      {/* HEADER */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex justify-between items-center shadow-sm">
        <h1 className="text-xl font-black text-blue-600 tracking-tight">EXP_PRO</h1>
        <select className="bg-slate-100 text-xs font-bold px-3 py-1.5 rounded-xl border-none outline-none text-slate-600"
          value={defaultUser} onChange={(e) => setDefaultUser(e.target.value)}>
          <option value="Kris">👤 Kris</option>
          <option value="Iven">👤 Iven</option>
        </select>
      </nav>

      <main className="max-w-lg mx-auto p-4">
        
        {activeTab !== 'scan' && (
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-4 sticky top-[72px] z-20">
            <div className="flex items-center gap-2">
              <input type="date" className="flex-1 text-xs font-bold bg-slate-50 rounded-xl p-2.5 outline-none" value={dateFilter.start} onChange={e => setDateFilter({...dateFilter, start: e.target.value})} />
              <ArrowRight size={14} className="text-slate-300" />
              <input type="date" className="flex-1 text-xs font-bold bg-slate-50 rounded-xl p-2.5 outline-none" value={dateFilter.end} onChange={e => setDateFilter({...dateFilter, end: e.target.value})} />
            </div>
          </div>
        )}

        {/* SCAN TAB */}
        {activeTab === 'scan' && (
           <div className="space-y-4">
              {previewImage && scanData.length > 0 && (
                <div className={`transition-all duration-300 ${showImage ? 'h-64' : 'h-12'} bg-slate-900 sticky top-[70px] z-40 overflow-hidden rounded-[2rem] shadow-xl mb-4`}>
                  {showImage ? (
                    <div className="relative h-full w-full flex items-center justify-center">
                      <img src={previewImage} alt="Receipt" className="h-full object-contain" />
                      <div className="absolute bottom-3 right-3 flex gap-2">
                          <button onClick={() => setIsZoomed(true)} className="bg-white/20 backdrop-blur-lg text-white p-2 rounded-full"><Maximize2 size={16}/></button>
                          <button onClick={() => setShowImage(false)} className="bg-white/20 backdrop-blur-lg text-white p-2 rounded-full"><ChevronUp size={16}/></button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowImage(true)} className="w-full h-full text-white text-[10px] font-black uppercase flex items-center justify-center gap-2"><ChevronDown size={14} /> View Reference</button>
                  )}
                </div>
              )}
              
              {scanData.map((tx, i) => (
                <div key={i} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm space-y-4">
                   <div className="flex justify-between items-center">
                    <input type="date" className="text-xs font-bold bg-slate-50 p-2 rounded-lg" value={tx.date} onChange={e => {const n=[...scanData]; n[i].date=e.target.value; setScanData(n);}} />
                    <button onClick={() => setScanData(scanData.filter((_, idx) => idx !== i))}><Trash2 size={16} className="text-slate-300" /></button>
                  </div>
                  <div className="flex items-center text-3xl font-mono font-bold text-slate-800 tracking-tighter">
                    <span className="text-lg text-slate-300 mr-1 font-sans">Rp</span>
                    <input type="number" className="bg-transparent outline-none w-full" value={tx.total} onChange={e => {const n=[...scanData]; n[i].total=Number(e.target.value); setScanData(n);}} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center bg-slate-50 rounded-xl px-3 py-3"><Tag size={14} className="text-slate-400 mr-3"/><input className="bg-transparent text-sm font-bold w-full outline-none" value={tx.expense} onChange={e => {const n=[...scanData]; n[i].expense=e.target.value; setScanData(n);}} /></div>
                    <div className="flex items-center bg-slate-50 rounded-xl px-3 py-3"><Store size={14} className="text-slate-400 mr-3"/><input className="bg-transparent text-sm font-bold w-full outline-none" value={tx.to} onChange={e => {const n=[...scanData]; n[i].to=e.target.value; setScanData(n);}} /></div>
                  </div>
                </div>
              ))}
              {scanData.length === 0 ? (
                <label className="mt-8 block cursor-pointer group h-64 border-4 border-dashed border-slate-200 rounded-[2.5rem] bg-white flex flex-col items-center justify-center transition-all active:scale-95">
                  {loading ? <Loader2 className="animate-spin text-blue-500" /> : <><Upload size={32} className="text-blue-600 mb-2"/><p className="font-black text-slate-400 uppercase text-xs">Tap to Scan</p></>}
                  <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                </label>
              ) : (
                <button onClick={saveToDatabase} className="w-full bg-slate-900 py-4 rounded-2xl font-bold text-white shadow-xl">Record {scanData.length} Items</button>
              )}
           </div>
        )}

        {/* LEDGER TAB */}
        {activeTab === 'history' && (
          <div className="space-y-3">
             <div className="text-right px-2 pb-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
               Effective Total: <span className="font-black text-slate-800 text-lg ml-1">{formatIDR(historyData.filter(t => !t.isExcluded).reduce((s,t)=>s+t.total,0))}</span>
             </div>
             {historyData.map((tx) => (
               <div key={tx.id} className={`bg-white p-5 rounded-[2rem] border transition-all ${tx.isExcluded ? 'border-red-100 bg-red-50/20 grayscale' : 'border-slate-100 shadow-sm'}`}>
                 {editingId === tx.id ? (
                   /* FULL EDITING STATE */
                   <div className="space-y-3">
                      <div className="flex gap-2">
                        <input className="flex-1 text-xs font-bold bg-slate-50 p-2 rounded-lg" type="date" value={tx.date} onChange={e => {const n=[...historyData]; n[n.findIndex(x=>x.id===tx.id)].date=e.target.value; setHistoryData(n);}} />
                        <select className="flex-1 text-xs font-bold bg-slate-50 p-2 rounded-lg" value={tx.category} onChange={e => {const n=[...historyData]; n[n.findIndex(x=>x.id===tx.id)].category=e.target.value; setHistoryData(n);}}>
                            <option value="Food">Food</option><option value="Transport">Transport</option><option value="Wifi">Wifi</option><option value="Insurance">Insurance</option><option value="Rent">Rent</option><option value="Others">Others</option>
                        </select>
                      </div>
                      <div className="flex items-center text-2xl font-mono font-bold bg-slate-50 p-3 rounded-xl">
                        <span className="text-sm text-slate-300 mr-2">Rp</span>
                        <input className="w-full bg-transparent outline-none" type="number" value={tx.total} onChange={e => {const n=[...historyData]; n[n.findIndex(x=>x.id===tx.id)].total=Number(e.target.value); setHistoryData(n);}} />
                      </div>
                      <input className="w-full font-bold bg-slate-50 p-3 rounded-xl outline-none text-sm" placeholder="Expense Name" value={tx.expense} onChange={e => {const n=[...historyData]; n[n.findIndex(x=>x.id===tx.id)].expense=e.target.value; setHistoryData(n);}} />
                      <input className="w-full font-bold bg-slate-50 p-3 rounded-xl outline-none text-sm" placeholder="To (Merchant)" value={tx.to} onChange={e => {const n=[...historyData]; n[n.findIndex(x=>x.id===tx.id)].to=e.target.value; setHistoryData(n);}} />
                      <div className="flex gap-2">
                        <input className="flex-1 text-xs font-bold bg-slate-50 p-3 rounded-xl outline-none" placeholder="Payment Source" value={tx.payment} onChange={e => {const n=[...historyData]; n[n.findIndex(x=>x.id===tx.id)].payment=e.target.value; setHistoryData(n);}} />
                        <select className="flex-1 text-xs font-bold bg-slate-50 p-3 rounded-xl" value={tx.by} onChange={e => {const n=[...historyData]; n[n.findIndex(x=>x.id===tx.id)].by=e.target.value; setHistoryData(n);}}>
                            <option value="Kris">Kris</option><option value="Iven">Iven</option>
                        </select>
                      </div>
                      <textarea className="w-full text-xs bg-slate-50 p-3 rounded-xl outline-none" placeholder="Remarks" value={tx.remarks} onChange={e => {const n=[...historyData]; n[n.findIndex(x=>x.id===tx.id)].remarks=e.target.value; setHistoryData(n);}} />
                      <div className="flex gap-2 pt-2">
                        <button onClick={() => updateHistoryItem(tx)} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Save size={16}/> Save</button>
                        <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-200 font-bold py-3 rounded-xl">Cancel</button>
                      </div>
                   </div>
                 ) : (
                   /* VIEW STATE (YOUR ORIGINAL INFO LAYOUT) */
                   <div className="flex flex-col gap-2">
                     <div className="flex justify-between items-start">
                       <div className="flex-1">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                           {tx.date} {tx.isExcluded && <span className="text-red-500">• EXCLUDED</span>}
                         </p>
                         <h3 className="font-bold text-slate-800 leading-tight">{tx.expense}</h3>
                         <p className="text-[11px] text-slate-500 font-medium mt-1">
                           {tx.to} • <span className="text-blue-500 uppercase font-black text-[9px]">{tx.category}</span>
                         </p>
                       </div>
                       <div className="text-right">
                         <p className={`font-mono font-bold tracking-tighter ${tx.isExcluded ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                           {formatIDR(tx.total)}
                         </p>
                         <div className="flex justify-end gap-2 mt-2 items-center">
                           <button onClick={() => setEditingId(tx.id)} className="text-slate-300 hover:text-blue-500 p-1"><Edit3 size={14}/></button>
                           <button onClick={() => updateHistoryItem({...tx, isExcluded: !tx.isExcluded})} className={`${tx.isExcluded ? 'text-red-500' : 'text-slate-300'} p-1`}><Ban size={14}/></button>
                         </div>
                       </div>
                     </div>
                     
                     <div className="flex justify-between items-center mt-1">
                        <p className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase">{tx.by} • {tx.payment}</p>
                     </div>

                     {tx.remarks && <p className="text-[10px] text-slate-400 italic bg-slate-50/50 p-2 rounded-lg mt-1">"{tx.remarks}"</p>}
                   </div>
                 )}
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

      {/* FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-10 pt-3 px-8 z-50">
        <div className="max-w-lg mx-auto flex justify-between">
          <button onClick={() => setActiveTab('scan')} className={`flex flex-col items-center transition-all ${activeTab === 'scan' ? 'text-blue-600' : 'text-slate-300'}`}><ScanLine size={24} /><span className="text-[9px] font-black mt-1 uppercase">Scan</span></button>
          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center transition-all ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-300'}`}><LayoutList size={24} /><span className="text-[9px] font-black mt-1 uppercase">Ledger</span></button>
          <button onClick={() => setActiveTab('dash')} className={`flex flex-col items-center transition-all ${activeTab === 'dash' ? 'text-blue-600' : 'text-slate-300'}`}><PieChart size={24} /><span className="text-[9px] font-black mt-1 uppercase">Dash</span></button>
        </div>
      </div>
    </div>
  );
}