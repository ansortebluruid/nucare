import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownToLine, CircleDollarSign, HeartHandshake, LayoutDashboard, LogOut, Plus, Search, Users, X } from "lucide-react";
import { api } from "./services/api";
import type { DashboardSummary, Donor, MonthlyTransaction, User } from "./types";

const monthNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const money = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

function Login({ onLogin }: { onLogin: (u: User) => void }) {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { onLogin(await api.login(username, password)); }
    catch (err) { setError(err instanceof Error ? err.message : "Login gagal."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen grid place-items-center bg-slate-100 p-4">
    <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-nucare-700 text-white"><HeartHandshake size={30}/></div>
      <h1 className="text-center text-2xl font-bold text-slate-900">NUCARE</h1>
      <p className="mb-7 text-center text-sm text-slate-500">Sistem Pendataan NU Care LAZISNU</p>
      <label className="field-label">Username</label>
      <input className="field mb-4" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" required />
      <label className="field-label">Password</label>
      <input className="field mb-5" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required />
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="btn-primary w-full">{busy ? "Memeriksa..." : "Masuk"}</button>
    </form>
  </main>;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<"dashboard"|"donors"|"transactions"|"reports">("dashboard");
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [transactions, setTransactions] = useState<MonthlyTransaction[]>([]);
  const [rtList, setRtList] = useState<string[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()+1);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [showDonorForm, setShowDonorForm] = useState(false);
  const [editing, setEditing] = useState<Donor | null>(null);
  const [donorForm, setDonorForm] = useState({ name:"", rt:"", address:"", phone:"", status:"AKTIF" as "AKTIF"|"NONAKTIF" });
  const [txForm, setTxForm] = useState({ donorId:"", month: new Date().getMonth()+1, amount:"", note:"" });

  useEffect(() => { api.me().then(setUser).catch(()=>sessionStorage.removeItem("nucare_session")).finally(()=>setLoading(false)); }, []);
  async function refresh() {
    setError("");
    try {
      const [s,d,t,r] = await Promise.all([api.dashboard(year, month), api.donors(), api.transactions(year), api.rtList()]);
      setSummary(s); setDonors(d); setTransactions(t); setRtList(r);
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal memuat data."); }
  }
  useEffect(() => { if (user) void refresh(); }, [user, year, month]);
  const filtered = useMemo(()=>donors.filter(d => `${d.name} ${d.rt} ${d.address}`.toLowerCase().includes(search.toLowerCase())),[donors,search]);
  const txByDonor = (id: string, m: number) => transactions.find(t=>t.donorId===id && t.month===m);
  async function saveDonor(e: React.FormEvent) {
    e.preventDefault();
    try { await api.saveDonor({ ...donorForm, id: editing?.id }); setShowDonorForm(false); setEditing(null); setDonorForm({name:"",rt:"",address:"",phone:"",status:"AKTIF"}); await refresh(); }
    catch(e) { setError(e instanceof Error ? e.message : "Gagal menyimpan."); }
  }
  async function removeDonor(id: string) {
    if (!confirm("Hapus data penyumbang ini?")) return;
    try { await api.deleteDonor(id); await refresh(); } catch(e) { setError(e instanceof Error ? e.message : "Gagal menghapus."); }
  }
  async function saveTx(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.saveTransaction({ donorId: txForm.donorId, year, month: txForm.month, amount: Number(txForm.amount), note: txForm.note });
      setTxForm({donorId:"",month,amount:"",note:""}); await refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Gagal menyimpan transaksi."); }
  }
  function exportCsv() {
    const rows = [["Nama","RT",...monthNames,"Total"]];
    for (const d of donors) {
      const amounts = monthNames.map((_,i)=>txByDonor(d.id,i+1)?.amount ?? "");
      const total = amounts.reduce<number>((a,v)=>a+(Number(v)||0),0);
      rows.push([d.name,d.rt,...amounts.map(String),String(total)]);
    }
    const csv = "\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})); a.download=`nucare-${year}.csv`; a.click(); URL.revokeObjectURL(a.href);
  }
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-500">Memuat NUCARE...</div>;
  if (!user) return <Login onLogin={setUser}/>;
  const nav = [{id:"dashboard",label:"Dashboard",icon:LayoutDashboard},{id:"donors",label:"Data Penyumbang",icon:Users},{id:"transactions",label:"Transaksi Bulanan",icon:CircleDollarSign},{id:"reports",label:"Laporan",icon:Activity}] as const;

  return <div className="min-h-screen bg-slate-50 md:flex">
    <aside className="bg-nucare-800 p-5 text-white md:min-h-screen md:w-64">
      <div className="mb-9 flex items-center gap-3"><div className="rounded-xl bg-white/15 p-2"><HeartHandshake/></div><div><b className="text-lg">NUCARE</b><p className="text-xs text-emerald-100">Data Management</p></div></div>
      <nav className="flex gap-2 overflow-x-auto md:flex-col">{nav.map(n=><button key={n.id} onClick={()=>setPage(n.id)} className={`flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm ${page===n.id?"bg-white text-nucare-800":"text-emerald-50 hover:bg-white/10"}`}><n.icon size={18}/>{n.label}</button>)}</nav>
      <div className="mt-8 hidden border-t border-white/15 pt-5 md:block"><p className="text-sm font-semibold">{user.name}</p><p className="text-xs text-emerald-100">{user.role}</p><button onClick={async()=>{await api.logout();setUser(null)}} className="mt-4 flex items-center gap-2 text-sm text-emerald-100"><LogOut size={16}/> Keluar</button></div>
    </aside>
    <main className="min-w-0 flex-1 p-4 md:p-8">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-slate-500">NU Care LAZISNU</p><h1 className="text-2xl font-bold text-slate-900">{nav.find(n=>n.id===page)?.label}</h1></div><div className="flex items-center gap-2"><select className="field w-auto" value={year} onChange={e=>setYear(Number(e.target.value))}>{[new Date().getFullYear(),new Date().getFullYear()-1].map(y=><option key={y}>{y}</option>)}</select><button className="btn-secondary" onClick={exportCsv}><ArrowDownToLine size={16}/> Export CSV</button></div></header>
      {error && <div className="mb-5 flex items-center justify-between rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}<button onClick={()=>setError("")}><X size={16}/></button></div>}
      {page==="dashboard" && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{label:"Total Penyumbang",value:summary?.donorCount??0,icon:Users},{label:"Penyumbang Aktif",value:summary?.activeDonorCount??0,icon:HeartHandshake},{label:`Penghimpunan ${monthNames[month-1]}`,value:money(summary?.monthlyTotal??0),icon:CircleDollarSign},{label:`Penghimpunan ${year}`,value:money(summary?.annualTotal??0),icon:Activity}].map(c=><div className="panel" key={c.label}><c.icon className="mb-3 text-nucare-600"/><p className="text-sm text-slate-500">{c.label}</p><p className="mt-1 text-2xl font-bold">{c.value}</p></div>)}
      </div><div className="panel mt-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Ringkasan bulanan</h2><select className="field w-auto" value={month} onChange={e=>setMonth(Number(e.target.value))}>{monthNames.map((m,i)=><option value={i+1} key={m}>{m}</option>)}</select></div><p className="text-3xl font-bold text-nucare-700">{money(summary?.monthlyTotal??0)}</p><p className="mt-1 text-sm text-slate-500">Total sumbangan tercatat pada {monthNames[month-1]} {year}.</p></div></>}
      {page==="donors" && <section className="panel"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input className="field pl-10" placeholder="Cari nama, RT, alamat..." value={search} onChange={e=>setSearch(e.target.value)}/></div><button className="btn-primary" onClick={()=>{setEditing(null);setDonorForm({name:"",rt:rtList[0]||"",address:"",phone:"",status:"AKTIF"});setShowDonorForm(true)}}><Plus size={17}/> Tambah Penyumbang</button></div>
        <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Nama</th><th>RT</th><th>Alamat</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{filtered.map(d=><tr key={d.id}><td className="font-medium">{d.name}</td><td>{d.rt}</td><td>{d.address||"-"}</td><td>{d.status}</td><td><div className="flex gap-2"><button className="text-sm text-nucare-700" onClick={()=>{setEditing(d);setDonorForm({name:d.name,rt:d.rt,address:d.address,phone:d.phone,status:d.status});setShowDonorForm(true)}}>Edit</button>{user.role==="ADMIN"&&<button className="text-sm text-red-600" onClick={()=>void removeDonor(d.id)}>Hapus</button>}</div></td></tr>)}</tbody></table>{filtered.length===0&&<p className="p-8 text-center text-sm text-slate-500">Belum ada data penyumbang.</p>}</div>
      </section>}
      {page==="transactions" && <div className="grid gap-5 xl:grid-cols-[360px_1fr]"><form onSubmit={saveTx} className="panel h-fit"><h2 className="mb-4 font-semibold">Input nominal bulanan</h2><label className="field-label">Penyumbang</label><select className="field mb-3" required value={txForm.donorId} onChange={e=>setTxForm({...txForm,donorId:e.target.value})}><option value="">Pilih penyumbang</option>{donors.filter(d=>d.status==="AKTIF").map(d=><option value={d.id} key={d.id}>{d.name} — {d.rt}</option>)}</select><label className="field-label">Bulan</label><select className="field mb-3" value={txForm.month} onChange={e=>setTxForm({...txForm,month:Number(e.target.value)})}>{monthNames.map((m,i)=><option value={i+1} key={m}>{m}</option>)}</select><label className="field-label">Nominal (Rp)</label><input className="field mb-3" type="number" min="0" step="1" required value={txForm.amount} onChange={e=>setTxForm({...txForm,amount:e.target.value})}/><label className="field-label">Catatan</label><input className="field mb-4" value={txForm.note} onChange={e=>setTxForm({...txForm,note:e.target.value})}/><button className="btn-primary w-full">Simpan transaksi</button><p className="mt-3 text-xs text-slate-500">Satu nominal per penyumbang per bulan. Jika periode sudah ada, data akan diperbarui.</p></form>
        <section className="panel"><h2 className="mb-4 font-semibold">Rekap {year}</h2><div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Nama</th><th>RT</th>{monthNames.map(m=><th key={m}>{m.slice(0,3)}</th>)}<th>Total</th></tr></thead><tbody>{donors.map(d=>{const vals=monthNames.map((_,i)=>txByDonor(d.id,i+1)?.amount??0);return <tr key={d.id}><td className="whitespace-nowrap font-medium">{d.name}</td><td>{d.rt}</td>{vals.map((v,i)=><td key={i}>{v?new Intl.NumberFormat("id-ID").format(v):"—"}</td>)}<td className="font-semibold">{new Intl.NumberFormat("id-ID").format(vals.reduce((a,b)=>a+b,0))}</td></tr>})}</tbody></table></div></section></div>}
      {page==="reports" && <section className="panel"><h2 className="mb-2 font-semibold">Export laporan</h2><p className="mb-5 text-sm text-slate-500">Unduh rekap penyumbang dan nominal Januari–Desember untuk tahun {year}. File CSV dapat dibuka di Microsoft Excel atau Google Sheets.</p><button className="btn-primary" onClick={exportCsv}><ArrowDownToLine size={17}/> Unduh rekap {year}</button></section>}
    </main>
    {showDonorForm&&<div className="fixed inset-0 z-20 grid place-items-center bg-slate-900/40 p-4"><form onSubmit={saveDonor} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex justify-between"><h2 className="text-lg font-bold">{editing?"Edit":"Tambah"} Penyumbang</h2><button type="button" onClick={()=>setShowDonorForm(false)}><X/></button></div><label className="field-label">Nama lengkap</label><input className="field mb-3" required value={donorForm.name} onChange={e=>setDonorForm({...donorForm,name:e.target.value})}/><label className="field-label">RT</label><select className="field mb-3" required value={donorForm.rt} onChange={e=>setDonorForm({...donorForm,rt:e.target.value})}><option value="">Pilih RT</option>{rtList.map(r=><option key={r}>{r}</option>)}</select><label className="field-label">Alamat</label><input className="field mb-3" value={donorForm.address} onChange={e=>setDonorForm({...donorForm,address:e.target.value})}/><label className="field-label">Nomor HP (opsional)</label><input className="field mb-3" value={donorForm.phone} onChange={e=>setDonorForm({...donorForm,phone:e.target.value})}/><label className="field-label">Status</label><select className="field mb-5" value={donorForm.status} onChange={e=>setDonorForm({...donorForm,status:e.target.value as "AKTIF"|"NONAKTIF"})}><option value="AKTIF">Aktif</option><option value="NONAKTIF">Nonaktif</option></select><button className="btn-primary w-full">Simpan</button></form></div>}
  </div>;
}
