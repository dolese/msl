import { Router } from 'express';
import { z } from 'zod';
import { inviteUserSchema, resetPasswordSchema, ROLES } from '@msl/shared';
import { requirePermission } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { badRequest } from '../../lib/http-error.js';
import * as svc from './users.service.js';

export const usersRouter = Router();
usersRouter.use(requirePermission('users:manage'));
const idParam = z.object({ id: z.uuid() });

usersRouter.get('/', async (_req, res) => {
  res.json(await svc.listUsers());
});

usersRouter.post('/', async (req, res) => {
  const user = await svc.createUser(inviteUserSchema.parse(req.body));
  await audit({ action: 'user.invited', actorId: req.user!.id, targetLabel: svc.loginOf(user), detail: user.role, ip: req.ip });
  res.status(201).json(user);
});

usersRouter.patch('/:id/role', async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { role } = z.object({ role: z.enum(ROLES) }).parse(req.body);
  if (id === req.user!.id) throw badRequest('You cannot change your own role');
  const user = await svc.setRole(id, role);
  await audit({ action: 'user.role_changed', actorId: req.user!.id, targetLabel: svc.loginOf(user), detail: role, ip: req.ip });
  res.json(user);
});

usersRouter.post('/:id/unlock', async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await svc.unlock(id));
});

usersRouter.post('/:id/password', async (req, res) => {
  const { id } = idParam.parse(req.params);
  if (id === req.user!.id) throw badRequest('Change your own password under Account settings');
  const { password } = resetPasswordSchema.parse(req.body);
  const user = await svc.resetPassword(id, password);
  await audit({ action: 'user.password_reset', actorId: req.user!.id, targetLabel: svc.loginOf(user), ip: req.ip });
  res.json(user);
});
