# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph
d = Document(r"fileBaoCao/Mẫu ĐATN_2019_version 1_1 (2).docx")
cnt=0
for child in d.element.body.iterchildren():
    if child.tag==qn('w:p'):
        p=Paragraph(child,d)
        if p.style.name in ('Heading 2','Heading 3','Heading 4'):
            pPr=child.find(qn('w:pPr'))
            np = pPr.find(qn('w:numPr')) if pPr is not None else None
            direct=None
            if np is not None:
                nid=np.find(qn('w:numId')); il=np.find(qn('w:ilvl'))
                direct=(il.get(qn('w:val')) if il is not None else None, nid.get(qn('w:val')) if nid is not None else None)
            print(f"[{p.style.name}] '{p.text[:40]}' directNumPr(ilvl,numId)={direct}")
            cnt+=1
    if cnt>=12: break
