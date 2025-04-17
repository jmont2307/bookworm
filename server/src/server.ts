import express from 'express';
import path from 'node:path';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs, resolvers } from './schemas/index.js';
import db, { testMongoConnection } from './config/connection.js';
import { authMiddleware } from './services/auth.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set a default JWT secret key if one is not provided
if (!process.env.JWT_SECRET_KEY) {
  process.env.JWT_SECRET_KEY = 'temporarysecretkey';
  console.log('WARNING: Using temporary JWT secret key. Set JWT_SECRET_KEY in your environment for production.');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Start the Apollo server
await server.start();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Apply Apollo Server as middleware
app.use('/graphql', expressMiddleware(server, {
  context: authMiddleware
}));

// if we're in production, serve client/build as static assets
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  // Handle all other routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Test MongoDB connection in development
if (process.env.NODE_ENV !== 'production') {
  try {
    await testMongoConnection();
  } catch (error) {
    console.error('Failed to test MongoDB connection:', error);
  }
}

db.once('open', () => {
  app.listen(PORT, () => {
    console.log(`🌍 Server running on port ${PORT}`);
    console.log(`🚀 GraphQL at http://localhost:${PORT}/graphql`);
    console.log(`🔒 Authentication: ${process.env.JWT_SECRET_KEY === 'temporarysecretkey' ? 'Using default secret (not secure for production)' : 'Using custom secret'}`);
  });
});