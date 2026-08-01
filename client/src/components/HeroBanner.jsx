import React from 'react';

export default function HeroBanner({ onSelectService, setActivePage }) {
  return (
    <div className="container mt-4 mb-5">
      {/* Top Soft Mint Announcement Pill */}
      <div className="alert bg-mint-light text-mint-heading border border-success border-opacity-25 rounded-pill d-flex align-items-center justify-content-center gap-2 py-2 px-4 shadow-sm mb-4">
        <span className="badge bg-mint-primary text-white rounded-pill px-3 py-1">BARU</span>
        <span className="small text-center fw-medium">
          🌿 Layanan Deteksi Plagiasi <b>Turnitin No-Repo & GPTZero AI</b> Otomatis 24 Jam dengan Hasil Kirim Langsung ke WhatsApp!
        </span>
      </div>

      {/* Modern Asymmetric Split Hero Section */}
      <div className="bg-white rounded-5 p-3 p-md-5 border border-success border-opacity-10 shadow-sm">
        <div className="row align-items-center g-4">
          {/* Hero Left Column */}
          <div className="col-12 col-lg-7 text-center text-lg-start">
            <div className="d-inline-flex align-items-center gap-2 pill-badge-mint mb-3">
              <i className="ri-leaf-line text-mint-primary"></i> 100% Aman & Terverifikasi No-Repository
            </div>

            <h1 className="fs-3 fs-md-1 display-5 fw-extrabold text-mint-heading mb-3 lh-sm">
              Deteksi Plagiasi & AI Fast <span className="text-mint-primary">Tanpa Simpan File.</span>
            </h1>

            <p className="text-secondary small fs-md-6 mb-4 lh-base">
              Platform pemeriksaan keaslian dokumen skripsi, jurnal, dan tugas akhir tercepat. Terhubung langsung dengan Midtrans Payment & Notifikasi WhatsApp otomatis.
            </p>

            <div className="d-flex flex-column flex-sm-row justify-content-center justify-content-lg-start gap-2 gap-sm-3 mb-4">
              <button 
                onClick={() => setActivePage('order')} 
                className="btn btn-mint-primary rounded-pill px-4 px-md-5 py-2.5 py-md-3 fs-6 shadow-sm w-100 w-sm-auto"
              >
                Mulai Cek Dokumen <i className="ri-arrow-right-line ms-2"></i>
              </button>

              <button 
                onClick={() => setActivePage('track')} 
                className="btn btn-mint-outline rounded-pill px-4 py-2.5 py-md-3 fs-6 w-100 w-sm-auto"
              >
                <i className="ri-search-line me-2"></i> Lacak Pesanan
              </button>
            </div>

            {/* Quick Metrics Badges */}
            <div className="row g-3 pt-3 border-top">
              <div className="col-4">
                <h5 className="fw-bold text-mint-primary mb-0">1-3 Mnt</h5>
                <small className="text-muted">Proses Otomatis</small>
              </div>
              <div className="col-4 border-start">
                <h5 className="fw-bold text-mint-primary mb-0">100%</h5>
                <small className="text-muted">No-Repository</small>
              </div>
              <div className="col-4 border-start">
                <h5 className="fw-bold text-mint-primary mb-0">24/7</h5>
                <small className="text-muted">Layanan WA Instant</small>
              </div>
            </div>
          </div>

          {/* Hero Right Column: Interactive Quick Upload Box */}
          <div className="col-12 col-lg-5">
            <div className="bg-mint-light p-4 rounded-4 border border-success border-opacity-25 text-center shadow-sm position-relative">
              <div className="icon-mint-box mx-auto mb-3">
                <i className="ri-file-upload-line"></i>
              </div>
              <h5 className="fw-bold text-mint-heading mb-1">Upload & Cek Langsung</h5>
              <p className="small text-muted mb-4">Pilih file PDF/DOCX kamu dan sistem akan langsung memprosesnya.</p>
              
              <button 
                onClick={() => setActivePage('order')}
                className="btn btn-mint-primary w-100 rounded-pill py-3 fw-bold shadow-sm"
              >
                <i className="ri-upload-cloud-2-line me-2"></i> Unggah Dokumen Kamu
              </button>

              <small className="d-block text-muted mt-3">
                <i className="ri-lock-line me-1 text-mint-primary"></i> Dokumen dijamin rahasia & tidak disimpan
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
