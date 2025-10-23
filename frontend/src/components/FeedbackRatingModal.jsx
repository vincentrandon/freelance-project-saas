import React, { useState } from 'react';
import { useRateExtraction } from '../api/hooks';

/**
 * FeedbackRatingModal - User rating interface for AI extraction quality
 *
 * Shows after document approval to collect feedback for AI learning.
 * Supports thumbs up/down with optional comments.
 */
function FeedbackRatingModal({ isOpen, onClose, previewId, documentName }) {
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const rateExtractionMutation = useRateExtraction();

  const ratingOptions = [
    {
      value: 'excellent',
      label: 'Excellent',
      description: 'Perfect extraction, no corrections needed',
      icon: '👍',
      color: 'green',
    },
    {
      value: 'good',
      label: 'Good',
      description: 'Minor corrections needed',
      icon: '✓',
      color: 'blue',
    },
    {
      value: 'needs_improvement',
      label: 'Needs Improvement',
      description: 'Several corrections needed',
      icon: '⚠',
      color: 'yellow',
    },
    {
      value: 'poor',
      label: 'Poor',
      description: 'Major corrections needed',
      icon: '👎',
      color: 'red',
    },
  ];

  const handleSubmit = async () => {
    if (!rating) return;

    try {
      await rateExtractionMutation.mutateAsync({
        previewId,
        rating,
        comment: comment.trim() || undefined,
      });

      setSubmitted(true);

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to submit rating:', error);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 border border-gray-700">
        {submitted ? (
          // Success State
          <div className="text-center py-8">
            <div className="mb-4 text-6xl">🎉</div>
            <h3 className="text-2xl font-bold text-white mb-2">Thank you!</h3>
            <p className="text-gray-400">
              Your feedback helps improve AI extraction quality.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">
                How was the AI extraction quality?
              </h3>
              <p className="text-gray-400 text-sm">
                Document: <span className="text-white font-medium">{documentName}</span>
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Your feedback trains the AI to improve future extractions
              </p>
            </div>

            {/* Rating Options */}
            <div className="space-y-3 mb-6">
              {ratingOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRating(option.value)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    rating === option.value
                      ? `border-${option.color}-500 bg-${option.color}-500 bg-opacity-10`
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{option.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{option.label}</div>
                      <div className="text-sm text-gray-400">{option.description}</div>
                    </div>
                    {rating === option.value && (
                      <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Optional Comment */}
            {rating && (
              <div className="mb-6 animate-fadeIn">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Additional comments (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What specific issues did you encounter? This helps us improve..."
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows="3"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between gap-3">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Skip for now
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!rating || rateExtractionMutation.isPending}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    rating && !rateExtractionMutation.isPending
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {rateExtractionMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default FeedbackRatingModal;
