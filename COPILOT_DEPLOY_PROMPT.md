# Prompt cho GitHub Copilot (VSCode — Agent mode) — Push GitHub + Deploy

> Cách dùng: mở Copilot Chat trong VSCode, chọn chế độ **Agent**, mở thư mục `D:\ĐA1`,
> rồi dán TOÀN BỘ nội dung trong khối dưới đây làm prompt.

---

Bạn là kỹ sư DevOps. Làm việc trong workspace `D:\ĐA1` (monorepo). Hãy đưa dự án lên
GitHub rồi hướng dẫn deploy. Thực hiện tuần tự, dừng lại báo tôi nếu có lỗi.

## Bối cảnh dự án
- 3 thành phần code: `server/` (Express + SQLite), `authenticator-app/` (Vite React PWA),
  `demo-app/` (Vite React).
- Đã có sẵn file hạ tầng: `render.yaml`, `authenticator-app/vercel.json`,
  `demo-app/vercel.json`, `.github/workflows/ci.yml`, `DEPLOY.md`.
- Repo **chưa** được khởi tạo git.

## RÀNG BUỘC AN TOÀN (bắt buộc, kiểm tra kỹ)
- TUYỆT ĐỐI không commit: `server/.env`, mọi file `*.db` / `*.db-shm` / `*.db-wal`,
  mọi `node_modules/`, mọi `dist/`.
- KHÔNG đẩy 2 thư mục báo cáo: `docs/` và `fileBaoCao/` (chúng nặng và không cần để chạy).
- Tạo `.gitignore` ở gốc TRƯỚC khi `git add` để không bao giờ stage nhầm secret.

## Bước 1 — Tạo `.gitignore` ở gốc workspace
Tạo file `D:\ĐA1\.gitignore` với nội dung:
```gitignore
# Dependencies
node_modules/
**/node_modules/

# Build output
dist/
**/dist/

# Secrets & môi trường
.env
**/.env
!**/.env.example

# CSDL SQLite (dữ liệu runtime)
*.db
*.db-shm
*.db-wal

# Báo cáo (không đẩy theo yêu cầu)
docs/
fileBaoCao/

# Công cụ build báo cáo (tùy chọn — đang loại vì gắn với docs/)
scripts/__pycache__/

# Cấu hình IDE / agent cục bộ
.claude/
.agents/
.vscode/
.DS_Store
```

## Bước 2 — Khởi tạo git và commit
Chạy trong terminal tích hợp (thư mục `D:\ĐA1`):
```bash
git init -b main
git add .
git commit -m "chore: initial commit - 2FA system (server + authenticator + demo) + deploy config"
```

## Bước 3 — KIỂM TRA an toàn trước khi push
Chạy và xác nhận các lệnh sau **không in ra gì** (nghĩa là sạch):
```bash
git ls-files | grep -E "\.env$|\.db$|node_modules/|/dist/|^docs/|^fileBaoCao/"
```
Nếu có dòng nào hiện ra → DỪNG, sửa `.gitignore`, chạy `git rm -r --cached <đường-dẫn>`
rồi commit lại. Chỉ tiếp tục khi lệnh trên rỗng.

## Bước 4 — Tạo repo GitHub và push
Ưu tiên dùng GitHub CLI (nếu `gh` đã cài và đã `gh auth login`):
```bash
gh repo create da1-2fa-system --public --source=. --remote=origin --push
```
Nếu KHÔNG có `gh`: dùng lệnh Command Palette của VSCode **"Publish to GitHub"**
(chọn Public, repo tên `da1-2fa-system`), hoặc tạo repo trống trên github.com rồi:
```bash
git remote add origin https://github.com/<TÊN-GITHUB>/da1-2fa-system.git
git push -u origin main
```
Sau khi push xong, in ra URL repo.

## Bước 5 — Deploy (theo `DEPLOY.md`)
Sau khi code đã lên GitHub:
1. Vào https://render.com → **New → Blueprint** → chọn repo vừa push. Render đọc
   `render.yaml` và tạo 3 dịch vụ: `da1-2fa-server`, `da1-authenticator`, `da1-demo`.
2. Đặt biến môi trường còn thiếu (đánh dấu `sync: false`):
   - `da1-2fa-server` → `MASTER_KEY`: chạy `openssl rand -hex 32` rồi dán giá trị.
     (`JWT_SECRET`, `JWT_REFRESH_SECRET` Render tự sinh.)
3. Deploy lần đầu. Lấy URL của server và 2 web.
4. Quay lại đặt:
   - 2 web → `VITE_API_URL` = URL server (vd `https://da1-2fa-server.onrender.com`).
   - server → `CORS_ORIGINS` = 2 URL web, ngăn cách bằng dấu phẩy.
5. **Manual Deploy** lại 2 web (vì Vite nhúng `VITE_API_URL` lúc build).
6. Mở URL web demo, thử đăng nhập 2FA + đăng nhập không mật khẩu để xác nhận chạy được.

> Lưu ý: thao tác bấm nút trên trang Render do tôi (người dùng) làm; bạn hãy nhắc rõ
> từng bước. Nếu tôi cung cấp `RENDER_API_KEY`, bạn có thể tự động hóa qua Render API.

## Hoàn thành khi
- Repo công khai trên GitHub, KHÔNG chứa `.env`, `*.db`, `node_modules`, `dist`,
  `docs/`, `fileBaoCao/`.
- GitHub Actions (tab Actions) chạy xanh.
- 3 dịch vụ trên Render ở trạng thái Live và web demo dùng thử được.

Cuối cùng in ra: URL repo GitHub, 3 URL dịch vụ Render.
