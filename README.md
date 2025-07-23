# Waste Classification API

A Node.js API for waste classification using YOLO ONNX models.

## Features

- Image classification using YOLO ONNX models
- Support for JPEG, PNG, and HEIC image formats
- Automatic image preprocessing and normalization
- Non-Maximum Suppression (NMS) for overlapping detections
- RESTful API with proper error handling
- Rate limiting and security headers
- Comprehensive logging

## Prerequisites

- Node.js 16.x or higher
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd waste-classification-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on the provided template

4. Place your ONNX model file in the `models` directory:
```bash
mkdir models
cp /path/to/your/best.onnx models/
```

5. Update the class names in `src/config/modelConfig.js` to match your model

## Configuration

Edit the `.env` file to configure:

- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `MODEL_PATH`: Path to your ONNX model
- `MAX_FILE_SIZE`: Maximum upload file size in bytes
- `ALLOWED_ORIGINS`: CORS allowed origins

## Usage

### Start the server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### API Endpoints

#### POST /api/waste-classification/predict

Classify waste in an uploaded image.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Fields:
  - `image`: Image file (JPEG, PNG, or HEIC)
  - `house_id`: String identifier for the house

**Response:**
```json
{
  "house_id": "house123",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "counts": {
    "plastic": 2,
    "metal": 1
  },
  "inference": "Non - Segregated",
  "detections": [
    {
      "class": "plastic",
      "confidence": 0.85
    },
    {
      "class": "metal",
      "confidence": 0.72
    }
  ]
}
```

#### GET /api/waste-classification/model-info

Get information about the loaded model.

#### GET /health

Health check endpoint.

## Model Output Processing

The API expects YOLO models with output format:
- Shape: [1, num_predictions, 85] for 80 classes
- Each prediction: [x, y, w, h, objectness, ...class_scores]

Adjust the `processOutput` method in `src/services/modelService.js` if your model has a different output format.

## Error Handling

The API returns appropriate HTTP status codes:
- 200: Success
- 400: Bad request (missing fields, invalid file type)
- 413: File too large
- 429: Too many requests
- 500: Internal server error

## Development

Run tests:
```bash
npm test
```

## Deployment

1. Set `NODE_ENV=production` in your environment
2. Ensure logs directory exists
3. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start src/app.js --name waste-classification
```

## License

MIT