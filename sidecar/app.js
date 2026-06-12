import express from 'express';
import skillsRouter from './routes/skills.js';
import sessionsRouter from './routes/sessions.js';
import agentRouter from './routes/agent.js';

export function createApp() {
  const app = express();
  app.use(express.json());

  // Logging middleware
  // TODO: Move logging to dedicated modules
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ healthy: true });
  });

  // Register routes
  app.use('/skill', skillsRouter);
  app.use('/session', sessionsRouter);
  app.use('/agent', agentRouter);

  return app;
}
