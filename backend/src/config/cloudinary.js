const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload an image to Cloudinary
 * @param {string} imagePathOrBase64 - Base64 string, Data URI, or File URL/Path
 * @param {string} folder - Folder name in Cloudinary (default: 'gojim')
 * @returns {Promise<{success: boolean, url?: string, public_id?: string, message?: string}>}
 */
const uploadImage = async (imagePathOrBase64, folder = 'gojim') => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Fallback if Cloudinary environment variables are missing
    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('⚠️ Cloudinary environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are missing. Returning provided image string directly.');
      return {
        success: true,
        url: imagePathOrBase64,
        isFallback: true,
        message: 'Cloudinary not configured; image preserved directly.'
      };
    }

    const result = await cloudinary.uploader.upload(imagePathOrBase64, {
      folder: folder,
      resource_type: 'auto',
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ]
    });

    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('❌ Cloudinary Upload Error:', error.message);
    return {
      success: false,
      message: error.message || 'Image upload to Cloudinary failed'
    };
  }
};

/**
 * Delete an image from Cloudinary by public ID
 * @param {string} publicId - Cloudinary asset public ID
 */
const deleteImage = async (publicId) => {
  try {
    if (!publicId) return { success: false, message: 'Public ID required' };
    const result = await cloudinary.uploader.destroy(publicId);
    return { success: result.result === 'ok', result };
  } catch (error) {
    console.error('❌ Cloudinary Delete Error:', error.message);
    return { success: false, message: error.message };
  }
};

module.exports = {
  cloudinary,
  uploadImage,
  deleteImage
};
