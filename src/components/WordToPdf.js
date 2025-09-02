// src/components/WordToPdf.js
import React, { useState } from "react";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { saveAs } from "file-saver";

export default function WordToPdf() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState(null);

  function onFile(f) {
    setFile(f);
    setMsg(null);
  }

  // Wrap text using font metrics so right-edge truncation does not happen
  function wrapText(text, font, fontSize, maxWidth) {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines = [];
    let line = "";

    for (let w of words) {
      if (!w) continue;
      const test = line ? line + " " + w : w;
      if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) {
        line = test;
      } else {
        if (line) lines.push(line);
        // If the single word is longer than a line, hard-split it
        if (font.widthOfTextAtSize(w, fontSize) > maxWidth) {
          let seg = "";
          for (const ch of w) {
            const trySeg = seg + ch;
            if (font.widthOfTextAtSize(trySeg, fontSize) > maxWidth) {
              if (seg) lines.push(seg);
              seg = ch;
            } else {
              seg = trySeg;
            }
          }
          if (seg) {
            line = seg;
          } else {
            line = "";
          }
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
      setMsg({ type: "error", text: "Please upload a .docx file first." });
      return;
    }

    setProgress(5);
    setMsg(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(20);

      // Convert .docx to HTML (keeps headings, lists, paragraphs)
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
      setProgress(40);

      // Parse HTML into ordered blocks (heading, paragraph, list)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html || "", "text/html");
      const bodyNodes = Array.from(doc.body.childNodes || []);
      const blocks = [];

      for (const node of bodyNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const t = node.textContent.trim();
          if (t) blocks.push({ type: "p", text: t });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const tag = node.tagName.toLowerCase();
          if (tag === "p") {
            const text = node.textContent.replace(/\u00A0/g, " ").trim();
            if (text) blocks.push({ type: "p", text });
          } else if (/^h[1-6]$/.test(tag)) {
            const text = node.textContent.replace(/\u00A0/g, " ").trim();
            if (text) blocks.push({ type: "heading", level: parseInt(tag[1], 10), text });
          } else if (tag === "ul" || tag === "ol") {
            const items = Array.from(node.querySelectorAll("li")).map(li =>
              li.textContent.replace(/\u00A0/g, " ").trim()
            ).filter(Boolean);
            if (items.length) blocks.push({ type: "list", ordered: tag === "ol", items });
          } else if (tag === "br") {
            blocks.push({ type: "br" });
          } else {
            // fallback: treat element's text as paragraph
            const text = node.textContent.replace(/\u00A0/g, " ").trim();
            if (text) blocks.push({ type: "p", text });
          }
        }
      }

      setProgress(55);

      // PDF building
      const pdfDoc = await PDFDocument.create();
      const pageWidth = 595.28; // A4-ish width in points
      const pageHeight = 841.89;
      let page = pdfDoc.addPage([pageWidth, pageHeight]);

      const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const margin = 48;
      let cursorY = page.getHeight() - margin;
      let maxTextWidth = page.getWidth() - margin * 2;

      const normalSize = 12;
      const lineGap = 4; // space between lines

      const newPage = () => {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        cursorY = page.getHeight() - margin;
        maxTextWidth = page.getWidth() - margin * 2;
      };

      // Helper to draw a line and handle page breaks
      const drawLine = (text, x, size, font) => {
        const lineHeight = size + lineGap;
        if (cursorY - lineHeight < margin) {
          newPage();
        }
        page.drawText(text, { x, y: cursorY, size, font, color: rgb(0, 0, 0) });
        cursorY -= lineHeight;
      };

      // Render blocks
      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];

        if (b.type === "heading") {
          // add space BEFORE headings only
          cursorY -= 10;
          const size = b.level === 1 ? 20 : b.level === 2 ? 16 : 14;
          const font = helvBold;
          const lines = wrapText(b.text, font, size, maxTextWidth);
          for (const ln of lines) drawLine(ln, margin, size, font);
          // small extra gap after heading so list/para doesn't touch too close
          cursorY -= 6;
        } else if (b.type === "list") {
          // render each list item with bullet and indentation
          for (const item of b.items) {
            const bullet = "•";
            const bulletSize = normalSize;
            const textX = margin + 14; // indent for text
            const bulletX = margin; // bullet position
            const itemLines = wrapText(item, helv, normalSize, maxTextWidth - 14);

            // draw first line with bullet
            if (itemLines.length > 0) {
              // ensure page has space
              if (cursorY - (normalSize + lineGap) < margin) newPage();
              page.drawText(bullet, { x: bulletX, y: cursorY, size: bulletSize, font: helv });
              page.drawText(itemLines[0], { x: textX, y: cursorY, size: normalSize, font: helv });
              cursorY -= normalSize + lineGap;
            }

            // remaining wrapped lines aligned under textX
            for (let k = 1; k < itemLines.length; k++) {
              if (cursorY - (normalSize + lineGap) < margin) newPage();
              page.drawText(itemLines[k], { x: textX, y: cursorY, size: normalSize, font: helv });
              cursorY -= normalSize + lineGap;
            }
          }
        } else if (b.type === "p") {
          // normal paragraph — NO extra spacing between paragraphs (per your request)
          const pLines = wrapText(b.text, helv, normalSize, maxTextWidth);
          for (const ln of pLines) drawLine(ln, margin, normalSize, helv);
        } else if (b.type === "br") {
          // small break
          cursorY -= normalSize;
        } else {
          // fallback: treat as paragraph
          const pLines = wrapText(String(b.text || ""), helv, normalSize, maxTextWidth);
          for (const ln of pLines) drawLine(ln, margin, normalSize, helv);
        }
      }

      setProgress(90);

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      saveAs(blob, file.name.replace(/\.docx?$/i, "") + ".pdf");

      setProgress(100);
      setMsg({ type: "success", text: "Converted to PDF — headings, bullets and wrapping preserved." });
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Conversion failed: " + (err.message || err) });
      setProgress(0);
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="small">Upload a .docx file (headings + bullets supported)</div>
      </div>

      <div style={{ marginTop: 8 }} className="row">
        <input
          type="file"
          accept=".docx, .doc, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
