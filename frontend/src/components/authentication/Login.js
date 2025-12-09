import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import "../../css/Login.css";
import nocImage from "../../images/noc.jpg";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");  //Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("http://localhost:5000/auth/login", form);
      localStorage.setItem("token", res.data.token);
      // Persist basic user info for sidebar display
      localStorage.setItem("userEmail", form.email);
      // Redirect to home page after successful login
      navigate("/");
      // Clear form after successful login
      setForm({ email: "", password: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-page">
      <div className="login">
        <h2 className="login-title">Welcome Back</h2>
        <p className="notice">Sign in to your account</p>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form className="form-login" onSubmit={handleSubmit}>
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
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="toggle-mode">
          Don't have an account?{" "}
          <Link to="/register">Sign up</Link>
        </div>
      </div>

      <div
        className="background"
        style={{ backgroundImage: `url(${nocImage})` }}
      >
        <h1>NOC Incident Management System</h1>
        <p>Manage and track network incidents efficiently</p>
      </div>
    </div>
  );
}
