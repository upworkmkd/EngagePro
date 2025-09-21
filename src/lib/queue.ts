import { Queue, Worker, QueueEvents } from 'bullmq'
import { redis } from './redis'

// Email sending queue
export const emailQueue = new Queue('email-sending', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
})

// Lead enrichment queue
export const enrichmentQueue = new Queue('lead-enrichment', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
})

// Google Places import queue
export const importQueue = new Queue('google-places-import', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
})

// Campaign follow-up queue
export const followUpQueue = new Queue('campaign-followup', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
})

// Bounce detection queue
export const bounceQueue = new Queue('bounce-detection', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 10,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 30000,
    },
  },
})

// Queue events for monitoring
export const emailQueueEvents = new QueueEvents('email-sending', {
  connection: redis,
})

export const enrichmentQueueEvents = new QueueEvents('lead-enrichment', {
  connection: redis,
})

export const importQueueEvents = new QueueEvents('google-places-import', {
  connection: redis,
})

export const followUpQueueEvents = new QueueEvents('campaign-followup', {
  connection: redis,
})

export const bounceQueueEvents = new QueueEvents('bounce-detection', {
  connection: redis,
})

// Helper function to add repeatable jobs
export async function addRepeatableJobs() {
  // Daily Google Places import at 2 AM
  await importQueue.add(
    'daily-import',
    {},
    {
      repeat: { pattern: '0 2 * * *' }, // Daily at 2 AM
      jobId: 'daily-import',
    }
  )

  // Hourly bounce detection
  await bounceQueue.add(
    'hourly-bounce-check',
    {},
    {
      repeat: { pattern: '0 * * * *' }, // Every hour
      jobId: 'hourly-bounce-check',
    }
  )
}
