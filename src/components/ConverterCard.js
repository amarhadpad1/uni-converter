import React from "react";

export default function ConverterCard({ title, children }) {
  return (
    <div className="card">
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}
