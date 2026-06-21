/**
 * BISA Worker Backend
 * Serves API routes and integrates with BISA_KV or in-memory fallback.
 */

// Fallback in-memory database if BISA_KV namespace is not bound
let memoryDb = {
  siswa: [
    {
      "id": "s1",
      "nama": "Budi Santoso",
      "whatsappSiswa": "081234567890",
      "asalSekolah": "SDN 1 Merdeka",
      "namaOrangTua": "Agus Santoso",
      "whatsappOrtu": "081298765432",
      "alamat": "Jl. Mawar No. 12, Jakarta",
      "jenjangKelas": "SD 4",
      "jenisKelas": "Private",
      "tarifDefault": 150000,
      "createdAt": "2026-06-15T08:00:00.000Z"
    }
  ],
  guru: [
    {
      "id": "g1",
      "nama": "Kak Sarah",
      "whatsapp": "085711223344",
      "createdAt": "2026-06-15T08:00:00.000Z"
    }
  ],
  operasional: [
    {
      "id": "op1",
      "tanggal": "2026-06-16",
      "siswaId": "s1",
      "guruId": "g1",
      "jenisKelas": "Private",
      "statusAbsen": "Hadir",
      "tagihan": 150000,
      "jumlahDiterima": 0,
      "catatan": "Pertemuan pertama Budi. Belajar penjumlahan pecahan dasar.",
      "createdAt": "2026-06-16T10:00:00.000Z"
    }
  ]
};

// Storage helper functions
async function getCollection(env, collection) {
  if (env.BISA_KV) {
    const data = await env.BISA_KV.get(collection);
    return data ? JSON.parse(data) : [];
  }
  return memoryDb[collection] || [];
}

