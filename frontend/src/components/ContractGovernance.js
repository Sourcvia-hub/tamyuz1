import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * Contract Context Questionnaire Review Component
 * Used by Procurement Officer to review/validate Business User's answers
 */
export const ContractContextReview = ({ tender, contract, onUpdate }) => {
  const [context, setContext] = useState({
    requires_system_data_access: tender?.ctx_requires_system_data_access || '',
    is_cloud_based: tender?.ctx_is_cloud_based || '',
    is_outsourcing_service: tender?.ctx_is_outsourcing_service || '',
    expected_data_location: tender?.ctx_expected_data_location || '',
    requires_onsite_presence: tender?.ctx_requires_onsite_presence || '',
    expected_duration: tender?.ctx_expected_duration || '',
  });
  const [notes, setNotes] = useState('');

  const questions = [
    { key: 'requires_system_data_access', label: 'Does the service require access to company systems or data?', options: ['yes', 'no', 'unknown'] },
    { key: 'is_cloud_based', label: 'Is the service cloud-based?', options: ['yes', 'no', 'unknown'] },
    { key: 'is_outsourcing_service', label: 'Will the vendor operate a service on behalf of the company?', options: ['yes', 'no', 'unknown'] },
    { key: 'expected_data_location', label: 'Expected data location', options: ['inside_ksa', 'outside_ksa', 'unknown'], type: 'select' },
    { key: 'requires_onsite_presence', label: 'Is onsite presence required?', options: ['yes', 'no'] },
    { key: 'expected_duration', label: 'Expected contract duration', options: ['less_than_6_months', '6_to_12_months', 'more_than_12_months'], type: 'select' },
  ];

  const handleChange = (key, value) => {
    setContext(prev => ({ ...prev, [key]: value }));
    if (onUpdate) onUpdate({ ...context, [key]: value });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📋</span>
        <h3 className="text-lg font-semibold text-gray-900">Contract Context Review</h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Procurement Review</span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Review and validate the context provided by the Business User. Correct any answers if needed.
      </p>

      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q.key} className="flex items-start gap-4 py-2 border-b border-gray-100 last:border-0">
            <span className="text-sm text-gray-500 w-6">{idx + 1}.</span>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">{q.label}</label>
              {q.type === 'select' ? (
                <select
                  value={context[q.key]}
                  onChange={(e) => handleChange(q.key, e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  {q.options.map(opt => (
                    <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-3">
                  {q.options.map(opt => (
                    <label key={opt} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name={q.key}
                        value={opt}
                        checked={context[q.key] === opt}
                        onChange={(e) => handleChange(q.key, e.target.value)}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{opt}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Procurement Officer Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or observations..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

/**
 * AI Classification Result Component
 */
export const ContractClassificationResult = ({ classification, onReClassify }) => {
  const getClassificationColor = (cls) => {
    const colors = {
      not_outsourcing: 'bg-green-100 text-green-800 border-green-300',
      outsourcing: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      material_outsourcing: 'bg-orange-100 text-orange-800 border-orange-300',
      cloud_computing: 'bg-blue-100 text-blue-800 border-blue-300',
      insourcing: 'bg-purple-100 text-purple-800 border-purple-300',
      exempted: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[cls] || 'bg-gray-100 text-gray-800';
  };

  if (!classification) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <h3 className="text-lg font-semibold text-gray-900">AI Contract Classification</h3>
        </div>
        {onReClassify && (
          <button
            onClick={onReClassify}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Re-classify
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${getClassificationColor(classification.classification)}`}>
          {(classification.classification || '').replace(/_/g, ' ').toUpperCase()}
        </span>
        {classification.confidence && (
          <span className="text-sm text-gray-500">
            Confidence: {(classification.confidence * 100).toFixed(0)}%
          </span>
        )}
      </div>

      <p className="text-sm text-gray-700 mb-4">{classification.classification_reason}</p>

      {classification.indicators_found?.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Indicators Found:</p>
          <div className="flex flex-wrap gap-2">
            {classification.indicators_found.map((ind, i) => (
              <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">{ind}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4 text-sm">
        {classification.requires_sama_noc && (
          <span className="flex items-center gap-1 text-orange-600">
            <span>⚠️</span> SAMA NOC Required
          </span>
        )}
        {classification.requires_contract_dd && (
          <span className="flex items-center gap-1 text-blue-600">
            <span>📋</span> Contract DD Required
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * AI Advisory Component - Drafting Hints and Clause Suggestions
 */
export const ContractAIAdvisory = ({ advisory, onApplyClause }) => {
  const [expandedHints, setExpandedHints] = useState(false);
  const [expandedClauses, setExpandedClauses] = useState(false);

  if (!advisory) return null;

  const criticalHints = advisory.drafting_hints?.filter(h => h.is_critical) || [];
  const regularHints = advisory.drafting_hints?.filter(h => !h.is_critical) || [];

  return (
    <div className="space-y-4">
      {/* Critical Drafting Hints */}
      {criticalHints.length > 0 && (
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <h4 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
            <span>⚠️</span> Critical Drafting Requirements
          </h4>
          <div className="space-y-3">
            {criticalHints.map((hint, i) => (
              <div key={i} className="bg-white rounded p-3 border border-red-100">
                <p className="text-sm font-medium text-gray-900">
                  Exhibit {hint.exhibit_number}: {hint.exhibit_name}
                </p>
                <p className="text-sm text-gray-700 mt-1">{hint.hint_text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clause Suggestions */}
      {advisory.clause_suggestions?.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-800 flex items-center gap-2">
              <span>📝</span> Suggested Clauses
            </h4>
            <button
              onClick={() => setExpandedClauses(!expandedClauses)}
              className="text-sm text-blue-600"
            >
              {expandedClauses ? 'Collapse' : 'Expand All'}
            </button>
          </div>
          <div className="space-y-3">
            {advisory.clause_suggestions.map((clause, i) => (
              <div key={i} className="bg-white rounded p-3 border border-blue-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{clause.clause_title}</p>
                    <p className="text-xs text-gray-500">{clause.reason}</p>
                  </div>
                  {clause.is_mandatory && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">Mandatory</span>
                  )}
                </div>
                {expandedClauses && (
                  <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-700">
                    {clause.clause_text}
                  </div>
                )}
                {onApplyClause && !clause.applied && (
                  <button
                    onClick={() => onApplyClause(clause)}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    Apply to Contract
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Drafting Hints */}
      {regularHints.length > 0 && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
              <span>💡</span> Drafting Hints
            </h4>
            <button
              onClick={() => setExpandedHints(!expandedHints)}
              className="text-sm text-gray-600"
            >
              {expandedHints ? 'Show Less' : `Show All (${regularHints.length})`}
            </button>
          </div>
          <div className="space-y-2">
            {(expandedHints ? regularHints : regularHints.slice(0, 3)).map((hint, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium text-gray-700">Exhibit {hint.exhibit_number}:</span>
                <span className="text-gray-600 ml-1">{hint.hint_text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Consistency Warnings */}
      {advisory.consistency_warnings?.length > 0 && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <h4 className="font-semibold text-yellow-800 mb-3 flex items-center gap-2">
            <span>⚡</span> Consistency Warnings
          </h4>
          <div className="space-y-2">
            {advisory.consistency_warnings.map((warning, i) => (
              <div key={i} className="text-sm p-2 bg-white rounded border border-yellow-100">
                <p className="font-medium text-gray-900">{warning.description}</p>
                {warning.pr_value && warning.contract_value && (
                  <div className="mt-1 text-xs text-gray-600">
                    <span>PR: {warning.pr_value}</span>
                    <span className="mx-2">→</span>
                    <span>Contract: {warning.contract_value}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Contract Risk Assessment Component
 */
export const ContractRiskAssessment = ({ riskAssessment, onAcceptRisk }) => {
  if (!riskAssessment) return null;

  const getRiskColor = (level) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      high: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚠️</span>
        <h3 className="text-lg font-semibold text-gray-900">Contract Risk Assessment</h3>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <span className={`px-4 py-2 rounded-lg text-sm font-semibold border ${getRiskColor(riskAssessment.risk_level)}`}>
          {(riskAssessment.risk_level || '').toUpperCase()} RISK
        </span>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Risk Score</span>
            <span>{riskAssessment.risk_score?.toFixed(0)}/100</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                riskAssessment.risk_level === 'low' ? 'bg-green-500' :
                riskAssessment.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${riskAssessment.risk_score || 0}%` }}
            />
          </div>
        </div>
      </div>

      {riskAssessment.top_risk_drivers?.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Top Risk Drivers:</p>
          <ul className="space-y-1">
            {riskAssessment.top_risk_drivers.map((driver, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full"></span>
                {driver}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-4 text-sm pt-4 border-t">
        {riskAssessment.requires_contract_dd && (
          <span className="flex items-center gap-1 text-blue-600">
            <span>📋</span> Contract DD Required
          </span>
        )}
        {riskAssessment.requires_sama_noc && (
          <span className="flex items-center gap-1 text-orange-600">
            <span>🏛️</span> SAMA NOC Required
          </span>
        )}
        {riskAssessment.requires_risk_acceptance && (
          <span className="flex items-center gap-1 text-red-600">
            <span>⚠️</span> Risk Acceptance Required
          </span>
        )}
      </div>

      {riskAssessment.requires_risk_acceptance && onAcceptRisk && (
        <button
          onClick={onAcceptRisk}
          className="mt-4 w-full px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
        >
          Accept Risk (Head of Procurement Only)
        </button>
      )}
    </div>
  );
};

/**
 * SAMA NOC Tracking Component
 */
export const SAMANOCTracking = ({ samaNoc, contractId, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    status: samaNoc?.sama_noc_status || 'pending',
    reference_number: samaNoc?.sama_noc_reference_number || '',
    submission_date: samaNoc?.sama_noc_submission_date?.split('T')[0] || '',
    approval_date: samaNoc?.sama_noc_approval_date?.split('T')[0] || '',
    notes: samaNoc?.sama_noc_notes || '',
  });
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status) => {
    const colors = {
      not_required: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      submitted: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.put(`${API}/contract-governance/sama-noc/${contractId}`, formData, { withCredentials: true });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error updating SAMA NOC:', error);
      alert('Failed to update SAMA NOC status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏛️</span>
          <h3 className="text-lg font-semibold text-gray-900">SAMA NOC Status</h3>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Update Status
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="not_required">Not Required</option>
              <option value="pending">Pending</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              placeholder="SAMA Reference Number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Submission Date</label>
              <input
                type="date"
                value={formData.submission_date}
                onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Date</label>
              <input
                type="date"
                value={formData.approval_date}
                onChange={(e) => setFormData({ ...formData, approval_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(samaNoc?.sama_noc_status || 'pending')}`}>
              {(samaNoc?.sama_noc_status || 'pending').replace(/_/g, ' ').toUpperCase()}
            </span>
            {samaNoc?.sama_noc_reference_number && (
              <span className="text-sm text-gray-600">Ref: {samaNoc.sama_noc_reference_number}</span>
            )}
          </div>

          {samaNoc?.sama_noc_submission_date && (
            <p className="text-sm text-gray-600">
              Submitted: {new Date(samaNoc.sama_noc_submission_date).toLocaleDateString()}
            </p>
          )}

          {samaNoc?.sama_noc_approval_date && (
            <p className="text-sm text-gray-600">
              Approved: {new Date(samaNoc.sama_noc_approval_date).toLocaleDateString()}
            </p>
          )}

          {samaNoc?.sama_noc_notes && (
            <p className="text-sm text-gray-600 mt-2">{samaNoc.sama_noc_notes}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default {
  ContractContextReview,
  ContractClassificationResult,
  ContractAIAdvisory,
  ContractRiskAssessment,
  SAMANOCTracking,
};
