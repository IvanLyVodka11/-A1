# -*- coding: utf-8 -*-
"""Generate clean diagrams for the report (architecture, ERD crow's-foot, UML
use-case / class / sequence). Output → docs/evidence/fig/*.png."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Rectangle, Ellipse, Circle
import os

os.makedirs("../docs/evidence/fig", exist_ok=True)
plt.rcParams["font.family"] = "DejaVu Sans"
ACCENT = "#3b82f6"; DARK = "#1f2937"; GREY = "#6b7280"; LIGHT = "#eff6ff"
GREEN = "#16a34a"; AMBER = "#d97706"; RED = "#dc2626"


def rbox(ax, x, y, w, h, text, fc=LIGHT, ec=ACCENT, fs=11, bold=True, tc=DARK):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08",
                                fc=fc, ec=ec, lw=2))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center",
            fontsize=fs, color=tc, fontweight="bold" if bold else "normal", wrap=True)


def arrow(ax, x1, y1, x2, y2, text="", color=GREY, style="->", off=0.12, ls="-"):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2), arrowstyle=style, mutation_scale=18,
                                 color=color, lw=1.8, linestyle=ls, connectionstyle="arc3,rad=0"))
    if text:
        ax.text((x1 + x2) / 2, (y1 + y2) / 2 + off, text, ha="center", va="bottom",
                fontsize=9, color=color, style="italic")


# ── Hình: Kiến trúc tổng thể (component diagram) ─────────────────────────────���
def fig_architecture():
    fig, ax = plt.subplots(figsize=(9.2, 5.0))
    ax.set_xlim(0, 10); ax.set_ylim(0, 6); ax.axis("off")
    rbox(ax, 0.4, 3.6, 2.6, 1.5, "Authenticator-app\n(React PWA)\ncổng 5173", fc="#eff6ff")
    rbox(ax, 0.4, 0.7, 2.6, 1.5, "Demo-app\n(React)\ncổng 5174", fc="#eff6ff")
    rbox(ax, 6.9, 2.2, 2.7, 1.6, "Server API\n(Express + SQLite)\ncổng 3000", fc="#fef3c7", ec=AMBER)
    rbox(ax, 3.9, 2.45, 2.0, 1.1, "IndexedDB\n(cache offline)", fc="#f0fdf4", ec=GREEN, fs=9)
    arrow(ax, 3.0, 4.35, 6.9, 3.4, "REST / JWT", ACCENT)
    arrow(ax, 3.0, 1.45, 6.9, 2.6, "REST + ZK verify", ACCENT, off=-0.35)
    arrow(ax, 2.4, 3.7, 4.3, 3.1, "cache", GREEN)
    plt.tight_layout(); plt.savefig("../docs/evidence/fig/architecture.png", dpi=160, bbox_inches="tight"); plt.close()
    print("architecture.png")


# ── Hình: ERD ký pháp chân chim (crow's foot) ─────────────────────────────────
def entity(ax, x, y, title, rows, w=2.95, rh=0.36, th=0.5):
    """Draw an ER entity (table). Returns (left, right, top, bottom, cx)."""
    h = th + rh * len(rows)
    top = y; bottom = y - h
    # header
    ax.add_patch(Rectangle((x, top - th), w, th, fc=ACCENT, ec=DARK, lw=1.4))
    ax.text(x + w / 2, top - th / 2, title, ha="center", va="center", color="white",
            fontweight="bold", fontsize=10)
    # body
    ax.add_patch(Rectangle((x, bottom), w, h - th, fc="white", ec=DARK, lw=1.4))
    for i, r in enumerate(rows):
        yy = top - th - rh * (i + 0.5)
        ax.text(x + 0.12, yy, r[0], ha="left", va="center", fontsize=8.2, color=DARK,
                fontweight="bold" if r[1] else "normal")
        ax.text(x + w - 0.12, yy, r[2], ha="right", va="center", fontsize=7.4, color=GREY, style="italic")
    return dict(l=x, r=x + w, t=top, b=bottom, cx=x + w / 2)


def crow(ax, x, y, up, many, optional):
    """Crow's-foot marker at (x,y); `up`=foot opens upward; cardinality on a vertical line."""
    d = 0.18 if up else -0.18
    if many:  # three prongs
        ax.plot([x, x - 0.16], [y, y + d], color=DARK, lw=1.3)
        ax.plot([x, x + 0.16], [y, y + d], color=DARK, lw=1.3)
        ax.plot([x, x], [y, y + d], color=DARK, lw=1.3)
    else:  # single bar = "one"
        ax.plot([x - 0.14, x + 0.14], [y + d * 0.6, y + d * 0.6], color=DARK, lw=1.5)
    # optional (circle) vs mandatory (bar) ring nearer the line
    ring_y = y + d * 1.25
    if optional:
        ax.add_patch(Circle((x, ring_y), 0.07, fc="white", ec=DARK, lw=1.2))
    else:
        ax.plot([x - 0.14, x + 0.14], [ring_y, ring_y], color=DARK, lw=1.5)


