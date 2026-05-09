const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['todo', 'in_progress', 'done'], default: 'todo' },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dueDate: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // When a member submits a file, the task is auto-marked complete
    submission: {
      fileName: { type: String, default: null },
      originalName: { type: String, default: null },
      mimeType: { type: String, default: null },
      size: { type: Number, default: null },
      note: { type: String, default: '' },
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      submittedAt: { type: Date, default: null },
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignee: 1, status: 1 });

const Task = mongoose.model('Task', taskSchema);

module.exports = { Task };
