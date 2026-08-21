import React from 'react';

export interface ExternalWorkspaceProps {
  viewerUrl: string;
  label: string;
}

export function ExternalWorkspace({ viewerUrl, label }: ExternalWorkspaceProps) {
  return (
    <iframe
      src={viewerUrl}
      title={label}
      className="w-full h-full border-0 bg-background"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}
