const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

projectSchema.index({ owner: 1 });
projectSchema.index({ members: 1 });

const Project = mongoose.model('Project', projectSchema);

module.exports = { Project };
