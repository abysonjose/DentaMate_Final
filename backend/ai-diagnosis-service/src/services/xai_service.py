"""
Explainable AI (XAI) service for generating interpretable results
"""

import asyncio
import logging
import base64
import io
from typing import List, Any, Optional
import numpy as np
import cv2
from PIL import Image
import matplotlib.pyplot as plt
import matplotlib.cm as cm

from ..models.inference import XAIArtifact, ImageType
from ..config.settings import get_settings
from ..utils.exceptions import XAIGenerationError

logger = logging.getLogger(__name__)
settings = get_settings()


class XAIService:
    """Service for generating explainable AI artifacts"""
    
    def __init__(self):
        self.heatmap_resolution = settings.HEATMAP_RESOLUTION
        
    async def generate_explanations(
        self,
        processed_image: np.ndarray,
        predictions: np.ndarray,
        model: Any,
        image_type: ImageType
    ) -> List[XAIArtifact]:
        """
        Generate explainable AI artifacts for model predictions
        """
        try:
            artifacts = []
            
            if not settings.GENERATE_HEATMAPS:
                return artifacts
            
            # Generate different types of explanations based on image type
            if image_type in [ImageType.XRAY, ImageType.PANORAMIC]:
                artifacts.extend(await self._generate_xray_explanations(
                    processed_image, predictions, model
                ))
            elif image_type == ImageType.INTRAORAL:
                artifacts.extend(await self._generate_intraoral_explanations(
                    processed_image, predictions, model
                ))
            elif image_type == ImageType.CBCT:
                artifacts.extend(await self._generate_cbct_explanations(
                    processed_image, predictions, model
                ))
            
            return artifacts
            
        except Exception as e:
            logger.error(f"Error generating XAI explanations: {e}")
            raise XAIGenerationError(f"Failed to generate explanations: {str(e)}")
    
    async def _generate_xray_explanations(
        self,
        image: np.ndarray,
        predictions: np.ndarray,
        model: Any
    ) -> List[XAIArtifact]:
        """Generate explanations for X-ray images"""
        artifacts = []
        
        try:
            # Generate attention heatmap
            heatmap_artifact = await self._generate_attention_heatmap(
                image, predictions, "X-ray Analysis Attention Map"
            )
            if heatmap_artifact:
                artifacts.append(heatmap_artifact)
            
            # Generate class activation map
            cam_artifact = await self._generate_class_activation_map(
                image, predictions, "Class Activation Map"
            )
            if cam_artifact:
                artifacts.append(cam_artifact)
            
            # Generate gradient-based explanation
            grad_artifact = await self._generate_gradient_explanation(
                image, predictions, "Gradient-based Explanation"
            )
            if grad_artifact:
                artifacts.append(grad_artifact)
            
        except Exception as e:
            logger.error(f"Error generating X-ray explanations: {e}")
        
        return artifacts
    
    async def _generate_intraoral_explanations(
        self,
        image: np.ndarray,
        predictions: np.ndarray,
        model: Any
    ) -> List[XAIArtifact]:
        """Generate explanations for intraoral images"""
        artifacts = []
        
        try:
            # Generate region-based heatmap
            region_artifact = await self._generate_region_heatmap(
                image, predictions, "Cavity Detection Regions"
            )
            if region_artifact:
                artifacts.append(region_artifact)
            
            # Generate tooth-specific analysis
            tooth_artifact = await self._generate_tooth_analysis(
                image, predictions, "Tooth-specific Analysis"
            )
            if tooth_artifact:
                artifacts.append(tooth_artifact)
            
        except Exception as e:
            logger.error(f"Error generating intraoral explanations: {e}")
        
        return artifacts
    
    async def _generate_cbct_explanations(
        self,
        image: np.ndarray,
        predictions: np.ndarray,
        model: Any
    ) -> List[XAIArtifact]:
        """Generate explanations for CBCT images"""
        artifacts = []
        
        try:
            # Generate 3D attention map (simplified to 2D for demo)
            volume_artifact = await self._generate_volume_attention(
                image, predictions, "3D Volume Attention"
            )
            if volume_artifact:
                artifacts.append(volume_artifact)
            
        except Exception as e:
            logger.error(f"Error generating CBCT explanations: {e}")
        
        return artifacts
    
    async def _generate_attention_heatmap(
        self,
        image: np.ndarray,
        predictions: np.ndarray,
        description: str
    ) -> Optional[XAIArtifact]:
        """Generate attention heatmap using mock Grad-CAM"""
        try:
            # Get image dimensions
            if len(image.shape) == 4:  # Batch dimension
                img_height, img_width = image.shape[1:3]
            else:
                img_height, img_width = image.shape[:2]
            
            # Generate mock attention map
            attention_map = await self._mock_attention_map(img_height, img_width, predictions)
            
            # Convert to heatmap
            heatmap_url = await self._create_heatmap_image(attention_map, image)
            
            return XAIArtifact(
                type="attention_heatmap",
                url=heatmap_url,
                description=description,
                confidence_threshold=0.5
            )
            
        except Exception as e:
            logger.error(f"Error generating attention heatmap: {e}")
            return None
    
    async def _generate_class_activation_map(
        self,
        image: np.ndarray,
        predictions: np.ndarray,
        description: str
    ) -> Optional[XAIArtifact]:
        """Generate Class Activation Map (CAM)"""
        try:
            # Mock CAM generation
            if len(image.shape) == 4:
                img_height, img_width = image.shape[1:3]
            else:
                img_height, img_width = image.shape[:2]
            
            # Generate activation map based on highest prediction
            max_class_idx = np.argmax(predictions)
            activation_map = await self._mock_class_activation(
                img_height, img_width, max_class_idx, predictions[0, max_class_idx]
            )
            
            # Create visualization
            cam_url = await self._create_cam_visualization(activation_map, image)
            
            return XAIArtifact(
                type="class_activation_map",
                url=cam_url,
                description=f"{description} - Class {max_class_idx}",
                confidence_threshold=float(predictions[0, max_class_idx])
            )
            
        except Exception as e:
            logger.error(f"Error generating CAM: {e}")
            return None
    
    async def _generate_gradient_explanation(
        self,
        image: np.ndarray,
        predictions: np.ndarray,
        description: str
    ) -> Optional[XAIArtifact]:
        """Generate gradient-based explanation"""
        try:
            # Mock gradient computation
            if len(image.shape) == 4:
                img_height, img_width = image.shape[1:3]
            else:
                img_height, img_width = image.shape[:2]
            
            # Generate mock gradients
            gradients = await self._mock_gradients(img_height, img_width, predictions)
            
            # Create gradient visualization
            grad_url = await self._create_gradient_visualization(gradients, image)
            
            return XAIArtifact(
                type="gradient_explanation",
                url=grad_url,
                description=description,
                confidence_threshold=0.3
            )
            
        except Exception as e:
            logger.error(f"Error generating gradient explanation: {e}")
            return None
    
    async def _generate_region_heatmap(
        self,
        image: np.ndarray,
        predictions: np.ndarray,
        description: str
    ) -> Optional[XAIArtifact]:
        """Generate region-based heatmap for cavity detection"""
        try:
            if len(image.shape) == 4:
                img_height, img_width = image.shape[1:3]
            else:
                img_height, img_width = image.shape[:2]
            
            # Generate region-based attention
            region_map = await self._mock_region_attention(img_height, img_width, predictions)
            
            # Create region visualization
            region_url = await self._create_region_visualization(region_map, image)
            
            return XAIArtifact(
                type="region_heatmap",
                url=region_url,
                description=description,
                confidence_threshold=0.4
            )
            
        except Exception as e:
            logger.error(f"Error generating region heatmap: {e}")
            return None
    
    async def _generate_tooth_analysis(
        self,
        image: np.ndarray,
        predictions: np.ndarray,
        description: str
    ) -> Optional[XAIArtifact]:
        """Generate tooth-specific analysis visualization"""
        try:
            # Mock tooth segmentation and analysis
            tooth_map = await self._mock_tooth_segmentation(image, predictions)
            
            # Create tooth analysis visualization
            tooth_url = await self._create_tooth_visualization(tooth_map, image)
            
            return XAIArtifact(
                type="tooth_analysis",
                url=tooth_url,
                description=description,
                confidence_threshold=0.6
            )
            
        except Exception as e:
            logger.error(f"Error generating tooth analysis: {e}")
            return None
    
    async def _generate_volume_attention(
        self,
        image: np.ndarray,
        predictions: np.ndarray,
        description: str
    ) -> Optional[XAIArtifact]:
        """Generate 3D volume attention map"""
        try:
            # Simplified 3D to 2D projection for demo
            if len(image.shape) == 4:
                img_height, img_width = image.shape[1:3]
            else:
                img_height, img_width = image.shape[:2]
            
            # Generate volume attention
            volume_map = await self._mock_volume_attention(img_height, img_width, predictions)
            
            # Create volume visualization
            volume_url = await self._create_volume_visualization(volume_map, image)
            
            return XAIArtifact(
                type="volume_attention",
                url=volume_url,
                description=description,
                confidence_threshold=0.5
            )
            
        except Exception as e:
            logger.error(f"Error generating volume attention: {e}")
            return None
    
    # Mock generation methods (replace with actual XAI implementations)
    
    async def _mock_attention_map(self, height: int, width: int, predictions: np.ndarray) -> np.ndarray:
        """Generate mock attention map"""
        # Create attention focused on center with some randomness
        y, x = np.ogrid[:height, :width]
        center_y, center_x = height // 2, width // 2
        
        # Distance from center
        distance = np.sqrt((x - center_x)**2 + (y - center_y)**2)
        
        # Create attention map with Gaussian-like distribution
        attention = np.exp(-distance**2 / (2 * (min(height, width) / 4)**2))
        
        # Add some noise based on predictions
        max_pred = np.max(predictions)
        noise = np.random.rand(height, width) * 0.3 * max_pred
        attention = attention * max_pred + noise
        
        # Normalize
        attention = (attention - attention.min()) / (attention.max() - attention.min())
        
        return attention
    
    async def _mock_class_activation(self, height: int, width: int, class_idx: int, confidence: float) -> np.ndarray:
        """Generate mock class activation map"""
        # Create different patterns for different classes
        activation = np.zeros((height, width))
        
        if class_idx == 0:  # Normal - uniform low activation
            activation = np.random.rand(height, width) * 0.3
        elif class_idx == 1:  # Caries - focused activation
            center_y, center_x = height // 2, width // 2
            y, x = np.ogrid[:height, :width]
            mask = (x - center_x)**2 + (y - center_y)**2 <= (min(height, width) / 6)**2
            activation[mask] = confidence
        else:  # Other conditions - scattered activation
            num_spots = np.random.randint(2, 5)
            for _ in range(num_spots):
                spot_y = np.random.randint(height // 4, 3 * height // 4)
                spot_x = np.random.randint(width // 4, 3 * width // 4)
                radius = np.random.randint(10, 30)
                
                y, x = np.ogrid[:height, :width]
                mask = (x - spot_x)**2 + (y - spot_y)**2 <= radius**2
                activation[mask] = confidence * np.random.uniform(0.7, 1.0)
        
        return activation
    
    async def _mock_gradients(self, height: int, width: int, predictions: np.ndarray) -> np.ndarray:
        """Generate mock gradients"""
        # Create edge-like gradients
        gradients = np.random.rand(height, width) * 0.2
        
        # Add some edge-like features
        edges_y = np.abs(np.gradient(np.random.rand(height, width), axis=0))
        edges_x = np.abs(np.gradient(np.random.rand(height, width), axis=1))
        
        gradients += (edges_y + edges_x) * np.max(predictions)
        
        return gradients
    
    async def _mock_region_attention(self, height: int, width: int, predictions: np.ndarray) -> np.ndarray:
        """Generate mock region-based attention"""
        # Divide image into regions and assign attention
        region_map = np.zeros((height, width))
        
        # Create grid of regions
        regions_y = 4
        regions_x = 4
        region_height = height // regions_y
        region_width = width // regions_x
        
        for i in range(regions_y):
            for j in range(regions_x):
                y_start = i * region_height
                y_end = min((i + 1) * region_height, height)
                x_start = j * region_width
                x_end = min((j + 1) * region_width, width)
                
                # Random attention for each region
                attention_value = np.random.rand() * np.max(predictions)
                region_map[y_start:y_end, x_start:x_end] = attention_value
        
        return region_map
    
    async def _mock_tooth_segmentation(self, image: np.ndarray, predictions: np.ndarray) -> np.ndarray:
        """Generate mock tooth segmentation"""
        if len(image.shape) == 4:
            height, width = image.shape[1:3]
        else:
            height, width = image.shape[:2]
        
        # Create mock tooth regions
        tooth_map = np.zeros((height, width))
        
        # Simulate 4-6 tooth regions
        num_teeth = np.random.randint(4, 7)
        
        for tooth_id in range(1, num_teeth + 1):
            # Random tooth position and size
            center_y = np.random.randint(height // 4, 3 * height // 4)
            center_x = np.random.randint(width // 6, 5 * width // 6)
            radius_y = np.random.randint(height // 8, height // 4)
            radius_x = np.random.randint(width // 12, width // 6)
            
            # Create elliptical tooth region
            y, x = np.ogrid[:height, :width]
            mask = ((x - center_x) / radius_x)**2 + ((y - center_y) / radius_y)**2 <= 1
            
            # Assign tooth ID and confidence
            confidence = predictions[0, min(tooth_id - 1, len(predictions[0]) - 1)]
            tooth_map[mask] = tooth_id * confidence
        
        return tooth_map
    
    async def _mock_volume_attention(self, height: int, width: int, predictions: np.ndarray) -> np.ndarray:
        """Generate mock 3D volume attention (projected to 2D)"""
        # Simulate depth-based attention
        volume_map = np.zeros((height, width))
        
        # Create layered attention patterns
        num_layers = 3
        for layer in range(num_layers):
            layer_attention = np.random.rand(height, width)
            
            # Apply depth-based weighting
            depth_weight = (layer + 1) / num_layers
            layer_attention *= depth_weight * np.max(predictions)
            
            volume_map += layer_attention
        
        # Normalize
        volume_map = (volume_map - volume_map.min()) / (volume_map.max() - volume_map.min())
        
        return volume_map
    
    # Visualization creation methods
    
    async def _create_heatmap_image(self, attention_map: np.ndarray, original_image: np.ndarray) -> str:
        """Create heatmap visualization and return base64 encoded image"""
        try:
            # Create figure
            fig, (ax1, ax2, ax3) = plt.subplots(1, 3, figsize=(15, 5))
            
            # Original image
            if len(original_image.shape) == 4:
                img_display = original_image[0]
            else:
                img_display = original_image
            
            if len(img_display.shape) == 3 and img_display.shape[-1] == 1:
                img_display = img_display.squeeze(-1)
            
            ax1.imshow(img_display, cmap='gray' if len(img_display.shape) == 2 else None)
            ax1.set_title('Original Image')
            ax1.axis('off')
            
            # Attention heatmap
            im2 = ax2.imshow(attention_map, cmap='jet', alpha=0.8)
            ax2.set_title('Attention Heatmap')
            ax2.axis('off')
            plt.colorbar(im2, ax=ax2, fraction=0.046, pad=0.04)
            
            # Overlay
            ax3.imshow(img_display, cmap='gray' if len(img_display.shape) == 2 else None)
            ax3.imshow(attention_map, cmap='jet', alpha=0.5)
            ax3.set_title('Overlay')
            ax3.axis('off')
            
            # Convert to base64
            buffer = io.BytesIO()
            plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)
            buffer.seek(0)
            
            image_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            plt.close(fig)
            
            return f"data:image/png;base64,{image_base64}"
            
        except Exception as e:
            logger.error(f"Error creating heatmap image: {e}")
            return ""
    
    async def _create_cam_visualization(self, activation_map: np.ndarray, original_image: np.ndarray) -> str:
        """Create CAM visualization"""
        return await self._create_heatmap_image(activation_map, original_image)
    
    async def _create_gradient_visualization(self, gradients: np.ndarray, original_image: np.ndarray) -> str:
        """Create gradient visualization"""
        return await self._create_heatmap_image(gradients, original_image)
    
    async def _create_region_visualization(self, region_map: np.ndarray, original_image: np.ndarray) -> str:
        """Create region visualization"""
        return await self._create_heatmap_image(region_map, original_image)
    
    async def _create_tooth_visualization(self, tooth_map: np.ndarray, original_image: np.ndarray) -> str:
        """Create tooth analysis visualization"""
        return await self._create_heatmap_image(tooth_map, original_image)
    
    async def _create_volume_visualization(self, volume_map: np.ndarray, original_image: np.ndarray) -> str:
        """Create volume visualization"""
        return await self._create_heatmap_image(volume_map, original_image)