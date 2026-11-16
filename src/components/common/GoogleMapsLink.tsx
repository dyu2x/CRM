import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

interface Props {
  coordinates?: string;
  address?: string;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

export const GoogleMapsLink: React.FC<Props> = ({
  coordinates,
  address,
  label,
  className = '',
  showIcon = true,
}) => {
  const query = (coordinates && coordinates.trim() !== '') 
    ? coordinates.trim() 
    : (address || '').trim();

  if (!query) {
    return <span className="text-neutral-400 font-mono text-[11px]">No GPS data</span>;
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={`Open ${query} in Google Maps for navigation`}
      className={`inline-flex items-center gap-1 text-neutral-800 hover:text-blue-600 transition group font-mono text-[11px] underline decoration-neutral-300 hover:decoration-blue-500 cursor-pointer ${className}`}
    >
      {showIcon && (
        <MapPin className="w-3.5 h-3.5 text-neutral-400 group-hover:text-blue-500 shrink-0" />
      )}
      <span className="truncate">{label || query}</span>
      <ExternalLink className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 shrink-0" />
    </a>
  );
};
