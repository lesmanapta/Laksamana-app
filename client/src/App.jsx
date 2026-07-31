import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import OrderPage from './pages/OrderPage';
import TrackOrderPage from './pages/TrackOrderPage';
import AdminDashboard from './pages/AdminDashboard';
import TutorialModal from './components/TutorialModal';
import LoginModal from './components/LoginModal';
import PackageCheckoutModal from './components/PackageCheckoutModal';
import UserProfileModal from './components/UserProfileModal';

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [user, setUser] = useState(null);
  const [trackOrderId, setTrackOrderId] = useState('');
  
  const [showTutorial, setShowTutorial] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    // Initial URL path detection
    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath === '/admin' || currentPath.startsWith('/admin')) {
      setActivePage('admin');
    } else if (currentPath === '/order' || currentPath.startsWith('/order')) {
      setActivePage('order');
    } else if (currentPath === '/track' || currentPath.startsWith('/track')) {
      setActivePage('track');
    }

    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path === '/admin' || path.startsWith('/admin')) setActivePage('admin');
      else if (path === '/order' || path.startsWith('/order')) setActivePage('order');
      else if (path === '/track' || path.startsWith('/track')) setActivePage('track');
      else setActivePage('home');
    };

    window.addEventListener('popstate', handlePopState);

    // Fetch initial data
    fetch('/api/services')
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(() => {});

    fetch('/api/services/packages')
      .then(res => res.json())
      .then(data => setPackages(data))
      .catch(() => {});

    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => { if (data.user) setUser(data.user); })
        .catch(() => localStorage.removeItem('accessToken'));
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToPage = (pageName) => {
    setActivePage(pageName);
    let targetPath = '/';
    if (pageName === 'admin') targetPath = '/admin';
    else if (pageName === 'order') targetPath = '/order';
    else if (pageName === 'track') targetPath = '/track';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page: pageName }, '', targetPath);
    }
  };

  const handleSelectService = (service) => {
    setSelectedService(service);
    setActivePage('order');
  };

  const handleSelectPackage = (pkg) => {
    setSelectedPackage(pkg);
    setShowPackageModal(true);
  };

  const handleOrderSuccess = (order) => {
    setTrackOrderId(order.id);
    setActivePage('track');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setActivePage('home');
  };

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-between">
      <div>
        <Navbar 
          activePage={activePage} 
          setActivePage={setActivePage} 
          user={user}
          onOpenLogin={() => setShowLogin(true)}
          onOpenTutorial={() => setShowTutorial(true)}
          onLogout={handleLogout}
          onOpenProfile={() => setShowProfileModal(true)}
        />

        <main>
          {activePage === 'home' && (
            <HomePage 
              services={services} 
              packages={packages} 
              onSelectService={handleSelectService}
              onSelectPackage={handleSelectPackage}
              setActivePage={setActivePage}
            />
          )}

          {activePage === 'order' && (
            <OrderPage 
              selectedService={selectedService} 
              services={services}
              onOrderSuccess={handleOrderSuccess}
            />
          )}

          {activePage === 'track' && (
            <TrackOrderPage initialOrderId={trackOrderId} />
          )}

          {activePage === 'admin' && (
            <AdminDashboard user={user} onLoginSuccess={(usr) => setUser(usr)} />
          )}
        </main>
      </div>

      <footer className="bg-dark text-white py-5 mt-5">
        <div className="container">
          <div className="row g-4">
            <div className="col-md-5">
              <h5 className="fw-bold mb-3">Laksamana<span className="text-custom-orange">.id</span></h5>
              <p className="small text-muted mb-3">
                Platform otomatisasi deteksi plagiarisme No-Repository 24 jam. Menjamin kerahasiaan & keaslian dokumen tugas akhir, skripsi, dan karya tulis ilmiah Anda.
              </p>
              <span className="small text-secondary">© 2026 Laksamana.id - All Rights Reserved.</span>
            </div>
            <div className="col-md-3">
              <h6 className="fw-bold mb-3 text-custom-orange">Layanan Kami</h6>
              <ul className="list-unstyled small text-muted lh-lg">
                <li>• Cek Plagiasi No-Repository</li>
                <li>• Cek Drillbit Jurnal</li>
                <li>• Cek AI GPTZero</li>
                <li>• Jasa Parafrase Otomatis</li>
                <li>• Humanize File AI</li>
              </ul>
            </div>
            <div className="col-md-4">
              <h6 className="fw-bold mb-3 text-custom-orange">Bantuan & Kontak</h6>
              <p className="small text-muted mb-2">Layanan bantuan pelanggan 24 jam via WhatsApp:</p>
              <a href="https://whatsapp.com" target="_blank" rel="noreferrer" className="btn btn-outline-success btn-sm rounded-pill px-3">
                <i className="ri-whatsapp-line me-1"></i> Hubungi CS WhatsApp
              </a>
            </div>
          </div>
        </div>
      </footer>

      <TutorialModal show={showTutorial} onClose={() => setShowTutorial(false)} />
      <LoginModal show={showLogin} onClose={() => setShowLogin(false)} onLoginSuccess={(usr) => setUser(usr)} />
      <PackageCheckoutModal show={showPackageModal} pkg={selectedPackage} onClose={() => setShowPackageModal(false)} />
      <UserProfileModal 
        show={showProfileModal} 
        user={user} 
        onClose={() => setShowProfileModal(false)} 
        onUseToken={() => setActivePage('order')}
      />
    </div>
  );
}
