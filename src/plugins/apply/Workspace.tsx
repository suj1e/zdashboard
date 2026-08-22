import ApplyViewer from './Viewer.js';

interface WorkspaceProps {
  navTarget?: { wt?: string };
}

export default function Workspace({ navTarget }: WorkspaceProps) {
  return <ApplyViewer navTarget={navTarget} />;
}
