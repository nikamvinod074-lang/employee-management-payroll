import React, { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, variant = "success") => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => removeToast(id), 4500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        className="position-fixed p-3"
        style={{ top: 0, right: 0, zIndex: 2000, minWidth: "300px" }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast show mb-2 border-0 shadow-sm`}
            role="alert"
          >
            <div
              className={`toast-body d-flex align-items-center justify-content-between text-white rounded`}
              style={{
                background:
                  t.variant === "success" ? "#1E8E63" : t.variant === "danger" ? "#D64545" : "#2E6FC9",
              }}
            >
              <span>{t.message}</span>
              <button
                type="button"
                className="btn-close btn-close-white ms-3"
                onClick={() => removeToast(t.id)}
                aria-label="Close"
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
