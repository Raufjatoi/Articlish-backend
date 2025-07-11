// Serverless function for posts API
import { MongoClient, ObjectId } from 'mongodb';

// MongoDB connection string
const uri = "mongodb+srv://raufpokemon00:Kh5XTOVNaPZ8ZW9M@cluster0.hplvo4f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "articlish";
const POSTS_COLLECTION = "posts";
const AUTHORS_COLLECTION = "authors";

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  
  const client = await MongoClient.connect(uri);
  const db = client.db(DB_NAME);
  cachedDb = db;
  return db;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await connectToDatabase();
    const postsCollection = db.collection(POSTS_COLLECTION);
    const authorsCollection = db.collection(AUTHORS_COLLECTION);
    
    // GET - fetch all posts
    if (req.method === 'GET') {
      const sortBy = req.query.sortBy || 'newest';
      
      let posts = await postsCollection.find({}).toArray();
      
      // Get author names
      const authorIds = [...new Set(posts.map(post => post.authorId))];
      const authors = await authorsCollection.find({ 
        _id: { $in: authorIds.map(id => new ObjectId(id)) } 
      }).toArray();
      
      const authorMap = {};
      authors.forEach(author => {
        authorMap[author._id.toString()] = author.name;
      });
      
      // Transform MongoDB _id to id for frontend
      const transformedPosts = posts.map(post => ({
        id: post._id.toString(),
        title: post.title,
        content: post.content,
        authorId: post.authorId.toString(),
        authorName: authorMap[post.authorId.toString()] || 'Unknown Author',
        commentCount: post.commentCount || 0,
        createdAt: post.createdAt.toISOString(),
        tags: post.tags || []
      }));
      
      // Sort posts
      if (sortBy === 'newest') {
        transformedPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      } else if (sortBy === 'mostCommented') {
        transformedPosts.sort((a, b) => {
          if (b.commentCount !== a.commentCount) {
            return b.commentCount - a.commentCount;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
      }
      
      return res.status(200).json(transformedPosts);
    }
    
    // POST - create new post
    if (req.method === 'POST') {
      const { title, content, authorId, tags } = JSON.parse(req.body);
      
      if (!title || !content || !authorId) {
        return res.status(400).json({ error: 'Title, content, and authorId are required' });
      }
      
      // Verify author exists
      const author = await authorsCollection.findOne({ _id: new ObjectId(authorId) });
      if (!author) {
        return res.status(404).json({ error: 'Author not found' });
      }
      
      const newPost = {
        title,
        content,
        authorId: new ObjectId(authorId),
        createdAt: new Date(),
        commentCount: 0,
        tags: tags || []
      };
      
      const result = await postsCollection.insertOne(newPost);
      
      // Update author's post count
      await authorsCollection.updateOne(
        { _id: new ObjectId(authorId) },
        { $inc: { postCount: 1 } }
      );
      
      return res.status(201).json({
        id: result.insertedId.toString(),
        ...newPost,
        authorId: authorId,
        authorName: author.name,
        createdAt: newPost.createdAt.toISOString()
      });
    }
    
    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
