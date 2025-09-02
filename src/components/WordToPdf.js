import React, { useState } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import * as mammoth from "mammoth";

export default function WordToPdf() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState(null);

  function onFile(f) {
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

      // Extract HTML with mammoth (keeps basic formatting)
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
      setProgress(50);

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage();
      const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

      const fontSize = 12;
      let y = page.getHeight() - 40;

      // Split HTML into blocks (<p>, <h1>, etc.)
      const blocks = html.split(/<\/p>|<\/h\d>|<br\s*\/?>/i);

      for (let block of blocks) {
        if (!block.trim()) continue;

        // Detect formatting
        let font = regular;
        let size = fontSize;

        if (block.match(/<strong>|<b>/i)) font = bold;
        if (block.match(/<em>|<i>/i)) font = italic;
        if (block.match(/<h1>/i)) size = 20;
        else if (block.match(/<h2>/i)) size = 16;

        // Remove tags
        const text = block.replace(/<[^>]+>/g, "").trim();

        // Wrap text
        const chunks = text.match(/.{1,90}/g) || [text];
        for (const chunk of chunks) {
          page.drawText(chunk, { x: 40, y, size, font });
          y -= size + 6;
          if (y < 40) {
            page = pdfDoc.addPage();
            y = page.getHeight() - 40;
          }
        }
        y -= size; // paragraph spacing
      }

      const pdfBytes = await pdfDoc.save();
      setProgress(95);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      saveAs(blob, file.name.replace(/\.docx?$/i, "") + ".pdf");
      setProgress(100);
      setMsg({ type: "success", text: "Converted to PDF (with basic formatting). Download started." });
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Conversion failed: " + (err.message || err) });
      setProgress(0);
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="small">Upload a .docx file (with text formatting)</div>
      </div>
      <div style={{ marginTop: 8 }} className="row">
        <input
          type="file"
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => onFile(e.target.files[0])}
        />
        <button className="button" onClick={convert}>
          Convert → PDF
        </button>
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
