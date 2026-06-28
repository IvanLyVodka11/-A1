# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
from docx import Document
from docx.oxml.ns import qn
d = Document(r"fileBaoCao/Mẫu ĐATN_2019_version 1_1 (2).docx")
for nm in ["Heading 1","Heading 2","Heading 3","Heading 4"]:
    s = d.styles[nm]
    numPr = s.element.find(qn('w:pPr')+'/'+qn('w:numPr')) if s.element.find(qn('w:pPr')) is not None else None
    # find numPr deeper
    pPr = s.element.find(qn('w:pPr'))
    numId = None; ilvl=None
    if pPr is not None:
        np = pPr.find(qn('w:numPr'))
        if np is not None:
            nid = np.find(qn('w:numId')); il = np.find(qn('w:ilvl'))
            numId = nid.get(qn('w:val')) if nid is not None else None
            ilvl = il.get(qn('w:val')) if il is not None else None
    print(f"{nm}: numId={numId} ilvl={ilvl}")

# Inspect numbering.xml: which abstractNum does numId 13 map to, and its levels
from docx.oxml.ns import nsmap
try:
    numbering = d.part.numbering_part.element
    import re
    xml = numbering.xml
    # find num with numId 13
    m = re.search(r'<w:num w:numId="13"[^>]*>.*?<w:abstractNumId w:val="(\d+)"', xml, re.S)
    print("numId 13 -> abstractNumId", m.group(1) if m else "?")
    if m:
        absid = m.group(1)
        am = re.search(r'<w:abstractNum w:abstractNumId="'+absid+'".*?</w:abstractNum>', xml, re.S)
        if am:
            block = am.group(0)
            for lvl in re.findall(r'<w:lvl w:ilvl="(\d)".*?<w:lvlText w:val="([^"]*)".*?(?:<w:pStyle w:val="([^"]*)")?', block[:4000], re.S):
                print("  lvl", lvl[0], "text=", repr(lvl[1]), "pStyle=", lvl[2])
except Exception as e:
    print("numbering err", e)
