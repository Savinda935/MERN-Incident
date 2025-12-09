import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../../css/Login.css";
import nocImage from "../../images/noc.jpg";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("http://localhost:5000/auth/register", form);
      // Redirect to login page after successful registration
      navigate("/login");
      alert(res.data.message);
      // Clear form after successful registration
      setForm({ name: "", email: "", password: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-page">
      <div className="login">
        <h2 className="login-title">Create Account</h2>
        <p className="notice">Sign up to get started</p>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form className="form-login" onSubmit={handleSubmit}>
          <label htmlFor="name">Full Name</label>
          <div className="input-username">
            <span className="icon">👤</span>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <label htmlFor="email">Email Address</label>
          <div className="input-email">
            <span className="icon">📧</span>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <label htmlFor="password">Password</label>
          <div className="input-password">
            <span className="icon">🔒</span>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <div className="toggle-mode">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </div>
      </div>

      <div
        className="background"
        style={{ backgroundImage: `url(${nocImage})` }}
      >
        <h1>NOC Incident Management System</h1>
        <p>Join us to manage and track network incidents efficiently</p>
      </div>
    </div>
  );
}
