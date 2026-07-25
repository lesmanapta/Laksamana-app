import React from 'react';

export default function Navbar({ activePage, setActivePage, user, onOpenLogin, onOpenTutorial }) {
  const isSuperAdmin = user && (user.role === 'superadmin' || user.role === 'admin');

  return (
    <nav className="navbar navbar-expand-lg navbar-custom sticky-top">
      <div className="container">
        <a 
          href="#home" 
          onClick={(e) => { e.preventDefault(); setActivePage('home'); }} 
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
                onClick={() => setActivePage('home')}
              >
                Beranda
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link border-0 bg-transparent rounded-pill px-3 ${activePage === 'order' ? 'fw-bold text-mint-primary bg-mint-light' : 'text-secondary'}`}
                onClick={() => setActivePage('order')}
              >
                Order Cek
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link border-0 bg-transparent rounded-pill px-3 ${activePage === 'track' ? 'fw-bold text-mint-primary bg-mint-light' : 'text-secondary'}`}
                onClick={() => setActivePage('track')}
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

            <li className="nav-item">
              <button 
                className={`nav-link border-0 bg-transparent rounded-pill px-3 ${isSuperAdmin ? 'text-mint-heading fw-bold' : 'text-muted'} ${activePage === 'admin' ? 'fw-bold text-mint-primary bg-mint-light' : ''}`}
                onClick={() => setActivePage('admin')}
              >
                <i className="ri-shield-user-line me-1"></i> Admin {isSuperAdmin && '👑'}
              </button>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-2">
            {user ? (
              <div className="dropdown">
                <button 
                  className={`btn btn-sm dropdown-toggle rounded-pill px-4 py-2 ${isSuperAdmin ? 'bg-mint-dark text-white fw-bold' : 'btn-mint-outline'}`} 
                  type="button" 
                  data-bs-toggle="dropdown"
                >
                  <i className="ri-user-smile-line me-1"></i> {user.name} {isSuperAdmin ? '(Super Admin)' : `(${user.tokens || 0} Token)`}
                </button>
                <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-4 mt-2">
                  <li><span className="dropdown-item-text text-muted small">{user.email}</span></li>
                  {isSuperAdmin && (
                    <li>
                      <button className="dropdown-item fw-semibold text-mint-primary" onClick={() => setActivePage('admin')}>
                        <i className="ri-dashboard-3-line me-1"></i> Panel Admin
                      </button>
                    </li>
                  )}
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className="dropdown-item text-danger" onClick={() => { localStorage.removeItem('accessToken'); window.location.reload(); }}>
                      <i className="ri-logout-box-r-line me-1"></i> Logout
                    </button>
                  </li>
                </ul>
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