def fig_erd():
    fig, ax = plt.subplots(figsize=(12.8, 6.6))
    ax.set_xlim(0, 13.6); ax.set_ylim(0, 8.2); ax.axis("off")
    users = entity(ax, 5.1, 7.9, "users", [
        ("PK  id", True, "INTEGER"),
        ("email", False, "TEXT UQ"),
        ("password_hash", False, "TEXT"),
        ("created_at", False, "DATETIME"),
    ])
    otp = entity(ax, 0.2, 4.0, "otp_accounts", [
        ("PK  id", True, "INTEGER"),
        ("FK  user_id", True, "INTEGER"),
        ("issuer / account_name", False, "TEXT"),
        ("encrypted_secret", False, "TEXT"),
        ("algorithm/digits/period", False, ""),
    ])
    rt = entity(ax, 3.55, 4.0, "refresh_tokens", [
        ("PK  id", True, "INTEGER"),
        ("FK  user_id", True, "INTEGER"),
        ("jti", False, "TEXT UQ"),
        ("revoked", False, "INTEGER"),
        ("expires_at", False, "DATETIME"),
    ])
    bk = entity(ax, 6.8, 4.0, "backups", [
        ("PK  id", True, "INTEGER"),
        ("FK  user_id", True, "INTEGER"),
        ("encrypted_data", False, "TEXT"),
        ("created_at", False, "DATETIME"),
    ])
    zk = entity(ax, 10.1, 4.0, "zk_credentials", [
        ("PK  id", True, "INTEGER"),
        ("FK  user_id", True, "INTEGER UQ"),
        ("public_key", False, "TEXT"),
        ("created_at", False, "DATETIME"),
    ])

    def relate(child, label, many=True):
        ux, uy = users["cx"], users["b"]
        cx, cy = child["cx"], child["t"]
        ax.plot([ux, ux, cx, cx], [uy, (uy + cy) / 2, (uy + cy) / 2, cy], color=DARK, lw=1.2)
        crow(ax, ux, uy, up=False, many=False, optional=False)        # "one" at users
        crow(ax, cx, cy, up=True, many=many, optional=not many)        # "many"/"one" at child
        ax.text(cx + 0.18, cy + 0.42, label, fontsize=8, color=ACCENT, style="italic")

    relate(otp, "1 : N")
    relate(rt, "1 : N")
    relate(bk, "1 : N")
    relate(zk, "1 : 0..1", many=False)
    ax.text(0.2, 0.5, "Ký pháp chân chim (crow's foot): vạch đôi = một và bắt buộc, "
            "vòng tròn = không bắt buộc, chân ba nhánh = nhiều.",
            fontsize=8, color=GREY, style="italic")
    plt.savefig("../docs/evidence/fig/erd.png", dpi=160, bbox_inches="tight"); plt.close()
    print("erd.png")


