// frontend/src/components/UploadScreen.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { uploadScreenshot } from '../services/api';

const sourceApps = ['Gojek', 'OVO', 'Bank Jago', 'Other']; // Example source apps

function UploadScreen() {
  const { register, handleSubmit, reset } = useForm();
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState(null);

  const onSubmit = async (data) => {
    setLoading(true);
    setParsedData(null);
    setError(null);
    try {
      const result = await uploadScreenshot(data.screenshot[0], data.sourceApp);
      setParsedData(result);
      reset(); // Clear form after successful upload
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload screenshot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-center">Upload Transaction Screenshot</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700">
            Screenshot (Image)
          </label>
          <input
            type="file"
            id="screenshot"
            {...register('screenshot', { required: true })}
            accept="image/*"
            className="mt-1 block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="sourceApp" className="block text-sm font-medium text-gray-700">
            Source Application
          </label>
          <select
            id="sourceApp"
            {...register('sourceApp', { required: true })}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option value="">Select an app</option>
            {sourceApps.map((app) => (
              <option key={app} value={app}>
                {app}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Uploading...' : 'Upload & Parse'}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-red-600 text-center">{error}</p>
      )}

      {parsedData && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Parsed Transactions:</h3>
          {parsedData.transactions && parsedData.transactions.length > 0 ? (
            <ul>
              {parsedData.transactions.map((item, index) => (
                <li key={index} className="text-sm text-gray-700">
                  {item.transaction.description} - {item.transaction.amount} ({item.is_duplicate ? 'Duplicate' : 'New'})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-700">No transactions extracted or displayed.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default UploadScreen;
