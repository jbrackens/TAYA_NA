"use client";

import { useState } from "react";
import Link from "next/link";
import { register as registerUser } from "../../lib/api";

interface FormData {
  // Step 1: Account
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Step 2: Personal
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  // Step 3: Address
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  // Step 4: Terms
  acceptTerms: boolean;
}

interface Errors {
  [key: string]: string;
}

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    acceptTerms: false,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validateStep1 = (): boolean => {
    const newErrors: Errors = {};

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Errors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Errors = {};

    if (!formData.street.trim()) {
      newErrors.street = "Street address is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required";
    }

    if (!formData.zip.trim()) {
      newErrors.zip = "ZIP code is required";
    }

    if (!formData.country.trim()) {
      newErrors.country = "Country is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep4 = (): boolean => {
    const newErrors: Errors = {};

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = validateStep1();
    } else if (currentStep === 2) {
      isValid = validateStep2();
    } else if (currentStep === 3) {
      isValid = validateStep3();
    } else if (currentStep === 4) {
      isValid = validateStep4();
    }

    if (isValid) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateStep4()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await registerUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone: formData.phone,
        date_of_birth: formData.dateOfBirth,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country,
        },
      });

      setSuccessMessage(
        "Account created successfully! Redirecting to login...",
      );
      setTimeout(() => {
        window.location.href = "/auth/login";
      }, 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorMessage(message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    marginBottom: "16px",
    backgroundColor: "#0a0f1d",
    border: "1px solid #1a1f3a",
    borderRadius: "4px",
    color: "#e2e8f0",
    fontSize: "14px",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const errorStyle: React.CSSProperties = {
    color: "#ef4444",
    fontSize: "12px",
    marginTop: "-12px",
    marginBottom: "12px",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 16px",
    backgroundColor: "#39ff14",
    border: "none",
    color: "#ffffff",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.2s ease",
  };

  const secondaryButtonStyle: React.CSSProperties = {
    padding: "10px 16px",
    backgroundColor: "#0f3460",
    border: "1px solid #1a1f3a",
    color: "#a0a0a0",
    borderRadius: "4px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.2s ease",
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "500px",
          padding: "40px",
          backgroundColor: "#0f1225",
          border: "1px solid #1a1f3a",
          borderRadius: "8px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          <h1
            style={{
              margin: "0 0 8px 0",
              fontSize: "28px",
              fontWeight: 700,
              color: "#ffffff",
            }}
          >
            Create Account
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              color: "#a0a0a0",
            }}
          >
            Step {currentStep} of 4
          </p>
        </div>

        {/* Progress bar */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "32px",
          }}
        >
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              style={{
                flex: 1,
                height: "4px",
                backgroundColor: step <= currentStep ? "#39ff14" : "#1a1f3a",
                borderRadius: "2px",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Error and Success Messages */}
        {errorMessage && (
          <div
            style={{
              padding: "12px",
              marginBottom: "20px",
              backgroundColor: "#7f1d1d",
              border: "1px solid #991b1b",
              borderRadius: "4px",
              color: "#fca5a5",
              fontSize: "13px",
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: "12px",
              marginBottom: "20px",
              backgroundColor: "#064e3b",
              border: "1px solid #047857",
              borderRadius: "4px",
              color: "#86efac",
              fontSize: "13px",
            }}
          >
            {successMessage}
          </div>
        )}

        {/* Step 1: Account */}
        {currentStep === 1 && (
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              placeholder="Choose a username"
              style={inputStyle}
            />
            {errors.username && <div style={errorStyle}>{errors.username}</div>}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your@email.com"
              style={inputStyle}
            />
            {errors.email && <div style={errorStyle}>{errors.email}</div>}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="At least 8 characters"
              style={inputStyle}
            />
            {errors.password && <div style={errorStyle}>{errors.password}</div>}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your password"
              style={inputStyle}
            />
            {errors.confirmPassword && (
              <div style={errorStyle}>{errors.confirmPassword}</div>
            )}
          </div>
        )}

        {/* Step 2: Personal */}
        {currentStep === 2 && (
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="First name"
              style={inputStyle}
            />
            {errors.firstName && (
              <div style={errorStyle}>{errors.firstName}</div>
            )}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="Last name"
              style={inputStyle}
            />
            {errors.lastName && <div style={errorStyle}>{errors.lastName}</div>}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Date of Birth
            </label>
            <input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              style={inputStyle}
            />
            {errors.dateOfBirth && (
              <div style={errorStyle}>{errors.dateOfBirth}</div>
            )}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Your phone number"
              style={inputStyle}
            />
            {errors.phone && <div style={errorStyle}>{errors.phone}</div>}
          </div>
        )}

        {/* Step 3: Address */}
        {currentStep === 3 && (
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Street Address
            </label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleInputChange}
              placeholder="123 Main Street"
              style={inputStyle}
            />
            {errors.street && <div style={errorStyle}>{errors.street}</div>}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              placeholder="City"
              style={inputStyle}
            />
            {errors.city && <div style={errorStyle}>{errors.city}</div>}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              State
            </label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              placeholder="State"
              style={inputStyle}
            />
            {errors.state && <div style={errorStyle}>{errors.state}</div>}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              ZIP Code
            </label>
            <input
              type="text"
              name="zip"
              value={formData.zip}
              onChange={handleInputChange}
              placeholder="ZIP code"
              style={inputStyle}
            />
            {errors.zip && <div style={errorStyle}>{errors.zip}</div>}

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                color: "#e2e8f0",
                fontSize: "14px",
                fontWeight: 600,
              }}
            >
              Country
            </label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              placeholder="Country"
              style={inputStyle}
            />
            {errors.country && <div style={errorStyle}>{errors.country}</div>}
          </div>
        )}

        {/* Step 4: Review & Terms */}
        {currentStep === 4 && (
          <div>
            <div
              style={{
                backgroundColor: "#0a0f1d",
                border: "1px solid #1a1f3a",
                borderRadius: "4px",
                padding: "16px",
                marginBottom: "20px",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px 0",
                  color: "#e2e8f0",
                  fontSize: "16px",
                  fontWeight: 600,
                }}
              >
                Terms and Conditions
              </h3>
              <p
                style={{
                  margin: "0 0 12px 0",
                  color: "#a0a0a0",
                  fontSize: "13px",
                }}
              >
                By creating an account, you agree to our Terms and Conditions
                and Privacy Policy. You must be at least 18 years old to use
                this platform.
              </p>
              <p
                style={{
                  margin: "0 0 12px 0",
                  color: "#a0a0a0",
                  fontSize: "13px",
                }}
              >
                You agree to provide accurate and complete information during
                registration and to keep your account information up to date.
              </p>
              <p
                style={{
                  margin: "0 0 12px 0",
                  color: "#a0a0a0",
                  fontSize: "13px",
                }}
              >
                TAYA NA! is committed to responsible gambling. If you
                experience gambling-related problems, please contact our
                support team.
              </p>
              <p style={{ margin: 0, color: "#a0a0a0", fontSize: "13px" }}>
                For full terms, please visit our website.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <input
                type="checkbox"
                name="acceptTerms"
                id="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleInputChange}
                style={{
                  width: "18px",
                  height: "18px",
                  marginRight: "12px",
                  cursor: "pointer",
                }}
              />
              <label
                htmlFor="acceptTerms"
                style={{
                  color: "#e2e8f0",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                I agree to the Terms and Conditions
              </label>
            </div>
            {errors.acceptTerms && (
              <div style={errorStyle}>{errors.acceptTerms}</div>
            )}

            <div
              style={{
                backgroundColor: "#0a0f1d",
                border: "1px solid #1a1f3a",
                borderRadius: "4px",
                padding: "12px",
                marginBottom: "20px",
              }}
            >
              <p style={{ margin: 0, color: "#a0a0a0", fontSize: "12px" }}>
                <strong style={{ color: "#e2e8f0" }}>Account Summary:</strong>
              </p>
              <p
                style={{ margin: "4px 0", color: "#a0a0a0", fontSize: "12px" }}
              >
                Username: {formData.username}
              </p>
              <p
                style={{ margin: "4px 0", color: "#a0a0a0", fontSize: "12px" }}
              >
                Email: {formData.email}
              </p>
              <p
                style={{ margin: "4px 0", color: "#a0a0a0", fontSize: "12px" }}
              >
                Name: {formData.firstName} {formData.lastName}
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "32px",
          }}
        >
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            style={{
              ...secondaryButtonStyle,
              opacity: currentStep === 1 ? 0.5 : 1,
              cursor: currentStep === 1 ? "not-allowed" : "pointer",
              flex: 1,
            }}
            onMouseEnter={(e) => {
              if (currentStep > 1) {
                e.currentTarget.style.backgroundColor = "#1a2a4a";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0f3460";
            }}
          >
            Previous
          </button>
          <button
            onClick={currentStep === 4 ? handleSubmit : handleNext}
            disabled={isLoading}
            style={{
              ...buttonStyle,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
              flex: 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = "#ea580c";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#39ff14";
            }}
          >
            {isLoading
              ? "Processing..."
              : currentStep === 4
                ? "Create Account"
                : "Next"}
          </button>
        </div>

        {/* Login Link */}
        <div
          style={{
            textAlign: "center",
            marginTop: "20px",
            color: "#a0a0a0",
            fontSize: "14px",
          }}
        >
          Already have an account?
          <Link
            href="/auth/login"
            style={{
              color: "#39ff14",
              textDecoration: "none",
              fontWeight: 600,
              marginLeft: "4px",
            }}
          >
            Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
}
