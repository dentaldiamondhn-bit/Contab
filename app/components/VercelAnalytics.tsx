'use client';

import { useEffect, useState } from 'react';

export function SafeAnalytics() {
  const [Analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    import('@vercel/analytics/react').then(mod => setAnalytics(() => mod.Analytics)).catch(() => {});
  }, []);

  if (!Analytics) return null;
  return <Analytics />;
}

export function SafeSpeedInsights() {
  const [SpeedInsights, setSpeedInsights] = useState<any>(null);

  useEffect(() => {
    import('@vercel/speed-insights/next').then(mod => setSpeedInsights(() => mod.SpeedInsights)).catch(() => {});
  }, []);

  if (!SpeedInsights) return null;
  return <SpeedInsights />;
}
