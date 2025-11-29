import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import axios from 'axios';
import { API_URL } from '../config/api';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('🔐 Attempting login to:', `${API_URL}/auth/login`);
    console.log('📧 Email:', formData.email);

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email,
        password: formData.password
      }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('✅ Login successful:', response.data);

      if (response.data.user) {
        // Store user info if needed
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Navigate to dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('❌ Login error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      
      if (err.response?.status === 401) {
        setError('Invalid email or password');
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Cannot connect to server. Please check your internet connection or try again later.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.detail || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.name.trim()) {
      setError('Name is required');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    console.log('📝 Attempting registration to:', `${API_URL}/auth/register`);
    console.log('👤 User data:', {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role
    });

    try {
      // Step 1: Register the user
      const registerResponse = await axios.post(`${API_URL}/auth/register`, {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role
      }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('✅ Registration successful:', registerResponse.data);

      // Step 2: Auto-login after successful registration
      console.log('🔐 Auto-login after registration...');
      const loginResponse = await axios.post(`${API_URL}/auth/login`, {
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      }, {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log('✅ Auto-login successful:', loginResponse.data);

      if (loginResponse.data.user) {
        localStorage.setItem('user', JSON.stringify(loginResponse.data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('❌ Registration error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        config: err.config
      });
      
      if (err.response?.data?.detail === 'User already exists') {
        setError('This email is already registered. Please login instead.');
      } else if (err.response?.status === 422) {
        setError('Please check all fields are filled correctly');
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Cannot connect to server. Please check your internet connection or try again later.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.detail || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Toggle between login and registration
  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setFormData({
      email: '',
      password: '',
      name: '',
      role: 'user'
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Sourcevia</h1>
          <p className="text-gray-600 mt-2">Procurement Management System</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => {
              if (isRegistering) {
                setIsRegistering(false);
                setError('');
                setFormData({
                  email: '',
                  password: '',
                  name: '',
                  role: 'user'
                });
              }
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              !isRegistering
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900 cursor-pointer'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isRegistering) {
                setIsRegistering(true);
                setError('');
                setFormData({
                  email: '',
                  password: '',
                  name: '',
                  role: 'user'
                });
              }
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              isRegistering
                ? 'bg-white text-blue-600 shadow'
                : 'text-gray-600 hover:text-gray-900 cursor-pointer'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={isRegistering ? handleRegister : handleLogin}>
          {/* Name Field (Registration Only) */}
          {isRegistering && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={isRegistering}
              />
            </div>
          )}

          {/* Email Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Password Field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder={isRegistering ? 'Create a password (min 6 characters)' : 'Enter your password'}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              minLength={isRegistering ? 6 : undefined}
            />
          </div>

          {/* Role Selection (Registration Only) */}
          {isRegistering && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="user">User</option>
                <option value="direct_manager">Direct Manager</option>
                <option value="procurement_officer">Procurement Officer</option>
                <option value="procurement_manager">Procurement Manager</option>
                <option value="senior_manager">Senior Manager</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select your role in the organization
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium transition-all ${
              loading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isRegistering ? 'Creating Account...' : 'Logging In...'}
              </span>
            ) : (
              isRegistering ? 'Create Account' : 'Login'
            )}
          </button>
        </form>

        {/* Toggle Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isRegistering ? 'Login here' : 'Register here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
