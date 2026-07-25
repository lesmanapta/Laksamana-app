import React from 'react';
import HeroBanner from '../components/HeroBanner';
import ServiceGrid from '../components/ServiceGrid';
import PackagePricing from '../components/PackagePricing';

export default function HomePage({ services, packages, onSelectService, onSelectPackage, setActivePage }) {
  return (
    <div>
      <HeroBanner onSelectService={onSelectService} setActivePage={setActivePage} />
      <ServiceGrid services={services} onSelectService={onSelectService} />

      {/* About Section - Soft Mint Green Theme */}
      <section className="bg-mint-dark text-white py-5 my-5 rounded-5 mx-3 shadow-lg">
        <div className="container">
          <div className="row align-items-center justify-content-center">
            <div className="col-md-5 text-center mb-4 mb-md-0">
              <div className="bg-white bg-opacity-10 p-4 rounded-circle d-inline-block border border-white border-opacity-20 shadow-sm">
                <i className="ri-shield-keyhole-line display-1 text-mint-primary"></i>
              </div>
            </div>
            <div className="col-md-7">
              <span className="pill-badge-mint text-white bg-white bg-opacity-20 border-0 mb-3 d-inline-block">TENTANG LAKSAMANA</span>
              <h2 className="fw-extrabold mb-3">Keamanan Dokumen Tanpa Simpan Repository</h2>
              <p className="lead fs-6 opacity-90 lh-base">
                Laksamana.id adalah sistem otomatisasi pemeriksaan keaslian dokumen 24 jam. 
                Seluruh pengujian Turnitin dilakukan dengan seting <b>No-Repository</b>, sehingga karya tulis Anda tidak akan tersimpan di database publik dan dijamin aman 100%.
              </p>
              <div className="d-flex flex-wrap gap-4 mt-4">
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-checkbox-circle-fill fs-4 text-mint-primary"></i>
                  <span className="fw-semibold">Jaminan No-Repo</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-flashlight-fill fs-4 text-mint-primary"></i>
                  <span className="fw-semibold">Proses Fast 1-3 Menit</span>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <i className="ri-whatsapp-fill fs-4 text-mint-primary"></i>
                  <span className="fw-semibold">Hasil Kirim ke WA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PackagePricing packages={packages} onSelectPackage={onSelectPackage} />
    </div>
  );
}
