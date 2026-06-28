# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
from docx.table import Table
d = Document(r"fileBaoCao/Mẫu ĐATN_2019_version 1_1 (2).docx")
body = d.element.body
# Print first ~48 block items with index + style + runs' bold/size to understand cover
i=0
for child in body.iterchildren():
    if child.tag == qn('w:p'):
        p = Paragraph(child, d)
        runs_info = []
        for r in p.runs:
            runs_info.append((r.text[:30], r.bold, r.font.size.pt if r.font.size else None))
        print(f"[{i:03d}][{p.style.name}] '{p.text[:50]}'  runs={runs_info}")
    elif child.tag == qn('w:tbl'):
        t = Table(child, d)
        print(f"[{i:03d}][TABLE {len(t.rows)}x{len(t.columns)}]")
    i+=1
    if i>48: break
# also count total sections & where breaks are
print("\nSection count:", len(d.sections))
