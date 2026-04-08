/**
 * Cloud Run entry point.
 * Starts the health check HTTP server FIRST (main process only),
 * then spawns the LiveKit agent worker.
 * 
 * This separation ensures the health server never runs inside job subprocesses.
 */
import { createServer } from 'http';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8080;

// Start health server
const healthServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'voicory-agent' }));
});

healthServer.listen(PORT, () => {
  console.log(`[Health] HTTP server listening on port ${PORT}`);

  // Now start the LiveKit agent worker as a child process
  // It re-uses all env vars but won't bind PORT again
  const worker = spawn(
    process.execPath,
    [join(__dirname, 'index.js'), 'start'],
    {
      env: { ...process.env, PORT: undefined, LIVEKIT_HEALTH_HANDLED: '1' },
      stdio: 'inherit',
    }
  );

  worker.on('exit', (code) => {
    console.error(`[Agent] Worker exited with code ${code} — restarting in 3s`);
    // Cloud Run will restart the container if the main process exits
    // For now, just exit and let Cloud Run handle restart
    setTimeout(() => process.exit(1), 3000);
  });

  process.on('SIGTERM', () => {
    console.log('[Agent] SIGTERM received, shutting down');
    worker.kill('SIGTERM');
    healthServer.close(() => process.exit(0));
  });
});
