import React, { useState, useEffect } from 'react';

export default function TrackOrderPage({ initialOrderId }) {
  const [searchQuery, setSearchQuery] = useState(initialOrderId || 'LKS-984210');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/orders/track/${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Pesanan tidak ditemukan');
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrderId) {
      handleSearch();
    }
  }, [initialOrderId]);

  const handleCopyQrString = (qrString, orderId) => {
    navigator.clipboard.writeText(qrString);
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(''), 3000);
  };

  return (
    <div className="container my-5">
      <div className="text-center mb-5">
        <span className="pill-badge-mint mb-2 d-inline-block">PELAKAKAN TRANSAKSI & STATUS</span>
        <h2 className="fw-extrabold text-mint-heading">Cek Status & Unduh <span className="text-mint-primary">Laporan</span></h2>
        <p className="text-muted">Masukkan Kode Order (LKS-XXXXXX) atau Nomor WhatsApp Anda untuk melacak semua pesanan</p>
      </div>

      {/* Search Bar */}
      <div className="row justify-content-center mb-5">
        <div className="col-12 col-md-8 col-lg-6">
          <form onSubmit={handleSearch} className="d-flex gap-2">
            <input 
              type="text" 
              className="form-control form-control-lg rounded-pill px-4 shadow-sm border-success border-opacity-25"
              placeholder="Masukkan Kode Order / Nomor WA (0812xxxx)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="btn btn-mint-primary px-4 rounded-pill fw-bold" disabled={loading}>
              {loading ? 'Mencari...' : 'Cek Status'}
            </button>
          </form>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning text-center rounded-4 max-w-md mx-auto mb-4">
          <i className="ri-error-warning-line me-1"></i> {error}
        </div>
      )}

      {/* Results List */}
      <div className="row g-4 justify-content-center">
        {orders.map(ord => {
          const rawQrString = `00020101021226580016ID.CO.TELKOM.WWW01189360091100215949434802150000000000000000303UMI51440014ID.LINKAJA.WWW011893600911002159494348021500000000000000005204581253033605405${ord.amount || 10000}5802ID5912Laksamana.id6007JAKARTA6304A1B2`;
          const qrImageUrl = `https://quickchart.io/qr?text=${encodeURIComponent(rawQrString)}&size=260&margin=1`;
          const isCompleted = ord.status === 'COMPLETED';

          return (
            <div key={ord.id} className="col-12 col-lg-8">
              <div className="mint-card p-4 shadow-sm">
                <div className="d-flex flex-wrap align-items-center justify-content-between pb-3 border-bottom mb-4 gap-2">
                  <div>
                    <span className="badge bg-mint-light text-mint-heading font-monospace px-3 py-2 fs-6 rounded-pill mb-1">
                      {ord.id}
                    </span>
                    <h5 className="fw-bold text-mint-heading mb-0">{ord.serviceName}</h5>
                  </div>
                  <span className={`badge px-3 py-2 rounded-pill fs-6 ${isCompleted ? 'bg-success text-white' : 'bg-warning text-dark'}`}>
                    {isCompleted ? '✅ SELESAI' : '⏳ SEDANG DIPROSES'}
                  </span>
                </div>

                <div className="row g-4">
                  <div className="col-md-7">
                    <div className="bg-mint-light p-3 rounded-4 mb-3 border border-success border-opacity-10">
                      <div className="small text-muted mb-1">DOKUMEN DIUJI</div>
                      <div className="fw-bold text-dark text-truncate">{ord.fileName}</div>
                      <div className="small text-muted mt-2">Nomor WA: <b>{ord.whatsapp}</b></div>
                      <div className="small text-muted">Tanggal Order: {new Date(ord.createdAt).toLocaleString('id-ID')}</div>
                      {ord.completedAt && (
                        <div className="small text-success fw-semibold mt-1">
                          Waktu Selesai: {new Date(ord.completedAt).toLocaleString('id-ID')}
                        </div>
                      )}
                    </div>

                    {isCompleted && ord.result ? (
                      <div className="p-3 bg-white border border-success border-opacity-25 rounded-4 mb-3">
                        <h6 className="fw-bold text-mint-heading mb-3">📊 Hasil Skor Pemeriksaan Resmi:</h6>
                        <div className="row g-2 text-center">
                          <div className="col-6">
                            <div className="p-2 bg-mint-light rounded-3">
                              <small className="text-muted d-block">Turnitin / Similarity</small>
                              <span className="fs-4 fw-extrabold text-mint-primary">{ord.result.similarityIndex}%</span>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="p-2 bg-mint-light rounded-3">
                              <small className="text-muted d-block font-monospace">AI Content Score</small>
                              <span className="fs-4 fw-extrabold text-mint-primary">{ord.result.aiScore}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="alert bg-mint-light border border-warning border-opacity-50 p-3 rounded-4 mb-3">
                        <div className="fw-bold text-mint-heading mb-1 d-flex align-items-center gap-1">
                          <i className="ri-timer-flash-line fs-5 text-warning"></i> Dokumen Sedang Diproses System
                        </div>
                        <div className="small text-secondary">
                          Hasil skor belum keluar karena file Anda sedang dalam antrean proses pemeriksaan <b>{ord.serviceName}</b>.
                          Setelah selesai, laporan resmi dan link download akan dikirimkan otomatis ke WhatsApp Anda.
                        </div>
                      </div>
                    )}

                    {isCompleted ? (
                      <a 
                        href={`http://localhost:5000/api/orders/download/${ord.id}`} 
                        className="btn btn-mint-primary w-100 rounded-pill py-2.5 fw-bold shadow-sm"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <i className="ri-file-download-line me-1"></i> Unduh Laporan Resmi (.TXT / .PDF)
                      </a>
                    ) : (
                      <button className="btn btn-outline-secondary w-100 rounded-pill py-2.5 small" disabled>
                        <i className="ri-time-line me-1"></i> Menunggu Proses Selesai...
                      </button>
                    )}
                  </div>

                  {/* QRIS EMVCo Renderer Box */}
                  <div className="col-md-5 text-center border-start border-success border-opacity-10">
                    <div className="p-3 bg-mint-light rounded-4 border border-success border-opacity-25">
                      <span className="badge bg-mint-primary text-white rounded-pill px-3 py-1 mb-2">QRIS INSTANT</span>
                      <h6 className="fw-bold text-mint-heading mb-2">Scan atau Salin QRIS</h6>
                      
                      {/* Direct QR Code PNG Image Render */}
                      <div className="bg-white p-2 rounded-3 d-inline-block shadow-sm mb-3">
                        <img 
                          src={qrImageUrl} 
                          alt="QRIS Payment EMVCo" 
                          className="img-fluid rounded-2" 
                          style={{ maxWidth: '200px' }}
                        />
                      </div>

                      <div className="small text-muted mb-2">
                        Format EMVCo Standar: <code className="text-dark">00020101...</code>
                      </div>

                      <button 
                        onClick={() => handleCopyQrString(rawQrString, ord.id)}
                        className="btn btn-mint-outline btn-sm w-100 rounded-pill fw-bold"
                      >
                        {copiedId === ord.id ? '✅ String QRIS Tersalin!' : '📋 Salin String QRIS (EMVCo)'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