# ── Hình: Sơ đồ ca sử dụng (UML use-case) ─────────────────────────────────────
def fig_usecase():
    fig, ax = plt.subplots(figsize=(10.6, 6.4))
    ax.set_xlim(0, 12.2); ax.set_ylim(0, 8.4); ax.axis("off")
    # actor (stick figure)
    ax_x, ax_y = 1.0, 4.2
    ax.add_patch(Circle((ax_x, ax_y + 1.0), 0.28, fc="white", ec=DARK, lw=1.6))
    ax.plot([ax_x, ax_x], [ax_y + 0.72, ax_y - 0.1], color=DARK, lw=1.6)
    ax.plot([ax_x - 0.45, ax_x + 0.45], [ax_y + 0.5, ax_y + 0.5], color=DARK, lw=1.6)
    ax.plot([ax_x, ax_x - 0.4], [ax_y - 0.1, ax_y - 0.7], color=DARK, lw=1.6)
    ax.plot([ax_x, ax_x + 0.4], [ax_y - 0.1, ax_y - 0.7], color=DARK, lw=1.6)
    ax.text(ax_x, ax_y - 1.05, "Người dùng", ha="center", fontsize=10, fontweight="bold")
    # system boundary
    ax.add_patch(Rectangle((2.7, 0.5), 7.9, 7.4, fc="none", ec=GREY, lw=1.4, ls="--"))
    ax.text(6.65, 7.6, "Hệ thống xác thực hai yếu tố", ha="center", fontsize=10,
            color=GREY, fontweight="bold")
    cases = [
        "Đăng ký / Đăng nhập", "Quản lý tài khoản OTP", "Sinh mã TOTP",
        "Nhập / Xuất kho KeePass", "Sinh mật khẩu mạnh",
        "Đăng nhập không mật khẩu (ZK)", "Sao lưu / Khôi phục",
    ]
    ys = [7.0, 6.0, 5.0, 4.0, 3.0, 2.0, 1.1]
    for uc, y in zip(cases, ys):
        ax.add_patch(Ellipse((6.65, y), 4.4, 0.74, fc=LIGHT, ec=ACCENT, lw=1.6))
        ax.text(6.65, y, uc, ha="center", va="center", fontsize=9.2, color=DARK)
        ax.plot([ax_x + 0.5, 4.45], [ax_y + 0.2, y], color=GREY, lw=1.0)
    # external actor KeePassXC (outside the system boundary)
    ax.text(11.35, 4.0, "KeePassXC\n(.kdbx)", ha="center", fontsize=8.5, color=GREY,
            fontweight="bold")
    ax.plot([8.85, 10.75], [4.0, 4.0], color=GREY, lw=1.0, ls=":")
    plt.savefig("../docs/evidence/fig/usecase.png", dpi=160, bbox_inches="tight"); plt.close()
    print("usecase.png")


# ── Hình: Sơ đồ lớp / thành phần (UML class) ──────────────────────────────────
def umlclass(ax, x, y, name, attrs, methods, w=3.0):
    ah = 0.32 * len(attrs); mh = 0.32 * len(methods); nh = 0.5
    h = nh + ah + mh
    top = y
    ax.add_patch(Rectangle((x, top - nh), w, nh, fc=ACCENT, ec=DARK, lw=1.4))
    ax.text(x + w / 2, top - nh / 2, name, ha="center", va="center", color="white",
            fontweight="bold", fontsize=9.5)
    ax.add_patch(Rectangle((x, top - nh - ah), w, ah, fc="white", ec=DARK, lw=1.2))
    for i, a in enumerate(attrs):
        ax.text(x + 0.1, top - nh - 0.32 * (i + 0.5), a, ha="left", va="center", fontsize=7.6, color=DARK)
    ax.add_patch(Rectangle((x, top - nh - ah - mh), w, mh, fc="#f8fafc", ec=DARK, lw=1.2))
    for i, m in enumerate(methods):
        ax.text(x + 0.1, top - nh - ah - 0.32 * (i + 0.5), m, ha="left", va="center", fontsize=7.6, color=DARK)
    return dict(l=x, r=x + w, t=top, b=top - h, cx=x + w / 2, cy=top - h / 2)


