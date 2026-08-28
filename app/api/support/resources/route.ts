import { NextResponse } from 'next/server';
import os from 'os';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export const dynamic = 'force-dynamic';

interface ResourceInfo {
  cpu: {
    model: string;
    cores: number;
    usagePercent: number;
    speed: number;
  };
  memory: {
    totalGB: number;
    usedGB: number;
    freeGB: number;
    usagePercent: number;
  };
  storage: {
    usedMB: number;
    limitMB: number;
    usagePercent: number;
  };
  uptime: number;
  platform: string;
  nodeVersion: string;
}

export async function GET() {
  try {
    // CPU
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || 'Unknown';
    const cpuCores = cpus.length;
    const cpuSpeed = cpus[0]?.speed || 0;

    // Calculate CPU usage from idle/total deltas
    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += (cpu.times as any)[type];
      }
      totalIdle += cpu.times.idle;
    }
    const cpuUsagePercent = Math.round(((totalTick - totalIdle) / totalTick) * 100);

    // Memory
    const totalMemBytes = os.totalmem();
    const freeMemBytes = os.freemem();
    const usedMemBytes = totalMemBytes - freeMemBytes;
    const memoryTotalGB = Math.round((totalMemBytes / (1024 * 1024 * 1024)) * 10) / 10;
    const memoryUsedGB = Math.round((usedMemBytes / (1024 * 1024 * 1024)) * 10) / 10;
    const memoryFreeGB = Math.round((freeMemBytes / (1024 * 1024 * 1024)) * 10) / 10;
    const memoryUsagePercent = Math.round((usedMemBytes / totalMemBytes) * 100);

    // Storage — try Supabase storage buckets
    let storageUsedMB = 0;
    let storageLimitMB = 1024; // Default 1GB limit
    try {
      const supabase = createServiceRoleClient();
      const { data: buckets } = await supabase.storage.listBuckets();
      if (buckets) {
        for (const bucket of buckets) {
          const { data: files } = await supabase.storage.from(bucket.name).list('', { limit: 1000 });
          if (files) {
            for (const file of files) {
              storageUsedMB += (file.metadata?.size || 0) / (1024 * 1024);
            }
          }
        }
        storageUsedMB = Math.round(storageUsedMB * 100) / 100;
      }
    } catch (e) {
      // Storage query failed, use defaults
    }

    const resources: ResourceInfo = {
      cpu: {
        model: cpuModel,
        cores: cpuCores,
        usagePercent: cpuUsagePercent,
        speed: cpuSpeed,
      },
      memory: {
        totalGB: memoryTotalGB,
        usedGB: memoryUsedGB,
        freeGB: memoryFreeGB,
        usagePercent: memoryUsagePercent,
      },
      storage: {
        usedMB: storageUsedMB,
        limitMB: storageLimitMB,
        usagePercent: Math.round((storageUsedMB / storageLimitMB) * 100),
      },
      uptime: Math.round(os.uptime()),
      platform: os.platform(),
      nodeVersion: process.version,
    };

    return NextResponse.json(resources);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get resources' },
      { status: 500 }
    );
  }
}
