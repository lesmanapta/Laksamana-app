import React from 'react';

export default function ServiceGrid({ services, onSelectService }) {
  return (
    <section className="container my-5">
      <div className="text-center mb-5">
        <span className="pill-badge-mint mb-2 d-inline-block">LAYANAN UNGGULAN</span>
        <h2 className="fw-extrabold text-mint-heading">Pilih Jenis Pemeriksaan <span className="text-mint-primary">Dokumen</span></h2>
        <p className="text-muted max-w-lg mx-auto">Solusi lengkap deteksi plagiarisme, skor AI, dan parafrase akademis dengan hasil cepat</p>
      </div>

      <div className="row g-4 justify-content-center">
        {services.map((srv) => (
          <div key={srv.id} className="col-12 col-md-6 col-lg-4">
            <div className="mint-card h-100 p-4 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="icon-mint-box">
                    <i className={srv.icon}></i>
                  </div>
                  <div>
                    <h6 className="fw-bold text-mint-heading mb-0">{srv.title}</h6>
                    <small className="text-muted">{srv.subtitle}</small>
                  </div>
                </div>
                <p className="small text-secondary mb-4 leading-relaxed">{srv.description}</p>
              </div>

              <div>
                <div className="d-flex align-items-baseline justify-content-between mb-3 pt-3 border-top border-success border-opacity-10">
                  <span className="text-muted small">Tarif Layanan</span>
                  <span className="fs-5 fw-bold text-mint-primary">
                    Rp {srv.price.toLocaleString('id-ID')} <small className="fs-6 text-muted">/{srv.unit}</small>
                  </span>
                </div>

                <button 
                  onClick={() => onSelectService(srv)}
                  className="btn btn-mint-primary w-100 rounded-pill py-2.5 small d-flex align-items-center justify-content-center gap-2"
                >
                  <span>Pesan Layanan Ini</span>
                  <i className="ri-arrow-right-line"></i>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
