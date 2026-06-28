# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.shared import Pt
d = Document(r"fileBaoCao/Mẫu ĐATN_2019_version 1_1 (2).docx")

def fmt_style(s):
    f = s.font
    pf = s.paragraph_format
    sz = f.size.pt if f.size else None
    nm = f.name
    al = pf.alignment
    ls = pf.line_spacing
    print(f"  [{s.name}] font={nm} size={sz} bold={f.bold} align={al} linespacing={ls} "
          f"space_before={pf.space_before} space_after={pf.space_after}")

print("=== KEY STYLE DETAILS ===")
for nm in ["Normal","Heading 1","Heading 2","Heading 3","Heading 4","Caption","Title","Subtitle","Bibliography"]:
    try: fmt_style(d.styles[nm])
    except Exception as e: print("  ERR", nm, e)

# numbering for Heading 1
print("\n=== Heading1 style XML (numPr/pPr) ===")
h1 = d.styles["Heading 1"]
print(h1.element.xml[:1500])
