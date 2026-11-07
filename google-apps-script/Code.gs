/**
 * NUCARE API — Google Apps Script
 * Spreadsheet schema is created by initializeDatabase().
 * Set Script Properties: SPREADSHEET_ID and INITIAL_ADMIN_PASSWORD before setup.
 */
const SHEETS = {
  USERS: ["id","username","passwordHash","salt","name","role","status","createdAt"],
  PENYUMBANG: ["id","name","rt","address","phone","status","createdAt","updatedAt","updatedBy"],
  TRANSAKSI: ["id","donorId","year","month","amount","note","updatedAt","updatedBy"],
  RT: ["name","status","createdAt"],
  PENYALURAN: ["id","date","recipient","category","amount","description","createdAt","createdBy"],
  KEGIATAN: ["id","date","name","description","status","createdAt","createdBy"],
  CONFIG: ["key","value"]
};
const TOKEN_TTL_SECONDS = 21600;

function initializeDatabase() {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty("SPREADSHEET_ID");
  const initialPassword = props.getProperty("INITIAL_ADMIN_PASSWORD");
  if (!spreadsheetId) throw new Error("Isi Script Property SPREADSHEET_ID terlebih dahulu.");
  if (!initialPassword || initialPassword.length < 10) throw new Error("Isi INITIAL_ADMIN_PASSWORD minimal 10 karakter.");
  const ss = SpreadsheetApp.openById(spreadsheetId);
  Object.keys(SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.getRange(1,1,1,SHEETS[name].length).setValues([SHEETS[name]]);
    sh.setFrozenRows(1);
  });
  const users = ss.getSheetByName("USERS");
  if (users.getLastRow() < 2) {
    const salt = Utilities.getUuid();
    users.appendRow([id_(), "admin", hash_(initialPassword, salt), salt, "Administrator", "ADMIN", "AKTIF", new Date()]);
  }
  const rt = ss.getSheetByName("RT");
  if (rt.getLastRow() < 2) rt.appendRow(["RT 01","AKTIF",new Date()]);
  Logger.log("NUCARE database initialized.");
}

function doGet() {
  return json_({ok:true,data:{service:"NUCARE API",status:"online"}});
}

function doPost(e) {
  try {
    const body = JSON.parse((e.postData && e.postData.contents) || "{}");
    const action = String(body.action || "");
    let result;
    if (action === "login") result = login_(body.username, body.password);
    else {
      const user = requireUser_(body.token);
      if (action === "me") result = publicUser_(user);
      else if (action === "logout") { CacheService.getScriptCache().remove("session_"+body.token); result = true; }
      else if (action === "dashboard") result = dashboard_(Number(body.year), Number(body.month));
      else if (action === "listDonors") result = list_("PENYUMBANG").map(publicDonor_);
      else if (action === "saveDonor") result = saveDonor_(body.donor, user);
      else if (action === "deleteDonor") { requireAdmin_(user); result = deleteDonor_(String(body.id)); }
      else if (action === "listTransactions") result = listTransactions_(Number(body.year));
      else if (action === "saveTransaction") result = saveTransaction_(body.transaction, user);
      else if (action === "listRT") result = list_("RT").filter(r=>r.status==="AKTIF").map(r=>r.name);
      else if (action === "saveRT") { requireAdmin_(user); result = saveRT_(String(body.name || "")); }
      else throw new Error("Aksi tidak dikenal.");
    }
    return json_({ok:true,data:result});
  } catch (err) {
    return json_({ok:false,error:err && err.message ? err.message : "Terjadi kesalahan."});
  }
}

function login_(username, password) {
  const u = list_("USERS").find(x => String(x.username).toLowerCase() === String(username || "").trim().toLowerCase());
  if (!u || u.status !== "AKTIF" || hash_(String(password || ""), u.salt) !== u.passwordHash) throw new Error("Username atau password salah.");
  const token = Utilities.getUuid()+"-"+Utilities.getUuid();
  const sessionUser = {id:u.id,username:u.username,name:u.name,role:u.role};
  CacheService.getScriptCache().put("session_"+token, JSON.stringify(sessionUser), TOKEN_TTL_SECONDS);
  return {token:token,user:sessionUser};
}
function requireUser_(token) {
  if (!token) throw new Error("Sesi berakhir. Silakan login kembali.");
  const raw = CacheService.getScriptCache().get("session_"+token);
  if (!raw) throw new Error("Sesi berakhir. Silakan login kembali.");
  return JSON.parse(raw);
}
function requireAdmin_(user) { if (user.role !== "ADMIN") throw new Error("Akses hanya untuk administrator."); }
function publicUser_(u) { return {username:u.username,name:u.name,role:u.role}; }

