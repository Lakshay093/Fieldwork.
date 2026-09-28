import { Router } from 'express';
import { requireRole } from '../services/auth.js';
import {
  applyLeave,
  cancelLeave,
  decideLeave,
  managerList,
  mine,
  preview,
} from '../services/leaves.js';
import {
  decisionInput,
  idInput,
  leaveInput,
  previewInput,
  rejectionInput,
} from '../utils/validation.js';

export function leaveRoutes(now = () => new Date()) {
  const router = Router();
  const employee = requireRole('employee');
  const manager = requireRole('manager');
  router.post('/', employee, async (req, res) =>
    res.status(201).json({
      leave: await applyLeave(req.user, leaveInput.parse(req.body), now()),
    }),
  );
  router.get('/mine', async (req, res) => res.json(await mine(req.user)));
  router.get('/preview', employee, async (req, res) => {
    const input = previewInput.parse(req.query);
    res.json(
      await preview(
        req.user,
        { type: input.type, startDate: input.start, endDate: input.end },
        now(),
      ),
    );
  });
  router.get('/pending', manager, async (req, res) =>
    res.json({ leaves: await managerList(req.user) }),
  );
  router.get('/decisions', manager, async (req, res) =>
    res.json({ leaves: await managerList(req.user, true) }),
  );
  router.patch('/:id/cancel', employee, async (req, res) =>
    res.json({
      leave: await cancelLeave(req.user, idInput.parse(req.params.id), now()),
    }),
  );
  router.patch('/:id/approve', manager, async (req, res) => {
    const input = decisionInput.parse(req.body ?? {});
    res.json({
      leave: await decideLeave(
        req.user,
        idInput.parse(req.params.id),
        'approved',
        input.comment,
        now(),
      ),
    });
  });
  router.patch('/:id/reject', manager, async (req, res) => {
    const input = rejectionInput.parse(req.body);
    res.json({
      leave: await decideLeave(
        req.user,
        idInput.parse(req.params.id),
        'rejected',
        input.comment,
        now(),
      ),
    });
  });
  return router;
}
