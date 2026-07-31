import React, { useState } from 'react';

export default function PackageCheckoutModal({ show, pkg, onClose }) {
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [purchasedToken, setPurchasedToken] = useState(null);

  if (!show || !pkg) return null;

  const handleBuyPackage = async (e) => {
    e.preventDefault();
    if (!whatsapp) {
      setError('Nomor WhatsApp wajib diisi untuk penerimaan Kode Token Paket.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/orders/buy-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkg.id,
          packageName: pkg.name,
          price: pkg.price,
          quota: pkg.quotaNumber || (pkg.quota ? parseInt(pkg.quota) : 3),
          whatsapp,
          email
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal memproses pembelian paket');

      setPurchasedToken(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content border-0 rounded-4 shadow-lg p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold mb-0 text-mint-heading">
              🎟️ Pembelian {pkg.name}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          {!purchasedToken ? (
            <form onSubmit={handleBuyPackage}>
              {error && <div className="alert alert-danger small py-2">{error}</div>}

              <div className="bg-mint-light p-3 rounded-3 mb-3 border border-success border-opacity-10">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="fw-semibold small text-secondary">Total Kuota Cek:</span>
                  <span className="badge bg-mint-primary text-white">{pkg.quota}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="fw-semibold small text-secondary">Total Tagihan Paket:</span>
                  <span className="fs-5 fw-extrabold text-mint-primary">
                    Rp {pkg.price ? pkg.price.toLocaleString('id-ID') : '0'}
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label small fw-semibold">No. WhatsApp Active (Penerima Token WA)</label>
                <input 
                  type="tel" 
                  className="form-control rounded-3" 
                  placeholder="Contoh: 081234567890"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
                <small className="text-muted">Kode token akan dikirimkan otomatis ke WhatsApp ini.</small>
              </div>

              <div className="mb-4">
                <label className="form-label small fw-semibold">Alamat Email (Opsional)</label>
                <input 
                  type="email" 
                  className="form-control rounded-3" 
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-mint-primary w-100 rounded-pill py-2.5 fw-bold"
                disabled={submitting}
              >
                {submitting ? 'Memproses Pembelian...' : 'Beli Paket & Kirim Kode Token ke WA 🚀'}
              </button>
            </form>
          ) : (
            <div className="text-center py-3">
              <div className="icon-mint-box mx-auto mb-3" style={{ width: '64px', height: '64px' }}>
                <i className="ri-checkbox-circle-fill fs-1 text-mint-primary"></i>
              </div>
              <h5 className="fw-bold text-mint-heading mb-1">Pembelian Paket Berhasil!</h5>
              <p className="small text-secondary mb-3">
                Kode Token Paket Anda telah sukses diterbitkan dan dikirim ke WhatsApp (<b>{whatsapp}</b>).
              </p>

              <div className="bg-mint-light p-3 rounded-4 mb-4 border border-success border-opacity-25 text-center">
                <span className="small text-secondary d-block mb-1">KODE TOKEN ANDA:</span>
                <span className="fs-3 font-monospace fw-extrabold text-mint-primary tracking-wider">
                  {purchasedToken.tokenCode}
                </span>
                <div className="small text-muted mt-2">
                  Gunakan Kode Token ini pada menu <b>Form Order Cek Plagiasi</b> untuk *Skip Pembayaran*!
                </div>
              </div>

              <button 
                onClick={onClose} 
                className="btn btn-mint-primary w-100 rounded-pill py-2 fw-bold"
              >
                Selesai & Gunakan Token Sekaran 🎟️
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
