# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.oxml.ns import qn
d = Document(r"fileBaoCao/Mẫu ĐATN_2019_version 1_1 (2).docx")

# aliases
for nm in ["Heading 2","Heading 3","Heading 4"]:
    s = d.styles[nm]
    al = s.element.find(qn('w:aliases'))
    alv = al.get(qn('w:val')) if al is not None else None
    print(f"alias[{nm}] = {alv}")

# docDefaults font
import re
part = d.part
styles_xml = d.styles.element.xml
m = re.search(r'<w:docDefaults>.*?</w:docDefaults>', styles_xml, re.S)
print("\n=== docDefaults ===")
print(m.group(0)[:900] if m else "none")

print("\n=== BODY: iterate block items (P style :: text | TABLE rows) ===")
from docx.table import Table
from docx.text.paragraph import Paragraph
body = d.element.body
i=0
for child in body.iterchildren():
    if child.tag == qn('w:p'):
        p = Paragraph(child, d)
        st = p.style.name
        txt = p.text.strip()
        # detect field codes (captions SEQ)
        flds = child.findall('.//'+qn('w:instrText'))
        fld = " ".join(f.text for f in flds if f.text) if flds else ""
        # detect pageBreak
        if txt or fld or st not in ('Normal',):
            line = f"[{i:03d}][{st}] {txt[:75]}"
            if fld: line += f"  <FLD:{fld[:40]}>"
            print(line)
        i+=1
    elif child.tag == qn('w:tbl'):
        t = Table(child, d)
        rows = len(t.rows); cols = len(t.columns)
        first = " | ".join(c.text.strip()[:18] for c in t.rows[0].cells)
        print(f"[{i:03d}][TABLE {rows}x{cols}] row0: {first}")
        i+=1
