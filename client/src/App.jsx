import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import OrderPage from './pages/OrderPage';
import TrackOrderPage from './pages/TrackOrderPage';
import AdminDashboard from './pages/AdminDashboard';
import TutorialModal from './components/TutorialModal';
import LoginModal from './components/LoginModal';
import PackageCheckoutModal from './components/PackageCheckoutModal';

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

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(() => {
        setServices([
          { id: 'cek-plagiasi', slug: 'cek-plagiasi', title: 'Cek Plagiasi No-Repository', subtitle: 'Deteksi plagiarisme dokumen', icon: 'ri-file-line', price: 10000, unit: 'file', description: 'Pengecekan keaslian tulisan cepat 24 jam tanpa simpan Turnitin repo.' },
          { id: 'cek-drillbit', slug: 'cek-drillbit', title: 'Cek Drillbit', subtitle: 'Cek plagiarisme dengan Drillbit', icon: 'ri-file-search-line', price: 12000, unit: 'file', description: 'Pemeriksaan plagiasi terpercaya khusus jurnal & skripsi.' },
          { id: 'parafrase', slug: 'parafrase', title: 'Jasa Parafrase', subtitle: 'Ubah teks tanpa plagiarisme', icon: 'ri-loop-left-line', price: 35000, unit: 'halaman', description: 'Menurunkan skor Turnitin secara profesional.' }
        ]);
      });

    fetch('/api/services/packages')
      .then(res => res.json())
      .then(data => setPackages(data))
      .catch(() => {
        setPackages([
          { id: 'pkg_hemat_3x', name: 'Paket Hemat Laksamana (3x Cek)', validity: '7 hari', price: 27500, targetAudience: 'Tugas kuliah & revisi cepat', quota: '3x cek plagiasi', benefits: ['Skip menu pembayaran', 'Cek sampai 800 halaman/file', 'Dapet token 3x'] },
          { id: 'pkg_praktis_10x', name: 'Paket Praktis Laksamana (10x Cek)', validity: '14 hari', price: 89500, targetAudience: 'Deadliners skripsi & revisian', quota: '10x cek plagiasi', benefits: ['Skip menu pembayaran', 'Cek sampai 800 halaman/file', 'Dapet token 10x'] },
          { id: 'pkg_pro_25x', name: 'Paket Sultan Laksamana (25x Cek)', validity: '30 hari', price: 199000, targetAudience: 'Bimbingan skripsi kelompok', quota: '25x cek plagiasi', benefits: ['Prioritas Instant', 'Laporan PDF Lengkap', 'Dapet token 25x'] }
        ]);
      });

    const token = localStorage.getItem('accessToken');
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => { if (data.user) setUser(data.user); })
        .catch(() => localStorage.removeItem('accessToken'));
    }
  }, []);

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

  return (
    <div className="min-vh-100 d-flex flex-column justify-content-between">
      <div>
        <Navbar 
          activePage={activePage} 
          setActivePage={setActivePage} 
          user={user}
          onOpenLogin={() => setShowLogin(true)}
          onOpenTutorial={() => setShowTutorial(true)}
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
    </div>
  );
}
