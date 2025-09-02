import React, { useState } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { saveAs } from "file-saver";
import * as mammoth from "mammoth";

// Word → PDF with proper wrapping, paragraph spacing, and entity decoding.
// Note: This is still text-focused (no tables/images). For Adobe-level fidelity,
// you'd need a server-side converter (e.g., LibreOffice/MS Office/Aspose).

export default function WordToPdf() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState(null);

  function onFile(f) {
    setFile(f);
    setMsg(null);
  }

  // Robust text wrapping using actual font metrics
  function wrapText(text, font, fontSize, maxWidth) {
    const words = (text || "").split(/\s+/);
    const lines = [];
    let line = "";

    const measure = (s) => font.widthOfTextAtSize(s, fontSize);

    for (let w of words) {
      if (!w) continue;
      const test = line ? line + " " + w : w;
      if (measure(test) <= maxWidth) {
        line = test;
      } else {
        // Push current line
        if (line) lines.push(line);
        // If the single word is longer than the line, hard-split it
        if (measure(w) > maxWidth) {
          let seg = "";
          for (const ch of w) {
            const trySeg = seg + ch;
            if (measure(trySeg) > maxWidth) {
              if (seg) lines.push(seg);
              seg = ch;
            } else {
              seg = trySeg;
            }
          }
          line = seg; // leftover
        } else {
          line = w;
        }
      }
    }
    if (line) lines.push(line);
    return lines;
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

      // Prefer HTML (keeps headings/paragraphs); fallback to raw text.
      let blocks = [];
      try {
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
        setProgress(50);
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Collect readable blocks in order
        const nodes = Array.from(doc.querySelectorAll("h1,h2,h3,p,li"));
        if (nodes.length) {
          for (const node of nodes) {
            const tag = node.tagName.toLowerCase();
            let text = node.textContent || "";
            text = text.replace(/\u00A0/g, " ").trim(); // nbsp → space
            if (!text) continue;
            // Basic bullet for list items
            if (tag === "li") text = "• " + text;
            blocks.push({ type: tag, text });
          }
        }
      } catch {
        /* ignore and fallback below */
      }

      // Fallback: raw text paragraphs
      if (blocks.length === 0) {
        const { value } = await mammoth.extractRawText({ arrayBuffer });
        const paras = (value || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
        blocks = paras.map((p) => ({ type: "p", text: p }));
      }

      setProgress(60);

      // Build PDF
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage(); // default size (Letter). Change if you prefer A4.
      const reg = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Page geometry
      const margin = 40;
      const resetPageMetrics = () => {
        const w = page.getWidth();
        const h = page.getHeight();
        return {
          maxWidth: w - margin * 2,
          cursorY: h - margin,
          width: w,
          height: h,
        };
      };
      let { maxWidth, cursorY, height } = resetPageMetrics();

      const drawParagraph = (text, opts) => {
        const { font, size, lineGap, paraGap } = opts;
        const lines = wrapText(text, font, size, maxWidth);

        for (const ln of lines) {
          // New page if needed
          if (cursorY - (size + lineGap) < margin) {
            page = pdfDoc.addPage();
            ({ maxWidth, cursorY, height } = resetPageMetrics());
          }
          page.drawText(ln, { x: margin, y: cursorY, size, font });
          cursorY -= size + lineGap;
        }
        cursorY -= paraGap; // extra space between paragraphs
      };

      // Render blocks with simple hierarchy
      for (const block of blocks) {
        if (block.type === "h1") {
          drawParagraph(block.text, { font: bold, size: 20, lineGap: 6, paraGap: 10 });
        } else if (block.type === "h2") {
          drawParagraph(block.text, { font: bold, size: 16, lineGap: 6, paraGap: 8 });
        } else if (block.type === "h3") {
          drawParagraph(block.text, { font: bold, size: 14, lineGap: 5, paraGap: 6 });
        } else if (block.type === "li") {
          drawParagraph(block.text, { font: reg, size: 12, lineGap: 4, paraGap: 2 });
        } else {
          drawParagraph(block.text, { font: reg, size: 12, lineGap: 4, paraGap: 8 });
        }
      }

      const pdfBytes = await pdfDoc.save();
      setProgress(95);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      saveAs(blob, file.name.replace(/\.docx?$/i, "") + ".pdf");
      setProgress(100);
      setMsg({ type: "success", text: "Converted to PDF (clean paragraphs & wrapping). Download started." });
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Conversion failed: " + (err.message || err) });
      setProgress(0);
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="small">Upload a .docx file. Text will keep paragraphs and wrap correctly.</div>
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
        <div className="progress"><i style={{ width: `${progress}%` }}></i></div>
      )}
      {msg && (
        <div className={`message ${msg.type === "success" ? "success" : "error"}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
