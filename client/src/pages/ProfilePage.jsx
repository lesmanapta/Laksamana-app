import React, { useState, useEffect } from 'react';

export default function ProfilePage({ user, onLogout, onNavigate }) {
  const [activeTab, setActiveTab] = useState('ACCOUNT'); // ACCOUNT, TOKENS, ORDERS

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Tokens State
  const [tokens, setTokens] = useState([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState('');

  // Orders State
  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (activeTab === 'TOKENS') fetchTokens();
      if (activeTab === 'ORDERS') fetchOrders();
    }
  }, [activeTab, user]);

  const fetchTokens = async () => {
    setTokensLoading(true);
    try {
      const authToken = localStorage.getItem('accessToken');
      const res = await fetch(`/api/auth/my-tokens?email=${encodeURIComponent(user.email || '')}&whatsapp=${encodeURIComponent(user.whatsapp || '')}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      setTokens(data.tokens || []);
    } catch (e) {
      console.error(e);
    } finally {
      setTokensLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/orders/my-orders?email=${encodeURIComponent(user.email || '')}&whatsapp=${encodeURIComponent(user.whatsapp || '')}`);
      const data = await res.json();
      setMyOrders(data.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword !== confirmPassword) {
      setPassError('Konfirmasi password baru tidak cocok');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('Password baru minimal 6 karakter');
      return;
    }

    setPassLoading(true);

    try {
      const authToken = localStorage.getItem('accessToken');
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal mengubah password');

      setPassSuccess('✅ Password berhasil diperbarui!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedToken(code);
    setTimeout(() => setCopiedToken(''), 3000);
  };

  if (!user) {
    return (
      <div className="container my-5 text-center py-5">
        <div className="card border-0 shadow-sm rounded-4 p-5 max-w-md mx-auto">
          <i className="ri-user-unfollow-line display-1 text-muted mb-3"></i>
          <h4 className="fw-bold mb-2">Silakan Login Terlebih Dahulu</h4>
          <p className="text-muted small mb-4">Anda perlu masuk ke akun Laksamana untuk membuka profil & riwayat order.</p>
          <button onClick={() => onNavigate('home')} className="btn btn-mint-primary rounded-pill px-4">
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5">
      <div className="row g-4">
        
        {/* Left Sub-Sidebar Menu */}
        <div className="col-12 col-md-4 col-lg-3">
          <div className="card border-0 shadow-sm rounded-4 p-3 bg-white sticky-top" style={{ top: '100px' }}>
            <div className="d-flex align-items-center gap-3 p-3 mb-3 bg-mint-light rounded-4 border border-success border-opacity-10">
              <div className="bg-mint-primary text-white rounded-circle p-3 fs-4 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                <i className="ri-user-smile-line"></i>
              </div>
              <div className="text-truncate">
                <h6 className="fw-bold text-mint-heading mb-0 text-truncate">{user.name}</h6>
                <small className="text-muted text-truncate d-block" style={{ fontSize: '0.75rem' }}>{user.email}</small>
              </div>
            </div>

            <div className="nav flex-row flex-md-column gap-1 overflow-x-auto pb-2 pb-md-0 mb-3 mb-md-0">
              <button 
                className={`nav-link text-nowrap text-start rounded-pill rounded-md-3 px-3 py-2 py-md-2.5 border-0 d-flex align-items-center gap-2 ${activeTab === 'ACCOUNT' ? 'fw-bold bg-mint-primary text-white' : 'text-secondary bg-light bg-md-transparent'}`}
                onClick={() => setActiveTab('ACCOUNT')}
              >
                <i className="ri-shield-keyhole-line fs-5"></i>
                <span>Profil & Ganti Password</span>
              </button>

              <button 
                className={`nav-link text-nowrap text-start rounded-pill rounded-md-3 px-3 py-2 py-md-2.5 border-0 d-flex align-items-center gap-2 ${activeTab === 'TOKENS' ? 'fw-bold bg-mint-primary text-white' : 'text-secondary bg-light bg-md-transparent'}`}
                onClick={() => setActiveTab('TOKENS')}
              >
                <i className="ri-coupon-3-line fs-5"></i>
                <span>Kode Token Paket Saya</span>
              </button>

              <button 
                className={`nav-link text-nowrap text-start rounded-pill rounded-md-3 px-3 py-2 py-md-2.5 border-0 d-flex align-items-center gap-2 ${activeTab === 'ORDERS' ? 'fw-bold bg-mint-primary text-white' : 'text-secondary bg-light bg-md-transparent'}`}
                onClick={() => setActiveTab('ORDERS')}
              >
                <i className="ri-history-line fs-5"></i>
                <span>Riwayat Pesanan</span>
              </button>

              <hr className="my-2 d-none d-md-block" />

              <button 
                onClick={onLogout}
                className="nav-link text-nowrap text-start rounded-pill rounded-md-3 px-3 py-2 py-md-2.5 border-0 text-danger bg-light bg-md-transparent d-flex align-items-center gap-2 fw-semibold"
              >
                <i className="ri-logout-box-r-line fs-5"></i>
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Main Content */}
        <div className="col-12 col-md-8 col-lg-9">
          
          {/* TAB 1: PROFIL & GANTI PASSWORD */}
          {activeTab === 'ACCOUNT' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <h5 className="fw-bold text-mint-heading mb-3 border-bottom pb-2">
                <i className="ri-user-settings-line me-2 text-mint-primary"></i> Informas Akun & Ganti Password
              </h5>

              {/* Account Info Box */}
              <div className="row g-3 mb-4 p-3 bg-mint-light rounded-4 border border-success border-opacity-10">
                <div className="col-12 col-md-4">
                  <span className="small text-muted d-block">Nama Lengkap</span>
                  <strong className="text-mint-heading">{user.name}</strong>
                </div>
                <div className="col-12 col-md-4">
                  <span className="small text-muted d-block">Email Utama</span>
                  <strong className="text-mint-heading">{user.email}</strong>
                </div>
                <div className="col-12 col-md-4">
                  <span className="small text-muted d-block">WhatsApp Active</span>
                  <strong className="text-mint-heading">{user.whatsapp || '-'}</strong>
                </div>
              </div>

              {/* Change Password Form */}
              <h6 className="fw-bold text-mint-heading mb-3 mt-2">Ganti Password Akun</h6>

              {passError && <div className="alert alert-danger small rounded-4">{passError}</div>}
              {passSuccess && <div className="alert alert-success small rounded-4">{passSuccess}</div>}

              <form onSubmit={handleChangePassword} style={{ maxWidth: '500px' }}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Password Saat Ini</label>
                  <input 
                    type="password" 
                    className="form-control rounded-3" 
                    required 
                    placeholder="Masukkan password lama"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-semibold">Password Baru</label>
                  <input 
                    type="password" 
                    className="form-control rounded-3" 
                    required 
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label small fw-semibold">Konfirmasi Password Baru</label>
                  <input 
                    type="password" 
                    className="form-control rounded-3" 
                    required 
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-mint-primary rounded-pill px-4 fw-bold"
                  disabled={passLoading}
                >
                  {passLoading ? 'Simpan...' : 'Simpan Password Baru 🔒'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: KODE TOKEN SAYA */}
          {activeTab === 'TOKENS' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <h5 className="fw-bold text-mint-heading mb-0">
                  <i className="ri-coupon-3-line me-2 text-mint-primary"></i> Daftar Kode Token Paket Saya
                </h5>
                <button onClick={fetchTokens} className="btn btn-sm btn-mint-outline rounded-pill" disabled={tokensLoading}>
                  <i className={`ri-refresh-line me-1 ${tokensLoading ? 'spin' : ''}`}></i> Refresh
                </button>
              </div>

              {tokensLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-mint-primary" role="status"></div>
                  <div className="small text-muted mt-2">Memuat token paket Anda...</div>
                </div>
              ) : tokens.length === 0 ? (
                <div className="text-center py-5 bg-mint-light rounded-4 p-4 my-3">
                  <i className="ri-ticket-2-line display-4 text-muted mb-2 d-block"></i>
                  <h6 className="fw-bold text-secondary">Belum Ada Kode Token Paket</h6>
                  <p className="small text-muted mb-3">Anda belum memiliki kode token paket aktif.</p>
                </div>
              ) : (
                <div className="row g-3">
                  {tokens.map((tk) => {
                    const isActive = tk.status === 'ACTIVE';
                    const isExhausted = tk.status === 'EXHAUSTED' || tk.quota_remaining <= 0;

                    return (
                      <div key={tk.token_code} className="col-12 col-md-6">
                        <div className="card border-0 shadow-sm rounded-4 p-3 bg-mint-light h-100 d-flex flex-column justify-content-between border-start border-4 border-mint-primary">
                          <div>
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <span className={`badge rounded-pill px-3 py-1 ${isActive ? 'bg-success text-white' : 'bg-secondary text-white'}`}>
                                {isActive ? '✅ AKTIF' : '🔒 HABIS'}
                              </span>
                              <span className="small text-muted font-monospace">
                                Sisa: <b>{tk.quota_remaining}</b> / {tk.quota_total}x
                              </span>
                            </div>

                            <h6 className="fw-bold text-mint-heading mb-1">{tk.package_name}</h6>
                            
                            <div className="bg-white p-2.5 rounded-3 d-flex align-items-center justify-content-between my-3 border">
                              <code className="fs-6 fw-bold text-mint-heading font-monospace">{tk.token_code}</code>
                              <button 
                                onClick={() => handleCopy(tk.token_code)}
                                className="btn btn-mint-primary btn-sm rounded-pill px-3 py-1 text-nowrap small fw-semibold"
                              >
                                {copiedToken === tk.token_code ? '✅ Tersalin' : '📋 Salin'}
                              </button>
                            </div>
                          </div>

                          {isActive && (
                            <button 
                              onClick={() => onNavigate('order')}
                              className="btn btn-mint-outline w-100 rounded-pill btn-sm fw-bold"
                            >
                              Gunakan di Form Order ➔
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RIWAYAT PESANAN */}
          {activeTab === 'ORDERS' && (
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
              <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-2">
                <h5 className="fw-bold text-mint-heading mb-0">
                  <i className="ri-history-line me-2 text-mint-primary"></i> Riwayat Pesanan Dokumen
                </h5>
                <button onClick={fetchOrders} className="btn btn-sm btn-mint-outline rounded-pill" disabled={ordersLoading}>
                  <i className={`ri-refresh-line me-1 ${ordersLoading ? 'spin' : ''}`}></i> Refresh
                </button>
              </div>

              {ordersLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-mint-primary" role="status"></div>
                  <div className="small text-muted mt-2">Memuat riwayat pesanan...</div>
                </div>
              ) : myOrders.length === 0 ? (
                <div className="text-center py-5 bg-mint-light rounded-4 p-4 my-3">
                  <i className="ri-inbox-archive-line display-4 text-muted mb-2 d-block"></i>
                  <h6 className="fw-bold text-secondary">Belum Ada Riwayat Pesanan</h6>
                  <p className="small text-muted mb-3">Dokumen yang Anda kirim untuk dicek akan tampil di sini.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="bg-mint-light small text-secondary">
                      <tr>
                        <th>KODE ORDER</th>
                        <th>LAYANAN</th>
                        <th>FILE DOKUMEN</th>
                        <th>STATUS</th>
                        <th>AKSI / DOWNLOAD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myOrders.map(ord => (
                        <tr key={ord.id}>
                          <td className="fw-bold text-mint-primary font-monospace">{ord.id}</td>
                          <td>
                            <span className="badge bg-mint-dark text-white rounded-pill small">{ord.serviceName}</span>
                          </td>
                          <td className="small font-semibold text-truncate" style={{ maxWidth: '180px' }}>
                            {ord.fileName}
                          </td>
                          <td>
                            <span className={`badge rounded-pill ${ord.status === 'COMPLETED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                              {ord.status === 'COMPLETED' ? '✅ SELESAI' : '⏳ DIPROSES'}
                            </span>
                          </td>
                          <td>
                            {ord.status === 'COMPLETED' ? (
                              <a 
                                href={`/api/orders/download/${ord.id}`} 
                                download 
                                className="btn btn-sm btn-mint-primary rounded-pill px-3 py-1 fw-bold text-nowrap"
                              >
                                <i className="ri-download-line me-1"></i> Unduh PDF
                              </a>
                            ) : (
                              <span className="small text-muted">Menunggu Admin</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
