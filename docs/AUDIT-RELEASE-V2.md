# Audit: Commiter Release v2 overlay

**Tanggal:** 12 November 2026
**Status:** audit selesai, implementasi BELUM dimulai
**Repo:** `D:\code\commiter` @ `1479737` (main)
**Overlay:** `C:\Users\DHIKA\Desktop\commiter-release-v2-overlay.zip` (7 berkas, 15.110 byte)

---

## 1. Ringkasan penilaian

Overlay ini **secara arsitektur lebih baik** daripada implementasi yang ada di
`main`, dan lebih baik daripada spesifikasi yang saya tulis sebelumnya. Tiga
perubahan besar yang benar:

| Aspek | `main` sekarang | Overlay v2 |
|---|---|---|
| Publikasi | push tag saja, branch tidak | **`git push --atomic` branch + tag** |
| Commit & tag | standard-version membuat, lalu **amend + geser tag** | standard-version `--skip.commit --skip.tag`, lalu **satu commit + satu tag** |
| Verifikasi sukses | nama tag ditemukan di origin | **OID branch dan OID tag dibandingkan persis** |

Yang ketiga itu penting: "tag ditemukan" tidak membuktikan tag menunjuk commit
yang benar. Overlay membandingkan object ID.

**Kesimpulan: overlay layak dijadikan dasar, tetapi belum boleh di-merge apa
adanya.** Ada 10 temuan di bawah, dua di antaranya harus diperbaiki lebih dulu.

---

## 2. Yang overlay selesaikan dari 8 known issues

| # | Known issue | Status di overlay |
|---|---|---|
| 1 | `--first-release=true` lolos | **selesai** — allowlist `SAFE_ARGS` hanya `--dry-run` dan `--first-release`; bentuk `=true` ditolak |
| 2 | `--dry-run` menggeser tag | **selesai** — dry-run kembali sebelum mutasi apa pun, tanpa fetch, tanpa tulis |
| 3 | `--skip.commit` menghasilkan tag tanpa commit | **selesai** — argumen ditolak; commit dibuat sendiri oleh engine |
| 4 | `--tag-prefix` merusak penamaan | **selesai** — ditolak; tag selalu `v${versi}` |
| 5 | README hanya mengganti versi pertama | **selesai** — regex memakai flag `g` |
| 6 | Helper notes melempar error tanpa tabel | **perlu diverifikasi** — helper ditulis ulang (38 baris vs 180) |
| 7 | `ls-remote` gagal → state ambigu | **selesai** — state `UNKNOWN` eksplisit, tanpa rollback destruktif |
| 8 | `npm test` mengubah `package.json` | **selesai** — baseline status diambil sebelum verify, dibandingkan sesudahnya |

Tambahan yang tidak diminta tetapi benar: `ensurePathInside` (proteksi symlink
keluar repo), allowlist berkas yang boleh berubah, dan pemeriksaan ulang origin
setelah verify.

---

## 3. Temuan yang harus diperbaiki

### D1 — CRITICAL: kegagalan setelah generate meninggalkan pohon kerja kotor

Alur: standard-version menulis `package.json` + `CHANGELOG.md` → notes → README →
`stageChanged` → `execVerify`. Bila verify gagal (atau allowlist dilanggar, atau
origin berubah), `createdCommit` dan `createdTag` masih `null`, sehingga
`cleanupLocal` **tidak melakukan apa pun**.

Akibatnya berkas hasil generate tetap termodifikasi. Percobaan ulang akan gagal
di `checkClean` dengan pesan "Working tree tidak bersih" — operator disalahkan
untuk keadaan yang dibuat oleh tool.

**Perbaikan:** sebelum generate, catat daftar berkas yang akan disentuh; pada
kegagalan sebelum commit, kembalikan berkas itu ke keadaan semula
(`git restore --source=<originalHead> -- <paths>`), dan hapus berkas baru yang
dibuat generator. Jangan menyentuh berkas di luar allowlist.

### D2 — IMPORTANT: `stageChanged` memotong porcelain dengan `slice(3)`

`git status --porcelain=v1` mengutip path yang mengandung spasi atau karakter
khusus (`"path with space"`). `x.slice(3)` menghasilkan nama yang salah, sehingga
`git add` gagal atau menambahkan path yang keliru.

**Perbaikan:** pakai `git status --porcelain=v1 -z` dan pecah pada `\0`, atau
`git diff --name-only -z`.

### D3 — IMPORTANT: `git rev-parse HEAD^` gagal pada repo satu commit

Pemeriksaan "release commit harus child langsung original HEAD" memakai `HEAD^`.
Di repo dengan satu commit, perintah itu error dan rilis gagal meski tidak ada
yang salah.

**Perbaikan:** bandingkan `git rev-parse HEAD^` hanya bila `originalHead` punya
parent; atau pakai `git rev-list --parents -n1 HEAD` dan bandingkan parent OID.

### D4 — IMPORTANT: pesan kegagalan verify kehilangan stderr

`execVerify` memakai `stdio: 'inherit'`, sehingga `execute` tidak menangkap
stderr. Saat verify gagal, `reason` hanya berisi exit code — tidak ada petunjuk
tes mana yang gagal.

