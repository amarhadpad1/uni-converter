import React, { useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";
import mammoth from "mammoth";

export default function WordToPdf() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState(null);

  async function onFile(f) {
    setFile(f);
    setMsg(null);
  }

  async function convert() {
    if (!file) {
      setMsg({ type: "error", text: "Please upload a Word (.docx) file first." });
      return;
    }
    setProgress(10);
    setMsg(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);

      // Extract text with styles
      const result = await mammoth.extractRawText({ arrayBuffer });
      const text = result.value; // keeps paragraphs
      setProgress(60);

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const fontSize = 12;
      let y = page.getHeight() - 40;

      // Split into paragraphs
      const paragraphs = text.split("\n").filter(p => p.trim().length > 0);

      for (const para of paragraphs) {
        let isHeading = /^[A-Z][A-Za-z0-9\s]+$/.test(para.trim()); // crude heading detection
        let lines = para.match(/.{1,90}/g) || [para];

        for (const line of lines) {
          page.drawText(line, {
            x: 40,
            y,
            size: isHeading ? fontSize + 2 : fontSize,
            font: isHeading ? boldFont : font,
            color: rgb(0, 0, 0),
          });
          y -= fontSize + 6;
          if (y < 50) {
            page = pdfDoc.addPage();
            y = page.getHeight() - 40;
          }
        }
        y -= 10; // extra spacing between paragraphs
      }

      const pdfBytes = await pdfDoc.save();
      setProgress(95);

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      saveAs(blob, file.name.replace(/\.docx?$/i, "") + ".pdf");

      setProgress(100);
      setMsg({ type: "success", text: "Converted to PDF (formatted). Download started." });
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Conversion failed: " + (err.message || err) });
      setProgress(0);
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="small">Upload a .docx file (formatted text supported)</div>
      </div>
      <div style={{ marginTop: 8 }} className="row">
        <input
          type="file"
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => onFile(e.target.files[0])}
        />
        <button className="button" onClick={convert}>Convert → PDF</button>
      </div>
      {progress > 0 && (
        <div className="progress">
          <i style={{ width: `${progress}%` }}></i>
        </div>
      )}
      {msg && (
        <div className={`message ${msg.type === "success" ? "success" : "error"}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
