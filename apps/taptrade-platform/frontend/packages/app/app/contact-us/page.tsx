"use client";

import type React from "react";
import { useState } from "react";
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

  return (
    <div className="mx-auto max-w-[600px] px-5 py-10">
      <h1 className="mb-6 text-[28px] font-extrabold tracking-normal text-[var(--t1)]">
        Contact Us
      </h1>

      {submitted && (
        <div className="mb-6 rounded-md border border-[rgba(34,197,94,0.3)] bg-[rgba(34,197,94,0.1)] p-4 text-sm text-[#86efac]">
          Your message has been sent successfully. We'll get back to you soon!
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-md border border-[rgba(255,155,107,0.3)] bg-[rgba(255,155,107,0.1)] p-4 text-sm text-[#fca5a5]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-[var(--t2)]"
          >
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
            className="box-border w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.22)] px-3.5 py-3 text-sm text-[var(--t1)] transition-all duration-300 focus:border-[var(--accent)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(43,228,128,0.1)]"
          />
        </div>

        <div className="mb-5">
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-[var(--t2)]"
          >
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
            className="box-border w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.22)] px-3.5 py-3 text-sm text-[var(--t1)] transition-all duration-300 focus:border-[var(--accent)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(43,228,128,0.1)]"
          />
        </div>

        <div className="mb-5">
          <label
            htmlFor="subject"
            className="mb-2 block text-sm font-semibold text-[var(--t2)]"
          >
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
            className="box-border w-full rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.22)] px-3.5 py-3 text-sm text-[var(--t1)] transition-all duration-300 focus:border-[var(--accent)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(43,228,128,0.1)]"
          />
        </div>

        <div className="mb-5">
          <label
            htmlFor="message"
            className="mb-2 block text-sm font-semibold text-[var(--t2)]"
          >
            Message
          </label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            required
            placeholder="Please tell us more..."
            className="box-border min-h-[140px] w-full resize-y rounded-md border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.22)] px-3.5 py-3 font-[inherit] text-sm text-[var(--t1)] transition-all duration-300 focus:border-[var(--accent)] focus:outline-none focus:shadow-[0_0_0_3px_rgba(43,228,128,0.1)]"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full cursor-pointer rounded-md border-0 bg-[var(--accent)] px-5 py-3 text-[15px] font-semibold text-[rgba(0,0,0,0.22)] transition-all duration-300 hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? "Sending..." : "Send Message"}
        </button>
      </form>

      <div className="mt-10 rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.22)] p-5">
        <div className="mb-3 text-base font-bold text-[var(--t1)]">
          Other Ways to Reach Us
        </div>
        <div className="mb-2 text-sm text-[#D3D3D3]">
          <strong className="text-[var(--t1)]">Email:</strong>{" "}
          support@taptrade.com
        </div>
        <div className="mb-2 text-sm text-[#D3D3D3]">
          <strong className="text-[var(--t1)]">Phone:</strong> 1-800-TAPTRADE
        </div>
        <div className="mb-2 text-sm text-[#D3D3D3]">
          <strong className="text-[var(--t1)]">Support Hours:</strong> Monday -
          Friday, 9 AM - 10 PM EST
        </div>
      </div>
    </div>
  );
}
