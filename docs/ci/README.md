# Continuous Integration

`github-actions-ci.yml` adalah workflow CI siap pakai untuk repositori ini.

## Cara memasang

Salin ke lokasi yang dibaca GitHub Actions, lalu commit:

```bash
mkdir -p .github/workflows
cp docs/ci/github-actions-ci.yml .github/workflows/ci.yml
git add .github/workflows/ci.yml && git commit -m "ci: aktifkan workflow" && git push
```

> File ini tidak diletakkan langsung di `.github/workflows/` karena integrasi
> GitHub App yang dipakai untuk mengirim perubahan ini tidak memiliki izin
> `workflows`. Pemasangan cukup dilakukan sekali oleh pemilik repositori.

## Yang dijalankan

| Tahap | Perintah | Blocking |
|---|---|:---:|
| Typecheck | `npm run typecheck` | ✅ |
| Unit test | `npm test` | ✅ |
| Build | `npm run build` | ✅ |
| Lint | `npm run lint` | ❌ sementara |
| Audit | `npm audit --audit-level=high` | ❌ sementara |

Lint dan audit masih `continue-on-error` karena tersisa pelanggaran
`no-explicit-any` dari kode lama (Sprint 2) dan satu rantai kerentanan
dev-only pada Prisma 6. Hapus `continue-on-error` setelah keduanya bersih.

## Secret yang dibutuhkan

| Secret | Wajib | Keterangan |
|---|:---:|---|
| `CI_JWT_SECRET` | opsional | Nilai `JWT_SECRET` saat build di CI. Bila kosong, workflow memakai placeholder — aman karena hanya dipakai proses build, bukan runtime produksi. |

`.github/dependabot.yml` (pembaruan dependency mingguan) sudah aktif dan tidak
memerlukan langkah tambahan.
