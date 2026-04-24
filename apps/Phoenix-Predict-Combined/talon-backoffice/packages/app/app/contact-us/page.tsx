"use client";

import React, { useState } from "react";
import { apiClient } from "../lib/api/client";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function ContactUsPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.post("/api/v1/support/contact", formData);
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to submit contact form",
      );
    } finally {
      setLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "600px",
    margin: "0 auto",
    padding: "40px 20px",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "28px",
    fontWeight: "800",
    color: "#e2e8f0",
    marginBottom: "24px",
    letterSpacing: "-0.02em",
  };

  const formGroupStyle: React.CSSProperties = {
    marginBottom: "20px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: "8px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    fontSize: "14px",
    color: "#e2e8f0",
    backgroundColor: "#0f1225",
    border: "1px solid #1a1f3a",
    borderRadius: "6px",
    boxSizing: "border-box",
    transition: "all 0.3s",
  };

  const textareaStyle: React.CSSProperties = {
    ...inputStyle,
    minHeight: "140px",
    resize: "vertical",
    fontFamily: "inherit",
  };

  const buttonStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 20px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#0f1225",
    backgroundColor: "var(--accent)",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "all 0.3s",
    opacity: loading ? 0.7 : 1,
  };

  const infoBoxStyle: React.CSSProperties = {
    marginTop: "40px",
    padding: "20px",
    backgroundColor: "#0f1225",
    border: "1px solid #1a1f3a",
    borderRadius: "8px",
  };

  const infoTitleStyle: React.CSSProperties = {
    fontSize: "16px",
    fontWeight: "700",
    color: "#e2e8f0",
    marginBottom: "12px",
  };

  const infoItemStyle: React.CSSProperties = {
    fontSize: "14px",
    color: "#D3D3D3",
    marginBottom: "8px",
  };

  return (
    <div style={containerStyle}>
      <style dangerouslySetInnerHTML={{ __html: inputFocusStyles }} />

      <h1 style={titleStyle}>Contact Us</h1>

      {submitted && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            border: "1px solid rgba(34, 197, 94, 0.3)",
            borderRadius: "6px",
            color: "#86efac",
            marginBottom: "24px",
            fontSize: "14px",
          }}
        >
          Your message has been sent successfully. We'll get back to you soon!
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "16px",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "6px",
            color: "#fca5a5",
            marginBottom: "24px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={formGroupStyle}>
          <label htmlFor="name" style={labelStyle}>
            Full Name
          </label>
          <input
            id="name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Your name"
            style={inputStyle}
            className="form-input"
          />
        </div>

        <div style={formGroupStyle}>
          <label htmlFor="email" style={labelStyle}>
            Email Address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            placeholder="your@email.com"
            style={inputStyle}
            className="form-input"
          />
        </div>

        <div style={formGroupStyle}>
          <label htmlFor="subject" style={labelStyle}>
            Subject
          </label>
          <input
            id="subject"
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
            placeholder="What is this about?"
            style={inputStyle}
            className="form-input"
          />
        </div>

        <div style={formGroupStyle}>
          <label htmlFor="message" style={labelStyle}>
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            placeholder="Please tell us more..."
            style={textareaStyle}
            className="form-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={buttonStyle}
          onMouseEnter={(e) => {
            if (!loading) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "#ea580c";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "var(--accent)";
          }}
        >
          {loading ? "Sending..." : "Send Message"}
        </button>
      </form>

      <div style={infoBoxStyle}>
        <div style={infoTitleStyle}>Other Ways to Reach Us</div>
        <div style={infoItemStyle}>
          <strong style={{ color: "#e2e8f0" }}>Email:</strong>{" "}
          support@tayanasportsbook.com
        </div>
        <div style={infoItemStyle}>
          <strong style={{ color: "#e2e8f0" }}>Phone:</strong> 1-800-TAYA-NA
        </div>
        <div style={infoItemStyle}>
          <strong style={{ color: "#e2e8f0" }}>Support Hours:</strong> Monday -
          Friday, 9 AM - 10 PM EST
        </div>
      </div>
    </div>
  );
}

const inputFocusStyles = `
  .form-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(43, 228, 128, 0.1);
  }
`;
