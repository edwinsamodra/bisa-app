# PERFECT PLAN: Aplikasi Tracking Bimbel (Tutoring Tracking App)

## 🎯 App Purpose
Aplikasi ini dirancang untuk mempermudah operasional harian bimbingan belajar (bimbel), khususnya untuk mencatat kehadiran (absensi), mencatat pembayaran yang sering kali tidak teratur, dan membuat laporan tagihan (Raport Les/Invoice) untuk orang tua siswa. 
Aplikasi difokuskan untuk **guru/admin non-teknis** dengan antarmuka **khusus mobile (Light Mode)** yang sangat sederhana, tombol berukuran besar, dan menghindari alur input yang rumit.

---

## 🧩 Kompleksitas Pembayaran & Solusinya

Ada beberapa tantangan pencatatan keuangan yang diuraikan di [PLAN.md](file:///Users/edwinsamodra/Code/bisa-app/PLAN.md). Berikut adalah solusi logis yang sangat sederhana untuk diimplementasikan:

### 1. Perbedaan Skema (Private per Pertemuan vs Reguler per Semester)
* **Tantangan**: 
  * Kelas Private ditagih per pertemuan (misal: Rp 150.000 / sesi).
  * Kelas Reguler ditagih per semester (misal: Rp 1.200.000 / semester), namun secara aktual orang tua mencicil/membayar per bulan (misal: Rp 200.000 / bulan).
* **Solusi (Unified Ledger)**:
  * Kita satukan semua pencatatan keuangan ke dalam satu tabel data operasional pertemuan dengan kolom `Tagihan` dan `Jumlah Diterima`.
  * **Untuk Kelas Private**: Setiap guru membuat input pertemuan baru, kolom `Tagihan` diisi otomatis atau manual sesuai tarif per sesi (misal: `150.000`). Kolom `Jumlah Diterima` diisi `0` jika belum bayar, atau `150.000` (atau kelipatannya) jika orang tua membayar pada hari itu.
  * **Untuk Kelas Reguler**: 
    * Pada pertemuan pertama di setiap bulan (atau saat tagihan bulanan diterbitkan), guru mencatat `Tagihan` bulanan (misal: `200.000`).
    * Pada pertemuan-pertemuan reguler biasa lainnya dalam bulan tersebut, guru cukup mencatat kehadiran dengan `Tagihan` = `0` dan `Jumlah Diterima` = `0`.
    * Jika orang tua melakukan pembayaran di pertemuan tertentu, guru menginput nominal tersebut di kolom `Jumlah Diterima` pada hari itu.

### 2. Pembayaran Acak & Tidak Teratur (Irregular Payments)
* **Tantangan**: Orang tua sering kali membayar di pertemuan yang acak (misal: pertemuan 1-5 belum bayar, lalu langsung bayar rapel di pertemuan ke-6, atau membayar di muka untuk beberapa pertemuan ke depan).
* **Solusi (Cumulative Balance Tracking)**:
  * Kita **tidak perlu** mencocokkan secara manual (reconciliation) pembayaran tertentu untuk pertemuan tertentu. Alur seperti itu terlalu rumit untuk guru non-teknis.
  * Sistem akan menghitung saldo secara **kumulatif (Total Diterima - Total Tagihan)** untuk setiap siswa dari awal bergabung hingga saat ini:
    $$\text{Saldo Kumulatif} = \sum(\text{Jumlah Diterima}) - \sum(\text{Tagihan})$$
    * **Jika Saldo = 0**: Pembayaran pas/lunas.
    * **Jika Saldo < 0**: Siswa memiliki **Kekurangan (-)** (Outstanding/Hutang) yang harus ditagih.
    * **Jika Saldo > 0**: Siswa memiliki **Kelebihan (+)** (Deposit/Kelebihan Bayar) untuk pertemuan berikutnya.
  * Di setiap baris spreadsheet pertemuan, kita dapat menampilkan running balance siswa tersebut agar guru bisa langsung melihat status keuangan terbaru mereka saat menginput data.

### 3. Kemudahan Penggunaan Guru Non-Teknis
* **Tantangan**: Guru malas mengisi form yang banyak field atau melakukan langkah-langkah rumit.
* **Solusi**:
  * Input satu-satu per siswa per pertemuan seperti mengisi spreadsheet.
  * Autopopulate tarif default: Saat memilih Siswa, sistem secara cerdas mengisi `Tagihan` default sesuai jenis kelas siswa tersebut (Private / Reguler).
  * Desain tombol edit/hapus dan tombol tambah yang sangat mencolok dengan ukuran jari yang pas (minimal 44px tap target).

---

## 🗄️ Skema Database (JSON File-Based)

Kita akan menggunakan 3 file JSON di folder `data/` untuk menyimpan seluruh data:

### 1. `siswa.json`
Menyimpan profil siswa.
```json
[
  {
    "id": "s1",
    "nama": "Budi Santoso",
    "whatsappSiswa": "08123456789",
    "asalSekolah": "SDN 1 Merdeka",
    "namaOrangTua": "Agus Santoso",
    "whatsappOrtu": "08129876543",
    "alamat": "Jl. Mawar No. 12, Jakarta",
    "jenjangKelas": "SD 4",
    "jenisKelas": "Private", // Private | Reguler
    "tarifDefault": 150000, // Tarif default per sesi (Private) atau per bulan (Reguler)
    "createdAt": "2026-06-21T08:00:00.000Z"
  }
]
```

### 2. `guru.json`
Menyimpan profil guru/tentor.
```json
[
  {
    "id": "g1",
    "nama": "Kak Sarah",
    "whatsapp": "085711223344",
    "createdAt": "2026-06-21T08:00:00.000Z"
  }
]
```

### 3. `operasional.json` (Data Pertemuan Bimbel)
Menyimpan log kehadiran dan transaksi keuangan per pertemuan.
```json
[
  {
    "id": "op1",
    "tanggal": "2026-06-21",
    "siswaId": "s1",
    "guruId": "g1",
    "jenisKelas": "Private",
    "statusAbsen": "Hadir", // Hadir | Izin | Bolos
    "tagihan": 150000,
    "jumlahDiterima": 0,
    "catatan": "Belajar operasi pecahan dasar. Budi cukup paham.",
    "createdAt": "2026-06-21T08:30:00.000Z"
  },
  {
    "id": "op2",
    "tanggal": "2026-06-23",
    "siswaId": "s1",
    "guruId": "g1",
    "jenisKelas": "Private",
    "statusAbsen": "Hadir",
    "tagihan": 150000,
    "jumlahDiterima": 450000, // Membayar pertemuan op1 + op2 + deposit op3
    "catatan": "Latihan soal pecahan campuran.",
    "createdAt": "2026-06-23T08:30:00.000Z"
  }
]
```

---

## 🔌 Rencana Endpoint API (`server.js`)

Kita akan menyediakan API terstruktur untuk melayani frontend:

1. **Siswa CRUD**:
   * `GET /api/siswa` - Mengambil semua data siswa beserta total saldo kumulatifnya.
   * `POST /api/siswa` - Menambah siswa baru.
   * `PUT /api/siswa/:id` - Mengubah data siswa.
   * `DELETE /api/siswa/:id` - Menghapus siswa.

2. **Guru CRUD**:
   * `GET /api/guru` - Mengambil semua data guru.
   * `POST /api/guru` - Menambah guru baru.
   * `PUT /api/guru/:id` - Mengubah data guru.
   * `DELETE /api/guru/:id` - Menghapus guru.

3. **Operasional CRUD (Pertemuan)**:
   * `GET /api/operasional` - Mengambil log pertemuan, dijoin dengan data nama siswa & nama guru.
   * `POST /api/operasional` - Mencatat pertemuan baru.
   * `PUT /api/operasional/:id` - Mengubah data pertemuan.
   * `DELETE /api/operasional/:id` - Menghapus data pertemuan.

4. **Laporan & Ringkasan**:
   * `GET /api/dashboard/summary` - Mengambil ringkasan total uang masuk, total piutang siswa, total pertemuan bulan ini.
   * `GET /api/laporan/siswa/:siswaId` - Mengambil riwayat detail absensi dan pembayaran per siswa untuk dijadikan **Raport Les / Invoice**.

---

## 📱 Peta Tampilan Antarmuka (Single Page App Mobile)

Tampilan akan dikelompokkan dalam **5 Navigasi Tab Utama** di bagian bawah/atas layar:

1. **Dashboard (Ringkasan)**:
   * Menampilkan total pendapatan bulan ini (Uang Masuk), total kekurangan bayar (Piutang Orang Tua), jumlah siswa aktif.
   * Grafik/indikator sederhana pencapaian operasional.
   * Tombol pintas "Catat Kehadiran Cepat".

2. **Operasional (Input Pertemuan & Keuangan)**:
   * Berupa list data pertemuan mirip baris spreadsheet.
   * Form Tambah/Edit Pertemuan:
     * Dropdown Siswa (auto-load tarif default & jenis kelas).
     * Dropdown Guru.
     * Dropdown Absen (Hadir, Izin, Bolos).
     * Kolom Tagihan (auto-fill dari data siswa, bisa diedit).
     * Kolom Jumlah Diterima (untuk pembayaran langsung).
     * Input Catatan Belajar.
   * Setiap baris pertemuan menampilkan status bayar: **Lunas (0)**, **Kekurangan (-x)**, atau **Kelebihan (+x)**.

3. **Data Siswa**:
   * Daftar siswa dengan status keuangannya (berwarna merah jika ada kekurangan bayar, hijau jika lunas/kelebihan).
   * Tombol WhatsApp langsung ke Orang Tua untuk penagihan saldo kekurangan.
   * Form tambah & edit profil siswa.

4. **Data Guru**:
   * Daftar guru bimbel beserta tombol kontak WhatsApp.
   * Form tambah & edit profil guru.

5. **Raport Les (Invoice Generator)**:
   * Pilih Siswa dari dropdown.
   * Tampilkan tabel rekapitulasi seluruh sesi pertemuan beserta status kehadiran dan pembayaran.
   * Tombol "Cetak / Simpan PDF" (menggunakan layout print css yang rapi dan bersih agar bisa langsung dibagikan ke WhatsApp orang tua).

---

## 🎨 Panduan Desain Visual (Berdasarkan [THEME.md](file:///Users/edwinsamodra/Code/bisa-app/THEME.md))
* **Warna Latar**: Soft White (`#f8fafc` / `#fafaf9`) agar mata tidak lelah.
* **Warna Aksen Utama**: Deep Navy Blue (`#000d5c`) untuk navbar, header, tombol utama, dan teks penegasan.
* **Warna Aksen Kedua**: Golden Yellow (`#ffde59`) untuk badge penting, highlight status, dan tombol sekunder.
* **Warna Status**:
  * Hijau lembut (`#e6f4ea` teks `#137333` / Emerald-500) untuk status Lunas / Kelebihan Bayar.
  * Merah lembut (`#fce8e6` teks `#c5221f` / Rose-500) untuk status Kekurangan Bayar / Defisit.
* **Tipografi**: Outfit (Google Fonts), ukuran teks minimal `14px` untuk keterangan, `16px` untuk body, dan `18px` ke atas untuk judul/tombol agar mudah dibaca oleh guru senior/non-teknis.
