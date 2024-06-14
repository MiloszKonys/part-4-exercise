const Blog= require('../models/blog')
const BlogsRouter = require('express').Router()
const User = require('../models/user')
const jwt = require('jsonwebtoken')



BlogsRouter.get('/', async (request, response) => {
	const blogs = await Blog.find({}).populate('user',{username: 1, name: 1, id: 1})
	response.json(blogs)
}) 

BlogsRouter.put('/:id', async (request, response) => {
  const body = request.body
      
  const blog = {
		title: body.title,
		author: body.author,
		url: body.url,
		likes: body.likes? body.likes : 0 ,
	}
      
  const updatedBlog = await Blog.findByIdAndUpdate(request.params.id, blog, { new: true })
  response.json(updatedBlog)
      })

  
BlogsRouter.post('/', async (request, response) => {
	const body = request.body

	const user = request.user

	if(!user){
		return response.status(401).json({ error: 'token missing or invalid' })  
	}

	const blog = new Blog({
		title: body.title,
		author: body.author,
		url: body.url,
		likes: body.likes? body.likes : 0,
		user: user.id
	})

	if(body.title === undefined || body.url === undefined){
		response.status(400).end()
	}else{
		const savedBlog = await blog.save() 
		user.blogs = user.blogs.concat(savedBlog._id)
		await user.save()   
		
		response.status(201).json(savedBlog)
	}  
})

  BlogsRouter.get('/:id', async (request, response) => {
    const blog = await Blog.findById(request.params.id)
    if (blog) {
      response.json(blog)
    } else {
      response.status(404).end()
    }
  })

  BlogsRouter.delete('/:id', async (request, response) => {
    const user = request.user
  
    if(!user){
      return response.status(401).json({ error: 'token missing or invalid' })  
    }
  
    const blog = await Blog.findById(request.params.id)
    if(blog.user.toString() === request.user.id){
      await Blog.findByIdAndDelete(request.params.id)
        response.status(204).end()
    }else{
      return response.status(401).json({ error: 'Unauthorized to delete the blog' })
    }
    })
  module.exports = BlogsRouter