import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function ReviewPhotoUpload({ onPhotosSelected, maxPhotos = 3 }) {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    // Limit to maxPhotos
    const filesToAdd = acceptedFiles.slice(0, maxPhotos - selectedFiles.length);
    const newFiles = [...selectedFiles, ...filesToAdd].slice(0, maxPhotos);
    
    setSelectedFiles(newFiles);
    onPhotosSelected?.(newFiles);
  }, [selectedFiles, maxPhotos, onPhotosSelected]);

  const removeFile = (indexToRemove) => {
    const newFiles = selectedFiles.filter((_, index) => index !== indexToRemove);
    setSelectedFiles(newFiles);
    onPhotosSelected?.(newFiles);
  };

  const clearFiles = () => {
    setSelectedFiles([]);
    onPhotosSelected?.([]);
  };

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
    fileRejections
  } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: maxPhotos,
    maxSize: 5 * 1024 * 1024, // 5MB for reviews
    disabled: selectedFiles.length >= maxPhotos
  });

  const getDropzoneClassName = () => {
    let className = 'review-photo-dropzone';
    
    if (isDragActive) className += ' review-photo-dropzone-active';
    if (isDragAccept) className += ' review-photo-dropzone-accept';
    if (isDragReject) className += ' review-photo-dropzone-reject';
    if (selectedFiles.length >= maxPhotos) className += ' review-photo-dropzone-disabled';
    
    return className;
  };

  return (
    <div className="review-photo-upload">
      {/* Dropzone */}
      {selectedFiles.length < maxPhotos && (
        <div {...getRootProps({ className: getDropzoneClassName() })}>
          <input {...getInputProps()} />
          
          <div className="review-photo-dropzone-content">
            <div className="review-photo-dropzone-icon">📷</div>
            <div className="review-photo-dropzone-text">
              {isDragActive ? (
                isDragAccept ? (
                  <p><strong>Drop photos here...</strong></p>
                ) : (
                  <p><strong>Some files are not supported</strong></p>
                )
              ) : (
                <>
                  <p><strong>Add photos to your review</strong></p>
                  <small>Up to {maxPhotos} photos • JPEG, PNG, WebP • Max 5MB each</small>
                  <small style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280' }}>
                    📝 Please only upload photos related to this court
                  </small>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="review-photo-preview">
          <div className="review-photo-preview-header">
            <span className="review-photo-count">
              {selectedFiles.length} photo{selectedFiles.length !== 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              onClick={clearFiles}
              className="review-photo-clear"
            >
              Clear all
            </button>
          </div>
          
          <div className="review-photo-preview-grid">
            {selectedFiles.map((file, index) => (
              <div key={index} className="review-photo-preview-item">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  className="review-photo-preview-image"
                />
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="review-photo-remove"
                >
                  ✕
                </button>
                <div className="review-photo-preview-info">
                  <span className="review-photo-size">
                    {(file.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rejected Files */}
      {fileRejections.length > 0 && (
        <div className="review-photo-errors">
          <h6>Some files could not be added:</h6>
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="review-photo-error-item">
              <span className="review-photo-error-name">{file.name}</span>
              <ul className="review-photo-error-list">
                {errors.map(error => (
                  <li key={error.code} className="review-photo-error-message">
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