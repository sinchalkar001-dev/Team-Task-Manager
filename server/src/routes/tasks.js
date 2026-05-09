const express = require('express');
const { body, param } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { Task } = require('../models/Task');
const { Project } = require('../models/Project');
const { User } = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../utils/validate');
const { HttpError } = require('../utils/httpError');

const router = express.Router();

const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').slice(0, 10);
      const name = `${req.params.id}-${req.user.id}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      cb(null, name);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = new Set([
      'application/pdf',
      'application/x-pdf',
      'application/zip',
      'application/x-zip-compressed',
      'image/png',
      'image/jpeg',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);

    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExt = new Set(['.pdf', '.zip', '.png', '.jpg', '.jpeg', '.txt', '.doc', '.docx']);

    if (allowedMime.has(file.mimetype)) return cb(null, true);

    // Some browsers/clients send unknown types as octet-stream; allow by extension only
    if (file.mimetype === 'application/octet-stream' && allowedExt.has(ext)) return cb(null, true);

    return cb(new HttpError(400, 'Unsupported file type'));
  },
});

async function loadTaskOrThrow(taskId) {
  const task = await Task.findById(taskId);
  if (!task) throw new HttpError(404, 'Task not found');
  return task;
}

async function loadProjectOrThrow(projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw new HttpError(404, 'Project not found');
  return project;
}

function ensureProjectMember(project, userId) {
  const isMember = project.members.some((m) => String(m) === String(userId));
  if (!isMember) throw new HttpError(403, 'Not a project member');
}

router.get(
  '/project/:projectId',
  requireAuth,
  [param('projectId').isMongoId()],
  validate,
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.projectId);
    ensureProjectMember(project, req.user.id);

    const tasks = await Task.find({ project: project._id })
      .sort({ createdAt: -1 })
      .select('title description status assignee dueDate createdBy submission completedAt createdAt updatedAt');

    res.json({ tasks });
  })
);

router.post(
  '/project/:projectId',
  requireAuth,
  requireRole('admin'),
  [
    param('projectId').isMongoId(),
    body('title').isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('assigneeId').optional({ nullable: true }).isMongoId(),
    body('assigneeEmail').optional().isEmail().normalizeEmail(),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body().custom((_value, { req }) => {
      const { assigneeId, assigneeEmail } = req.body;
      if (assigneeId && assigneeEmail) throw new Error('Provide only one of assigneeId or assigneeEmail');
      return true;
    }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.projectId);
    // Only project owner can create tasks
    if (String(project.owner) !== String(req.user.id)) throw new HttpError(403, 'Only project owner can create tasks');

    const { title, description, assigneeId, assigneeEmail, dueDate } = req.body;

    let assignee = null;
    if (assigneeId) {
      assignee = assigneeId;
    } else if (assigneeEmail) {
      const user = await User.findOne({ email: String(assigneeEmail).toLowerCase() });
      if (!user) throw new HttpError(404, 'Assignee not found');
      assignee = user._id;
    }

    if (assignee) {
      const isMember = project.members.some((m) => String(m) === String(assignee));
      if (!isMember) throw new HttpError(400, 'Assignee must be a project member');
    }

    const task = await Task.create({
      project: project._id,
      title,
      description: description || '',
      assignee,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: req.user.id,
    });

    res.status(201).json({ task });
  })
);

router.patch(
  '/:id',
  requireAuth,
  [
    param('id').isMongoId(),
    body('status').optional().isIn(['todo', 'in_progress', 'done']),
    body('title').optional().isString().trim().notEmpty(),
    body('description').optional().isString(),
    body('assigneeId').optional({ nullable: true }).isMongoId(),
    body('assigneeEmail').optional().isEmail().normalizeEmail(),
    body('dueDate').optional({ nullable: true }).isISO8601(),
    body().custom((_value, { req }) => {
      const { assigneeId, assigneeEmail } = req.body;
      if (assigneeId && assigneeEmail) throw new Error('Provide only one of assigneeId or assigneeEmail');
      return true;
    }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const task = await loadTaskOrThrow(req.params.id);
    const project = await loadProjectOrThrow(task.project);
    ensureProjectMember(project, req.user.id);

    const isOwnerAdmin = req.user.role === 'admin' && String(project.owner) === String(req.user.id);
    const isAssignee = task.assignee && String(task.assignee) === String(req.user.id);

    if (!isOwnerAdmin && !isAssignee) {
      throw new HttpError(403, 'Not allowed to update this task');
    }

    // Members can only update status on their assigned tasks
    if (!isOwnerAdmin) {
      if (!('status' in req.body)) throw new HttpError(400, 'Only status can be updated');
      task.status = req.body.status;
      await task.save();
      return res.json({ task });
    }

    // Owner-admin can update fields
    const { status, title, description, assigneeId, assigneeEmail, dueDate } = req.body;

    if (status !== undefined) task.status = status;
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;

    if (assigneeEmail !== undefined) {
      const user = await User.findOne({ email: String(assigneeEmail).toLowerCase() });
      if (!user) throw new HttpError(404, 'Assignee not found');
      const isMember = project.members.some((m) => String(m) === String(user._id));
      if (!isMember) throw new HttpError(400, 'Assignee must be a project member');
      task.assignee = user._id;
    } else if (assigneeId !== undefined) {
      if (assigneeId === null || assigneeId === '') {
        task.assignee = null;
      } else {
        const isMember = project.members.some((m) => String(m) === String(assigneeId));
        if (!isMember) throw new HttpError(400, 'Assignee must be a project member');
        task.assignee = assigneeId;
      }
    }

    if (dueDate !== undefined) {
      task.dueDate = dueDate ? new Date(dueDate) : null;
    }

    await task.save();
    return res.json({ task });
  })
);

// Member submission: upload a file and auto-complete the task
router.post(
  '/:id/submit',
  requireAuth,
  upload.single('file'),
  [param('id').isMongoId(), body('note').optional().isString().isLength({ max: 1000 })],
  validate,
  asyncHandler(async (req, res) => {
    const task = await loadTaskOrThrow(req.params.id);
    const project = await loadProjectOrThrow(task.project);
    ensureProjectMember(project, req.user.id);

    const isAssignee = task.assignee && String(task.assignee) === String(req.user.id);
    if (!isAssignee) throw new HttpError(403, 'Only the assignee can submit this task');

    if (!req.file) throw new HttpError(400, 'File is required');

    task.submission = {
      fileName: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      note: req.body.note || '',
      submittedBy: req.user.id,
      submittedAt: new Date(),
    };
    task.status = 'done';
    task.completedAt = new Date();

    await task.save();
    return res.json({ task });
  })
);

// Secure download for the current task's submission
router.get(
  '/:id/submission',
  requireAuth,
  [param('id').isMongoId()],
  validate,
  asyncHandler(async (req, res) => {
    const task = await loadTaskOrThrow(req.params.id);
    const project = await loadProjectOrThrow(task.project);
    ensureProjectMember(project, req.user.id);

    const isOwnerAdmin = req.user.role === 'admin' && String(project.owner) === String(req.user.id);
    const isAssignee = task.assignee && String(task.assignee) === String(req.user.id);

    if (!isOwnerAdmin && !isAssignee) throw new HttpError(403, 'Not allowed to download this submission');

    if (!task.submission || !task.submission.fileName) throw new HttpError(404, 'No submission for this task');

    const storageName = path.basename(task.submission.fileName);
    const filePath = path.join(uploadsDir, storageName);

    if (!fs.existsSync(filePath)) throw new HttpError(404, 'Submission file missing on server');

    res.setHeader('Content-Type', task.submission.mimeType || 'application/octet-stream');
    const original = task.submission.originalName || 'submission';
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(original)}"`);

    return fs.createReadStream(filePath).pipe(res);
  })
);

module.exports = { tasksRouter: router };

