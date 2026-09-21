type PromptProps = { prompt: string; help?: string };

export function Prompt({ prompt, help }: PromptProps) {
  return <><h1>{prompt}</h1>{help ? <p className="reflection-panel__prompt">{help}</p> : null}</>;
}
