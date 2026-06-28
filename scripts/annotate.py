# -*- coding: utf-8 -*-
"""Annotate screenshots with red rectangles / arrows / labels to draw the
reader's eye to the security-relevant parts. Outputs to docs/evidence/fig/."""
from PIL import Image, ImageDraw, ImageFont
import os

RAW = "../docs/evidence/raw"
OUT = "../docs/evidence/fig"
os.makedirs(OUT, exist_ok=True)
RED = (220, 38, 38)

def font(sz):
    for p in [r"C:\Windows\Fonts\arialbd.ttf", r"C:\Windows\Fonts\arial.ttf"]:
        if os.path.exists(p):
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()

def rect(d, box, w=5):
    d.rectangle(box, outline=RED, width=w)

def label(d, xy, text, sz=34, bg=True):
    f = font(sz)
    x, y = xy
    tb = d.textbbox((x, y), text, font=f)
    if bg:
        d.rectangle([tb[0]-8, tb[1]-6, tb[2]+8, tb[3]+6], fill=RED)
    d.text((x, y), text, fill="white", font=f)

def arrow(d, p1, p2, w=5):
    d.line([p1, p2], fill=RED, width=w)
    import math
    ang = math.atan2(p2[1]-p1[1], p2[0]-p1[0])
    L = 22
    for da in (math.radians(155), math.radians(-155)):
        d.line([p2, (p2[0]+L*math.cos(ang+da), p2[1]+L*math.sin(ang+da))], fill=RED, width=w)

# 1) Vault import — highlight "decrypted entirely in your browser"
img = Image.open(f"{RAW}/auth-vault.png").convert("RGB")
d = ImageDraw.Draw(img); W, H = img.size
# the notice line sits ~ y=185/1406 of displayed; raw is 2560x1720 -> scale
sx, sy = W/2000, H/1406
rect(d, [int(440*sx), int(160*sy), int(1980*sx), int(210*sy)], 6)
label(d, (int(440*sx), int(95*sy)), "Giải mã hoàn toàn trên trình duyệt — không gửi lên máy chủ", sz=int(30*sx))
img.save(f"{OUT}/anno-vault-import.png")
print("anno-vault-import.png")

# 2) Vault entries — highlight the OTP badge + masked passwords
img = Image.open(f"{RAW}/auth-vault-entries.png").convert("RGB")
d = ImageDraw.Draw(img); W, H = img.size
sx, sy = W/2296, H/1610
rect(d, [int(675*sx), int(318*sy), int(740*sx), int(360*sy)], 5)   # OTP badge
arrow(d, (int(900*sx), int(250*sy)), (int(740*sx), int(335*sy)))
label(d, (int(760*sx), int(225*sy)), "Nhãn OTP: entry KeePass chứa secret TOTP", sz=int(26*sx))
img.save(f"{OUT}/anno-vault-entries.png")
print("anno-vault-entries.png")

# 3) ZK login — highlight the crypto subtitle line
img = Image.open(f"{RAW}/demo-zklogin.png").convert("RGB")
d = ImageDraw.Draw(img); W, H = img.size
sx, sy = W/2000, H/1344
rect(d, [int(800*sx), int(500*sy), int(1200*sx), int(545*sy)], 5)
label(d, (int(620*sx), int(380*sy)), "Schnorr trên secp256k1 — khóa bí mật không rời thiết bị", sz=int(26*sx))
arrow(d, (int(820*sx), int(430*sy)), (int(980*sx), int(505*sy)))
img.save(f"{OUT}/anno-zklogin.png")
print("anno-zklogin.png")

# 4) Dashboard dark — highlight a countdown + code
img = Image.open(f"{RAW}/auth-dashboard-dark.png").convert("RGB")
d = ImageDraw.Draw(img); W, H = img.size
sx, sy = W/2296, H/1614
rect(d, [int(600*sx), int(175*sy), int(810*sx), int(235*sy)], 5)   # code
label(d, (int(560*sx), int(110*sy)), "Mã TOTP 6 số, tự làm mới mỗi 30s", sz=int(26*sx))
arrow(d, (int(700*sx), int(150*sy)), (int(700*sx), int(180*sy)))
img.save(f"{OUT}/anno-dashboard.png")
print("anno-dashboard.png")
print("DONE")
