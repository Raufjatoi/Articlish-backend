const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// MongoDB connection string - use environment variable for security
const uri = process.env.MONGODB_URI || "mongodb+srv://raufpokemon00:<db_password>@cluster0.hplvo4f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "articlish";
const COLLECTIONS = {
  AUTHORS: "authors",
  POSTS: "posts",
  COMMENTS: "comments"
};

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for now
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Database connection
let cachedDb = null;
async function connectToDatabase() {
  if (cachedDb) return cachedDb;
  
  try {
    // Add connection options to handle TLS issues
    const client = await MongoClient.connect(uri, {
      ssl: true,
      tls: true,
      tlsAllowInvalidCertificates: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    cachedDb = client.db(DB_NAME);
    console.log('Connected to MongoDB');
    return cachedDb;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

// Health check route
app.get('/', (req, res) => {
  res.status(200).send('Articlish API is running');
});

// Routes
// Authors API
app.get('/api/authors', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const authors = await db.collection(COLLECTIONS.AUTHORS).find({}).toArray();
    
    const transformedAuthors = authors.map(author => ({
      id: author._id.toString(),
      name: author.name,
      email: author.email,
      avatar: author.avatar || '',
      joinDate: author.joinDate.toISOString(),
      postCount: author.postCount || 0,
      commentCount: author.commentCount || 0
    }));
    
    res.json(transformedAuthors);
  } catch (error) {
    console.error('Error fetching authors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/authors/top', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const authors = await db.collection(COLLECTIONS.AUTHORS).aggregate([
      {
        $lookup: {
          from: COLLECTIONS.POSTS,
          localField: '_id',
          foreignField: 'authorId',
          as: 'posts'
        }
      },
      {
        $lookup: {
          from: COLLECTIONS.COMMENTS,
          localField: '_id',
          foreignField: 'authorId',
          as: 'comments'
        }
      },
      {
        $addFields: {
          postCount: { $size: '$posts' },
          commentCount: { $size: '$comments' }
        }
      },
      {
        $sort: { postCount: -1, commentCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          posts: 0,
          comments: 0
        }
      }
    ]).toArray();
    
    const transformedAuthors = authors.map(author => ({
      id: author._id.toString(),
      name: author.name,
      email: author.email,
      avatar: author.avatar || '',
      joinDate: author.joinDate.toISOString(),
      postCount: author.postCount || 0,
      commentCount: author.commentCount || 0
    }));
    
    res.json(transformedAuthors);
  } catch (error) {
    console.error('Error fetching top authors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/authors', async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }
    
    const db = await connectToDatabase();
    const newAuthor = {
      _id: new ObjectId(),
      name,
      email,
      avatar: avatar || '',
      joinDate: new Date()
    };
    
    await db.collection(COLLECTIONS.AUTHORS).insertOne(newAuthor);
    
    res.status(201).json({
      id: newAuthor._id.toString(),
      name: newAuthor.name,
      email: newAuthor.email,
      avatar: newAuthor.avatar,
      joinDate: newAuthor.joinDate.toISOString(),
      postCount: 0,
      commentCount: 0
    });
  } catch (error) {
    console.error('Error creating author:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Posts API
app.get('/api/posts', async (req, res) => {
  try {
    const sortBy = req.query.sortBy || 'newest';
    const db = await connectToDatabase();
    
    let posts;
    if (sortBy === 'mostCommented') {
      posts = await db.collection(COLLECTIONS.POSTS).aggregate([
        {
          $lookup: {
            from: COLLECTIONS.COMMENTS,
            localField: '_id',
            foreignField: 'postId',
            as: 'comments'
          }
        },
        {
          $lookup: {
            from: COLLECTIONS.AUTHORS,
            localField: 'authorId',
            foreignField: '_id',
            as: 'author'
          }
        },
        {
          $addFields: {
            commentCount: { $size: '$comments' },
            author: { $arrayElemAt: ['$author', 0] }
          }
        },
        {
          $sort: { commentCount: -1, createdAt: -1 }
        },
        {
          $project: {
            comments: 0
          }
        }
      ]).toArray();
    } else {
      posts = await db.collection(COLLECTIONS.POSTS).aggregate([
        {
          $lookup: {
            from: COLLECTIONS.COMMENTS,
            localField: '_id',
            foreignField: 'postId',
            as: 'comments'
          }
        },
        {
          $lookup: {
            from: COLLECTIONS.AUTHORS,
            localField: 'authorId',
            foreignField: '_id',
            as: 'author'
          }
        },
        {
          $addFields: {
            commentCount: { $size: '$comments' },
            author: { $arrayElemAt: ['$author', 0] }
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $project: {
            comments: 0
          }
        }
      ]).toArray();
    }
    
    const transformedPosts = posts.map(post => ({
      id: post._id.toString(),
      title: post.title,
      content: post.content,
      authorId: post.authorId.toString(),
      authorName: post.author ? post.author.name : 'Unknown',
      commentCount: post.commentCount,
      createdAt: post.createdAt.toISOString(),
      tags: post.tags || []
    }));
    
    res.json(transformedPosts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/posts/top-commented', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const posts = await db.collection(COLLECTIONS.POSTS).aggregate([
      {
        $lookup: {
          from: COLLECTIONS.COMMENTS,
          localField: '_id',
          foreignField: 'postId',
          as: 'comments'
        }
      },
      {
        $lookup: {
          from: COLLECTIONS.AUTHORS,
          localField: 'authorId',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $addFields: {
          commentCount: { $size: '$comments' },
          author: { $arrayElemAt: ['$author', 0] }
        }
      },
      {
        $sort: { commentCount: -1, createdAt: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          comments: 0
        }
      }
    ]).toArray();
    
    const transformedPosts = posts.map(post => ({
      id: post._id.toString(),
      title: post.title,
      content: post.content,
      authorId: post.authorId.toString(),
      authorName: post.author ? post.author.name : 'Unknown',
      commentCount: post.commentCount,
      createdAt: post.createdAt.toISOString(),
      tags: post.tags || []
    }));
    
    res.json(transformedPosts);
  } catch (error) {
    console.error('Error fetching top commented posts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, authorId, tags } = req.body;
    
    if (!title || !content || !authorId) {
      return res.status(400).json({ error: 'Title, content, and authorId are required' });
    }
    
    const db = await connectToDatabase();
    
    // Verify author exists
    const author = await db.collection(COLLECTIONS.AUTHORS).findOne({ _id: new ObjectId(authorId) });
    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }
    
    const newPost = {
      _id: new ObjectId(),
      title,
      content,
      authorId: new ObjectId(authorId),
      createdAt: new Date(),
      tags: tags || []
    };
    
    await db.collection(COLLECTIONS.POSTS).insertOne(newPost);
    
    res.status(201).json({
      id: newPost._id.toString(),
      title: newPost.title,
      content: newPost.content,
      authorId: newPost.authorId.toString(),
      authorName: author.name,
      commentCount: 0,
      createdAt: newPost.createdAt.toISOString(),
      tags: newPost.tags
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Comments API
app.get('/api/comments', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    const db = await connectToDatabase();
    
    const totalComments = await db.collection(COLLECTIONS.COMMENTS).countDocuments();
    
    const comments = await db.collection(COLLECTIONS.COMMENTS).aggregate([
      {
        $lookup: {
          from: COLLECTIONS.AUTHORS,
          localField: 'authorId',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $lookup: {
          from: COLLECTIONS.POSTS,
          localField: 'postId',
          foreignField: '_id',
          as: 'post'
        }
      },
      {
        $addFields: {
          author: { $arrayElemAt: ['$author', 0] },
          post: { $arrayElemAt: ['$post', 0] }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]).toArray();
    
    const transformedComments = comments.map(comment => ({
      id: comment._id.toString(),
      content: comment.content,
      authorName: comment.author ? comment.author.name : 'Unknown',
      postId: comment.postId.toString(),
      postTitle: comment.post ? comment.post.title : 'Unknown Post',
      createdAt: comment.createdAt.toISOString()
    }));
    
    res.json({
      comments: transformedComments,
      total: totalComments
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/comments', async (req, res) => {
  try {
    const { content, authorId, postId } = req.body;
    
    if (!content || !authorId || !postId) {
      return res.status(400).json({ error: 'Content, authorId, and postId are required' });
    }
    
    const db = await connectToDatabase();
    
    // Verify author exists
    const author = await db.collection(COLLECTIONS.AUTHORS).findOne({ _id: new ObjectId(authorId) });
    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }
    
    // Verify post exists
    const post = await db.collection(COLLECTIONS.POSTS).findOne({ _id: new ObjectId(postId) });
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    const newComment = {
      _id: new ObjectId(),
      content,
      authorId: new ObjectId(authorId),
      postId: new ObjectId(postId),
      createdAt: new Date()
    };
    
    await db.collection(COLLECTIONS.COMMENTS).insertOne(newComment);
    
    res.status(201).json({
      id: newComment._id.toString(),
      content: newComment.content,
      authorName: author.name,
      postId: newComment.postId.toString(),
      postTitle: post.title,
      createdAt: newComment.createdAt.toISOString()
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Stats API
app.get('/api/stats/monthly', async (req, res) => {
  try {
    const db = await connectToDatabase();
    
    // Get the last 6 months
    const months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
      
      // Format month name
      const monthName = month.toLocaleString('default', { month: 'short' });
      const year = month.getFullYear();
      const monthLabel = `${monthName} ${year}`;
      
      // Count posts for this month
      const postsCount = await db.collection(COLLECTIONS.POSTS).countDocuments({
        createdAt: {
          $gte: month,
          $lte: monthEnd
        }
      });
      
      // Count comments for this month
      const commentsCount = await db.collection(COLLECTIONS.COMMENTS).countDocuments({
        createdAt: {
          $gte: month,
          $lte: monthEnd
        }
      });
      
      // Count new authors for this month
      const authorsCount = await db.collection(COLLECTIONS.AUTHORS).countDocuments({
        joinDate: {
          $gte: month,
          $lte: monthEnd
        }
      });
      
      months.push({
        month: monthLabel,
        posts: postsCount,
        comments: commentsCount,
        authors: authorsCount
      });
    }
    
    res.json(months);
  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// For Vercel, we need to export the Express app
module.exports = app;

// Only start the server if we're running directly (not on Vercel)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

