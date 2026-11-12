"use client";
import { useState } from "react";

// Password box with a Show/Hide reveal (what the officer types, visible on demand).
// Purely client-side: the system still never stores or reads the password.
export default function PasswordInput({
  value, onChange, autoComplete, required, minLength, ariaLabel,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  ariaLabel?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        aria-label={ariaLabel}
        style={{ paddingRight: 78 }}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
        style={{
          position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
          border: "none", background: "#f2f6fc", color: "#1c3f6e", font: "inherit",
          fontSize: 12, fontWeight: 700, padding: "5px 10px", borderRadius: 7, cursor: "pointer",
        }}
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