def fig_class():
    fig, ax = plt.subplots(figsize=(10.4, 6.6))
    ax.set_xlim(0, 12); ax.set_ylim(0, 8.4); ax.axis("off")
    auth = umlclass(ax, 0.3, 7.9, "AuthService", ["- saltRounds: int"],
                    ["+ register(email, pw)", "+ login(email, pw)", "+ rotateTokens(rt)"])
    enc = umlclass(ax, 4.3, 7.9, "EncryptionService", ["- masterKey: Buffer"],
                   ["+ deriveUserKek(uid)", "+ encrypt(pt, uid)", "+ decrypt(blob, uid)"])
    zk = umlclass(ax, 8.5, 7.9, "SchnorrVerifier", ["- G, n: secp256k1"],
                  ["+ hashToScalar(...)", "+ verifyProof(pk, c, π)"])
    otp = umlclass(ax, 0.3, 3.7, "OtpService", ["- window: int"],
                   ["+ generateTOTP(s)", "+ verifyTOTP(t, s)"])
    repo = umlclass(ax, 4.3, 3.7, "AccountRepository", ["- db: SQLite"],
                    ["+ create(uid, acc)", "+ findByUser(uid)", "+ delete(id)"])
    tok = umlclass(ax, 8.5, 3.7, "RefreshTokenStore", ["- db: SQLite"],
                   ["+ issue(uid)", "+ revoke(jti)", "+ isActive(jti)"])
    # associations
    arrow(ax, auth["r"], 7.0, enc["l"], 7.0, "uses", GREY, style="-|>", off=0.06)
    arrow(ax, auth["cx"], auth["b"], repo["l"] + 0.3, repo["t"], "", GREY, style="-|>")
    arrow(ax, auth["r"] - 0.2, auth["b"], tok["l"], tok["t"] + 0.3, "uses", GREY, style="-|>", off=0.06)
    # AccountRepository → EncryptionService: enc sits directly above repo (cùng cx),
    # nên vẽ mũi tên thẳng đứng cạnh-tới-cạnh; nhãn đặt lệch sang phải để không nằm trên đường.
    arrow(ax, repo["cx"], repo["t"], enc["cx"], enc["b"], "", GREY, style="-|>")
    ax.text(repo["cx"] + 0.15, (repo["t"] + enc["b"]) / 2, "uses", ha="left", va="center",
            fontsize=9, color=GREY, style="italic")
    arrow(ax, otp["r"], 2.6, repo["l"], 2.6, "", GREY, style="-|>")
    plt.savefig("../docs/evidence/fig/class.png", dpi=160, bbox_inches="tight"); plt.close()
    print("class.png")


# ── Hình: Sơ đồ tuần tự đăng nhập 2FA (UML sequence) ──────────────────────────
def fig_login_sequence():
    fig, ax = plt.subplots(figsize=(10.0, 6.4))
    ax.set_xlim(0, 10.4); ax.set_ylim(0, 8.6); ax.axis("off")
    lanes = {"Người dùng": 1.4, "Demo App": 4.0, "Server API": 6.6, "CSDL": 8.9}
    for name, x in lanes.items():
        rbox(ax, x - 1.05, 7.7, 2.1, 0.6, name, fc=DARK, ec=DARK, fs=9, tc="white")
        ax.plot([x, x], [0.4, 7.7], color=GREY, lw=1, ls="--")

    def msg(y, x1, x2, text, color=ACCENT, ret=False):
        arrow(ax, x1, y, x2, y, "", color, style="->", ls="--" if ret else "-")
        ax.text((x1 + x2) / 2, y + 0.1, text, ha="center", va="bottom", fontsize=8.2, color=DARK)

    U, D, S, DB = lanes["Người dùng"], lanes["Demo App"], lanes["Server API"], lanes["CSDL"]
    msg(7.1, U, D, "nhập email + mật khẩu")
    msg(6.5, D, S, "① POST /demo/login")
    msg(5.9, S, DB, "tra cứu user, so bcrypt", GREY)
    msg(5.3, S, D, "cần 2FA = true", GREEN, ret=True)
    msg(4.7, D, U, "hiện màn nhập mã OTP", GREEN, ret=True)
    msg(4.1, U, D, "nhập mã 6 số")
    msg(3.5, D, S, "② POST /demo/verify-otp")
    ax.text(S, 2.95, "giải mã secret (envelope)\nverifyTOTP(code, window=1)", ha="center",
            fontsize=7.8, style="italic", color=RED)
    msg(2.3, S, DB, "đọc encrypted_secret", GREY)
    msg(1.5, S, D, "200 OK + JWT (access/refresh)", GREEN, ret=True)
    msg(0.9, D, U, "đăng nhập thành công", GREEN, ret=True)
    plt.savefig("../docs/evidence/fig/login-sequence.png", dpi=160, bbox_inches="tight"); plt.close()
    print("login-sequence.png")


