const express = require('express');

const { Task } = require('../models/Task');
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const tasks = await Task.find({ assignee: req.user.id })
      .sort({ dueDate: 1, createdAt: -1 })
      .select('title status dueDate project createdAt updatedAt');

    const counts = { todo: 0, in_progress: 0, done: 0 };
    const now = new Date();

    const overdue = [];

    for (const t of tasks) {
      counts[t.status] = (counts[t.status] || 0) + 1;
      if (t.dueDate && t.status !== 'done' && t.dueDate < now) overdue.push(t);
    }

    res.json({
      counts,
      total: tasks.length,
      overdue,
      tasks,
    });
  })
);

module.exports = { dashboardRouter: router };
