import React from "react";

interface EventsPitchLoadingOverlayProps {
  message?: string;
}

const EventsPitchLoadingOverlay: React.FC<EventsPitchLoadingOverlayProps> = ({
  message = "Cargando eventos...",
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-brightness-75">
      <div
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-3 rounded-md border border-white/25 bg-black/30 px-4 py-3 text-sm font-medium text-white shadow-lg"
      >
        <svg
          viewBox="0 0 24 24"
          className="size-6 animate-spin"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M12 7.2 15.8 10 14.4 14.6H9.6L8.2 10 12 7.2Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
          <path
            d="M8.2 10 4.4 8.9M15.8 10l3.8-1.1M9.6 14.6l-2.2 3.2M14.4 14.6l2.2 3.2M12 7.2V3.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.4"
          />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  );
};

export default EventsPitchLoadingOverlay;
