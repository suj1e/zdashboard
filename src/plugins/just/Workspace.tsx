import { LogViewer } from '../../web/components/LogViewer.js';

export default function Workspace() {
  return (
    <div className="mx-auto h-full max-w-6xl bg-background border rounded-lg shadow-sm overflow-hidden flex flex-col">
      <LogViewer />
    </div>
  );
}
