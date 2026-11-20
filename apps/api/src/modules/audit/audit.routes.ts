import { Router } from 'express';
import { auditQuery } from '@msl/shared';
import { requirePermission } from '../../middleware/auth.js';
import { listAudit } from './audit.service.js';

export const auditRouter = Router();

auditRouter.get('/', requirePermission('audit:read'), async (req, res) => {
  res.json(await listAudit(auditQuery.parse(req.query)));
});
