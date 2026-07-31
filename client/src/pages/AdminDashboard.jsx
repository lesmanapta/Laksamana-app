import React, { useState, useEffect } from 'react';

export default function AdminDashboard({ user, onLoginSuccess, onNavigateHome }) {
  const [orders, setOrders] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [packagesList, setPackagesList] = useState([]);
  const [tokensList, setTokensList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const [activeTab, setActiveTab] = useState('ORDERS');
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  // Super Admin Login state (Default: Lesmana.pta@gmail.com / Manto1909@)
  const [adminEmail, setAdminEmail] = useState('Lesmana.pta@gmail.com');
  const [adminPassword, setAdminPassword] = useState('Manto1909@');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Paraphrase completion form state
  const [similarityIndex, setSimilarityIndex] = useState('5');
  const [aiScore, setAiScore] = useState('1');
  const [adminNotes, setAdminNotes] = useState('File parafrase sudah diperbaiki dan lolos Turnitin No-Repo.');
  const [revisedFile, setRevisedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Service Edit / Create form state
  const [serviceModal, setServiceModal] = useState(null); // null or object
  const [serviceSlug, setServiceSlug] = useState('');
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceSubtitle, setServiceSubtitle] = useState('');
  const [serviceIcon, setServiceIcon] = useState('ri-file-line');
  const [servicePrice, setServicePrice] = useState('10000');
  const [serviceUnit, setServiceUnit] = useState('file');
  const [serviceMaxPages, setServiceMaxPages] = useState('800');
  const [serviceDescription, setServiceDescription] = useState('');
  const [serviceActive, setServiceActive] = useState(true);

  // Package Edit / Create form state
  const [packageModal, setPackageModal] = useState(null); // null or object
  const [packageName, setPackageName] = useState('');
  const [packagePrice, setPackagePrice] = useState('27500');
  const [packageQuota, setPackageQuota] = useState('3');
  const [packageValidity, setPackageValidity] = useState('7 hari');
  const [packageActive, setPackageActive] = useState(true);

  // Generate Custom Token form state
  const [customTokenCode, setCustomTokenCode] = useState('');
  const [tokenPkgName, setTokenPkgName] = useState('Token Promo Laksamana');
  const [tokenQuota, setTokenQuota] = useState('5');
  const [tokenWa, setTokenWa] = useState('');
  const [tokenGenerating, setTokenGenerating] = useState(false);

  const isSuperAdmin = user && (user.role === 'superadmin' || user.role === 'admin');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const resOrders = await fetch('/api/admin/orders');
      const dataOrders = await resOrders.json();
      setOrders(dataOrders.orders || []);

      const resServices = await fetch('/api/admin/services');
      const dataServices = await resServices.json();
      setServicesList(dataServices.services || []);

      const resPackages = await fetch('/api/admin/packages');
      const dataPackages = await resPackages.json();
      setPackagesList(dataPackages.packages || []);

      const resUsers = await fetch('/api/admin/users');
      const dataUsers = await resUsers.json();
      setUsersList(dataUsers.users || []);

      const resTokens = await fetch('/api/admin/tokens');
      const dataTokens = await resTokens.json();
      setTokensList(dataTokens.tokens || []);
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

      if (!res.ok) throw new Error(data.error || 'Login Super Admin Gagal');

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

  // ==================== SERVICE HANDLERS ====================
  const handleOpenServiceModal = (svc = null) => {
    if (svc) {
      setServiceModal(svc);
      setServiceSlug(svc.slug || '');
      setServiceTitle(svc.title || '');
      setServiceSubtitle(svc.subtitle || '');
      setServiceIcon(svc.icon || 'ri-file-line');
      setServicePrice(String(svc.price || 10000));
      setServiceUnit(svc.unit || 'file');
      setServiceMaxPages(String(svc.max_pages || 800));
      setServiceDescription(svc.description || '');
      setServiceActive(Boolean(svc.active));
    } else {
      setServiceModal({ isNew: true });
      setServiceSlug('');
      setServiceTitle('');
      setServiceSubtitle('');
      setServiceIcon('ri-file-line');
      setServicePrice('10000');
      setServiceUnit('file');
      setServiceMaxPages('800');
      setServiceDescription('');
      setServiceActive(true);
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      const isNew = serviceModal.isNew;
      const url = isNew ? '/api/admin/services' : `/api/admin/services/${serviceModal.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: serviceSlug,
          title: serviceTitle,
          subtitle: serviceSubtitle,
          icon: serviceIcon,
          price: parseInt(servicePrice) || 10000,
          unit: serviceUnit,
          maxPages: parseInt(serviceMaxPages) || 800,
          description: serviceDescription,
          active: serviceActive
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan layanan');

      setMessage(`✅ ${data.message}`);
      setServiceModal(null);
      fetchAdminData();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleDeleteService = async (svcId, svcTitle) => {
    if (!window.confirm(`Hapus layanan "${svcTitle}"?`)) return;
    try {
      const res = await fetch(`/api/admin/services/${svcId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus layanan');
      setMessage(`✅ ${data.message}`);
      fetchAdminData();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  // ==================== PACKAGE HANDLERS ====================
  const handleOpenPackageModal = (pkg = null) => {
    if (pkg) {
      setPackageModal(pkg);
      setPackageName(pkg.name || '');
      setPackagePrice(String(pkg.price || 27500));
      setPackageQuota(String(pkg.quota || 3));
      setPackageValidity(pkg.validity || '7 hari');
      setPackageActive(Boolean(pkg.active));
    } else {
      setPackageModal({ isNew: true });
      setPackageName('');
      setPackagePrice('27500');
      setPackageQuota('3');
      setPackageValidity('7 hari');
      setPackageActive(true);
    }
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();
    try {
      const isNew = packageModal.isNew;
      const url = isNew ? '/api/admin/packages' : `/api/admin/packages/${packageModal.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: packageName,
          price: parseInt(packagePrice) || 27500,
          quota: parseInt(packageQuota) || 3,
          validity: packageValidity,
          active: packageActive
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan paket');

      setMessage(`✅ ${data.message}`);
      setPackageModal(null);
      fetchAdminData();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleDeletePackage = async (pkgId, pkgName) => {
    if (!window.confirm(`Hapus paket "${pkgName}"?`)) return;
    try {
      const res = await fetch(`/api/admin/packages/${pkgId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus paket');
      setMessage(`✅ ${data.message}`);
      fetchAdminData();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  // ==================== USER HANDLERS ====================
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

  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengubah role');
      setMessage(`✅ ${data.message}`);
      fetchAdminData();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`Hapus akun user ${userEmail}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus user');
      setMessage(`✅ ${data.message}`);
      fetchAdminData();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    }
  };

  const handleGenerateToken = async (e) => {
    e.preventDefault();
    setTokenGenerating(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/tokens/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customCode: customTokenCode,
          packageName: tokenPkgName,
          quotaTotal: tokenQuota,
          whatsapp: tokenWa
        })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal menerbitkan token');

      setMessage(`✅ ${data.message}`);
      setCustomTokenCode('');
      setTokenWa('');
      fetchAdminData();
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setTokenGenerating(false);
    }
  };

  const handleDeleteToken = async (tokenCode) => {
    if (!window.confirm(`Hapus/batalkan token ${tokenCode}?`)) return;
    try {
      const res = await fetch(`/api/admin/tokens/${tokenCode}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus token');
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
      <div className="min-vh-100 d-flex align-items-center justify-content-center p-3" style={{ background: '#0f172a', color: '#f8fafc' }}>
        <div className="card border-0 shadow-lg rounded-4 overflow-hidden" style={{ maxWidth: '440px', width: '100%', background: '#1e293b', border: '1px solid #334155' }}>
          <div className="p-4 p-md-5 text-center">
            <div className="d-inline-flex align-items-center justify-content-center bg-emerald-500 bg-opacity-20 text-emerald-400 p-3 rounded-circle mb-3" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
              <i className="ri-shield-keyhole-line fs-1"></i>
            </div>
            <h4 className="fw-bold mb-1 text-white">Laksamana Administration</h4>
            <p className="small text-slate-400 mb-4" style={{ color: '#94a3b8' }}>Masuk dengan kredensial Super Admin untuk mengelola sistem</p>

            {loginError && <div className="alert alert-danger small py-2 rounded-3 mb-3">{loginError}</div>}

            <form onSubmit={handleAdminLogin}>
              <div className="mb-3 text-start">
                <label className="form-label small fw-semibold text-slate-300" style={{ color: '#cbd5e1' }}>Email Super Admin</label>
                <input 
                  type="email" 
                  className="form-control bg-slate-900 border-slate-700 text-white rounded-3 py-2.5" 
                  style={{ background: '#0f172a', borderColor: '#334155', color: '#fff' }}
                  required 
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>

              <div className="mb-4 text-start">
                <label className="form-label small fw-semibold text-slate-300" style={{ color: '#cbd5e1' }}>Password Super Admin</label>
                <input 
                  type="password" 
                  className="form-control bg-slate-900 border-slate-700 text-white rounded-3 py-2.5" 
                  style={{ background: '#0f172a', borderColor: '#334155', color: '#fff' }}
                  placeholder="Password super admin"
                  required 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-emerald w-100 rounded-3 py-2.5 fw-bold shadow"
                style={{ background: '#059669', borderColor: '#059669', color: '#fff' }}
                disabled={loginLoading}
              >
                {loginLoading ? 'Memverifikasi...' : '🔑 Masuk Control Panel'}
              </button>
            </form>

            <div className="p-3 rounded-3 mt-4 text-start small border border-slate-700" style={{ background: '#0f172a', borderColor: '#334155' }}>
              <div className="fw-bold mb-1" style={{ color: '#34d399' }}>💡 Super Admin Default:</div>
              <div className="font-monospace text-slate-300" style={{ color: '#cbd5e1' }}>Email: <code>Lesmana.pta@gmail.com</code></div>
              <div className="font-monospace text-slate-300" style={{ color: '#cbd5e1' }}>Password: <code>Manto1909@</code></div>
            </div>

            {onNavigateHome && (
              <button 
                onClick={onNavigateHome}
                className="btn btn-link text-slate-400 small mt-3 text-decoration-none"
                style={{ color: '#94a3b8' }}
              >
                ← Kembali ke Website Utama
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = orders.reduce((acc, o) => acc + (o.totalPrice || 0), 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'PROCESSING' || o.status === 'PENDING_PAYMENT').length;

  return (
    <div className="d-flex min-vh-100" style={{ background: '#f1f5f9', color: '#1e293b' }}>
      
      {/* SIDEBAR FILAMENT / ADMINLTE STYLE */}
      <aside className="d-flex flex-column justify-content-between p-3 border-end" style={{ width: '270px', minWidth: '270px', background: '#0f172a', color: '#f8fafc' }}>
        <div>
          {/* Logo Header */}
          <div className="d-flex align-items-center gap-2 px-2 py-3 mb-3 border-bottom border-slate-800" style={{ borderColor: '#1e293b' }}>
            <div className="bg-emerald-500 text-white rounded-3 px-2.5 py-1 fw-bold fs-5 shadow-sm" style={{ background: '#059669' }}>
              🌿
            </div>
            <div>
              <h6 className="fw-extrabold mb-0 text-white" style={{ letterSpacing: '0.5px' }}>LAKSAMANA</h6>
              <small className="badge bg-emerald-900 text-emerald-300 rounded-pill px-2" style={{ background: '#064e3b', color: '#6ee7b7', fontSize: '0.65rem' }}>
                ADMIN CONTROL PANEL
              </small>
            </div>
          </div>

          {/* Navigation Menu Group */}
          <div className="small fw-bold text-uppercase opacity-50 px-3 mb-2" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
            PANEL KONTROL SISTEM
          </div>

          <nav className="nav flex-column gap-1">
            <button 
              className={`nav-link text-start rounded-3 px-3 py-2.5 border-0 d-flex align-items-center justify-content-between ${activeTab === 'ORDERS' ? 'fw-bold text-white' : 'text-slate-400'}`}
              style={activeTab === 'ORDERS' ? { background: '#059669', color: '#fff' } : { color: '#cbd5e1', background: 'transparent' }}
              onClick={() => setActiveTab('ORDERS')}
            >
              <span><i className="ri-file-list-3-line me-2 fs-5"></i> Pesanan Dokumen</span>
              {pendingOrdersCount > 0 && (
                <span className="badge rounded-pill bg-warning text-dark">{pendingOrdersCount}</span>
              )}
            </button>

            <button 
              className={`nav-link text-start rounded-3 px-3 py-2.5 border-0 d-flex align-items-center justify-content-between ${activeTab === 'SERVICES' ? 'fw-bold text-white' : 'text-slate-400'}`}
              style={activeTab === 'SERVICES' ? { background: '#059669', color: '#fff' } : { color: '#cbd5e1', background: 'transparent' }}
              onClick={() => setActiveTab('SERVICES')}
            >
              <span><i className="ri-tools-line me-2 fs-5"></i> Kelola Layanan</span>
              <span className="badge rounded-pill bg-slate-700 text-slate-300" style={{ background: '#334155' }}>{servicesList.length}</span>
            </button>

            <button 
              className={`nav-link text-start rounded-3 px-3 py-2.5 border-0 d-flex align-items-center justify-content-between ${activeTab === 'PACKAGES' ? 'fw-bold text-white' : 'text-slate-400'}`}
              style={activeTab === 'PACKAGES' ? { background: '#059669', color: '#fff' } : { color: '#cbd5e1', background: 'transparent' }}
              onClick={() => setActiveTab('PACKAGES')}
            >
              <span><i className="ri-box-3-line me-2 fs-5"></i> Kelola Paket Kuota</span>
              <span className="badge rounded-pill bg-slate-700 text-slate-300" style={{ background: '#334155' }}>{packagesList.length}</span>
            </button>

            <button 
              className={`nav-link text-start rounded-3 px-3 py-2.5 border-0 d-flex align-items-center justify-content-between ${activeTab === 'TOKENS' ? 'fw-bold text-white' : 'text-slate-400'}`}
              style={activeTab === 'TOKENS' ? { background: '#059669', color: '#fff' } : { color: '#cbd5e1', background: 'transparent' }}
              onClick={() => setActiveTab('TOKENS')}
            >
              <span><i className="ri-coupon-3-line me-2 fs-5"></i> Kelola Token Paket</span>
              <span className="badge rounded-pill bg-slate-700 text-slate-300" style={{ background: '#334155' }}>{tokensList.length}</span>
            </button>

            <button 
              className={`nav-link text-start rounded-3 px-3 py-2.5 border-0 d-flex align-items-center justify-content-between ${activeTab === 'USERS' ? 'fw-bold text-white' : 'text-slate-400'}`}
              style={activeTab === 'USERS' ? { background: '#059669', color: '#fff' } : { color: '#cbd5e1', background: 'transparent' }}
              onClick={() => setActiveTab('USERS')}
            >
              <span><i className="ri-user-settings-line me-2 fs-5"></i> Kelola Pengguna</span>
              <span className="badge rounded-pill bg-slate-700 text-slate-300" style={{ background: '#334155' }}>{usersList.length}</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Footer: Admin Profile & Actions */}
        <div className="pt-3 border-top border-slate-800" style={{ borderColor: '#1e293b' }}>
          <div className="d-flex align-items-center gap-2 mb-3 px-2">
            <div className="rounded-circle bg-emerald-600 text-white p-2 d-flex align-items-center justify-content-center font-bold" style={{ width: '38px', height: '38px', background: '#059669' }}>
              👑
            </div>
            <div className="text-truncate">
              <div className="fw-bold small text-white">{user?.name || 'Super Admin'}</div>
              <small className="text-slate-400 d-block text-truncate" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{user?.email}</small>
            </div>
          </div>

          <div className="d-grid gap-2">
            {onNavigateHome && (
              <button 
                onClick={onNavigateHome}
                className="btn btn-sm btn-outline-light rounded-3 text-start small border-slate-700 text-slate-300"
                style={{ borderColor: '#334155', color: '#cbd5e1' }}
              >
                <i className="ri-external-link-line me-1"></i> Buka Website Utama
              </button>
            )}

            <button 
              onClick={() => {
                localStorage.removeItem('accessToken');
                window.location.reload();
              }}
              className="btn btn-sm btn-danger rounded-3 text-start small fw-bold"
            >
              <i className="ri-logout-box-r-line me-1"></i> Logout Admin Panel
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow-1 p-4 overflow-y-auto" style={{ background: '#f8fafc' }}>
        
        {/* Topbar */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 pb-3 border-bottom bg-white p-3 rounded-4 shadow-sm">
          <div>
            <span className="small text-muted text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>System Dashboard</span>
            <h4 className="fw-bold mb-0 text-slate-800">
              {activeTab === 'ORDERS' && '📋 Kelola Pesanan Dokumen'}
              {activeTab === 'SERVICES' && '🛠️ Kelola Layanan & Tarif'}
              {activeTab === 'PACKAGES' && '📦 Kelola Paket Kuota'}
              {activeTab === 'TOKENS' && '🎟️ Kelola Token & Kupon'}
              {activeTab === 'USERS' && '👥 Kelola Pengguna Sistem'}
            </h4>
          </div>

          <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
            <button onClick={fetchAdminData} className="btn btn-sm btn-outline-secondary rounded-pill px-3">
              <i className={`ri-refresh-line me-1 ${loading ? 'spin' : ''}`}></i> Refresh Data
            </button>
          </div>
        </div>

        {message && <div className="alert alert-info rounded-4 mb-4 shadow-sm">{message}</div>}

        {/* STATS WIDGET ROW (Filament Style) */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white border-start border-4 border-emerald-500" style={{ borderLeftColor: '#10b981 !important' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="small text-muted font-semibold d-block">Total Pendapatan</span>
                  <h5 className="fw-extrabold text-slate-800 mb-0 mt-1">Rp {totalRevenue.toLocaleString('id-ID')}</h5>
                </div>
                <div className="p-3 rounded-circle bg-emerald-50 text-emerald-600" style={{ background: '#ecfdf5', color: '#059669' }}>
                  <i className="ri-wallet-3-line fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white border-start border-4 border-blue-500" style={{ borderLeftColor: '#3b82f6 !important' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="small text-muted font-semibold d-block">Total Pesanan</span>
                  <h5 className="fw-extrabold text-slate-800 mb-0 mt-1">{orders.length} Dokumen</h5>
                </div>
                <div className="p-3 rounded-circle bg-blue-50 text-blue-600" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <i className="ri-file-text-line fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white border-start border-4 border-amber-500" style={{ borderLeftColor: '#f59e0b !important' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="small text-muted font-semibold d-block">Perlu Diproses</span>
                  <h5 className="fw-extrabold text-amber-600 mb-0 mt-1">{pendingOrdersCount} Dokumen</h5>
                </div>
                <div className="p-3 rounded-circle bg-amber-50 text-amber-600" style={{ background: '#fffbeb', color: '#d97706' }}>
                  <i className="ri-timer-line fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-xl-3">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white border-start border-4 border-purple-500" style={{ borderLeftColor: '#a855f7 !important' }}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <span className="small text-muted font-semibold d-block">Token Paket Active</span>
                  <h5 className="fw-extrabold text-purple-600 mb-0 mt-1">{tokensList.length} Token</h5>
                </div>
                <div className="p-3 rounded-circle bg-purple-50 text-purple-600" style={{ background: '#faf5ff', color: '#9333ea' }}>
                  <i className="ri-coupon-3-line fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TAB ORDERS */}

      {/* TAB ORDERS */}
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
                                  <i className="ri-file-download-line me-1"></i> 1. File Utama
                                </a>
                              )}
                              {ord.plagiarismReportPath && (
                                <a href={`http://localhost:5000${ord.plagiarismReportPath}`} download className="small text-danger text-decoration-none">
                                  <i className="ri-file-search-line me-1"></i> 2. Laporan Turnitin
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

      {/* TAB SERVICES / PRODUK */}
      {activeTab === 'SERVICES' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">🛠️ Daftar Layanan & Tarif Produk</h5>
            <button onClick={() => handleOpenServiceModal(null)} className="btn btn-mint-primary rounded-pill btn-sm px-3 fw-bold">
              + Tambah Layanan Baru
            </button>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light small text-secondary">
                  <tr>
                    <th className="ps-4">SLUG LAYANAN</th>
                    <th>NAMA PRODUK / LAYANAN</th>
                    <th>TARIF HARGA</th>
                    <th>SATUAN</th>
                    <th>STATUS AKTIF</th>
                    <th className="text-end pe-4">AKSI ADMIN</th>
                  </tr>
                </thead>
                <tbody>
                  {servicesList.map(s => (
                    <tr key={s.id}>
                      <td className="ps-4 font-monospace small fw-bold text-mint-heading">{s.slug}</td>
                      <td>
                        <span className="fw-bold text-dark d-block">{s.title}</span>
                        <small className="text-muted">{s.subtitle}</small>
                      </td>
                      <td className="fw-bold text-mint-primary">
                        Rp {s.price ? s.price.toLocaleString('id-ID') : 0}
                      </td>
                      <td><span className="badge bg-light text-dark border">{s.unit}</span></td>
                      <td>
                        <span className={`badge rounded-pill ${s.active ? 'bg-success' : 'bg-secondary'}`}>
                          {s.active ? '✅ Aktif' : '🔒 Segera Hadir'}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <button 
                          onClick={() => handleOpenServiceModal(s)}
                          className="btn btn-sm btn-outline-primary rounded-pill px-3 me-1"
                        >
                          Edit Tarif
                        </button>
                        <button 
                          onClick={() => handleDeleteService(s.id, s.title)}
                          className="btn btn-sm btn-outline-danger rounded-pill px-2"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB PACKAGES / PAKET KUOTA */}
      {activeTab === 'PACKAGES' && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0">📦 Daftar Paket Token Kuota</h5>
            <button onClick={() => handleOpenPackageModal(null)} className="btn btn-mint-primary rounded-pill btn-sm px-3 fw-bold">
              + Tambah Paket Kuota Baru
            </button>
          </div>

          <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light small text-secondary">
                  <tr>
                    <th className="ps-4">NAMA PAKET</th>
                    <th>HARGA PAKET</th>
                    <th>KUOTA CEK</th>
                    <th>MASA AKTIF</th>
                    <th>STATUS AKTIF</th>
                    <th className="text-end pe-4">AKSI ADMIN</th>
                  </tr>
                </thead>
                <tbody>
                  {packagesList.map(p => (
                    <tr key={p.id}>
                      <td className="ps-4 fw-bold text-dark">{p.name}</td>
                      <td className="fw-bold text-mint-primary">
                        Rp {p.price ? p.price.toLocaleString('id-ID') : 0}
                      </td>
                      <td>
                        <span className="badge bg-mint-light text-mint-heading font-monospace px-2 py-1">
                          {p.quota}x Cek
                        </span>
                      </td>
                      <td className="small text-muted">{p.validity}</td>
                      <td>
                        <span className={`badge rounded-pill ${p.active ? 'bg-success' : 'bg-secondary'}`}>
                          {p.active ? '✅ Aktif' : '🔒 Non-Aktif'}
                        </span>
                      </td>
                      <td className="text-end pe-4">
                        <button 
                          onClick={() => handleOpenPackageModal(p)}
                          className="btn btn-sm btn-outline-primary rounded-pill px-3 me-1"
                        >
                          Edit Paket
                        </button>
                        <button 
                          onClick={() => handleDeletePackage(p.id, p.name)}
                          className="btn btn-sm btn-outline-danger rounded-pill px-2"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB TOKENS & KUPON */}
      {activeTab === 'TOKENS' && (
        <div>
          <div className="row mb-4">
            <div className="col-12 col-md-5 mb-4 mb-md-0">
              <div className="card border-0 shadow-sm rounded-4 p-4">
                <h5 className="fw-bold text-mint-heading mb-3">🎟️ Terbitkan Token / Kupon Custom</h5>
                <form onSubmit={handleGenerateToken}>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Kode Token (Opsional)</label>
                    <input 
                      type="text" 
                      className="form-control rounded-3" 
                      placeholder="Contoh: PROMO50 / LKS-SULTAN"
                      value={customTokenCode}
                      onChange={(e) => setCustomTokenCode(e.target.value)}
                    />
                    <small className="text-muted">Kosongkan untuk auto-generate kode token unik</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nama Paket / Kupon</label>
                    <input 
                      type="text" 
                      className="form-control rounded-3" 
                      required
                      value={tokenPkgName}
                      onChange={(e) => setTokenPkgName(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Total Kuota Cek (x)</label>
                    <input 
                      type="number" 
                      className="form-control rounded-3" 
                      min="1"
                      required
                      value={tokenQuota}
                      onChange={(e) => setTokenQuota(e.target.value)}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-semibold">No. WA Penerima (Kirim via WA Opsional)</label>
                    <input 
                      type="tel" 
                      className="form-control rounded-3" 
                      placeholder="Contoh: 081234567890"
                      value={tokenWa}
                      onChange={(e) => setTokenWa(e.target.value)}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-mint-primary w-100 rounded-pill py-2 fw-bold"
                    disabled={tokenGenerating}
                  >
                    {tokenGenerating ? 'Menerbitkan...' : 'Terbitkan Token Paket 🎟️'}
                  </button>
                </form>
              </div>
            </div>

            <div className="col-12 col-md-7">
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="bg-light small text-secondary">
                      <tr>
                        <th className="ps-4">KODE TOKEN</th>
                        <th>NAMA PAKET</th>
                        <th>KUOTA (SISA / TOTAL)</th>
                        <th>STATUS</th>
                        <th className="text-end pe-4">AKSI ADMIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokensList.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-5 text-muted">
                            Belum ada token / kupon diterbitkan.
                          </td>
                        </tr>
                      ) : (
                        tokensList.map(t => (
                          <tr key={t.token_code}>
                            <td className="ps-4 font-monospace fw-bold text-mint-heading">{t.token_code}</td>
                            <td className="small fw-semibold">{t.package_name}</td>
                            <td>
                              <span className="badge bg-mint-light text-mint-heading font-monospace px-2 py-1">
                                {t.quota_remaining} / {t.quota_total}x
                              </span>
                            </td>
                            <td>
                              <span className={`badge rounded-pill ${t.status === 'ACTIVE' ? 'bg-success' : 'bg-secondary'}`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="text-end pe-4">
                              <button 
                                onClick={() => handleDeleteToken(t.token_code)}
                                className="btn btn-sm btn-outline-danger rounded-pill px-3"
                              >
                                Batal / Hapus
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB USERS - 2 Roles Standard (superadmin & user) */}
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
                        <select 
                          className="form-select form-select-sm rounded-pill fw-semibold"
                          style={{ width: '130px' }}
                          value={u.role || 'user'}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        >
                          <option value="user">user</option>
                          <option value="superadmin">superadmin</option>
                        </select>
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
                        <div className="d-flex justify-content-end gap-1">
                          {u.is_verified === 0 && (
                            <button 
                              onClick={() => handleVerifyUser(u.id, u.email)}
                              className="btn btn-sm btn-success rounded-pill px-3 fw-semibold"
                            >
                              Aktivasi Akun
                            </button>
                          )}
                          <button 
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="btn btn-sm btn-outline-danger rounded-pill px-3"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Edit / Create Service */}
      {serviceModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg p-3">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  {serviceModal.isNew ? 'Tambah Layanan Baru' : `Edit Layanan: ${serviceModal.title}`}
                </h5>
                <button type="button" className="btn-close" onClick={() => setServiceModal(null)}></button>
              </div>
              <form onSubmit={handleSaveService}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Slug Layanan (ID Unik)</label>
                    <input 
                      type="text" 
                      className="form-control rounded-3" 
                      required 
                      disabled={!serviceModal.isNew}
                      value={serviceSlug}
                      onChange={(e) => setServiceSlug(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Judul Layanan</label>
                    <input 
                      type="text" 
                      className="form-control rounded-3" 
                      required
                      value={serviceTitle}
                      onChange={(e) => setServiceTitle(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Subtitle / Tagline</label>
                    <input 
                      type="text" 
                      className="form-control rounded-3" 
                      value={serviceSubtitle}
                      onChange={(e) => setServiceSubtitle(e.target.value)}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Tarif Harga (Rp)</label>
                      <input 
                        type="number" 
                        className="form-control rounded-3" 
                        required
                        value={servicePrice}
                        onChange={(e) => setServicePrice(e.target.value)}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-semibold">Satuan (file/kata/halaman)</label>
                      <input 
                        type="text" 
                        className="form-control rounded-3" 
                        required
                        value={serviceUnit}
                        onChange={(e) => setServiceUnit(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-check form-switch mb-2">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="svcActiveToggle"
                      checked={serviceActive}
                      onChange={(e) => setServiceActive(e.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="svcActiveToggle">
                      Status Layanan Aktif (Ditampilkan di Website)
                    </label>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setServiceModal(null)}>Batal</button>
                  <button type="submit" className="btn btn-mint-primary rounded-pill px-4 fw-bold">Simpan Layanan 🚀</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit / Create Package */}
      {packageModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg p-3">
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title fw-bold">
                  {packageModal.isNew ? 'Tambah Paket Baru' : `Edit Paket: ${packageModal.name}`}
                </h5>
                <button type="button" className="btn-close" onClick={() => setPackageModal(null)}></button>
              </div>
              <form onSubmit={handleSavePackage}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Nama Paket</label>
                    <input 
                      type="text" 
                      className="form-control rounded-3" 
                      required
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Harga (Rp)</label>
                      <input 
                        type="number" 
                        className="form-control rounded-3" 
                        required
                        value={packagePrice}
                        onChange={(e) => setPackagePrice(e.target.value)}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Kuota (x Cek)</label>
                      <input 
                        type="number" 
                        className="form-control rounded-3" 
                        required
                        value={packageQuota}
                        onChange={(e) => setPackageQuota(e.target.value)}
                      />
                    </div>
                    <div className="col-4">
                      <label className="form-label small fw-semibold">Masa Aktif</label>
                      <input 
                        type="text" 
                        className="form-control rounded-3" 
                        required
                        value={packageValidity}
                        onChange={(e) => setPackageValidity(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-check form-switch mb-2">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="pkgActiveToggle"
                      checked={packageActive}
                      onChange={(e) => setPackageActive(e.target.checked)}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="pkgActiveToggle">
                      Status Paket Aktif (Ditampilkan di Website)
                    </label>
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setPackageModal(null)}>Batal</button>
                  <button type="submit" className="btn btn-mint-primary rounded-pill px-4 fw-bold">Simpan Paket 🚀</button>
                </div>
              </form>
            </div>
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
      </main>
    </div>
  );
}
