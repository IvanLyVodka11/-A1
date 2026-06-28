# Hệ thống Xác thực Hai yếu tố (2FA) — ĐA1

Đồ án xây dựng một hệ thống xác thực hai yếu tố hoàn chỉnh: một **API server**, một
**ứng dụng Authenticator** (sinh và quản lý mã OTP, dạng PWA cài được trên điện thoại)
và một **ứng dụng Demo** minh họa luồng đăng nhập có 2FA và đăng nhập không mật khẩu
(passwordless).

## Thành phần

- `server/` — API Express + SQLite: quản lý người dùng, sinh/xác minh OTP, cấp JWT,
  luồng passwordless dựa trên đường cong elliptic.
- `authenticator-app/` — PWA React + Vite: quét mã QR, lưu khóa OTP **mã hóa cục bộ**
  (IndexedDB + kdbxweb), sinh mã TOTP, hoạt động offline.
- `demo-app/` — React + Vite: website mẫu cho người dùng cuối trải nghiệm đăng nhập
  có bật 2FA và đăng nhập không mật khẩu.

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Backend | Node.js, Express 5, SQLite (better-sqlite3) |
| Frontend | React 19, Vite 8, PWA (vite-plugin-pwa) |
| Xác thực | TOTP (otpauth), JWT (access + refresh), passwordless dựa trên `@noble/curves` |
| Bảo mật | helmet, express-rate-limit, bcrypt, mã hóa AES khóa OTP |

## Yêu cầu

- Node.js **22** (LTS) trở lên — đúng phiên bản dùng trong CI và khi deploy.
- npm 10+.

## Chạy cục bộ

Mỗi ứng dụng độc lập; chạy từ thư mục của nó.

### Server

```bash
cd server
npm install
npm run dev        # node --watch, chạy ở cổng 3000
```

Biến môi trường (tạo file `server/.env`):

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `MASTER_KEY` | ✅ | Khóa AES 32 byte dạng **hex 64 ký tự**. Sinh bằng `openssl rand -hex 32`. |
| `JWT_SECRET` | ✅ | Chuỗi ngẫu nhiên ký JWT access token. |
| `JWT_REFRESH_SECRET` | ✅ | Chuỗi ngẫu nhiên ký JWT refresh token. |
| `DB_PATH` | — | Đường dẫn file SQLite. Mặc định `./data/authenticator.db`. |
| `CORS_ORIGINS` | — | Danh sách URL frontend, ngăn cách bằng dấu phẩy. |
| `PORT` | — | Cổng API. Mặc định `3000`. |

### Authenticator app

```bash
cd authenticator-app
npm install
npm run dev
```

### Demo app

```bash
cd demo-app
npm install
npm run dev
```

Hai frontend đọc biến `VITE_API_URL` (URL gốc của API, **không** kèm `/api`) lúc build.

## Kiểm thử

Hệ thống có **85 ca kiểm thử tự động** chạy trên mỗi push/PR qua GitHub Actions
([`.github/workflows/ci.yml`](.github/workflows/ci.yml)):

```bash
cd server && npm test               # 75 ca (Jest + supertest)
cd authenticator-app && npm test    # 10 ca (Vitest)
```

Server cần các biến `MASTER_KEY`, `JWT_SECRET`, `JWT_REFRESH_SECRET` khi chạy test
(CI dùng khóa giả hợp lệ — xem workflow).

## Triển khai

Hướng dẫn deploy chi tiết (Render Blueprint và phương án Vercel + Render) nằm ở
**[DEPLOY.md](DEPLOY.md)**; cấu hình hạ tầng ở [render.yaml](render.yaml).

Tóm tắt luồng trên Render:

1. Đẩy repo lên GitHub.
2. Render → New → Blueprint → chọn repo → Apply (tạo sẵn 3 dịch vụ + đĩa lưu trữ).
3. Đặt `MASTER_KEY` cho server (`openssl rand -hex 32`).
4. Khi 2 web có URL: đặt `VITE_API_URL` cho mỗi web và `CORS_ORIGINS` cho server.
5. Manual Deploy lại 2 web để build với `VITE_API_URL` đúng.

## Tài liệu

- [Hướng dẫn triển khai](DEPLOY.md)
- [Render blueprint](render.yaml)
- [Quy trình CI](.github/workflows/ci.yml)
</content>
</invoke>
