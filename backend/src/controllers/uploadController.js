const { uploadImage, deleteImage } = require('../config/cloudinary');

// @desc    Upload an image to Cloudinary
// @route   POST /api/upload/image
// @access  Private / Public (depending on auth middleware)
exports.uploadSingleImage = async (req, res) => {
  try {
    const { image, folder } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an image string (base64 or image URL)'
      });
    }

    const uploadResult = await uploadImage(image, folder || 'gojim_uploads');

    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        message: uploadResult.message || 'Image upload failed'
      });
    }

    return res.status(200).json({
      success: true,
      url: uploadResult.url,
      public_id: uploadResult.public_id || null,
      message: uploadResult.message || 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Upload Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error during upload'
    });
  }
};

// @desc    Delete an image from Cloudinary
// @route   DELETE /api/upload/image
// @access  Private
exports.deleteSingleImage = async (req, res) => {
  try {
    const { public_id } = req.body;

    if (!public_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide public_id of the image to delete'
      });
    }

    const deleteResult = await deleteImage(public_id);

    return res.status(200).json(deleteResult);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete image'
    });
  }
};
