// Serverless function for stats API
import { MongoClient } from 'mongodb';

// MongoDB connection string
const uri = process.env.MONGODB_URI || "mongodb+srv://raufpokemon00:Kh5XTOVNaPZ8ZW9M@cluster0.hplvo4f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const DB_NAME = "articlish";
const POSTS_COLLECTION = "posts";
const COMMENTS_COLLECTION = "comments";
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
    const postsCollection = db.collection(POSTS_COLLECTION);
    const commentsCollection = db.collection(COMMENTS_COLLECTION);
    const authorsCollection = db.collection(AUTHORS_COLLECTION);
    
    // GET - fetch monthly stats
    if (req.method === 'GET' && req.url.includes('/monthly')) {
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
        const postsCount = await postsCollection.countDocuments({
          createdAt: {
            $gte: month,
            $lte: monthEnd
          }
        });
        
        // Count comments for this month
        const commentsCount = await commentsCollection.countDocuments({
          createdAt: {
            $gte: month,
            $lte: monthEnd
          }
        });
        
        // Count new authors for this month
        const authorsCount = await authorsCollection.countDocuments({
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
      
      return res.status(200).json(months);
    }
    
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in stats API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
