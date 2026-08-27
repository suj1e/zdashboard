import { useIcons } from '../lib/icons.js';
import { Button } from '../components/ui/button.js';

/** 统一错误状态:消息展示 + 可选重试 */
export function ErrorState({ message, onRetry, retryLabel = '重试' }: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { icon } = useIcons();
  return (
    <div className="flex-1 grid place-items-center select-none" data-slot="error-state">
      <div className="text-center">
        <div className="mx-auto mb-3.5 grid h-14 w-14 place-items-center rounded-[var(--radius-lg)] bg-destructive/10 text-destructive">
          {icon('file-question', 'h-6 w-6')}
        </div>
        <p className="text-sm text-destructive" role="alert">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>{retryLabel}</Button>
        )}
      </div>
    </div>
  );
}
