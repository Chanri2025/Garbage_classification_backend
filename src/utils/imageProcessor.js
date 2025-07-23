const sharp = require("sharp");
const heicConvert = require("heic-convert");
const logger = require("./logger");

class ImageProcessor {
  async preprocessImage(imageBuffer, targetSize = 768) {
    // Changed default to 768
    try {
      // Check if image is HEIC/HEIF format
      let processedBuffer = imageBuffer;

      if (this.isHEIC(imageBuffer)) {
        logger.info("Converting HEIC image to JPEG");
        processedBuffer = await this.convertHEIC(imageBuffer);
      }

      // Process image with sharp
      const image = sharp(processedBuffer);
      const metadata = await image.metadata();

      // Calculate scale to maintain aspect ratio
      const scale = targetSize / Math.max(metadata.width, metadata.height);

      // Resize image maintaining aspect ratio
      const resized = await image
        .resize(targetSize, targetSize, {
          fit: "contain",
          background: { r: 114, g: 114, b: 114 }, // YOLO standard padding
        })
        .raw()
        .toBuffer();

      // Convert to float32 array and normalize
      const float32Array = new Float32Array(targetSize * targetSize * 3);

      // Convert from RGB to normalized float values
      for (let i = 0; i < resized.length; i++) {
        float32Array[i] = resized[i] / 255.0;
      }

      // Reshape to CHW format (channels, height, width)
      const reshapedData = this.reshapeToCHW(
        float32Array,
        targetSize,
        targetSize
      );

      return {
        data: reshapedData,
        originalWidth: metadata.width,
        originalHeight: metadata.height,
        scale: scale,
      };
    } catch (error) {
      logger.error("Image preprocessing error:", error);
      throw new Error("Failed to preprocess image");
    }
  }

  isHEIC(buffer) {
    // Check for HEIC file signature
    const heicSignatures = [
      [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63], // ftypheic
      [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x78], // ftypheix
      [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x76, 0x63], // ftyphevc
      [0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x76, 0x78], // ftyphevx
    ];

    if (buffer.length < 12) return false;

    const header = buffer.slice(4, 12);
    return heicSignatures.some((sig) =>
      sig.every((byte, i) => header[i] === byte)
    );
  }

  async convertHEIC(buffer) {
    try {
      const outputBuffer = await heicConvert({
        buffer: buffer,
        format: "JPEG",
        quality: 0.9,
      });
      return Buffer.from(outputBuffer);
    } catch (error) {
      logger.error("HEIC conversion error:", error);
      throw new Error("Failed to convert HEIC image");
    }
  }

  reshapeToCHW(data, height, width) {
    const channels = 3;
    const reshapedData = new Float32Array(channels * height * width);

    // Convert from HWC to CHW format
    for (let c = 0; c < channels; c++) {
      for (let h = 0; h < height; h++) {
        for (let w = 0; w < width; w++) {
          const srcIdx = h * width * channels + w * channels + c;
          const dstIdx = c * height * width + h * width + w;
          reshapedData[dstIdx] = data[srcIdx];
        }
      }
    }

    return reshapedData;
  }
}

module.exports = new ImageProcessor();
