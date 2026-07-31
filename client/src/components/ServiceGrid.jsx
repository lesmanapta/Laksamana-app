import React, { useState } from 'react';

export default function ServiceGrid({ services, onSelectService }) {
  const [showNotif, setShowNotif] = useState(false);
  const [notifService, setNotifService] = useState('');

  const handleServiceClick = (srv) => {
    if (srv.active === false) {
      setNotifService(srv.title);
      setShowNotif(true);
      setTimeout(() => setShowNotif(false), 3000);
      return;
    }
    onSelectService(srv);
  };

  return (
    <section className="container my-5">
      <div className="text-center mb-5">
        <span className="pill-badge-mint mb-2 d-inline-block">LAYANAN UNGGULAN</span>
        <h2 className="fw-extrabold text-mint-heading">Pilih Jenis Pemeriksaan <span className="text-mint-primary">Dokumen</span></h2>
        <p className="text-muted max-w-lg mx-auto">Solusi lengkap deteksi plagiarisme, skor AI, dan parafrase akademis dengan hasil cepat</p>
      </div>

      {/* Notification Card */}
      {showNotif && (
        <div className="position-fixed top-0 start-50 translate-middle-x mt-4" style={{ zIndex: 9999, maxWidth: '420px', width: '90%' }}>
          <div className="d-flex align-items-center gap-3 p-3 rounded-4 shadow-lg border" style={{ 
            background: 'linear-gradient(135deg, #fefce8, #fef9c3)', 
            borderColor: '#facc15',
            animation: 'slideDown 0.3s ease-out'
          }}>
            <div className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0" style={{ 
              width: '44px', height: '44px', background: '#fbbf24', color: '#78350f' 
            }}>
              <i className="ri-timer-line fs-5"></i>
            </div>
            <div>
              <div className="fw-bold text-dark small">🚧 Layanan Belum Tersedia</div>
              <div className="text-secondary small" style={{ fontSize: '0.8rem' }}>
                <strong>{notifService}</strong> sedang dalam tahap pengembangan. Nantikan segera ya!
              </div>
            </div>
            <button onClick={() => setShowNotif(false)} className="btn-close ms-auto" style={{ fontSize: '0.6rem' }}></button>
          </div>
        </div>
      )}

      {/* Sorted Services: Active ones first, Cek Plagiasi top-left */}
      <div className="row g-4 justify-content-center">
        {[...services].sort((a, b) => {
          const aActive = a.active !== false && a.active !== 0 ? 1 : 0;
          const bActive = b.active !== false && b.active !== 0 ? 1 : 0;
          if (aActive !== bActive) return bActive - aActive;

          const priority = {
            'cek-plagiasi': 1,
            'cek-drillbit': 2,
            'parafrase': 3,
            'gptzero': 4,
            'humanizer': 5
          };
          const aPrio = priority[a.slug || a.id] || 99;
          const bPrio = priority[b.slug || b.id] || 99;
          return aPrio - bPrio;
        }).map((srv) => {
          const isDisabled = srv.active === false;

          return (
            <div key={srv.id} className="col-12 col-md-6 col-lg-4">
              <div className={`mint-card h-100 p-4 d-flex flex-column justify-content-between ${isDisabled ? 'opacity-60' : ''}`} 
                   style={{ position: 'relative', ...(isDisabled ? { filter: 'grayscale(30%)' } : {}) }}>
                
                {/* Coming Soon Badge */}
                {isDisabled && (
                  <div className="position-absolute top-0 end-0 m-3">
                    <span className="badge rounded-pill px-3 py-2" style={{ 
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                      color: '#fff', 
                      fontSize: '0.7rem',
                      boxShadow: '0 2px 8px rgba(245,158,11,0.3)'
                    }}>
                      <i className="ri-time-line me-1"></i>Segera Hadir
                    </span>
                  </div>
                )}

                <div>
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className={`icon-mint-box ${isDisabled ? '' : ''}`} style={isDisabled ? { opacity: 0.5 } : {}}>
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
                    onClick={() => handleServiceClick(srv)}
                    className={`btn w-100 rounded-pill py-2.5 small d-flex align-items-center justify-content-center gap-2 ${
                      isDisabled 
                        ? 'btn-outline-secondary' 
                        : 'btn-mint-primary'
                    }`}
                  >
                    <span>{isDisabled ? 'Segera Tersedia' : 'Pesan Layanan Ini'}</span>
                    <i className={isDisabled ? 'ri-timer-line' : 'ri-arrow-right-line'}></i>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .opacity-60 { opacity: 0.65; }
      `}</style>
    </section>
  );
}
