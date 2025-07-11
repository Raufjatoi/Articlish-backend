// Serverless function for authors API
import { MongoClient, ObjectId } from 'mongodb';

// MongoDB connection string
const uri = process.env.MONGODB_URI || "mongodb+srv://raufpokemon00:Kh5XTOVNaPZ8ZW9M@cluster0.hplvo4f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "articlish";
const COLLECTION = "authors";

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
    const collection = db.collection(COLLECTION);
    
    // GET - fetch all authors
    if (req.method === 'GET') {
      // Check if we need to get top authors
      if (req.url.includes('/top')) {
        const authors = await collection.aggregate([
          {
            $lookup: {
              from: 'posts',
              localField: '_id',
              foreignField: 'authorId',
              as: 'posts'
            }
          },
          {
            $lookup: {
              from: 'comments',
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
        
        // Transform MongoDB _id to id for frontend
        const transformedAuthors = authors.map(author => ({
          id: author._id.toString(),
          name: author.name,
          email: author.email,
          avatar: author.avatar || '',
          joinDate: author.joinDate.toISOString(),
          postCount: author.postCount || 0,
          commentCount: author.commentCount || 0
        }));
        
        return res.status(200).json(transformedAuthors);
      } else {
        const authors = await collection.find({}).toArray();
        
        // Transform MongoDB _id to id for frontend
        const transformedAuthors = authors.map(author => ({
          id: author._id.toString(),
          name: author.name,
          email: author.email,
          avatar: author.avatar || '',
          joinDate: author.joinDate.toISOString(),
          postCount: author.postCount || 0,
          commentCount: author.commentCount || 0
        }));
        
        return res.status(200).json(transformedAuthors);
      }
    }
    
    // POST - create a new author
    if (req.method === 'POST') {
      const { name, email, avatar } = JSON.parse(req.body);
      
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }
      
      const newAuthor = {
        _id: new ObjectId(),
        name,
        email,
        avatar: avatar || '',
        joinDate: new Date()
      };
      
      await collection.insertOne(newAuthor);
      
      return res.status(201).json({
        id: newAuthor._id.toString(),
        name: newAuthor.name,
        email: newAuthor.email,
        avatar: newAuthor.avatar,
        joinDate: newAuthor.joinDate.toISOString(),
        postCount: 0,
        commentCount: 0
      });
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in authors API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}