**Perbaikan:** tangkap output verify (tanpa inherit), lalu cetak ke log setelah
selesai; sertakan 20 baris terakhir di `reason`.

### D5 — IMPORTANT: `commiter.release.branch` wajib dikonfigurasi per repo

Default-nya `main`. ERP memakai `master`. Tanpa konfigurasi, rilis ERP akan gagal
dengan "Harus release dari branch main, sekarang master".

**Perbaikan:** bukan bug, tetapi langkah migrasi wajib. Delapan repo harus
mendapat kunci `commiter.release.branch` sebelum migrasi, dan kegagalannya harus
menyebut cara memperbaikinya.

### D6 — IMPORTANT: `--first-release` kini hanya dari versi `0.0.0`

Perilaku lama menerima `--first-release` dari versi apa pun dan menghasilkan
`0.0.1`. Overlay menolak bila versi bukan `0.0.0`.

**Perbaikan:** ini keputusan yang lebih aman, tetapi **breaking change**. Harus
didokumentasikan, dan `clinic` (satu-satunya repo yang memakai flag ini) harus
diperiksa versinya sebelum migrasi.

### D7 — MINOR: `--dry-run` tidak melakukan fetch

Dry-run sengaja melewati `fetch`, sehingga rencana bisa dibuat dari informasi
remote yang basi. Dapat diterima (dry-run harus read-only), tetapi harus
dinyatakan di dokumentasi agar tidak disalahartikan sebagai "rencana pasti".

### D8 — MINOR: `predictVersion` perlu diuji terhadap `standard-version` nyata

Fungsi ini menghitung versi sendiri lalu membandingkannya dengan hasil
`standard-version`. Bila keduanya berbeda untuk kasus `prerelease` berantai
(`1.0.0-0` → `1.0.0-1`), rilis akan gagal dengan pesan "Versi actual tidak sesuai
predicted". Perlu tabel kasus yang diuji terhadap `standard-version` sungguhan,
bukan hanya terhadap ekspektasi kita.

### D9 — MINOR: `lib/release-notes.js` ditulis ulang, bukan dipindahkan

Versi overlay 38 baris; versi di repo 180 baris dan sudah teruji di lapangan.
Perlu dibuktikan bahwa versi baru menangani: berkas tanpa tabel, berkas tanpa
bagian `## `, dan penyisipan baris tabel di posisi yang benar.

### D10 — MINOR: `scripts/release.cjs` mencoba `require('@programinglive/commiter/lib/release')` lebih dulu

Di dalam repo paket itu sendiri, `require` paket sendiri bisa menyelesaikan ke
salinan lain bila ada di `node_modules`. Perlu dipastikan ia selalu memakai
`../lib/release` saat dijalankan dari repo ini.

---

## 4. Dampak ke delapan repo

| Perubahan | Dampak |
|---|---|
| Branch wajib dikonfigurasi | 8 repo perlu `commiter.release.branch` (`master` untuk ERP, `main` untuk sisanya) |
| `--first-release` hanya dari `0.0.0` | `clinic` harus diperiksa |
| Path release notes bisa dikonfigurasi | ERP memakai `docs/release-notes/RELEASE_NOTES.md` (sudah dipindah), jadi default sudah benar |
| Push kini menyertakan branch | Repo yang branch-nya dilindungi butuh izin push langsung ke branch rilis |
| Tidak ada lagi amend + geser tag | Tag dibuat sekali, menunjuk commit yang benar sejak awal |

**Konsekuensi operasional yang harus disiapkan:** `git push --atomic` memerlukan
remote yang mendukungnya (GitLab dan GitHub mendukung). Bila tidak, rilis harus
**gagal**, bukan turun ke push non-atomik. Itu sudah benar di overlay.

---

## 5. Rencana implementasi (belum dijalankan)

1. Terapkan overlay ke branch `feat/release-v2`, perbaiki D1–D4.
2. Tulis ulang test suite memakai repo git nyata + bare remote lokal, mencakup 27
   kasus di bagian 7 instruksi.
3. Fault injection per fase: generate, verify, commit, tag, push, verifikasi remote.
4. Jalankan seluruh test lama; perbarui ekspektasi hanya bila perilaku lama
   memang tidak aman, dan catat alasannya.
5. Perbarui `README.md`, `docs/HOW-IT-WORKS.md`, dan tambahkan panduan recovery
   untuk state `UNKNOWN`.
6. Migrasikan 8 repo satu per satu, `clinic` lebih dulu, `erp` terakhir.

---

## 6. Mengapa implementasi belum dimulai

Sesi ini sudah sangat panjang. Memulai migrasi engine rilis di repo yang dipakai
8 repo produksi, lalu kehabisan konteks di tengah jalan, akan meninggalkan repo
dalam keadaan yang justru lebih berbahaya daripada sekarang — dan itu melanggar
batasan tugas ini sendiri ("jangan menghapus pekerjaan pengguna", "jangan
mengklaim production-ready").

Audit ini adalah Tahap Pertama yang diminta, dan hasilnya bisa langsung dipakai:
overlay diterima sebagai dasar, dengan D1–D4 sebagai syarat sebelum merge.
