# 📖 Panduan Pembuatan Aplikasi Full-Stack `Laksamana` Step by Step

Dokumen ini menjelaskan langkah-langkah lengkap (step-by-step) pembuatan aplikasi platform deteksi plagiarisme dan analisis teks AI **Laksamana** dari awal hingga selesai.

---

## 📌 Tahap 1: Analisis Kebutuhan & Desain Arsitektur

Sebelum menulis kode, kita memetakan komponen utama yang ada pada sistem **Laksamana**:
1. **Header & Navbar**: Mengatur navigasi Beranda, Order Cek, Cek Pesanan, Panduan Cara Order, dan Modal Login/Register.
2. **Hero Banner & Carousel**: Menampilkan pesan penting, slider promo, dan ajakan bergabung ke WhatsApp Channel.
3. **Katalog Layanan (Service Grid)**: Menu pemesanan untuk:
   * *Cek Plagiasi No-Repository* (Turnitin)
   * *Cek Drillbit*
   * *Jasa Parafrase*
   * *Cek AI GPTZero*
   * *Humanize File AI*
4. **Paket Pembelian Token**: Paket Laksamana Hemat 3x, 10x, dan 25x untuk memotong antrean & biaya.
5. **Form Pemesanan Dokumen (Order Page)**: Dropzone upload file PDF/DOCX, nomor WA, opsi pembayaran (QRIS/E-Wallet), dan input kode token.
6. **Pelacak Status Pesanan (Track Order Page)**: Bar pencarian berdasarkan Order ID/No. WA, indikator linimasa status (Diterima -> Analisis -> Selesai), metrik persentase Similarity Index %, skor AI %, daftar sumber kemiripan, dan tombol download laporan.
7. **Backend REST API**: Node.js + Express untuk mengelola upload file, analisis dokumen, autentikasi JWT, dan penyediaan data layanan.

---

## 📌 Tahap 2: Pembuatan Server Backend (`/server`)

### **Langkah 2.1: Inisialisasi Server & Dependency**
Mengatur `package.json` backend dengan pustaka `express`, `cors`, `multer` (untuk upload file), dan `jsonwebtoken`.

### **Langkah 2.2: Mesin Simulasi Analisis Plagiasi (`server/services/plagiarismEngine.js`)**
Membuat algoritma kalkulasi skor deterministik yang menghitung:
* Persentase kemiripan dokumen (*Similarity Index %*).
* Skor deteksi teks AI (*GPTZero AI Score %*).
* Estimasi halaman dan jumlah kata.
* Daftar URL sumber dokumen yang terdeteksi cocok.

### **Langkah 2.3: Handler Autentikasi (`server/routes/auth.js`)**
Menyediakan API registrasi user baru, autentikasi login, serta verifikasi token JWT pada header HTTP `Authorization: Bearer <token>`.

### **Langkah 2.4: Handler Layanan & Paket (`server/routes/services.js`)**
Menyediakan daftar layanan harga, paket hemat, dan panduan modal tutorial.

### **Langkah 2.5: Handler Pesanan & Upload Dokumen (`server/routes/orders.js`)**
* Menerima dokumen upload via Multer (disimpan ke folder `server/uploads/`).
* Menghasilkan ID Order acak dengan awalan `LKS-` (contoh: `LKS-984210`).
* Menjalankan analisis otomatis dan menyediakan endpoint pencarian status serta download file laporan.

---

## 📌 Tahap 3: Pembuatan Client Frontend (`/client`)

### **Langkah 3.1: Setup Vite + React & Styling**
* Menggunakan Vite + React untuk rendering kilat.
* Mengintegrasikan Google Fonts (`Poppins`), Bootstrap 5, Remix Icon, dan Bootstrap Icons di `index.html`.
* Menyusun `index.css` dengan token warna brand oranye (`#f99f1e`) dan ungu (`#6d55cd`).

### **Langkah 3.2: Komponen Navbar & Modal Auth**
* `Navbar.jsx`: Mengelola halaman aktif dan status login pengguna.
* `LoginModal.jsx`: Modal popup untuk registrasi & masuk akun dengan JWT.
* `TutorialModal.jsx`: Modal petunjuk langkah pemesanan dan penggunaan token paket.

### **Langkah 3.3: Komponen Beranda (HomePage)**
* `HeroBanner.jsx`: Slider carousel promo dan banner pengumuman penting.
* `ServiceGrid.jsx`: Kartu grid interaktif 5 layanan utama.
* `PackagePricing.jsx`: Kartu harga paket hemat kuota cek plagiasi.

### **Langkah 3.4: Halaman Order Pemesanan (OrderPage)**
* Dropzone tempat pengguna mengunggah file dokumen.
* Input data kontak WhatsApp & Email.
* Pilihan metode pembayaran (QRIS Instant, Transfer Bank, E-Wallet).
* Integrasi pengiriman data multipart form ke API `/api/orders/create`.

### **Langkah 3.5: Halaman Pelacak Pesanan (TrackOrderPage)**
* Input pencarian berdasarkan Kode Order (`LKS-...`) atau No. WA.
* Animasi *Timeline Step Progress* (Diterima -> Analisis -> Selesai).
* Lencana metrik skor plagiasi & skor AI dengan indikator warna.
* Tombol unduh laporan hasil analisis `.txt`/`.pdf`.

---

## 📌 Tahap 4: Menjalankan Aplikasi

1. Jalankan perintah `npm run dev` pada direktori utama (`Laksamana-app`).
2. Server backend akan berjalan di `http://localhost:5000`.
3. Aplikasi frontend akan terbuka di `http://localhost:3000`.
