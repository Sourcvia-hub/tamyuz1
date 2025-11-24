import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIDueDiligence = ({ formData, setFormData }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const handleAIAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API}/ai/analyze-vendor`,
        {
          name_english: formData.name_english,
          vat_number: formData.vat_number,
          cr_number: formData.cr_number,
          activity_description: formData.activity_description,
          number_of_employees: formData.number_of_employees,
          country_list: formData.country || 'Not specified',
        },
        { withCredentials: true }
      );
      
      setAiAnalysis(response.data);
      
      // Auto-fill risk score and category (ensure numbers not strings)
      setFormData(prev => ({
        ...prev,
        risk_score: parseInt(response.data.risk_score) || 50,
        risk_category: response.data.risk_category || 'medium'
      }));
      
    } catch (err) {
      console.error('AI analysis error:', err);
      setError('AI analysis failed. Please try again or set risk manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (category) => {
    const colors = {
      low: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      high: 'text-red-600 bg-red-50 border-red-200',
      very_high: 'text-red-800 bg-red-100 border-red-300'
    };
    return colors[category] || colors.medium;
  };

  const getRiskIcon = (category) => {
    const icons = {
      low: '✅',
      medium: '⚠️',
      high: '🔴',
      very_high: '🚨'
    };
    return icons[category] || '⚠️';
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-300 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            🤖 AI-Powered Due Diligence
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Get AI-powered risk assessment based on vendor information
          </p>
        </div>
        <button
          type="button"
          onClick={handleAIAnalysis}
          disabled={isAnalyzing || !formData.name_english || !formData.activity_description}
          className={`px-6 py-3 rounded-lg font-semibold shadow-md transition-all ${
            isAnalyzing
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
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
            '✨ Analyze Risk with AI'
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
        <div className="p-6 bg-white/70 backdrop-blur rounded-lg border border-purple-200 text-center">
          <span className="text-5xl mb-3 block">🎯</span>
          <p className="text-gray-600">
            Fill in vendor information and click "Analyze Risk with AI" to get intelligent risk assessment
          </p>
        </div>
      )}

      {aiAnalysis && (
        <div className="space-y-4 animate-fadeIn">
          {/* Risk Score Card */}
          <div className={`p-5 rounded-lg border-2 ${getRiskColor(aiAnalysis.risk_category)}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{getRiskIcon(aiAnalysis.risk_category)}</span>
                <div>
                  <h4 className="text-lg font-bold uppercase">{aiAnalysis.risk_category} Risk</h4>
                  <p className="text-sm opacity-80">AI Confidence Score</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{aiAnalysis.risk_score}</div>
                <div className="text-sm opacity-80">out of 100</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full transition-all duration-1000 bg-current"
                style={{ width: `${aiAnalysis.risk_score}%` }}
              />
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="p-5 bg-white rounded-lg border-2 border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              💭 AI Analysis
            </h4>
            <p className="text-sm text-gray-700 leading-relaxed">{aiAnalysis.reasoning}</p>
          </div>

          {/* Red Flags */}
          {aiAnalysis.red_flags && aiAnalysis.red_flags.length > 0 && (
            <div className="p-5 bg-red-50 rounded-lg border-2 border-red-200">
              <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                🚩 Red Flags Identified
              </h4>
              <ul className="space-y-2">
                {aiAnalysis.red_flags.map((flag, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-red-800">
                    <span className="text-red-500 font-bold mt-0.5">•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
            <div className="p-5 bg-blue-50 rounded-lg border-2 border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                💡 Recommendations
              </h4>
              <ul className="space-y-2">
                {aiAnalysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-blue-800">
                    <span className="text-blue-500 font-bold mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleAIAnalysis}
              className="flex-1 px-4 py-2 bg-white border-2 border-purple-300 text-purple-700 rounded-lg font-medium hover:bg-purple-50 transition-colors"
            >
              🔄 Re-analyze
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  risk_score: parseInt(aiAnalysis.risk_score) || 50,
                  risk_category: aiAnalysis.risk_category || 'medium'
                }));
              }}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-medium hover:from-green-700 hover:to-emerald-700 transition-colors"
            >
              ✅ Accept AI Assessment
            </button>
          </div>
        </div>
      )}

      {/* Manual Override Section */}
      <div className="mt-6 p-4 bg-white/70 backdrop-blur rounded-lg border border-gray-300">
        <h4 className="font-semibold text-gray-900 mb-3">📝 Manual Risk Assessment (Optional)</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Risk Category</label>
            <select
              value={formData.risk_category || 'medium'}
              onChange={(e) => setFormData(prev => ({ ...prev, risk_category: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
              <option value="very_high">Very High Risk</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Risk Score (0-100)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.risk_score || 50}
              onChange={(e) => {
                const value = Math.max(0, Math.min(100, parseInt(e.target.value) || 50));
                setFormData(prev => ({ ...prev, risk_score: value }));
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDueDiligence;
