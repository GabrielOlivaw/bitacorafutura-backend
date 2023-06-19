const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2')

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  tags: [
    {
      type: 'String'
    }
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    }
  ]
}, { timestamps: true })

blogSchema.plugin(mongoosePaginate)

blogSchema.pre('save', function (next) {
  // Non-repeating tags
  const tagsSet = new Set(this.tags.map(tag => tag.toLowerCase()))
  this.tags = Array.from(tagsSet)

  next();
})

blogSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
  }
})

module.exports = mongoose.model('Blog', blogSchema)