function saveDonor_(d, user) {
  if (!d || !String(d.name || "").trim() || !String(d.rt || "").trim()) throw new Error("Nama dan RT wajib diisi.");
  const sh = sheet_("PENYUMBANG"), rows = list_("PENYUMBANG"), now = new Date();
  const id = d.id || id_();
  const old = rows.find(x=>x.id===id);
  const row = [id,String(d.name).trim(),String(d.rt).trim(),String(d.address||"").trim(),String(d.phone||"").trim(),d.status==="NONAKTIF"?"NONAKTIF":"AKTIF",old?old.createdAt:now,now,user.username];
  if (old) sh.getRange(old._row,1,1,row.length).setValues([row]); else sh.appendRow(row);
  return publicDonor_(Object.fromEntries(SHEETS.PENYUMBANG.map((k,i)=>[k,row[i]])));
}
function publicDonor_(d) { return {id:d.id,name:d.name,rt:d.rt,address:d.address,phone:d.phone,status:d.status,createdAt:d.createdAt,updatedAt:d.updatedAt}; }
function deleteDonor_(id) {
  const sh=sheet_("PENYUMBANG"), d=list_("PENYUMBANG").find(x=>x.id===id);
  if (!d) throw new Error("Data penyumbang tidak ditemukan.");
  if (list_("TRANSAKSI").some(t=>t.donorId===id)) throw new Error("Penyumbang memiliki transaksi. Ubah status menjadi NONAKTIF, jangan hapus.");
  sh.deleteRow(d._row); return true;
}
function saveTransaction_(t,user) {
  if (!t || !t.donorId) throw new Error("Pilih penyumbang.");
  const year=Number(t.year), month=Number(t.month), amount=Number(t.amount);
  const currentYear=new Date().getFullYear();
  if (![currentYear,currentYear-1].includes(year)) throw new Error("Hanya tahun berjalan dan tahun sebelumnya yang dapat dicatat.");
  if (month<1 || month>12 || !Number.isFinite(month)) throw new Error("Bulan tidak valid.");
  if (!Number.isFinite(amount) || amount<0) throw new Error("Nominal tidak valid.");
  if (!list_("PENYUMBANG").some(d=>d.id===t.donorId)) throw new Error("Penyumbang tidak ditemukan.");
  const sh=sheet_("TRANSAKSI"), rows=list_("TRANSAKSI");
  const old=rows.find(x=>x.donorId===t.donorId && Number(x.year)===year && Number(x.month)===month);
  const row=[old?old.id:id_(),t.donorId,year,month,amount,String(t.note||""),new Date(),user.username];
  if(old) sh.getRange(old._row,1,1,row.length).setValues([row]); else sh.appendRow(row);
  return {id:row[0],donorId:row[1],year:row[2],month:row[3],amount:row[4],note:row[5],updatedAt:row[6]};
}
function listTransactions_(year) {
  const currentYear=new Date().getFullYear();
  if (![currentYear,currentYear-1].includes(year)) throw new Error("Periode tidak tersedia.");
  return list_("TRANSAKSI").filter(t=>Number(t.year)===year).map(t=>({id:t.id,donorId:t.donorId,year:Number(t.year),month:Number(t.month),amount:Number(t.amount),note:t.note,updatedAt:t.updatedAt}));
}
function dashboard_(year,month) {
  const donors=list_("PENYUMBANG"), tx=list_("TRANSAKSI");
  const currentYear=new Date().getFullYear();
  if (![currentYear,currentYear-1].includes(year) || month<1 || month>12) throw new Error("Periode tidak valid.");
  const annual=tx.filter(t=>Number(t.year)===year);
  return {
    donorCount:donors.length,
    activeDonorCount:donors.filter(d=>d.status==="AKTIF").length,
    monthlyTotal:annual.filter(t=>Number(t.month)===month).reduce((s,t)=>s+Number(t.amount||0),0),
    annualTotal:annual.reduce((s,t)=>s+Number(t.amount||0),0),
    distributionTotal:list_("PENYALURAN").filter(x=>new Date(x.date).getFullYear()===year).reduce((s,x)=>s+Number(x.amount||0),0)
  };
}
function saveRT_(name) {
  name=name.trim().toUpperCase();
  if(!name) throw new Error("Nama RT wajib diisi.");
  const rows=list_("RT");
  if(rows.some(r=>String(r.name).toUpperCase()===name)) throw new Error("RT sudah terdaftar.");
  sheet_("RT").appendRow([name,"AKTIF",new Date()]);
  return name;
}
function list_(name) {
  const sh=sheet_(name), values=sh.getDataRange().getValues();
  if(values.length<2) return [];
  const headers=values[0];
  return values.slice(1).map((r,i)=>{const o={_row:i+2};headers.forEach((h,j)=>o[h]=r[j]);return o;}).filter(o=>o[headers[0]]!=="");
}
function sheet_(name) {
  const id=PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if(!id) throw new Error("SPREADSHEET_ID belum dikonfigurasi.");
  const sh=SpreadsheetApp.openById(id).getSheetByName(name);
  if(!sh) throw new Error("Sheet "+name+" belum tersedia. Jalankan initializeDatabase().");
  return sh;
}
function hash_(value,salt) {
  const bytes=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(salt)+"|"+String(value),Utilities.Charset.UTF_8);
  return bytes.map(b=>(b+256)%256).map(b=>("0"+b.toString(16)).slice(-2)).join("");
}
function id_() { return Utilities.getUuid(); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
