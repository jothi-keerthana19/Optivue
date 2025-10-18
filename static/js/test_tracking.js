// Test script to verify tracking button functionality
console.log('Testing tracking button functionality...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking tracking button...');
    
    const trackingButton = document.querySelector('.tracking-toggle');
    if (trackingButton) {
        console.log('Tracking button found:', trackingButton);
        
        // Check if event listeners are attached
        const events = getEventListeners ? getEventListeners(trackingButton) : 'Event listener check not available';
        console.log('Button event listeners:', events);
        
        // Test button click simulation
        setTimeout(() => {
            console.log('Simulating button click...');
            trackingButton.click();
        }, 2000);
    } else {
        console.error('Tracking button not found!');
    }
    
    // Check if imports are working
    if (typeof window.startCamera === 'function') {
        console.log('startCamera function is available globally');
    } else {
        console.error('startCamera function not available globally');
    }
    
    if (typeof window.stopCamera === 'function') {
        console.log('stopCamera function is available globally');
    } else {
        console.error('stopCamera function not available globally');
    }
    
    // Check streaming status
    if (typeof window.getStreamingStatus === 'function') {
        console.log('Streaming status:', window.getStreamingStatus());
    }
});