# ── Hình: Sơ đồ tuần tự đăng nhập không mật khẩu (ZK) ─────────────────────────
def fig_zk_sequence():
    fig, ax = plt.subplots(figsize=(9.2, 6.2))
    ax.set_xlim(0, 10); ax.set_ylim(0, 8.6); ax.axis("off")
    lanes = {"Thiết bị\n(máy khách)": 1.8, "Máy chủ API": 5.0, "CSDL": 8.2}
    for name, x in lanes.items():
        rbox(ax, x - 1.1, 7.1, 2.2, 0.7, name, fc=DARK, ec=DARK, fs=9, tc="white")
        ax.plot([x, x], [0.4, 7.1], color=GREY, lw=1, ls="--")

    def msg(y, x1, x2, text, color=ACCENT):
        arrow(ax, x1, y, x2, y, "", color)
        ax.text((x1 + x2) / 2, y + 0.12, text, ha="center", va="bottom", fontsize=8.5, color=DARK)

    ax.text(1.8, 6.6, "x ngẫu nhiên, P = G·x", ha="center", fontsize=8, style="italic", color=GREEN)
    msg(6.2, 1.8, 5.0, "① register {email, P}")
    msg(5.6, 5.0, 8.2, "lưu public_key", GREY)
    msg(4.9, 1.8, 5.0, "② challenge {email}")
    msg(4.3, 5.0, 1.8, "nonce (32B, hạn 120s)", AMBER)
    ax.text(1.8, 3.8, "③ R=G·k, e=H(P‖R‖nonce)\ns = k + e·x", ha="center", fontsize=8, style="italic", color=GREEN)
    msg(3.2, 1.8, 5.0, "④ verify {email, (R,s)}")
    ax.text(5.0, 2.5, "kiểm tra G·s = R + P·e\nhủy nonce (1 lần)", ha="center", fontsize=8, style="italic", color=RED)
    msg(1.7, 5.0, 1.8, "✓ verified: true", GREEN)
    plt.savefig("../docs/evidence/fig/zk-sequence.png", dpi=160, bbox_inches="tight"); plt.close()
    print("zk-sequence.png")


