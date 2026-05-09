const express = require('express');
const { body, param } = require('express-validator');

const { Project } = require('../models/Project');
const { User } = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/requireRole');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../utils/validate');
const { HttpError } = require('../utils/httpError');

const router = express.Router();

async function loadProjectOrThrow(projectId) {
  const project = await Project.findById(projectId);
  if (!project) throw new HttpError(404, 'Project not found');
  return project;
}

function ensureMember(project, userId) {
  const isMember = project.members.some((m) => String(m) === String(userId));
  if (!isMember) throw new HttpError(403, 'Not a project member');
}

function ensureOwner(project, userId) {
  if (String(project.owner) !== String(userId)) throw new HttpError(403, 'Only project owner can perform this action');
}

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const projects = await Project.find({ members: req.user.id })
      .sort({ createdAt: -1 })
      .select('name description owner members createdAt updatedAt');

    res.json({ projects });
  })
);

router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  [body('name').isString().trim().notEmpty(), body('description').optional().isString()],
  validate,
  asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const ownerId = req.user.id;

    const project = await Project.create({
      name,
      description: description || '',
      owner: ownerId,
      members: [ownerId],
    });

    res.status(201).json({ project });
  })
);

router.get(
  '/:id',
  requireAuth,
  [param('id').isMongoId()],
  validate,
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id);
    ensureMember(project, req.user.id);
    res.json({ project });
  })
);

router.post(
  '/:id/members',
  requireAuth,
  requireRole('admin'),
  [
    param('id').isMongoId(),
    body('userId').optional().isMongoId(),
    body('email').optional().isEmail().normalizeEmail(),
    body().custom((_value, { req }) => {
      const { userId, email } = req.body;
      if (!userId && !email) throw new Error('Provide userId or email');
      if (userId && email) throw new Error('Provide only one of userId or email');
      return true;
    }),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id);
    ensureOwner(project, req.user.id);

    let user;
    if (req.body.userId) {
      user = await User.findById(req.body.userId);
    } else {
      user = await User.findOne({ email: String(req.body.email).toLowerCase() });
    }

    if (!user) throw new HttpError(404, 'User not found');

    project.members.addToSet(user._id);
    await project.save();

    res.json({ project });
  })
);

router.delete(
  '/:id/members/:userId',
  requireAuth,
  requireRole('admin'),
  [param('id').isMongoId(), param('userId').isMongoId()],
  validate,
  asyncHandler(async (req, res) => {
    const project = await loadProjectOrThrow(req.params.id);
    ensureOwner(project, req.user.id);

    if (String(project.owner) === String(req.params.userId)) {
      throw new HttpError(400, 'Cannot remove project owner');
    }

    project.members = project.members.filter((m) => String(m) !== String(req.params.userId));
    await project.save();

    res.json({ project });
  })
);

module.exports = { projectsRouter: router, loadProjectOrThrow, ensureMember, ensureOwner };
