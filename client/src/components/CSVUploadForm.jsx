import { useState } from 'react';
import Papa from 'papaparse';

export default function CSVUploadForm({ onUpload, expectedHeaders, validateRow }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [errors, setErrors] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (csvFile) => {
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Validate headers
        if (expectedHeaders) {
          const fileHeaders = results.meta.fields;
          const missingHeaders = expectedHeaders.filter(h => !fileHeaders.includes(h));

          if (missingHeaders.length > 0) {
            alert(`Missing required columns: ${missingHeaders.join(', ')}`);
            setFile(null);
            return;
          }
        }

        // Validate rows if validator provided
        if (validateRow) {
          const validatedData = results.data.map((row, index) => ({
            ...row,
            _rowNumber: index + 2, // +2 because row 1 is header
            _errors: validateRow(row)
          }));

          const rowErrors = validatedData.filter(row => row._errors && row._errors.length > 0);
          setErrors(rowErrors);
          setParsedData(validatedData);
        } else {
          setParsedData(results.data);
        }
      },
      error: (error) => {
        alert(`Error parsing CSV: ${error.message}`);
        setFile(null);
      }
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    if (!parsedData || parsedData.length === 0) {
      alert('No data to upload');
      return;
    }

    if (errors.length > 0) {
      const proceed = window.confirm(
        `There are ${errors.length} rows with errors. Do you want to upload only the valid rows?`
      );
      if (!proceed) return;
    }

    setIsUploading(true);

    try {
      // Filter out rows with errors
      const validData = parsedData.filter(row => !row._errors || row._errors.length === 0);

      // Remove validation metadata
      const cleanData = validData.map(row => {
        const { _rowNumber, _errors, ...cleanRow } = row;
        return cleanRow;
      });

      await onUpload(cleanData);

      // Reset form
      setFile(null);
      setParsedData(null);
      setErrors([]);
    } catch (error) {
      alert(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setErrors([]);
  };

  return (
    <div className="space-y-4">
      {/* File Upload Area */}
      {!file && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-primary'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="mt-2 text-sm text-gray-600">
            Drag and drop your CSV file here, or
          </p>
          <label className="mt-2 inline-block">
            <span className="px-4 py-2 bg-primary text-white rounded-md cursor-pointer hover:brightness-90">
              Browse Files
            </span>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files[0])}
            />
          </label>
        </div>
      )}

      {/* File Info and Preview */}
      {file && parsedData && (
        <div className="space-y-4">
          {/* File Info */}
          <div className="bg-gray-50 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <svg className="h-8 w-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-500">
                  {parsedData.length} rows • {errors.length} errors
                </p>
              </div>
            </div>
            <button
              onClick={handleReset}
              className="text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">
                {errors.length} Row(s) with Errors
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {errors.slice(0, 10).map((row, idx) => (
                  <div key={idx} className="text-sm text-red-700">
                    <span className="font-medium">Row {row._rowNumber}:</span>{' '}
                    {row._errors.join(', ')}
                  </div>
                ))}
                {errors.length > 10 && (
                  <p className="text-sm text-red-600">
                    ...and {errors.length - 10} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Data Preview */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b">
              <h4 className="font-medium">Data Preview</h4>
            </div>
            <div className="overflow-x-auto max-h-64">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {parsedData.length > 0 &&
                      Object.keys(parsedData[0])
                        .filter(key => !key.startsWith('_'))
                        .map((key) => (
                          <th
                            key={key}
                            className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                          >
                            {key}
                          </th>
                        ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {parsedData.slice(0, 5).map((row, idx) => (
                    <tr
                      key={idx}
                      className={row._errors && row._errors.length > 0 ? 'bg-red-50' : ''}
                    >
                      {Object.entries(row)
                        .filter(([key]) => !key.startsWith('_'))
                        .map(([key, value], cellIdx) => (
                          <td key={cellIdx} className="px-4 py-2 text-sm">
                            {value}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedData.length > 5 && (
                <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 text-center">
                  ...and {parsedData.length - 5} more rows
                </div>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || parsedData.length === 0}
              className="px-4 py-2 bg-primary text-white rounded-md hover:brightness-90 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : `Upload ${parsedData.length - errors.length} Valid Rows`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