# ── Hình: Ranh giới tin cậy và mô hình kẻ tấn công ───────────────────────────
def fig_trust_boundary():
    fig, ax = plt.subplots(figsize=(11.6, 6.8))
    ax.set_xlim(0, 12.8); ax.set_ylim(0, 8.0); ax.axis("off")

    ZB, ZT = 1.35, 6.9          # zone box bottom / top
    IH, GAP = 0.66, 0.92        # item box height / vertical step

    def zone(x, w, title, fc, ec, items):
        ax.add_patch(FancyBboxPatch((x, ZB), w, ZT - ZB, boxstyle="round,pad=0.02,rounding_size=0.06",
                                    fc=fc, ec=ec, lw=2))
        ax.text(x + w / 2, ZT - 0.42, title, ha="center", va="center", fontsize=9.4,
                fontweight="bold", color=ec)
        first_top = ZT - 0.95   # khoảng trống dành riêng cho tiêu đề 2 dòng
        for i, t in enumerate(items):
            rbox(ax, x + 0.22, first_top - IH - i * GAP, w - 0.44, IH, t,
                 fc="white", ec=GREY, fs=7.4, bold=False)

    zone(0.2, 3.7, "Vùng máy khách\n(trình duyệt / thiết bị)", "#eff6ff", ACCENT, [
        "Khóa bí mật ZK x (localStorage)",
        "JWT access + refresh (localStorage)",
        "Master password KeePass (chỉ RAM)",
        "Cache mã TOTP (IndexedDB)",
    ])
    zone(4.75, 3.4, "Vùng máy chủ API\n(Express, tin cậy)", "#fef3c7", AMBER, [
        "MASTER_KEY (biến môi trường)",
        "JWT_SECRET / REFRESH_SECRET (env)",
        "Kho thách thức nonce (RAM)",
        "Giải mã secret khi xác thực OTP",
    ])
    zone(9.1, 3.5, "Vùng lưu trữ\n(SQLite trên đĩa)", "#f0fdf4", GREEN, [
        "encrypted_secret (envelope v2)",
        "password_hash (bcrypt, cost 12)",
        "public_key ZK (33 byte)",
        "refresh_tokens: jti + revoked",
    ])

    # Ranh giới tin cậy (đường gạch) nằm trong khe giữa các vùng; nhãn xoay dọc theo
    # đường nên không còn đè lên các ô đe dọa ở phía dưới.
    for bx in (4.45, 8.85):
        ax.plot([bx, bx], [1.0, ZT + 0.25], color=RED, lw=1.6, ls=(0, (6, 4)))
        ax.text(bx, (ZB + ZT) / 2, "Ranh giới tin cậy", rotation=90, ha="center", va="center",
                fontsize=7.6, color=RED, style="italic",
                bbox=dict(boxstyle="round,pad=0.15", fc="white", ec="none"))

    def threat(x, y, text):
        ax.add_patch(FancyBboxPatch((x - 1.35, y - 0.33), 2.7, 0.66,
                                    boxstyle="round,pad=0.02,rounding_size=0.1",
                                    fc="#fee2e2", ec=RED, lw=1.4))
        ax.text(x, y, text, ha="center", va="center", fontsize=7.6, color=RED, fontweight="bold")

    threat(2.05, 0.6, "XSS · mã độc · mất máy")
    threat(4.45, 7.45, "MITM: nghe lén / sửa")
    threat(6.45, 0.6, "Chiếm máy chủ")
    threat(10.85, 0.6, "Lộ cơ sở dữ liệu")
    plt.savefig("../docs/evidence/fig/trust-boundary.png", dpi=160, bbox_inches="tight"); plt.close()
    print("trust-boundary.png")


# ── Hình: Phòng vệ theo chiều sâu (defense in depth) ─────────────────────────
def fig_defense_depth():
    fig, ax = plt.subplots(figsize=(9.6, 6.6))
    ax.set_xlim(0, 10); ax.set_ylim(0, 7.0); ax.axis("off")
    layers = [
        ("Mạng truyền tải", "HTTPS / TLS (khi triển khai) — chống nghe lén & sửa gói", "#dbeafe", ACCENT),
        ("Cổng vào API", "helmet (CSP, HSTS, nosniff) · CORS allowlist · rate limit 100/20/10", "#e0f2fe", "#0284c7"),
        ("Xác thực phiên", "bcrypt cost 12 · JWT access 15 phút · xoay vòng + phát hiện tái dùng refresh", "#fef9c3", AMBER),
        ("Mã hóa dữ liệu", "AES-256-GCM (AEAD) · DEK ngẫu nhiên mỗi bản ghi · phát hiện sửa đổi", "#fed7aa", "#ea580c"),
        ("Tách khóa người dùng", "KEK = HKDF(master, salt = user_id) — mỗi người dùng một khóa", "#fee2e2", RED),
    ]
    # Các lớp xếp chồng theo chiều dọc, mỗi lớp dùng hết bề ngang nên chữ luôn nằm gọn
    # trong ô (mô hình nested cũ làm ô trong cùng quá hẹp khiến chữ tràn ra ngoài).
    x0, x1 = 0.4, 9.6
    bh, gap = 1.0, 0.1
    for i, (title, desc, fc, ec) in enumerate(layers):
        yt = 6.5 - i * (bh + gap)
        yb = yt - bh
        ax.add_patch(FancyBboxPatch((x0, yb), x1 - x0, bh,
                                    boxstyle="round,pad=0.02,rounding_size=0.05",
                                    fc=fc, ec=ec, lw=1.8, alpha=0.6))
        ax.text((x0 + x1) / 2, yt - 0.32, title, ha="center", va="center", fontsize=9.4,
                fontweight="bold", color=ec)
        ax.text((x0 + x1) / 2, yb + 0.3, desc, ha="center", va="center", fontsize=7.6, color=DARK)
    # tài sản trong cùng, vẽ như lõi nằm dưới cùng của ngăn xếp các lớp phòng vệ
    core_y = 6.5 - 5 * (bh + gap) - 0.18
    ax.add_patch(FancyBboxPatch((4.0, core_y - 0.31), 2.0, 0.62, boxstyle="round,pad=0.02,rounding_size=0.1",
                                fc=GREEN, ec=DARK, lw=1.6))
    ax.text(5.0, core_y, "Bí mật người dùng", ha="center", va="center", fontsize=8,
            color="white", fontweight="bold")
    ax.text(5.0, 0.2, "Các lớp phòng vệ bao quanh tài sản trong cùng (lớp ngoài cùng ở trên).",
            ha="center", fontsize=7.6, color=GREY, style="italic")
    plt.savefig("../docs/evidence/fig/defense-depth.png", dpi=160, bbox_inches="tight"); plt.close()
    print("defense-depth.png")


