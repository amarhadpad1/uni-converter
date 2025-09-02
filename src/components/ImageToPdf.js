import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

export default function ImageToPdf() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState(null);

  async function convert() {
    if (!file) {
      setMsg({ type: 'error', text: 'Please upload an image file first.' });
      return;
    }
    setProgress(10);
    setMsg(null);
    try {
      const dataUrl = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result);
        reader.onerror = rej;
        reader.readAsDataURL(file);
      });
      setProgress(40);
      const img = new Image();
      img.src = dataUrl;
      await new Promise(r => img.onload = r);
      setProgress(60);
      const pdf = new jsPDF({ unit: 'pt', format: [img.width, img.height] });
      pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
      setProgress(90);
      const blob = pdf.output('blob');
      saveAs(blob, file.name.replace(/\.[^/.]+$/, '') + '.pdf');
      setProgress(100);
      setMsg({ type: 'success', text: 'Image converted to PDF. Download started.' });
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Image → PDF failed: ' + (err.message || err) });
      setProgress(0);
    }
  }

  return (
    <div>
      <div className="small">
        Upload PNG / JPG / JPEG / GIF — will be embedded into a PDF page of same dimensions.
      </div>
      <div style={{ marginTop: 8 }} className="row">
        <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
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
