import { MongoClient, ServerApiVersion } from 'mongodb';

// Replace with your MongoDB connection string
const uri = "mongodb+srv://raufpokemon00:Kh5XTOVNaPZ8ZW9M@cluster0.hplvo4f.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Database and collection names
export const DB_NAME = "articlish";
export const COLLECTIONS = {
  AUTHORS: "authors",
  POSTS: "posts",
  COMMENTS: "comments"
};

// Connect to MongoDB
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    return client.db(DB_NAME);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

// Get database instance
export async function getDb() {
  try {
    return client.db(DB_NAME);
  } catch (error) {
    console.error("Error getting database:", error);
    await connectToMongoDB();
    return client.db(DB_NAME);
  }
}

// Close connection
export async function closeConnection() {
  await client.close();
  console.log("MongoDB connection closed");
}