import { lazy } from 'react';
const BatchDashboard = lazy(() => import('./viewers/BatchDashboard.js'));

export default function ApplyBatchWorkspace() {
  return <BatchDashboard />;
}
