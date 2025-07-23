// Updated modelService.js with debugging
const ort = require("onnxruntime-node");
const path = require("path");
const logger = require("../utils/logger");
const config = require("../config/modelConfig");

class ModelService {
  constructor() {
    this.session = null;
    this.modelLoaded = false;
    this.classNames = config.classNames;
    this.inputShape = config.inputShape;
  }

  async initialize() {
    try {
      const modelPath = path.resolve(__dirname, "../models/best.onnx");
      logger.info(`Loading model from: ${modelPath}`);

      this.session = await ort.InferenceSession.create(modelPath);
      this.modelLoaded = true;

      logger.info("Model loaded successfully");
      logger.info(`Input names: ${this.session.inputNames}`);
      logger.info(`Output names: ${this.session.outputNames}`);
      logger.info(`Class names configured: ${this.classNames.join(", ")}`);
    } catch (error) {
      logger.error("Failed to load model:", error);
      throw error;
    }
  }

  async predict(preprocessedImage) {
    if (!this.modelLoaded) {
      throw new Error("Model not loaded");
    }

    try {
      const inputTensor = new ort.Tensor("float32", preprocessedImage.data, [
        1,
        3,
        this.inputShape[0],
        this.inputShape[1],
      ]);

      const feeds = { [this.session.inputNames[0]]: inputTensor };
      const results = await this.session.run(feeds);

      const output = results[this.session.outputNames[0]];

      logger.info(`Model output shape: ${output.dims.join("x")}`);
      logger.info(
        `First few output values: ${Array.from(output.data.slice(0, 20))
          .map((v) => v.toFixed(4))
          .join(", ")}`
      );

      const predictions = this.processOutput(output, preprocessedImage.scale);

      return predictions;
    } catch (error) {
      logger.error("Prediction error:", error);
      throw error;
    }
  }

  processOutput(output, scale) {
    const predictions = [];
    const data = output.data;
    const dims = output.dims;

    logger.info(`Processing output with dimensions: ${dims.join("x")}`);

    // Check which format we have
    const isTransposed = dims[1] === this.classNames.length + 4;
    logger.info(
      `Output format: ${
        isTransposed ? "Transposed [1, 8, N]" : "Standard [1, N, 8]"
      }`
    );

    if (isTransposed) {
      // Format: [1, 8, num_predictions] for 4 classes
      const numPredictions = dims[2];
      logger.info(
        `Processing ${numPredictions} predictions in transposed format`
      );

      // Log first prediction's class scores
      if (numPredictions > 0) {
        logger.info("First prediction class scores:");
        for (let c = 0; c < this.classNames.length; c++) {
          const classScore = data[(4 + c) * numPredictions + 0];
          logger.info(
            `  ${this.classNames[c]} (index ${c}): ${classScore.toFixed(4)}`
          );
        }
      }

      for (let i = 0; i < numPredictions; i++) {
        const x = data[0 * numPredictions + i];
        const y = data[1 * numPredictions + i];
        const w = data[2 * numPredictions + i];
        const h = data[3 * numPredictions + i];

        let maxClassScore = 0;
        let maxClassIndex = 0;

        for (let c = 0; c < this.classNames.length; c++) {
          const classScore = data[(4 + c) * numPredictions + i];
          if (classScore > maxClassScore) {
            maxClassScore = classScore;
            maxClassIndex = c;
          }
        }

        const confidence = maxClassScore;

        if (confidence >= config.confidenceThreshold) {
          predictions.push({
            x: x / scale,
            y: y / scale,
            width: w / scale,
            height: h / scale,
            confidence: confidence,
            classIndex: maxClassIndex,
            className: this.classNames[maxClassIndex],
            box: [
              Math.round((x - w / 2) / scale),
              Math.round((y - h / 2) / scale),
              Math.round((x + w / 2) / scale),
              Math.round((y + h / 2) / scale),
            ],
          });
        }
      }
    } else {
      // Original format: [1, num_predictions, 8]
      const numPredictions = dims[1];
      const predictionSize = dims[2];
      logger.info(
        `Processing ${numPredictions} predictions in standard format`
      );

      // Log first prediction's values
      if (numPredictions > 0) {
        logger.info("First prediction values:");
        logger.info(
          `  Box: x=${data[0].toFixed(2)}, y=${data[1].toFixed(
            2
          )}, w=${data[2].toFixed(2)}, h=${data[3].toFixed(2)}`
        );
        logger.info("  Class scores:");
        for (let c = 0; c < this.classNames.length; c++) {
          logger.info(
            `    ${this.classNames[c]} (index ${c}): ${data[4 + c].toFixed(4)}`
          );
        }
      }

      for (let i = 0; i < numPredictions; i++) {
        const offset = i * predictionSize;

        const x = data[offset];
        const y = data[offset + 1];
        const w = data[offset + 2];
        const h = data[offset + 3];

        let maxClassScore = 0;
        let maxClassIndex = 0;

        for (let c = 0; c < this.classNames.length; c++) {
          const classScore = data[offset + 4 + c];
          if (classScore > maxClassScore) {
            maxClassScore = classScore;
            maxClassIndex = c;
          }
        }

        const confidence = maxClassScore;

        if (confidence >= config.confidenceThreshold) {
          if (i < 5) {
            // Log first 5 detections
            logger.info(
              `Detection ${i}: class_index=${maxClassIndex}, class_name=${
                this.classNames[maxClassIndex]
              }, confidence=${confidence.toFixed(4)}`
            );
          }

          predictions.push({
            x: x / scale,
            y: y / scale,
            width: w / scale,
            height: h / scale,
            confidence: confidence,
            classIndex: maxClassIndex,
            className: this.classNames[maxClassIndex],
            box: [
              Math.round((x - w / 2) / scale),
              Math.round((y - h / 2) / scale),
              Math.round((x + w / 2) / scale),
              Math.round((y + h / 2) / scale),
            ],
          });
        }
      }
    }

    logger.info(`Total predictions before NMS: ${predictions.length}`);
    const nmsResults = this.applyNMS(predictions, config.nmsThreshold);
    logger.info(`Total predictions after NMS: ${nmsResults.length}`);

    return nmsResults;
  }

