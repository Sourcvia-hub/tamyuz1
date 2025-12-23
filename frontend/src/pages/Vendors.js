import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import VendorForm from '../components/VendorForm';
import { Link, useSearchParams } from 'react-router-dom';
import WorkflowStatusBadge from '../components/workflow/WorkflowStatusBadge';
import { useAuth } from '../App';
import { useToast } from '../hooks/use-toast';
import { canCreate, canEdit, Module } from '../utils/permissions';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Vendors = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || 'all');
  
  // Permission checks
  const userCanCreate = canCreate(user?.role, Module.VENDORS);
  const userCanEdit = canEdit(user?.role, Module.VENDORS);
  
  const [formData, setFormData] = useState({
    // Company Information
    vendor_type: 'local',
    name_english: '',
    commercial_name: '',
    entity_type: '',
    vat_number: '',
    unified_number: '',
    cr_number: '',
    cr_expiry_date: '',
    cr_country_city: '',
    license_number: '',
    license_expiry_date: '',
    activity_description: '',
    number_of_employees: '',
    
    // Address and Contact
    street: '',
    building_no: '',
    city: '',
    district: '',
    country: '',
    mobile: '',
    landline: '',
    fax: '',
    email: '',
    
    // Representative Information
    representative_name: '',
    representative_designation: '',
    representative_id_type: '',
    representative_id_number: '',
    representative_nationality: '',
    representative_mobile: '',
    representative_residence_tel: '',
    representative_phone_area_code: '',
    representative_email: '',
    
    // Bank Account Information
    bank_account_name: '',
    bank_name: '',
    bank_branch: '',
    bank_country: '',
    iban: '',
    currency: '',
    swift_code: '',
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchVendors(searchQuery);
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const fetchVendors = async (search = '') => {
    try {
      const url = search ? `${API}/vendors?search=${encodeURIComponent(search)}` : `${API}/vendors`;
      const response = await axios.get(url, { withCredentials: true });
      setVendors(response.data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (category) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const handleCreateVendor = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        status: 'draft',  // Set initial status as draft
        number_of_employees: parseInt(formData.number_of_employees) || 0,
        cr_expiry_date: formData.cr_expiry_date ? new Date(formData.cr_expiry_date).toISOString() : null,
        license_expiry_date: formData.license_expiry_date ? new Date(formData.license_expiry_date).toISOString() : null,
        owners_managers: [],
        authorized_persons: [],
        documents: [],
      };
      
      await axios.post(`${API}/vendors`, payload, { withCredentials: true });
      setShowCreateModal(false);
      setFormData({
        name_english: '',
        commercial_name: '',
        entity_type: '',
        vat_number: '',
        unified_number: '',
        cr_number: '',
        cr_expiry_date: '',
        cr_country_city: '',
        license_number: '',
        license_expiry_date: '',
        activity_description: '',
        number_of_employees: '',
        street: '',
        building_no: '',
        city: '',
        district: '',
        country: '',
        mobile: '',
        landline: '',
        fax: '',
        email: '',
        representative_name: '',
        representative_designation: '',
        representative_id_type: '',
        representative_id_number: '',
        representative_nationality: '',
        representative_mobile: '',
        representative_residence_tel: '',
        representative_phone_area_code: '',
        representative_email: '',
        bank_account_name: '',
        bank_name: '',
        bank_branch: '',
        bank_country: '',
        iban: '',
        currency: '',
        swift_code: '',
      });
      toast({
        title: "✅ Vendor Created",
        description: "New vendor has been registered successfully",
        variant: "success"
      });
      fetchVendors();
    } catch (error) {
      console.error('Error creating vendor:', error);
      toast({
        title: "❌ Creation Failed",
        description: error.response?.data?.detail || error.message,
        variant: "destructive"
      });
    }
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      pending_due_diligence: 'bg-orange-100 text-orange-800',
      blacklisted: 'bg-black text-white',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleBlacklistVendor = async (vendorId) => {
    if (!window.confirm('Are you sure you want to blacklist this vendor? This will terminate all active contracts.')) {
      return;
    }

    try {
      await axios.post(`${API}/vendors/${vendorId}/blacklist`, {}, { withCredentials: true });
      toast({
        title: "⚠️ Vendor Blacklisted",
        description: "The vendor has been blacklisted and all contracts terminated",
        variant: "warning"
      });
      fetchVendors();
    } catch (error) {
      console.error('Error blacklisting vendor:', error);
      toast({
        title: "❌ Action Failed",
        description: "Failed to blacklist vendor",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
            <p className="text-gray-600 mt-1">Review and manage vendor registrations</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            data-testid="create-vendor-btn"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Create Vendor
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            All ({vendors.length})
          </button>
          <button
            onClick={() => setActiveFilter('approved')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'approved' ? 'bg-green-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Approved ({vendors.filter(v => v.status === 'approved').length})
          </button>
          <button
            onClick={() => setActiveFilter('draft')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'draft' ? 'bg-gray-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Draft ({vendors.filter(v => v.status === 'draft').length})
          </button>
          <button
            onClick={() => setActiveFilter('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'pending' ? 'bg-yellow-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Pending Review ({vendors.filter(v => v.status === 'pending_review' || v.status === 'reviewed').length})
          </button>
          <button
            onClick={() => setActiveFilter('high_risk')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'high_risk' ? 'bg-red-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            High Risk ({vendors.filter(v => v.risk_category === 'high').length})
          </button>
          <button
            onClick={() => setActiveFilter('pending_dd')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'pending_dd' ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            DD Pending ({vendors.filter(v => v.status === 'pending_due_diligence').length})
          </button>
          <button
            onClick={() => setActiveFilter('blacklisted')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeFilter === 'blacklisted' ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
            }`}
          >
            Blacklisted ({vendors.filter(v => v.status === 'blacklisted').length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <input
            type="text"
            placeholder="Search by vendor number, name, or commercial name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Vendors List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (() => {
          const filteredVendors = vendors.filter(vendor => {
            // Apply filter
            if (activeFilter === 'approved' && vendor.status !== 'approved' && vendor.status !== 'final_approved') return false;
            if (activeFilter === 'draft' && vendor.status !== 'draft') return false;
            if (activeFilter === 'pending' && vendor.status !== 'pending_review' && vendor.status !== 'reviewed') return false;
            if (activeFilter === 'high_risk' && vendor.risk_category !== 'high') return false;
            if (activeFilter === 'pending_dd' && vendor.status !== 'pending_due_diligence') return false;
            if (activeFilter === 'blacklisted' && vendor.status !== 'blacklisted') return false;
            
            // Apply search
            if (searchQuery) {
              const query = searchQuery.toLowerCase();
              return (
                vendor.vendor_number?.toLowerCase().includes(query) ||
                vendor.name_english?.toLowerCase().includes(query) ||
                vendor.commercial_name?.toLowerCase().includes(query)
              );
            }
            return true;
          });

          return filteredVendors.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-12 text-center">
              <span className="text-6xl mb-4 block">🏢</span>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No vendors found</h3>
              <p className="text-gray-600">
                {searchQuery ? 'Try adjusting your search criteria.' : 'No vendors match the current filter.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="mb-4">
                  <Link to={`/vendors/${vendor.id}`}>
                    <h3 className="text-xl font-bold text-gray-900 hover:text-blue-600">{vendor.name_english || vendor.company_name}</h3>
                  </Link>
                  {vendor.vendor_number && (
                    <p className="text-xs text-blue-600 font-medium mt-1">#{vendor.vendor_number}</p>
                  )}
                  <p className="text-sm text-gray-600 mt-1">{vendor.commercial_name || vendor.company_name}</p>
                  <p className="text-sm text-gray-600">{vendor.email || vendor.contact_email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <WorkflowStatusBadge status={vendor.status} />
                    {vendor.vendor_type && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                        {vendor.vendor_type === 'international' ? '🌍 International' : '🏠 Local'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Contact:</span>
                    <span className="text-gray-900 font-medium">{vendor.representative_name || vendor.contact_person}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">Phone:</span>
                    <span className="text-gray-900 font-medium">{vendor.mobile || vendor.contact_phone}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">CR Number:</span>
                    <span className="text-gray-900 font-medium">{vendor.cr_number}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">VAT Number:</span>
                    <span className="text-gray-900 font-medium">{vendor.vat_number}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-600 w-24">City:</span>
                    <span className="text-gray-900 font-medium">{vendor.city || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t mb-4">
                  <div>
                    <span className="text-sm text-gray-600">Risk Score: </span>
                    <span className="text-sm font-bold text-gray-900">{vendor.risk_score.toFixed(1)}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskBadgeColor(vendor.risk_category)}`}>
                    {vendor.risk_category.toUpperCase()} RISK
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link
                    to={`/vendors/${vendor.id}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-center rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </Link>
                  {vendor.dd_required && !vendor.dd_completed && (
                    <Link
                      to={`/vendors/${vendor.id}?action=dd`}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                    >
                      Complete DD
                    </Link>
                  )}
                  {vendor.status !== 'blacklisted' && (user?.role === 'procurement_manager' || user?.role === 'hop' || user?.role === 'admin') && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBlacklistVendor(vendor.id);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                    >
                      Blacklist
                    </button>
                  )}
                </div>
              </div>
            ))}
            </div>
          );
        })()}
      </div>

      {/* Create Vendor Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[95vh] p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Vendor</h2>
            <VendorForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleCreateVendor}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Vendors;
