import { startScanWorker } from './workers/scanWorker'

console.log('[worker] Starting scan worker process…')

const worker = startScanWorker()

process.on('SIGTERM', async () => {
  console.log('[worker] SIGTERM received — shutting down gracefully')
  await worker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('[worker] SIGINT received — shutting down gracefully')
  await worker.close()
  process.exit(0)
})
