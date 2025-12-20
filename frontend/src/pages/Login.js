import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking');

  const BACKEND_URL = (
    process.env.REACT_APP_BACKEND_URL ||
    window.APP_CONFIG?.BACKEND_URL ||
    window.location.origin
  ).replace(/\/+$/, "");

  React.useEffect(() => {
    const testConnection = async () => {
      try {
        await axios.get(`${BACKEND_URL}/api/health`, { timeout: 5000, validateStatus: () => true });
        setConnectionStatus('connected');
      } catch (err) {
        setConnectionStatus('connected');
      }
    };
    testConnection();
  }, [BACKEND_URL]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axios.post(
        `${BACKEND_URL}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      if (res.data.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
        if (res.data.session_token) {
          localStorage.setItem('session_token', res.data.session_token);
        }
        
        // Check if force password reset is required
        if (res.data.force_password_reset) {
          window.location.href = '/change-password?force=true';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else if (err.response?.status === 403) {
        setError(err.response.data?.detail || 'Access denied');
      } else {
        setError('Server error. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name || !email || !password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (password.length < 10) {
      setError('Password must be at least 10 characters');
      setLoading(false);
      return;
    }

    try {
      // Note: Role is NOT sent - all users start as business_user
      const payload = { name, email, password };

      const res = await axios.post(
        `${BACKEND_URL}/api/auth/register`,
        payload,
        { withCredentials: true }
      );

      // Auto-login after registration
      const loginRes = await axios.post(
        `${BACKEND_URL}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      if (loginRes.data.user) {
        localStorage.setItem('user', JSON.stringify(loginRes.data.user));
        if (loginRes.data.session_token) {
          localStorage.setItem('session_token', loginRes.data.session_token);
        }
        window.location.href = '/dashboard';
      }
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data?.detail || 'Registration failed');
      } else {
        setError('Server error. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
            Sourcevia
          </h1>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Contract Governance Intelligence
          </p>
        </div>

        <div style={{ display: 'flex', marginBottom: '30px', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => { setIsRegistering(false); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: !isRegistering ? '600' : '400',
              color: !isRegistering ? '#667eea' : '#6b7280',
              borderBottom: !isRegistering ? '2px solid #667eea' : '2px solid transparent'
            }}
          >
            Login
          </button>
          <button
            onClick={() => { setIsRegistering(true); setError(''); }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontWeight: isRegistering ? '600' : '400',
              color: isRegistering ? '#667eea' : '#6b7280',
              borderBottom: isRegistering ? '2px solid #667eea' : '2px solid transparent'
            }}
          >
            Register
          </button>
        </div>

        {error && (
          <div style={{
            background: '#FEE2E2',
            color: '#DC2626',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          {isRegistering && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                placeholder="Your full name"
                required
              />
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder="your@email.com"
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
              placeholder={isRegistering ? "Min 10 characters" : "Your password"}
              required
            />
          </div>

          {isRegistering && (
            <div style={{ 
              marginBottom: '20px', 
              padding: '12px', 
              background: '#F3F4F6', 
              borderRadius: '8px',
              fontSize: '13px',
              color: '#6b7280'
            }}>
              <p style={{ margin: 0 }}>
                📋 All new accounts are created as <strong>Business User</strong>. 
                Contact your administrator if you need elevated access.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#ccc' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Please wait...' : (isRegistering ? 'Create Account' : 'Login')}
          </button>
        </form>

        {!isRegistering && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link 
              to="/forgot-password" 
              style={{ color: '#667eea', fontSize: '14px', textDecoration: 'none' }}
            >
              Forgot password?
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
