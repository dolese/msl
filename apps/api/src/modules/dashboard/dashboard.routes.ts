import { Router } from 'express';
import { can } from '@msl/shared';
import { requirePermission } from '../../middleware/auth.js';
import { getDashboard } from './dashboard.service.js';

export const dashboardRouter = Router();

dashboardRouter.get('/', requirePermission('records:read'), async (req, res) => {
  res.json(await getDashboard({ includeActivity: can(req.user!.role, 'audit:read') }));
});
