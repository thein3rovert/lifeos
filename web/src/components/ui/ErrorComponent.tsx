import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorComponentProps {
  error: Error;
  onRetry?: () => void;
}

export default function ErrorComponent({ error, onRetry }: ErrorComponentProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-center">
      <AlertCircle className="w-8 h-8 text-error mb-3" strokeWidth={1.5} />
      <h1 className="text-md font-medium text-primary mb-1">Something went wrong</h1>
      <p className="text-xs text-secondary mb-4 max-w-xs">{error.message}</p>
      {onRetry ? (
        <Button
          variant="primary"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3 h-3" strokeWidth={1.5} />}
        >
          Try again
        </Button>
      ) : (
        <Button variant="primary" size="sm" onClick={() => window.location.reload()}>
          Reload page
        </Button>
      )}
    </div>
  );
}
