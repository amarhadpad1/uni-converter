import React, { useState } from 'react';

export default function JpegToJpg() {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState(null);

  async function convert() {
    if (!file) {
      setMsg({ type: 'error', text: 'Upload a JPG/JPEG image first.' });
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

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Export as JPEG binary blob
      const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));

      setProgress(90);

      const name = file.name.replace(/\.(jpe?g)$/i, '') + '.jpg';
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = name;
      link.click();
      URL.revokeObjectURL(link.href);

      setProgress(100);
      setMsg({ type: 'success', text: 'Image re-encoded and downloaded as ' + name });
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'JPEG conversion failed: ' + (err.message || err) });
      setProgress(0);
    }
  }

  return (
    <div>
      <div className="small">
        Upload a JPG/JPEG file. This re-encodes it and triggers a .jpg download (no metadata preserved).
      </div>
      <div style={{ marginTop: 8 }} className="row">
        <input type="file" accept="image/jpeg,image/jpg" onChange={e => setFile(e.target.files[0])} />
        <button className="button" onClick={convert}>Re-encode → JPG</button>
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
