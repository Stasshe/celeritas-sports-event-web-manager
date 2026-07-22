import { useMemo, useState } from 'react';
import { FirebaseConfigurationError } from './config/firebase';

interface ErrorScreenProps {
  error: Error;
  onRetry?: () => void;
}

type CopyStatus = 'idle' | 'copied' | 'failed';

const buildErrorReport = (error: Error): string => {
  const lines = [
    `Name: ${error.name || 'Error'}`,
    `Message: ${error.message || '(no message)'}`,
    `URL: ${window.location.href}`,
    `Time: ${new Date().toISOString()}`,
    `User agent: ${navigator.userAgent}`
  ];

  if (error.stack) {
    lines.push('', 'Stack:', error.stack);
  }

  return lines.join('\n');
};

function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  const isConfigurationError = error instanceof FirebaseConfigurationError;
  const errorReport = useMemo(() => buildErrorReport(error), [error]);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(errorReport);
      setCopyStatus('copied');
    } catch (copyError) {
      console.error('Failed to copy error details', copyError);
      setCopyStatus('failed');
    }
  };

  let description = 'アプリケーションを読み込めませんでした。時間をおいて、もう一度お試しください。';
  if (isConfigurationError) {
    description = 'Firebase の設定が不足しているため、アプリケーションを開始できません。';
  }

  return (
    <main className="error-screen">
      <section className="error-panel" role="alert" aria-labelledby="error-title">
        <div className="error-mark" aria-hidden="true">!</div>
        <p className="error-label">起動エラー</p>
        <h1 id="error-title">画面を表示できません</h1>
        <p className="error-description">{description}</p>

        {isConfigurationError && (
          <div className="error-details">
            <p><code>.env.local</code> に次の環境変数を設定してください。</p>
            <ul>
              {error.missingVariables.map((variable) => (
                <li key={variable}><code>{variable}</code></li>
              ))}
            </ul>
            <p>設定後、開発サーバーを再起動してください。</p>
          </div>
        )}

        <div className="error-report">
          <div className="error-report-header">
            <h2>エラー詳細</h2>
            <button className="error-copy" type="button" onClick={handleCopy}>
              {copyStatus === 'copied' ? 'コピーしました' : '詳細をコピー'}
            </button>
          </div>
          <pre>{errorReport}</pre>
          {copyStatus === 'failed' && (
            <p className="error-copy-failure">コピーできませんでした。詳細を選択してコピーしてください。</p>
          )}
        </div>

        {onRetry && (
          <button className="error-retry" type="button" onClick={onRetry}>
            再読み込み
          </button>
        )}
      </section>
    </main>
  );
}

export default ErrorScreen;
