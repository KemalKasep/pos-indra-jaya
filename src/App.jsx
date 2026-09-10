import React, { useState, useEffect, useRef } from 'react';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [role, setRole] = useState(null); 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [profilePic, setProfilePic] = useState(null); 

  const [activeTab, setActiveTab] = useState('KASIR'); 
  const [produk, setProduk] = useState([]);
  const [keranjang, setKeranjang] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [ringkasan, setRingkasan] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  
  // STATE BARU: PENGUNCI HARI
  const [pendingDate, setPendingDate] = useState(null);
  
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

  const colors = {
    bg: '#040B16',        
    panel: '#0C1938',     
    panelBorder: '#1A2951', 
    primary: '#FFB800',   
    textMain: '#FFFFFF',  
    textMuted: '#8BA0C7', 
    btnBlue: '#16285A',   
    danger: '#EF4444',
    success: '#10B981'
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const savedSession = localStorage.getItem('pos_session');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      setUsername(sessionData.username);
      setRole(sessionData.role);
      setActiveTab(sessionData.role === 'CABANG' ? 'KATALOG' : (sessionData.role === 'OWNER' ? 'DASHBOARD' : 'KASIR'));
      setIsLoggedIn(true);
      loadProfilePic(sessionData.username);
    }
  }, []);

  const loadProfilePic = (uname) => {
    const savedPic = localStorage.getItem(`profile_pic_${uname}`);
    if (savedPic) setProfilePic(savedPic);
    else setProfilePic('https://cdn-icons-png.flaticon.com/512/3135/3135715.png'); 
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

  const syncOfflineData = async () => {
    const pending = JSON.parse(localStorage.getItem('offline_tx') || '[]');
    if (pending.length === 0) return;
    try {
      const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(pending) });
      const result = await response.json();
      
      if (result.status === 'error' && result.message === 'TUTUP_KASIR_DULU') {
         alert(`Sinkronisasi Offline DITOLAK!\nSistem Sheets masih menyimpan data tanggal: ${result.tgl}.\nHarap Tutup Kasir & Arsipkan data kemarin di Sheets terlebih dahulu.`);
         setPendingDate(result.tgl);
         return;
      }

      if (result.status === 'success') {
        localStorage.removeItem('offline_tx');
        setOfflineQueue(0);
        alert(`${pending.length} Transaksi OFFLINE berhasil diamankan ke Google Sheets!`);
      }
    } catch(e) { alert("Gagal sinkronisasi. Pastikan internet stabil."); }
  };

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
      localStorage.setItem('pos_session', JSON.stringify({ username, role: r }));
    } else { alert('Username atau PIN salah!'); }
  };

  const handleLogout = () => { 
    if(window.confirm('Yakin ingin keluar?')) { 
      setIsLoggedIn(false); setRole(null); setUsername(''); setPassword(''); setKeranjang([]); setProfilePic(null);
      localStorage.removeItem('pos_session'); 
    } 
  };

  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(timer); }, []);

  // PENARIKAN DATA (DENGAN SENSOR KUNCI HARI)
  useEffect(() => {
    if (isLoggedIn && (role === 'KASIR' || role === 'OWNER')) {
      fetch(`${API_URL}?action=getProduk`)
        .then(res => res.json())
        .then(data => {
          if (data.status === "success") {
            setProduk(data.data || []);
            if (data.pendingClose) setPendingDate(data.tglTertahan);
            else setPendingDate(null);
          } else {
            setProduk(Array.isArray(data) ? data : []);
          }
        }).catch(err => console.error(err));
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

  const produkKritis = produk.filter(p => Number(p.stok) < 10);
  const orderSalesMap = {};
  produkKritis.forEach(p => {
    const sales = (p.namaSales && p.namaSales.trim() !== '') ? p.namaSales.trim() : 'Tanpa Sales / Belum Diinput';
    if (!orderSalesMap[sales]) orderSalesMap[sales] = [];
    orderSalesMap[sales].push(p);
  });
  const orderSalesList = Object.entries(orderSalesMap).sort((a, b) => b[1].length - a[1].length);

  const isGrosirAvailable = produk.some(p => p.hargaGrosir && Number(p.hargaGrosir) > 0);
  const getHargaAktif = (item) => (tipePelanggan === 'MEMBER' && item.hargaGrosir && Number(item.hargaGrosir) > 0) ? Number(item.hargaGrosir) : Number(item.harga);

  const produkDifilter = produk.filter(p => {
    if (!p.nama || p.nama.trim() === '') return false; 
    const kw = keyword.toLowerCase().trim();
    if (kw === '') return true; 
    return String(p.nama).toLowerCase().includes(kw) || String(p.kode || '').toLowerCase().includes(kw) || String(p.barcode || '').toLowerCase().includes(kw);
  });

  const tambahKeKeranjang = (item) => {
    if (pendingDate) return; // Proteksi ganda
    setKeranjang(prev => {
      const ada = prev.find(k => k.kode === item.kode);
      if (ada) return prev.map(k => k.kode === item.kode ? { ...k, qty: parseFloat(k.qty) + 1 } : k);
      return [...prev, { ...item, qty: 1 }];
    });
    setKeyword(''); if(!isMobile) scannerRef.current?.focus();
  };

  const handleScanner = (e) => { 
    if (pendingDate) return; // Proteksi ganda scanner
    if (e.key === 'Enter' && keyword.trim() !== '') { 
      let item = produk.find(p => String(p.kode).toLowerCase() === keyword.toLowerCase() || String(p.barcode) === keyword); 
      if (!item && produkDifilter.length === 1) item = produkDifilter[0]; 
      if (item) tambahKeKeranjang(item); 
      else { alert('Barang tidak ditemukan!'); setKeyword(''); if(!isMobile) scannerRef.current?.focus(); } 
    } 
  };

  const ubahQtyKetikan = (kode, nilai) => { if(!pendingDate) setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: nilai } : k)); };
  const validasiQty = (kode, nilai) => { if(!pendingDate) { let angka = parseFloat(nilai); if (isNaN(angka) || angka <= 0) angka = 1; setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: angka } : k)); } };
  const ubahQty = (kode, delta) => { if(!pendingDate) setKeranjang(prev => prev.map(k => k.kode === kode ? { ...k, qty: Math.max(0.1, (parseFloat(k.qty)||0) + delta) } : k)); };
  const hapusItem = (kode) => { if(!pendingDate) setKeranjang(prev => prev.filter(k => k.kode !== kode)); };
  
  const subtotal = keranjang.reduce((sum, item) => sum + (getHargaAktif(item) * (parseFloat(item.qty)||0)), 0);
  const totalAkhir = Math.max(0, subtotal - diskon);

  const formatCetakStruk = (noStruk, itemsData, sb, ds, tot, tp, bayar = tot, kembali = 0) => {
    const w = window.open('', '_blank', 'width=300,height=600');
    if (w) {
      let htmlStruk = `<div style="font-family: monospace; font-size: 12px; width: 100%; max-width: 220px; margin: 0 auto; color: #000;"><div style="text-align: center; font-weight: bold; font-size: 14px;">INDRA JAYA PUSAT</div><div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px;">${new Date().toLocaleString('id-ID')}<br>Struk: ${noStruk}<br>Pelanggan: ${tipePelanggan}<br>Tipe: ${tp}</div><table style="width: 100%; font-size: 12px; border-collapse: collapse;">`;
      itemsData.forEach(item => { 
        let hrg = item.harga || Math.round((item.total||0)/(item.qty||1)); 
        htmlStruk += `<tr><td colspan="3">${item.nama.substring(0, 18)}</td></tr><tr><td>${item.qty}x</td><td>${hrg.toLocaleString('id-ID')}</td><td style="text-align: right;">${((item.qty * hrg) || item.total).toLocaleString('id-ID')}</td></tr>`; 
      });
      htmlStruk += `</table><div style="border-top: 1px dashed #000; margin-top: 5px; padding-top: 5px;"><table style="width: 100%; font-size: 12px;"><tr><td>Subtotal</td><td style="text-align: right;">${sb.toLocaleString('id-ID')}</td></tr><tr><td>Diskon</td><td style="text-align: right;">${ds.toLocaleString('id-ID')}</td></tr><tr style="font-weight: bold; font-size: 14px;"><td>TOTAL</td><td style="text-align: right;">${tot.toLocaleString('id-ID')}</td></tr>`;
      if (tp === 'CASH') {
        htmlStruk += `<tr><td colspan="2" style="border-top: 1px dashed #000; margin-top: 2px; padding-top: 2px;"></td></tr><tr><td>Tunai</td><td style="text-align: right;">${bayar.toLocaleString('id-ID')}</td></tr><tr><td>Kembali</td><td style="text-align: right;">${kembali.toLocaleString('id-ID')}</td></tr>`;
      }
      htmlStruk += `</table></div><div style="text-align: center; margin-top: 10px;">Terima Kasih</div></div><script>window.onload=function(){window.print();setTimeout(()=>window.close(),500);}</script>`;
      w.document.write(htmlStruk); w.document.close();
    }
  };

  const prosesCheckout = async () => {
    if (keranjang.length === 0) return alert('Keranjang kosong!');
    if (pendingDate) return alert(`SISTEM TERKUNCI!\nData tanggal ${pendingDate} belum diarsipkan di Sheets.`);

    setIsProcessing(true);
    let uangBayarCASH = totalAkhir;
    let uangKembalian = 0;

    if (pembayaran === 'CASH') {
      const inputBayar = prompt(`Total Belanja: Rp ${totalAkhir.toLocaleString('id-ID')}\n\nMasukkan NOMINAL UANG TUNAI dari pelanggan:`);
      if (inputBayar === null) { setIsProcessing(false); return; }
      const angkaBayar = parseInt(inputBayar.replace(/\D/g, ''));
      if (isNaN(angkaBayar) || angkaBayar < totalAkhir) {
        alert(`Transaksi Batal!\nUang tidak cukup atau format salah.\nMinimal Bayar: Rp ${totalAkhir.toLocaleString('id-ID')}`);
        setIsProcessing(false); return;
      }
      uangBayarCASH = angkaBayar;
      uangKembalian = angkaBayar - totalAkhir;
    }

    const validKeranjang = keranjang.map(k => ({ ...k, qty: parseFloat(k.qty)||1, harga: getHargaAktif(k) }));
    const payload = { member: tipePelanggan, pembayaran, diskon, subtotal, totalAkhir, items: validKeranjang, timestamp: new Date().toISOString() };

    if (!navigator.onLine) {
      payload.offlineStruk = `OFF-${new Date().getTime()}`;
      const pending = JSON.parse(localStorage.getItem('offline_tx') || '[]');
      pending.push(payload);
      localStorage.setItem('offline_tx', JSON.stringify(pending));
      setOfflineQueue(pending.length);
      
      let msg = `INTERNET TERPUTUS! Transaksi diamankan ke Mode Offline.\nTotal: Rp ${totalAkhir.toLocaleString('id-ID')}`;
      if (pembayaran === 'CASH') msg += `\nUang Diterima: Rp ${uangBayarCASH.toLocaleString('id-ID')}\nKEMBALIAN: Rp ${uangKembalian.toLocaleString('id-ID')}`;
      msg += `\n\nIngin mencetak struk sekarang?`;
      if (window.confirm(msg)) formatCetakStruk(payload.offlineStruk, validKeranjang, subtotal, diskon, totalAkhir, pembayaran, uangBayarCASH, uangKembalian);
      
      setKeranjang([]); setDiskon(0); setKeyword(''); if(!isMobile) scannerRef.current?.focus();
      setIsProcessing(false); return;
    }

    try {
      const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await response.json();
      
      if (result.status === "error" && result.message === "TUTUP_KASIR_DULU") {
         alert(`TRANSAKSI GAGAL!\nSistem mendeteksi ada transaksi di tanggal ${result.tgl} yang belum dibereskan.\nHarap Tutup Kasir dan Pindahkan ke Arsip Harian.`);
         setPendingDate(result.tgl);
         setIsProcessing(false);
         return;
      }

      if (result.status === "success") {
        let msg = `Transaksi Berhasil!\nNo Struk: ${result.struk}\nTotal: Rp ${totalAkhir.toLocaleString('id-ID')}`;
        if (pembayaran === 'CASH') msg += `\nUang Diterima: Rp ${uangBayarCASH.toLocaleString('id-ID')}\nKEMBALIAN: Rp ${uangKembalian.toLocaleString('id-ID')}`;
        msg += `\n\nIngin mencetak struk sekarang?`;

        if (window.confirm(msg)) formatCetakStruk(result.struk, validKeranjang, subtotal, diskon, totalAkhir, pembayaran, uangBayarCASH, uangKembalian);
        setKeranjang([]); setDiskon(0); setKeyword(''); if(!isMobile) scannerRef.current?.focus();
      }
    } catch (e) { 
      payload.offlineStruk = `OFF-${new Date().getTime()}`;
      const pending = JSON.parse(localStorage.getItem('offline_tx') || '[]');
      pending.push(payload);
      localStorage.setItem('offline_tx', JSON.stringify(pending));
      setOfflineQueue(pending.length);
      
      let msg = `Koneksi gagal! Transaksi dialihkan ke Mode Offline.\nTotal: Rp ${totalAkhir.toLocaleString('id-ID')}`;
      if (pembayaran === 'CASH') msg += `\nUang Diterima: Rp ${uangBayarCASH.toLocaleString('id-ID')}\nKEMBALIAN: Rp ${uangKembalian.toLocaleString('id-ID')}`;
      msg += `\n\nIngin mencetak struk sekarang?`;
      
      if (window.confirm(msg)) formatCetakStruk(payload.offlineStruk, validKeranjang, subtotal, diskon, totalAkhir, pembayaran, uangBayarCASH, uangKembalian);
      setKeranjang([]); setDiskon(0); setKeyword('');
    } finally { setIsProcessing(false); }
  };

  const reprintStruk = (noStruk) => {
    const items = riwayat.filter(r => r.noStruk === noStruk);
    if(items.length === 0) return alert("Data tidak ditemukan");
    const totAkhir = items.reduce((s, i) => s + (i.total||0), 0);
    formatCetakStruk(noStruk, items, totAkhir, 0, totAkhir, items[0].pembayaran);
  };

  const batalkanTransaksi = (noStruk) => {
    if (role !== 'OWNER') {
      const pin = prompt("PERINGATAN KEAMANAN\nMasukkan PIN Otorisasi Owner untuk membatalkan transaksi ini:");
      if (pin !== '889900') return alert("PIN Salah! Akses ditolak."); 
    }
    if (window.confirm(`Yakin ingin membatalkan struk ${noStruk}?\nOmzet akan dihapus dan stok akan dikembalikan.`)) {
      alert(`Fitur Batal disetujui! (Akan dihubungkan ke Sheets pada update API berikutnya)`);
    }
  };

  const prosesUpdateHarga = async () => {
    const kataKunci = prompt("UBAH HARGA\nMasukkan KODE atau NAMA BARANG yang ingin diubah:");
    if (!kataKunci) return;
    const barang = produk.find(p => String(p.kode).toLowerCase() === kataKunci.toLowerCase() || String(p.barcode) === kataKunci || String(p.nama).toLowerCase().includes(kataKunci.toLowerCase()));
    if (!barang) return alert("Barang tidak ditemukan di sistem!");

    const hargaBaru = prompt(`Ubah harga untuk:\n${barang.nama}\n(Harga saat ini: Rp ${Number(barang.harga).toLocaleString('id-ID')})\n\nMasukkan HARGA BARU (Angka saja):`);
    if (!hargaBaru) return;

    const angkaBaru = parseInt(hargaBaru.replace(/\D/g, ''));
    if (isNaN(angkaBaru)) return alert("Format harga salah, harus berupa angka!");

    if (!window.confirm(`Yakin mengubah harga ${barang.nama} menjadi Rp ${angkaBaru.toLocaleString('id-ID')}?`)) return;

    setIsProcessing(true);
    try {
      const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'updateHarga', kode: barang.kode, hargaBaru: angkaBaru }) });
      const result = await response.json();
      if (result.status === 'success') {
        alert("Harga berhasil diubah di Database!");
        fetch(`${API_URL}?action=getProduk`).then(res => res.json()).then(data => setProduk(data.data ? data.data : (Array.isArray(data)?data:[]))).catch(err => console.error(err));
      } else { alert("Gagal: " + result.message); }
    } catch (e) { alert("Error jaringan saat mengubah harga."); } finally { setIsProcessing(false); }
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
      if (result.status === "success") { alert("Saldo Awal berhasil ditulis ke Sheets!"); setRingkasan(prev => ({ ...prev, saldoAwal: angka })); }
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
      if(result.status === "success") alert("Pengeluaran dicatat ke Sheets!");
    } catch(e){ alert("Error jaringan."); } finally { setIsProcessing(false); }
  };

  const prosesTutupKasir = async () => {
    if (offlineQueue > 0) return alert("Mohon sinkronkan data Offline terlebih dahulu sebelum Tutup Kasir!");
    const inputFisik = prompt("TUTUP KASIR\nHitung dan masukkan total UANG FISIK (CASH) di laci saat ini:\n(Contoh: 1500000)");
    if (inputFisik === null || inputFisik.trim() === "") return; 
    const kasFisik = parseInt(inputFisik.replace(/\D/g, ''));
    if (isNaN(kasFisik)) return alert("Input dibatalkan! Uang fisik harus berupa angka.");

    if(!window.confirm(`Uang Fisik diinput: Rp ${kasFisik.toLocaleString('id-ID')}\nYakin ingin menyelesaikan hari dan Tutup Kasir sekarang?`)) return;

    setIsProcessing(true);
    try {
      const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'tutupKasir', kasFisik: kasFisik }) });
      const result = await response.json();
      
      if (result.status === "success" && result.dataFinal) {
        const { saldoAwal, omzetCash, omzetTF, kasSeharusnya } = result.dataFinal;
        const selisih = kasFisik - Number(kasSeharusnya);
        const warnaSelisih = selisih < 0 ? 'red' : (selisih > 0 ? 'green' : 'black');
        const teksSelisih = selisih < 0 ? `- Rp ${Math.abs(selisih).toLocaleString('id-ID')}` : (selisih > 0 ? `+ Rp ${selisih.toLocaleString('id-ID')}` : 'Rp 0 (BALANCE)');
        
        const w = window.open('', '_blank', 'width=500,height=750');
        if (w) {
          const htmlReport = `<div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; color: #000;"><h2 style="text-align: center; margin-bottom: 5px;">LAPORAN TUTUP KASIR</h2><p style="text-align: center; margin-top: 0; color: #555;">Indra Jaya Pusat • ${new Date().toLocaleString('id-ID')}</p><hr style="border-top: 2px dashed #000; margin: 20px 0;"/><table style="width: 100%; font-size: 15px; line-height: 2;"><tr><td>Saldo Awal (Cash)</td><td style="text-align: right; font-weight: bold;">Rp ${(Number(saldoAwal) || 0).toLocaleString('id-ID')}</td></tr><tr><td>Omzet Penjualan Cash</td><td style="text-align: right; font-weight: bold; color: green;">+ Rp ${(Number(omzetCash) || 0).toLocaleString('id-ID')}</td></tr><tr><td>Omzet Penjualan Transfer</td><td style="text-align: right; font-weight: bold; color: blue;">+ Rp ${(Number(omzetTF) || 0).toLocaleString('id-ID')}</td></tr></table><hr style="border-top: 2px solid #000; margin: 20px 0;"/><table style="width: 100%; font-size: 16px; line-height: 2; font-weight: bold;"><tr><td>KAS SEHARUSNYA</td><td style="text-align: right;">Rp ${(Number(kasSeharusnya) || 0).toLocaleString('id-ID')}</td></tr><tr><td>KAS FISIK (LACI)</td><td style="text-align: right; color: #3b82f6;">Rp ${kasFisik.toLocaleString('id-ID')}</td></tr><tr><td>SELISIH</td><td style="text-align: right; color: ${warnaSelisih};">${teksSelisih}</td></tr></table><p style="text-align: center; font-size: 12px; color: #888; margin-top: 40px;">Simpan halaman ini sebagai PDF / JPG.</p></div><script>window.onload = function() { window.print(); setTimeout(() => window.close(), 500); }</script>`;
          w.document.write(htmlReport); w.document.close();
        }
        alert("Kasir berhasil ditutup! Data fisik tercatat di Sheets.");
        setRiwayat([]); 
      }
    } catch (e) { alert("Error saat Tutup Kasir. Pastikan koneksi stabil."); } finally { setIsProcessing(false); }
  };

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

  // --- LAYAR UTAMA ---
  return (
    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', fontFamily: "'Segoe UI', Roboto, sans-serif", backgroundColor: colors.bg, color: colors.textMain }}>
      
      {/* SIDEBAR PC */}
      {!isMobile && (
        <div style={{ width: '280px', backgroundColor: colors.panel, display: 'flex', flexDirection: 'column', flexShrink: 0, borderRight: `1px solid ${colors.panelBorder}` }}>
          <div style={{ padding: '30px 20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
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

      {/* CONTAINER KONTEN UTAMA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: isMobile ? '65px' : '0' }}>
        
        {/* NOTIFIKASI STOK UNDER 10 */}
        {!pendingDate && produkKritis.length > 0 && (role === 'KASIR' || role === 'OWNER') && (
          <div style={{ backgroundColor: '#f59e0b', color: 'white', padding: '8px 15px', textAlign: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
            ⚠️ Terdapat {produkKritis.length} barang dengan stok menipis (&lt; 10 pcs). {role==='OWNER' && 'Cek Order Sales di Dashboard!'}
          </div>
        )}

        {/* HEADER MOBILE */}
        {isMobile && (
          <div style={{ padding: '10px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bg, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                <input type="file" accept="image/*" id="profileUploadMobile" style={{ display: 'none' }} onChange={handleImageUpload} />
                <label htmlFor="profileUploadMobile" style={{ cursor: 'pointer', display: 'block', width: '100%', height: '100%', borderRadius: '50%', border: `2px solid ${colors.primary}`, padding: '2px', boxShadow: `0 0 10px ${colors.primary}66` }}>
                  <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                </label>
              </div>
              <div><h1 style={{ margin: 0, fontSize: '16px', color: colors.textMain }}>Hai, {username}</h1></div>
            </div>
            <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '16px', color: colors.primary }}>{currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        )}

        {/* WRAPPER TAB FLEKSIBEL */}
        <div style={{ flex: 1, overflow: 'hidden', padding: isMobile ? '0' : '20px', display: 'flex', flexDirection: 'column' }}>
          
          {/* ======================= TAB KASIR ======================= */}
          {activeTab === 'KASIR' && (role === 'KASIR' || role === 'OWNER') && (
            <div style={{ position: 'relative', display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, minHeight: 0, gap: isMobile ? '0' : '20px' }}>
              
              {/* LAYAR KUNCI (LOCK SCREEN) MUTLAK! */}
              {pendingDate && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4, 11, 22, 0.95)', zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: isMobile ? '0' : '20px', padding: '20px', border: `2px solid ${colors.danger}` }}>
                   <div style={{ fontSize: '70px', marginBottom: '10px' }}>🔒</div>
                   <h2 style={{ color: colors.danger, textAlign: 'center', margin: '0 0 10px 0' }}>KASIR TERKUNCI</h2>
                   <p style={{ color: colors.textMain, textAlign: 'center', maxWidth: '350px', fontSize: '14px', lineHeight: '1.5' }}>
                     Sistem mendeteksi transaksi tanggal <strong style={{color: colors.primary}}>{pendingDate}</strong> belum diarsipkan.<br/><br/>
                     Anda tidak dapat menginput penjualan baru sebelum data kemarin ditutup!
                   </p>
                   <button onClick={() => setActiveTab('UTILITY')} style={{ padding: '12px 24px', backgroundColor: colors.primary, color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '16px', marginTop: '20px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255, 184, 0, 0.3)' }}>
                     Pergi ke Menu Tutup Kasir
                   </button>
                </div>
              )}

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: isMobile ? '10px 15px 0' : '0' }}>
                <div style={{ display: 'flex', backgroundColor: colors.panel, borderRadius: '12px', padding: '4px', border: `1px solid ${colors.panelBorder}`, marginBottom: '10px', flexShrink: 0 }}>
                  <span style={{ padding: '8px 12px', color: colors.textMuted }}>🔍</span>
                  <input ref={scannerRef} type="text" placeholder="Cari nama / scan barcode..." value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={handleScanner} disabled={isProcessing || !!pendingDate} style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: colors.textMain, outline: 'none', fontSize: '14px' }} />
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '10px' }}>
                  {produk.length === 0 ? <p style={{ color: colors.textMuted, textAlign: 'center', marginTop: '20px' }}>Memuat data produk...</p> : produkDifilter.map(p => (
                    <div key={p.kode} style={{ backgroundColor: colors.panel, borderRadius: '12px', padding: '10px', border: `1px solid ${colors.panelBorder}`, display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: '40px', height: '40px', backgroundColor: 'white', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💡</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: colors.textMain }}>{p.nama}</div>
                        <div style={{ color: colors.primary, fontWeight: 'bold', fontSize: '13px', marginTop: '2px' }}>Rp {Number(p.harga).toLocaleString('id-ID')}</div>
                        {p.hargaGrosir > 0 && <span style={{fontSize: '10px', backgroundColor: colors.btnBlue, color: colors.primary, padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '5px'}}>Bisa Grosir</span>}
                      </div>
                      <button onClick={() => !pendingDate && tambahKeKeranjang(p)} disabled={!!pendingDate} style={{ backgroundColor: 'transparent', border: `2px solid ${colors.btnBlue}`, color: colors.primary, width: '35px', height: '35px', borderRadius: '8px', fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: pendingDate ? 'not-allowed' : 'pointer' }}>+</button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, minHeight: 0, height: isMobile ? '48%' : '100%', width: isMobile ? '100%' : '380px', backgroundColor: colors.panel, borderRadius: isMobile ? '24px 24px 0 0' : '20px', border: `1px solid ${colors.panelBorder}`, padding: '15px 20px', boxShadow: isMobile ? `0 -5px 20px rgba(0,0,0,0.5)` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexShrink: 0 }}>
                  <h3 style={{ margin: 0, fontSize: '16px', color: colors.textMain, display: 'flex', alignItems: 'center', gap: '8px' }}>🛒 KERANJANG ({keranjang.reduce((sum, i) => sum + parseFloat(i.qty||0), 0)})</h3>
                  {isGrosirAvailable && (
                    <select value={tipePelanggan} onChange={(e) => setTipePelanggan(e.target.value)} disabled={!!pendingDate} style={{ padding: '5px', borderRadius: '8px', border: `1px solid ${colors.primary}`, fontSize: '12px', fontWeight: 'bold', backgroundColor: colors.bg, color: colors.primary, cursor: 'pointer', outline: 'none' }}>
                      <option value="UMUM">UMUM (Ecer)</option>
                      <option value="MEMBER">MEMBER (Grosir)</option>
                    </select>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px', minHeight: 0 }}>
                  {keranjang.map(k => (
                    <div key={k.kode} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px dashed ${colors.panelBorder}`, paddingBottom: '8px', marginBottom: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: colors.textMain }}>{k.nama}</div>
                        <div style={{ fontSize: '13px', color: colors.primary }}>{formatRp(getHargaAktif(k))}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: colors.bg, borderRadius: '8px', border: `1px solid ${colors.panelBorder}` }}>
                          <button onClick={() => ubahQty(k.kode, -1)} disabled={!!pendingDate} style={{ padding: '4px 10px', border: 'none', background: 'transparent', color: colors.primary, fontSize: '16px', fontWeight: 'bold' }}>-</button>
                          <input type="number" step="any" value={k.qty} onChange={(e) => ubahQtyKetikan(k.kode, e.target.value)} onBlur={(e) => validasiQty(k.kode, e.target.value)} disabled={!!pendingDate} style={{ width: '30px', textAlign: 'center', border: 'none', background: 'transparent', color: colors.textMain, outline: 'none', fontWeight: 'bold' }} />
                          <button onClick={() => ubahQty(k.kode, 1)} disabled={!!pendingDate} style={{ padding: '4px 10px', border: 'none', background: 'transparent', color: colors.primary, fontSize: '16px', fontWeight: 'bold' }}>+</button>
                        </div>
                        <button onClick={() => hapusItem(k.kode)} disabled={!!pendingDate} style={{ background: 'none', border: 'none', color: colors.danger, fontSize: '18px' }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* BAGIAN CHECKOUT */}
                <div style={{ borderTop: `1px solid ${colors.panelBorder}`, paddingTop: '10px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: colors.bg, borderRadius: '8px', border: `1px solid ${colors.panelBorder}`, padding: '2px 8px' }}>
                      <span style={{ color: colors.textMuted, fontSize: '11px', marginRight: '5px' }}>Diskon:</span>
                      <input type="number" value={diskon === 0 ? '' : diskon} onChange={e => setDiskon(Number(e.target.value))} disabled={!!pendingDate} style={{ width: '60px', backgroundColor: 'transparent', border: 'none', color: colors.textMain, outline: 'none', textAlign: 'right', fontSize: '14px', fontWeight: 'bold' }} placeholder="0" />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '12px', color: colors.textMuted, marginRight: '5px' }}>Total:</span>
                      <span style={{ fontSize: '18px', fontWeight: 'bold', color: colors.primary }}>{formatRp(totalAkhir)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setPembayaran('CASH')} disabled={!!pendingDate} style={{ padding: '8px', flex: 1, backgroundColor: pembayaran === 'CASH' ? colors.primary : colors.btnBlue, color: pembayaran === 'CASH' ? '#000' : colors.textMain, border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px' }}>💵 CASH</button>
                    <button onClick={() => setPembayaran('TF')} disabled={!!pendingDate} style={{ padding: '8px', flex: 1, backgroundColor: pembayaran === 'TF' ? colors.primary : colors.btnBlue, color: pembayaran === 'TF' ? '#000' : colors.textMain, border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px' }}>💳 TF</button>
                    
                    <button 
                      onClick={pendingDate ? () => { setActiveTab('UTILITY'); alert('Harap Tutup Kasir di menu ini!'); } : prosesCheckout} 
                      disabled={(!pendingDate && (isProcessing || keranjang.length === 0))} 
                      style={{ flex: 2, padding: '8px', backgroundColor: pendingDate ? colors.danger : (isProcessing || keranjang.length === 0 ? colors.btnBlue : colors.success), color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer' }}
                    >
                      {pendingDate ? 'KUNCI: TUTUP KASIR KEMARIN' : 'BAYAR'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================= TAB DASHBOARD OWNER ======================= */}
          {activeTab === 'DASHBOARD' && role === 'OWNER' && (
            <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '15px' : '0' }}>
              <h2 style={{ color: colors.primary, marginBottom: '20px' }}>📊 Dashboard Pusat</h2>
              
              {isLoadingDashboard ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: '50px' }}>
                  <div style={{ fontSize: '40px', animation: 'spin 2s linear infinite' }}>⏳</div>
                  <h3 style={{ color: colors.textMuted, marginTop: '10px' }}>Menarik Data Pusat...</h3>
                </div>
              ) : dashboardData ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
                    <div style={{ backgroundColor: colors.btnBlue, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.panelBorder}` }}>
                      <div style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '5px' }}>TOTAL PENJUALAN</div>
                      <div style={{ fontSize: '26px', fontWeight: 'bold', color: colors.textMain }}>{formatRp(dashboardData.ringkasan?.totalPenjualan)}</div>
                    </div>
                    <div style={{ backgroundColor: colors.panel, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.success}` }}>
                      <div style={{ fontSize: '13px', color: colors.success, marginBottom: '5px' }}>ESTIMASI KAS FISIK</div>
                      <div style={{ fontSize: '26px', fontWeight: 'bold', color: colors.textMain }}>{formatRp(dashboardData.ringkasan?.kasFisik)}</div>
                    </div>
                    <div style={{ backgroundColor: colors.panel, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.primary}` }}>
                      <div style={{ fontSize: '13px', color: colors.primary, marginBottom: '5px' }}>TOTAL ASET (Nilai Jual)</div>
                      <div style={{ fontSize: '26px', fontWeight: 'bold', color: colors.textMain }}>{formatRp(dashboardData.ringkasan?.totalAset)}</div>
                    </div>
                  </div>

                  {/* TABEL ORDER SALES (RESTOK) */}
                  <div style={{ backgroundColor: colors.panel, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.danger}`, marginBottom: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                      <h3 style={{ margin: 0, color: colors.primary, fontSize: '16px' }}>📋 Order Sales (Stok &lt; 10)</h3>
                      <span style={{ backgroundColor: colors.danger, color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>{produkKritis.length} Item Perlu Restok</span>
                    </div>
                    
                    {orderSalesList.length === 0 ? (
                      <div style={{ color: colors.success, textAlign: 'center', padding: '10px 0', fontWeight: 'bold' }}>Semua stok aman (di atas 10).</div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '15px' }}>
                        {orderSalesList.map(([salesName, items]) => (
                          <div key={salesName} style={{ backgroundColor: colors.bg, border: `1px solid ${colors.panelBorder}`, borderRadius: '12px', padding: '15px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px dashed ${colors.panelBorder}`, paddingBottom: '10px', marginBottom: '10px' }}>
                              <span style={{ fontWeight: 'bold', color: colors.textMain, fontSize: '15px' }}>👤 {salesName}</span>
                              <span style={{ color: colors.primary, fontSize: '12px', fontWeight: 'bold', backgroundColor: colors.btnBlue, padding: '4px 8px', borderRadius: '6px' }}>{items.length} Produk</span>
                            </div>
                            <div style={{ maxHeight: '150px', overflowY: 'auto', paddingRight: '5px' }}>
                              {items.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: colors.textMuted }}>
                                  <span>{item.nama}</span>
                                  <span style={{ color: Number(item.stok) < 5 ? colors.danger : '#f59e0b', fontWeight: 'bold' }}>Sisa: {item.stok}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                    <div style={{ backgroundColor: colors.panel, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.panelBorder}`, overflowX: 'auto' }}>
                      <h3 style={{ margin: '0 0 15px 0', color: colors.primary, fontSize: '16px' }}>Ringkasan Stok Cabang ⚠️</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', color: colors.textMain }}>
                        <thead><tr style={{ borderBottom: `2px solid ${colors.panelBorder}`, color: colors.textMuted }}><th style={{ padding: '10px' }}>Cabang</th><th style={{ padding: '10px', textAlign: 'center' }}>Total Macam</th><th style={{ padding: '10px', textAlign: 'center', color: '#f59e0b' }}>Stok &lt; 10</th><th style={{ padding: '10px', textAlign: 'center', color: colors.danger }}>Stok &lt; 5</th></tr></thead>
                        <tbody>
                          {dashboardData.stokCabang?.map((s, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${colors.bg}` }}><td style={{ padding: '10px', fontWeight: 'bold' }}>{s.cabang}</td><td style={{ padding: '10px', textAlign: 'center' }}>{s.jumlahProduk}</td><td style={{ padding: '10px', textAlign: 'center', color: '#f59e0b', fontWeight: 'bold' }}>{s.stokKurang10}</td><td style={{ padding: '10px', textAlign: 'center', color: colors.danger, fontWeight: 'bold' }}>{s.stokKurang5}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ backgroundColor: colors.panel, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.panelBorder}`, overflowX: 'auto' }}>
                      <h3 style={{ margin: '0 0 15px 0', color: colors.primary, fontSize: '16px' }}>Top Produk Terjual 🏆</h3>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', color: colors.textMain }}>
                        <thead><tr style={{ borderBottom: `2px solid ${colors.panelBorder}`, color: colors.textMuted }}><th style={{ padding: '10px' }}>Nama Produk</th><th style={{ padding: '10px', textAlign: 'right' }}>Qty Terjual</th></tr></thead>
                        <tbody>
                          {dashboardData.topProduk?.map((t, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid ${colors.bg}` }}><td style={{ padding: '10px' }}>{t.nama}</td><td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: colors.success }}>{t.qty} PCS</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: colors.textMuted, marginTop: '50px' }}>Gagal memuat data Dashboard.</div>
              )}
            </div>
          )}

          {/* ======================= TAB RIWAYAT ======================= */}
          {activeTab === 'RIWAYAT' && (
            <div style={{ height: '100%', overflowY: 'auto', padding: isMobile ? '15px' : '0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '15px', borderRadius: '12px', border: `1px solid ${colors.panelBorder}` }}>
                  <div style={{ fontSize: '11px', marginBottom: '5px', color: colors.textMuted }}>TOTAL OMZET</div>
                  <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', color: colors.primary }}>{formatRp(riwayat.reduce((sum, r) => sum + (r.total || 0), 0))}</div>
                </div>
                <div style={{ backgroundColor: '#064e3b', color: 'white', padding: '15px', borderRadius: '12px', border: `1px solid ${colors.success}` }}>
                  <div style={{ fontSize: '11px', marginBottom: '5px', color: '#6ee7b7' }}>KAS SEHARUSNYA</div>
                  <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', color: 'white' }}>{formatRp(Number(ringkasan?.saldoAwal || 0) + riwayat.filter(r => r.pembayaran !== 'TF').reduce((sum, r) => sum + Number(r.total || 0), 0))}</div>
                </div>
                <div style={{ backgroundColor: '#4c1d95', color: 'white', padding: '15px', borderRadius: '12px', border: `1px solid #7c3aed` }}>
                  <div style={{ fontSize: '11px', marginBottom: '5px', color: '#c4b5fd' }}>SALDO AWAL</div>
                  <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', color: 'white' }}>{formatRp(ringkasan?.saldoAwal || 0)}</div>
                </div>
                <div style={{ backgroundColor: '#78350f', color: 'white', padding: '15px', borderRadius: '12px', border: `1px solid #d97706` }}>
                  <div style={{ fontSize: '11px', marginBottom: '5px', color: '#fcd34d' }}>OMZET CASH</div>
                  <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', color: 'white' }}>{formatRp(riwayat.filter(r => r.pembayaran !== 'TF').reduce((sum, r) => sum + (r.total || 0), 0))}</div>
                </div>
                <div style={{ backgroundColor: '#1e3a8a', color: 'white', padding: '15px', borderRadius: '12px', border: `1px solid ${colors.btnBlue}` }}>
                  <div style={{ fontSize: '11px', marginBottom: '5px', color: '#bfdbfe' }}>OMZET TF</div>
                  <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold', color: 'white' }}>{formatRp(riwayat.filter(r => r.pembayaran === 'TF').reduce((sum, r) => sum + (r.total || 0), 0))}</div>
                </div>
              </div>

              <div style={{ backgroundColor: colors.panel, padding: '20px', borderRadius: '16px', border: `1px solid ${colors.panelBorder}` }}>
                <h3 style={{ margin: '0 0 15px 0', color: colors.primary, fontSize: '16px' }}>Riwayat Transaksi</h3>
                <table style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px', color: colors.textMain }}>
                  <thead><tr style={{ borderBottom: `2px solid ${colors.bg}`, color: colors.textMuted }}><th style={{ padding: '10px' }}>Struk</th><th style={{ padding: '10px' }}>Barang</th><th style={{ padding: '10px' }}>Total</th><th style={{ padding: '10px', textAlign: 'center' }}>Aksi</th></tr></thead>
                  <tbody>{riwayat.map((r, i) => (<tr key={i} style={{ borderBottom: `1px solid ${colors.panelBorder}` }}><td style={{ padding: '10px' }}>{r.noStruk}</td><td style={{ padding: '10px' }}>{r.nama}</td><td style={{ padding: '10px', color: colors.primary, fontWeight: 'bold' }}>{formatRp(r.total)}</td><td style={{ padding: '10px', textAlign: 'center' }}><button onClick={() => reprintStruk(r.noStruk)} style={{ background: colors.btnBlue, color: colors.primary, border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', marginRight: '5px' }}>🖨️ Cetak</button><button onClick={() => batalkanTransaksi(r.noStruk)} style={{ background: colors.danger, color: 'white', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✖ Void</button></td></tr>))}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================= TAB UTILITY ======================= */}
          {activeTab === 'UTILITY' && (
            <div style={{ padding: isMobile ? '15px' : '0' }}>
              <div style={{ backgroundColor: colors.panel, padding: '25px', borderRadius: '16px', border: `1px solid ${colors.panelBorder}`, maxWidth: '600px' }}>
                <h2 style={{ margin: '0 0 15px 0', color: colors.primary, fontSize: '18px' }}>Utility & Laporan</h2>
                
                {pendingDate && (
                  <div style={{ backgroundColor: colors.danger, color: 'white', padding: '15px', borderRadius: '10px', marginBottom: '20px', fontWeight: 'bold' }}>
                    SISTEM MENUNGGU: Segera cetak Laporan Tutup Kasir untuk tanggal {pendingDate}, lalu arsipkan data di Sheets agar Kasir hari ini terbuka kembali.
                  </div>
                )}

                <div style={{ display: 'grid', gap: '15px' }}>
                  <button onClick={prosesInputSaldo} style={{ padding: '15px', backgroundColor: colors.btnBlue, color: colors.textMain, border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>💰 Input Saldo Awal</button>
                  <button onClick={prosesPengeluaran} style={{ padding: '15px', backgroundColor: colors.btnBlue, color: colors.textMain, border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>💸 Input Pengeluaran</button>
                  <button onClick={prosesTutupKasir} style={{ padding: '15px', backgroundColor: colors.danger, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>🛑 Tutup Kasir & Cetak</button>
                  {role === 'OWNER' && (<button onClick={prosesUpdateHarga} style={{ padding: '15px', backgroundColor: colors.success, color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px' }}>🏷️ Ubah Harga Jual (Ecer)</button>)}
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