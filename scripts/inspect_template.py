# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.enum.style import WD_STYLE_TYPE

p = r"fileBaoCao/Mẫu ĐATN_2019_version 1_1 (2).docx"
d = Document(p)

print("=== PARAGRAPH STYLES ===")
for s in d.styles:
    try:
        if s.type == WD_STYLE_TYPE.PARAGRAPH:
            base = s.base_style.name if s.base_style else "-"
            print(f"  [{s.name}] base={base} builtin={s.builtin}")
    except Exception as e:
        pass

print("\n=== CHARACTER/TABLE STYLES (names) ===")
for s in d.styles:
    try:
        if s.type in (WD_STYLE_TYPE.CHARACTER, WD_STYLE_TYPE.TABLE, WD_STYLE_TYPE.LIST):
            print(f"  ({s.type}) [{s.name}]")
    except Exception:
        pass

print("\n=== ALL PARAGRAPHS USED-STYLES histogram + samples ===")
from collections import Counter, defaultdict
c = Counter(); samp = defaultdict(list)
for para in d.paragraphs:
    n = para.style.name
    c[n]+=1
    t = para.text.strip()
    if t and len(samp[n])<2:
        samp[n].append(t[:60])
for name,cnt in c.most_common():
    print(f"  [{name}] x{cnt}  e.g. {samp[name]}")
