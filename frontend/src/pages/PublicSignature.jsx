import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePublicSignatureRequest, useSignEstimate, useDeclineEstimate } from '../api/hooks';

function PublicSignature() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { data: signatureRequest, isLoading, error } = usePublicSignatureRequest(token);
  const signMutation = useSignEstimate();
  const declineMutation = useDeclineEstimate();

  const [signatureType, setSignatureType] = useState('typed'); // 'typed', 'drawn', 'upload'
  const [typedName, setTypedName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [comments, setComments] = useState('');
  const canvasRef = useRef(null);
  const [canvasContext, setCanvasContext] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);

  // Initialize canvas
  React.useEffect(() => {
    if (canvasRef.current && signatureType === 'drawn') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      setCanvasContext(ctx);
    }
  }, [signatureType]);

  // Drawing handlers
  const startDrawing = (e) => {
    if (!canvasContext) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    canvasContext.beginPath();
    canvasContext.moveTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
  };

  const draw = (e) => {
    if (!isDrawing || !canvasContext) return;
    const rect = canvasRef.current.getBoundingClientRect();
    canvasContext.lineTo(
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    canvasContext.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!canvasContext || !canvasRef.current) return;
    canvasContext.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
    } else {
      alert('Please upload an image file');
    }
  };

  const handleSign = async () => {
    let signatureMethod = signatureType;
    let signatureData = {};

    if (signatureType === 'typed') {
      if (!typedName.trim()) {
        alert('Please enter your name');
        return;
      }
      signatureData = {
        typed_name: typedName,
      };
    } else if (signatureType === 'drawn') {
      if (!canvasRef.current) {
        alert('Please draw your signature');
        return;
      }
      signatureData = {
        signature_image: canvasRef.current.toDataURL(),
      };
    } else if (signatureType === 'upload') {
      if (!uploadedFile) {
        alert('Please upload a signature image');
        return;
      }
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const data = {
          signature_image: reader.result,
        };
        await submitSignature('upload', data);
      };
      reader.readAsDataURL(uploadedFile);
      return;
    }

    await submitSignature(signatureMethod, signatureData);
  };

  const submitSignature = async (method, data) => {
    try {
      await signMutation.mutateAsync({
        token,
        signature_method: method,
        signature_data: data,
      });
      setShowSuccessModal(true);
    } catch (err) {
      console.error('Error signing estimate:', err);
      alert('Failed to sign estimate: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDecline = async () => {
    setShowDeclineModal(true);
  };

  const confirmDecline = async (reason) => {
    try {
      await declineMutation.mutateAsync({
        token,
        reason,
      });
      setShowDeclineModal(false);
      // Reload to show declined state
      window.location.reload();
    } catch (err) {
      console.error('Error declining estimate:', err);
      alert('Failed to decline estimate: ' + (err.response?.data?.error || err.message));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !signatureRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full text-center border border-gray-700">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Invalid or Expired Link</h1>
          <p className="text-gray-300 mb-6">
            This signature request is no longer valid. Please contact the sender for a new link.
          </p>
        </div>
      </div>
    );
  }

  const { estimate, status } = signatureRequest;

  if (status === 'signed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full text-center border border-green-700">
          <div className="text-green-400 text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-white mb-4">Already Signed</h1>
          <p className="text-gray-300 mb-6">
            This estimate has already been signed on{' '}
            {new Date(signatureRequest.signed_at).toLocaleDateString()}.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'declined') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full text-center border border-red-700">
          <div className="text-red-400 text-5xl mb-4">✗</div>
          <h1 className="text-2xl font-bold text-white mb-4">Declined</h1>
          <p className="text-gray-300 mb-6">
            This estimate was declined on{' '}
            {new Date(signatureRequest.signed_at).toLocaleDateString()}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4 py-12">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 mb-6 border border-gray-700">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">Estimate Signature Request</h1>
            <p className="text-gray-400">
              Please review and sign the estimate below
            </p>
          </div>

          {/* Estimate Details */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Estimate Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Number:</span>
                  <span className="text-white font-semibold">{estimate.estimate_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Date:</span>
                  <span className="text-white">{new Date(estimate.issue_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Valid Until:</span>
                  <span className="text-white">{new Date(estimate.valid_until).toLocaleDateString()}</span>
                </div>
                {estimate.version > 1 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Version:</span>
                    <span className="text-violet-400 font-semibold">v{estimate.version}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Signer Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white font-semibold">{signatureRequest.signer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-white">{signatureRequest.signer_email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div className="bg-gradient-to-r from-violet-900/30 to-purple-900/30 rounded-lg p-6 border border-violet-700">
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold text-gray-200">Total Amount:</span>
              <span className="text-3xl font-bold text-violet-400">
                {estimate.total.toLocaleString()} {estimate.currency}
              </span>
            </div>
            {estimate.tjm_used && (
              <p className="text-sm text-gray-400 mt-2">
                Based on TJM: {estimate.tjm_used} {estimate.currency}/day × {estimate.total_days} days
              </p>
            )}
          </div>

          {/* Estimate Items */}
          {estimate.items && estimate.items.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Items</h3>
              <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-950 border-b border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-gray-400 font-medium">Description</th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">Quantity</th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">Rate</th>
                      <th className="px-4 py-3 text-right text-gray-400 font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {estimate.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-white">{item.description || item.name}</td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {item.quantity} {item.unit || ''}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-300">
                          {item.rate.toLocaleString()} {estimate.currency}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-semibold">
                          {item.amount.toLocaleString()} {estimate.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notes */}
          {estimate.notes && (
            <div className="mt-6 bg-blue-900/20 border border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">Notes</h3>
              <p className="text-gray-300 text-sm whitespace-pre-wrap">{estimate.notes}</p>
            </div>
          )}
        </div>

        {/* Signature Section */}
        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-6">Sign This Estimate</h2>

          {/* Signature Type Selection */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setSignatureType('typed')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                signatureType === 'typed'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Type Name
            </button>
            <button
              onClick={() => setSignatureType('drawn')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                signatureType === 'drawn'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Draw Signature
            </button>
            <button
              onClick={() => setSignatureType('upload')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                signatureType === 'upload'
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Upload Image
            </button>
          </div>

          {/* Signature Input */}
          <div className="mb-6">
            {signatureType === 'typed' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type your full name
                </label>
                <input
                  type="text"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white text-2xl font-signature"
                  style={{ fontFamily: 'Brush Script MT, cursive' }}
                />
              </div>
            )}

            {signatureType === 'drawn' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Draw your signature below
                </label>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full border-2 border-gray-700 rounded-lg bg-white cursor-crosshair"
                />
                <button
                  onClick={clearCanvas}
                  className="mt-2 text-sm text-red-400 hover:text-red-300"
                >
                  Clear Signature
                </button>
              </div>
            )}

            {signatureType === 'upload' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload signature image
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                />
                {uploadedFile && (
                  <p className="mt-2 text-sm text-green-400">
                    ✓ {uploadedFile.name} selected
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Comments (optional)
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows="3"
              placeholder="Any additional comments or questions..."
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
            />
          </div>

          {/* Legal Text */}
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-400">
              By signing this estimate, you agree to the terms and conditions outlined in the document.
              This constitutes a legally binding agreement. You will receive a signed copy via email.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleSign}
              disabled={signMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {signMutation.isPending ? 'Signing...' : '✓ Sign & Accept'}
            </button>
            <button
              onClick={handleDecline}
              disabled={declineMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {declineMutation.isPending ? 'Declining...' : '✗ Decline'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>This is a secure signature request. Your signature will be encrypted and stored securely.</p>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full text-center border border-green-700">
            <div className="mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/20 mb-4">
                <svg className="h-10 w-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Successfully Signed!</h3>
              <p className="text-gray-300">
                Thank you for signing this estimate. The sender has been notified.
              </p>
            </div>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">Decline Estimate</h3>
            <p className="text-gray-300 mb-4">
              Are you sure you want to decline this estimate? This action cannot be undone.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason (Optional)
              </label>
              <textarea
                id="decline-reason"
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Please provide a reason for declining..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const reason = document.getElementById('decline-reason').value;
                  confirmDecline(reason);
                }}
                disabled={declineMutation.isPending}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {declineMutation.isPending ? 'Declining...' : 'Decline Estimate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublicSignature;
