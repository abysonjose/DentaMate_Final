from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import numpy as np
from PIL import Image
import cv2
import tensorflow as tf
from pymongo import MongoClient
from datetime import datetime
import logging

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB connection
client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017/dentamate'))
db = client.dentamate

# Load AI models (placeholder - replace with actual model loading)
class AIModels:
    def __init__(self):
        self.xray_model = None
        self.cavity_model = None
        self.bone_loss_model = None
        
    def load_models(self):
        try:
            # Placeholder for model loading
            # self.xray_model = tf.keras.models.load_model('models/xray_analysis.h5')
            # self.cavity_model = tf.keras.models.load_model('models/cavity_detection.h5')
            # self.bone_loss_model = tf.keras.models.load_model('models/bone_loss.h5')
            logger.info("AI models loaded successfully")
        except Exception as e:
            logger.error(f"Error loading models: {e}")

ai_models = AIModels()
ai_models.load_models()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'OK',
        'service': 'ai-diagnosis-service',
        'timestamp': datetime.utcnow().isoformat()
    })

@app.route('/analyze/xray', methods=['POST'])
def analyze_xray():
    try:
        # Get tenant and user info from headers
        tenant_id = request.headers.get('x-tenant-id')
        user_id = request.headers.get('x-user-id')
        
        if not tenant_id:
            return jsonify({'error': 'Tenant ID required'}), 400
            
        # Get uploaded image
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
            
        image_file = request.files['image']
        patient_id = request.form.get('patient_id')
        
        # Process image
        image = Image.open(image_file.stream)
        processed_image = preprocess_xray_image(image)
        
        # Perform AI analysis (placeholder)
        analysis_result = perform_xray_analysis(processed_image)
        
        # Generate explainable AI heatmap
        heatmap = generate_xai_heatmap(processed_image, analysis_result)
        
        # Save analysis to database
        analysis_record = {
            'tenant_id': tenant_id,
            'patient_id': patient_id,
            'user_id': user_id,
            'analysis_type': 'xray',
            'results': analysis_result,
            'confidence_score': analysis_result.get('confidence', 0),
            'created_at': datetime.utcnow(),
            'image_metadata': {
                'filename': image_file.filename,
                'size': len(image_file.read()),
                'format': image.format
            }
        }
        
        result = db.ai_analyses.insert_one(analysis_record)
        
        return jsonify({
            'analysis_id': str(result.inserted_id),
            'results': analysis_result,
            'heatmap_available': heatmap is not None,
            'timestamp': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"X-ray analysis error: {e}")
        return jsonify({'error': 'Analysis failed'}), 500

@app.route('/analyze/cavity-detection', methods=['POST'])
def detect_cavities():
    try:
        tenant_id = request.headers.get('x-tenant-id')
        user_id = request.headers.get('x-user-id')
        
        if not tenant_id:
            return jsonify({'error': 'Tenant ID required'}), 400
            
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
            
        image_file = request.files['image']
        patient_id = request.form.get('patient_id')
        
        # Process image for cavity detection
        image = Image.open(image_file.stream)
        processed_image = preprocess_dental_image(image)
        
        # Perform cavity detection (placeholder)
        cavity_results = detect_cavities_ai(processed_image)
        
        # Save results
        analysis_record = {
            'tenant_id': tenant_id,
            'patient_id': patient_id,
            'user_id': user_id,
            'analysis_type': 'cavity_detection',
            'results': cavity_results,
            'created_at': datetime.utcnow()
        }
        
        result = db.ai_analyses.insert_one(analysis_record)
        
        return jsonify({
            'analysis_id': str(result.inserted_id),
            'cavities_detected': cavity_results.get('cavities_found', 0),
            'severity_levels': cavity_results.get('severity_distribution', {}),
            'recommendations': cavity_results.get('recommendations', []),
            'confidence_score': cavity_results.get('confidence', 0)
        })
        
    except Exception as e:
        logger.error(f"Cavity detection error: {e}")
        return jsonify({'error': 'Detection failed'}), 500

def preprocess_xray_image(image):
    """Preprocess X-ray image for AI analysis"""
    # Convert to grayscale if needed
    if image.mode != 'L':
        image = image.convert('L')
    
    # Resize to model input size
    image = image.resize((512, 512))
    
    # Convert to numpy array and normalize
    img_array = np.array(image) / 255.0
    
    return img_array

def preprocess_dental_image(image):
    """Preprocess dental image for cavity detection"""
    # Convert to RGB
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Resize and normalize
    image = image.resize((224, 224))
    img_array = np.array(image) / 255.0
    
    return img_array

def perform_xray_analysis(image):
    """Perform X-ray analysis using AI model (placeholder)"""
    # Placeholder implementation
    return {
        'findings': [
            'Normal bone density observed',
            'No obvious fractures detected',
            'Dental structures appear normal'
        ],
        'confidence': 0.87,
        'risk_factors': [],
        'recommendations': [
            'Regular follow-up recommended',
            'Maintain good oral hygiene'
        ]
    }

def detect_cavities_ai(image):
    """Detect cavities using AI model (placeholder)"""
    # Placeholder implementation
    return {
        'cavities_found': 2,
        'locations': [
            {'tooth': 'Upper right molar', 'severity': 'mild'},
            {'tooth': 'Lower left premolar', 'severity': 'moderate'}
        ],
        'severity_distribution': {
            'mild': 1,
            'moderate': 1,
            'severe': 0
        },
        'confidence': 0.92,
        'recommendations': [
            'Schedule filling for moderate cavity',
            'Monitor mild cavity progression',
            'Improve brushing technique'
        ]
    }

def generate_xai_heatmap(image, analysis_result):
    """Generate explainable AI heatmap (placeholder)"""
    # Placeholder for XAI heatmap generation
    return None

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)