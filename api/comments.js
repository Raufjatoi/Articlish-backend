// Serverless function for comments API
import { MongoClient, ObjectId } from 'mongodb';

// MongoDB connection string
const uri = process.env.MONGODB_URI || "mongodb+srv://raufpokemon00:Kh5XTOVNaPZ8ZW9M@cluster0.hplvo4f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "articlish";
const COMMENTS_COLLECTION = "comments";
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
  try {
    const db = await connectToDatabase();
    const commentsCollection = db.collection(COMMENTS_COLLECTION);
    const postsCollection = db.collection(POSTS_COLLECTION);
    const authorsCollection = db.collection(AUTHORS_COLLECTION);
    
    // GET - fetch comments with pagination
    if (req.method === 'GET') {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      
      const totalComments = await commentsCollection.countDocuments();
      
      const comments = await commentsCollection.aggregate([
        {
          $lookup: {
            from: 'authors',
            localField: 'authorId',
            foreignField: '_id',
            as: 'author'
          }
        },
        {
          $lookup: {
            from: 'posts',
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
      
      // Transform MongoDB _id to id for frontend
      const transformedComments = comments.map(comment => ({
        id: comment._id.toString(),
        content: comment.content,
        authorName: comment.author ? comment.author.name : 'Unknown',
        postId: comment.postId.toString(),
        postTitle: comment.post ? comment.post.title : 'Unknown Post',
        createdAt: comment.createdAt.toISOString()
      }));
      
      return res.status(200).json({
        comments: transformedComments,
        total: totalComments
      });
    }
    
    // POST - create a new comment
    if (req.method === 'POST') {
      const { content, authorId, postId } = JSON.parse(req.body);
      
      if (!content || !authorId || !postId) {
        return res.status(400).json({ error: 'Content, authorId, and postId are required' });
      }
      
      // Verify author exists
      const author = await authorsCollection.findOne({ _id: new ObjectId(authorId) });
      if (!author) {
        return res.status(404).json({ error: 'Author not found' });
      }
      
      // Verify post exists
      const post = await postsCollection.findOne({ _id: new ObjectId(postId) });
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
      
      await commentsCollection.insertOne(newComment);
      
      return res.status(201).json({
        id: newComment._id.toString(),
        content: newComment.content,
        authorName: author.name,
        postId: newComment.postId.toString(),
        postTitle: post.title,
        createdAt: newComment.createdAt.toISOString()
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in comments API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
