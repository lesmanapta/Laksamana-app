import React from 'react';

export default function Navbar({ activePage, setActivePage, user, onOpenLogin, onOpenTutorial, onLogout, onOpenProfile }) {
  const isSuperAdmin = user && (user.role === 'superadmin' || user.role === 'admin');

  const navTo = (pageName) => {
    setActivePage(pageName);
    let targetPath = '/';
    if (pageName === 'admin') targetPath = '/admin';
    else if (pageName === 'order') targetPath = '/order';
    else if (pageName === 'track') targetPath = '/track';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({ page: pageName }, '', targetPath);
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('accessToken');
      window.location.reload();
    }
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-custom sticky-top">
      <div className="container">
        <a 
          href="#home" 
          onClick={(e) => { e.preventDefault(); navTo('home'); }} 
          className="navbar-brand d-flex align-items-center gap-2 text-decoration-none"
        >
          <div className="bg-mint-primary text-white rounded-4 px-3 py-1 fs-5 fw-bold shadow-sm">
            🌿 L
          </div>
          <span className="text-mint-heading">Laksamana<span className="text-mint-primary">.id</span></span>
        </a>

        <button 
          className="navbar-toggler border-0 shadow-none" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navContent"
        >
          <i className="ri-menu-4-line fs-2 text-mint-primary"></i>
        </button>

        <div className="collapse navbar-collapse" id="navContent">
          <ul className="navbar-nav mx-auto mb-2 mb-lg-0 gap-1">
            <li className="nav-item">
              <button 
                className={`nav-link border-0 bg-transparent rounded-pill px-3 ${activePage === 'home' ? 'fw-bold text-mint-primary bg-mint-light' : 'text-secondary'}`}
                onClick={() => navTo('home')}
              >
                Beranda
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link border-0 bg-transparent rounded-pill px-3 ${activePage === 'order' ? 'fw-bold text-mint-primary bg-mint-light' : 'text-secondary'}`}
                onClick={() => navTo('order')}
              >
                Order Cek
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link border-0 bg-transparent rounded-pill px-3 ${activePage === 'track' ? 'fw-bold text-mint-primary bg-mint-light' : 'text-secondary'}`}
                onClick={() => navTo('track')}
              >
                <i className="ri-search-line me-1"></i> Cek Pesanan
              </button>
            </li>
            <li className="nav-item">
              <button 
                className="nav-link border-0 bg-transparent text-secondary rounded-pill px-3"
                onClick={onOpenTutorial}
              >
                Cara Order
              </button>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-2">
            {user ? (
              <div className="d-flex align-items-center gap-2">
                {/* Profile Icon Button - Navigates to /profil */}
                <button 
                  title={`Profil (${user.name})`}
                  onClick={() => navTo('profile')}
                  className={`btn btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center border-0 shadow-sm ${activePage === 'profile' ? 'bg-mint-primary text-white' : 'bg-mint-light text-mint-primary'}`}
                  style={{ width: '40px', height: '40px' }}
                >
                  <i className="ri-user-3-line fs-5"></i>
                </button>

                {/* Logout Icon Button */}
                <button 
                  title="Keluar / Logout"
                  onClick={handleLogoutClick}
                  className="btn btn-sm btn-outline-danger rounded-circle p-2 d-flex align-items-center justify-content-center"
                  style={{ width: '40px', height: '40px' }}
                >
                  <i className="ri-logout-box-r-line fs-5"></i>
                </button>
              </div>
            ) : (
              <button 
                className="btn btn-mint-primary btn-sm px-4 py-2 rounded-pill d-flex align-items-center gap-2 shadow-sm"
                onClick={onOpenLogin}
              >
                <i className="ri-login-circle-line fs-6"></i> Login / Register
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
