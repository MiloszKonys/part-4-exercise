const _ = require('lodash');

const dummy = (blogs) => {
     return 1;
  }

const totalLikes = (blogs) => {
    return blogs.reduce((total, current) => total + current.likes, 0)
}

const favoriteBlog = (blogs) => {
    let likes = blogs.map(blog => blog.likes)
    let index = likes.indexOf(Math.max(...likes))
    return blogs[index]
}


const mostBlogs = (blogs) => {
    const grouped = _.groupBy(blogs, 'author');
    const blogAuthors = Object.keys(grouped);
    const blogsCount = Object.values(grouped).map((g) => g.length);
    const ind = blogsCount.indexOf(Math.max(...blogsCount));
    return blogs[0] ? { author: blogAuthors[ind], blogs: blogsCount[ind] } : [];
  };
  
const mostLikes = (blogs) => {
    const grouped = _.groupBy(blogs, 'author');
    const blogAuthors = Object.keys(grouped);
    const likesCount = Object.values(grouped).map((g) =>
      g.reduce((sum, item) => sum + item.likes, 0)
    );
    const ind = likesCount.indexOf(Math.max(...likesCount));
    return blogs[0] ? { author: blogAuthors[ind], likes: likesCount[ind] } : [];
  };


  
  module.exports = {
    dummy,
    totalLikes,
    favoriteBlog,
    mostBlogs,
    mostLikes
  }
  