# ── Hình: Phạm vi ảnh hưởng khi lộ cơ sở dữ liệu ─────────────────────────────
def fig_db_leak():
    fig, ax = plt.subplots(figsize=(10.6, 6.0))
    ax.set_xlim(0, 11.4); ax.set_ylim(0, 7.0); ax.axis("off")
    ax.text(2.9, 6.6, "Kẻ tấn công đọc được\n(nhưng vô dụng nếu thiếu khóa)",
            ha="center", fontsize=9.4, fontweight="bold", color=RED)
    ax.text(8.4, 6.6, "Vẫn an toàn\n(không nằm trong cơ sở dữ liệu)",
            ha="center", fontsize=9.4, fontweight="bold", color=GREEN)
    leaked = ["encrypted_secret (bản mã envelope)", "password_hash (bcrypt, cost 12)",
              "public_key ZK (chỉ khóa công khai)", "jti + cờ revoked (không phải token)"]
    safe = ["MASTER_KEY (biến môi trường, ngoài DB)", "DEK ở dạng rõ (không bao giờ lưu)",
            "Khóa bí mật ZK  x  (chỉ ở máy khách)", "Mật khẩu rõ (chỉ lưu hash một chiều)"]
    for i, t in enumerate(leaked):
        rbox(ax, 0.4, 5.2 - i * 0.96, 5.0, 0.72, t, fc="#fee2e2", ec=RED, fs=7.8, bold=False)
    for i, t in enumerate(safe):
        rbox(ax, 5.95, 5.2 - i * 0.96, 5.0, 0.72, t, fc="#dcfce7", ec=GREEN, fs=7.8, bold=False)
    ax.add_patch(FancyBboxPatch((0.4, 0.35), 10.55, 0.78, boxstyle="round,pad=0.02,rounding_size=0.06",
                                fc="#fef3c7", ec=AMBER, lw=1.8))
    ax.text(5.7, 0.74, "Rủi ro còn lại: nếu lộ THÊM master key, kẻ tấn công dẫn xuất lại KEK và "
            "giải mã được secret TOTP (xem mục 3.6.1).",
            ha="center", va="center", fontsize=8, color="#92400e", fontweight="bold")
    plt.savefig("../docs/evidence/fig/db-leak.png", dpi=160, bbox_inches="tight"); plt.close()
    print("db-leak.png")


if __name__ == "__main__":
    fig_architecture()
    fig_erd()
    fig_usecase()
    fig_class()
    fig_login_sequence()
    fig_zk_sequence()
    fig_trust_boundary()
    fig_defense_depth()
    fig_db_leak()
    print("DONE")
