import React from 'react';

export default function PackagePricing({ packages, onSelectPackage }) {
  return (
    <section id="packages" className="py-5 bg-mint-light my-5 rounded-5 border border-success border-opacity-10">
      <div className="container">
        <div className="text-center mb-5">
          <span className="pill-badge-mint mb-2 d-inline-block">PAKET KELOMPOK & REVISI</span>
          <h2 className="fw-extrabold text-mint-heading">Paket Token Kuota <span className="text-mint-primary">Hemat</span></h2>
          <p className="text-muted">Beli token paket untuk transaksi lebih murah & bebas dari antrean pembayaran</p>
        </div>

        <div className="row g-4 justify-content-center">
          {packages.map((pkg, idx) => (
            <div key={pkg.id} className="col-12 col-md-6 col-lg-4">
              <div className={`mint-card h-100 p-4 border-0 shadow-sm position-relative ${idx === 1 ? 'border border-2 border-success shadow-lg' : ''}`}>
                {idx === 1 && (
                  <span className="position-absolute top-0 start-50 translate-middle badge bg-mint-primary text-white px-3 py-1.5 rounded-pill shadow-sm">
                    ⭐ Paling Populer
                  </span>
                )}

                <span className="position-absolute top-0 end-0 bg-mint-dark text-white small px-3 py-1 rounded-bl-4 rounded-tr-4 fw-medium">
                  {pkg.validity}
                </span>

                <div className="d-flex flex-column justify-content-between h-100 pt-3">
                  <div>
                    <h5 className="fw-bold mb-2 text-center text-mint-heading">{pkg.name}</h5>
                    <p className="small text-muted text-center mb-3">{pkg.targetAudience}</p>
                    
                    <div className="text-center my-4 py-3 bg-mint-light rounded-4 border border-success border-opacity-10">
                      <span className="fs-3 fw-extrabold text-mint-primary">
                        Rp {pkg.price.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="mb-3">
                      <span className="small fw-semibold text-secondary">KUOTA TOKEN</span>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <i className="ri-checkbox-circle-fill text-mint-primary fs-5"></i>
                        <span className="fw-bold text-dark">{pkg.quota}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <span className="small fw-semibold text-secondary">KEUNTUNGAN</span>
                      <ul className="list-unstyled mt-2 mb-0">
                        {pkg.benefits.map((b, bIdx) => (
                          <li key={bIdx} className="d-flex align-items-start gap-2 mb-2 small text-secondary">
                            <i className="ri-check-line text-mint-primary fw-bold mt-1"></i>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button 
                    onClick={() => onSelectPackage(pkg)}
                    className="btn btn-mint-primary w-100 rounded-pill py-2.5 fw-bold shadow-sm"
                  >
                    Beli Paket Hemat Ini
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
