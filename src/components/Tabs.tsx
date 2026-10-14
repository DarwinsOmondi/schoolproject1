import { BarChart3, Award, Globe, Settings, Calculator } from 'lucide-react';

export type TabId = 'overview' | 'log' | 'badges' | 'sites' | 'settings';

interface Props {
  active: TabId;
  onChange: (t: TabId) => void;
}

const TABS: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'log', label: 'Log', icon: Calculator },
  { id: 'badges', label: 'Badges', icon: Award },
  { id: 'sites', label: 'Sites', icon: Globe },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Tabs({ active, onChange }: Props) {
  return (
    <div className="flex px-2 pt-1.5 pb-1 gap-1">
      {TABS.map((t) => {
        const Icon = t.icon;
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-all rounded-xl ${
              isActive
                ? 'glass-strong text-accent'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <Icon size={16} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
