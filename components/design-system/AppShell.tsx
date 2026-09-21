import { ReactNode } from 'react';
import { StageContext } from './StageContext';
import { Wordmark } from './Wordmark';

type AppShellProps = {
  children: ReactNode;
  stage: 'Awaken' | 'See Clearly' | 'Become' | 'Join';
  accountAction?: ReactNode;
};

export function AppShell({ children, stage, accountAction }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <Wordmark href="/dashboard" />
        {accountAction ? <div className="app-shell-account">{accountAction}</div> : null}
      </header>
      <StageContext currentStage={stage} />
      <main className="app-shell-content" id="main-content">{children}</main>
    </div>
  );
}
