import React, { useState } from 'react';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';

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
      setMsg({ type: 'error', text: 'Please upload a Word (.docx) file first.' });
      return;
    }
    setProgress(10);
    setMsg(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);

      // Load zip and extract text from word/document.xml
      const zip = await import('jszip');
      const JSZip = zip.default || zip;
      const z = await JSZip.loadAsync(arrayBuffer);
      const docXml = await z.file('word/document.xml').async('string');
      const text = docXml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      setProgress(60);

      // Create PDF
      const pdfDoc = await PDFDocument.create();
      let page = pdfDoc.addPage(); // changed to let
      const timesRomanFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      const lines = text.match(/.{1,900}/g) || [text];
      let y = page.getHeight() - 40;

      for (const line of lines) {
        page.drawText(line, { x: 40, y, size: fontSize, font: timesRomanFont });
        y -= fontSize + 6;
        if (y < 40) {
          page = pdfDoc.addPage(); // works now
          y = page.getHeight() - 40;
        }
      }

      const pdfBytes = await pdfDoc.save();
      setProgress(95);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      saveAs(blob, file.name.replace(/\.docx?$/i, '') + '.pdf');
      setProgress(100);
      setMsg({ type: 'success', text: 'Converted to PDF (plain-text). Download started.' });
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Conversion failed: ' + (err.message || err) });
      setProgress(0);
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="small">Upload a .docx file (text-based)</div>
      </div>
      <div style={{ marginTop: 8 }} className="row">
        <input
          type="file"
          accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={e => onFile(e.target.files[0])}
        />
        <button className="button" onClick={convert}>Convert → PDF</button>
      </div>
      {progress > 0 && (
        <div className="progress">
          <i style={{ width: `${progress}%` }}></i>
        </div>
      )}
      {msg && (
        <div className={`message ${msg.type === 'success' ? 'success' : 'error'}`}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
