import { Card } from '../../components/layout/Card';
import { useStore } from '../store';
import { TransferTokenForm } from './TransferTokenForm';

export function TransferTokenCard() {
  return (
    <Card className="w-full min-w-0 max-w-[26rem] sm:w-[31rem]">
      <BridgeHistoryTabs />
      <TransferTokenForm />
    </Card>
  );
}

function BridgeHistoryTabs() {
  const { setIsSideBarOpen } = useStore((s) => ({
    setIsSideBarOpen: s.setIsSideBarOpen,
  }));

  return (
    <div className="mb-3 flex gap-1 rounded-xl bg-white/5 p-1">
      <button
        type="button"
        className="flex-1 rounded-lg bg-gradient-to-r from-primary-500 to-accent-500 py-1.5 text-sm font-medium text-white shadow transition-all"
      >
        Bridge
      </button>
      <button
        type="button"
        onClick={() => setIsSideBarOpen(true)}
        className="flex-1 rounded-lg py-1.5 text-sm font-medium text-gray-400 transition-all hover:bg-white/5 hover:text-white"
      >
        History
      </button>
    </div>
  );
}
