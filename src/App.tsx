import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { RoundtableView } from './components/roundtable/RoundtableView';
import type { SidebarTab } from './components/roundtable/types';

function App() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('proposition');

  return (
    <div className="flex h-screen bg-[var(--shell-bg)] text-[var(--ink-1)]">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sessionStatus={null}
        spikeCount={0}
      />
      <main className="flex-1 overflow-y-auto">
        <RoundtableView activeTab={activeTab} />
      </main>
    </div>
  );
}

export default App;
