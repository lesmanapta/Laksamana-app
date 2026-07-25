import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ user, onLoginSuccess }) {
  const [orders, setOrders] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [activeTab, setActiveTab] = useState('ORDERS');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Super Admin Login state
  const [adminEmail, setAdminEmail] = useState('admin@laksamana.id');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Paraphrase completion form state
  const [similarityIndex, setSimilarityIndex] = useState('5');
  const [aiScore, setAiScore] = useState('1');
  const [adminNotes, setAdminNotes] = useState('File parafrase sudah diperbaiki dan lolos Turnitin No-Repo.');
  const [revisedFile, setRevisedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const isSuperAdmin = user && (user.role === 'superadmin' || user.role === 'admin');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const resOrders = await fetch('/api/admin/orders');
      const dataOrders = await resOrders.json();
      setOrders(dataOrders.orders || []);

      const resUsers = await fetch('/api/admin/users');
      const dataUsers = await resUsers.json();
      setUsersList(dataUsers.users || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdminData();
    }
  }, [isSuperAdmin]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Login Admin Gagal');

      if (data.user.role !== 'superadmin' && data.user.role !== 'admin') {
        throw new Error('Akun Anda tidak memiliki hak akses Super Admin!');
      }

      localStorage.setItem('accessToken', data.token);
      if (onLoginSuccess) onLoginSuccess(data.user);
      fetchAdminData();
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyUser = async (userId, userEmail) => {
    if (!window.confirm(`Aktivasi akun user ${userEmail}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengaktivasi user');
      setMessage(`✅ ${data.message}`);
      fetchAdminData();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleCompleteOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setSubmitting(true);
    setMessage('');

    const formData = new FormData();
    formData.append('similarityIndex', similarityIndex);
    formData.append('aiScore', aiScore);
    formData.append('adminNotes', adminNotes);
    if (revisedFile) {
      formData.append('revisedDocument', revisedFile);
    }

    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/complete`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal menyelesaikan pesanan');

      setMessage(`✅ ${data.message}`);
      setSelectedOrder(null);
      fetchAdminData();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'ALL') return true;
    if (filter === 'PARAFRASE') return o.serviceSlug === 'parafrase';
    if (filter === 'TURNITIN') return o.serviceSlug === 'cek-plagiasi';
    if (filter === 'PROCESSING') return o.status === 'PROCESSING';
    return true;
  });

  if (!isSuperAdmin) {
    return (
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-5">
            <div className="card border-0 shadow-lg rounded-4 p-4 text-center">
              <div className="bg-custom-purple text-white icon-box-shape mx-auto mb-3">
                <i className="ri-shield-user-line fs-2"></i>
              </div>
              <h4 className="fw-bold mb-1">Login Super Admin</h4>
              <p className="small text-muted mb-4">Masuk untuk mengelola seluruh pesanan & akun Laksamana</p>

              {loginError && <div className="alert alert-danger small py-2">{loginError}</div>}

              <form onSubmit={handleAdminLogin}>
                <div className="mb-3 text-start">
                  <label className="form-label small fw-semibold">Email Super Admin</label>
                  <input 
                    type="email" 
                    className="form-control rounded-3" 
                    required 
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                  />
                </div>

                <div className="mb-4 text-start">
                  <label className="form-label small fw-semibold">Password Admin</label>
                  <input 
                    type="password" 
                    className="form-control rounded-3" 
                    placeholder="Masukkan password admin"
                    required 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-custom-purple w-100 rounded-pill py-2 fw-semibold"
                  disabled={loginLoading}
                >
                  {loginLoading ? 'Memverifikasi...' : 'Masuk Dashboard Admin 👑'}
                </button>
              </form>

              <div className="bg-light p-3 rounded-3 mt-4 text-start small">
                <div className="fw-bold text-dark mb-1">💡 Kredensial Super Admin Default:</div>
                <div className="text-secondary">Email: <code>admin@laksamana.id</code></div>
                <div className="text-secondary">Password: <code>adminlaksamana2026</code></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container my-5">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 pb-3 border-bottom">
        <div>
          <span className="badge bg-warning text-dark px-3 py-2 rounded-pill small mb-1 fw-bold">👑 Super Admin Logged In</span>
          <h3 className="fw-bold mb-0">Dashboard Admin <span className="text-custom-orange">Laksamana</span></h3>
        </div>
        <button onClick={fetchAdminData} className="btn btn-outline-secondary rounded-pill px-4 btn-sm mt-3 mt-md-0">
          <i className="ri-refresh-line me-1"></i> Refresh Data
        </button>
      </div>

      {message && <div className="alert alert-info rounded-3 mb-4">{message}</div>}

      <ul className="nav nav-tabs mb-4 border-bottom-0">
        <li className="nav-item">
          <button 
            className={`nav-link border-0 rounded-pill px-4 py-2 me-2 ${activeTab === 'ORDERS' ? 'bg-custom-orange text-white fw-bold' : 'text-dark bg-light'}`}
            onClick={() => setActiveTab('ORDERS')}
          >
            📋 Kelola Semua Pesanan ({orders.length})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link border-0 rounded-pill px-4 py-2 ${activeTab === 'USERS' ? 'bg-custom-orange text-white fw-bold' : 'text-dark bg-light'}`}
            onClick={() => setActiveTab('USERS')}
          >
            👥 Kelola Pengguna ({usersList.length})
          </button>
        </li>
      </ul>

      {activeTab === 'ORDERS' && (
        <div>
          <div className="d-flex gap-2 mb-4 overflow-x-auto pb-2">
            {[
              { key: 'ALL', label: 'Semua Pesanan' },
              { key: 'PARAFRASE', label: '📝 Jasa Parafrase' },
              { key: 'TURNITIN', label: '🛡️ Turnitin No-Repo' },
              { key: 'PROCESSING', label: '⏳ Perlu Diproses' }
            ].map(f => (
              <button 
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`btn btn-sm rounded-pill px-3 fw-medium ${filter === f.key ? 'btn-custom-orange' : 'btn-light border text-secondary'}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light small text-secondary">
                  <tr>
                    <th className="ps-4">KODE ORDER</th>
                    <th>PELANGGAN (WA)</th>
                    <th>LAYANAN</th>
                    <th>FILE DOKUMEN & LAPORAN</th>
                    <th>STATUS</th>
                    <th>WAKTU (MASUK & KIRIM)</th>
                    <th className="text-end pe-4">AKSI ADMIN</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-5 text-muted">
                        Belum ada pesanan pada kategori ini.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(ord => {
                      const timeCreated = formatDateTime(ord.createdAt);
                      const timeCompleted = formatDateTime(ord.completedAt);

                      return (
                        <tr key={ord.id}>
                          <td className="ps-4 fw-bold text-custom-purple">{ord.id}</td>
                          <td>
                            <span className="fw-semibold d-block">{ord.whatsapp}</span>
                            <small className="text-muted">{ord.email || 'No Email'}</small>
                          </td>
                          <td>
                            <span className="badge bg-custom-orange rounded-pill small">{ord.serviceName}</span>
                          </td>
                          <td>
                            <span className="small text-truncate d-block fw-semibold" style={{ maxWidth: '180px' }}>{ord.fileName}</span>
                            <div className="d-flex flex-column gap-1 mt-1">
                              {ord.filePath && (
                                <a href={`http://localhost:5000${ord.filePath}`} download className="small text-primary text-decoration-none">
                                  <i className="ri-file-download-line me-1"></i> 1. File Utama (Mau Diparafrase)
                                </a>
                              )}
                              {ord.plagiarismReportPath && (
                                <a href={`http://localhost:5000${ord.plagiarismReportPath}`} download className="small text-danger text-decoration-none">
                                  <i className="ri-file-search-line me-1"></i> 2. Laporan Turnitin Pelanggan
                                </a>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`badge rounded-pill ${ord.status === 'COMPLETED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                              {ord.status}
                            </span>
                          </td>
                          <td className="small">
                            <div className="text-secondary">
                              <i className="ri-time-line me-1 text-primary"></i> <b>Masuk:</b> {timeCreated || '-'}
                            </div>
                            <div className="mt-1">
                              <i className="ri-send-plane-fill me-1 text-success"></i> <b>Kirim WA:</b>{' '}
                              {timeCompleted ? (
                                <span className="text-success fw-semibold">{timeCompleted}</span>
                              ) : (
                                <span className="badge bg-light text-dark border">⏳ Belum Dikirim</span>
                              )}
                            </div>
                          </td>
                          <td className="text-end pe-4">
                            <button 
                              onClick={() => setSelectedOrder(ord)}
                              className="btn btn-sm btn-custom-purple rounded-pill px-3 fw-medium"
                            >
                              <i className="ri-edit-box-line me-1"></i> Kelola & Upload
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'USERS' && (
        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light small text-secondary">
                <tr>
                  <th className="ps-4">NAMA USER</th>
                  <th>EMAIL</th>
                  <th>ROLE</th>
                  <th>NO. WHATSAPP</th>
                  <th>STATUS AKTIVASI</th>
                  <th>TANGGAL DAFTAR</th>
                  <th className="text-end pe-4">AKSI ADMIN</th>
                </tr>
              </thead>
              <tbody>
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-5 text-muted">
                      Belum ada pengguna terdaftar.
                    </td>
                  </tr>
                ) : (
                  usersList.map(u => (
                    <tr key={u.id}>
                      <td className="ps-4 fw-bold">{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge rounded-pill ${u.role === 'superadmin' ? 'bg-danger' : 'bg-secondary'}`}>
                          {u.role || 'user'}
                        </span>
                      </td>
                      <td>{u.whatsapp || '-'}</td>
                      <td>
                        {u.is_verified === 1 ? (
                          <span className="badge bg-success rounded-pill">✅ Terverifikasi</span>
                        ) : (
                          <span className="badge bg-warning text-dark rounded-pill">⏳ Menunggu WA</span>
                        )}
                      </td>
                      <td className="small text-muted">{new Date(u.created_at).toLocaleDateString('id-ID')}</td>
                      <td className="text-end pe-4">
                        {u.is_verified === 0 ? (
                          <button 
                            onClick={() => handleVerifyUser(u.id, u.email)}
                            className="btn btn-sm btn-success rounded-pill px-3 fw-semibold"
                          >
                            <i className="ri-checkbox-circle-line me-1"></i> Aktivasi Akun
                          </button>
                        ) : (
                          <span className="small text-muted">Aktif</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Edit Order */}
      {selectedOrder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg p-3">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  Proses Pesanan: <span className="text-custom-orange">{selectedOrder.id}</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
              </div>

              <form onSubmit={handleCompleteOrder}>
                <div className="modal-body">
                  <div className="bg-light p-3 rounded-3 mb-3 small">
                    <div><b>Layanan:</b> {selectedOrder.serviceName}</div>
                    <div><b>File Pelanggan:</b> {selectedOrder.fileName}</div>
                    {selectedOrder.plagiarismReportPath && (
                      <div className="mt-1">
                        <a href={`http://localhost:5000${selectedOrder.plagiarismReportPath}`} download className="text-danger fw-bold text-decoration-none">
                          <i className="ri-file-search-line me-1"></i> Unduh Laporan Turnitin Pelanggan
                        </a>
                      </div>
                    )}
                    <div><b>No. WA:</b> {selectedOrder.whatsapp}</div>
                    <div><b>Waktu Masuk:</b> {formatDateTime(selectedOrder.createdAt)}</div>
                  </div>

                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Hasil Turnitin (%)</label>
                      <input 
                        type="number" 
                        className="form-control rounded-3" 
                        value={similarityIndex}
                        onChange={(e) => setSimilarityIndex(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Hasil AI Score (%)</label>
                      <input 
                        type="number" 
                        className="form-control rounded-3" 
                        value={aiScore}
                        onChange={(e) => setAiScore(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Upload File Hasil Parafrase (.DOCX / .PDF)</label>
                    <input 
                      type="file" 
                      className="form-control rounded-3" 
                      onChange={(e) => setRevisedFile(e.target.files[0])}
                    />
                    <small className="text-muted">File ini akan langsung terkirim otomatis ke WhatsApp pelanggan.</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Catatan Admin</label>
                    <textarea 
                      className="form-control rounded-3" 
                      rows="2"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setSelectedOrder(null)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-custom-orange rounded-pill px-4 fw-bold" disabled={submitting}>
                    {submitting ? 'Mengirim...' : 'Selesaikan & Kirim ke WA Customer 🚀'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
