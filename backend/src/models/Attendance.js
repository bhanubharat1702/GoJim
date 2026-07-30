const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  member: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'roleModel'
  },
  roleModel: {
    type: String,
    required: true,
    enum: ['Member', 'Trainer', 'Staff'],
    default: 'Member'
  },
  checkInTime: {
    type: Date,
    default: Date.now
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  date: {
    type: String, // YYYY-MM-DD format for easy querying
    required: true
  },
  markedBy: {
    type: String,
    enum: ['self', 'staff', 'trainer'],
    default: 'self'
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    default: 'present'
  },
  gymOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Single robust unique index for daily attendance per person
attendanceSchema.index({ gymOwner: 1, member: 1, date: 1 }, { unique: true });
attendanceSchema.index({ gymOwner: 1, date: 1 });
attendanceSchema.index({ gymOwner: 1, date: -1, checkInTime: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
