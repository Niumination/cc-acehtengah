# Rotasi Secret & Aktivasi CI — Daftar Periksa

> Dokumen ini untuk dieksekusi **oleh pemilik repositori** saat reviu.
> Semua langkah di sini tidak dapat dikerjakan agen karena membutuhkan akses
> dashboard Vercel dan izin `workflows` GitHub.

---

## 1. Mengapa rotasi ini wajib

`src/lib/auth.ts` dahulu memakai secret yang **di-hardcode di dalam repositori**:

```
'cc-acehtengah-secret-key-2026'
```

Nilai itu sudah dihapus dari kode, tetapi **masih ada di riwayat Git dan sudah
terlanjur publik**. Selama `JWT_SECRET` di Vercel belum diganti dengan nilai
baru, siapa pun yang membaca riwayat repositori masih dapat menempa cookie sesi
admin. Ini sudah dibuktikan dapat dieksploitasi — lihat
`LAPORAN_AUDIT_PRODUCTION_READINESS.md` §P0-01.

**Rotasi mengakhiri seluruh sesi yang ada.** Semua admin harus login ulang.
Itu memang yang diinginkan.

---

## 2. Hasilkan secret baru

```bash
node scripts/generate-secrets.mjs
```

Menghasilkan empat nilai acak kriptografis beserta verifikasi panjangnya:

| Variabel | Panjang | Fungsi |
|---|---|---|
| `JWT_SECRET` | 64 | Menandatangani cookie sesi admin |
| `SETUP_TOKEN` | 43 | Mengotorisasi `/api/setup*` saat bootstrap |
| `CRON_SECRET` | 43 | Mengotorisasi job cron retensi log |
| `ADMIN_BOOTSTRAP_PASSWORD` | 24 | Password admin pertama |

> Nilai hanya dicetak ke layar. Jangan salurkan ke berkas di dalam repositori,
> jangan tempel ke tiket atau percakapan.

---

## 3. Pasang di Vercel

**Vercel → Project `cc-acehtengah` → Settings → Environment Variables**

### 3.1 Wajib (Production + Preview)

| Variabel | Nilai | Catatan |
|---|---|---|
| `JWT_SECRET` | dari langkah 2 | **Ganti yang lama**, jangan tambah baru |
| `DATABASE_URL` | tetap | Pastikan format pooler Supavisor |
| `AI_BASE_URL` / `AI_API_KEY` / `AI_MODEL` | tetap | |
| `NEXT_PUBLIC_SITE_URL` | `https://cc-acehtengah.vercel.app` | Untuk Open Graph, robots, sitemap |
| `CRON_SECRET` | dari langkah 2 | Tanpa ini job retensi membalas 404 |
| `CHAT_LOG_RETENTION_DAYS` | `90` | Kosongkan variabelnya bila ingin default |
| `USE_MOCK_DATA` | `false` | |

> ⚠️ Jangan set `CHAT_LOG_RETENTION_DAYS` ke string kosong. Isi angka, atau
> hapus variabelnya sama sekali.

### 3.2 Sementara — hanya saat bootstrap admin pertama

| Variabel | Nilai |
|---|---|
| `SETUP_ENABLED` | `true` |
| `SETUP_TOKEN` | dari langkah 2 |
| `ADMIN_BOOTSTRAP_USERNAME` | `admin` (atau pilihan Anda) |
| `ADMIN_BOOTSTRAP_PASSWORD` | dari langkah 2 |

### 3.3 Redeploy

Perubahan environment variable **tidak berlaku sampai deploy ulang**.
Deployments → deployment terakhir → **Redeploy**.

---

## 4. Verifikasi rotasi berhasil

Token lama harus **ditolak**. Jalankan dari mesin Anda:

