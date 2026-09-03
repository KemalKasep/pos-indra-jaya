import React, { useState, useEffect, useRef } from 'react';

const App = () => {
  // ---------------------------------------------------------
  // 1. STATE AUTENTIKASI (LOGIN)
  // ---------------------------------------------------------
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null); // 'ADMIN' atau 'CABANG'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // ---------------------------------------------------------
  // 2. STATE KASIR & APLIKASI
  // ---------------------------------------------------------
  const [activeTab, setActiveTab] = useState('KASIR'); 
  const [produk, setProduk] = useState([]);
  const [keranjang, setKeranjang] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [ringkasan, setRingkasan] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [diskon, setDiskon] = useState(0);
  const [pembayaran, setPembayaran] = useState('CASH');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingRiwayat, setIsLoadingRiwayat] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const scannerRef = useRef(null);

  const API_URL = 'https://script.google.com/macros/s/AKfycbzjFdeEb2U-7oozNYX-FFKTAB8Sp5PspTgf9qg3_eCC0LXlYl5ngkUibhpxBheNxDa4/exec';

  // ---------------------------------------------------------
  // 3. LOGIC & FUNGSI
  // ---------------------------------------------------------
  const handleLogin = (e) => {
    e.preventDefault();
    // Konfigurasi Akun Default
    if (username === 'admin' && password === 'admin123') {
      setRole('ADMIN');
      setActiveTab('KASIR');
      setIsLoggedIn(true);
    } else if (username === 'cabang' && password === 'cabang123') {
      setRole('CABANG');
      setActiveTab('KATALOG'); // Paksa masuk ke tab khusus cabang
      setIsLoggedIn(true);
    } else {
      alert('Username atau PIN salah!');
    }
  };

  const handleLogout = () => {
    if(window.confirm('Yakin ingin keluar?')) {
      setIsLoggedIn(false);
      setRole(null);
      setUsername('');
      setPassword('');
      setKeranjang([]);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetch(`${API_URL}?action=getProduk`)
        .then(res => res.json())
        .then(data => setProduk(Array.isArray(data) ? data : []))
        .catch(err => console.error(err));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && activeTab === 'RIWAYAT' && role === 'ADMIN') {
      setIsLoadingRiwayat(true);
      fetch(`${API_URL}?action=getRiwayat`)
        .then(res => res.json())
        .then(data => {
          if (data.riwayat && data.ringkasan) {
            setRiwayat(data.riwayat);
            setRingkasan(data.ringkasan);
          } else {
            setRiwayat(Array.isArray(data) ? data : []);
          }
          setIsLoadingRiwayat(false);
        }).catch(err => { console.error(err); setIsLoadingRiwayat(false); });
    }
  }, [activeTab, isLoggedIn, role]);

  useEffect(() => { if (activeTab === 'KASIR') scannerRef.current?.focus(); }, [activeTab]);

  const produkDifilter = produk.filter(p => 
    p.nama.toLowerCase().includes(keyword.toLowerCase()) || 
    p.kode.toLowerCase().includes(keyword.toLowerCase()) ||
    (p.barcode && String(p.barcode).toLowerCase().includes(keyword.toLowerCase()))
  );

  const handleScanner = (e) => {
    if (e.key === 'Enter' && keyword.trim() !== '') {
      let item = produk.find(p => p.kode.toLowerCase() === keyword.toLowerCase() || p.barcode === keyword);
      if (!item && produkDifilter.length === 1) item = produkDifilter[0];

      if (item) {
        setKeranjang(prev => {
          const ada = prev.find(k => k.kode === item.kode);
          if (ada) return prev.map(k => k.kode === item.kode ? { ...k, qty: k.qty + 1 } : k);
          return [...prev, { ...item, qty: 1 }];
        });
      } else {
        alert('Barang tidak ditemukan!');
      }
      
      // FIX BUG 1: Selalu kosongkan keyword meskipun error, agar karakter tidak menumpuk
      setKeyword(''); 
      scannerRef.current?.focus(); 
    }
  };

  const ubahQty = (kode, delta) => setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: Math.max(1, k.qty + delta) } : k));
  const hapusItem = (kode) => setKeranjang(prev => prev.filter(k => k.kode !== kode));
  const subtotal = keranjang.reduce((sum, item) => sum + (item.harga * item.qty), 0);
  const totalAkhir = Math.max(0, subtotal - diskon);

  const prosesCheckout = async () => {
    if (keranjang.length === 0) return alert('Keranjang kosong!');
    setIsProcessing(true);
    const payload = { member: 'UMUM', pembayaran, diskon, subtotal, totalAkhir, items: keranjang };

    try {
      const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const result = await response.json();

      if (result.status === "success") {
        alert(`Berhasil!\nNo Struk: ${result.struk}\nTotal: Rp ${totalAkhir.toLocaleString('id-ID')}`);
        
        // Simpan data ke variabel sementara untuk print, lalu langsung reset aplikasi (FIX BUG 2)
        const dataKeranjang = [...keranjang];
        const subtotalPrint = subtotal;
        const diskonPrint = diskon;
        const totalPrint = totalAkhir;
        const tipePrint = pembayaran;

        // Reset segera dijalankan tanpa menunggu proses print
        setKeranjang([]); 
        setDiskon(0); 
        setKeyword(''); 
        scannerRef.current?.focus();

        try {
          const strukWindow = window.open('', '_blank', 'width=300,height=600');
          if (strukWindow) {
            let htmlStruk = `
              <div style="font-family: monospace; font-size: 12px; width: 100%; max-width: 220px; margin: 0 auto; color: #000;">
                <div style="text-align: center; font-weight: bold; font-size: 14px;">INDRA JAYA PUSAT</div>
                <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px;">
                  ${new Date().toLocaleString('id-ID')}<br>Struk: ${result.struk}<br>Tipe: ${tipePrint}
                </div>
                <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
            `;
            dataKeranjang.forEach(item => {
              htmlStruk += `<tr><td colspan="3">${item.nama.substring(0, 18)}</td></tr>
                            <tr><td>${item.qty}x</td><td>${item.harga.toLocaleString('id-ID')}</td><td style="text-align: right;">${(item.qty * item.harga).toLocaleString('id-ID')}</td></tr>`;
            });
            htmlStruk += `
                </table>
                <div style="border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px;">
                  <table style="width: 100%; font-size: 12px;">
                    <tr><td>Subtotal</td><td style="text-align: right;">${subtotalPrint.toLocaleString('id-ID')}</td></tr>
                    <tr><td>Diskon</td><td style="text-align: right;">${diskonPrint.toLocaleString('id-ID')}</td></tr>
                    <tr style="font-weight: bold; font-size: 14px;"><td>TOTAL</td><td style="text-align: right;">${totalPrint.toLocaleString('id-ID')}</td></tr>
                  </table>
                </div>
                <div style="text-align: center; margin-top: 10px;">Terima Kasih</div>
              </div>
              <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>
            `;
            strukWindow.document.write(htmlStruk);
            strukWindow.document.close();
          } else {
            console.warn("Pop-up diblokir HP, struk dilewati.");
          }
        } catch (printErr) {
          console.error("Gagal print struk", printErr);
        }
      }
    } catch (error) {
      alert('Error Jaringan. Pastikan API URL benar.');
    } finally { setIsProcessing(false); }
  };

  const prosesInputSaldo = async () => {
    const nominal = prompt("Masukkan jumlah Saldo Awal (CASH) hari ini:\nContoh: 150000");
    if (!nominal) return;
    const angka = parseInt(nominal.replace(/\D/g, ''));
    if (isNaN(angka)) return alert("Input harus berupa angka!");

    setIsProcessing(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'inputSaldo', nominal: angka })
      });
      const result = await response.json();
      if (result.status === "success") {
        alert("Saldo Awal berhasil disimpan ke sistem!");
        setRingkasan(prev => ({ ...prev, saldoAwal: angka }));
      } else { alert("Gagal menyimpan saldo."); }
    } catch (e) { alert("Error jaringan."); } 
    finally { setIsProcessing(false); }
  };

  // ---------------------------------------------------------
  // 4. RENDER HALAMAN LOGIN (Jika belum login)
  // ---------------------------------------------------------
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', width: '100%', maxWidth: '350px' }}>
           <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <div style={{ fontSize: '45px', marginBottom: '10px' }}>🏪</div>
              <h2 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>Indra Jaya Pusat</h2>
              <p style={{ color: '#64748b', fontSize: '14px', margin: '8px 0 0 0' }}>Login Sistem POS</p>
           </div>
           <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '15px' }}>
                 <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>Username</label>
                 <input type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Masukkan username" style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} required />
              </div>
              <div style={{ marginBottom: '25px' }}>
                 <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>PIN / Password</label>
                 <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan PIN" style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '15px' }} required />
              </div>
              <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: '0.2s' }}>
                Masuk Aplikasi
              </button>
           </form>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------
  // 5. RENDER DASHBOARD UTAMA (Setelah Login)
  // ---------------------------------------------------------
  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif", backgroundColor: '#f3f4f6' }}>
      
      {/* SIDEBAR KIRI */}
      <div style={{ width: '260px', backgroundColor: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '25px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#3b82f6', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏪</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Indra Jaya Pusat</h2>
            <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span> {role === 'ADMIN' ? 'Admin Panel' : 'Akses Cabang'}
            </div>
          </div>
        </div>

        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
          {role === 'ADMIN' ? (
            <>
              <button onClick={() => setActiveTab('KASIR')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: activeTab === 'KASIR' ? 'bold' : 'normal', backgroundColor: activeTab === 'KASIR' ? '#3b82f6' : 'transparent', color: 'white', textAlign: 'left' }}>🛒 KASIR</button>
              <button onClick={() => setActiveTab('RIWAYAT')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: activeTab === 'RIWAYAT' ? 'bold' : 'normal', backgroundColor: activeTab === 'RIWAYAT' ? '#3b82f6' : 'transparent', color: activeTab === 'RIWAYAT' ? 'white' : '#cbd5e1', textAlign: 'left' }}>⏱️ RIWAYAT</button>
              <button onClick={() => setActiveTab('UTILITY')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: activeTab === 'UTILITY' ? 'bold' : 'normal', backgroundColor: activeTab === 'UTILITY' ? '#3b82f6' : 'transparent', color: activeTab === 'UTILITY' ? 'white' : '#cbd5e1', textAlign: 'left' }}>🛠️ UTILITY</button>
            </>
          ) : (
            <button onClick={() => setActiveTab('KATALOG')} style={{ display: 'flex', alignItems: 'center', gap: '15px', padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', backgroundColor: '#3b82f6', color: 'white', textAlign: 'left' }}>📚 KATALOG PRODUK</button>
          )}
        </div>

        <div style={{ padding: '20px', borderTop: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>👤</div>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'capitalize' }}>{username}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: '1px solid #475569', borderRadius: '6px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>🚪 Logout</button>
        </div>
      </div>

      {/* KONTEN UTAMA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* HEADER ATAS */}
        <div style={{ backgroundColor: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Selamat Pagi, {username} 👋</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Semangat bekerja hari ini!</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b' }}>{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>{currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        </div>

        {/* AREA TAB KONTEN */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '20px 30px', backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
          
          {/* TAB: KASIR (ADMIN ONLY) */}
          {activeTab === 'KASIR' && role === 'ADMIN' && (
            <div style={{ display: 'flex', height: '100%', gap: '25px' }}>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '15px', top: '15px', fontSize: '18px' }}>🔍</span>
                    <input ref={scannerRef} type="text" placeholder="Scan barcode atau cari nama barang..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={handleScanner} disabled={isProcessing} style={{ width: '100%', boxSizing: 'border-box', padding: '15px 15px 15px 45px', fontSize: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px', overflowY: 'auto', paddingBottom: '10px', paddingRight: '10px' }}>
                  {produk.length === 0 ? <p style={{ color: '#64748b' }}>Memuat katalog...</p> : produkDifilter.map(p => (
                    <div key={p.kode} onClick={() => { setKeyword(p.kode); handleScanner({ key: 'Enter' }); }} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '15px', cursor: 'pointer', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ width: '50px', height: '50px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💡</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b', marginBottom: '4px', lineHeight: '1.3' }}>{p.nama}</div>
                        <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '8px' }}>{p.kode} • Stok: {p.stok}</div>
                        <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '15px' }}>Rp {p.harga.toLocaleString('id-ID')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* KERANJANG KANAN */}
              <div style={{ width: '360px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flexShrink: 0 }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>🛒 Keranjang Belanja</h3>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px 20px' }}>
                  {keranjang.length === 0 ? <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '50px' }}>Keranjang kosong</p> : keranjang.map(k => (
                    <div key={k.kode} style={{ display: 'flex', gap: '15px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '10px' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💡</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>{k.nama}</div>
                          <button onClick={() => hapusItem(k.kode)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>🗑️</button>
                        </div>
                        <div style={{ color: '#64748b', fontSize: '11px', margin: '4px 0 8px 0' }}>Rp {k.harga.toLocaleString('id-ID')}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                            <button onClick={() => ubahQty(k.kode, -1)} style={{ padding: '4px 10px', border: 'none', background: 'white', cursor: 'pointer' }}>-</button>
                            <span style={{ fontSize: '13px', fontWeight: 'bold', padding: '0 10px', backgroundColor: '#f8fafc' }}>{k.qty}</span>
                            <button onClick={() => ubahQty(k.kode, 1)} style={{ padding: '4px 10px', border: 'none', background: 'white', cursor: 'pointer' }}>+</button>
                          </div>
                          <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}>Rp {(k.harga * k.qty).toLocaleString('id-ID')}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div style={{ padding: '20px', borderTop: '2px dashed #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px', color: '#475569' }}><span>Subtotal</span><span style={{ fontWeight: 'bold' }}>Rp {subtotal.toLocaleString('id-ID')}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '14px', color: '#475569' }}><span>Diskon</span><div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>Rp <input type="number" value={diskon === 0 ? '' : diskon} onChange={e => setDiskon(Number(e.target.value))} style={{ width: '80px', padding: '6px', textAlign: 'right', border: '1px solid #e2e8f0', borderRadius: '6px' }} placeholder="0" /></div></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><span style={{ fontSize: '18px', fontWeight: 'bold' }}>TOTAL</span><span style={{ fontSize: '22px', fontWeight: 'bold', color: '#10b981' }}>Rp {totalAkhir.toLocaleString('id-ID')}</span></div>
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <button onClick={() => setPembayaran('CASH')} style={{ flex: 1, padding: '12px', backgroundColor: pembayaran === 'CASH' ? '#10b981' : '#f1f5f9', color: pembayaran === 'CASH' ? 'white' : '#64748b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>💵 CASH</button>
                    <button onClick={() => setPembayaran('TF')} style={{ flex: 1, padding: '12px', backgroundColor: pembayaran === 'TF' ? '#3b82f6' : '#f1f5f9', color: pembayaran === 'TF' ? 'white' : '#64748b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>💳 TRANSFER</button>
                  </div>
                  <button onClick={prosesCheckout} disabled={isProcessing || keranjang.length === 0} style={{ width: '100%', padding: '15px', backgroundColor: isProcessing || keranjang.length === 0 ? '#94a3b8' : '#8b5cf6', color: 'white', fontSize: '15px', fontWeight: 'bold', border: 'none', borderRadius: '8px', cursor: isProcessing || keranjang.length === 0 ? 'not-allowed' : 'pointer' }}>{isProcessing ? 'MEMPROSES...' : '📝 PROSES PEMBAYARAN'}</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: KATALOG (CABANG ONLY) */}
          {activeTab === 'KATALOG' && role === 'CABANG' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ marginBottom: '25px', position: 'relative', maxWidth: '600px' }}>
                <span style={{ position: 'absolute', left: '15px', top: '15px', fontSize: '18px' }}>🔍</span>
                <input type="text" placeholder="Cari nama barang atau barcode..." value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '15px 15px 15px 45px', fontSize: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', overflowY: 'auto', paddingBottom: '20px', paddingRight: '10px' }}>
                {produkDifilter.map(p => (
                  <div key={p.kode} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div style={{ width: '60px', height: '60px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>💡</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1e293b', marginBottom: '6px' }}>{p.nama}</div>
                      <div style={{ color: '#64748b', fontSize: '13px', marginBottom: '10px' }}>{p.kode} • Stok: {p.stok}</div>
                      <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px' }}>Rp {p.harga.toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: RIWAYAT (ADMIN ONLY) - Disederhanakan untuk efisiensi ruang baca */}
          {activeTab === 'RIWAYAT' && role === 'ADMIN' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '25px' }}>
                <div style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', color: 'white', padding: '20px', borderRadius: '12px' }}><div style={{ fontSize: '13px', marginBottom: '5px' }}>TOTAL OMZET</div><div style={{ fontSize: '24px', fontWeight: 'bold' }}>Rp {riwayat.reduce((sum, r) => sum + (r.total || 0), 0).toLocaleString('id-ID')}</div></div>
                <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '20px', borderRadius: '12px' }}><div style={{ fontSize: '13px', marginBottom: '5px' }}>KAS SEHARUSNYA (CASH)</div><div style={{ fontSize: '24px', fontWeight: 'bold' }}>Rp {(Number(ringkasan?.saldoAwal || 0) + riwayat.filter(r => r.pembayaran !== 'TF').reduce((sum, r) => sum + Number(r.total || 0), 0)).toLocaleString('id-ID')}</div></div>
                <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '20px', borderRadius: '12px' }}><div style={{ fontSize: '13px', marginBottom: '5px' }}>OMZET CASH</div><div style={{ fontSize: '24px', fontWeight: 'bold' }}>Rp {riwayat.filter(r => r.pembayaran !== 'TF').reduce((sum, r) => sum + (r.total || 0), 0).toLocaleString('id-ID')}</div></div>
                <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', padding: '20px', borderRadius: '12px' }}><div style={{ fontSize: '13px', marginBottom: '5px' }}>OMZET TF</div><div style={{ fontSize: '24px', fontWeight: 'bold' }}>Rp {riwayat.filter(r => r.pembayaran === 'TF').reduce((sum, r) => sum + (r.total || 0), 0).toLocaleString('id-ID')}</div></div>
              </div>
              <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 20px 0' }}>Riwayat Transaksi Terakhir</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead><tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}><th style={{ padding: '12px 10px' }}>No Struk</th><th style={{ padding: '12px 10px' }}>Barang</th><th style={{ padding: '12px 10px' }}>Qty</th><th style={{ padding: '12px 10px' }}>Total</th><th style={{ padding: '12px 10px' }}>Tipe</th></tr></thead>
                  <tbody>
                    {riwayat.map((r, i) => (<tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '15px 10px' }}>{r.noStruk}</td><td style={{ padding: '15px 10px', fontWeight: '500' }}>{r.nama}</td><td style={{ padding: '15px 10px' }}>{r.qty}</td><td style={{ padding: '15px 10px', color: '#10b981', fontWeight: 'bold' }}>Rp {(r.total || 0).toLocaleString('id-ID')}</td><td style={{ padding: '15px 10px' }}>{r.pembayaran}</td></tr>))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: UTILITY (ADMIN ONLY) */}
          {activeTab === 'UTILITY' && role === 'ADMIN' && (
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
              <h2 style={{ margin: '0 0 10px 0' }}>Utility & Tutup Kasir</h2>
              <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                <button onClick={prosesInputSaldo} style={{ padding: '15px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>💰 Input Saldo Awal</button>
                <button onClick={() => alert('Fitur Tutup Kasir dikendalikan dari Spreadsheet')} style={{ padding: '15px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>🛑 Selesaikan Hari (Tutup Kasir)</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default App;