import { FirebaseConfigurationError } from './config/firebase';

interface ErrorScreenProps {
  error: Error;
  onRetry?: () => void;
}

function ErrorScreen({ error, onRetry }: ErrorScreenProps) {
  const isConfigurationError = error instanceof FirebaseConfigurationError;

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
