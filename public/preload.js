const { ipcRenderer } = require('electron');

(function() {
  console.warn("[TORNagator Preload] Preload script loaded in webview context");

  window.tornagatorIpc = {
    sendToHost: (channel, ...args) => {
      ipcRenderer.sendToHost(channel, ...args);
    }
  };

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalInfo = console.info;

  // 1. Diagnostics helper to print call stacks and arguments
  const handleDiagnostic = (method, args) => {
    const isTarget = args.some(arg => {
      if (arg instanceof Error) {
        return (arg.message && arg.message.includes("reading 'url'")) || 
               (arg.stack && arg.stack.includes('handleReceiveMessage'));
      }
      const str = String(arg);
      return str.includes('[handleReceiveMessage]') || str.includes("reading 'url'");
    });

    if (isTarget) {
      originalWarn.call(console, "=== TORNAGATOR DIAGNOSTIC START ===");
      originalWarn.call(console, `Method: console.${method}`);
      
      args.forEach((arg, i) => {
        if (arg instanceof Error) {
          originalWarn.call(console, `Arg ${i} (Error):`, arg.message);
          originalWarn.call(console, `Arg ${i} Stack:`, arg.stack);
        } else if (typeof arg === 'object' && arg !== null) {
          try {
            originalWarn.call(console, `Arg ${i} (Object):`, JSON.stringify(arg, null, 2));
          } catch (e) {
            originalWarn.call(console, `Arg ${i} (Object, non-serializeable):`, String(arg));
          }
        } else {
          originalWarn.call(console, `Arg ${i}:`, arg);
        }
      });

      const callStack = new Error().stack;
      originalWarn.call(console, "Console Call Stack (Trace):", callStack);
      originalWarn.call(console, "=== TORNAGATOR DIAGNOSTIC END ===");
    }
  };

  console.log = function(...args) {
    handleDiagnostic('log', args);
    return originalLog.apply(console, args);
  };
  console.error = function(...args) {
    handleDiagnostic('error', args);
    return originalError.apply(console, args);
  };
  console.warn = function(...args) {
    handleDiagnostic('warn', args);
    return originalWarn.apply(console, args);
  };
  console.info = function(...args) {
    handleDiagnostic('info', args);
    return originalInfo.apply(console, args);
  };

  // 2. Wrap EventTarget.prototype.addEventListener and target.addEventListener directly
  const wrapAddRemove = (target) => {
    if (!target) return;
    const originalAdd = target.addEventListener;
    const originalRemove = target.removeEventListener;
    if (!originalAdd || !originalRemove) return;

    const wrappedMap = new WeakMap();

    target.addEventListener = function(type, listener, options) {
      if (type === 'message' && typeof listener === 'function') {
        let wrapped = wrappedMap.get(listener);
        if (!wrapped) {
          wrapped = function(event) {
            try {
              return listener.apply(this, arguments);
            } catch (err) {
              if (err && err.message && err.message.includes("reading 'url'")) {
                originalWarn.call(console, "=== TORNAGATOR MESSAGE LISTENER ERROR ===");
                originalWarn.call(console, "Error:", err.message);
                originalWarn.call(console, "Error Stack:", err.stack);
                originalWarn.call(console, "Event origin:", event ? event.origin : 'unknown');
                try {
                  originalWarn.call(console, "Event data:", JSON.stringify(event ? event.data : null, null, 2));
                } catch (e) {
                  originalWarn.call(console, "Event data (non-serializeable):", event ? event.data : 'unknown');
                }
                originalWarn.call(console, "=========================================");
              }
              throw err;
            }
          };
          wrappedMap.set(listener, wrapped);
        }
        return originalAdd.call(this, type, wrapped, options);
      }
      return originalAdd.apply(this, arguments);
    };

    target.removeEventListener = function(type, listener, options) {
      if (type === 'message' && typeof listener === 'function') {
        const wrapped = wrappedMap.get(listener);
        if (wrapped) {
          return originalRemove.call(this, type, wrapped, options);
        }
      }
      return originalRemove.apply(this, arguments);
    };
  };

  if (window.EventTarget && window.EventTarget.prototype) {
    wrapAddRemove(window.EventTarget.prototype);
  }
  wrapAddRemove(window);

  // 3. Wrap onmessage property on prototypes (handles WebSocket, Worker, Window, etc.)
  const wrapOnmessage = (proto) => {
    if (!proto) return;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'onmessage');
    if (!descriptor || !descriptor.set || !descriptor.get) return;

    const originalSet = descriptor.set;
    const originalGet = descriptor.get;

    Object.defineProperty(proto, 'onmessage', {
      get() {
        return originalGet.call(this);
      },
      set(listener) {
        if (typeof listener === 'function') {
          const wrapped = function(event) {
            try {
              return listener.apply(this, arguments);
            } catch (err) {
              if (err && err.message && err.message.includes("reading 'url'")) {
                originalWarn.call(console, "=== TORNAGATOR ONMESSAGE ERROR ===");
                originalWarn.call(console, "Error:", err.message);
                originalWarn.call(console, "Error Stack:", err.stack);
                originalWarn.call(console, "Event origin:", event ? event.origin : 'unknown');
                try {
                  originalWarn.call(console, "Event data:", JSON.stringify(event ? event.data : null, null, 2));
                } catch (e) {
                  originalWarn.call(console, "Event data (non-serializeable):", event ? event.data : 'unknown');
                }
                originalWarn.call(console, "=================================");
              }
              throw err;
            }
          };
          return originalSet.call(this, wrapped);
        }
        return originalSet.call(this, listener);
      },
      configurable: true,
      enumerable: true
    });
  };

  const classesToWrap = [
    window.WebSocket ? window.WebSocket.prototype : null,
    window.Worker ? window.Worker.prototype : null,
    window.MessagePort ? window.MessagePort.prototype : null,
    window.EventSource ? window.EventSource.prototype : null
  ];
  classesToWrap.forEach(wrapOnmessage);

  let current = window;
  while (current) {
    const desc = Object.getOwnPropertyDescriptor(current, 'onmessage');
    if (desc && desc.set) {
      wrapOnmessage(current);
      break;
    }
    current = Object.getPrototypeOf(current);
  }
})();
