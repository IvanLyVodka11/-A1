# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
d = Document(r"fileBaoCao/Mẫu ĐATN_2019_version 1_1 (2).docx")
body = d.element.body

def instr_of(el):
    return " ".join((e.text or "") for e in el.findall('.//'+qn('w:instrText')))

seen={'fig':0,'tbl':0,'toc':0,'tof':0}
for child in body.iterchildren():
    if child.tag != qn('w:p'): continue
    p = Paragraph(child, d)
    instr = instr_of(child)
    if 'SEQ H' in instr and seen['fig']<1:
        print("### FIGURE CAPTION  style=", p.style.name, "INSTR=",instr); print(child.xml); print("\n@@@\n"); seen['fig']+=1
    if 'SEQ B' in instr and seen['tbl']<1:
        print("### TABLE CAPTION  style=", p.style.name, "INSTR=",instr); print(child.xml); print("\n@@@\n"); seen['tbl']+=1
    if 'TOC ' in instr and '\c' not in instr and seen['toc']<1:
        print("### TOC FIELD  style=", p.style.name, "INSTR=",instr); print(child.xml[:1400]); print("\n@@@\n"); seen['toc']+=1
    if 'TOC' in instr and '"H' in instr and seen['tof']<1:
        print("### TOF FIELD  style=", p.style.name, "INSTR=",instr); print(child.xml[:1400]); print("\n@@@\n"); seen['tof']+=1
