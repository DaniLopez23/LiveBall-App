import React from "react";

interface PassNetworkNoDataOverlayProps {
  message?: string;
}

const PassNetworkNoDataOverlay: React.FC<PassNetworkNoDataOverlayProps> = ({
  message = "No hay datos suficientes",
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/45 backdrop-brightness-75">
      <p className="rounded-md border border-white/25 bg-black/30 px-3 py-2 text-sm font-medium text-white">
        {message}
      </p>
    </div>
  );
};

export default PassNetworkNoDataOverlay;
