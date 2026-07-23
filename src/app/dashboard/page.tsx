'use client';

import SapaStats from '@/components/SapaStats';
import AiChatPanel from '@/components/AiChatPanel';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Section 1: SAPA Data Overview — real data from /api/stats */}
      <SapaStats />

      {/* Section 2: AI Interactive Panel */}
      <AiChatPanel />
    </div>
  );
}
