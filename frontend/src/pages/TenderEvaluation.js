import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import AITenderEvaluator from '../components/AITenderEvaluator';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TenderEvaluation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tender, setTender] = useState(null);
  const [evaluationData, setEvaluationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [showEvaluateModal, setShowEvaluateModal] = useState(false);
  const [evaluationForm, setEvaluationForm] = useState({
    vendor_reliability_stability: 3,
    delivery_warranty_backup: 3,
    technical_experience: 3,
    cost_score: 3,
    meets_requirements: 3,
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [tenderRes, evalRes] = await Promise.all([
        axios.get(`${API}/tenders/${id}`, { withCredentials: true }),
        axios.post(`${API}/tenders/${id}/evaluate`, {}, { withCredentials: true }),
      ]);
      setTender(tenderRes.data);
      setEvaluationData(evalRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = (proposal) => {
    setSelectedProposal(proposal);
    // Set suggested cost score if available
    setEvaluationForm({
      vendor_reliability_stability: 3,
      delivery_warranty_backup: 3,
      technical_experience: 3,
      cost_score: proposal.suggested_cost_score || 3,
      meets_requirements: 3,
    });
    setShowEvaluateModal(true);
  };

  const submitEvaluation = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API}/tenders/${id}/proposals/${selectedProposal.proposal_id}/evaluate`,
        {
          proposal_id: selectedProposal.proposal_id,
          ...evaluationForm,
        },
        { withCredentials: true }
      );
      setShowEvaluateModal(false);
      setSelectedProposal(null);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      const errorMessage = error.response?.data?.detail 
        ? (typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail))
        : error.message;
      alert('Failed to submit evaluation: ' + errorMessage);
    }
  };

  const getCriteriaColor = (score) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate('/tenders')}
            className="text-blue-600 hover:text-blue-800 mb-2 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Tenders
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Tender Evaluation</h1>
          <p className="text-gray-600 mt-1">{tender?.title}</p>
          <div className="mt-2 flex items-center space-x-4 text-sm">
            <span className="text-gray-600">Total Proposals: <strong>{evaluationData?.total_proposals || 0}</strong></span>
            <span className="text-gray-600">Evaluated: <strong>{evaluationData?.evaluated_count || 0}</strong></span>
          </div>
        </div>

        {/* Evaluation Criteria Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluation Criteria & Weights</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-gray-600">Vendor Reliability & Stability</p>
              <p className="text-2xl font-bold text-blue-600">20%</p>
              <p className="text-xs text-gray-500 mt-1">Score: 1-5</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-gray-600">Delivery Warranty & Response</p>
              <p className="text-2xl font-bold text-green-600">20%</p>
              <p className="text-xs text-gray-500 mt-1">Score: 1-5</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-gray-600">Technical Experience</p>
              <p className="text-2xl font-bold text-purple-600">10%</p>
              <p className="text-xs text-gray-500 mt-1">Score: 1-5</p>
            </div>
            <div className="bg-white p-4 rounded-lg">
              <p className="text-sm text-gray-600">Cost</p>
              <p className="text-2xl font-bold text-orange-600">10%</p>
              <p className="text-xs text-gray-500 mt-1">Score: 1-5 (auto-calculated)</p>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-red-300">
              <p className="text-sm text-gray-600">Meets Requirements</p>
              <p className="text-2xl font-bold text-red-600">40%</p>
              <p className="text-xs text-gray-500 mt-1">Score: 1-5</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 mt-4">
            * Total weight: 100% (20% + 20% + 10% + 10% + 40%)
          </p>
        </div>

        {/* Proposals List */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Financial Proposal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Evaluation Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {evaluationData?.proposals?.map((proposal, index) => (
                <tr key={proposal.proposal_id} className={index === 0 && proposal.evaluated ? 'bg-green-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {proposal.evaluated ? (
                      <span className={`text-2xl font-bold ${index === 0 ? 'text-green-600' : 'text-gray-700'}`}>
                        #{index + 1}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{proposal.vendor_name}</div>
                    <div className="text-xs text-gray-500">{proposal.vendor_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">${proposal.financial_proposal.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Cost Score: {proposal.suggested_cost_score?.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {proposal.evaluated ? (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Evaluated
                      </span>
                    ) : (
                      <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {proposal.evaluated ? (
                      <div>
                        <span className={`text-2xl font-bold ${getCriteriaColor(proposal.final_score)}`}>
                          {proposal.final_score.toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-sm ml-1">/ 3.0</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Not evaluated</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEvaluate(proposal)}
                      className="text-blue-600 hover:text-blue-900 font-medium"
                    >
                      {proposal.evaluated ? 'Re-evaluate' : 'Evaluate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Evaluation Details for Evaluated Proposals */}
        {evaluationData?.proposals?.some(p => p.evaluated) && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Detailed Evaluation Breakdown</h3>
            <div className="space-y-4">
              {evaluationData.proposals.filter(p => p.evaluated).map((proposal) => (
                <div key={proposal.proposal_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900">{proposal.vendor_name}</h4>
                    <span className="text-xl font-bold text-blue-600">{proposal.final_score.toFixed(2)}</span>
                  </div>
                  {proposal.evaluation && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Vendor Reliability</p>
                        <p className="font-semibold">
                          {proposal.evaluation.vendor_reliability_stability}/5 
                          <span className="text-gray-500 text-xs ml-1">
                            ({proposal.evaluation.vendor_reliability_weighted.toFixed(2)})
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Delivery Warranty</p>
                        <p className="font-semibold">
                          {proposal.evaluation.delivery_warranty_backup}/5
                          <span className="text-gray-500 text-xs ml-1">
                            ({proposal.evaluation.delivery_warranty_weighted.toFixed(2)})
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Technical Experience</p>
                        <p className="font-semibold">
                          {proposal.evaluation.technical_experience}/5
                          <span className="text-gray-500 text-xs ml-1">
                            ({proposal.evaluation.technical_experience_weighted.toFixed(2)})
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Cost</p>
                        <p className="font-semibold">
                          {proposal.evaluation.cost_score}/5
                          <span className="text-gray-500 text-xs ml-1">
                            ({proposal.evaluation.cost_weighted.toFixed(2)})
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Evaluation Modal */}
      {showEvaluateModal && selectedProposal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Evaluate Proposal</h2>
            <p className="text-gray-600 mb-6">Vendor: <strong>{selectedProposal.vendor_name}</strong></p>
            
            {/* AI Tender Evaluator */}
            <div className="mb-6">
              <AITenderEvaluator 
                tenderData={{
                  title: tender?.title,
                  requirements: tender?.requirements || tender?.description,
                  budget: tender?.budget
                }}
                proposalData={{
                  vendor_name: selectedProposal.vendor_name,
                  proposed_price: selectedProposal.proposed_price,
                  technical_approach: selectedProposal.technical_approach || 'See proposal details',
                  timeline: selectedProposal.delivery_time || 'See proposal details'
                }}
                onScoresGenerated={(scores) => {
                  // Auto-fill form with AI scores (convert 0-100 to 1-5 scale)
                  setEvaluationForm({
                    vendor_reliability_stability: Math.round((scores.technical_score / 20) * 10) / 10,
                    delivery_warranty_backup: Math.round((scores.financial_score / 20) * 10) / 10,
                    technical_experience: Math.round((scores.overall_score / 20) * 10) / 10,
                    cost_score: evaluationForm.cost_score,
                    meets_requirements: Math.round((scores.overall_score / 20) * 10) / 10,
                  });
                }}
              />
            </div>
            
            <form onSubmit={submitEvaluation} className="space-y-6">
              {/* Vendor Reliability & Stability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vendor Reliability & Stability (Weight: 20%) *
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={evaluationForm.vendor_reliability_stability}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, vendor_reliability_stability: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-blue-600 w-16 text-center">
                    {evaluationForm.vendor_reliability_stability}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Assess vendor's dependability, track record, and financial stability</p>
              </div>

              {/* Delivery Warranty & Response */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Warranty, Backup & Response (Weight: 20%) *
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={evaluationForm.delivery_warranty_backup}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, delivery_warranty_backup: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-green-600 w-16 text-center">
                    {evaluationForm.delivery_warranty_backup}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Evaluate after-sales support, warranty terms, and response time</p>
              </div>

              {/* Technical Experience */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Technical Experience (Weight: 10%) *
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={evaluationForm.technical_experience}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, technical_experience: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-purple-600 w-16 text-center">
                    {evaluationForm.technical_experience}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Consider relevant experience, certifications, and past projects</p>
              </div>

              {/* Cost Score */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost Score (Weight: 10%) *
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={evaluationForm.cost_score}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, cost_score: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-orange-600 w-16 text-center">
                    {evaluationForm.cost_score}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Suggested: {selectedProposal.suggested_cost_score?.toFixed(2)} (based on lowest price comparison)
                </p>
              </div>

              {/* Meets Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meets Requirements (Weight: 40%) *
                </label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={evaluationForm.meets_requirements}
                    onChange={(e) => setEvaluationForm({ ...evaluationForm, meets_requirements: parseFloat(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-red-600 w-16 text-center">
                    {evaluationForm.meets_requirements}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Evaluate how well the proposal meets the tender requirements and specifications</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Estimated Total Score:</strong> {' '}
                  <span className="text-xl font-bold text-blue-600">
                    {(
                      evaluationForm.vendor_reliability_stability * 0.20 +
                      evaluationForm.delivery_warranty_backup * 0.20 +
                      evaluationForm.technical_experience * 0.10 +
                      evaluationForm.cost_score * 0.10 +
                      evaluationForm.meets_requirements * 0.40
                    ).toFixed(2)}
                  </span>
                  <span className="text-gray-500"> / 5.0</span>
                </p>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEvaluateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Submit Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TenderEvaluation;
