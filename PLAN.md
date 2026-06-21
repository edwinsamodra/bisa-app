Aplikasi Tracking Bimbel
Purpose: Untuk melakukan operational input data tracking
- Tracking Siswa
- Tracking Absensi
- Tracking Pembayaran dengan tempo waktu yang berbeda. e.g. ada yang harian, ada yang mingguan, ada yang langsung satu bulan
- Tracking Keuangan yang masuk
- Generate Invoice.

Data Column
- Tanggal (date input)
- Nama Siswa (text input)
- Asal Sekolah (text input)
- Jenjang/Kelas (dropdown data: Calistung; SD 1 - SD 6; SMP 7 - SMP 9; SMA 10 - SMA 12)
- Jenis Kelas (dropdwon data: Private | Reguler)
- Status Bayar (dropdown data: Lunas, Belum Bayar)
- Tagihan (number input)
- Jumlah Diterima (number input)
- Kelebihan/Kekurangan
- Kontak Ortu (text input) -> bukan termasuk pada data operasional. tapi lebih ke data siswa.
- Status Absen (dropdown data: Hadir, Izin, Bolos)

- Catatan untuk siswa per pertemuan


Problems:
- Kebanyakan Lesnya Private. Tidak tentu dalam hal pembayaran dan jumlah yang diterima, ada yang pada saat les tidak langsung bayar, ada yang dirangkap pada waktu-waktu yang acak (misal: ada yang mingguan, ada yang langsung satu bulan). padahal seharusnya per pertemuan actual itu ada uang masuk
- Reguler itu per semester. tapi actualnya, ternyata mereka bayarnya per bulan. hal tersebut membuat bingung pada saat penagihan, kurang berapa.
- maka per pertemuan per siswa perlu ada column yang namanya : `Tagihan` & `Jumlah Diterima`.
- Maka, akan muncul column baru: `Kelebihan/Kekurangan` . Gunakan tanda `+` jika kelebihan, dan gunakan tanda `-` untuk kekurangan.
- Remember: per siswa, per pertemuan.

Metode Input data:
- per siswa, per pertemuan, satu satu. seperti input pada spreadsheet row per row.

**Generate invoice document seperti raport les.**
misalkan, total pertemuan les pada suatu siswa terdapat 20 pertemuan. maka akan ditulis 20 rows. kemudian jika pembayaran dilakukan siswa pada pertemuan yang acak. misal 1-5 dibayar ke 6. kemudian 6 - 15 dibayar ke 15. dan 16 dibayar 16, 17 - 20 dibayar 17. **Itu memungkinkan**. tulisakan saja untuk tracking pembayaran tersebut.

Note
Private les : dihitung per pertemuan
Regular les : dihitung per semester
jangan ada authentication & authorization


**Secara table**
- Tabel Siswa
	- Nama
	- WhatsApp Siswa
	- Asal Sekolah
	- Nama Orang Tua
	- WhatsApp Ortu
	- Alamat
	- Jenjang/Kelas

- Tabel Guru
	- Nama
	- WhatsApp

- Tabel Data Operational : (sebut saja namanya bebas yang merepresentasikan)
	- Tanggal (date input)
	- Data siswa (relationship ke table siswa)
	- Data guru (relationship ke table guru)
	- Jenis Kelas (dropdwon data: Private | Reguler)
	- Status Bayar (dropdown data: Lunas, Belum Bayar)
	- Tagihan (number input)
	- Jumlah Diterima (number input)
	- Kelebihan/Kekurangan
	- Status Absen (dropdown data: Hadir, Izin, Bolos)

*urutkan lagi secara table agar lebih rapi*


Secara view/pages
- Dashboard
- management siswa (create, read all, read detail, edit, delete)
- management guru (create, read all, read detail, edit, delete)
- management operasional pertemuan bimbel (create, read all, read detail, edit, delete)
- summary/dashbaord dari pemasukan
