import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // checking, connected, error

  // Get backend URL with proper fallback and remove trailing slashes
  const BACKEND_URL = (
    window.APP_CONFIG?.BACKEND_URL ||
    process.env.REACT_APP_BACKEND_URL ||
    "https://sourcevia-secure.emergent.host"
  ).replace(/\/+$/, "");

  const API_URL = BACKEND_URL;

  // Test backend connection on mount
  React.useEffect(() => {
    console.log('🔧 Login Page Loaded');
    console.log('  Backend URL:', API_URL);
    console.log('  process.env.REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
    console.log('  window.location.origin:', window.location.origin);
    
    // Test connection
    const testConnection = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/auth/login`, {
          timeout: 5000,
          validateStatus: () => true // Accept any status
        });
        
        console.log('✅ Backend is reachable!');
        setConnectionStatus('connected');
      } catch (err) {
        console.warn('⚠️ Backend connection test failed, but will still try to login:', err.message);
        setConnectionStatus('connected'); // Don't block login, just log warning
      }
    };
    
    testConnection();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const loginUrl = `${BACKEND_URL.replace(/\/+$/, "")}/api/auth/login`;
    
    console.log('🔐 Attempting login...');
    console.log('  Full URL:', loginUrl);
    console.log('  Backend:', BACKEND_URL);
    console.log('  Email:', email);

    // Validation check
    if (loginUrl.includes('REACT_APP_BACKEND_URL=')) {
      setError('Configuration error: Backend URL is malformed. Please contact support.');
      setLoading(false);
      console.error('❌ Malformed URL detected:', loginUrl);
      return;
    }

    try {
      const response = await axios.post(loginUrl, 
        { email, password },
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      console.log('✅ Login successful!', response.data);
      
      if (response.data.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Force page reload to trigger auth check
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('❌ Login error:', err);
      
      // Better error messages
      let errorMessage = '';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = 'Connection error. Please check your internet connection.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else {
        errorMessage = 'Login failed. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!name || !email || !password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const registerUrl = `${BACKEND_URL.replace(/\/+$/, "")}/api/auth/register`;
    
    console.log('📝 Attempting registration...');
    console.log('  Full URL:', registerUrl);
    console.log('  Backend:', BACKEND_URL);
    console.log('  Name:', name);
    console.log('  Email:', email);
    console.log('  Role:', role);

    // Validation check
    if (registerUrl.includes('REACT_APP_BACKEND_URL=')) {
      setError('Configuration error: Backend URL is malformed. Please contact support.');
      setLoading(false);
      console.error('❌ Malformed URL detected:', registerUrl);
      return;
    }

    try {
      const response = await axios.post(registerUrl,
        { name, email, password, role },
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );

      console.log('✅ Registration successful!', response.data);

      // Auto-login after registration
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`,
        { email, password },
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (loginResponse.data.user) {
        localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
        // Force page reload to trigger auth check
        window.location.href = '/dashboard';
      }
    } catch (err) {
      console.error('❌ Registration error:', err);
      
      // Better error messages
      let errorMessage = '';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        errorMessage = 'Connection error. Please check your internet connection.';
      } else if (err.response?.status === 400 && err.response?.data?.detail === 'User already exists') {
        errorMessage = 'This email is already registered. Please login instead.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else {
        errorMessage = 'Registration failed. Please try again.';
      }
      
      setError(errorMessage);
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
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        maxWidth: '450px',
        width: '100%',
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            background: '#667eea',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '15px'
          }}>S</div>
          <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', color: '#333' }}>Sourcevia</h1>
          <p style={{ color: '#666', fontSize: '14px' }}>Procurement Management</p>
        </div>

        {/* Tab Buttons */}
        <div style={{
          display: 'flex',
          background: '#f5f5f5',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '30px'
        }}>
          <button
            type="button"
            onClick={() => setIsRegistering(false)}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: !isRegistering ? 'white' : 'transparent',
              color: !isRegistering ? '#667eea' : '#666',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: !isRegistering ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setIsRegistering(true)}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              borderRadius: '6px',
              background: isRegistering ? 'white' : 'transparent',
              color: isRegistering ? '#667eea' : '#666',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: isRegistering ? '0 2px 4px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            Register
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '12px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
            fontSize: '14px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {/* Form */}
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
                placeholder="Enter your full name"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
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
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px'
              }}
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
              placeholder={isRegistering ? 'Minimum 6 characters' : 'Your password'}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              required
            />
          </div>

          {isRegistering && (
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              >
                <option value="admin">Admin</option>
                <option value="procurement_manager">Procurement Manager</option>
                <option value="procurement_officer">Procurement Officer</option>
                <option value="user">User</option>
              </select>
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

        {/* Debug Info */}
        <div style={{
          marginTop: '20px',
          padding: '10px',
          background: '#f9f9f9',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#666'
        }}>
          <strong>Debug Info:</strong><br/>
          Backend: {API_URL}
        </div>
      </div>
    </div>
  );
};

export default Login;
