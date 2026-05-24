# 💾 Backup Guide — V-Affiliate

Backup DB tự động hằng đêm thông qua **GitHub Actions** — không tốn tiền,
không cần Google Drive / Dropbox token.

## 🏗 Cấu trúc

- File workflow: `.github/workflows/backup-db.yml`
- Lịch chạy: **03:00 UTC mỗi ngày** (10:00 giờ Việt Nam)
- Lưu trữ: GitHub Releases (tag `backup-YYYY-MM-DD_HHMMSS`)
- Tự xoá: backup cũ hơn 30 ngày sẽ bị xoá tự động ở cuối mỗi run

## ⚙️ Cấu hình secrets (1 lần duy nhất)

Vào repo GitHub → **Settings → Secrets and variables → Actions** → tab
**Repository secrets** → **New repository secret**:

| Secret | Giá trị | Bắt buộc |
|---|---|---|
| `DATABASE_URL` | Connection string Supabase (giống Render) | ✅ |
| `TELEGRAM_BOT_TOKEN` | Bot token (đã có cho admin notifications) | ⚠️ tùy chọn — chỉ dùng để báo lỗi |
| `TELEGRAM_ADMIN_CHAT_ID` | Chat ID admin (đã có) | ⚠️ tùy chọn |

**Lưu ý**: `DATABASE_URL` phải dùng **Session Pooler** (port `5432`), không
phải Transaction Pooler (`6543`) vì pg_dump cần session lifetime dài.

Format chuẩn:
```
postgres://postgres.<project-ref>:<password>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

## 🚀 Test thủ công lần đầu

1. Vào tab **Actions** trên GitHub repo
2. Click workflow **"Backup Supabase Database"**
3. Click **Run workflow** → **Run workflow** (button xanh)
4. Đợi ~2-3 phút → xem run log
5. Vào tab **Releases** → sẽ thấy release `backup-2026-XX-XX_XXXXXX` với file `.sql.gz` đính kèm

## 🔄 Restore từ backup

Khi cần khôi phục dữ liệu (DR scenario):

```bash
# 1. Download file .sql.gz từ GitHub Release
gh release download backup-2026-05-25_030000 -p '*.sql.gz'

# 2. Giải nén
gunzip vaffiliate_2026-05-25_030000.sql.gz

# 3. Restore vào Supabase (CẨN THẬN — sẽ DROP các bảng cũ vì dùng --clean)
psql "$DATABASE_URL" < vaffiliate_2026-05-25_030000.sql
```

⚠️ **Best practice**: tạo project Supabase mới (hoặc DB dev local) để
restore vào trước, verify dữ liệu OK rồi mới restore production.

## 📊 So sánh các option backup

| Option | Free quota | Setup | Khuyến nghị |
|---|---|---|---|
| **GitHub Releases (đang dùng)** | 2 GB tổng / repo | Zero — chỉ cần secret | ✅ V-Affiliate hiện tại |
| Supabase built-in | 7 ngày, free tier | Auto | Phòng hờ thêm — không cần làm gì |
| Google Drive | 15 GB miễn phí | Phức tạp (OAuth, refresh token) | Khi DB > 100 MB |
| Dropbox | 2 GB miễn phí | API token đơn giản | Nếu cần off-site |
| AWS S3 | $0.023/GB/tháng | Tạo IAM user + bucket | Khi quy mô lớn |

## 📈 Khi nào nên nâng cấp?

DB Supabase free tier max 500 MB. Mỗi backup `.sql.gz` ước tính **~5-50 KB
mỗi 100 row** (tùy nội dung). Một repo GitHub free 2GB có thể chứa hàng
nghìn backup → đủ dùng vài năm.

Khi DB > 200 MB hoặc bạn muốn off-site nghiêm túc, chuyển sang **AWS S3**
hoặc **Backblaze B2** (rẻ hơn S3, $0.005/GB).

## 🔐 Bảo mật

- File backup chứa **toàn bộ data + password hash + TOTP encrypted secret**
- Lưu trên GitHub Release **public** = ai cũng download được
- → **Repo PHẢI là Private** (bạn đã set rồi: `nguyenvandon1304/Vaffiliate`)
- Nếu sau này repo public, đổi backup target sang S3/Drive private bucket

## 🐛 Troubleshooting

### Workflow fail với "pg_dump: server version mismatch"
- pg_dump trong workflow phải khớp Postgres server version. Supabase đang
  dùng Postgres 16, workflow đang cài `postgresql-client-16` → ổn.
- Nếu Supabase nâng version, sửa `postgresql-client-16` → version mới.

### Workflow fail với "could not connect to server"
- Check secret `DATABASE_URL` đúng format Session Pooler chưa
- Test thủ công bằng `psql "$DATABASE_URL" -c "SELECT 1"` trên máy local

### Dung lượng repo > 2 GB
- Workflow tự xoá release > 30 ngày, nhưng nếu DB lớn quá, chuyển sang
  S3/Drive
