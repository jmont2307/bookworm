import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { typeDefs, resolvers } from './schemas/index.js';
import db, { testMongoConnection } from './config/connection.js';
import { authMiddleware } from './services/auth.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ES Modules compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set a default JWT secret key if one is not provided
if (!process.env.JWT_SECRET_KEY) {
  process.env.JWT_SECRET_KEY = 'temporarysecretkey';
  console.log('WARNING: Using temporary JWT secret key. Set JWT_SECRET_KEY in your environment for production.');
}

const app = express();
const PORT = process.env.PORT || 3001;

// Add health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', time: new Date().toISOString() });
});

// Debug routes and environment
if (process.env.DEBUG === 'true') {
  app.get('/debug', (_req, res) => {
    // Collect possible locations for client files
    const possibleClientPaths = [
      path.resolve(__dirname, '../../../client/dist'),
      path.resolve(process.cwd(), 'client/dist'),
      '/opt/render/project/src/client/dist',
      path.resolve(__dirname, '../public'),
      path.join(process.cwd(), 'server/dist/public'),
    ];
    
    // Create debug info object
    const debugInfo = {
      env: process.env.NODE_ENV,
      dirname: __dirname,
      cwd: process.cwd(),
      mongoUri: process.env.MONGODB_URI ? '[CONFIGURED]' : '[MISSING]',
      jwtSecret: process.env.JWT_SECRET_KEY ? '[CONFIGURED]' : '[MISSING]',
      possibleClientPaths
    };
    
    // Add dynamic properties for TypeScript
    const enhancedDebugInfo = debugInfo as any;
    
    // Check if client files exist in each location
    possibleClientPaths.forEach((clientPath, index) => {
      try {
        const clientIndex = path.join(clientPath, 'index.html');
        const indexExists = fs.existsSync(clientIndex);
        enhancedDebugInfo[`path${index}_exists`] = fs.existsSync(clientPath);
        enhancedDebugInfo[`path${index}_indexExists`] = indexExists;
        
        if (indexExists) {
          const stats = fs.statSync(clientIndex);
          enhancedDebugInfo[`path${index}_indexSize`] = stats.size;
          enhancedDebugInfo[`path${index}_indexModified`] = stats.mtime.toISOString();
        }
      } catch (error) {
        const err = error as Error;
        enhancedDebugInfo[`path${index}_error`] = err.message;
      }
    });
    
    // List directory contents
    try {
      enhancedDebugInfo['root_contents'] = fs.readdirSync(process.cwd());
      
      const renderRoot = '/opt/render/project/src';
      if (fs.existsSync(renderRoot)) {
        enhancedDebugInfo['render_root_exists'] = true;
        enhancedDebugInfo['render_root_contents'] = fs.readdirSync(renderRoot);
      } else {
        enhancedDebugInfo['render_root_exists'] = false;
      }
    } catch (error) {
      const err = error as Error;
      enhancedDebugInfo['list_error'] = err.message;
    }
    
    res.json(enhancedDebugInfo);
  });
}

// Basic middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Apollo Server setup
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Start the Apollo server
await server.start();

// Apply Apollo Server as middleware
app.use('/graphql', expressMiddleware(server, {
  context: authMiddleware
}));

// if we're in production, serve client/build as static assets
if (process.env.NODE_ENV === 'production') {
  // Try multiple possible paths for the client files
  let clientDistPath = '';
  const possiblePaths = [
    path.resolve(__dirname, '../../../client/dist'), // Local development path
    path.resolve(process.cwd(), 'client/dist'),     // Run from root directory
    '/opt/render/project/src/client/dist',         // Render's deployment path
    path.resolve(__dirname, '../public'),          // Copied client files in server/dist/public
    path.join(process.cwd(), 'server/dist/public'),// Alternative path for copied files
  ];
  
  // Find the first path that exists
  for (const pathToCheck of possiblePaths) {
    if (fs.existsSync(pathToCheck)) {
      clientDistPath = pathToCheck;
      console.log(`Found client dist directory at: ${clientDistPath}`);
      break;
    }
  }
  
  if (!clientDistPath) {
    console.error('Could not find client dist directory in any of the following locations:');
    possiblePaths.forEach(p => console.error(` - ${p}`));
    
    // Create a fake client path for serving static assets - this is a fallback
    clientDistPath = path.resolve(process.cwd(), 'client/dist');
    console.log(`Falling back to: ${clientDistPath}`);
  }
  
  // Serve static files from the client dist directory
  app.use(express.static(clientDistPath));
  
  // Handle all other routes - go to index.html if it exists
  app.get('*', (_req, res) => {
    const indexPath = path.join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Provide a basic HTML response if index.html is not found
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>BookWorm</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 1rem; }
            .container { background: #f5f5f5; border-radius: 8px; padding: 2rem; margin-top: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            h1 { color: #4a25aa; }
            a { color: #4a25aa; text-decoration: none; }
            a:hover { text-decoration: underline; }
            .btn { display: inline-block; background: #4a25aa; color: white; padding: 0.5rem 1rem; border-radius: 4px; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>BookWorm - Book Search Engine</h1>
            <p>The client application couldn't be loaded. Please check the application configuration.</p>
            <p>You can try the GraphQL API directly:</p>
            <a href="/graphql" class="btn">Open GraphQL Playground</a>
            <p>For debugging information, visit:</p>
            <a href="/debug">Debug Info</a>
          </div>
        </body>
        </html>
      `);
    }
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
    console.log(`📂 Server directory: ${__dirname}`);
    console.log(`📂 Current working directory: ${process.cwd()}`);
  });
});