async function saveCollection(env, collection, data) {
  if (env.BISA_KV) {
    await env.BISA_KV.put(collection, JSON.stringify(data));
  } else {
    memoryDb[collection] = data;
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS configurations
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ----------------------------------------------------
      // API: /api/siswa
      // ----------------------------------------------------
      if (path === "/api/siswa") {
        if (method === "GET") {
          const siswa = await getCollection(env, "siswa");
          const operasional = await getCollection(env, "operasional");

          const enriched = siswa.map(s => {
            const studentOps = operasional.filter(op => op.siswaId === s.id);
            const totalTagihan = studentOps.reduce((sum, op) => sum + (Number(op.tagihan) || 0), 0);
            const totalDiterima = studentOps.reduce((sum, op) => sum + (Number(op.jumlahDiterima) || 0), 0);
            return {
              ...s,
              saldo: totalDiterima - totalTagihan
            };
          });
          return new Response(JSON.stringify(enriched), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        if (method === "POST") {
          const body = await request.json();
          const siswa = await getCollection(env, "siswa");
          const newSiswa = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
            createdAt: new Date().toISOString(),
            nama: body.nama || '',
            whatsappSiswa: body.whatsappSiswa || '',
            asalSekolah: body.asalSekolah || '',
            namaOrangTua: body.namaOrangTua || '',
            whatsappOrtu: body.whatsappOrtu || '',
            alamat: body.alamat || '',
            jenjangKelas: body.jenjangKelas || 'SD 1',
            jenisKelas: body.jenisKelas || 'Private',
            tarifDefault: Number(body.tarifDefault) || 0
          };
          siswa.push(newSiswa);
          await saveCollection(env, "siswa", siswa);
          return new Response(JSON.stringify(newSiswa), {
            status: 201,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // GET/PUT/DELETE /api/siswa/:id
      if (path.startsWith("/api/siswa/")) {
        const id = path.split("/").pop();
        const siswa = await getCollection(env, "siswa");

        if (method === "PUT") {
          const body = await request.json();
          const index = siswa.findIndex(s => s.id === id);
          if (index === -1) {
            return new Response(JSON.stringify({ error: "Siswa tidak ditemukan" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          siswa[index] = {
            ...siswa[index],
            nama: body.nama,
            whatsappSiswa: body.whatsappSiswa,
            asalSekolah: body.asalSekolah,
            namaOrangTua: body.namaOrangTua,
            whatsappOrtu: body.whatsappOrtu,
            alamat: body.alamat,
            jenjangKelas: body.jenjangKelas,
            jenisKelas: body.jenisKelas,
            tarifDefault: Number(body.tarifDefault),
            updatedAt: new Date().toISOString()
          };
          await saveCollection(env, "siswa", siswa);
          return new Response(JSON.stringify(siswa[index]), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        if (method === "DELETE") {
          const filtered = siswa.filter(s => s.id !== id);
          if (siswa.length === filtered.length) {
            return new Response(JSON.stringify({ error: "Siswa tidak ditemukan" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          await saveCollection(env, "siswa", filtered);
          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // ----------------------------------------------------
      // API: /api/guru
      // ----------------------------------------------------
      if (path === "/api/guru") {
        if (method === "GET") {
          const guru = await getCollection(env, "guru");
          return new Response(JSON.stringify(guru), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
        
        if (method === "POST") {
          const body = await request.json();
          const guru = await getCollection(env, "guru");
          const newGuru = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
            createdAt: new Date().toISOString(),
            nama: body.nama || '',
            whatsapp: body.whatsapp || ''
          };
          guru.push(newGuru);
          await saveCollection(env, "guru", guru);
          return new Response(JSON.stringify(newGuru), {
            status: 201,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      if (path.startsWith("/api/guru/")) {
        const id = path.split("/").pop();
        const guru = await getCollection(env, "guru");

        if (method === "PUT") {
          const body = await request.json();
          const index = guru.findIndex(g => g.id === id);
          if (index === -1) {
            return new Response(JSON.stringify({ error: "Guru tidak ditemukan" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          guru[index] = {
            ...guru[index],
            nama: body.nama,
            whatsapp: body.whatsapp,
            updatedAt: new Date().toISOString()
          };
          await saveCollection(env, "guru", guru);
          return new Response(JSON.stringify(guru[index]), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        if (method === "DELETE") {
          const filtered = guru.filter(g => g.id !== id);
          if (guru.length === filtered.length) {
            return new Response(JSON.stringify({ error: "Guru tidak ditemukan" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          await saveCollection(env, "guru", filtered);
          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // ----------------------------------------------------
      // API: /api/operasional
      // ----------------------------------------------------
      if (path === "/api/operasional") {
        if (method === "GET") {
          const operasional = await getCollection(env, "operasional");
          const siswa = await getCollection(env, "siswa");
          const guru = await getCollection(env, "guru");

          const siswaMap = new Map(siswa.map(s => [s.id, s.nama]));
          const guruMap = new Map(guru.map(g => [g.id, g.nama]));

          const opsByStudent = {};
          operasional.forEach(op => {
            if (!opsByStudent[op.siswaId]) {
              opsByStudent[op.siswaId] = [];
            }
            opsByStudent[op.siswaId].push(op);
          });

          const enrichedOpsMap = new Map();
          Object.keys(opsByStudent).forEach(siswaId => {
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

          return new Response(JSON.stringify(enriched), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        if (method === "POST") {
          const body = await request.json();
          const operasional = await getCollection(env, "operasional");
          const newOp = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
            createdAt: new Date().toISOString(),
            tanggal: body.tanggal || new Date().toISOString().split('T')[0],
            siswaId: body.siswaId || '',
            guruId: body.guruId || '',
            jenisKelas: body.jenisKelas || 'Private',
            statusAbsen: body.statusAbsen || 'Hadir',
            tagihan: Number(body.tagihan) || 0,
            jumlahDiterima: Number(body.jumlahDiterima) || 0,
            catatan: body.catatan || ''
          };
          operasional.push(newOp);
          await saveCollection(env, "operasional", operasional);
          return new Response(JSON.stringify(newOp), {
            status: 201,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      if (path.startsWith("/api/operasional/")) {
        const id = path.split("/").pop();
        const operasional = await getCollection(env, "operasional");

        if (method === "PUT") {
          const body = await request.json();
          const index = operasional.findIndex(op => op.id === id);
          if (index === -1) {
            return new Response(JSON.stringify({ error: "Sesi tidak ditemukan" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          operasional[index] = {
            ...operasional[index],
            tanggal: body.tanggal,
            siswaId: body.siswaId,
            guruId: body.guruId,
            jenisKelas: body.jenisKelas,
            statusAbsen: body.statusAbsen,
            tagihan: Number(body.tagihan),
            jumlahDiterima: Number(body.jumlahDiterima),
            catatan: body.catatan,
            updatedAt: new Date().toISOString()
          };
          await saveCollection(env, "operasional", operasional);
          return new Response(JSON.stringify(operasional[index]), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        if (method === "DELETE") {
          const filtered = operasional.filter(op => op.id !== id);
          if (operasional.length === filtered.length) {
            return new Response(JSON.stringify({ error: "Sesi tidak ditemukan" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...corsHeaders }
            });
          }
          await saveCollection(env, "operasional", filtered);
          return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }
      }

      // ----------------------------------------------------
      // API: /api/dashboard/summary
      // ----------------------------------------------------
      if (path === "/api/dashboard/summary" && method === "GET") {
        const siswa = await getCollection(env, "siswa");
        const operasional = await getCollection(env, "operasional");

        const totalPendapatan = operasional.reduce((sum, op) => sum + (Number(op.jumlahDiterima) || 0), 0);

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

        const currentMonthPrefix = new Date().toISOString().substring(0, 7);
        const totalPertemuanBulanIni = operasional.filter(op => op.tanggal.startsWith(currentMonthPrefix)).length;

        return new Response(JSON.stringify({
          totalSiswa: siswa.length,
          totalPendapatan,
          totalPiutang,
          totalPertemuanBulanIni
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // ----------------------------------------------------
      // API: /api/laporan/siswa/:siswaId
      // ----------------------------------------------------
      if (path.startsWith("/api/laporan/siswa/") && method === "GET") {
        const siswaId = path.split("/").pop();
        const siswaList = await getCollection(env, "siswa");
        const siswa = siswaList.find(s => s.id === siswaId);
        if (!siswa) {
          return new Response(JSON.stringify({ error: "Siswa tidak ditemukan" }), {
            status: 404,
            headers: { "Content-Type": "application/json", ...corsHeaders }
          });
        }

        const operasional = await getCollection(env, "operasional");
        const guru = await getCollection(env, "guru");
        const guruMap = new Map(guru.map(g => [g.id, g.nama]));

        const studentOps = operasional
          .filter(op => op.siswaId === siswaId)
          .map(op => ({
            ...op,
            guruNama: guruMap.get(op.guruId) || 'Guru Dihapus'
          }))
          .sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));

        let runningBalance = 0;
        const history = studentOps.map(op => {
          runningBalance += (Number(op.jumlahDiterima) || 0) - (Number(op.tagihan) || 0);
          return {
            ...op,
            saldoSesi: runningBalance
          };
        });

        return new Response(JSON.stringify({
          siswa,
          history,
          totalTagihan: studentOps.reduce((sum, op) => sum + (Number(op.tagihan) || 0), 0),
          totalDiterima: studentOps.reduce((sum, op) => sum + (Number(op.jumlahDiterima) || 0), 0),
          saldoKumulatif: runningBalance
        }), {
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // Default fallback if not an API route (e.g. assets serving fallback)
      return new Response(JSON.stringify({ error: "Route not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
  }
};
