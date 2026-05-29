(function() {
  const messageListeners = new WeakMap();

  const originalAdd = window.addEventListener;
  window.addEventListener = function(type, listener, options) {
    if (type === 'message' && typeof listener === 'function') {
      const wrapped = function(event) {
        try {
          return listener.apply(this, arguments);
        } catch (err) {
          if (err && err.message && err.message.includes("reading 'url'")) {
            // Suppress the error to prevent console spam and execution failure in guest scripts
            return;
          }
          throw err;
        }
      };
      messageListeners.set(listener, wrapped);
      return originalAdd.call(this, type, wrapped, options);
    }
    return originalAdd.apply(this, arguments);
  };

  const originalRemove = window.removeEventListener;
  window.removeEventListener = function(type, listener, options) {
    if (type === 'message' && typeof listener === 'function') {
      const wrapped = messageListeners.get(listener);
      if (wrapped) {
        messageListeners.delete(listener);
        return originalRemove.call(this, type, wrapped, options);
      }
    }
    return originalRemove.apply(this, arguments);
  };
})();
