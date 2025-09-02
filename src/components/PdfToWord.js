import React, {useState} from 'react';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';


// Note: Client-side PDF -> Word uses pdfjs to extract plain text and writes a basic .docx.
// This will capture text but won't preserve complex layout or images. For perfect fidelity, server-side
// tools are required.


export default function PdfToWord(){
const [file, setFile] = useState(null);
const [progress, setProgress] = useState(0);
const [msg, setMsg] = useState(null);


async function convert(){
if(!file){ setMsg({type:'error', text:'Upload a PDF first.'}); return; }
setProgress(10); setMsg(null);
try{
const array = new Uint8Array(await file.arrayBuffer());
setProgress(30);
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
const pdf = await pdfjsLib.getDocument({data:array}).promise;
setProgress(50);
let fullText = '';
for(let i=1;i<=pdf.numPages;i++){
const page = await pdf.getPage(i);
const content = await page.getTextContent();
const strings = content.items.map(it => it.str);
fullText += strings.join(' ') + '\n\n';
setProgress(50 + Math.floor((i/pdf.numPages)*40));
}
// Create a simple .docx
const doc = new Document({
sections: [{
properties: {},
children: fullText.split('\n').map(ln => new Paragraph({children:[new TextRun(ln)]}))
}]
});
setProgress(95);
const blob = await Packer.toBlob(doc);
saveAs(blob, file.name.replace(/\.pdf$/i,'') + '.docx');
setProgress(100);
setMsg({type:'success', text:'PDF text extracted and saved to .docx (download started).'});
}catch(err){
console.error(err);
setMsg({type:'error', text: 'Failed: ' + (err.message||err)});
setProgress(0);
}
}


return (
<div>
<div className="small">Upload a PDF. Text will be extracted and written into a .docx (plain text).</div>
<div style={{marginTop:8}} className="row">
<input type="file" accept="application/pdf" onChange={e=>setFile(e.target.files[0])} />
<button className="button" onClick={convert}>Convert → Word (.docx)</button>
</div>
{progress>0 && <div className="progress"><i style={{width: `${progress}%`}}></i></div>}
{msg && <div className={`message ${msg.type==='success'? 'success':'error'}`}>{msg.text}</div>}
</div>
);
}