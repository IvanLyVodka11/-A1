# -*- coding: utf-8 -*-
"""Open the docx in Word, update all fields (TOC/TOF/captions/pagenums), save, export PDF."""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import win32com.client as win32

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCX = os.path.join(ROOT, "fileBaoCao", "BaoCao_DA1.docx")
PDF = os.path.join(ROOT, "fileBaoCao", "BaoCao_DA1.pdf")

word = win32.DispatchEx("Word.Application")
word.Visible = False
word.DisplayAlerts = False
try:
    doc = word.Documents.Open(DOCX)
    # Update all fields, including in headers/footers and TOC
    word.ActiveDocument.Fields.Update()
    # Update Tables of Contents / Figures explicitly
    for toc in doc.TablesOfContents:
        toc.Update()
    for tof in doc.TablesOfFigures:
        tof.Update()
    # Update fields in story ranges (captions live in body)
    for story in doc.StoryRanges:
        story.Fields.Update()
    # repaginate
    doc.Repaginate()
    pages = doc.ComputeStatistics(2)  # wdStatisticPages
    print("Pages:", pages)
    doc.Save()
    doc.SaveAs(PDF, FileFormat=17)  # wdFormatPDF
    print("PDF exported:", PDF)
    doc.Close(False)
finally:
    word.Quit()
print("DONE")
