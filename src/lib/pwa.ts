if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(error => {
        // Only log critical registration failures
        console.error('SW registration failed:', error);
      });
  });
}
