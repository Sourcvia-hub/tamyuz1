import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useAuth } from '../App';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [highRiskCountries, setHighRiskCountries] = useState([]);
  const [newCountry, setNewCountry] = useState('');
  const [activeTab, setActiveTab] = useState('proposal-scoring');
  
  // Scoring configurations
  const [proposalWeights, setProposalWeights] = useState({});
  const [vendorWeights, setVendorWeights] = useState({});
  const [contractClassification, setContractClassification] = useState({});
  const [configLoaded, setConfigLoaded] = useState(false);

  const isAdmin = user?.role === 'procurement_manager' || user?.role === 'system_admin' || user?.role === 'hop' || user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      fetchHighRiskCountries();
      fetchScoringConfig();
    }
  }, [isAdmin]);

  const fetchHighRiskCountries = async () => {
    try {
      const response = await axios.get(`${API}/vendor-dd/admin/high-risk-countries`, { withCredentials: true });
      setHighRiskCountries(response.data.countries || []);
    } catch (error) {
      console.error('Error fetching high-risk countries:', error);
    }
  };

  const fetchScoringConfig = async () => {
    try {
      const response = await axios.get(`${API}/admin/scoring-config`, { withCredentials: true });
      setProposalWeights(response.data.proposal_evaluation || {});
      setVendorWeights(response.data.vendor_registration || {});
      setContractClassification(response.data.contract_classification || {});
      setConfigLoaded(true);
    } catch (error) {
      console.error('Error fetching scoring config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCountry = () => {
    if (newCountry.trim() && !highRiskCountries.includes(newCountry.trim())) {
      setHighRiskCountries([...highRiskCountries, newCountry.trim()]);
      setNewCountry('');
    }
  };

  const handleRemoveCountry = (country) => {
    setHighRiskCountries(highRiskCountries.filter(c => c !== country));
  };

  const handleSaveCountries = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/vendor-dd/admin/high-risk-countries`, {
        countries: highRiskCountries
      }, { withCredentials: true });
      toast({ title: "✅ Saved", description: "High-risk countries updated successfully", variant: "success" });
    } catch (error) {
      toast({ title: "❌ Error", description: error.response?.data?.detail || error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleWeightChange = (configType, key, value) => {
    const numValue = parseInt(value) || 0;
    if (configType === 'proposal') {
      setProposalWeights(prev => ({
        ...prev,
        [key]: { ...prev[key], weight: numValue }
      }));
    } else if (configType === 'vendor') {
      setVendorWeights(prev => ({
        ...prev,
        [key]: { ...prev[key], weight: numValue }
      }));
    }
  };

  const handleThresholdChange = (level, field, value) => {
    setContractClassification(prev => ({
      ...prev,
      value_thresholds: {
        ...prev.value_thresholds,
        [level]: {
          ...prev.value_thresholds?.[level],
          [field]: parseInt(value) || 0
        }
      }
    }));
  };

  const calculateTotal = (weights) => {
    return Object.values(weights).reduce((sum, item) => sum + (item.weight || 0), 0);
  };

  const handleSaveConfig = async (configType) => {
    setSaving(true);
    try {
      let configData;
      let configTypeName;
      
      if (configType === 'proposal') {
        configData = proposalWeights;
        configTypeName = 'proposal_evaluation';
      } else if (configType === 'vendor') {
        configData = vendorWeights;
        configTypeName = 'vendor_registration';
      } else if (configType === 'contract') {
        configData = contractClassification;
        configTypeName = 'contract_classification';
      }

      await axios.put(`${API}/admin/scoring-config`, {
        config_type: configTypeName,
        config_data: configData
      }, { withCredentials: true });
      
      toast({ title: "✅ Saved", description: `${configType} configuration updated successfully`, variant: "success" });
    } catch (error) {
      toast({ title: "❌ Error", description: error.response?.data?.detail || error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset all scoring configurations to defaults?')) return;
    
    setSaving(true);
    try {
      await axios.post(`${API}/admin/scoring-config/reset`, {}, { withCredentials: true });
      await fetchScoringConfig();
      toast({ title: "✅ Reset", description: "All configurations reset to defaults", variant: "success" });
    } catch (error) {
      toast({ title: "❌ Error", description: error.response?.data?.detail || error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access admin settings.</p>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: 'proposal-scoring', label: '📊 Proposal Evaluation', icon: '📊' },
    { id: 'vendor-scoring', label: '🏪 Vendor Registration', icon: '🏪' },
    { id: 'contract-classification', label: '📄 Contract Classification', icon: '📄' },
    { id: 'risk-countries', label: '🌍 Risk Countries', icon: '🌍' },
    { id: 'ai-settings', label: '🤖 AI Settings', icon: '🤖' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Settings</h1>
            <p className="text-gray-600 mt-1">Configure scoring weights, classification criteria, and system settings</p>
          </div>
          <button
            onClick={handleResetToDefaults}
            className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
          >
            Reset All to Defaults
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Proposal Evaluation Scoring Tab */}
            {activeTab === 'proposal-scoring' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Proposal Evaluation Weights</h2>
                  <p className="text-gray-600 text-sm">
                    Configure the weight (importance) of each criterion when evaluating vendor proposals. Weights must sum to 100%.
                  </p>
                </div>

                <div className="space-y-4">
                  {Object.entries(proposalWeights).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <label className="block font-medium text-gray-900 capitalize">
                          {key.replace(/_/g, ' ')}
                        </label>
                        <p className="text-sm text-gray-500">{config.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={config.weight || 0}
                          onChange={(e) => handleWeightChange('proposal', key, e.target.value)}
                          className="w-20 px-3 py-2 border rounded-lg text-center font-semibold"
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className={`text-lg font-semibold ${calculateTotal(proposalWeights) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    Total: {calculateTotal(proposalWeights)}% {calculateTotal(proposalWeights) === 100 ? '✓' : '(must be 100%)'}
                  </div>
                  <button
                    onClick={() => handleSaveConfig('proposal')}
                    disabled={saving || calculateTotal(proposalWeights) !== 100}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Vendor Registration Scoring Tab */}
            {activeTab === 'vendor-scoring' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Vendor Registration Scoring Weights</h2>
                  <p className="text-gray-600 text-sm">
                    Configure the weight of each factor when scoring vendor registrations. Adjust location weight to prioritize local vendors.
                  </p>
                </div>

                <div className="space-y-4">
                  {Object.entries(vendorWeights).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <label className="block font-medium text-gray-900 capitalize">
                          {key.replace(/_/g, ' ')}
                          {key === 'location' && <span className="ml-2 text-blue-600 text-sm">(Local presence bonus)</span>}
                        </label>
                        <p className="text-sm text-gray-500">{config.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={config.weight || 0}
                          onChange={(e) => handleWeightChange('vendor', key, e.target.value)}
                          className="w-20 px-3 py-2 border rounded-lg text-center font-semibold"
                        />
                        <span className="text-gray-500">%</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className={`text-lg font-semibold ${calculateTotal(vendorWeights) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    Total: {calculateTotal(vendorWeights)}% {calculateTotal(vendorWeights) === 100 ? '✓' : '(must be 100%)'}
                  </div>
                  <button
                    onClick={() => handleSaveConfig('vendor')}
                    disabled={saving || calculateTotal(vendorWeights) !== 100}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Contract Classification Tab */}
            {activeTab === 'contract-classification' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Contract Classification Criteria</h2>
                  <p className="text-gray-600 text-sm">
                    Configure value thresholds and outsourcing classification rules for contracts.
                  </p>
                </div>

                {/* Value Thresholds */}
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Contract Value Thresholds (SAR)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {contractClassification.value_thresholds && Object.entries(contractClassification.value_thresholds).map(([level, config]) => (
                      <div key={level} className={`p-4 rounded-lg border-2 ${
                        level === 'low' ? 'border-green-200 bg-green-50' :
                        level === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                        level === 'high' ? 'border-orange-200 bg-orange-50' :
                        'border-red-200 bg-red-50'
                      }`}>
                        <h4 className="font-semibold capitalize mb-2">{level} Value</h4>
                        <p className="text-sm text-gray-600 mb-3">{config.description}</p>
                        <div className="flex gap-4">
                          {config.min !== undefined && (
                            <div>
                              <label className="text-xs text-gray-500">Min (SAR)</label>
                              <input
                                type="number"
                                value={config.min || 0}
                                onChange={(e) => handleThresholdChange(level, 'min', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </div>
                          )}
                          {config.max !== undefined && (
                            <div>
                              <label className="text-xs text-gray-500">Max (SAR)</label>
                              <input
                                type="number"
                                value={config.max || 0}
                                onChange={(e) => handleThresholdChange(level, 'max', e.target.value)}
                                className="w-full px-2 py-1 border rounded text-sm"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Outsourcing Indicators */}
                <div className="mb-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Outsourcing Classification Indicators</h3>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      These indicators determine if a contract should be classified as outsourcing:
                    </p>
                    {contractClassification.outsourcing_indicators && (
                      <ul className="space-y-2">
                        {Object.entries(contractClassification.outsourcing_indicators).map(([key, config]) => (
                          <li key={key} className="flex items-center gap-2 text-sm">
                            <span className={config.triggers_material_outsourcing ? 'text-red-500' : 'text-yellow-500'}>
                              {config.triggers_material_outsourcing ? '⚠️' : '⚡'}
                            </span>
                            <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="text-gray-600">{config.description}</span>
                            {config.triggers_material_outsourcing && (
                              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Material Outsourcing</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* SAMA NOC Triggers */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">SAMA NOC Requirements</h3>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      Contracts meeting these criteria require SAMA NOC approval:
                    </p>
                    {contractClassification.sama_noc_triggers && (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(contractClassification.sama_noc_triggers).map(([key, required]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className={required ? 'text-green-500' : 'text-gray-400'}>
                              {required ? '✓' : '○'}
                            </span>
                            <span className="text-sm capitalize">{key.replace(/_/g, ' ')}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => handleSaveConfig('contract')}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* High-Risk Countries Tab */}
            {activeTab === 'risk-countries' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">High-Risk Countries</h2>
                  <p className="text-gray-600 text-sm">
                    Vendors headquartered in these countries will automatically be assigned a minimum "High" risk level.
                  </p>
                </div>

                {/* Add Country Form */}
                <div className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCountry()}
                    placeholder="Enter country name..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleAddCountry}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    Add Country
                  </button>
                </div>

                {/* Country List */}
                <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                  {highRiskCountries.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No high-risk countries configured
                    </div>
                  ) : (
                    highRiskCountries.sort().map((country, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50">
                        <span className="font-medium text-gray-900">{country}</span>
                        <button
                          onClick={() => handleRemoveCountry(country)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveCountries}
                    disabled={saving}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* AI Settings Tab */}
            {activeTab === 'ai-settings' && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">AI Configuration</h2>
                  <p className="text-gray-600 text-sm">
                    Configure AI-powered features for vendor due diligence and contract analysis.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Risk Thresholds */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Risk Score Thresholds</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-green-100 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-700">0-39</div>
                        <div className="text-sm text-green-600">Low Risk</div>
                      </div>
                      <div className="bg-yellow-100 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-yellow-700">40-69</div>
                        <div className="text-sm text-yellow-600">Medium Risk</div>
                      </div>
                      <div className="bg-red-100 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-red-700">70-100</div>
                        <div className="text-sm text-red-600">High Risk</div>
                      </div>
                    </div>
                  </div>

                  {/* Override Rules */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Automatic Override Rules</h3>
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li className="flex items-start gap-2">
                        <span className="text-red-500">⚠</span>
                        <span>High-risk country headquarters → Minimum risk level = <strong>High</strong></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500">⚠</span>
                        <span>Sanctions exposure detected → Flagged as critical risk driver</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-yellow-500">⚠</span>
                        <span>Weak ownership transparency → Minimum risk level = <strong>Medium</strong></span>
                      </li>
                    </ul>
                  </div>

                  {/* AI Provider Status */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">AI Provider Status</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-gray-700">OpenAI GPT-4o - Connected</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      AI features use OpenAI's GPT-4o model for document extraction and risk assessment.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default AdminSettings;
