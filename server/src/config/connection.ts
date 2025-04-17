import mongoose from 'mongoose';
import { MongoClient, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

// MongoDB Atlas connection URI
const uri = process.env.MONGODB_URI || "mongodb+srv://jmont23:thetester@cluster0.sxoiyua.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// For direct MongoDB operations if needed
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Connect using Mongoose for schema-based operations
mongoose.connect(uri);

// Log connection status
const dbConnection = mongoose.connection;

dbConnection.on('error', (err) => {
  console.error(`Mongoose connection error: ${err}`);
});

dbConnection.once('open', () => {
  console.log('Connected to MongoDB via Mongoose');
});

// Function to test direct MongoDB connection
export async function testMongoConnection() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    await client.close();
  }
}

export default dbConnection;