"""
AI Model management service
"""

import asyncio
import logging
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
import numpy as np
import torch
import tensorflow as tf
from PIL import Image

from ..config.database import get_database
from ..config.redis_client import get_redis, CacheKeys
from ..models.inference import ModelMetadata, ImageType, ModelInfo
from ..utils.exceptions import ModelLoadError, ModelNotFoundError
from ..config.settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class ModelService:
    """Service for managing AI models"""
    
    def __init__(self):
        self.db = get_database()
        self.redis = get_redis()
        self.loaded_models: Dict[str, Any] = {}
        self.model_metadata: Dict[str, ModelMetadata] = {}
        
    async def load_models(self):
        """Load all active AI models"""
        try:
            logger.info("Loading AI models...")
            
            # Load model configurations
            model_configs = await self._get_model_configurations()
            
            for model_id, config in model_configs.items():
                if config.get('enabled', False):
                    try:
                        await self._load_single_model(model_id, config)
                        logger.info(f"Loaded model: {model_id}")
                    except Exception as e:
                        logger.error(f"Failed to load model {model_id}: {e}")
            
            logger.info(f"Loaded {len(self.loaded_models)} AI models")
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")
            raise ModelLoadError(f"Failed to load models: {str(e)}")
    
    async def _get_model_configurations(self) -> Dict:
        """Get model configurations from database or config"""
        try:
            # Try to get from database first
            models = await self.db.model_metadata.find({"is_active": True}).to_list(None)
            
            if models:
                return {model['model_id']: model for model in models}
            
            # Fallback to default configurations
            return {
                'xray_analysis_v1': {
                    'model_id': 'xray_analysis_v1',
                    'name': 'X-ray Analysis Model',
                    'version': '1.2.0',
                    'path': os.path.join(settings.MODELS_PATH, 'xray_analysis_v1.2.h5'),
                    'model_type': 'classification',
                    'framework': 'tensorflow',
                    'input_shape': [512, 512, 1],
                    'output_classes': ['normal', 'caries', 'bone_loss', 'periapical_lesion'],
                    'supported_image_types': [ImageType.XRAY, ImageType.PANORAMIC],
                    'accuracy': 0.94,
                    'precision': 0.92,
                    'recall': 0.91,
                    'f1_score': 0.915,
                    'enabled': True
                },
                'cavity_detection_v1': {
                    'model_id': 'cavity_detection_v1',
                    'name': 'Cavity Detection Model',
                    'version': '1.1.0',
                    'path': os.path.join(settings.MODELS_PATH, 'cavity_detection_v1.1.h5'),
                    'model_type': 'detection',
                    'framework': 'tensorflow',
                    'input_shape': [224, 224, 3],
                    'output_classes': ['no_cavity', 'mild_cavity', 'moderate_cavity', 'severe_cavity'],
                    'supported_image_types': [ImageType.INTRAORAL],
                    'accuracy': 0.91,
                    'precision': 0.89,
                    'recall': 0.88,
                    'f1_score': 0.885,
                    'enabled': True
                },
                'bone_loss_detection_v1': {
                    'model_id': 'bone_loss_detection_v1',
                    'name': 'Bone Loss Detection Model',
                    'version': '1.0.0',
                    'path': os.path.join(settings.MODELS_PATH, 'bone_loss_v1.0.h5'),
                    'model_type': 'classification',
                    'framework': 'tensorflow',
                    'input_shape': [512, 512, 1],
                    'output_classes': ['normal', 'mild_loss', 'moderate_loss', 'severe_loss'],
                    'supported_image_types': [ImageType.XRAY, ImageType.CBCT],
                    'accuracy': 0.88,
                    'precision': 0.86,
                    'recall': 0.85,
                    'f1_score': 0.855,
                    'enabled': True
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting model configurations: {e}")
            return {}
    
    async def _load_single_model(self, model_id: str, config: Dict):
        """Load a single AI model"""
        try:
            framework = config.get('framework', 'tensorflow')
            model_path = config.get('path')
            
            if not os.path.exists(model_path):
                # For demo purposes, create a mock model
                logger.warning(f"Model file not found: {model_path}. Using mock model.")
                model = MockModel(model_id, config)
            else:
                if framework == 'tensorflow':
                    model = tf.keras.models.load_model(model_path)
                elif framework == 'pytorch':
                    model = torch.load(model_path)
                    model.eval()
                else:
                    raise ModelLoadError(f"Unsupported framework: {framework}")
            
            # Store loaded model
            self.loaded_models[model_id] = model
            
            # Store metadata
            metadata = ModelMetadata(
                model_id=model_id,
                name=config.get('name', model_id),
                version=config.get('version', '1.0.0'),
                description=config.get('description', ''),
                model_type=config.get('model_type', 'classification'),
                input_shape=config.get('input_shape', [224, 224, 3]),
                output_classes=config.get('output_classes', []),
                accuracy=config.get('accuracy', 0.0),
                precision=config.get('precision', 0.0),
                recall=config.get('recall', 0.0),
                f1_score=config.get('f1_score', 0.0),
                training_dataset=config.get('training_dataset', 'Unknown'),
                training_date=config.get('training_date', datetime.utcnow()),
                is_active=True,
                supported_image_types=config.get('supported_image_types', [ImageType.XRAY])
            )
            
            self.model_metadata[model_id] = metadata
            
            # Cache metadata in Redis
            await self.redis.setex(
                CacheKeys.model_metadata(model_id),
                3600,  # 1 hour TTL
                metadata.json()
            )
            
        except Exception as e:
            logger.error(f"Error loading model {model_id}: {e}")
            raise ModelLoadError(f"Failed to load model {model_id}: {str(e)}")
    
    async def get_model_for_image_type(self, image_type: ImageType) -> Optional[Any]:
        """Get the best model for a specific image type"""
        try:
            best_model = None
            best_accuracy = 0.0
            
            for model_id, metadata in self.model_metadata.items():
                if image_type in metadata.supported_image_types:
                    if metadata.accuracy > best_accuracy:
                        best_accuracy = metadata.accuracy
                        best_model = self.loaded_models.get(model_id)
            
            return best_model
            
        except Exception as e:
            logger.error(f"Error getting model for image type {image_type}: {e}")
            return None
    
    async def predict(self, model: Any, processed_image: np.ndarray) -> np.ndarray:
        """Run inference on processed image"""
        try:
            if isinstance(model, MockModel):
                return await model.predict_async(processed_image)
            
            # For real models, run prediction
            if hasattr(model, 'predict'):
                # TensorFlow model
                predictions = model.predict(processed_image)
            elif hasattr(model, 'forward'):
                # PyTorch model
                with torch.no_grad():
                    tensor_input = torch.from_numpy(processed_image).float()
                    predictions = model.forward(tensor_input).numpy()
            else:
                raise ModelLoadError("Unknown model type")
            
            return predictions
            
        except Exception as e:
            logger.error(f"Error during model prediction: {e}")
            raise ModelLoadError(f"Prediction failed: {str(e)}")
    
    async def get_model_info(self, model: Any) -> ModelInfo:
        """Get model information"""
        try:
            # Find model metadata by matching the model object
            for model_id, loaded_model in self.loaded_models.items():
                if loaded_model == model:
                    metadata = self.model_metadata.get(model_id)
                    if metadata:
                        return ModelInfo(
                            model_id=metadata.model_id,
                            version=metadata.version,
                            accuracy=metadata.accuracy,
                            training_date=metadata.training_date
                        )
            
            # Fallback for unknown models
            return ModelInfo(
                model_id="unknown",
                version="1.0.0",
                accuracy=0.0,
                training_date=datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error getting model info: {e}")
            return ModelInfo(
                model_id="error",
                version="1.0.0",
                accuracy=0.0,
                training_date=datetime.utcnow()
            )
    
    async def list_models(self) -> List[Dict]:
        """List all available models"""
        try:
            models = []
            
            for model_id, metadata in self.model_metadata.items():
                models.append({
                    'model_id': metadata.model_id,
                    'name': metadata.name,
                    'version': metadata.version,
                    'accuracy': metadata.accuracy,
                    'is_active': metadata.is_active,
                    'supported_image_types': [t.value for t in metadata.supported_image_types],
                    'model_type': metadata.model_type
                })
            
            return models
            
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            return []
    
    async def activate_model(self, model_id: str, version: str) -> bool:
        """Activate a specific model version"""
        try:
            # Update database
            result = await self.db.model_metadata.update_one(
                {"model_id": model_id, "version": version},
                {"$set": {"is_active": True, "updated_at": datetime.utcnow()}}
            )
            
            if result.modified_count > 0:
                # Reload models
                await self.load_models()
                logger.info(f"Activated model: {model_id} v{version}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error activating model {model_id}: {e}")
            return False
    
    async def deactivate_model(self, model_id: str) -> bool:
        """Deactivate a model"""
        try:
            # Update database
            result = await self.db.model_metadata.update_one(
                {"model_id": model_id},
                {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
            )
            
            if result.modified_count > 0:
                # Remove from loaded models
                if model_id in self.loaded_models:
                    del self.loaded_models[model_id]
                if model_id in self.model_metadata:
                    del self.model_metadata[model_id]
                
                # Clear cache
                await self.redis.delete(CacheKeys.model_metadata(model_id))
                
                logger.info(f"Deactivated model: {model_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deactivating model {model_id}: {e}")
            return False


class MockModel:
    """Mock AI model for demonstration purposes"""
    
    def __init__(self, model_id: str, config: Dict):
        self.model_id = model_id
        self.config = config
        self.output_classes = config.get('output_classes', ['normal', 'abnormal'])
        
    async def predict_async(self, image_array: np.ndarray) -> np.ndarray:
        """Mock async prediction"""
        # Simulate processing time
        await asyncio.sleep(0.1)
        
        # Generate mock predictions based on model type
        num_classes = len(self.output_classes)
        
        if 'xray' in self.model_id:
            return self._mock_xray_prediction(num_classes)
        elif 'cavity' in self.model_id:
            return self._mock_cavity_prediction(num_classes)
        elif 'bone_loss' in self.model_id:
            return self._mock_bone_loss_prediction(num_classes)
        else:
            return self._mock_generic_prediction(num_classes)
    
    def _mock_xray_prediction(self, num_classes: int) -> np.ndarray:
        """Mock X-ray analysis prediction"""
        # Simulate realistic confidence scores
        predictions = np.random.rand(1, num_classes)
        
        # Make 'normal' more likely
        predictions[0, 0] = np.random.uniform(0.7, 0.95)  # Normal
        
        # Normalize to sum to 1
        predictions = predictions / np.sum(predictions, axis=1, keepdims=True)
        
        return predictions
    
    def _mock_cavity_prediction(self, num_classes: int) -> np.ndarray:
        """Mock cavity detection prediction"""
        predictions = np.random.rand(1, num_classes)
        
        # Simulate cavity detection
        cavity_detected = np.random.choice([True, False], p=[0.3, 0.7])
        
        if cavity_detected:
            # Random severity
            severity_idx = np.random.choice(range(1, num_classes))
            predictions[0, severity_idx] = np.random.uniform(0.6, 0.9)
        else:
            predictions[0, 0] = np.random.uniform(0.8, 0.95)  # No cavity
        
        predictions = predictions / np.sum(predictions, axis=1, keepdims=True)
        return predictions
    
    def _mock_bone_loss_prediction(self, num_classes: int) -> np.ndarray:
        """Mock bone loss detection prediction"""
        predictions = np.random.rand(1, num_classes)
        
        # Most cases should be normal
        predictions[0, 0] = np.random.uniform(0.6, 0.9)  # Normal
        
        predictions = predictions / np.sum(predictions, axis=1, keepdims=True)
        return predictions
    
    def _mock_generic_prediction(self, num_classes: int) -> np.ndarray:
        """Mock generic prediction"""
        predictions = np.random.rand(1, num_classes)
        predictions = predictions / np.sum(predictions, axis=1, keepdims=True)
        return predictions