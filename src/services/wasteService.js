const modelService = require("./modelService");
const imageProcessor = require("../utils/imageProcessor");
const logger = require("../utils/logger");

class WasteService {
  async classifyWaste(imageBuffer, houseId) {
    try {
      // Preprocess image with 768x768 size
      const processedImage = await imageProcessor.preprocessImage(
        imageBuffer,
        768
      );

      // Run inference
      const predictions = await modelService.predict(processedImage);

      // Filter predictions by confidence (0.6 as in Python)
      const filteredPredictions = this.filterPredictions(predictions, 0.6);

      // Generate counts
      const counts = this.generateCounts(filteredPredictions);

      // Determine segregation status
      const inference =
        Object.keys(counts).length === 1 ? "segregated" : "Non - Segregated";

      // Format timestamp to match Python (with microseconds and timezone)
      const now = new Date();
      const timestamp =
        now
          .toISOString()
          .replace("Z", "")
          .replace(/(\d{3})$/, "$1000") + // Add extra zeros for microseconds
        "+00:00";

      // Return in the same order as Python
      return {
        counts: counts,
        detections: filteredPredictions.map((pred) => ({
          class: pred.className,
          confidence: pred.confidence,
        })),
        house_id: houseId,
        inference: inference,
        timestamp: timestamp,
      };
    } catch (error) {
      logger.error("Waste classification error:", error);
      throw error;
    }
  }

  filterPredictions(predictions, threshold) {
    return predictions.filter((pred) => pred.confidence >= threshold);
  }

  generateCounts(predictions) {
    const counts = {};
    predictions.forEach((pred) => {
      counts[pred.className] = (counts[pred.className] || 0) + 1;
    });
    return counts;
  }

  async getModelInfo() {
    return modelService.getModelInfo();
  }
}

module.exports = new WasteService();
