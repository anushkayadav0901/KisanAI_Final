import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';

interface InvalidImageResultProps {
  onRetry: () => void;
  message?: string;
}

export const InvalidImageResult: React.FC<InvalidImageResultProps> = ({
  onRetry,
  message = 'Non-appropriate image detected',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="max-w-2xl mx-auto mt-8"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 border-b border-red-100">
          <div className="flex items-center justify-center gap-3">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-900">Invalid Image</h2>
              <p className="text-sm text-red-700">Unable to analyze the uploaded image</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full border border-red-200">
              <X className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">
                Confidence Level: 0%
              </span>
            </div>

            <p className="text-gray-700 text-lg">{message}</p>

            <div className="bg-gray-50 rounded-lg p-6 mt-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Please ensure your image:
              </h3>
              <ul className="text-left space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Is relevant to the selected monitoring type</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Is clear and well-lit</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Shows the subject clearly without obstructions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Is in a supported format (JPEG, PNG, WebP)</span>
                </li>
              </ul>
            </div>

            {/* Retry Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRetry}
              className="mt-6 px-8 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium rounded-full flex items-center gap-2 mx-auto transition-all shadow-lg"
            >
              <RefreshCw className="w-5 h-5" />
              Try Another Image
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
