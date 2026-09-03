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
  const scannerRef = useRef(null);

  const API_URL = 'https://script.google.com/macros/s/AKfycbz9nzSX94WpWYL_-pdjhuaJlTsBElnXIRN5rbqwF3G2Jn_-AL1hEdCri_f7P0MEH28r/exec';

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') { setRole('ADMIN'); setActiveTab('KASIR'); setIsLoggedIn(true); } 
    else if (username === 'cabang' && password === 'cabang123') { setRole('CABANG'); setActiveTab('KATALOG'); setIsLoggedIn(true); } 
    else { alert('Username atau PIN salah!'); }
  };

  const handleLogout = () => {
    if(window.confirm('Yakin ingin keluar?')) { setIsLoggedIn(false); setRole(null); setUsername(''); setPassword(''); setKeranjang([]); }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => { if (activeTab === 'KASIR') scannerRef.current?.focus(); }, [activeTab]);

  // FIX BUG 1: Filter ketat untuk memblokir baris kosong (dummy) di pencarian
  const produkDifilter = produk.filter(p => {
    if (!p.nama || p.nama.trim() === '') return false; 
    const kw = keyword.toLowerCase().trim();
    if (kw === '') return true; 
    return String(p.nama).toLowerCase().includes(kw) || String(p.kode || '').toLowerCase().includes(kw) || String(p.barcode || '').toLowerCase().includes(kw);
  });

  const tambahKeKeranjang = (item) => {
    setKeranjang(prev => {
      const ada = prev.find(k => k.kode === item.kode);
      if (ada) return prev.map(k => k.kode === item.kode ? { ...k, qty: k.qty + 1 } : k);
      return [...prev, { ...item, qty: 1 }];
    });
    setKeyword(''); scannerRef.current?.focus();
  };

  const handleScanner = (e) => {
    if (e.key === 'Enter' && keyword.trim() !== '') {
      let item = produk.find(p => String(p.kode).toLowerCase() === keyword.toLowerCase() || String(p.barcode) === keyword);
      if (!item && produkDifilter.length === 1) item = produkDifilter[0];
      if (item) tambahKeKeranjang(item);
      else { alert('Barang tidak ditemukan!'); setKeyword(''); scannerRef.current?.focus(); }
    }
  };

  // FIX BUG 2: Input QTY agar bisa diketik manual
  const ubahQtyKetikan = (kode, nilai) => {
    setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: nilai } : k));
  };
  const validasiQty = (kode, nilai) => {
    let angka = parseInt(nilai);
    if (isNaN(angka) || angka < 1) angka = 1;
    setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: angka } : k));
  };

  const ubahQty = (kode, delta) => {
    setKeranjang(prev => prev.map(k => {
      if (k.kode === kode) {
        let currentQty = parseInt(k.qty) || 0;
        return { ...k, qty: Math.max(1, currentQty + delta) };
      }
      return k;
    }));
  };
  
  const hapusItem = (kode) => setKeranjang(prev => prev.filter(k => k.kode !== kode));
  const subtotal = keranjang.reduce((sum, item) => sum + (item.harga * (parseInt(item.qty)||0)), 0);
  const totalAkhir = Math.max(0, subtotal - diskon);

  const prosesCheckout = async () => {
    if (keranjang.length === 0) return alert('Keranjang kosong!');
    setIsProcessing(true);
    const validKeranjang = keranjang.map(k => ({...k, qty: parseInt(k.qty)||1}));
    const payload = { member: 'UMUM', pembayaran, diskon, subtotal, totalAkhir, items: validKeranjang };

    try {
      const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const result = await response.json();

      if (result.status === "success") {
        alert(`Berhasil!\nNo Struk: ${result.struk}\nTotal: Rp ${totalAkhir.toLocaleString('id-ID')}`);
        const dataKeranjang = [...validKeranjang];
        const sb = subtotal, ds = diskon, tot = totalAkhir, tp = pembayaran;
        setKeranjang([]); setDiskon(0); setKeyword(''); scannerRef.current?.focus();

        try {
          const w = window.open('', '_blank', 'width=300,height=600');
          if (w) {
            let htmlStruk = `<div style="font-family: monospace; font-size: 12px; width: 100%; max-width: 220px; margin: 0 auto; color: #000;"><div style="text-align: center; font-weight: bold; font-size: 14px;">INDRA JAYA PUSAT</div><div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px;">${new Date().toLocaleString('id-ID')}<br>Struk: ${result.struk}<br>Tipe: ${tp}</div><table style="width: 100%; font-size: 12px; border-collapse: collapse;">`;
            dataKeranjang.forEach(item => { htmlStruk += `<tr><td colspan="3">${item.nama.substring(0, 18)}</td></tr><tr><td>${item.qty}x</td><td>${item.harga.toLocaleString('id-ID')}</td><td style="text-align: right;">${(item.qty * item.harga).toLocaleString('id-ID')}</td></tr>`; });
            htmlStruk += `</table><div style="border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px;"><table style="width: 100%; font-size: 12px;"><tr><td>Subtotal</td><td style="text-align: right;">${sb.toLocaleString('id-ID')}</td></tr><tr><td>Diskon</td><td style="text-align: right;">${ds.toLocaleString('id-ID')}</td></tr><tr style="font-weight: bold; font-size: 14px;"><td>TOTAL</td><td style="text-align: right;">${tot.toLocaleString('id-ID')}</td></tr></table></div><div style="text-align: center; margin-top: 10px;">Terima Kasih</div></div><script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}</script>`;
            w.document.write(htmlStruk); w.document.close();
          }
        } catch(e){}
      }
    } catch (e) { alert('Error Jaringan. Pastikan API URL benar.'); } 
    finally { setIsProcessing(false); }
  };

  const prosesInputSaldo = async () => {
    const nominal = prompt("Masukkan jumlah Saldo Awal (CASH) hari ini:\nContoh: 150000");
    if (!nominal) return;
    const angka = parseInt(nominal.replace(/\D/g, ''));
    if (isNaN(angka)) return alert("Input harus berupa angka!");

    setIsProcessing(true);
    try {
      const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'inputSaldo', nominal: angka }) });
      const result = await response.json();
      if (result.status === "success") {
        alert("Saldo Awal berhasil disimpan ke Sheet!");
        setRingkasan(prev => ({ ...prev, saldoAwal: angka }));
      } else alert("Gagal menyimpan saldo.");
    } catch (e) { alert("Error jaringan."); } finally { setIsProcessing(false); }
  };

  const prosesPengeluaran = async () => {
    const ket = prompt("Keterangan Pengeluaran (contoh: Beli Galon):");
    if(!ket) return;
    const nom = prompt("Masukkan Nominal Pengeluaran (Rp):");
    if(!nom) return;
    const angka = parseInt(nom.replace(/\D/g, ''));
    if (isNaN(angka)) return alert("Nominal tidak valid!");
    
    setIsProcessing(true);
    try {
      const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'pengeluaran', keterangan: ket, nominal: angka }) });
      const result = await response.json();
      if(result.status === "success") alert("Pengeluaran berhasil dicatat di Sheet!");
    } catch(e){ alert("Error jaringan."); } finally { setIsProcessing(false); }
  };

  // FIX BUG 4: Print Laporan Tutup Kasir
  const prosesTutupKasir = async () => {
    if(!window.confirm("Yakin ingin menyelesaikan hari dan Tutup Kasir?\nData akan direkap dan laporan akan dicetak.")) return;
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
          const htmlReport = `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px;">
              <h2 style="text-align: center; margin-bottom: 5px;">LAPORAN TUTUP KASIR</h2>
              <p style="text-align: center; margin-top: 0; color: #555;">Indra Jaya Pusat • ${new Date().toLocaleString('id-ID')}</p>
              <hr style="border-top: 2px dashed #000; margin: 20px 0;"/>
              <table style="width: 100%; font-size: 15px; line-height: 2;">
                <tr><td>Saldo Awal (Cash)</td><td style="text-align: right; font-weight: bold;">Rp ${(Number(ringkasan?.saldoAwal) || 0).toLocaleString('id-ID')}</td></tr>
                <tr><td>Omzet Penjualan Cash</td><td style="text-align: right; font-weight: bold; color: green;">+ Rp ${omzetCash.toLocaleString('id-ID')}</td></tr>
                <tr><td>Omzet Penjualan Transfer</td><td style="text-align: right; font-weight: bold; color: blue;">+ Rp ${omzetTf.toLocaleString('id-ID')}</td></tr>
              </table>
              <hr style="border-top: 2px solid #000; margin: 20px 0;"/>
              <div style="display: flex; justify-content: space-between; font-size: 18px; font-weight: bold;">
                <span>KAS CASH SEHARUSNYA:</span>
                <span>Rp ${kasSeharusnya.toLocaleString('id-ID')}</span>
              </div>
              <p style="text-align: center; font-size: 12px; color: #888; margin-top: 40px;">Simpan halaman ini sebagai PDF / JPG untuk arsip.</p>
            </div>
            <script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>
          `;
          w.document.write(htmlReport); w.document.close();
        }
      }
    } catch (e) { alert("Error saat memproses Tutup Kasir."); } finally { setIsProcessing(false); }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', width: '100%', maxWidth: '350px' }}>
           <div style={{ textAlign: 'center', marginBottom: '30px' }}><div style={{ fontSize: '45px', marginBottom: '10px' }}>🏪</div><h2 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>Indra Jaya Pusat</h2></div>
           <form onSubmit={handleLogin}>
              <div style={{ marginBottom: '15px' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>Username</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Masukkan username" style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required /></div>
              <div style={{ marginBottom: '25px' }}><label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 'bold' }}>PIN</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan PIN" style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }} required /></div>
              <button type="submit" style={{ width: '100%', padding: '14px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer' }}>Masuk</button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: "'Segoe UI', Roboto, sans-serif", backgroundColor: '#f3f4f6' }}>
      {/* SIDEBAR */}
      <div style={{ width: '260px', backgroundColor: '#1e293b', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '25px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: '#3b82f6', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🏪</div>
          <div><h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Indra Jaya Pusat</h2><div style={{ fontSize: '12px', color: '#94a3b8' }}>{role === 'ADMIN' ? 'Admin Panel' : 'Akses Cabang'}</div></div>
        </div>
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
          {role === 'ADMIN' ? (
            <>
              <button onClick={() => setActiveTab('KASIR')} style={{ padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: activeTab === 'KASIR' ? 'bold' : 'normal', backgroundColor: activeTab === 'KASIR' ? '#3b82f6' : 'transparent', color: 'white', textAlign: 'left' }}>🛒 KASIR</button>
              <button onClick={() => setActiveTab('RIWAYAT')} style={{ padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: activeTab === 'RIWAYAT' ? 'bold' : 'normal', backgroundColor: activeTab === 'RIWAYAT' ? '#3b82f6' : 'transparent', color: activeTab === 'RIWAYAT' ? 'white' : '#cbd5e1', textAlign: 'left' }}>⏱️ RIWAYAT</button>
              <button onClick={() => setActiveTab('UTILITY')} style={{ padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: activeTab === 'UTILITY' ? 'bold' : 'normal', backgroundColor: activeTab === 'UTILITY' ? '#3b82f6' : 'transparent', color: activeTab === 'UTILITY' ? 'white' : '#cbd5e1', textAlign: 'left' }}>🛠️ UTILITY</button>
            </>
          ) : (<button onClick={() => setActiveTab('KATALOG')} style={{ padding: '15px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', backgroundColor: '#3b82f6', color: 'white', textAlign: 'left' }}>📚 KATALOG PRODUK</button>)}
        </div>
        <div style={{ padding: '20px', borderTop: '1px solid #334155' }}>
          <button onClick={handleLogout} style={{ width: '100%', padding: '10px', backgroundColor: 'transparent', border: '1px solid #475569', borderRadius: '6px', color: 'white', cursor: 'pointer' }}>🚪 Logout</button>
        </div>
      </div>

      {/* KONTEN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ backgroundColor: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <div><h1 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>Selamat Pagi, {username} 👋</h1></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontWeight: 'bold', fontSize: '15px' }}>{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div></div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', padding: '20px 30px', backgroundImage: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
          
          {/* TAB KASIR */}
          {activeTab === 'KASIR' && role === 'ADMIN' && (
            <div style={{ display: 'flex', height: '100%', gap: '25px' }}>
              <div style={{ flex: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ position: 'relative', marginBottom: '20px' }}>
                  <span style={{ position: 'absolute', left: '15px', top: '15px', fontSize: '18px' }}>🔍</span>
                  <input ref={scannerRef} type="text" placeholder="Scan barcode atau cari nama barang..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={handleScanner} disabled={isProcessing} style={{ width: '100%', boxSizing: 'border-box', padding: '15px 15px 15px 45px', fontSize: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px', overflowY: 'auto', paddingBottom: '10px' }}>
                  {produk.length === 0 ? <p>Memuat katalog...</p> : produkDifilter.map(p => (
                    <div key={p.kode} onClick={() => tambahKeKeranjang(p)} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '15px', cursor: 'pointer', border: '1px solid #e2e8f0', display: 'flex', gap: '15px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <div style={{ width: '50px', height: '50px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💡</div>
                      <div style={{ flex: 1 }}><div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>{p.nama}</div><div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '15px' }}>Rp {p.harga.toLocaleString('id-ID')}</div></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* KERANJANG */}
              <div style={{ width: '360px', backgroundColor: 'white', borderRadius: '16px', display: 'flex', flexDirection: 'column', border: '1px solid #e2e8f0' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9' }}><h3 style={{ margin: 0, fontSize: '16px' }}>🛒 Keranjang Belanja</h3></div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '15px 20px' }}>
                  {keranjang.map(k => (
                    <div key={k.kode} style={{ display: 'flex', gap: '15px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '12px', marginBottom: '10px' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💡</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><div style={{ fontWeight: '600', fontSize: '13px' }}>{k.nama}</div><button onClick={() => hapusItem(k.kode)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>🗑️</button></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                          {/* INPUT QTY BISA DIKETIK */}
                          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                            <button onClick={() => ubahQty(k.kode, -1)} style={{ padding: '4px 10px', border: 'none', background: 'white', cursor: 'pointer' }}>-</button>
                            <input type="number" value={k.qty} onChange={(e) => ubahQtyKetikan(k.kode, e.target.value)} onBlur={(e) => validasiQty(k.kode, e.target.value)} style={{ width: '40px', textAlign: 'center', border: 'none', outline: 'none', fontWeight: 'bold', fontSize: '13px', backgroundColor: '#f8fafc', padding: '5px 0' }} />
                            <button onClick={() => ubahQty(k.kode, 1)} style={{ padding: '4px 10px', border: 'none', background: 'white', cursor: 'pointer' }}>+</button>
                          </div>
                          <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '14px' }}>Rp {(k.harga * (parseInt(k.qty)||0)).toLocaleString('id-ID')}</div>
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

          {/* TAB KATALOG CABANG */}
          {activeTab === 'KATALOG' && role === 'CABANG' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ marginBottom: '25px', position: 'relative', maxWidth: '600px' }}><span style={{ position: 'absolute', left: '15px', top: '15px', fontSize: '18px' }}>🔍</span><input type="text" placeholder="Cari nama barang atau barcode..." value={keyword} onChange={e => setKeyword(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '15px 15px 15px 45px', fontSize: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', outline: 'none' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', overflowY: 'auto' }}>
                {produkDifilter.map(p => (<div key={p.kode} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', gap: '15px' }}><div style={{ width: '60px', height: '60px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px' }}>💡</div><div style={{ flex: 1 }}><div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '6px' }}>{p.nama}</div><div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px' }}>Rp {p.harga.toLocaleString('id-ID')}</div></div></div>))}
              </div>
            </div>
          )}

          {/* TAB RIWAYAT */}
          {activeTab === 'RIWAYAT' && role === 'ADMIN' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                <div style={{ background: 'linear-gradient(135deg, #1e293b, #334155)', color: 'white', padding: '20px', borderRadius: '12px' }}><div style={{ fontSize: '11px', marginBottom: '5px' }}>TOTAL OMZET</div><div style={{ fontSize: '20px', fontWeight: 'bold' }}>Rp {riwayat.reduce((sum, r) => sum + (r.total || 0), 0).toLocaleString('id-ID')}</div></div>
                <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '20px', borderRadius: '12px' }}><div style={{ fontSize: '11px', marginBottom: '5px' }}>KAS SEHARUSNYA (CASH)</div><div style={{ fontSize: '20px', fontWeight: 'bold' }}>Rp {(Number(ringkasan?.saldoAwal || 0) + riwayat.filter(r => r.pembayaran !== 'TF').reduce((sum, r) => sum + Number(r.total || 0), 0)).toLocaleString('id-ID')}</div></div>
                {/* FIX BUG 3: Tambahan Saldo Awal di Riwayat */}
                <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', padding: '20px', borderRadius: '12px' }}><div style={{ fontSize: '11px', marginBottom: '5px' }}>SALDO AWAL</div><div style={{ fontSize: '20px', fontWeight: 'bold' }}>Rp {(Number(ringkasan?.saldoAwal) || 0).toLocaleString('id-ID')}</div></div>
                
                <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', padding: '20px', borderRadius: '12px' }}><div style={{ fontSize: '11px', marginBottom: '5px' }}>OMZET CASH</div><div style={{ fontSize: '20px', fontWeight: 'bold' }}>Rp {riwayat.filter(r => r.pembayaran !== 'TF').reduce((sum, r) => sum + (r.total || 0), 0).toLocaleString('id-ID')}</div></div>
                <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', padding: '20px', borderRadius: '12px' }}><div style={{ fontSize: '11px', marginBottom: '5px' }}>OMZET TF</div><div style={{ fontSize: '20px', fontWeight: 'bold' }}>Rp {riwayat.filter(r => r.pembayaran === 'TF').reduce((sum, r) => sum + (r.total || 0), 0).toLocaleString('id-ID')}</div></div>
              </div>
              <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ margin: '0 0 20px 0' }}>Riwayat Transaksi Terakhir</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                  <thead><tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}><th style={{ padding: '12px 10px' }}>Struk</th><th style={{ padding: '12px 10px' }}>Barang</th><th style={{ padding: '12px 10px' }}>Qty</th><th style={{ padding: '12px 10px' }}>Total</th><th style={{ padding: '12px 10px' }}>Tipe</th></tr></thead>
                  <tbody>{riwayat.map((r, i) => (<tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '15px 10px' }}>{r.noStruk}</td><td style={{ padding: '15px 10px' }}>{r.nama}</td><td style={{ padding: '15px 10px' }}>{r.qty}</td><td style={{ padding: '15px 10px', color: '#10b981', fontWeight: 'bold' }}>Rp {(r.total || 0).toLocaleString('id-ID')}</td><td style={{ padding: '15px 10px' }}>{r.pembayaran}</td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB UTILITY (TUTUP KASIR & PENGELUARAN) */}
          {activeTab === 'UTILITY' && role === 'ADMIN' && (
            <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '600px' }}>
              <h2 style={{ margin: '0 0 10px 0' }}>Utility & Laporan</h2>
              <div style={{ display: 'grid', gap: '15px', marginTop: '20px' }}>
                <button onClick={prosesInputSaldo} disabled={isProcessing} style={{ padding: '15px', backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>💰 Input Saldo Awal</button>
                <button onClick={prosesPengeluaran} disabled={isProcessing} style={{ padding: '15px', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>💸 Input Pengeluaran</button>
                <button onClick={prosesTutupKasir} disabled={isProcessing} style={{ padding: '15px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px' }}>🛑 Selesaikan Hari & Cetak Laporan (Tutup Kasir)</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;