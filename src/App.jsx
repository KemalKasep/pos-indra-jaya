import React, { useState, useEffect, useRef } from 'react';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null); 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

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
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const scannerRef = useRef(null);

  // PASTIKAN URL API INI SESUAI DENGAN DEPLOYMENT BARU ANDA
  const API_URL = 'https://script.google.com/macros/s/AKfycbwxWGBYPBgPlUwtsg2CTHjq7DzVRSVDVrkXKK_9LI0thuLof7zUI_ixrHRA4l5GZw/exec';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'kemal' && password === 'malasel123') { setRole('ADMIN'); setActiveTab('KASIR'); setIsLoggedIn(true); } 
    else if (username === 'syarip' && password === 'syarip123') { setRole('CABANG'); setActiveTab('KATALOG'); setIsLoggedIn(true); } 
    else { alert('Username atau PIN salah!'); }
  };

  const handleLogout = () => { if(window.confirm('Yakin ingin keluar?')) { setIsLoggedIn(false); setRole(null); setUsername(''); setPassword(''); setKeranjang([]); } };

  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetch(`${API_URL}?action=getProduk`).then(res => res.json()).then(data => setProduk(Array.isArray(data) ? data : [])).catch(err => console.error(err));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && activeTab === 'RIWAYAT' && role === 'ADMIN') {
      setIsLoadingRiwayat(true);
      fetch(`${API_URL}?action=getRiwayat`).then(res => res.json()).then(data => {
        if (data.riwayat && data.ringkasan) { setRiwayat(data.riwayat); setRingkasan(data.ringkasan); } 
        else { setRiwayat(Array.isArray(data) ? data : []); }
        setIsLoadingRiwayat(false);
      }).catch(err => { console.error(err); setIsLoadingRiwayat(false); });
    }
  }, [activeTab, isLoggedIn, role]);

  useEffect(() => { if (activeTab === 'KASIR' && !isMobile) scannerRef.current?.focus(); }, [activeTab, isMobile]);

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

  const handleScanner = (e) => {
    if (e.key === 'Enter' && keyword.trim() !== '') {
      let item = produk.find(p => String(p.kode).toLowerCase() === keyword.toLowerCase() || String(p.barcode) === keyword);
      if (!item && produkDifilter.length === 1) item = produkDifilter[0];
      if (item) tambahKeKeranjang(item);
      else { alert('Barang tidak ditemukan!'); setKeyword(''); if(!isMobile) scannerRef.current?.focus(); }
    }
  };

  const ubahQtyKetikan = (kode, nilai) => setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: nilai } : k));
  const validasiQty = (kode, nilai) => {
    let angka = parseFloat(nilai);
    if (isNaN(angka) || angka <= 0) angka = 1;
    setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: angka } : k));
  };
  const ubahQty = (kode, delta) => setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: Math.max(0.1, (parseFloat(k.qty)||0) + delta) } : k));
  const hapusItem = (kode) => setKeranjang(prev => prev.filter(k => k.kode !== kode));
  
  const subtotal = keranjang.reduce((sum, item) => sum + (item.harga * (parseFloat(item.qty)||0)), 0);
  const totalAkhir = Math.max(0, subtotal - diskon);

  const formatCetakStruk = (noStruk, itemsData, sb, ds, tot, tp) => {
    const w = window.open('', '_blank', 'width=300,height=600');
    if (w) {
      let htmlStruk = `<div style="font-family: monospace; font-size: 12px; width: 100%; max-width: 220px; margin: 0 auto; color: #000;"><div style="text-align: center; font-weight: bold; font-size: 14px;">INDRA JAYA PUSAT</div><div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px;">${new Date().toLocaleString('id-ID')}<br>Struk: ${noStruk}<br>Tipe: ${tp}</div><table style="width: 100%; font-size: 12px; border-collapse: collapse;">`;
      itemsData.forEach(item => { 
        let hrg = item.harga || Math.round((item.total||0)/(item.qty||1)); 
        htmlStruk += `<tr><td colspan="3">${item.nama.substring(0, 18)}</td></tr><tr><td>${item.qty}x</td><td>${hrg.toLocaleString('id-ID')}</td><td style="text-align: right;">${((item.qty * hrg) || item.total).toLocaleString('id-ID')}</td></tr>`; 
      });
      htmlStruk += `</table><div style="border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px;"><table style="width: 100%; font-size: 12px;"><tr><td>Subtotal</td><td style="text-align: right;">${sb.toLocaleString('id-ID')}</td></tr><tr><td>Diskon</td><td style="text-align: right;">${ds.toLocaleString('id-ID')}</td></tr><tr style="font-weight: bold; font-size: 14px;"><td>TOTAL</td><td style="text-align: right;">${tot.toLocaleString('id-ID')}</td></tr></table></div><div style="text-align: center; margin-top: 10px;">Terima Kasih</div></div><script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}</script>`;
      w.document.write(htmlStruk); w.document.close();
    }
  };

  const prosesCheckout = async () => {
    if (keranjang.length === 0) return alert('Keranjang kosong!');
    setIsProcessing(true);
    const validKeranjang = keranjang.map(k => ({...k, qty: parseFloat(k.qty)||1}));
    const payload = { member: 'UMUM', pembayaran, diskon, subtotal, totalAkhir, items: validKeranjang };

    try {
      const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await response.json();
      if (result.status === "success") {
        const confirmPrint = window.confirm(`Transaksi Berhasil!\nNo Struk: ${result.struk}\nTotal: Rp ${totalAkhir.toLocaleString('id-ID')}\n\nIngin mencetak struk sekarang?`);
        if (confirmPrint) formatCetakStruk(result.struk, validKeranjang, subtotal, diskon, totalAkhir, pembayaran);
        setKeranjang([]); setDiskon(0); setKeyword(''); if(!isMobile) scannerRef.current?.focus();
      }
    } catch (e) { alert('Error Jaringan.'); } finally { setIsProcessing(false); }
  };

  const reprintStruk = (noStruk) => {
    const items = riwayat.filter(r => r.noStruk === noStruk);
    if(items.length === 0) return alert("Data tidak ditemukan");
    const totAkhir = items.reduce((s, i) => s + (i.total||0), 0);
    formatCetakStruk(noStruk, items, totAkhir, 0, totAkhir, items[0].pembayaran);
  };

  const prosesInputSaldo = async () => {
    const nominal = prompt("Masukkan jumlah Saldo Awal (CASH) hari ini:\nContoh: 150000");
    if (!nominal) return;
    const angka = parseInt(nominal.replace(/\D/g, ''));
    if (isNaN(angka)) return alert("Input harus angka!");
    setIsProcessing(true);
    try {
      const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'inputSaldo', nominal: angka }) });
      const result = await response.json();
      if (result.status === "success") { alert("Saldo Awal tersimpan!"); setRingkasan(prev => ({ ...prev, saldoAwal: angka })); }
    } catch (e) { alert("Error jaringan."); } finally { setIsProcessing(false); }
  };

  const prosesPengeluaran = async () => {
    const ket = prompt("Keterangan Pengeluaran:"); if(!ket) return;
    const nom = prompt("Nominal (Rp):"); if(!nom) return;
    const angka = parseInt(nom.replace(/\D/g, '')); if (isNaN(angka)) return alert("Nominal tidak valid!");
    setIsProcessing(true);
    try {
      const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'pengeluaran', keterangan: ket, nominal: angka }) });
      const result = await response.json();
      if(result.status === "success") alert("Pengeluaran dicatat!");
    } catch(e){ alert("Error jaringan."); } finally { setIsProcessing(false); }
  };

  const prosesTutupKasir = async () => {
    if(!window.confirm("Tutup Kasir dan cetak laporan?")) return;
    setIsProcessing(true);
    try {
      const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'tutupKasir' }) });
      const result = await response.json();
      if (result.status === "success") {
        const omzetCash = riwayat.filter(r => r.pembayaran !== 'TF').reduce((sum, r) => sum + (r.total || 0), 0);
        const omzetTf = riwayat.filter(r => r.pembayaran === 'TF').reduce((sum, r) => sum + (r.total || 0), 0);
        const kasSeharusnya = Number(ringkasan?.saldoAwal || 0) + omzetCash;
        const w = window.open('', '_blank', 'width=500,height=700');
        if (w) {
          const htmlReport = `<div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; color: #000;"><h2 style="text-align: center; margin-bottom: 5px;">LAPORAN TUTUP KASIR</h2><p style="text-align: center; margin-top: 0; color: #555;">${new Date().toLocaleString('id-ID')}</p><hr/><table style="width: 100%; font-size: 15px; line-height: 2;"><tr><td>Saldo Awal (Cash)</td><td style="text-align: right; font-weight: bold;">Rp ${(Number(ringkasan?.saldoAwal) || 0).toLocaleString('id-ID')}</td></tr><tr><td>Omzet Cash</td><td style="text-align: right; font-weight: bold; color: green;">+ Rp ${omzetCash.toLocaleString('id-ID')}</td></tr><tr><td>Omzet Transfer</td><td style="text-align: right; font-weight: bold; color: blue;">+ Rp ${omzetTf.toLocaleString('id-ID')}</td></tr></table><hr/><div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;"><span>KAS CASH:</span><span>Rp ${kasSeharusnya.toLocaleString('id-ID')}</span></div></div><script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>`;
          w.document.write(htmlReport); w.document.close();
        }
      }
    } catch (e) { alert("Error saat Tutup Kasir."); } finally { setIsProcessing(false); }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '20px' }}>
        <div style={{ backgroundColor: 'white', padding: isMobile ? '30px 20px' : '40px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', width: '100%', maxWidth: '350px' }}>
           <div style={{ textAlign: 'center', marginBottom: '30px' }}><div style={{ fontSize: '45px', marginBottom: '10px' }}>🏪</div><h2 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>Indra Jaya Pusat</h2></div>
           <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>Username</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#1e293b', backgroundColor: 'white' }} required /></div>
              <div style={{ marginBottom: '25px' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>PIN</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#1e293b', backgroundColor: 'white' }} required /></div>
              <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>Masuk</button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', fontFamily: "'Segoe UI', Roboto, sans-serif", backgroundColor: '#f3f4f6' }}>
      {!isMobile && (
        <div style={{ width: '260px', backgroundColor: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '25px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}><div style={{ backgroundColor: '#3b82f6', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏪</div><div><h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Indra Jaya</h2><div style={{ fontSize: '12px', color: '#94a3b8' }}>{role === 'ADMIN' ? 'Admin Panel' : 'Cabang'}</div></div></div>
          <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
            {role === 'ADMIN' ? (
              <><button onClick={() => setActiveTab('KASIR')} style={{ padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: activeTab === 'KASIR' ? 'bold' : 'normal', backgroundColor: activeTab === 'KASIR' ? '#3b82f6' : 'transparent', color: 'white', textAlign: 'left' }}>🛒 KASIR</button><button onClick={() => setActiveTab('RIWAYAT')} style={{ padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: activeTab === 'RIWAYAT' ? 'bold' : 'normal', backgroundColor: activeTab === 'RIWAYAT' ? '#3b82f6' : 'transparent', color: activeTab === 'RIWAYAT' ? 'white' : '#cbd5e1', textAlign: 'left' }}>⏱️ RIWAYAT</button><button onClick={() => setActiveTab('UTILITY')} style={{ padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: activeTab === 'UTILITY' ? 'bold' : 'normal', backgroundColor: activeTab === 'UTILITY' ? '#3b82f6' : 'transparent', color: activeTab === 'UTILITY' ? 'white' : '#cbd5e1', textAlign: 'left' }}>🛠️ UTILITY</button></>
            ) : (<button onClick={() => setActiveTab('KATALOG')} style={{ padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', backgroundColor: '#3b82f6', color: 'white', textAlign: 'left' }}>📚 KATALOG</button>)}
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: isMobile ? '60px' : '0' }}>
        <div style={{ backgroundColor: 'white', padding: isMobile ? '12px 15px' : '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <div><h1 style={{ margin: 0, fontSize: isMobile ? '16px' : '20px', color: '#1e293b' }}>Hai, {username} 👋</h1></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 'bold', fontSize: isMobile ? '14px' : '15px', color: '#1e293b' }}>{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div></div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', padding: isMobile ? '10px' : '20px 30px', backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
          {activeTab === 'KASIR' && role === 'ADMIN' && (
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100%', gap: isMobile ? '10px' : '25px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ position: 'relative', marginBottom: isMobile ? '10px' : '20px', flexShrink: 0 }}><span style={{ position: 'absolute', left: '15px', top: '15px', fontSize: '18px' }}>🔍</span><input ref={scannerRef} type="text" placeholder="Cari nama / scan..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={handleScanner} disabled={isProcessing} style={{ width: '100%', boxSizing: 'border-box', padding: '15px 15px 15px 45px', fontSize: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', color: '#1e293b', backgroundColor: 'white' }} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', overflowY: 'auto' }}>
                  {produk.length === 0 ? <p style={{ color: '#1e293b' }}>Memuat...</p> : produkDifilter.map(p => (
                    <div key={p.kode} onClick={() => tambahKeKeranjang(p)} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '12px', cursor: 'pointer', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ width: '45px', height: '45px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💡</div>
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px', color: '#1e293b' }}>{p.nama}</div><div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '15px' }}>Rp {p.harga.toLocaleString('id-ID')}</div></div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ height: isMobile ? '50%' : '100%', width: isMobile ? '100%' : '360px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', flexDirection: 'column', flexShrink: 0, border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '12px 15px', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ margin: 0, fontSize: '15px', color: '#1e293b' }}>🛒 Keranjang</h3></div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                  {keranjang.map(k => (
                    <div key={k.kode} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>{k.nama}</div><button onClick={() => hapusItem(k.kode)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', padding: '0 5px' }}>🗑️</button></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                          <button onClick={() => ubahQty(k.kode, -1)} style={{ padding: '6px 12px', border: 'none', background: '#f1f5f9', color: '#1e293b', cursor: 'pointer', fontWeight: 'bold' }}>-</button>
                          <input type="number" step="any" value={k.qty} onChange={(e) => ubahQtyKetikan(k.kode, e.target.value)} onBlur={(e) => validasiQty(k.kode, e.target.value)} style={{ width: '45px', textAlign: 'center', border: 'none', outline: 'none', fontWeight: 'bold', fontSize: '13px', backgroundColor: 'white', color: '#1e293b' }} />
                          <button onClick={() => ubahQty(k.kode, 1)} style={{ padding: '6px 12px', border: 'none', background: '#f1f5f9', color: '#1e293b', cursor: 'pointer', fontWeight: 'bold' }}>+</button>
                        </div>
                        <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}>Rp {(k.harga * (parseFloat(k.qty)||0)).toLocaleString('id-ID')}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '15px', borderTop: '2px dashed #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', fontSize: '13px', color: '#475569' }}><span>Diskon (Rp)</span><input type="number" value={diskon === 0 ? '' : diskon} onChange={e => setDiskon(Number(e.target.value))} style={{ width: '80px', padding: '6px', textAlign: 'right', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#1e293b', backgroundColor: 'white' }} placeholder="0" /></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}><span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>TOTAL</span><span style={{ fontSize: '18px', fontWeight: 'bold', color: '#10b981' }}>Rp {totalAkhir.toLocaleString('id-ID')}</span></div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <button onClick={() => setPembayaran('CASH')} style={{ flex: 1, padding: '10px', backgroundColor: pembayaran === 'CASH' ? '#10b981' : '#f1f5f9', color: pembayaran === 'CASH' ? 'white' : '#64748b', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>💵 CASH</button>
                    <button onClick={() => setPembayaran('TF')} style={{ flex: 1, padding: '10px', backgroundColor: pembayaran === 'TF' ? '#3b82f6' : '#f1f5f9', color: pembayaran === 'TF' ? 'white' : '#64748b', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>💳 TF</button>
                  </div>
                  <button onClick={prosesCheckout} disabled={isProcessing || keranjang.length === 0} style={{ width: '100%', padding: '12px', backgroundColor: isProcessing || keranjang.length === 0 ? '#94a3b8' : '#8b5cf6', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px' }}>{isProcessing ? 'PROSES...' : 'BAYAR'}</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'KATALOG' && role === 'CABANG' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ marginBottom: '20px', position: 'relative' }}><span style={{ position: 'absolute', left: '15px', top: '15px', fontSize: '18px' }}>🔍</span><input type="text" placeholder="Cari nama / barcode..." value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '15px 15px 15px 45px', fontSize: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none', color: '#1e293b', backgroundColor: 'white' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', overflowY: 'auto' }}>
                {produkDifilter.map(p => (<div key={p.kode} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px' }}><div style={{ width: '50px', height: '50px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💡</div><div style={{ flex: 1 }}><div style={{ fontWeight: 'bold', fontSize: '15px', color: '#1e293b', marginBottom: '6px' }}>{p.nama}</div><div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px' }}>Rp {p.harga.toLocaleString('id-ID')}</div></div></div>))}
              </div>
            </div>
          )}

          {activeTab === 'RIWAYAT' && role === 'ADMIN' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                <div style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', color: 'white', padding: '15px', borderRadius: '12px' }}><div style={{ fontSize: '11px', marginBottom: '5px' }}>TOTAL OMZET</div><div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold' }}>Rp {riwayat.reduce((sum, r) => sum + (r.total || 0), 0).toLocaleString('id-ID')}</div></div>
                <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '15px', borderRadius: '12px' }}><div style={{ fontSize: '11px', marginBottom: '5px' }}>KAS SEHARUSNYA</div><div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold' }}>Rp {(Number(ringkasan?.saldoAwal || 0) + riwayat.filter(r => r.pembayaran !== 'TF').reduce((sum, r) => sum + Number(r.total || 0), 0)).toLocaleString('id-ID')}</div></div>
                <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', padding: '15px', borderRadius: '12px' }}><div style={{ fontSize: '11px', marginBottom: '5px' }}>SALDO AWAL</div><div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold' }}>Rp {(Number(ringkasan?.saldoAwal) || 0).toLocaleString('id-ID')}</div></div>
                <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '15px', borderRadius: '12px' }}><div style={{ fontSize: '11px', marginBottom: '5px' }}>OMZET CASH</div><div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold' }}>Rp {riwayat.filter(r => r.pembayaran !== 'TF').reduce((sum, r) => sum + (r.total || 0), 0).toLocaleString('id-ID')}</div></div>
                <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', padding: '15px', borderRadius: '12px' }}><div style={{ fontSize: '11px', marginBottom: '5px' }}>OMZET TF</div><div style={{ fontSize: isMobile ? '16px' : '20px', fontWeight: 'bold' }}>Rp {riwayat.filter(r => r.pembayaran === 'TF').reduce((sum, r) => sum + (r.total || 0), 0).toLocaleString('id-ID')}</div></div>
              </div>
              <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#1e293b', fontSize: '16px' }}>Riwayat Transaksi</h3>
                <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead><tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}><th style={{ padding: '10px' }}>Struk</th><th style={{ padding: '10px' }}>Barang</th><th style={{ padding: '10px' }}>Qty</th><th style={{ padding: '10px' }}>Total</th><th style={{ padding: '10px', textAlign: 'center' }}>Aksi</th></tr></thead>
                  <tbody>{riwayat.map((r, i) => (<tr key={i} style={{ borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}><td style={{ padding: '10px' }}>{r.noStruk}</td><td style={{ padding: '10px' }}>{r.nama}</td><td style={{ padding: '10px' }}>{r.qty}</td><td style={{ padding: '10px', color: '#10b981', fontWeight: 'bold' }}>Rp {(r.total || 0).toLocaleString('id-ID')}</td><td style={{ padding: '10px', textAlign: 'center' }}><button onClick={() => reprintStruk(r.noStruk)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>🖨️ Cetak</button></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'UTILITY' && role === 'ADMIN' && (
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
              <h2 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '18px' }}>Utility & Laporan</h2>
              <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                <button onClick={prosesInputSaldo} disabled={isProcessing} style={{ padding: '15px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>💰 Input Saldo Awal</button>
                <button onClick={prosesPengeluaran} disabled={isProcessing} style={{ padding: '15px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>💸 Input Pengeluaran</button>
                <button onClick={prosesTutupKasir} disabled={isProcessing} style={{ padding: '15px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>🛑 Tutup Kasir & Cetak</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: 'white', display: 'flex', justifyContent: 'space-around', padding: '10px 5px', zIndex: 100, borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
          {role === 'ADMIN' ? (
            <><button onClick={() => setActiveTab('KASIR')} style={{ background: 'none', border: 'none', color: activeTab === 'KASIR' ? '#3b82f6' : '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold' }}><span style={{ fontSize: '20px' }}>🛒</span>Kasir</button><button onClick={() => setActiveTab('RIWAYAT')} style={{ background: 'none', border: 'none', color: activeTab === 'RIWAYAT' ? '#3b82f6' : '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold' }}><span style={{ fontSize: '20px' }}>⏱️</span>Riwayat</button><button onClick={() => setActiveTab('UTILITY')} style={{ background: 'none', border: 'none', color: activeTab === 'UTILITY' ? '#3b82f6' : '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold' }}><span style={{ fontSize: '20px' }}>🛠️</span>Utility</button></>
          ) : (<button onClick={() => setActiveTab('KATALOG')} style={{ background: 'none', border: 'none', color: '#3b82f6', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold' }}><span style={{ fontSize: '20px' }}>📚</span>Katalog</button>)}
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 'bold' }}><span style={{ fontSize: '20px' }}>🚪</span>Keluar</button>
        </div>
      )}
    </div>
  );
};

export default App;