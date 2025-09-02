import React from "react";
import ConverterCard from "./components/ConverterCard";
import WordToPdf from "./components/WordToPdf";
import PdfToWord from "./components/PdfToWord";
import ImageToPdf from "./components/ImageToPdf";
import JpegConverter from "./components/JpegConverter";
import "./index.css";

export default function App() {
  return (
    <div className="container">
      <div className="header">
        <div className="logo">UC</div>
        <div>
          <div className="title">Uni Converter</div>
          <div className="small">
            Simple in-browser converters • no login • minimal
          </div>
        </div>
      </div>

      <div className="grid">
        <ConverterCard title="Word → PDF">
          <WordToPdf />
        </ConverterCard>

        <ConverterCard title="PDF → Word">
          <PdfToWord />
        </ConverterCard>

        <ConverterCard title="Image → PDF">
          <ImageToPdf />
        </ConverterCard>

        <ConverterCard title="JPEG ↔ JPG">
          <JpegConverter />
        </ConverterCard>
      </div>

      <div className="footer">
        Tip: For best results use plain-text Word/PDF. Complex documents (layout,
        images) may require server-side conversion.
      </div>
    </div>
  );
}
