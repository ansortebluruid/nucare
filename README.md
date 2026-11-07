# NUCARE — Starter Project

Starter aplikasi pendataan NU Care LAZISNU:
- React + Vite + TypeScript
- Tailwind CSS
- Google Sheets melalui Google Apps Script
- Login multi-akun (starter menyediakan login; pembuatan akun operator perlu ditambahkan pada tahap berikutnya)
- Data penyumbang, transaksi satu nominal per bulan, dashboard, pencarian, rekap CSV
- Periode transaksi dibatasi ke tahun berjalan dan tahun sebelumnya

## A. Siapkan Google Sheets

1. Buat Google Spreadsheet baru, misalnya `NUCARE_DATABASE`.
2. Salin Spreadsheet ID dari URL: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`.
3. Buka Extensions → Apps Script.
4. Salin seluruh isi `google-apps-script/Code.gs` ke editor Apps Script.
5. Buka Project Settings → Script Properties, tambahkan:
   - `SPREADSHEET_ID` = ID spreadsheet Anda
   - `INITIAL_ADMIN_PASSWORD` = password awal admin (minimal 10 karakter)
6. Jalankan fungsi `initializeDatabase` dari editor Apps Script dan setujui izin yang diminta.
7. Periksa bahwa sheet USERS, PENYUMBANG, TRANSAKSI, RT, PENYALURAN, KEGIATAN, CONFIG sudah dibuat.
8. Hapus nilai `INITIAL_ADMIN_PASSWORD` dari Script Properties setelah admin awal berhasil dibuat.

Akun awal:
- Username: `admin`
- Password: sesuai nilai `INITIAL_ADMIN_PASSWORD` yang Anda tentukan.
Jangan membagikan spreadsheet kepada publik. Bagikan hanya kepada pengelola yang memang perlu mengaksesnya.

## B. Deploy Apps Script sebagai API

1. Klik Deploy → New deployment.
2. Pilih type: Web app.
3. Execute as: Me.
4. Who has access: Anyone (API memerlukan akses web; setiap aksi data tetap memerlukan token login).
5. Deploy, salin URL yang berakhiran `/exec`.
6. Jangan menaruh password atau secret database di frontend. Apps Script menjadi satu-satunya pihak yang membaca Spreadsheet.

Catatan: karena API web app dapat dijangkau publik, gunakan password unik, jangan masukkan data yang sangat sensitif, dan uji perilaku CORS/redirect pada browser sebelum dipakai operasional. Untuk kebutuhan keamanan/privasi lebih tinggi, pindahkan autentikasi ke layanan backend khusus.

## C. Jalankan frontend lokal

1. Install Node.js versi LTS.
2. Ekstrak ZIP ini.
3. Jalankan:
   ```bash
   npm install
   cp .env.example .env
   ```
4. Isi `.env`:
   ```env
   VITE_NUCARE_API_URL=https://script.google.com/macros/s/ID_DEPLOYMENT/exec
   ```
5. Jalankan:
   ```bash
   npm run dev
   ```
6. Buka alamat lokal yang ditampilkan Vite.

## D. Deploy ke Vercel

1. Push folder proyek ke repository GitHub.
2. Import repository tersebut di Vercel.
3. Framework preset: Vite.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Tambahkan Environment Variable:
   - Name: `VITE_NUCARE_API_URL`
   - Value: URL Apps Script `/exec`
7. Deploy.

## E. Catatan pengembangan berikutnya

Starter ini sudah memuat login, dashboard, data penyumbang, transaksi bulanan, pencarian, dan export CSV. Beberapa hal yang sebaiknya diselesaikan sebelum operasional:
- Halaman manajemen akun (buat/nonaktifkan operator dan reset password).
- CRUD penyaluran dan kegiatan.
- Pengelolaan RT lengkap (tambah/nonaktifkan; saat ini API tambah RT tersedia).
- Export `.xlsx` sesungguhnya (saat ini export CSV yang dapat dibuka di Excel).
- Audit log terpisah dan proteksi rate-limit login.
- Uji integrasi Apps Script dari domain Vercel dan penanganan kuota Google Apps Script.

## Skema transaksi

Satu baris per kombinasi `donorId + year + month`. Jika periode yang sama disimpan lagi, nominal lama diperbarui, bukan dibuat baris ganda. Rekap per bulan dibentuk oleh frontend dari tabel transaksi.
# nucare
