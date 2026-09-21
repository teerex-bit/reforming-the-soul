import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { AppShell } from '../../../components/design-system/AppShell';
import { Button } from '../../../components/design-system/Button';
import { ChoicePanel } from '../../../components/design-system/ChoicePanel';
import { EditorialHero } from '../../../components/design-system/EditorialHero';
import { Field } from '../../../components/design-system/Field';
import { PracticePanel } from '../../../components/design-system/PracticePanel';
import { ProvenanceBadge } from '../../../components/design-system/ProvenanceBadge';
import { ReflectionPanel } from '../../../components/design-system/ReflectionPanel';
import { StageContext } from '../../../components/design-system/StageContext';
import { StatusMessage } from '../../../components/design-system/StatusMessage';
import { Wordmark } from '../../../components/design-system/Wordmark';

afterEach(cleanup);

describe('Overview-derived design-system foundation', () => {
  it('renders the Tree of Life wordmark and four-stage context without dashboard navigation', () => {
    render(
      <AppShell stage="Awaken" accountAction={<button type="button">Sign out</button>}>
        <h1>Pay Attention</h1>
      </AppShell>,
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Reforming the Soul' })).toHaveAttribute('src', '/assets/logos/rts-tree-wordmark.png');
    expect(screen.getByRole('navigation', { name: 'Formation stages' })).toHaveTextContent('Awaken');
    expect(screen.getByRole('navigation', { name: 'Formation stages' })).toHaveTextContent('See Clearly');
    expect(screen.getByRole('navigation', { name: 'Formation stages' })).toHaveTextContent('Become');
    expect(screen.getByRole('navigation', { name: 'Formation stages' })).toHaveTextContent('Join');
    expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
  });

  it('preserves an accessible wordmark name when displayed independently', () => {
    render(<Wordmark />);
    expect(screen.getByRole('img', { name: 'Reforming the Soul' })).toBeInTheDocument();
  });

  it('marks the current stage and gives the context a semantic label', () => {
    render(<StageContext currentStage="See Clearly" />);
    expect(screen.getByText('See Clearly').parentElement).toHaveAttribute('aria-current', 'step');
  });

  it('uses semantic editorial heading hierarchy', () => {
    render(<EditorialHero eyebrow="AWAKEN" title="What happened?">Start with what you noticed.</EditorialHero>);
    expect(screen.getByRole('heading', { level: 1, name: 'What happened?' })).toBeInTheDocument();
    expect(screen.getByText('AWAKEN')).toHaveClass('eyebrow');
  });

  it('generates distinct heading relationships for repeated editorial panels', () => {
    render(
      <>
        <EditorialHero title="First question">First context.</EditorialHero>
        <EditorialHero title="Second question">Second context.</EditorialHero>
        <ReflectionPanel title="First reflection" prompt="Notice the first moment." field={<Field id="first-field" label="First field" />} />
        <ReflectionPanel title="Second reflection" prompt="Notice the second moment." field={<Field id="second-field" label="Second field" />} />
        <PracticePanel title="First practice" state="Open" nextStep="Wait for real life." returnAction={<a href="/first">Return</a>} />
        <PracticePanel title="Second practice" state="Open" nextStep="Wait for real life." returnAction={<a href="/second">Return</a>} />
      </>,
    );

    const headings = [
      screen.getByRole('heading', { name: 'First question' }),
      screen.getByRole('heading', { name: 'Second question' }),
      screen.getByRole('heading', { name: 'First reflection' }),
      screen.getByRole('heading', { name: 'Second reflection' }),
      screen.getByRole('heading', { name: 'First practice' }),
      screen.getByRole('heading', { name: 'Second practice' }),
    ];
    expect(new Set(headings.map(heading => heading.id)).size).toBe(headings.length);
    for (const heading of headings) {
      expect(heading.closest('section')).toHaveAttribute('aria-labelledby', heading.id);
    }
  });

  it('keeps a textarea label and associates errors with the control', () => {
    render(<Field id="what-happened" label="What happened?" help="Use your own words." error="Please describe what happened." />);
    const field = screen.getByRole('textbox', { name: 'What happened?' });
    expect(field).toHaveAttribute('aria-describedby', expect.stringContaining('what-happened-help'));
    expect(field).toHaveAttribute('aria-describedby', expect.stringContaining('what-happened-error'));
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Please describe what happened.');
  });

  it('grows a multiline field with its content while keeping manual vertical resizing available', () => {
    render(<Field id="reflection-grow" label="What happened?" />);
    const field = screen.getByRole('textbox', { name: 'What happened?' });
    Object.defineProperty(field, 'scrollHeight', { configurable: true, value: 184 });

    fireEvent.input(field, { target: { value: 'First line\nSecond line\nThird line' } });

    expect(field).toHaveValue('First line\nSecond line\nThird line');
    expect(field).toHaveStyle({ height: '184px', resize: 'vertical' });
  });

  it('sizes a prefilled multiline field on mount', () => {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'scrollHeight');
    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', { configurable: true, get: () => 156 });

    try {
      render(<Field id="prefilled-reflection" label="What happened?" defaultValue={'First line\nSecond line'} />);
      expect(screen.getByRole('textbox', { name: 'What happened?' })).toHaveStyle({ height: '156px' });
    } finally {
      if (descriptor) Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', descriptor);
      else delete (HTMLTextAreaElement.prototype as { scrollHeight?: number }).scrollHeight;
    }
  });

  it('keeps reflection prompts, labels, and save status visible together', () => {
    render(
      <ReflectionPanel
        title="Pay attention"
        prompt="Describe the moment without trying to solve it."
        field={<Field id="reflection" label="What happened?" />}
        status="Saved just now"
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Pay attention' })).toBeInTheDocument();
    expect(screen.getByText('Describe the moment without trying to solve it.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'What happened?' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Saved just now');
  });

  it('allows a choice to be selected with the keyboard while retaining its group label', () => {
    render(
      <ChoicePanel
        legend="What feels most true right now?"
        name="reflection-choice"
        options={['I need more time', 'I can name one next step']}
      />,
    );
    const option = screen.getByRole('radio', { name: 'I can name one next step' });
    const firstOption = screen.getByRole('radio', { name: 'I need more time' });
    firstOption.focus();
    fireEvent.keyDown(firstOption, { key: 'ArrowDown' });
    expect(option).toBeChecked();
    expect(screen.getByRole('group', { name: 'What feels most true right now?' })).toBeInTheDocument();
  });

  it('describes an open practice and provides a labeled return action', () => {
    render(<PracticePanel state="Waiting for real life" nextStep="Notice what happens before tomorrow." returnAction={<a href="/return">Return to this practice</a>} />);
    expect(screen.getByText('Waiting for real life')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Return to this practice' })).toHaveAttribute('href', '/return');
  });

  it('makes provenance explicit without presenting an AI suggestion as user wording', () => {
    render(<><ProvenanceBadge kind="user" /><ProvenanceBadge kind="structured" /><ProvenanceBadge kind="ai-suggestion" /><ProvenanceBadge kind="ai-confirmed" /></>);
    expect(screen.getByText('User wording')).toBeInTheDocument();
    expect(screen.getByText('Structured by you')).toBeInTheDocument();
    expect(screen.getByText('AI suggestion')).toBeInTheDocument();
    expect(screen.getByText('AI-confirmed')).toBeInTheDocument();
  });

  it('provides a native 44px action target that callers cannot shrink', () => {
    render(<Button style={{ minHeight: '1px' }}>Save reflection</Button>);
    const button = screen.getByRole('button', { name: 'Save reflection' });
    expect(button).toHaveClass('button');
    expect(button).toHaveStyle({ minHeight: '44px' });
    button.focus();
    expect(button).toHaveFocus();
  });

  it('uses an appropriate live region for calm status and errors', () => {
    const { rerender } = render(<StatusMessage tone="saving">Saving your reflection…</StatusMessage>);
    expect(screen.getByRole('status')).toHaveTextContent('Saving your reflection…');
    rerender(<StatusMessage tone="error">Your reflection could not be saved.</StatusMessage>);
    expect(screen.getByRole('alert')).toHaveTextContent('Your reflection could not be saved.');
  });
});
