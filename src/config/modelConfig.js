module.exports = {
  // Update to match the exact order from your Python model
  classNames: [
    "Bio-Medical", // index 0
    "Plastic", // index 1
    "Construction", // index 2
    "Horticulture", // index 3
  ],

  // Model input shape [height, width]
  inputShape: [768, 768],

  // Confidence thresholds
  confidenceThreshold: 0.25,
  nmsThreshold: 0.45,
  filterThreshold: 0.6,
};
