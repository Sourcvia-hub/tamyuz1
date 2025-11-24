import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIContractClassifier = ({ formData, setFormData }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const handleAIAnalysis = async () => {
    if (!formData.title || !formData.scope) {
      setError('Please fill in contract title and scope before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API}/ai/classify-contract`,
        {
          title: formData.title,
          description: formData.scope
        },
        { withCredentials: true }
      );
      
      setAiAnalysis(response.data);
      
      // Auto-fill classification checkboxes based on AI
      // Note: Backend model uses 'is_noc' not 'is_noc_required'
      setFormData({
        outsourcing_classification: response.data.outsourcing_classification || 'none',
        is_noc: response.data.is_noc_required || false,  // Map to correct field name
        involves_data_access: response.data.involves_data_access || false,
        involves_subcontracting: response.data.involves_subcontracting || false
      });
      
    } catch (err) {
      console.error('AI contract classification error:', err);
      setError('AI classification failed. Please try again or classify manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-blue-600 bg-blue-50';
    if (confidence >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 rounded-xl border-2 border-indigo-300 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🤖 AI Contract Classification
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            AI automatically determines contract type and requirements
          </p>
        </div>
        <button
          type="button"
          onClick={handleAIAnalysis}
          disabled={isAnalyzing || !formData.title || !formData.scope}
          className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-all ${
            isAnalyzing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'
          }`}
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing...
            </span>
          ) : (
            '✨ Analyze Contract Type'
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <p className="text-sm text-red-700 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            {error}
          </p>
        </div>
      )}

      {!aiAnalysis && !isAnalyzing && (
        <div className="p-6 bg-white/70 backdrop-blur rounded-lg border border-indigo-200 text-center">
          <span className="text-5xl mb-3 block">📋</span>
          <p className="text-gray-600">
            Fill in contract title and scope, then click "Analyze Contract Type" for intelligent classification
          </p>
        </div>
      )}

      {aiAnalysis && (
        <div className="space-y-4 animate-fadeIn">
          {/* Classification Result */}
          <div className="p-5 bg-white rounded-lg border-2 border-indigo-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-gray-900 text-lg">📊 Classification Results</h4>
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(aiAnalysis.confidence)}`}>
                {aiAnalysis.confidence}% Confidence
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Contract Type</p>
                <p className="font-bold text-gray-900 capitalize">
                  {aiAnalysis.outsourcing_classification === 'cloud_computing' ? '☁️ Cloud Computing' :
                   aiAnalysis.outsourcing_classification === 'outsourcing' ? '👥 Outsourcing' :
                   '📄 Standard Contract'}
                </p>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">NOC Required</p>
                <p className="font-bold text-gray-900">
                  {aiAnalysis.is_noc_required ? '✅ Yes' : '❌ No'}
                </p>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Data Access</p>
                <p className="font-bold text-gray-900">
                  {aiAnalysis.involves_data_access ? '✅ Yes' : '❌ No'}
                </p>
              </div>
              
              <div className="p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Subcontracting</p>
                <p className="font-bold text-gray-900">
                  {aiAnalysis.involves_subcontracting ? '✅ Yes' : '❌ No'}
                </p>
              </div>
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="p-5 bg-white rounded-lg border-2 border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              💭 AI Reasoning
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">{aiAnalysis.reasoning}</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleAIAnalysis}
              className="flex-1 px-4 py-2 bg-white border-2 border-indigo-300 text-indigo-700 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
            >
              🔄 Re-analyze
            </button>
            <button
              type="button"
              onClick={() => {
                // Classifications are already auto-filled, this just confirms
                setError(null);
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-colors"
            >
              ✅ Apply Classification
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIContractClassifier;
