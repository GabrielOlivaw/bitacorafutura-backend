const Blog = require('../models/blog')
const Comment = require('../models/comment')

const initialBlogs = [
  {
    title: 'Books on magic',
    content: 'Lorem ipsum dolor sit amet magic.',
    createdAt: '2022-01-12T17:55:54.754Z',
    updatedAt: '2022-01-12T17:55:54.754Z'
  },
  {
    title: 'Roman archaeology',
    content: 'Lorem ipsum dolor sit amet roman.',
    createdAt: '2022-01-13T17:55:54.754Z',
    updatedAt: '2022-01-13T17:55:54.754Z'
  },
  {
    title: 'Alchemy guilds',
    content: 'Lorem ipsum dolor sit amet alchemy.',
    createdAt: '2022-01-14T17:55:54.754Z',
    updatedAt: '2022-01-14T17:55:54.754Z'
  },
  {
    title: 'Chinese theology',
    content: 'Lorem ipsum dolor sit amet theology.',
    createdAt: '2022-01-15T17:55:54.754Z',
    updatedAt: '2022-01-15T17:55:54.754Z'
  },
  {
    title: 'Maya sculptures',
    content: 'Lorem ipsum dolor sit amet maya.',
    createdAt: '2022-01-16T17:55:54.754Z',
    updatedAt: '2022-01-16T17:55:54.754Z'
  },
  {
    title: 'Meditation in antiquity',
    content: 'Lorem ipsum dolor sit amet meditation.',
    createdAt: '2022-01-17T17:55:54.754Z',
    updatedAt: '2022-01-17T17:55:54.754Z'
  },
]

const initialComments = [
  {
    comment: 'Comment n1',
    createdAt: '2022-02-01T17:55:54.754Z'
  },
  {
    comment: 'Comment n2',
    createdAt: '2022-02-02T17:55:54.754Z'
  },
  {
    comment: 'Comment n3',
    createdAt: '2022-02-03T17:55:54.754Z'
  },
  {
    comment: 'Comment n4',
    createdAt: '2022-02-04T17:55:54.754Z'
  },
  {
    comment: 'Comment n5',
    createdAt: '2022-02-05T17:55:54.754Z'
  },
  {
    comment: 'Comment n6',
    createdAt: '2022-02-06T17:55:54.754Z'
  },
]

const blogsDbJson = async () => {
  const blogs = await Blog.find({})
  return blogs.map(blog => blog.toJSON())
}

const commentsDbJson = async () => {
  const comments = await Comment.find({})
  return comments.map(comment => comment.toJSON())
}

module.exports = {
  initialBlogs, initialComments, blogsDbJson, commentsDbJson
}