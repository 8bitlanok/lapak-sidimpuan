# Lapak Sidimpuan

Marketplace lokal mahasiswa Padangsidimpuan.

## Stack
- HTML
- CSS
- JavaScript
- Supabase Auth / PostgreSQL / Storage
- Cloudflare Pages

## Status
Fondasi database Supabase v1 sudah dibuat. Frontend saat ini adalah kerangka mobile-first untuk tahap integrasi Auth, listing, pencarian, upload foto, dan moderasi admin.

## Struktur produk
- Barang: elektronik, furniture, buku & perlengkapan kuliah, pakaian, motor, lainnya
- Jasa: design, video editing, les privat, pengetikan & dokumen, terjemahan, lainnya
- Semua listing baru berstatus pending dan perlu persetujuan admin sebelum tampil publik.

## Keamanan
- Row Level Security (RLS) aktif di database.
- Foto listing menggunakan private Supabase Storage.
- Status published tidak dapat ditetapkan sendiri oleh user biasa.

## Deployment
Target hosting: Cloudflare Pages.
