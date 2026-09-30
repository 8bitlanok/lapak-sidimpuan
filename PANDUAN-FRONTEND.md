# Panduan Frontend Lapak Sidimpuan

Dokumen ini adalah peta sederhana agar kamu bisa mengedit website sendiri.

## File utama
- `index.html` = kerangka halaman, modal login, modal detail, dan navigasi bawah.
- `style.css` = warna, ukuran, jarak, kartu, tombol, visual Home, dan responsive HP.
- `app.js` = logika Home, Jelajah, Auth, Seller, Favorites, Supabase, Storage, dan WhatsApp.
- `admin.html`, `admin.css`, `admin.js` = panel admin.
- Supabase = database, Auth, Storage, dan aturan keamanan.

## Mengubah warna
Buka bagian `:root` di `style.css`. Ubah `--accent` untuk mengganti warna hijau utama.

## Mengubah Home
Di `app.js`, cari `function home(){`. HTML di dalam fungsi tersebut adalah isi halaman depan.

## Mengubah ikon kategori
Cari:
```js
const icons=["💻","🪑","📚","👕","🏍️","📦","🎨","🎬","📖"];
```
Urutannya mengikuti kategori yang ditampilkan.

## Mengubah visual Home
Di `style.css` cari `.hero-visual`, `.visual-main`, dan `.visual-side`. Visual sekarang dibuat dengan CSS + emoji agar ringan dan tidak bergantung URL gambar pihak ketiga.

## Aturan foto listing
Di `submitListing()`:
- Barang biasa: minimal 3 foto.
- Motor: minimal 4 foto.
- Jasa: minimal 1 foto.
- Maksimal: 6 foto.
- Maksimal ukuran: 5 MB/foto.

Aturan publish juga diperiksa oleh database Supabase, jadi jangan hanya mengubah frontend.

## Aturan penting
1. Jangan masukkan service-role key Supabase ke frontend.
2. Jangan menghapus RLS/policy Supabase.
3. Jangan mengubah nama tabel/kolom sembarangan.
4. Setelah perubahan, cek Home -> Daftar/Masuk -> Jelajah -> listing -> favorit -> Jual.
5. Perubahan visual biasanya cukup di `style.css`.
6. Perubahan alur/data biasanya menyentuh `app.js` dan mungkin database.

## Cara membaca kode
1. Cari nama halaman, misalnya `home()`.
2. Lihat HTML yang dibuat fungsi itu.
3. Cari fungsi `bind...` untuk tombol/event.
4. Ikuti fungsi data seperti `getListings()`.
5. Baru lihat Supabase jika perubahan menyentuh database.

Tidak perlu memahami semua file sekaligus. Manusia sudah cukup menderita dengan pajak dan formulir; kode tidak perlu ikut-ikutan.
