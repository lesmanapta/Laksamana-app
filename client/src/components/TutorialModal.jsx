import React, { useState } from 'react';

export default function TutorialModal({ show, onClose }) {
  const [activeTab, setActiveTab] = useState('order');

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content border-0 rounded-4 shadow-lg">
          <div className="modal-header border-0 pb-0">
            <h5 className="modal-title fw-bold">📖 Panduan Cara Order Laksamana</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body p-4">
            <ul className="nav nav-pills nav-justified mb-4 bg-light p-1 rounded-pill">
              <li className="nav-item">
                <button 
                  className={`nav-link rounded-pill py-2 ${activeTab === 'order' ? 'bg-custom-orange text-white fw-semibold' : 'text-dark'}`}
                  onClick={() => setActiveTab('order')}
                >
                  1. Cara Cek Plagiasi
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-link rounded-pill py-2 ${activeTab === 'token' ? 'bg-custom-orange text-white fw-semibold' : 'text-dark'}`}
                  onClick={() => setActiveTab('token')}
                >
                  2. Menggunakan Paket & Token
                </button>
              </li>
            </ul>

            {activeTab === 'order' ? (
              <div className="row align-items-center">
                <div className="col-md-12">
                  <ol className="lh-lg text-secondary">
                    <li>Pilih menu <b>Order Cek</b> pada navigasi atas atau klik <b>Pesan Layanan</b> di kartu layanan.</li>
                    <li>Upload file dokumen kamu (format <b>.pdf</b> atau <b>.docx</b>, maks 25MB).</li>
                    <li>Isi nomor <b>WhatsApp aktif</b> (hasil laporan akan dikirim otomatis ke nomor ini).</li>
                    <li>Pilih metode pembayaran (<b>QRIS Instant</b>, Transfer Bank, atau E-Wallet).</li>
                    <li>Klik <b>Bayar & Proses Cek Dokumen</b>.</li>
                    <li>Salin <b>Kode Pesanan (Order ID)</b> untuk mengecek status & download hasil laporan di menu <b>Cek Pesanan</b>!</li>
                  </ol>
                </div>
              </div>
            ) : (
              <div>
                <ol className="lh-lg text-secondary">
                  <li>Beli salah satu paket Laksamana (Hemat 3x, Praktis 10x, Pro 25x).</li>
                  <li>Setelah pembayaran paket dikonfirmasi, kamu akan menerima <b>Kode Token Hemat</b>.</li>
                  <li>Saat melakukan order cek dokumen, masukkan Kode Token pada kolom <i>Kupon / Token Paket</i>.</li>
                  <li>Sistem Laksamana akan otomatis memotong kuota paket kamu tanpa perlu melakukan transfer ulang!</li>
                </ol>
              </div>
            )}
          </div>

          <div className="modal-footer border-0 pt-0">
            <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={onClose}>
              Tutup Panduan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
