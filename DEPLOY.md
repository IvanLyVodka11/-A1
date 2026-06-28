# Hướng dẫn triển khai (Deploy)

Hệ thống gồm 3 thành phần: **server** (Express + SQLite), **authenticator-app** và
**demo-app** (Vite/React). Mã đã được tham số hóa qua biến môi trường để chạy được
trên hạ tầng thật:

| Thành phần | Biến môi trường | Ý nghĩa |
|---|---|---|
| server | `MASTER_KEY` | Khóa AES 32 byte hex (`openssl rand -hex 32`). **Bắt buộc.** |
| server | `JWT_SECRET`, `JWT_REFRESH_SECRET` | Chuỗi ngẫu nhiên ký JWT. **Bắt buộc.** |
| server | `DB_PATH` | Đường dẫn file SQLite (đặt trên đĩa bền vững). Mặc định `./data/authenticator.db`. |
| server | `CORS_ORIGINS` | Danh sách URL frontend, ngăn cách bằng dấu phẩy. |
| server | `PORT` | Cổng (nền tảng tự cấp). Mặc định 3000. |
| 2 frontend | `VITE_API_URL` | URL gốc của API, **không** kèm `/api`. Vd `https://da1-2fa-server.onrender.com`. |

`VITE_*` được Vite nhúng vào bundle lúc **build**, nên phải đặt trước khi build.

---

## Phương án A — Tất cả trên Render (1 nền tảng)

File [`render.yaml`](render.yaml) đã khai báo sẵn cả 3 dịch vụ + đĩa lưu trữ.

1. Đẩy repo lên GitHub.
2. Render → **New** → **Blueprint** → chọn repo → Apply. Render tạo 3 dịch vụ.
3. Điền biến đặt `sync: false`:
   - `da1-2fa-server` → `MASTER_KEY` (chạy `openssl rand -hex 32`).
   - Sau khi 2 web có URL: đặt `VITE_API_URL` cho mỗi web = URL server; đặt
     `CORS_ORIGINS` của server = 2 URL web (ngăn cách bằng phẩy).
4. **Manual Deploy** lại 2 web để build với `VITE_API_URL` đúng.

`JWT_SECRET`/`JWT_REFRESH_SECRET` được Render tự sinh (`generateValue`).

## Phương án B — Frontend trên Vercel, server trên Render

- **Server** → Render (chỉ phần `da1-2fa-server` trong `render.yaml`, hoặc tạo Web
  Service thủ công với root `server`).
- **Mỗi frontend** → Vercel: New Project → chọn thư mục `authenticator-app` /
  `demo-app` (đã có [`vercel.json`](authenticator-app/vercel.json)). Trong
  **Settings → Environment Variables** thêm `VITE_API_URL` = URL server, rồi Deploy.
- Cập nhật `CORS_ORIGINS` của server = 2 domain Vercel.

---

## CI (GitHub Actions)

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) chạy mỗi push/PR:

- `server`: `npm ci` + `npm test` (75 ca Jest) với khóa test giả.
- `authenticator-app`: `npm ci` + `npm test` (10 ca Vitest) + `npm run build`.
- `demo-app`: `npm ci` + `npm run build`.

## Lưu ý bảo mật khi public

- Bật **HTTPS** (Render/Vercel tự cấp TLS) — không dùng HTTP như môi trường cục bộ.
- `CORS_ORIGINS` chỉ liệt kê đúng domain frontend, không để `*`.
- Không commit `.env` thật; chỉ commit `.env.example`.
- SQLite phải nằm trên **đĩa bền vững** (`DB_PATH` + Render Disk), nếu không dữ liệu
  mất mỗi lần deploy lại.
- Bản miễn phí của Render ngủ khi không có truy cập; lần gọi đầu sau khi ngủ sẽ chậm.
