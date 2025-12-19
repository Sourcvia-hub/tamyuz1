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

// ==================== PROTECTED ROUTE ====================
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

// ==================== COMPONENTS ====================
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
import AssetDetail from './pages/AssetDetail';
import AssetForm from './pages/AssetForm';
import OSRList from './pages/OSRList';
import OSRDetail from './pages/OSRDetail';
import OSRForm from './pages/OSRForm';
import CCTVLiveView from './pages/CCTVLiveView';
import AccessManagement from './pages/AccessManagement';
import AdminSettings from './pages/AdminSettings';
import ContractApprovals from './pages/ContractApprovals';
import ApprovalsHub from './pages/ApprovalsHub';

// ProcureFlix components
import ProcureFlixLayout from './procureflix/Layout';
import PfDashboard from './procureflix/PfDashboard';
import PfVendorsList from './procureflix/PfVendorsList';
import PfVendorDetail from './procureflix/PfVendorDetail';
import PfTendersList from './procureflix/PfTendersList';
import PfTenderDetail from './procureflix/PfTenderDetail';
import PfContractsList from './procureflix/PfContractsList';
import PfContractDetail from './procureflix/PfContractDetail';
import PfPurchaseOrdersList from './procureflix/PfPurchaseOrdersList';
import PfPurchaseOrderDetail from './procureflix/PfPurchaseOrderDetail';
import PfInvoicesList from './procureflix/PfInvoicesList';
import PfInvoiceDetail from './procureflix/PfInvoiceDetail';
import PfResourcesList from './procureflix/PfResourcesList';
import PfResourceDetail from './procureflix/PfResourceDetail';
import PfServiceRequestsList from './procureflix/PfServiceRequestsList';
import PfServiceRequestDetail from './procureflix/PfServiceRequestDetail';
import PfCctvView from './procureflix/PfCctvView';

// ==================== APP ROUTES ====================
const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Main application routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
      <Route path="/vendors/:id" element={<ProtectedRoute><VendorDetail /></ProtectedRoute>} />
      <Route path="/tenders" element={<ProtectedRoute><Tenders /></ProtectedRoute>} />
      <Route path="/tenders/:id" element={<ProtectedRoute><TenderDetail /></ProtectedRoute>} />
      <Route path="/tenders/:id/evaluate" element={<ProtectedRoute><TenderEvaluation /></ProtectedRoute>} />
      <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
      <Route path="/contracts/:id" element={<ProtectedRoute><ContractDetail /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
      <Route path="/purchase-orders" element={<ProtectedRoute><PurchaseOrders /></ProtectedRoute>} />
      <Route path="/purchase-orders/:id" element={<ProtectedRoute><PurchaseOrderDetail /></ProtectedRoute>} />
      <Route path="/resources" element={<ProtectedRoute><Resources /></ProtectedRoute>} />
      <Route path="/resources/:id" element={<ProtectedRoute><ResourceDetail /></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
      <Route path="/assets/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
      <Route path="/assets/new" element={<ProtectedRoute><AssetForm /></ProtectedRoute>} />
      <Route path="/assets/:id/edit" element={<ProtectedRoute><AssetForm /></ProtectedRoute>} />
      <Route path="/osr" element={<ProtectedRoute><OSRList /></ProtectedRoute>} />
      <Route path="/osr/:id" element={<ProtectedRoute><OSRDetail /></ProtectedRoute>} />
      <Route path="/osr/new" element={<ProtectedRoute><OSRForm /></ProtectedRoute>} />
      <Route path="/osr/:id/edit" element={<ProtectedRoute><OSRForm /></ProtectedRoute>} />
      <Route path="/cctv" element={<ProtectedRoute><CCTVLiveView /></ProtectedRoute>} />
      <Route path="/access-management" element={<ProtectedRoute><AccessManagement /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
      <Route path="/contract-approvals" element={<ProtectedRoute><ContractApprovals /></ProtectedRoute>} />

      {/* ProcureFlix routes */}
      <Route
        path="/pf"
        element={
          <ProtectedRoute>
            <ProcureFlixLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/pf/dashboard" replace />} />
        <Route path="dashboard" element={<PfDashboard />} />
        <Route path="vendors" element={<PfVendorsList />} />
        <Route path="vendors/:id" element={<PfVendorDetail />} />
        <Route path="tenders" element={<PfTendersList />} />
        <Route path="tenders/:id" element={<PfTenderDetail />} />
        <Route path="contracts" element={<PfContractsList />} />
        <Route path="contracts/:id" element={<PfContractDetail />} />
        <Route path="purchase-orders" element={<PfPurchaseOrdersList />} />
        <Route path="purchase-orders/:id" element={<PfPurchaseOrderDetail />} />
        <Route path="invoices" element={<PfInvoicesList />} />
        <Route path="invoices/:id" element={<PfInvoiceDetail />} />
        <Route path="resources" element={<PfResourcesList />} />
        <Route path="resources/:id" element={<PfResourceDetail />} />
        <Route path="service-requests" element={<PfServiceRequestsList />} />
        <Route path="service-requests/:id" element={<PfServiceRequestDetail />} />
        <Route path="cctv" element={<PfCctvView />} />
      </Route>
    </Routes>
  );
};

// ==================== MAIN APP ====================
const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="App">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