  applyNMS(predictions, iouThreshold) {
    const predictionsByClass = {};
    predictions.forEach((pred) => {
      if (!predictionsByClass[pred.classIndex]) {
        predictionsByClass[pred.classIndex] = [];
      }
      predictionsByClass[pred.classIndex].push(pred);
    });

    const keep = [];

    Object.values(predictionsByClass).forEach((classPredictions) => {
      classPredictions.sort((a, b) => b.confidence - a.confidence);

      const used = new Set();

      for (let i = 0; i < classPredictions.length; i++) {
        if (used.has(i)) continue;

        keep.push(classPredictions[i]);
        used.add(i);

        for (let j = i + 1; j < classPredictions.length; j++) {
          if (used.has(j)) continue;

          const iou = this.calculateIOU(
            classPredictions[i].box,
            classPredictions[j].box
          );
          if (iou > iouThreshold) {
            used.add(j);
          }
        }
      }
    });

    keep.sort((a, b) => b.confidence - a.confidence);

    return keep;
  }

  calculateIOU(box1, box2) {
    const x1 = Math.max(box1[0], box2[0]);
    const y1 = Math.max(box1[1], box2[1]);
    const x2 = Math.min(box1[2], box2[2]);
    const y2 = Math.min(box1[3], box2[3]);

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = (box1[2] - box1[0]) * (box1[3] - box1[1]);
    const area2 = (box2[2] - box2[0]) * (box2[3] - box2[1]);
    const union = area1 + area2 - intersection;

    return intersection / (union + 1e-6);
  }

  getModelInfo() {
    return {
      loaded: this.modelLoaded,
      inputShape: this.inputShape,
      classNames: this.classNames,
      inputNames: this.session?.inputNames || [],
      outputNames: this.session?.outputNames || [],
    };
  }
}

const modelService = new ModelService();

modelService.initialize().catch((error) => {
  logger.error("Failed to initialize model service:", error);
});

module.exports = modelService;
