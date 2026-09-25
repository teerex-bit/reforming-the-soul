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
        <div className="app-shell-account">{accountAction ?? <form action="/auth/callback?action=sign-out" method="post"><button className="app-shell-sign-out" type="submit">Sign out</button></form>}</div>
      </header>
      <StageContext currentStage={stage} />
      <main className="app-shell-content" id="main-content">{children}</main>
    </div>
  );
}
