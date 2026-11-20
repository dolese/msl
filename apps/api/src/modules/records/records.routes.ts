import { Router } from 'express';
import { resolve } from 'node:path';
import { z } from 'zod';
import { createRecordSchema, createShareSchema, listRecordsQuery, updateRecordSchema } from '@msl/shared';
import { requirePermission } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';
import { notFound } from '../../lib/http-error.js';
import { photoUpload } from '../../lib/upload.js';
import { createShareLink } from '../share/share.service.js';
import { listRecordHistory } from '../audit/audit.service.js';
import * as svc from './records.service.js';

export const recordsRouter = Router();
const idParam = z.object({ id: z.uuid() });

recordsRouter.get('/', requirePermission('records:read'), async (req, res) => {
  res.json(await svc.listRecords(listRecordsQuery.parse(req.query)));
});

// Declared before "/:id" so "export" isn't treated as an id.
recordsRouter.get('/export.csv', requirePermission('records:export'), async (req, res) => {
  const { csv, count } = await svc.exportCsv();
  await audit({ action: 'record.exported', actorId: req.user!.id, detail: `${count} records — CSV format`, ip: req.ip });
  res.type('text/csv').attachment(`msl-records-${new Date().toISOString().slice(0, 10)}.csv`).send(csv);
});

recordsRouter.post('/', requirePermission('records:create'), photoUpload(), async (req, res) => {
  // multipart fields arrive as strings
  const input = createRecordSchema.parse({ ...req.body, consent: req.body.consent === 'true' || req.body.consent === true });
  const row = await svc.createRecord(input, req.user!.id, req.file?.filename ?? null);
  await audit({ action: 'record.created', actorId: req.user!.id, recordId: row.id, targetLabel: row.fullName, ip: req.ip });
  res.status(201).json(svc.toDTO(row, { id: req.user!.id, name: req.user!.name }));
});

recordsRouter.get('/:id', requirePermission('records:read'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { record, registrar } = await svc.getRecord(id);
  res.json(svc.toDTO(record, registrar));
});

recordsRouter.patch('/:id', requirePermission('records:update'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const input = updateRecordSchema.parse(req.body);
  const row = await svc.updateRecord(id, input);
  await audit({
    action: 'record.updated', actorId: req.user!.id, recordId: id, targetLabel: row.fullName,
    detail: Object.keys(input).join(', '), ip: req.ip,
  });
  const { registrar } = await svc.getRecord(id);
  res.json(svc.toDTO(row, registrar));
});

recordsRouter.post('/:id/verify', requirePermission('records:verify'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const row = await svc.setStatus(id, 'verified');
  await audit({ action: 'record.verified', actorId: req.user!.id, recordId: id, targetLabel: row.fullName, ip: req.ip });
  res.status(204).end();
});

/** Full ID is only ever returned here, to admins, and every reveal is audited. */
recordsRouter.post('/:id/reveal-id', requirePermission('records:revealId'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { record } = await svc.getRecord(id);
  await audit({ action: 'record.id_revealed', actorId: req.user!.id, recordId: id, targetLabel: record.fullName, ip: req.ip });
  res.set('Cache-Control', 'no-store').json({ nationalId: svc.revealNationalId(record) });
});

recordsRouter.get('/:id/photo', requirePermission('records:read'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { record } = await svc.getRecord(id);
  if (!record.photoPath) throw notFound('No photo');
  if (req.query.download) {
    await audit({ action: 'record.photo_downloaded', actorId: req.user!.id, recordId: id, targetLabel: record.fullName, ip: req.ip });
  }
  res.set('Cache-Control', 'private, no-store');
  res.sendFile(resolve(process.env.UPLOAD_DIR ?? './uploads', record.photoPath));
});

recordsRouter.post('/:id/share', requirePermission('share:create'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  const { ttl } = createShareSchema.parse(req.body);
  const { record } = await svc.getRecord(id);
  const link = await createShareLink(record.id, req.user!.id, ttl);
  await audit({
    action: 'share.created', actorId: req.user!.id, recordId: id,
    targetLabel: record.fullName, detail: `${ttl} expiry`, ip: req.ip,
  });
  res.status(201).json(link);
});

recordsRouter.get('/:id/history', requirePermission('records:read'), async (req, res) => {
  const { id } = idParam.parse(req.params);
  res.json(await listRecordHistory(id));
});
