import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';
import { API_URL } from './config/api';

const API = API_URL;

// ==================== AUTH CONTEXT ====================
const AuthContext = React.createContext(null);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkAuth = async () => {
    // First check localStorage for user
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('✅ User found in localStorage:', userData.email);
        setUser(userData);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Error parsing stored user:', e);
        localStorage.removeItem('user');
      }
    }

    // If no stored user, check with backend
    try {
      const response = await axios.get(`${API}/auth/me`, { 
        withCredentials: true,
        timeout: 5000
      });
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      setError(null);
    } catch (error) {
      console.log('checkAuth: User not authenticated');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
      setUser(response.data.user);
      setError(null);
      return response.data;
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local state and storage, even if API call fails
      setUser(null);
      localStorage.removeItem('user');
      localStorage.clear(); // Clear all localStorage for complete session cleanup
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Error</h1>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// ==================== LOGIN PAGE ====================
const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Login successful - AuthProvider will update user state
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-xl mb-4">
            <span className="text-white font-bold text-3xl">S</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Sourcevia</h1>
          <p className="text-gray-600 mt-2">Procurement Management System</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="login-email-input"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="login-password-input"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit-btn"
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Demo Accounts:</p>
          <p className="mt-1">procurement@test.com / password</p>
          <p>manager@test.com / password</p>
        </div>
      </div>
    </div>
  );
};

// ==================== PROTECTED ROUTE ====================
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Import pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import VendorDetail from './pages/VendorDetail';
import Tenders from './pages/Tenders';
import TenderDetail from './pages/TenderDetail';
import TenderEvaluation from './pages/TenderEvaluation';
import Contracts from './pages/Contracts';
import ContractDetail from './pages/ContractDetail';
import Invoices from './pages/Invoices';
import InvoiceDetail from './pages/InvoiceDetail';
import PurchaseOrders from './pages/PurchaseOrders';
import PurchaseOrderDetail from './pages/PurchaseOrderDetail';
import Resources from './pages/Resources';
import ResourceDetail from './pages/ResourceDetail';
import Assets from './pages/Assets';
import AssetForm from './pages/AssetForm';
import AssetDetail from './pages/AssetDetail';
import FacilitiesSettings from './pages/FacilitiesSettings';
import OSRList from './pages/OSRList';
import OSRForm from './pages/OSRForm';
import OSRDetail from './pages/OSRDetail';
import CCTVLiveView from './pages/CCTVLiveView';
import AccessManagement from './pages/AccessManagement';
import ProtectedModule from './components/ProtectedModule';
import { Module } from './utils/permissions';

// ProcureFlix UI
import ProcureFlixLayout from './procureflix/Layout';
import PfDashboard from './procureflix/PfDashboard';
import PfVendorsList from './procureflix/PfVendorsList';
import PfVendorDetail from './procureflix/PfVendorDetail';
import PfTendersList from './procureflix/PfTendersList';
import PfTenderDetail from './procureflix/PfTenderDetail';

// ==================== MAIN APP ====================
const AppRoutes = () => {
  const { user, loading } = useAuth();

  // Auto-redirect to dashboard (skip login page)
  const RootRedirect = () => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }
    
    // Redirect to dashboard if logged in, otherwise to login
    return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
  };

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendors"
        element={
          <ProtectedRoute>
            <Vendors />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendors/:id"
        element={
          <ProtectedRoute>
            <VendorDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenders"
        element={
          <ProtectedRoute>
            <Tenders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenders/:id"
        element={
          <ProtectedRoute>
            <TenderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tenders/:id/evaluate"
        element={
          <ProtectedRoute>
            <TenderEvaluation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts"
        element={
          <ProtectedRoute>
            <Contracts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/contracts/:id"
        element={
          <ProtectedRoute>
            <ContractDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices"
        element={
          <ProtectedRoute>
            <Invoices />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoices/:id"
        element={
          <ProtectedRoute>
            <InvoiceDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders"
        element={
          <ProtectedRoute>
            <PurchaseOrders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/purchase-orders/:id"
        element={
          <ProtectedRoute>
            <PurchaseOrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources"
        element={
          <ProtectedRoute>
            <Resources />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resources/:id"
        element={
          <ProtectedRoute>
            <ResourceDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <ProtectedModule module={Module.ASSETS}>
              <Assets />
            </ProtectedModule>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/new"
        element={
          <ProtectedRoute>
            <ProtectedModule module={Module.ASSETS}>
              <AssetForm />
            </ProtectedModule>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id/edit"
        element={
          <ProtectedRoute>
            <ProtectedModule module={Module.ASSETS}>
              <AssetForm />
            </ProtectedModule>
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets/:id"
        element={
          <ProtectedRoute>
            <ProtectedModule module={Module.ASSETS}>
              <AssetDetail />
            </ProtectedModule>
          </ProtectedRoute>
        }
      />
      <Route
        path="/facilities-settings"
        element={
          <ProtectedRoute>
            <FacilitiesSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/osr"
        element={
          <ProtectedRoute>
            <OSRList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/osr/new"
        element={
          <ProtectedRoute>
            <OSRForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/osr/:id"
        element={
          <ProtectedRoute>
            <OSRDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cctv"
        element={
          <ProtectedRoute>
            <CCTVLiveView />
          </ProtectedRoute>
        }
      />
      <Route
        path="/access-management"
        element={
          <ProtectedRoute>
            <AccessManagement />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
