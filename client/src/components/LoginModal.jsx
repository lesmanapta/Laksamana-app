import React, { useState } from 'react';

export default function LoginModal({ show, onClose, onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', whatsapp: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationData, setVerificationData] = useState(null);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setVerificationData(null);
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.requiresVerification && data.redirectWaUrl) {
          setVerificationData(data);
        }
        throw new Error(data.error || 'Terjadi kesalahan');
      }

      if (data.requiresVerification && data.redirectWaUrl) {
        setVerificationData(data);
        // Automatically redirect user to WhatsApp for instant verification
        window.open(data.redirectWaUrl, '_blank');
        return;
      }

      localStorage.setItem('accessToken', data.token);
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 rounded-4 shadow-lg p-3">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold">
              {isRegister ? 'Daftar Akun Laksamana' : 'Login ke Laksamana'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger small py-2">{error}</div>}

              {/* Verification Prompt Card */}
              {verificationData && (
                <div className="alert alert-warning border-0 rounded-4 p-3 mb-3 text-center">
                  <i className="ri-whatsapp-fill fs-2 text-success d-block mb-1"></i>
                  <h6 className="fw-bold mb-1">Verifikasi WhatsApp Diperlukan!</h6>
                  <p className="small text-secondary mb-2">
                    Kode Verifikasi Anda: <b className="text-dark fs-6">{verificationData.verificationCode}</b>
                  </p>
                  <p className="small text-muted mb-3">
                    Notifikasi pendaftaran telah dikirim ke Admin (<b>08117676477</b>). Klik tombol di bawah untuk mengonfirmasi aktivasi akun Anda di WhatsApp!
                  </p>
                  <a 
                    href={verificationData.redirectWaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-success w-100 rounded-pill py-2 fw-semibold btn-sm shadow-sm"
                  >
                    <i className="ri-whatsapp-line me-1"></i> Hubungi Admin WA (08117676477)
                  </a>
                </div>
              )}

              {!verificationData && isRegister && (
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Nama Lengkap</label>
                  <input 
                    type="text" 
                    className="form-control rounded-3" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              )}

              {!verificationData && (
                <>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Alamat Email</label>
                    <input 
                      type="email" 
                      className="form-control rounded-3" 
                      required 
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Password</label>
                    <input 
                      type="password" 
                      className="form-control rounded-3" 
                      required 
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </>
              )}

              {!verificationData && isRegister && (
                <div className="mb-3">
                  <label className="form-label small fw-semibold">No. WhatsApp</label>
                  <input 
                    type="tel" 
                    className="form-control rounded-3" 
                    placeholder="081234567890"
                    required
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="modal-footer border-0 pt-0 flex-column">
              {!verificationData && (
                <button 
                  type="submit" 
                  className="btn btn-custom-orange w-100 rounded-pill py-2 fw-semibold"
                  disabled={loading}
                >
                  {loading ? 'Memproses...' : isRegister ? 'Daftar & Verifikasi via WA' : 'Masuk Sekarang'}
                </button>
              )}

              <button 
                type="button" 
                className="btn btn-link text-decoration-none small text-muted mt-2"
                onClick={() => { setIsRegister(!isRegister); setError(''); setVerificationData(null); }}
              >
                {isRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Daftar gratis'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
