import { AppShell } from '../../components/design-system/AppShell';
import { Button } from '../../components/design-system/Button';
import { ChoicePanel } from '../../components/design-system/ChoicePanel';
import { EditorialHero } from '../../components/design-system/EditorialHero';
import { Field } from '../../components/design-system/Field';
import { PracticePanel } from '../../components/design-system/PracticePanel';
import { ProvenanceBadge } from '../../components/design-system/ProvenanceBadge';
import { ReflectionPanel } from '../../components/design-system/ReflectionPanel';

export default function DesignFoundationPage() {
  return (
    <AppShell stage="Awaken" accountAction={<Button variant="secondary">Account</Button>}>
      <EditorialHero eyebrow="AWAKEN" title="What happened?">
        <p>Begin with the moment you noticed, in your own words, before trying to explain it.</p>
      </EditorialHero>
      <div className="design-foundation-fixture">
        <ReflectionPanel
          title="Pay attention"
          prompt="Describe the moment without trying to solve it."
          field={<><Field id="what-happened" label="What happened?" help="Use your own words and keep the details that matter." /><Button>Save reflection</Button></>}
          status="Not saved yet"
        />
        <ChoicePanel
          legend="What feels most true right now?"
          name="design-foundation-choice"
          options={['I need more time', 'I can name one next step']}
        />
        <section className="design-foundation-fixture__provenance" aria-label="Record provenance">
          <ProvenanceBadge kind="user" />
          <ProvenanceBadge kind="structured" />
          <ProvenanceBadge kind="ai-suggestion" />
        </section>
        <PracticePanel
          state="Waiting for real life"
          nextStep="Notice what happens before tomorrow, then return to name what changed."
          returnAction={<a href="#return">Return to this practice</a>}
        />
      </div>
    </AppShell>
  );
}
