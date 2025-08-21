const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for server operations
);

/**
 * Upload a file to Supabase Storage
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} bucket - The storage bucket name
 * @param {string} filePath - The path where the file should be stored
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<{data, error}>} - Supabase response
 */
async function uploadFile(fileBuffer, bucket, filePath, contentType) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType,
        upsert: false // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Upload function error:', err);
    return { data: null, error: err };
  }
}

/**
 * Get the public URL for a file in Supabase Storage
 * @param {string} bucket - The storage bucket name
 * @param {string} filePath - The path of the file
 * @returns {string} - The public URL
 */
function getPublicUrl(bucket, filePath) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param {string} bucket - The storage bucket name
 * @param {string} filePath - The path of the file to delete
 * @returns {Promise<{data, error}>} - Supabase response
 */
async function deleteFile(bucket, filePath) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    return { data, error };
  } catch (err) {
    console.error('Delete function error:', err);
    return { data: null, error: err };
  }
}

module.exports = {
  uploadFile,
  getPublicUrl,
  deleteFile,
  supabase
};