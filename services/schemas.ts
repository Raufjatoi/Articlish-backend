// MongoDB schemas for our collections

// Author schema
export const authorSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "joinDate"],
      properties: {
        name: {
          bsonType: "string",
          description: "Author's name"
        },
        email: {
          bsonType: "string",
          description: "Author's email address"
        },
        avatar: {
          bsonType: "string",
          description: "URL to author's avatar image"
        },
        joinDate: {
          bsonType: "date",
          description: "Date when author joined"
        }
      }
    }
  }
};

// Post schema
export const postSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "content", "authorId", "createdAt"],
      properties: {
        title: {
          bsonType: "string",
          description: "Title of the post"
        },
        content: {
          bsonType: "string",
          description: "Content of the post"
        },
        authorId: {
          bsonType: "objectId",
          description: "Reference to the author"
        },
        createdAt: {
          bsonType: "date",
          description: "Date when post was created"
        },
        tags: {
          bsonType: "array",
          description: "Array of tags",
          items: {
            bsonType: "string"
          }
        }
      }
    }
  }
};

// Comment schema
export const commentSchema = {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["content", "authorId", "postId", "createdAt"],
      properties: {
        content: {
          bsonType: "string",
          description: "Content of the comment"
        },
        authorId: {
          bsonType: "objectId",
          description: "Reference to the author"
        },
        postId: {
          bsonType: "objectId",
          description: "Reference to the post"
        },
        createdAt: {
          bsonType: "date",
          description: "Date when comment was created"
        }
      }
    }
  }
};