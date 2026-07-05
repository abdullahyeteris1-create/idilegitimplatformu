"use client";

import { useEffect, useState } from "react";

export default function DokunmaTestPage() {
  const [jsActive, setJsActive] = useState(false);
  const [count, setCount] = useState(0);
  const [lastAction, setLastAction] = useState("- ");
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setJsActive(true);
      setLastAction("useEffect calisti");
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: 16,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ marginTop: 0 }}>Dokunma Testi (Minimal)</h1>

      <p>1. JS aktif mi? {jsActive ? "evet" : "hayir"}</p>
      <p>2. Count: {count}</p>
      <p>3. Last action: {lastAction}</p>
      <p>4. Input degeri: {inputValue || "-"}</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => {
            setCount((prev) => prev + 1);
            setLastAction("Count arttirildi");
          }}
          style={{
            minHeight: 48,
            padding: "8px 12px",
            cursor: "pointer",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            pointerEvents: "auto",
          }}
        >
          5. Click Test button
        </button>

        <button
          type="button"
          onClick={() => {
            alert("test");
            setLastAction("Alert tetiklendi");
          }}
          style={{
            minHeight: 48,
            padding: "8px 12px",
            cursor: "pointer",
            touchAction: "manipulation",
            WebkitTapHighlightColor: "transparent",
            pointerEvents: "auto",
          }}
        >
          6. Alert Test button
        </button>
      </div>

      <label style={{ display: "block" }}>
        7. Input Test
        <input
          type="text"
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            setLastAction("Input degisti");
          }}
          placeholder="Yazi yazin"
          style={{
            display: "block",
            width: "100%",
            maxWidth: 320,
            minHeight: 48,
            padding: "8px 10px",
            marginTop: 6,
            border: "1px solid #999",
            borderRadius: 6,
            touchAction: "manipulation",
          }}
        />
      </label>
    </main>
  );
}