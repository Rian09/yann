# BOT WA YONIF TP 953 / HARIMAU RAWA

## Fitur
- Pesan sambutan otomatis
- Menu list yang bisa ditekan
- 6 layanan masyarakat
- Perintah MENU / START
- Fallback angka 1-6
- Pengumpulan pesan layanan
- Nomor tiket otomatis
- Penyimpanan laporan ke data/laporan.json
- Notifikasi admin (setelah nomor admin dikonfigurasi)

## Instalasi

1. Install Node.js 20 atau lebih baru.
2. Buka terminal di folder bot.
3. Jalankan:

   npm install

4. Buka `index.js`.
5. Ganti:

   const ADMIN_NUMBER = "628XXXXXXXXXX";

   dengan nomor WhatsApp admin dalam format internasional tanpa tanda +.

6. Jalankan:

   npm start

7. QR akan muncul di terminal. Scan menggunakan WhatsApp > Perangkat tertaut.

## Catatan
Folder `auth_info` akan dibuat otomatis dan menyimpan sesi login.
Folder `data` dan file `laporan.json` juga dibuat otomatis.

Menu list WhatsApp bergantung pada dukungan klien/versi library. Jika klien tidak menampilkan list, bot tetap menyediakan pilihan angka 1-6 sebagai fallback.
