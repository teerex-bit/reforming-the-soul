const stages = [
  { name: 'Awaken', icon: '/assets/icons/rts-stage-awaken.svg' },
  { name: 'See Clearly', icon: '/assets/icons/rts-stage-see-clearly.svg' },
  { name: 'Become', icon: '/assets/icons/rts-stage-become.svg' },
  { name: 'Join', icon: '/assets/icons/rts-stage-join.svg' },
] as const;

type StageContextProps = { currentStage: (typeof stages)[number]['name'] };

export function StageContext({ currentStage }: StageContextProps) {
  return (
    <nav className="stage-context" aria-label="Formation stages">
      <p className="stage-context-label">FORMATION</p>
      <ol className="stage-context-list">
        {stages.map(stage => (
          <li className="stage-context-item" key={stage.name} aria-current={stage.name === currentStage ? 'step' : undefined}>
            <img src={stage.icon} alt="" />
            <span>{stage.name}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
