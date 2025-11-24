import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIPOItemAnalyzer = ({ itemDescription, onAnalysisComplete }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const handleAIAnalysis = async () => {
    if (!itemDescription || itemDescription.trim().length < 10) {
      setError('Please enter a detailed item description (at least 10 characters).');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API}/ai/analyze-po-item`,
        {
          description: itemDescription
        },
        { withCredentials: true }
      );
      
      setAiAnalysis(response.data);
      
      // Call parent callback with analysis results
      if (onAnalysisComplete) {
        onAnalysisComplete(response.data);
      }
      
    } catch (err) {
      console.error('AI PO item analysis error:', err);
      setError('AI analysis failed. Please try again or classify manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level) => {
    const colors = {
      low: 'text-green-600 bg-green-50 border-green-300',
      medium: 'text-yellow-600 bg-yellow-50 border-yellow-300',
      high: 'text-red-600 bg-red-50 border-red-300'
    };
    return colors[level] || colors.medium;
  };

  const getRiskIcon = (level) => {
    const icons = {
      low: '✅',
      medium: '⚠️',
      high: '🔴'
    };
    return icons[level] || '⚠️';
  };

  return (
    <div className="bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 p-5 rounded-xl border-2 border-cyan-300 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🤖 AI Item Analysis
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            Get intelligent suggestions for item classification
          </p>
        </div>
        <button
          type="button"
          onClick={handleAIAnalysis}
          disabled={isAnalyzing || !itemDescription}
          className={`px-4 py-2 rounded-lg font-semibold text-sm shadow transition-all ${
            isAnalyzing
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white'
          }`}
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Analyzing...
            </span>
          ) : (
            '✨ Analyze Item'
          )}
        </button>
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs text-red-700 flex items-center gap-2">
            <span>⚠️</span>
            {error}
          </p>
        </div>
      )}

      {!aiAnalysis && !isAnalyzing && (
        <div className="p-4 bg-white/70 backdrop-blur rounded-lg border border-cyan-200 text-center">
          <span className="text-3xl mb-2 block">📦</span>
          <p className="text-sm text-gray-600">
            Enter item description above and click "Analyze Item"
          </p>
        </div>
      )}

      {aiAnalysis && (
        <div className="space-y-3 animate-fadeIn">
          {/* Risk Level */}
          <div className={`p-4 rounded-lg border-2 ${getRiskColor(aiAnalysis.risk_level)}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getRiskIcon(aiAnalysis.risk_level)}</span>
                <div>
                  <p className="font-bold uppercase text-sm">{aiAnalysis.risk_level} Risk</p>
                  <p className="text-xs opacity-80">{aiAnalysis.item_type}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-80">Category</p>
                <p className="font-bold">{aiAnalysis.suggested_category}</p>
              </div>
            </div>
          </div>

          {/* Requirements Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`p-3 rounded-lg text-center ${aiAnalysis.requires_contract ? 'bg-blue-100 border-2 border-blue-300' : 'bg-gray-100'}`}>
              <p className="text-lg mb-1">{aiAnalysis.requires_contract ? '✅' : '❌'}</p>
              <p className="text-xs font-semibold text-gray-700">Contract Required</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${aiAnalysis.involves_data ? 'bg-purple-100 border-2 border-purple-300' : 'bg-gray-100'}`}>
              <p className="text-lg mb-1">{aiAnalysis.involves_data ? '✅' : '❌'}</p>
              <p className="text-xs font-semibold text-gray-700">Data Involved</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${aiAnalysis.requires_specs ? 'bg-green-100 border-2 border-green-300' : 'bg-gray-100'}`}>
              <p className="text-lg mb-1">{aiAnalysis.requires_specs ? '✅' : '❌'}</p>
              <p className="text-xs font-semibold text-gray-700">Specs Required</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${aiAnalysis.requires_inspection ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-gray-100'}`}>
              <p className="text-lg mb-1">{aiAnalysis.requires_inspection ? '✅' : '❌'}</p>
              <p className="text-xs font-semibold text-gray-700">Inspection Required</p>
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-900 mb-1">💭 AI Reasoning:</p>
            <p className="text-xs text-gray-700 leading-relaxed">{aiAnalysis.reasoning}</p>
          </div>

          {/* Actions */}
          <button
            type="button"
            onClick={handleAIAnalysis}
            className="w-full px-3 py-2 bg-white border border-cyan-300 text-cyan-700 rounded-lg text-sm font-medium hover:bg-cyan-50 transition-colors"
          >
            🔄 Re-analyze
          </button>
        </div>
      )}
    </div>
  );
};

export default AIPOItemAnalyzer;
