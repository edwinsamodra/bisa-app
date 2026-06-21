const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple API Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
  next();
});

// ==========================================
// 1. SISWA API
// ==========================================

// Get all siswa enriched with cumulative balance
app.get('/api/siswa', async (req, res) => {
  try {
    const siswa = await db.findAll('siswa');
    const operasional = await db.findAll('operasional');

    const enriched = siswa.map(s => {
      const studentOps = operasional.filter(op => op.siswaId === s.id);
      const totalTagihan = studentOps.reduce((sum, op) => sum + (Number(op.tagihan) || 0), 0);
      const totalDiterima = studentOps.reduce((sum, op) => sum + (Number(op.jumlahDiterima) || 0), 0);
      return {
        ...s,
        saldo: totalDiterima - totalTagihan // positive = overpaid/surplus, negative = debt/deficit
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: `Gagal memuat data siswa: ${err.message}` });
  }
});

// Create new siswa
app.post('/api/siswa', async (req, res) => {
  try {
    const data = {
      nama: req.body.nama || '',
      whatsappSiswa: req.body.whatsappSiswa || '',
      asalSekolah: req.body.asalSekolah || '',
      namaOrangTua: req.body.namaOrangTua || '',
      whatsappOrtu: req.body.whatsappOrtu || '',
      alamat: req.body.alamat || '',
      jenjangKelas: req.body.jenjangKelas || 'SD 1',
      jenisKelas: req.body.jenisKelas || 'Private',
      tarifDefault: Number(req.body.tarifDefault) || 0
    };
    const newSiswa = await db.insert('siswa', data);
    res.status(201).json(newSiswa);
  } catch (err) {
    res.status(500).json({ error: `Gagal menambah siswa: ${err.message}` });
  }
});

// Update siswa
app.put('/api/siswa/:id', async (req, res) => {
  try {
    const data = {
      nama: req.body.nama,
      whatsappSiswa: req.body.whatsappSiswa,
      asalSekolah: req.body.asalSekolah,
      namaOrangTua: req.body.namaOrangTua,
      whatsappOrtu: req.body.whatsappOrtu,
      alamat: req.body.alamat,
      jenjangKelas: req.body.jenjangKelas,
      jenisKelas: req.body.jenisKelas,
      tarifDefault: Number(req.body.tarifDefault)
    };
    const updated = await db.update('siswa', req.params.id, data);
    if (!updated) return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: `Gagal mengubah siswa: ${err.message}` });
  }
});

