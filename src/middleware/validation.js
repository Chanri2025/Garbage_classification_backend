const validatePredictRequest = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'No image file provided'
    });
  }

  if (!req.body.house_id) {
    return res.status(400).json({
      error: 'house_id is required'
    });
  }

  // Validate house_id format (adjust as needed)
  const houseId = req.body.house_id;
  if (typeof houseId !== 'string' || houseId.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid house_id format'
    });
  }

  next();
};

module.exports = {
  validatePredictRequest
};