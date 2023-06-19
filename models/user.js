const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator') // Using older version due to a bug with _id field
const mongoosePaginate = require('mongoose-paginate-v2')
const validator = require('validator')
const { roles } = require('../utils/roles')

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 3,
    unique: true,
    uniqueCaseInsensitive: true
  },
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    uppercase: true,
    default: 'USER',
    validate: (r) => {  
      return !!roles.find((v) => v === r)
    }
  },
  roleSort: {
    type: Number,
    required: true,
    default: 0
  },
  email: {
    type: String,
    required: true,
    validate: {
      validator: (e) => validator.isEmail(e),
      message: props => `Value ${props.value} isn\'t a valid email.`
    }
  },
  blogs: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Blog'
    }
  ],
  comments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    }
  ]
}, { timestamps: true })

userSchema.plugin(uniqueValidator)
userSchema.plugin(mongoosePaginate)

userSchema.pre('save', function (next) {
  if (this.roleSort !== roles.indexOf(this.role)) {
    this.roleSort = roles.indexOf(this.role)
  }

  next();
})

userSchema.set('toJSON', {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString()
    delete returnedObject._id
    delete returnedObject.__v
    delete returnedObject.password
  }
})

module.exports = mongoose.model('User', userSchema)
