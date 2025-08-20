import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { getToken } from '../../api';

export default function PhotoUpload({ courtId, onUploadSuccess, onUploadError }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const onDrop = useCallback(async (acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    setUploading(true);
    const token = getToken();
    
    if (!token) {
      onUploadError?.('You must be logged in to upload photos');
      setUploading(false);
      return;
    }

    try {
      const formData = new FormData();
      
      // Add files to FormData
      acceptedFiles.forEach((file) => {
        formData.append('photos', file);
      });

      // Track upload progress for each file
      const initialProgress = {};
      acceptedFiles.forEach((file, index) => {
        initialProgress[index] = 0;
      });
      setUploadProgress(initialProgress);

      const response = await fetch(`${API_BASE_URL}/courts/${courtId}/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const result = await response.json();
      
      // Clear progress
      setUploadProgress({});
      
      onUploadSuccess?.(result);
      
    } catch (error) {
      console.error('Upload error:', error);
      onUploadError?.(error.message || 'Failed to upload photos');
    } finally {
      setUploading(false);
    }
  }, [courtId, onUploadSuccess, onUploadError]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    acceptedFiles,
    fileRejections
  } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading
  });

  const getDropzoneClassName = () => {
    let className = 'photo-dropzone';
    
    if (isDragActive) className += ' photo-dropzone-active';
    if (isDragAccept) className += ' photo-dropzone-accept';
    if (isDragReject) className += ' photo-dropzone-reject';
    if (uploading) className += ' photo-dropzone-uploading';
    
    return className;
  };

  return (
    <div className="photo-upload-container">
      <div {...getRootProps({ className: getDropzoneClassName() })}>
        <input {...getInputProps()} />
        
        <div className="photo-dropzone-content">
          {uploading ? (
            <div className="photo-upload-progress">
              <div className="upload-spinner">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Uploading...</span>
                </div>
              </div>
              <p>Uploading photos...</p>
              {Object.keys(uploadProgress).length > 0 && (
                <div className="upload-files-progress">
                  {Object.entries(uploadProgress).map(([index, progress]) => (
                    <div key={index} className="upload-file-progress">
                      <div className="progress">
                        <div 
                          className="progress-bar" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="photo-dropzone-idle">
              <div className="photo-dropzone-icon">
                📷
              </div>
              <div className="photo-dropzone-text">
                {isDragActive ? (
                  isDragAccept ? (
                    <p><strong>Drop photos here...</strong></p>
                  ) : (
                    <p><strong>Some files are not supported</strong></p>
                  )
                ) : (
                  <>
                    <p><strong>Drag & drop photos here</strong></p>
                    <p>or <span className="photo-dropzone-link">click to browse</span></p>
                    <small>Up to 5 photos • JPEG, PNG, WebP • Max 10MB each</small>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Selected Files Preview */}
      {acceptedFiles.length > 0 && !uploading && (
        <div className="photo-upload-preview">
          <h6>Selected Files:</h6>
          <div className="photo-preview-list">
            {acceptedFiles.map((file, index) => (
              <div key={index} className="photo-preview-item">
                <span className="photo-preview-name">{file.name}</span>
                <span className="photo-preview-size">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Files */}
      {fileRejections.length > 0 && (
        <div className="photo-upload-errors">
          <h6>Rejected Files:</h6>
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="photo-error-item">
              <span className="photo-error-name">{file.name}</span>
              <ul className="photo-error-list">
                {errors.map(error => (
                  <li key={error.code} className="photo-error-message">
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}