import React from 'react';


// Generic file uploader - receives props to control accepted file types and callbacks
export default function FileUploader({accept = '*/*', onFile, label = 'Choose file'}){
function handleChange(e){
const f = e.target.files && e.target.files[0];
if(f) onFile(f);
}
return (
<label className="row" style={{gap:10}}>
<input type="file" accept={accept} onChange={handleChange} style={{display:'none'}} />
<button type="button" className="button secondary" onClick={() => document.querySelector('input[accept="'+accept+'"]')?.click()}>{label}</button>
</label>
);
}