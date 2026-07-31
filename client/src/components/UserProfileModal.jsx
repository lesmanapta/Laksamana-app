import React, { useState, useEffect } from 'react';

export default function UserProfileModal({ show, onClose, user, onUseToken }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedToken, setCopiedToken] = useState('');

  useEffect(() => {
    if (show && user) {
      fetchTokens();
    }
  }, [show, user]);

  const fetchTokens = async () => {
    setLoading(true);
    setError('');
    try {
      const authToken = localStorage.getItem('accessToken');
      const res = await fetch(`/api/auth/my-tokens?email=${encodeURIComponent(user.email || '')}&whatsapp=${encodeURIComponent(user.whatsapp || '')}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengambil kode token');
      setTokens(data.tokens || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedToken(code);
    setTimeout(() => setCopiedToken(''), 3000);
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
          
          {/* Modal Header */}
          <div className="bg-mint-dark text-white p-4 d-flex align-items-center justify-content-between">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white bg-opacity-20 p-3 rounded-circle text-mint-primary">
                <i className="ri-user-star-line fs-3"></i>
              </div>
              <div>
                <h5 className="fw-bold mb-0 text-white">Profil & Kode Token Paket</h5>
                <small className="opacity-75">{user?.name} ({user?.email})</small>
              </div>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4 bg-mint-light">
            
            {/* Account Info Summary */}
            <div className="card mint-card border-0 p-3 mb-4 bg-white shadow-sm rounded-4">
              <div className="row g-3 text-center text-md-start align-items-center">
                <div className="col-12 col-md-4">
                  <span className="small text-muted d-block">Nama Lengkap</span>
                  <strong className="text-mint-heading">{user?.name}</strong>
                </div>
                <div className="col-12 col-md-4">
                  <span className="small text-muted d-block">Nomor WhatsApp</span>
                  <strong className="text-mint-heading">{user?.whatsapp || '-'}</strong>
                </div>
                <div className="col-12 col-md-4">
                  <span className="small text-muted d-block">Tipe Akun</span>
                  <span className={`badge px-3 py-2 rounded-pill ${user?.role === 'superadmin' ? 'bg-warning text-dark' : 'bg-mint-primary text-white'}`}>
                    {user?.role === 'superadmin' ? '👑 Super Admin' : '👤 Pengguna Laksamana'}
                  </span>
                </div>
              </div>
            </div>

            {/* Token Section Title */}
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h6 className="fw-bold text-mint-heading mb-0 d-flex align-items-center gap-2">
                <i className="ri-coupon-3-line text-mint-primary fs-5"></i>
                Daftar Kode Token Paket Saya
              </h6>
              <button onClick={fetchTokens} className="btn btn-sm btn-mint-outline rounded-pill" disabled={loading}>
                <i className={`ri-refresh-line ${loading ? 'spin' : ''}`}></i> Refresh
              </button>
            </div>

            {error && (
              <div className="alert alert-danger small rounded-4">{error}</div>
            )}

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-mint-primary" role="status"></div>
                <div className="small text-muted mt-2">Memuat kode token Anda...</div>
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-5 bg-white rounded-4 border border-dashed p-4">
                <i className="ri-ticket-2-line display-4 text-muted mb-2 d-block"></i>
                <h6 className="fw-bold text-secondary">Belum Ada Kode Token Paket</h6>
                <p className="small text-muted mb-3 max-w-sm mx-auto">
                  Anda belum memiliki token paket aktif. Beli Paket Laksamana Hemat atau Praktis untuk mendapatkan kode token hemat!
                </p>
              </div>
            ) : (
              <div className="row g-3">
                {tokens.map((tk) => {
                  const isActive = tk.status === 'ACTIVE';
                  const isPending = tk.status === 'PENDING';
                  const isExhausted = tk.status === 'EXHAUSTED' || tk.quota_remaining <= 0;

                  return (
                    <div key={tk.token_code} className="col-12 col-md-6">
                      <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 d-flex flex-column justify-content-between border-start border-4 border-mint-primary">
                        <div>
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <span className={`badge rounded-pill px-3 py-1 ${
                              isActive ? 'bg-success text-white' :
                              isPending ? 'bg-warning text-dark' : 'bg-secondary text-white'
                            }`}>
                              {isActive ? '✅ AKTIF' : isPending ? '⏳ WAITING PAYMENT' : '🔒 HABIS'}
                            </span>
                            <span className="small text-muted font-monospace">
                              Sisa: <b>{tk.quota_remaining}</b> / {tk.quota_total}x
                            </span>
                          </div>

                          <h6 className="fw-bold text-mint-heading mb-1">{tk.package_name}</h6>
                          
                          {/* Token Code Display Box */}
                          <div className="bg-mint-light p-2.5 rounded-3 d-flex align-items-center justify-content-between my-3 border border-success border-opacity-25">
                            <code className="fs-6 fw-bold text-mint-heading font-monospace">{tk.token_code}</code>
                            <button 
                              onClick={() => handleCopy(tk.token_code)}
                              className="btn btn-mint-primary btn-sm rounded-pill px-3 py-1 text-nowrap fw-semibold small"
                            >
                              {copiedToken === tk.token_code ? '✅ Tersalin' : '📋 Salin'}
                            </button>
                          </div>
                        </div>

                        {isActive && (
                          <button 
                            onClick={() => {
                              if (onUseToken) onUseToken(tk.token_code);
                              onClose();
                            }}
                            className="btn btn-mint-outline w-100 rounded-pill btn-sm fw-bold"
                          >
                            Gunakan Token Ini ➔
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer bg-white border-top-0 px-4 pb-4">
            <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={onClose}>
              Tutup
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
