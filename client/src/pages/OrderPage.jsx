import React, { useState, useEffect } from 'react';

export default function OrderPage({ selectedService, services, onOrderSuccess }) {
  const isServiceActive = (s) => s && (s.active === true || s.active === 1 || s.active === '1');
  const activeServicesList = services.filter(isServiceActive);
  const initialService = (selectedService && isServiceActive(selectedService)) 
    ? selectedService 
    : (activeServicesList[0] || services[0]);

  const [activeService, setActiveService] = useState(initialService);
  const [file, setFile] = useState(null);
  const [plagiarismFile, setPlagiarismFile] = useState(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Midtrans QRIS / GoPay');
  const [tokenCodeInput, setTokenCodeInput] = useState('');
  const [appliedToken, setAppliedToken] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenMsg, setTokenMsg] = useState('');

  // Turnitin Exclusion Filter States
  const [excludeQuotes, setExcludeQuotes] = useState(true);
  const [excludeBibliography, setExcludeBibliography] = useState(true);
  const [excludeSmallSources, setExcludeSmallSources] = useState(false);
  const [smallSourceWords, setSmallSourceWords] = useState('5');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  // Post-order success modal state
  const [createdOrder, setCreatedOrder] = useState(null);

  useEffect(() => {
    if (selectedService && isServiceActive(selectedService)) {
      setActiveService(selectedService);
    } else if (!activeService || !isServiceActive(activeService)) {
      if (activeServicesList.length > 0) {
        setActiveService(activeServicesList[0]);
      }
    }
  }, [selectedService, services]);

  const isTurnitin = activeService && (activeService.slug === 'cek-plagiasi' || activeService.id === 'cek-plagiasi');
  const isParafrase = activeService && (activeService.slug === 'parafrase' || activeService.id === 'parafrase');
  const isDrillbit = activeService && (activeService.slug === 'cek-drillbit' || activeService.id === 'cek-drillbit');

  const estimatedWordCount = file ? Math.max(150, Math.ceil(file.size / 18)) : 0;
  const estimatedDrillbitPrice = estimatedWordCount * 10;
  
  const basePrice = isDrillbit ? estimatedDrillbitPrice : (activeService ? activeService.price : 10000);
  const finalPrice = appliedToken ? 0 : basePrice;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePlagiarismFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPlagiarismFile(e.target.files[0]);
    }
  };

  const handleValidateToken = async () => {
    if (!tokenCodeInput.trim()) return;
    setTokenLoading(true);
    setTokenMsg('');
    setError('');

    try {
      const res = await fetch('/api/orders/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenCode: tokenCodeInput.trim() })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal memvalidasi token');

      setAppliedToken(data.token);
      setTokenMsg(`✅ ${data.message}`);
    } catch (err) {
      setAppliedToken(null);
      setTokenMsg(`❌ ${err.message}`);
    } finally {
      setTokenLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isServiceActive(activeService)) {
      setError('Layanan ini sedang tidak aktif / belum tersedia. Silakan pilih layanan lain.');
      return;
    }
    if (!file) {
      setError('Harap pilih file dokumen (.pdf atau .docx) terlebih dahulu!');
      return;
    }
    if (isParafrase && !plagiarismFile) {
      setError('Untuk Jasa Parafrase, Anda wajib mengunggah File Hasil Cek Plagiasi / Turnitin!');
      return;
    }
    if (!whatsapp) {
      setError('Nomor WhatsApp wajib diisi untuk penerimaan hasil laporan & notifikasi.');
      return;
    }

    setError('');
    setSubmitting(true);

    const filterOptions = {
      excludeQuotes,
      excludeBibliography,
      excludeSmallSources,
      smallSourceWords: parseInt(smallSourceWords) || 5
    };

    const formData = new FormData();
    formData.append('document', file);
    if (plagiarismFile) {
      formData.append('plagiarismReport', plagiarismFile);
    }

    formData.append('serviceSlug', activeService ? activeService.slug : 'cek-plagiasi');
    formData.append('serviceName', activeService ? activeService.title : 'Cek Plagiasi No-Repository');
    formData.append('whatsapp', whatsapp);
    formData.append('email', email);
    formData.append('paymentMethod', appliedToken ? `Token Paket (${appliedToken.code})` : paymentMethod);
    formData.append('price', finalPrice);
    formData.append('filterOptions', JSON.stringify(filterOptions));
    if (appliedToken) {
      formData.append('tokenCode', appliedToken.code);
    }

    try {
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Gagal memproses order');

      setCreatedOrder(data.order);

      // Trigger Midtrans Snap payment popup using the dedicated transaction Snap token if not using token
      if (!appliedToken && window.snap && data.snapToken && !data.snapToken.includes('SNAP-SIMULATED')) {
        window.snap.pay(data.snapToken, {
          onSuccess: async function (result) {
            try {
              await fetch('/api/orders/confirm-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: data.order.id })
              });
            } catch (e) {}
            onOrderSuccess(data.order);
          },
          onPending: function (result) {
            onOrderSuccess(data.order);
          },
          onError: function (result) {
            setError('Pembayaran Midtrans gagal atau dibatalkan. Dokumen Anda belum diproses.');
          },
          onClose: function () {
            onOrderSuccess(data.order);
          }
        });
      } else {
        onOrderSuccess(data.order);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-12 col-lg-8">
          <div className="card mint-card border-0 p-4 shadow-sm">
            <h4 className="fw-bold mb-4 text-center text-mint-heading">
              Form Pemesanan Dokumen <span className="text-mint-primary">Laksamana</span>
            </h4>

            {error && <div className="alert alert-danger small mb-4">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label fw-semibold small text-secondary">PILIH LAYANAN LAKSAMANA</label>
                <select 
                  className="form-select rounded-3 py-2 fw-semibold text-mint-heading"
                  value={activeService ? activeService.id : ''}
                  onChange={(e) => {
                    const found = services.find(s => s.id === e.target.value);
                    if (found && isServiceActive(found)) {
                      setActiveService(found);
                    }
                  }}
                >
                  {(activeServicesList.length > 0 ? activeServicesList : services.filter(isServiceActive)).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.title} — {s.unit === 'kata' ? 'Rp 10 / kata' : `Rp ${s.price.toLocaleString('id-ID')} / ${s.unit}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* TURNITIN EXCLUSION FILTERS SECTION */}
              {(isTurnitin || isDrillbit) && (
                <div className="mb-4 bg-white p-4 rounded-4 border shadow-sm">
                  <h6 className="fw-bold text-mint-heading mb-3">1. Pilih filter yang diinginkan</h6>
                  <div className="d-flex flex-column gap-2">
                    <div className="form-check cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="form-check-input me-2 cursor-pointer" 
                        id="checkQuotes"
                        checked={excludeQuotes}
                        onChange={(e) => setExcludeQuotes(e.target.checked)}
                      />
                      <label className="form-check-label text-dark fw-medium cursor-pointer" htmlFor="checkQuotes">
                        Kecualikan Kutipan (Exclude Quotes)
                      </label>
                    </div>

                    <div className="form-check cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="form-check-input me-2 cursor-pointer" 
                        id="checkBiblio"
                        checked={excludeBibliography}
                        onChange={(e) => setExcludeBibliography(e.target.checked)}
                      />
                      <label className="form-check-label text-dark fw-medium cursor-pointer" htmlFor="checkBiblio">
                        Kecualikan Daftar Pustaka (Exclude Bibliography)
                      </label>
                    </div>

                    <div className="form-check cursor-pointer d-flex align-items-center flex-wrap gap-2">
                      <input 
                        type="checkbox" 
                        className="form-check-input me-2 cursor-pointer" 
                        id="checkSmallSources"
                        checked={excludeSmallSources}
                        onChange={(e) => setExcludeSmallSources(e.target.checked)}
                      />
                      <label className="form-check-label text-dark fw-medium cursor-pointer" htmlFor="checkSmallSources">
                        Kecualikan sumber yang kurang dari ...
                      </label>
                      {excludeSmallSources && (
                        <div className="d-inline-flex align-items-center gap-1 ms-2">
                          <input 
                            type="number" 
                            className="form-control form-control-sm rounded-3 text-center" 
                            style={{ width: '60px' }}
                            value={smallSourceWords}
                            onChange={(e) => setSmallSourceWords(e.target.value)}
                            min="1"
                          />
                          <span className="small text-muted">kata</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* UPLOAD FILE 1: Dokumen Utama */}
              <div className="mb-4">
                <label className="form-label fw-semibold small text-secondary">
                  2. UPLOAD DOKUMEN YANG INGIN DIPROSES (.PDF / .DOCX)
                </label>
                <div className="border border-2 border-dashed rounded-4 p-4 text-center bg-mint-light cursor-pointer">
                  <i className="ri-file-word-line display-4 text-mint-primary mb-2"></i>
                  <p className="mb-1 fw-medium text-mint-heading">Klik atau seret file dokumen kamu ke sini</p>
                  <small className="text-muted d-block mb-3">Dokumen asli tugas/skripsi yang mau dicek/diparafrase (Maks 25MB)</small>
                  <input 
                    type="file" 
                    className="form-control d-none" 
                    id="fileUploadInput" 
                    accept=".pdf,.docx,.doc"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="fileUploadInput" className="btn btn-mint-outline btn-sm rounded-pill px-4">
                    {file ? file.name : 'Pilih File Dokumen Utama'}
                  </label>
                </div>
                {file && (
                  <div className="small text-success mt-2 fw-medium d-flex align-items-center gap-1">
                    <i className="ri-checkbox-circle-fill text-mint-primary"></i> Terpilih: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>

              {/* Drillbit Per-Word Info Box */}
              {isDrillbit && file && (
                <div className="alert bg-mint-light border border-success border-opacity-25 rounded-4 p-3 mb-4">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <i className="ri-file-search-line fs-4 text-mint-primary"></i>
                    <span className="fw-bold text-mint-heading">Kalkulasi Tarif Drillbit (Per Kata):</span>
                  </div>
                  <div className="small text-secondary">
                    Estimasi Jumlah Kata: <b className="text-dark">{estimatedWordCount.toLocaleString('id-ID')} kata</b> × Rp 10/kata
                  </div>
                  <div className="fs-5 fw-bold text-mint-primary mt-1">
                    Total Tarif: Rp {estimatedDrillbitPrice.toLocaleString('id-ID')}
                  </div>
                </div>
              )}

              {/* UPLOAD FILE 2: Khusus Jasa Parafrase */}
              {isParafrase && (
                <div className="mb-4 alert bg-mint-light border border-success border-opacity-25 rounded-4 p-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <i className="ri-file-search-line fs-4 text-mint-primary"></i>
                    <label className="form-label fw-bold small text-mint-heading mb-0">
                      UPLOAD FILE LAPORAN HASIL CEK PLAGIASI / TURNITIN (.PDF)
                    </label>
                  </div>
                  <p className="small text-secondary mb-3">
                    Unggah file PDF hasil cek Turnitin/Plagiasi Anda agar tim penulis Laksamana tahu bagian paragraf mana yang harus diparafrase.
                  </p>

                  <div className="border border-2 border-dashed rounded-3 p-3 text-center bg-white">
                    <input 
                      type="file" 
                      className="form-control d-none" 
                      id="plagiarismReportInput" 
                      accept=".pdf,.txt,.docx"
                      onChange={handlePlagiarismFileChange}
                    />
                    <label htmlFor="plagiarismReportInput" className="btn btn-mint-primary btn-sm rounded-pill px-4 font-weight-bold">
                      {plagiarismFile ? plagiarismFile.name : 'Pilih File Hasil Cek Plagiasi'}
                    </label>
                  </div>
                  {plagiarismFile && (
                    <div className="small text-success mt-2 fw-medium d-flex align-items-center gap-1">
                      <i className="ri-checkbox-circle-fill text-mint-primary"></i> Laporan Plagiasi Terpilih: {plagiarismFile.name}
                    </div>
                  )}
                </div>
              )}

              <div className="row mb-4">
                <div className="col-md-6 mb-3 mb-md-0">
                  <label className="form-label fw-semibold small text-secondary">NO. WHATSAPP (Notifikasi WA Otomatis)</label>
                  <input 
                    type="tel" 
                    className="form-control rounded-3 py-2" 
                    placeholder="Contoh: 081234567890" 
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                  <small className="text-muted">Hasil cek & link download dikirim otomatis ke WA ini</small>
                </div>
                <div className="col-md-6">
                  <label className="form-label fw-semibold small text-secondary">ALAMAT EMAIL (Opsional)</label>
                  <input 
                    type="email" 
                    className="form-control rounded-3 py-2" 
                    placeholder="nama@email.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* TOKEN / KUPON PAKET SYSTEM */}
              <div className="mb-4">
                <label className="form-label fw-semibold small text-secondary">KODE TOKEN / KUPON PAKET LAKSAMANA (Opsional)</label>
                <div className="input-group">
                  <input 
                    type="text" 
                    className="form-control rounded-start-3" 
                    placeholder="Masukkan Kode Token Paket Laksamana (ex: LKS-PKG-3X-...)" 
                    value={tokenCodeInput}
                    onChange={(e) => setTokenCodeInput(e.target.value)}
                  />
                  <button 
                    onClick={handleValidateToken} 
                    className="btn btn-mint-primary rounded-end-3 px-4 fw-semibold" 
                    type="button"
                    disabled={tokenLoading}
                  >
                    {tokenLoading ? 'Memeriksa...' : 'Gunakan Token'}
                  </button>
                </div>
                {tokenMsg && (
                  <div className={`small mt-2 font-weight-bold ${appliedToken ? 'text-success' : 'text-danger'}`}>
                    {tokenMsg}
                  </div>
                )}
                {appliedToken && (
                  <div className="alert bg-success text-white p-2 rounded-3 mt-2 small d-flex align-items-center justify-content-between">
                    <div>
                      🎟️ <b>Token Paket Aktif:</b> {appliedToken.packageName} (Sisa Kuota: <b>{appliedToken.quotaRemaining}x Cek</b>)
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setAppliedToken(null); setTokenMsg(''); setTokenCodeInput(''); }} 
                      className="btn btn-sm btn-light py-0 text-dark rounded-pill"
                    >
                      Batal Token
                    </button>
                  </div>
                )}
              </div>

              {!appliedToken && (
                <div className="mb-4">
                  <label className="form-label fw-semibold small mb-2 text-secondary">METODE PEMBAYARAN MIDTRANS</label>
                  <div className="row g-2">
                    {['Midtrans QRIS / GoPay', 'Bank Transfer (BCA/Mandiri/BRI)', 'ShopeePay / OVO / Dana'].map(pm => (
                      <div key={pm} className="col-md-4">
                        <div 
                          onClick={() => setPaymentMethod(pm)}
                          className={`p-3 rounded-3 border cursor-pointer text-center small fw-medium ${paymentMethod === pm ? 'border-success bg-mint-light text-mint-heading fw-bold' : 'bg-light text-secondary'}`}
                        >
                          {pm}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-mint-light p-3 rounded-3 d-flex align-items-center justify-content-between mb-4 border border-success border-opacity-10">
                <span className="fw-medium text-mint-heading">Total Pembayaran:</span>
                <span className="fs-4 fw-extrabold text-mint-primary">
                  {appliedToken ? (
                    <span><s className="text-muted fs-6 me-2">Rp {basePrice.toLocaleString('id-ID')}</s> FREE (Rp 0)</span>
                  ) : (
                    `Rp ${finalPrice.toLocaleString('id-ID')}`
                  )}
                </span>
              </div>

              <button 
                type="submit" 
                className="btn btn-mint-primary w-100 rounded-pill py-3 fw-bold fs-6 shadow-sm"
                disabled={submitting}
              >
                {submitting ? (
                  <span><span className="spinner-border spinner-border-sm me-2"></span>Memproses Pemesanan...</span>
                ) : (
                  <span>
                    {appliedToken ? 'Proses Dokumen Gratis via Token Paket 🎟️' : 'Bayar via Midtrans & Proses Dokumen 💳'}
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* MODAL NOTIFIKASI SUKSES PROSES PESANAN */}
      {createdOrder && (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 rounded-4 shadow-lg p-4 text-center">
              <div className="icon-mint-box mx-auto mb-3" style={{ width: '64px', height: '64px' }}>
                <i className="ri-checkbox-circle-fill fs-1 text-mint-primary"></i>
              </div>

              <h4 className="fw-bold text-mint-heading mb-2">Pesanan Berhasil Dikirim!</h4>
              <p className="text-secondary small mb-3">
                Dokumen <b>{createdOrder.fileName}</b> telah sukses diterima sistem Laksamana dengan Kode Order: <b className="text-mint-primary">{createdOrder.id}</b>
              </p>

              <div className="alert bg-mint-light border border-success border-opacity-25 rounded-3 text-start small p-3 mb-4">
                <div className="fw-bold text-mint-heading mb-1 d-flex align-items-center gap-1">
                  <i className="ri-whatsapp-line text-success fs-5"></i> Pengiriman Hasil ke WhatsApp
                </div>
                <div className="text-secondary">
                  Dokumen Anda sedang diproses oleh sistem. Setelah pemeriksaan selesai, <b>link download resmi dan file laporan</b> akan dikirimkan otomatis ke WhatsApp Anda (<b>{createdOrder.whatsapp}</b>).
                </div>
              </div>

              <div className="d-flex gap-2">
                <button 
                  onClick={() => onOrderSuccess(createdOrder)} 
                  className="btn btn-mint-primary w-100 rounded-pill py-2.5 fw-bold"
                >
                  Lacak Pesanan Saya <i className="ri-search-line me-1"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