// Delete siswa
app.delete('/api/siswa/:id', async (req, res) => {
  try {
    const deleted = await db.remove('siswa', req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    res.json({ success: true, message: 'Siswa berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: `Gagal menghapus siswa: ${err.message}` });
  }
});


// ==========================================
// 2. GURU API
// ==========================================

// Get all guru
app.get('/api/guru', async (req, res) => {
  try {
    const guru = await db.findAll('guru');
    res.json(guru);
  } catch (err) {
    res.status(500).json({ error: `Gagal memuat data guru: ${err.message}` });
  }
});

// Create new guru
app.post('/api/guru', async (req, res) => {
  try {
    const data = {
      nama: req.body.nama || '',
      whatsapp: req.body.whatsapp || ''
    };
    const newGuru = await db.insert('guru', data);
    res.status(201).json(newGuru);
  } catch (err) {
    res.status(500).json({ error: `Gagal menambah guru: ${err.message}` });
  }
});

// Update guru
app.put('/api/guru/:id', async (req, res) => {
  try {
    const data = {
      nama: req.body.nama,
      whatsapp: req.body.whatsapp
    };
    const updated = await db.update('guru', req.params.id, data);
    if (!updated) return res.status(404).json({ error: 'Guru tidak ditemukan' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: `Gagal mengubah guru: ${err.message}` });
  }
});

// Delete guru
app.delete('/api/guru/:id', async (req, res) => {
  try {
    const deleted = await db.remove('guru', req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Guru tidak ditemukan' });
    res.json({ success: true, message: 'Guru berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: `Gagal menghapus guru: ${err.message}` });
  }
});


// ==========================================
// 3. OPERASIONAL (PERTEMUAN) API
// ==========================================

// Get all operasional logs with joined names, sorted by date descending
app.get('/api/operasional', async (req, res) => {
  try {
    const operasional = await db.findAll('operasional');
    const siswa = await db.findAll('siswa');
    const guru = await db.findAll('guru');

    const siswaMap = new Map(siswa.map(s => [s.id, s.nama]));
    const guruMap = new Map(guru.map(g => [g.id, g.nama]));

    // Group operasional by student to calculate sequential session index and running balances
    const opsByStudent = {};
    operasional.forEach(op => {
      if (!opsByStudent[op.siswaId]) {
        opsByStudent[op.siswaId] = [];
      }
      opsByStudent[op.siswaId].push(op);
    });

    const enrichedOpsMap = new Map();
    Object.keys(opsByStudent).forEach(siswaId => {
      // Sort ascending to trace chronologically
      const sorted = opsByStudent[siswaId].sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
      let runningBalance = 0;
      sorted.forEach((op, index) => {
        runningBalance += (Number(op.jumlahDiterima) || 0) - (Number(op.tagihan) || 0);
        enrichedOpsMap.set(op.id, {
          pertemuanKe: index + 1,
          saldoHinggaSesi: runningBalance,
          tercover: runningBalance >= 0
        });
      });
    });

    const enriched = operasional.map(op => {
      const stats = enrichedOpsMap.get(op.id) || { pertemuanKe: 1, saldoHinggaSesi: 0, tercover: false };
      return {
        ...op,
        siswaNama: siswaMap.get(op.siswaId) || 'Siswa Dihapus',
        guruNama: guruMap.get(op.guruId) || 'Guru Dihapus',
        pertemuanKe: stats.pertemuanKe,
        saldoHinggaSesi: stats.saldoHinggaSesi,
        tercover: stats.tercover
      };
    }).sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: `Gagal memuat data pertemuan: ${err.message}` });
  }
});

// Create new operasional record
app.post('/api/operasional', async (req, res) => {
  try {
    const data = {
      tanggal: req.body.tanggal || new Date().toISOString().split('T')[0],
      siswaId: req.body.siswaId || '',
      guruId: req.body.guruId || '',
      jenisKelas: req.body.jenisKelas || 'Private',
      statusAbsen: req.body.statusAbsen || 'Hadir',
      tagihan: Number(req.body.tagihan) || 0,
      jumlahDiterima: Number(req.body.jumlahDiterima) || 0,
      catatan: req.body.catatan || ''
    };
    const newOp = await db.insert('operasional', data);
    res.status(201).json(newOp);
  } catch (err) {
    res.status(500).json({ error: `Gagal mencatat pertemuan: ${err.message}` });
  }
});

// Update operasional record
app.put('/api/operasional/:id', async (req, res) => {
  try {
    const data = {
      tanggal: req.body.tanggal,
      siswaId: req.body.siswaId,
      guruId: req.body.guruId,
      jenisKelas: req.body.jenisKelas,
      statusAbsen: req.body.statusAbsen,
      tagihan: Number(req.body.tagihan),
      jumlahDiterima: Number(req.body.jumlahDiterima),
      catatan: req.body.catatan
    };
    const updated = await db.update('operasional', req.params.id, data);
    if (!updated) return res.status(404).json({ error: 'Data pertemuan tidak ditemukan' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: `Gagal mengubah data pertemuan: ${err.message}` });
  }
});

// Delete operasional record
app.delete('/api/operasional/:id', async (req, res) => {
  try {
    const deleted = await db.remove('operasional', req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Data pertemuan tidak ditemukan' });
    res.json({ success: true, message: 'Data pertemuan berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: `Gagal menghapus data pertemuan: ${err.message}` });
  }
});


// ==========================================
// 4. REPORT & DASHBOARD SUMMARY API
// ==========================================

// Get dashboard cards summary info
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const siswa = await db.findAll('siswa');
    const operasional = await db.findAll('operasional');

    // Total income (sum of all received cash)
    const totalPendapatan = operasional.reduce((sum, op) => sum + (Number(op.jumlahDiterima) || 0), 0);

    // Total piutang (sum of outstanding student balances)
    let totalPiutang = 0;
    siswa.forEach(s => {
      const studentOps = operasional.filter(op => op.siswaId === s.id);
      const totalTagihan = studentOps.reduce((sum, op) => sum + (Number(op.tagihan) || 0), 0);
      const totalDiterima = studentOps.reduce((sum, op) => sum + (Number(op.jumlahDiterima) || 0), 0);
      const balance = totalDiterima - totalTagihan;
      if (balance < 0) {
        totalPiutang += Math.abs(balance);
      }
    });

    // Total meetings this month (YYYY-MM prefix)
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    const totalPertemuanBulanIni = operasional.filter(op => op.tanggal.startsWith(currentMonthPrefix)).length;

    res.json({
      totalSiswa: siswa.length,
      totalPendapatan,
      totalPiutang,
      totalPertemuanBulanIni
    });
  } catch (err) {
    res.status(500).json({ error: `Gagal memuat ringkasan dashboard: ${err.message}` });
  }
});

// Get individual student ledger report for Invoice / Raport Les
app.get('/api/laporan/siswa/:siswaId', async (req, res) => {
  try {
    const { siswaId } = req.params;
    const siswa = await db.findById('siswa', siswaId);
    if (!siswa) {
      return res.status(404).json({ error: 'Siswa tidak ditemukan' });
    }

    const operasional = await db.findAll('operasional');
    const guru = await db.findAll('guru');
    const guruMap = new Map(guru.map(g => [g.id, g.nama]));

    // Filter and sort chronologically
    const studentOps = operasional
      .filter(op => op.siswaId === siswaId)
      .map(op => ({
        ...op,
        guruNama: guruMap.get(op.guruId) || 'Guru Dihapus'
      }))
      .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

    // Calculate running balance per session
    let runningBalance = 0;
    const history = studentOps.map(op => {
      runningBalance += (Number(op.jumlahDiterima) || 0) - (Number(op.tagihan) || 0);
      return {
        ...op,
        saldoSesi: runningBalance
      };
    });

    res.json({
      siswa,
      history,
      totalTagihan: studentOps.reduce((sum, op) => sum + (Number(op.tagihan) || 0), 0),
      totalDiterima: studentOps.reduce((sum, op) => sum + (Number(op.jumlahDiterima) || 0), 0),
      saldoKumulatif: runningBalance
    });
  } catch (err) {
    res.status(500).json({ error: `Gagal memuat laporan siswa: ${err.message}` });
  }
});


// ==========================================
// 5. STATIC FILES & FALLBACK
// ==========================================

// Fallback to index.html for SPA (Client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`==================================================`);
  console.log(`🚀 Server is running on port ${PORT} (accessible at 0.0.0.0)`);
  console.log(`🔗 Local URL: http://localhost:${PORT}`);
  console.log(`📁 JSON Data Directory: ./data/`);
  console.log(`==================================================`);
});
