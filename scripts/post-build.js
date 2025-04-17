import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root directory
const projectRoot = path.resolve(__dirname, '..');

console.log('📦 Running post-build tasks...');

// Define key directories
const serverDistDir = path.join(projectRoot, 'server', 'dist');
const clientDistDir = path.join(projectRoot, 'client', 'dist');
const serverPublicDir = path.join(serverDistDir, 'public');

// Create public directory in server/dist if it doesn't exist
if (!fs.existsSync(serverPublicDir)) {
  console.log(`Creating directory: ${serverPublicDir}`);
  fs.mkdirSync(serverPublicDir, { recursive: true });
}

// Copy client dist files to server public directory
if (fs.existsSync(clientDistDir)) {
  console.log(`Copying client files from ${clientDistDir} to ${serverPublicDir}`);
  
  // Read all files from client/dist
  const clientFiles = fs.readdirSync(clientDistDir);
  
  // Copy each file
  clientFiles.forEach(file => {
    const srcPath = path.join(clientDistDir, file);
    const destPath = path.join(serverPublicDir, file);
    
    // Check if it's a directory
    if (fs.statSync(srcPath).isDirectory()) {
      // Create destination directory
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      
      // Copy entire directory
      copyDirectory(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${file}`);
    }
  });
  
  console.log('✅ Client files copied successfully');
} else {
  console.error(`❌ Client dist directory not found: ${clientDistDir}`);
}

// Function to recursively copy a directory
function copyDirectory(source, destination) {
  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const srcPath = path.join(source, file);
    const destPath = path.join(destination, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      // Create destination directory
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      
      // Recursively copy subdirectory
      copyDirectory(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
    }
  });
}