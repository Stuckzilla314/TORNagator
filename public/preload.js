(function() {
  // 1. Monkeypatch console log/error/warn to suppress console spam from guest page try-catch blocks
  const consoleFilters = [
    {
      check: (args) => {
        const fullText = args.map(arg => {
          if (arg instanceof Error) {
            return arg.message + '\n' + arg.stack;
          }
          if (typeof arg === 'object' && arg !== null) {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');

        return fullText.includes('[handleReceiveMessage]') && fullText.includes("reading 'url'");
      }
    }
  ];

  const wrapConsole = (method) => {
    const original = console[method];
    if (!original) return;
    console[method] = function(...args) {
      for (const filter of consoleFilters) {
        if (filter.check(args)) {
          return; // Suppress the log entirely
        }
      }
      return original.apply(console, args);
    };
  };

  wrapConsole('log');
  wrapConsole('error');
  wrapConsole('warn');
  wrapConsole('info');

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
                return;
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
                return;
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
