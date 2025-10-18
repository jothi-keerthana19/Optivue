// Test script to verify metrics calculations
console.log('Testing metrics calculations...');

// Test data
const testMetrics = {
    totalBlinks: 25,
    blinkRate: 18.5,
    eyeRatio: 0.22,
    leftEyeRatio: 0.21,
    rightEyeRatio: 0.23,
    drowsinessLevel: 45.2,
    eyeStrainLevel: 35.8,
    timestamp: Date.now()
};

console.log('Test metrics:', testMetrics);

// Verify percentage validation (following memory specifications)
function validateMetrics(metrics) {
    const errors = [];
    
    // Validate percentage ranges (0-100%)
    if (metrics.drowsinessLevel < 0 || metrics.drowsinessLevel > 100) {
        errors.push(`Invalid drowsiness level: ${metrics.drowsinessLevel}% (must be 0-100%)`);
    }
    
    if (metrics.eyeStrainLevel < 0 || metrics.eyeStrainLevel > 100) {
        errors.push(`Invalid eye strain level: ${metrics.eyeStrainLevel}% (must be 0-100%)`);
    }
    
    // Validate ratio ranges (0-1)
    if (metrics.eyeRatio < 0 || metrics.eyeRatio > 1) {
        errors.push(`Invalid eye ratio: ${metrics.eyeRatio} (must be 0-1)`);
    }
    
    // Validate blink rate
    if (metrics.blinkRate < 0 || metrics.blinkRate > 100) {
        errors.push(`Invalid blink rate: ${metrics.blinkRate} bpm (must be 0-100)`);
    }
    
    return errors;
}

const validationErrors = validateMetrics(testMetrics);
if (validationErrors.length > 0) {
    console.error('Validation errors:', validationErrors);
} else {
    console.log('✅ All metrics are within valid ranges');
}

// Test threshold categorization
function categorizeMetrics(metrics) {
    return {
        drowsinessCategory: metrics.drowsinessLevel > 60 ? 'high' : 
                           metrics.drowsinessLevel > 30 ? 'medium' : 'low',
        eyeStrainCategory: metrics.eyeStrainLevel > 60 ? 'high' : 
                          metrics.eyeStrainLevel > 40 ? 'medium' : 'low',
        blinkRateCategory: metrics.blinkRate < 12 ? 'low' : 
                          metrics.blinkRate < 15 ? 'normal' : 'high'
    };
}

const categories = categorizeMetrics(testMetrics);
console.log('Categorized metrics:', categories);

// Export for use in console
window.testMetrics = testMetrics;
window.validateMetrics = validateMetrics;
window.categorizeMetrics = categorizeMetrics;