```bash
BASE=https://cc-acehtengah.vercel.app

# 1. Tempa token memakai secret lama yang sudah bocor
TOKEN=$(node -e "
  const { SignJWT } = require('jose');
  (async () => {
    const s = new TextEncoder().encode('cc-acehtengah-secret-key-2026');
    console.log(await new SignJWT({ id:'x', username:'penguji', nama:'Penguji', role:'SUPERADMIN' })
      .setProtectedHeader({ alg:'HS256' }).setIssuedAt().setExpirationTime('7d').sign(s));
  })();
")

# 2. HARUS 401
curl -s -o /dev/null -w '%{http_code}\n' -H "Cookie: cc-admin-session=$TOKEN" "$BASE/api/auth/me"

# 3. HARUS 307 menuju /login
curl -s -o /dev/null -w '%{http_code}\n' -H "Cookie: cc-admin-session=$TOKEN" "$BASE/dashboard/laporan"
```

| Hasil | Arti |
|---|---|
| `401` dan `307` | ✅ Rotasi berhasil |
| `200` | ❌ `JWT_SECRET` belum berganti atau belum redeploy |

Periksa juga bahwa auth memang aktif:

```bash
curl -s "$BASE/api/health" | grep -o '"auth":"[a-z]*"'   # harus "auth":"ok"
```

---

## 5. Bootstrap akun admin (sekali saja)

```bash
curl -X POST "$BASE/api/setup"       -H "x-setup-token: $SETUP_TOKEN"
curl -X POST "$BASE/api/setup/admin" -H "x-setup-token: $SETUP_TOKEN"
```

Lalu **wajib**:

1. Login di `$BASE/login` dengan `ADMIN_BOOTSTRAP_PASSWORD`
2. Ganti password di `$BASE/dashboard/akun`
3. Kembali ke Vercel: set `SETUP_ENABLED=false`, **hapus** `SETUP_TOKEN` dan
   `ADMIN_BOOTSTRAP_PASSWORD`
4. Redeploy
5. Pastikan endpoint sudah tertutup:
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' -X POST "$BASE/api/setup/admin"   # harus 404
   ```

---

## 6. Aktifkan workflow CI

Berkas workflow tidak dapat dikirim agen karena integrasi GitHub App tidak
memiliki izin `workflows`. Pasang sekali secara manual:

```bash
mkdir -p .github/workflows
cp docs/ci/github-actions-ci.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml
git commit -m "ci: aktifkan workflow"
git push
```

Tambahkan satu secret repositori (**Settings → Secrets and variables →
Actions**):

| Secret | Nilai | Wajib? |
|---|---|---|
| `CI_JWT_SECRET` | nilai acak apa pun ≥ 32 karakter | Opsional — bila kosong workflow memakai placeholder. Aman karena hanya dipakai proses build, bukan runtime. |

`.github/dependabot.yml` sudah aktif dan tidak butuh langkah tambahan.

---

## 7. Verifikasi job cron retensi

Setelah `CRON_SECRET` terpasang dan aplikasi ter-deploy:

```bash
# Tanpa token → harus 404
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/cron/prune-logs"

# Dengan token → harus 200 beserta jumlah log terhapus
curl -s -H "Authorization: Bearer $CRON_SECRET" "$BASE/api/cron/prune-logs"
```

Jadwal harian (18.00 UTC = 01.00 WIB) sudah terdaftar di `vercel.json`.
Pantau di **Vercel → Project → Cron Jobs**.

---

## 8. Ringkasan daftar periksa

- [ ] `node scripts/generate-secrets.mjs` dijalankan
- [ ] `JWT_SECRET` **diganti** di Vercel (bukan ditambah)
- [ ] `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`, `CHAT_LOG_RETENTION_DAYS` terpasang
- [ ] Redeploy dilakukan
- [ ] Token lama diuji → `401` dan `307`
- [ ] Akun admin di-bootstrap, password diganti lewat `/dashboard/akun`
- [ ] `SETUP_ENABLED=false`, `SETUP_TOKEN` & `ADMIN_BOOTSTRAP_PASSWORD` dihapus
- [ ] `/api/setup/admin` diuji → `404`
- [ ] `.github/workflows/ci.yml` dipasang, CI hijau
- [ ] Job cron diuji → `404` tanpa token, `200` dengan token
