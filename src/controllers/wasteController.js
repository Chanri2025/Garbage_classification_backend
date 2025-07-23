const wasteService = require('../services/wasteService');
const logger = require('../utils/logger');

class WasteController {
  async predict(req, res, next) {
    try {
      const { house_id } = req.body;
      const imageBuffer = req.file.buffer;

      logger.info(`Processing prediction request for house_id: ${house_id}`);

      const result = await wasteService.classifyWaste(imageBuffer, house_id);

      res.json(result);
    } catch (error) {
      logger.error('Prediction error:', error);
      next(error);
    }
  }

  async getModelInfo(req, res, next) {
    try {
      const info = await wasteService.getModelInfo();
      res.json(info);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WasteController();