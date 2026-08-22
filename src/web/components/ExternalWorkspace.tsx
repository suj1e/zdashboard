
export interface ExternalWorkspaceProps {
  viewerUrl: string;
  label: string;
}

export function ExternalWorkspace({ viewerUrl, label }: ExternalWorkspaceProps) {
  return (
    <div className="mx-auto h-full w-full max-w-6xl overflow-hidden rounded-lg border bg-background shadow-sm">
      <iframe
        src={viewerUrl}
        title={label}
        className="w-full h-full border-0 bg-background"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
