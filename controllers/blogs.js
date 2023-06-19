const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const User = require('../models/user')
const Comment = require('../models/comment')
const { hasPermission } = require('../utils/roles')
const middleware = require('../utils/middleware')
const PermissionError = require('../utils/errors/PermissionError')
const UnknownResourceError = require('../utils/errors/UnknownResourceError')

// pagination
// https://www.bezkoder.com/node-js-mongodb-pagination/
blogsRouter.get('/', async (request, response) => {
  const paginationLimit = 5
  const paginationPage = request.query.page || 1

  const queryOptions = {
    limit: paginationLimit,
    offset: paginationLimit * (paginationPage - 1),
    sort: { createdAt: -1 },
    populate: {
      path: 'user',
      model: 'User',
      select: 'name'
    }
  }

  let blogFind = {}

  // Search parameter

  const blogSearch = request.query.search ? request.query.search.trim() : ''
  const blogTag = request.query.tag ? request.query.tag.trim() : ''

  if (blogSearch || blogTag) {
    blogFind.$and = []
    if (blogSearch) {
      blogFind.$and.push({ title: { $regex: new RegExp(`.*${blogSearch}.*`, 'i') } })
    }
    if (blogTag) {
      blogFind.$and.push({ tags: { $regex: new RegExp(`.*${blogTag}.*`, 'i') } })
    }
  }

  const blogs = await Blog.paginate(blogFind, queryOptions)

  // Shortening content field and omitting original one
  
  const blogsString = JSON.stringify(blogs)
  const blogsJson = JSON.parse(blogsString)

  const maxLengthContent = 400
  const blogsJsonShortened = blogsJson.docs.map(blog => {

    // Removing all html code generated in the frontend
    const shortenedContentNoHtml = blog.content.replace(/(<|&lt;)\/?[\w\s="\-:;\/\._?&]+(>|&gt;)/g, ' ')  

    const shortenedContent = shortenedContentNoHtml.length < maxLengthContent
      ? shortenedContentNoHtml
      : `${shortenedContentNoHtml.substring(0, maxLengthContent)}...`
    
    blog.shortenedContent = shortenedContent

    delete blog.content
    
    return blog
  })
  blogsJson.docs = blogsJsonShortened

  response.json(blogsJson)
})

blogsRouter.get('/:id', async (request, response) => {
  const blog = await Blog.findById(request.params.id).populate('user', {
    name: 1
  })

  if (!blog) {
    throw new UnknownResourceError(request.t('error-unknownresource'))
  }

  response.json(blog)
})

blogsRouter.post('/', middleware.userExtractor, async (request, response) => {
  const body = request.body
  
  const user = await User.findById(request.user)

  if (user.role && !hasPermission(user.role, 'AUTHOR')) {
    throw new PermissionError(request.t('blogs-error-permission-create'))
  }

  const blog = new Blog({
    title: body.title,
    content: body.content,
    tags: body.tags || [],
    user: user._id
  })

  const savedBlog = await blog.save()
  user.blogs = user.blogs.concat(savedBlog)
  await user.save()

  response.json(savedBlog)
})

blogsRouter.put('/:id', middleware.userExtractor, async (request, response) => {
  const body = request.body
  
  const blog = await Blog.findById(request.params.id)

  const user = await User.findById(request.user)

  if (!blog) {
    throw new UnknownResourceError(request.t('error-unknownresource'))
  }
  if (blog.user.toString() !== request.user && !hasPermission(user.role, 'ADMIN')) {
    throw new PermissionError(request.t('blogs-error-author-action-edit'))
  }

  if (body.title) blog.title = body.title
  if (body.content) blog.content = body.content.replace(/\[IMGREF/g, '<p><img').replace(/\/]/g, '/></p>')
  if (body.tags) blog.tags = body.tags
  
  await blog.save()

  response.json(blog)
})

blogsRouter.delete('/:id', middleware.userExtractor, async (request, response) => {

  const blog = await Blog.findById(request.params.id)

  const user = await User.findById(request.user)

  if (!blog) {
    throw new UnknownResourceError(request.t('error-unknownresource'))
  }
  if (blog.user.toString() !== request.user && !hasPermission(user.role, 'ADMIN')) {
    throw new PermissionError(request.t('blogs-error-author-action-delete'))
  }
  await blog.delete()
  response.status(204).end()
})
// https://chunkofcode.net/how-to-deep-populate-using-mongodb-and-mongoose/
// Comment population is done, check pagination of populated comments field?
// An easier option would be to query directly all the comments whose blog field is the one
blogsRouter.get('/:id/comments', async (request, response, next) => {
  
  const paginationLimit = 5
  const paginationPage = request.query.page || 1

  const queryOptions = {
    limit: paginationLimit,
    offset: paginationLimit * (paginationPage - 1),
    select: 'comment createdAt',
    populate: {
      path: 'user',
      model: 'User',
      select: 'name'
    },
    sort: { createdAt: -1 }
  }

  const comments = await Comment.paginate({ blog: request.params.id }, queryOptions)
  if (comments) {
    response.json(comments)
  }
  else {
    next()
  }
})

blogsRouter.post('/:id/comments', middleware.userExtractor, async (request, response) => {
  const body = request.body

  const blog = await Blog.findById(request.params.id)

  if (!blog) {
    throw new UnknownResourceError(request.t('error-unknownresource'))
  }
  const user = await User.findById(request.user)

  const comment = new Comment({
    comment: body.comment,
    user: user._id,
    blog: blog._id
  })

  const savedComment = await comment.save()
  blog.comments = blog.comments.concat(comment)
  await blog.save()
  user.comments = user.comments.concat(comment)
  await user.save()

  return response.json(savedComment)
})

blogsRouter.delete('/:id/comments/:commentid', middleware.userExtractor, async (request, response) => {

  const blog = await Blog.findById(request.params.id)

  const comment = await Comment.findById(request.params.commentid)

  const user = await User.findById(request.user)

  if (!blog || !comment) {
    throw new UnknownResourceError(request.t('error-unknownresource'))
  }
  if (!hasPermission(user.role, 'ADMIN')) {
    throw new PermissionError(request.t('blogs-error-comment-delete'))
  }
  await comment.delete()
  response.status(204).end()
})

module.exports = blogsRouter
