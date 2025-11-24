import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AIInvoiceMatcher = ({ invoiceDescription, milestones, onMilestoneMatched }) => {
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  const handleAIAnalysis = async () => {
    if (!invoiceDescription || invoiceDescription.trim().length < 10) {
      setError('Please enter a detailed invoice description (at least 10 characters).');
      return;
    }

    if (!milestones || milestones.length === 0) {
      setError('No milestones available for matching.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await axios.post(
        `${API}/ai/match-invoice-milestone`,
        {
          description: invoiceDescription,
          milestones: milestones
        },
        { withCredentials: true }
      );
      
      setAiAnalysis(response.data);
      
      // Callback with matched milestone
      if (onMilestoneMatched && response.data.matched_milestone_name) {
        onMilestoneMatched(response.data.matched_milestone_name);
      }
      
    } catch (err) {
      console.error('AI invoice matching error:', err);
      setError('AI matching failed. Please try again or select manually.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50 border-green-300';
    if (confidence >= 60) return 'text-blue-600 bg-blue-50 border-blue-300';
    if (confidence >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-300';
    return 'text-red-600 bg-red-50 border-red-300';
  };

  return (
    <div className="bg-gradient-to-br from-pink-50 via-rose-50 to-red-50 p-5 rounded-xl border-2 border-pink-300 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            🤖 AI Milestone Matcher
          </h4>
          <p className="text-xs text-gray-600 mt-1">
            Automatically match invoice to contract milestones
          </p>
        </div>
        <button
          type="button"
          onClick={handleAIAnalysis}
          disabled={isAnalyzing || !invoiceDescription || !milestones || milestones.length === 0}
          className={`px-4 py-2 rounded-lg font-semibold text-sm shadow transition-all ${
            isAnalyzing
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white'
          }`}
        >
          {isAnalyzing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Matching...
            </span>
          ) : (
            '✨ Match to Milestone'
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
        <div className="p-4 bg-white/70 backdrop-blur rounded-lg border border-pink-200 text-center">
          <span className="text-3xl mb-2 block">🎯</span>
          <p className="text-sm text-gray-600">
            {milestones && milestones.length > 0 
              ? 'Enter invoice description and click "Match to Milestone"'
              : 'Select a contract with milestones first'}
          </p>
        </div>
      )}

      {aiAnalysis && (
        <div className="space-y-3 animate-fadeIn">
          {/* Best Match */}
          <div className={`p-4 rounded-lg border-2 ${aiAnalysis.matched_milestone_name ? getConfidenceColor(aiAnalysis.confidence) : 'bg-gray-100 border-gray-300'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium opacity-80">Best Match</p>
              <div className={`px-2 py-1 rounded text-xs font-bold ${getConfidenceColor(aiAnalysis.confidence)}`}>
                {aiAnalysis.confidence}% Confidence
              </div>
            </div>
            
            {aiAnalysis.matched_milestone_name ? (
              <div>
                <p className="text-xl font-bold text-gray-900 mb-1">✅ {aiAnalysis.matched_milestone_name}</p>
                <p className="text-xs text-gray-600">This milestone best matches your invoice description</p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-bold text-gray-700 mb-1">❌ No Clear Match</p>
                <p className="text-xs text-gray-600">AI couldn't confidently match to any milestone</p>
              </div>
            )}
          </div>

          {/* AI Reasoning */}
          <div className="p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-900 mb-1">💭 AI Reasoning:</p>
            <p className="text-xs text-gray-700 leading-relaxed">{aiAnalysis.reasoning}</p>
          </div>

          {/* Alternative Matches */}
          {aiAnalysis.alternative_matches && aiAnalysis.alternative_matches.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-2">🔄 Alternative Matches:</p>
              <ul className="space-y-1">
                {aiAnalysis.alternative_matches.map((alt, index) => (
                  <li key={index} className="text-xs text-blue-800 flex items-center gap-1">
                    <span className="text-blue-500">•</span>
                    <span>{alt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAIAnalysis}
              className="flex-1 px-3 py-2 bg-white border border-pink-300 text-pink-700 rounded-lg text-sm font-medium hover:bg-pink-50 transition-colors"
            >
              🔄 Re-match
            </button>
            {aiAnalysis.matched_milestone_name && (
              <button
                type="button"
                onClick={() => {
                  if (onMilestoneMatched) {
                    onMilestoneMatched(aiAnalysis.matched_milestone_name);
                  }
                }}
                className="flex-1 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-700 hover:to-emerald-700 transition-colors"
              >
                ✅ Select This Milestone
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIInvoiceMatcher;
