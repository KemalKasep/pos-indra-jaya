import React, { useState, useEffect, useRef } from 'react';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null); 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profilePic, setProfilePic] = useState(null); // State untuk Foto Profil

  const [activeTab, setActiveTab] = useState('KASIR'); 
  const [produk, setProduk] = useState([]);
  const [keranjang, setKeranjang] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [ringkasan, setRingkasan] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  
  const [keyword, setKeyword] = useState('');
  const [diskon, setDiskon] = useState(0);
  const [pembayaran, setPembayaran] = useState('CASH');
  const [tipePelanggan, setTipePelanggan] = useState('UMUM'); 
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState(0); 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const scannerRef = useRef(null);

  const API_URL = 'https://script.google.com/macros/s/AKfycbwxWGBYPBgPlUwtsg2CTHjq7DzVRSVDVrkXKK_9LI0thuLof7zUI_ixrHRA4l5GZw/exec'; 
  const DASHBOARD_API = 'https://script.google.com/macros/s/AKfycbwG-mQSucNHto86r0c8Nf4321W9dqRFEt4DgTJwnzxA9v0nquoc_bYigC0wUVLlBDoU/exec';

  // --- TEMA WARNA DARK MODE ---
  const colors = {
    bg: '#040B16',        // Background paling gelap
    panel: '#0C1938',     // Background kartu/panel
    panelBorder: '#1A2951', // Border kartu
    primary: '#FFB800',   // Kuning Emas
    textMain: '#FFFFFF',  // Teks Putih
    textMuted: '#8BA0C7', // Teks Abu-abu kebiruan
    btnBlue: '#16285A',   // Biru tombol
    danger: '#EF4444',
    success: '#10B981'
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // LOAD SESSION & FOTO PROFIL
  useEffect(() => {
    const savedSession = localStorage.getItem('owner_session');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      if (sessionData.role === 'OWNER') {
        setUsername(sessionData.username);
        setRole('OWNER');
        setActiveTab('DASHBOARD');
        setIsLoggedIn(true);
        loadProfilePic(sessionData.username);
      }
    }
  }, []);

  const loadProfilePic = (uname) => {
    const savedPic = localStorage.getItem(`profile_pic_${uname}`);
    if (savedPic) setProfilePic(savedPic);
    else setProfilePic('https://cdn-icons-png.flaticon.com/512/3135/3135715.png'); // Gambar default
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result;
        setProfilePic(base64String);
        localStorage.setItem(`profile_pic_${username}`, base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const pending = JSON.parse(localStorage.getItem('offline_tx') || '[]');
    setOfflineQueue(pending.length);
  }, []);

  const syncOfflineData = async () => { /* Logika sama seperti sebelumnya */ };
  useEffect(() => { window.addEventListener('online', syncOfflineData); return () => window.removeEventListener('online', syncOfflineData); }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    let r = null;
    if (username === 'bos' && password === 'bos123') r = 'OWNER';
    else if (username === 'kemal' && password === 'malasel123') r = 'KASIR';
    else if (username === 'syarip' && password === 'syarip123') r = 'CABANG';
    
    if(r) {
      setRole(r); 
      setActiveTab(r === 'CABANG' ? 'KATALOG' : (r === 'OWNER' ? 'DASHBOARD' : 'KASIR')); 
      setIsLoggedIn(true);
      loadProfilePic(username);
      if(r === 'OWNER') localStorage.setItem('owner_session', JSON.stringify({ username, role: r }));
    } else { alert('Username atau PIN salah!'); }
  };

  const handleLogout = () => { 
    if(window.confirm('Yakin ingin keluar?')) { 
      setIsLoggedIn(false); setRole(null); setUsername(''); setPassword(''); setKeranjang([]); setProfilePic(null);
      localStorage.removeItem('owner_session'); 
    } 
  };

  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    if (isLoggedIn && (role === 'KASIR' || role === 'OWNER')) {
      fetch(`${API_URL}?action=getProduk`).then(res => res.json()).then(data => setProduk(Array.isArray(data) ? data : [])).catch(err => console.error(err));
    }
  }, [isLoggedIn, role]);

  useEffect(() => {
    if (isLoggedIn && activeTab === 'RIWAYAT') {
      fetch(`${API_URL}?action=getRiwayat`).then(res => res.json()).then(data => {
        if (data.riwayat && data.ringkasan) { setRiwayat(data.riwayat); setRingkasan(data.ringkasan); } 
        else { setRiwayat(Array.isArray(data) ? data : []); }
      }).catch(err => console.error(err));
    }
  }, [activeTab, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && activeTab === 'DASHBOARD' && role === 'OWNER') {
      setIsLoadingDashboard(true);
      fetch(DASHBOARD_API).then(res => res.json()).then(data => { setDashboardData(data); setIsLoadingDashboard(false); }).catch(err => { console.error(err); setIsLoadingDashboard(false); });
    }
  }, [activeTab, isLoggedIn, role]);

  const isGrosirAvailable = produk.some(p => p.hargaGrosir && Number(p.hargaGrosir) > 0);
  const getHargaAktif = (item) => (tipePelanggan === 'MEMBER' && item.hargaGrosir && Number(item.hargaGrosir) > 0) ? Number(item.hargaGrosir) : Number(item.harga);

  const produkDifilter = produk.filter(p => {
    if (!p.nama || p.nama.trim() === '') return false; 
    const kw = keyword.toLowerCase().trim();
    if (kw === '') return true; 
    return String(p.nama).toLowerCase().includes(kw) || String(p.kode || '').toLowerCase().includes(kw) || String(p.barcode || '').toLowerCase().includes(kw);
  });

  const tambahKeKeranjang = (item) => {
    setKeranjang(prev => {
      const ada = prev.find(k => k.kode === item.kode);
      if (ada) return prev.map(k => k.kode === item.kode ? { ...k, qty: parseFloat(k.qty) + 1 } : k);
      return [...prev, { ...item, qty: 1 }];
    });
    setKeyword(''); if(!isMobile) scannerRef.current?.focus();
  };

  const handleScanner = (e) => { if (e.key === 'Enter' && keyword.trim() !== '') { let item = produk.find(p => String(p.kode).toLowerCase() === keyword.toLowerCase() || String(p.barcode) === keyword); if (!item && produkDifilter.length === 1) item = produkDifilter[0]; if (item) tambahKeKeranjang(item); else { alert('Barang tidak ditemukan!'); setKeyword(''); if(!isMobile) scannerRef.current?.focus(); } } };

  const ubahQtyKetikan = (kode, nilai) => setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: nilai } : k));
  const validasiQty = (kode, nilai) => { let angka = parseFloat(nilai); if (isNaN(angka) || angka <= 0) angka = 1; setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: angka } : k)); };
  const ubahQty = (kode, delta) => setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: Math.max(0.1, (parseFloat(k.qty)||0) + delta) } : k));
  const hapusItem = (kode) => setKeranjang(prev => prev.filter(k => k.kode !== kode));
  
  const subtotal = keranjang.reduce((sum, item) => sum + (getHargaAktif(item) * (parseFloat(item.qty)||0)), 0);
  const totalAkhir = Math.max(0, subtotal - diskon);

  const formatCetakStruk = (noStruk, itemsData, sb, ds, tot, tp) => { /* Logika cetak struk sama */ };
  const prosesCheckout = async () => { /* Logika checkout sama */ };
  const reprintStruk = (noStruk) => { /* Logika reprint sama */ };
  const batalkanTransaksi = (noStruk) => { /* Logika void sama */ };
  const prosesUpdateHarga = async () => { /* Logika update harga sama */ };
  const prosesInputSaldo = async () => { /* Logika input saldo sama */ };
  const prosesPengeluaran = async () => { /* Logika pengeluaran sama */ };
  const prosesTutupKasir = async () => { /* Logika tutup kasir sama */ };

  const formatRp = (angka) => { let num = Number(angka); if(isNaN(num)) return "Rp 0"; return "Rp " + num.toLocaleString('id-ID'); };

  // --- LAYAR LOGIN ---
  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg, padding: '20px', fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
        <div style={{ backgroundColor: colors.panel, padding: isMobile ? '30px 20px' : '40px', borderRadius: '20px', border: `1px solid ${colors.panelBorder}`, width: '100%', maxWidth: '350px', boxShadow: `0 10px 30px rgba(0,0,0,0.5)` }}>
           <div style={{ textAlign: 'center', marginBottom: '30px' }}><div style={{ fontSize: '50px', marginBottom: '10px' }}>⭐</div><h2 style={{ margin: 0, color: colors.primary, fontSize: '24px' }}>Indra Jaya Pusat</h2></div>
           <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: colors.textMuted }}>Username</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '12px', border: `1px solid ${colors.panelBorder}`, color: colors.textMain, backgroundColor: colors.bg, outline: 'none' }} required /></div>
              <div style={{ marginBottom: '25px' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: colors.textMuted }}>PIN</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: '12px', border: `1px solid ${colors.panelBorder}`, color: colors.textMain, backgroundColor: colors.bg, outline: 'none' }} required /></div>
              <button type="submit" style={{ width: '100%', padding: '15px', backgroundColor: colors.primary, color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>Masuk Sistem</button>
           </form>
        </div>
      </div>
    );
  }

  // --- LAYAR UTAMA (DARK THEME) ---
  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', fontFamily: "'Segoe UI', Roboto, sans-serif", backgroundColor: colors.bg, color: colors.textMain }}>
      
      {/* SIDEBAR PC */}
      {!isMobile && (
        <div style={{ width: '280px', backgroundColor: colors.panel, display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: `1px solid ${colors.panelBorder}` }}>
          <div style={{ padding: '30px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
             {/* FOTO PROFIL BISA DIUBAH */}
             <div style={{ position: 'relative', width: '55px', height: '55px' }}>
                <input type="file" accept="image/*" id="profileUpload" style={{ display: 'none' }} onChange={handleImageUpload} />
                <label htmlFor="profileUpload" style={{ cursor: 'pointer', display: 'block', width: '100%', height: '100%', borderRadius: '50%', border: `2px solid ${colors.primary}`, padding: '2px', boxShadow: `0 0 10px ${colors.primary}66` }}>
                  <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                </label>
             </div>
             <div><h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: colors.primary }}>Hai, {username}</h2><div style={{ fontSize: '12px', color: colors.textMuted }}>Semangat hari ini! 💛</div></div>
          </div>
          <div style={{ padding: '10px 15px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            {role === 'OWNER' && (<button onClick={() => setActiveTab('DASHBOARD')} style={{ padding: '15px 20px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', backgroundColor: activeTab === 'DASHBOARD' ? colors.btnBlue : 'transparent', color: activeTab === 'DASHBOARD' ? colors.primary : colors.textMuted, textAlign: 'left' }}>📊 Dashboard Pusat</button>)}
            {(role === 'ADMIN' || role === 'KASIR' || role === 'OWNER') && (
              <><button onClick={() => setActiveTab('KASIR')} style={{ padding: '15px 20px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', backgroundColor: activeTab === 'KASIR' ? colors.btnBlue : 'transparent', color: activeTab === 'KASIR' ? colors.primary : colors.textMuted, textAlign: 'left' }}>🛒 Kasir Transaksi</button><button onClick={() => setActiveTab('RIWAYAT')} style={{ padding: '15px 20px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', backgroundColor: activeTab === 'RIWAYAT' ? colors.btnBlue : 'transparent', color: activeTab === 'RIWAYAT' ? colors.primary : colors.textMuted, textAlign: 'left' }}>⏱️ Riwayat Transaksi</button><button onClick={() => setActiveTab('UTILITY')} style={{ padding: '15px 20px', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', backgroundColor: activeTab === 'UTILITY' ? colors.btnBlue : 'transparent', color: activeTab === 'UTILITY' ? colors.primary : colors.textMuted, textAlign: 'left' }}>🛠️ Utility & Laporan</button></>
            )}
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: isMobile ? '65px' : '0' }}>
        
        {/* HEADER MOBILE BISA DIUBAH */}
        {isMobile && (
          <div style={{ padding: '20px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', width: '50px', height: '50px' }}>
                <input type="file" accept="image/*" id="profileUploadMobile" style={{ display: 'none' }} onChange={handleImageUpload} />
                <label htmlFor="profileUploadMobile" style={{ cursor: 'pointer', display: 'block', width: '100%', height: '100%', borderRadius: '50%', border: `2px solid ${colors.primary}`, padding: '2px', boxShadow: `0 0 12px ${colors.primary}66` }}>
                  <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                </label>
                <span style={{ position: 'absolute', top: '-5px', left: '-5px', fontSize: '12px' }}>✨</span><span style={{ position: 'absolute', bottom: '-2px', right: '-5px', fontSize: '14px' }}>✨</span>
              </div>
              <div><h1 style={{ margin: 0, fontSize: '20px', color: colors.textMain }}>Hai, {username} 👋</h1><div style={{ fontSize: '13px', color: colors.textMuted }}>Semangat hari ini! 💛</div></div>
            </div>
            <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 'bold', fontSize: '18px', color: colors.primary }}>{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div><div style={{ fontSize: '11px', color: colors.textMuted }}>{currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden', padding: isMobile ? '0' : '20px', display: 'flex', flexDirection: 'column' }}>
          
          {/* TAB KASIR (Didesain ulang seperti gambar) */}
          {activeTab === 'KASIR' && (role === 'KASIR' || role === 'OWNER') && (
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', gap: isMobile ? '0' : '20px' }}>
              
              {/* BAGIAN PENCARIAN DAN DAFTAR BARANG */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: isMobile ? '0 15px' : '0' }}>
                <div style={{ display: 'flex', backgroundColor: colors.panel, borderRadius: '16px', padding: '5px', border: `1px solid ${colors.panelBorder}`, marginBottom: '15px' }}>
                  <span style={{ padding: '10px 15px', color: colors.textMuted }}>🔍</span>
                  <input ref={scannerRef} type="text" placeholder="Cari nama / scan barcode..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={handleScanner} disabled={isProcessing} style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: colors.textMain, outline: 'none', fontSize: '15px' }} />
                  <button style={{ backgroundColor: colors.primary, color: '#000', border: 'none', borderRadius: '12px', padding: '0 20px', fontWeight: 'bold', fontSize: '20px' }}>[-]</button>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ color: colors.primary, fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px' }}>⭐ PRODUK TERLARIS</div>
                  <div style={{ color: colors.primary, fontSize: '12px', cursor: 'pointer' }}>Lihat semua &gt;</div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
                  {produk.length === 0 ? <p style={{ color: colors.textMuted, textAlign: 'center', marginTop: '20px' }}>Memuat data produk...</p> : produkDifilter.map(p => (
                    <div key={p.kode} style={{ backgroundColor: colors.panel, borderRadius: '16px', padding: '15px', border: `1px solid ${colors.panelBorder}`, display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '12px' }}>
                      <div style={{ width: '55px', height: '55px', backgroundColor: 'white', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>💡</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', color: colors.textMain }}>{p.nama}</div>
                        <div style={{ color: colors.primary, fontWeight: 'bold', fontSize: '15px', marginTop: '4px' }}>Rp {Number(p.harga).toLocaleString('id-ID')}</div>
                        {p.hargaGrosir > 0 && <span style={{fontSize: '10px', backgroundColor: colors.btnBlue, color: colors.primary, padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '5px'}}>Bisa Grosir</span>}
                      </div>
                      <button onClick={() => tambahKeKeranjang(p)} style={{ backgroundColor: 'transparent', border: `2px solid ${colors.btnBlue}`, color: colors.primary, width: '45px', height: '45px', borderRadius: '12px', fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* AREA KERANJANG & CHECKOUT (MENEMPEL DI BAWAH UNTUK MOBILE) */}
              <div style={{ height: isMobile ? 'auto' : '100%', width: isMobile ? '100%' : '380px', backgroundColor: colors.panel, borderRadius: isMobile ? '24px 24px 0 0' : '20px', display: 'flex', flexDirection: 'column', flexShrink: 0, border: `1px solid ${colors.panelBorder}`, padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: colors.textMain, display: 'flex', alignItems: 'center', gap: '8px' }}>🛒 KERANJANG</h3>
                  <div style={{ backgroundColor: colors.primary, color: '#000', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>{keranjang.reduce((sum, i) => sum + parseFloat(i.qty||0), 0)} item</div>
                </div>

                <div style={{ flex: isMobile ? 'none' : 1, overflowY: 'auto', maxHeight: isMobile ? '120px' : 'auto', marginBottom: '15px' }}>
                  {keranjang.map(k => (
                    <div key={k.kode} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px dashed ${colors.panelBorder}`, paddingBottom: '10px', marginBottom: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: colors.textMain }}>{k.nama}</div>
                        <div style={{ fontSize: '13px', color: colors.primary }}>{formatRp(getHargaAktif(k))}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: colors.bg, borderRadius: '8px', border: `1px solid ${colors.panelBorder}` }}>
                          <button onClick={() => ubahQty(k.kode, -1)} style={{ padding: '6px 12px', border: 'none', background: 'transparent', color: colors.primary, fontSize: '16px', fontWeight: 'bold' }}>-</button>
                          <input type="number" step="any" value={k.qty} onChange={(e) => ubahQtyKetikan(k.kode, e.target.value)} onBlur={(e) => validasiQty(k.kode, e.target.value)} style={{ width: '35px', textAlign: 'center', border: 'none', background: 'transparent', color: colors.textMain, outline: 'none', fontWeight: 'bold' }} />
                          <button onClick={() => ubahQty(k.kode, 1)} style={{ padding: '6px 12px', border: 'none', background: 'transparent', color: colors.primary, fontSize: '16px', fontWeight: 'bold' }}>+</button>
                        </div>
                        <button onClick={() => hapusItem(k.kode)} style={{ background: 'none', border: 'none', color: colors.danger, fontSize: '18px' }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: `1px solid ${colors.panelBorder}`, paddingTop: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', backgroundColor: colors.bg, borderRadius: '12px', border: `1px solid ${colors.panelBorder}`, padding: '5px', marginBottom: '15px' }}>
                    <div style={{ backgroundColor: colors.primary, color: '#000', padding: '8px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}>%</div>
                    <span style={{ padding: '0 10px', color: colors.textMuted, fontSize: '13px', flex: 1 }}>Diskon (Rp)</span>
                    <input type="number" value={diskon === 0 ? '' : diskon} onChange={e => setDiskon(Number(e.target.value))} style={{ width: '100px', backgroundColor: 'transparent', border: 'none', color: colors.textMain, outline: 'none', textAlign: 'right', paddingRight: '10px', fontSize: '16px', fontWeight: 'bold' }} placeholder="0" />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: colors.textMain }}>TOTAL</span>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', color: colors.primary }}>{formatRp(totalAkhir)}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <button onClick={() => setPembayaran('CASH')} style={{ flex: 1, padding: '15px', backgroundColor: pembayaran === 'CASH' ? colors.primary : colors.btnBlue, color: pembayaran === 'CASH' ? '#000' : colors.textMain, border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><span>💵</span> CASH</button>
                    <button onClick={() => setPembayaran('TF')} style={{ flex: 1, padding: '15px', backgroundColor: pembayaran === 'TF' ? colors.primary : colors.btnBlue, color: pembayaran === 'TF' ? '#000' : colors.textMain, border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}><span>💳</span> TF</button>
                  </div>
                  
                  <button onClick={prosesCheckout} disabled={isProcessing || keranjang.length === 0} style={{ width: '100%', padding: '16px', backgroundColor: isProcessing || keranjang.length === 0 ? colors.btnBlue : colors.primary, color: isProcessing || keranjang.length === 0 ? colors.textMuted : '#000', fontWeight: 'bold', border: 'none', borderRadius: '12px', fontSize: '16px' }}>BAYAR</button>
                </div>
              </div>
            </div>
          )}

          {/* TAB LAINNYA DISESUAIKAN DENGAN TEMA GELAP */}
          {activeTab === 'DASHBOARD' && role === 'OWNER' && (
            <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '15px' : '0' }}>
               {/* UI Dashboard yang sebelumnya sudah ada, kita beri sentuhan warna panel baru */}
               <h2 style={{ color: colors.primary, marginBottom: '20px' }}>📊 Dashboard Pusat</h2>
               <div style={{ backgroundColor: colors.panel, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.panelBorder}`, color: colors.textMuted }}>Data sedang dimuat...</div>
            </div>
          )}

          {activeTab === 'RIWAYAT' && (
            <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '15px' : '0' }}>
              <div style={{ backgroundColor: colors.panel, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.panelBorder}` }}>
                <h3 style={{ margin: '0 0 15px 0', color: colors.primary, fontSize: '16px' }}>Riwayat Transaksi</h3>
                <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', color: colors.textMain }}>
                  <thead><tr style={{ borderBottom: `2px solid ${colors.bg}`, color: colors.textMuted }}><th style={{ padding: '10px' }}>Struk</th><th style={{ padding: '10px' }}>Barang</th><th style={{ padding: '10px' }}>Total</th><th style={{ padding: '10px', textAlign: 'center' }}>Aksi</th></tr></thead>
                  <tbody>{riwayat.map((r, i) => (<tr key={i} style={{ borderBottom: `1px solid ${colors.panelBorder}` }}><td style={{ padding: '10px' }}>{r.noStruk}</td><td style={{ padding: '10px' }}>{r.nama}</td><td style={{ padding: '10px', color: colors.primary, fontWeight: 'bold' }}>{formatRp(r.total)}</td><td style={{ padding: '10px', textAlign: 'center' }}><button onClick={() => reprintStruk(r.noStruk)} style={{ background: colors.btnBlue, color: colors.primary, border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer' }}>🖨️ Cetak</button></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'UTILITY' && (
            <div style={{ padding: isMobile ? '15px' : '0' }}>
              <div style={{ backgroundColor: colors.panel, padding: '25px', borderRadius: '16px', border: `1px solid ${colors.panelBorder}`, maxWidth: '600px' }}>
                <h2 style={{ margin: '0 0 15px 0', color: colors.primary, fontSize: '18px' }}>Utility & Laporan</h2>
                <div style={{ display: 'grid', gap: '15px' }}>
                  <button onClick={prosesInputSaldo} style={{ padding: '15px', backgroundColor: colors.btnBlue, color: colors.textMain, border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>💰 Input Saldo Awal</button>
                  <button onClick={prosesPengeluaran} style={{ padding: '15px', backgroundColor: colors.btnBlue, color: colors.textMain, border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>💸 Input Pengeluaran</button>
                  <button onClick={prosesTutupKasir} style={{ padding: '15px', backgroundColor: colors.danger, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>🛑 Tutup Kasir & Cetak</button>
                  {role === 'OWNER' && (<button onClick={prosesUpdateHarga} style={{ padding: '15px', backgroundColor: colors.success, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}>🏷️ Ubah Harga Jual</button>)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM NAV MOBILE */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: colors.panel, display: 'flex', justifyContent: 'space-around', padding: '10px 5px', zIndex: 100, borderTop: `1px solid ${colors.panelBorder}`, pb: 'env(safe-area-inset-bottom)' }}>
          {role === 'OWNER' && (<button onClick={() => setActiveTab('DASHBOARD')} style={{ background: 'none', border: 'none', color: activeTab === 'DASHBOARD' ? colors.primary : colors.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: activeTab === 'DASHBOARD' ? 'bold' : 'normal' }}><span style={{ fontSize: '20px' }}>📊</span>Dashboard</button>)}
          {(role === 'ADMIN' || role === 'KASIR' || role === 'OWNER') && (
            <><button onClick={() => setActiveTab('KASIR')} style={{ background: 'none', border: 'none', color: activeTab === 'KASIR' ? colors.primary : colors.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: activeTab === 'KASIR' ? 'bold' : 'normal' }}>
                <span style={{ fontSize: '20px' }}>🛒</span>Kasir
                {activeTab === 'KASIR' && <div style={{width: '20px', height: '3px', backgroundColor: colors.primary, borderRadius: '2px', position: 'absolute', bottom: '2px'}}></div>}
              </button>
              <button onClick={() => setActiveTab('RIWAYAT')} style={{ background: 'none', border: 'none', color: activeTab === 'RIWAYAT' ? colors.primary : colors.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: activeTab === 'RIWAYAT' ? 'bold' : 'normal' }}>
                <span style={{ fontSize: '20px' }}>⏱️</span>Riwayat
                {activeTab === 'RIWAYAT' && <div style={{width: '20px', height: '3px', backgroundColor: colors.primary, borderRadius: '2px', position: 'absolute', bottom: '2px'}}></div>}
              </button>
              <button onClick={() => setActiveTab('UTILITY')} style={{ background: 'none', border: 'none', color: activeTab === 'UTILITY' ? colors.primary : colors.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: activeTab === 'UTILITY' ? 'bold' : 'normal' }}>
                <span style={{ fontSize: '20px' }}>🛠️</span>Utility
                {activeTab === 'UTILITY' && <div style={{width: '20px', height: '3px', backgroundColor: colors.primary, borderRadius: '2px', position: 'absolute', bottom: '2px'}}></div>}
              </button>
            </>
          )}
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: colors.danger, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 'bold' }}><span style={{ fontSize: '20px' }}>🚪</span>Keluar</button>
        </div>
      )}
    </div>
  );
};

export default App;