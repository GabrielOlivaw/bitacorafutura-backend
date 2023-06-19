const mongoose = require('mongoose')

const userTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  token: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1200 // 20 minutes
  }
})

module.exports = mongoose.model('UserToken', userTokenSchema)
