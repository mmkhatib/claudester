import { NextResponse } from 'next/server';
import { isConnected as isMongoConnected } from '@/lib/mongodb';
import { isRedisConnected } from '@/lib/redis';
import { getQueueStats } from '@/lib/queue';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const mongoStatus = isMongoConnected();
    const redisStatus = isRedisConnected();

    let queueStats;
    try {
      queueStats = await getQueueStats();
    } catch (error) {
      queueStats = null;
    }

    const health = {
      status: mongoStatus && redisStatus ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: mongoStatus ? 'connected' : 'disconnected',
        redis: redisStatus ? 'connected' : 'disconnected',
      },
      queues: queueStats,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
