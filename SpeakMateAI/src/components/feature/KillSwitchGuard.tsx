// KillSwitchGuard — wraps a screen to enforce its module's kill switch.
// If the module is disabled, renders MaintenanceScreen instead.
import React from 'react';
import MaintenanceScreen from '@/screens/maintenance/MaintenanceScreen';
import { useRemoteConfig } from '@/contexts/RemoteConfigContext';

interface Props {
  module: 'tutor' | 'speaking' | 'interview' | 'premium';
  moduleLabel: string;
  children: React.ReactNode;
}

export default function KillSwitchGuard({ module, moduleLabel, children }: Props) {
  const { isEnabled } = useRemoteConfig();
  if (!isEnabled(module)) {
    return <MaintenanceScreen moduleName={moduleLabel} />;
  }
  return <>{children}</>;
}
