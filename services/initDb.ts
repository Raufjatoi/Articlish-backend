import { ObjectId } from 'mongodb';
import { connectToMongoDB, COLLECTIONS, closeConnection } from './mongodb';
import { authorSchema, postSchema, commentSchema } from './schemas';

// Sample data for initialization
const sampleAuthors = [
  {
    _id: new ObjectId(),
    name: "Abdul Rauf Jatoi",
    email: "raufpokemon00@gmail.com",
    avatar: "rauf.png",
    joinDate: new Date("2025-08-7")
  },
  {
    _id: new ObjectId(),
    name: "Muhammad Ahsan",
    email: "ahsan@example.com",
    avatar: "",
    joinDate: new Date("2024-02-20")
  },
  {
    _id: new ObjectId(),
    name: "Muhammad Umar",
    email: "umar@gmail.com",
    avatar: "",
    joinDate: new Date("2024-03-10")
  },
  {
    _id: new ObjectId(),
    name: "Mudassir Junejo",
    email: "mudassir@gmail.com",
    avatar: "",
    joinDate: new Date("2023-04-05")
  },
  {
    _id: new ObjectId(),
    name: "Najaf Alkhani",
    email: "najaf@gmail.com",
    avatar: "",
    joinDate: new Date("2023-05-12")
  }
];

// Generate sample posts
const generateSamplePosts = () => {
  const posts = [];
  const topics = ["MongoDB", "React", "TypeScript", "Node.js", "Express", "Next.js", "TailwindCSS"];
  
  for (let i = 0; i < 20; i++) {
    const authorIndex = Math.floor(Math.random() * sampleAuthors.length);
    const date = new Date();
    date.setMonth(date.getMonth() - Math.floor(Math.random() * 6));
    
    const randomTags = [];
    const numTags = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numTags; j++) {
      const tag = topics[Math.floor(Math.random() * topics.length)];
      if (!randomTags.includes(tag)) {
        randomTags.push(tag);
      }
    }
    
    posts.push({
      _id: new ObjectId(),
      title: `${topics[Math.floor(Math.random() * topics.length)]} Tutorial ${i + 1}`,
      content: `This is a sample post about ${randomTags.join(", ")}. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
      authorId: sampleAuthors[authorIndex]._id,
      createdAt: date,
      tags: randomTags
    });
  }
  
  return posts;
};

// Generate sample comments
const generateSampleComments = (posts) => {
  const comments = [];
  const commentTexts = [
    "Great post! Thanks for sharing.",
    "I learned a lot from this article.",
    "Could you explain more about this topic?",
    "I disagree with some points, but overall good content.",
    "Looking forward to more posts like this!",
    "This helped me solve a problem I was having.",
    "Interesting perspective on this topic."
  ];
  
  for (let i = 0; i < 50; i++) {
    const postIndex = Math.floor(Math.random() * posts.length);
    const authorIndex = Math.floor(Math.random() * sampleAuthors.length);
    const date = new Date(posts[postIndex].createdAt);
    date.setDate(date.getDate() + Math.floor(Math.random() * 10) + 1);
    
    comments.push({
      _id: new ObjectId(),
      content: commentTexts[Math.floor(Math.random() * commentTexts.length)],
      authorId: sampleAuthors[authorIndex]._id,
      postId: posts[postIndex]._id,
      createdAt: date
    });
  }
  
  return comments;
};

// Initialize database with sample data
export async function initializeDatabase() {
  let db;
  try {
    db = await connectToMongoDB();
    
    // Create collections with validation
    if (!(await db.listCollections({ name: COLLECTIONS.AUTHORS }).hasNext())) {
      await db.createCollection(COLLECTIONS.AUTHORS, authorSchema);
      console.log("Created authors collection");
    }
    
    if (!(await db.listCollections({ name: COLLECTIONS.POSTS }).hasNext())) {
      await db.createCollection(COLLECTIONS.POSTS, postSchema);
      console.log("Created posts collection");
    }
    
    if (!(await db.listCollections({ name: COLLECTIONS.COMMENTS }).hasNext())) {
      await db.createCollection(COLLECTIONS.COMMENTS, commentSchema);
      console.log("Created comments collection");
    }
    
    // Check if collections are empty
    const authorsCount = await db.collection(COLLECTIONS.AUTHORS).countDocuments();
    const postsCount = await db.collection(COLLECTIONS.POSTS).countDocuments();
    const commentsCount = await db.collection(COLLECTIONS.COMMENTS).countDocuments();
    
    if (authorsCount === 0) {
      await db.collection(COLLECTIONS.AUTHORS).insertMany(sampleAuthors);
      console.log("Inserted sample authors");
    }
    
    if (postsCount === 0) {
      const samplePosts = generateSamplePosts();
      await db.collection(COLLECTIONS.POSTS).insertMany(samplePosts);
      console.log("Inserted sample posts");
      
      if (commentsCount === 0) {
        const sampleComments = generateSampleComments(samplePosts);
        await db.collection(COLLECTIONS.COMMENTS).insertMany(sampleComments);
        console.log("Inserted sample comments");
      }
    }
    
    console.log("Database initialization complete");
  } catch (error) {
    console.error("Error initializing database:", error);
  } finally {
    if (db) {
      await closeConnection();
    }
  }
}

// Run this script directly to initialize the database
if (require.main === module) {
  initializeDatabase().then(() => {
    console.log("Database initialization script completed");
    process.exit(0);
  }).catch(err => {
    console.error("Database initialization failed:", err);
    process.exit(1);
  });
}