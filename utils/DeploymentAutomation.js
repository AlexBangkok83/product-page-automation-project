/**
 * Complete Deployment Automation System
 * Handles end-to-end automation from store creation to live domain
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const execAsync = util.promisify(exec);

class DeploymentAutomation {
  constructor() {
    this.deploymentQueue = new Map();
    this.activeDeployments = new Set();
  }

  /**
   * Complete automation workflow
   */
  async executeCompleteDeployment(store, options = {}) {
    const deploymentId = options.deploymentId || `deployment_${Date.now()}`;
    console.log(`🚀 Starting complete deployment automation for ${store.name} (ID: ${deploymentId})`);

    try {
      this.activeDeployments.add(deploymentId);
      
      // Step 1: Validate prerequisites
      await this.validateDeploymentPrerequisites();
      
      // Step 2: Ensure Git repository is properly configured
      await this.configureGitRepository();
      
      // Step 3: Commit and push store files
      await this.commitAndPushFiles(store);
      
      // Step 4: Configure Vercel for automatic deployment
      await this.configureVercelDeployment();
      
      // Step 5: Trigger deployment
      const deploymentResult = await this.triggerDeployment();
      
      // Step 6: Connect domain to project
      await this.connectDomainToProject(store.domain);
      
      // Step 6: Monitor deployment progress
      await this.monitorDeployment(deploymentResult, store);
      
      // Step 7: Verify domain is live
      const isLive = await this.verifyDomainLive(store.domain);
      
      console.log(`✅ Complete deployment automation finished for ${store.name}`);
      return {
        success: true,
        deploymentId,
        isLive,
        deploymentResult
      };
      
    } catch (error) {
      console.error(`❌ Deployment automation failed for ${store.name}:`, error.message);
      throw error;
    } finally {
      this.activeDeployments.delete(deploymentId);
    }
  }

  /**
   * Validate all prerequisites for deployment
   */
  async validateDeploymentPrerequisites() {
    console.log('🔍 Validating deployment prerequisites...');
    
    const checks = [];
    
    // Check Node.js version
    try {
      const { stdout } = await execAsync('node --version');
      console.log(`✅ Node.js version: ${stdout.trim()}`);
    } catch (error) {
      checks.push('Node.js not found');
    }
    
    // Check if we're in a project directory
    if (!fs.existsSync('package.json')) {
      checks.push('No package.json found - not in a project directory');
    }
    
    // Check if stores directory exists
    if (!fs.existsSync('stores')) {
      fs.mkdirSync('stores', { recursive: true });
      console.log('📁 Created stores directory');
    }
    
    // Check Git configuration
    try {
      await execAsync('git config --get user.name');
      await execAsync('git config --get user.email');
      console.log('✅ Git configuration found');
    } catch (error) {
      console.log('⚠️ Git not configured, will use default settings');
      // Set default git config if not set
      try {
        await execAsync('git config user.name "Store Automation"');
        await execAsync('git config user.email "automation@stores.dev"');
        console.log('✅ Default Git configuration applied');
      } catch (configError) {
        checks.push('Could not configure Git');
      }
    }
    
    if (checks.length > 0) {
      throw new Error(`Prerequisites not met: ${checks.join(', ')}`);
    }
    
    console.log('✅ All prerequisites validated');
  }

  /**
   * Configure Git repository for deployment
   */
  async configureGitRepository() {
    console.log('🔧 Configuring Git repository...');
    
    try {
      // Check if already a git repository
      await execAsync('git rev-parse --git-dir');
      console.log('✅ Git repository exists');
    } catch (error) {
      // Initialize git repository
      console.log('📦 Initializing Git repository...');
      await execAsync('git init');
      
      // Create initial commit if no commits exist
      try {
        await execAsync('git rev-parse HEAD');
      } catch (noCommitsError) {
        // Create initial commit
        await this.createInitialCommit();
      }
    }
    
    // Ensure we have a main branch
    try {
      await execAsync('git checkout main');
    } catch (error) {
      // Create main branch if it doesn't exist
      try {
        await execAsync('git checkout -b main');
        console.log('✅ Created main branch');
      } catch (branchError) {
        console.log('⚠️ Could not create main branch:', branchError.message);
      }
    }
    
    // Check for remote repository
    try {
      const { stdout } = await execAsync('git remote get-url origin');
      console.log(`✅ Remote repository: ${stdout.trim()}`);
    } catch (error) {
      console.log('⚠️ No remote repository configured - deployment will be local only');
    }
  }

  /**
   * Create initial commit for new repository
   */
  async createInitialCommit() {
    console.log('📝 Creating initial commit...');
    
    // Create a basic README if it doesn't exist
    if (!fs.existsSync('README.md')) {
      const readmeContent = `# Multi-Store E-commerce Platform

This repository contains automated store deployments.

## Generated Stores

Each store is automatically generated and deployed to its own domain.

---
🤖 Generated with Claude Code
`;
      fs.writeFileSync('README.md', readmeContent);
    }
    
    // Create .gitignore if it doesn't exist
    if (!fs.existsSync('.gitignore')) {
      const gitignoreContent = `node_modules/
.env
.DS_Store
*.log
.vercel
.vscode/
.idea/
`;
      fs.writeFileSync('.gitignore', gitignoreContent);
    }
    
    await execAsync('git add README.md .gitignore');
    await execAsync('git commit -m "feat: initial commit\n\n🤖 Generated with Claude Code\nCo-Authored-By: Claude <noreply@anthropic.com>"');
    console.log('✅ Initial commit created');
  }

  /**
   * Commit and push store files
   */
  async commitAndPushFiles(store) {
    console.log(`📦 Committing files for ${store.name}...`);
    
    try {
      // Add all files in the stores directory
      await execAsync('git add stores/');
      
      // Also add any configuration files that might have been updated
      await execAsync('git add vercel.json package.json || true');
      
      // Check if there are changes to commit
      try {
        const { stdout } = await execAsync('git diff --cached --name-only');
        if (!stdout.trim()) {
          console.log('✅ No changes to commit');
          return;
        }
      } catch (error) {
        // Continue with commit anyway
      }
      
      // Create commit message
      const commitMessage = `feat: deploy ${store.name} store

- Domain: ${store.domain}
- Pages: ${store.selected_pages || 'home,products'}
- Country: ${store.country}
- Currency: ${store.currency}

🚀 Auto-deployed via automation system

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>`;

      // Commit changes
      await execAsync(`git commit -m "${commitMessage}"`);
      console.log('✅ Changes committed');
      
      // Push to remote if it exists
      try {
        await execAsync('git push origin main');
        console.log('✅ Changes pushed to remote repository');
      } catch (pushError) {
        // Try with --set-upstream
        try {
          await execAsync('git push --set-upstream origin main');
          console.log('✅ Changes pushed with upstream set');
        } catch (upstreamError) {
          console.log('⚠️ Could not push to remote - will continue with local deployment');
        }
      }
      
    } catch (error) {
      console.error('❌ Git commit/push failed:', error.message);
      throw new Error(`Git automation failed: ${error.message}`);
    }
  }

  /**
   * Configure Vercel for automatic deployment
   */
  async configureVercelDeployment() {
    console.log('⚙️ Configuring Vercel deployment...');
    
    // Ensure vercel.json is properly configured
    const vercelConfig = {
      version: 2,
      functions: {
        "api/serverless.js": {
          maxDuration: 30
        }
      },
      routes: [
        {
          src: "/(.*)",
          dest: "/api/serverless.js"
        }
      ],
      env: {
        NODE_ENV: "production"
      },
      git: {
        deploymentEnabled: {
          main: true
        }
      }
    };
    
    // Write or update vercel.json
    const vercelPath = path.join(process.cwd(), 'vercel.json');
    const currentConfig = fs.existsSync(vercelPath) ? 
      JSON.parse(fs.readFileSync(vercelPath, 'utf8')) : {};
    
    const mergedConfig = { ...currentConfig, ...vercelConfig };
    fs.writeFileSync(vercelPath, JSON.stringify(mergedConfig, null, 2));
    console.log('✅ Vercel configuration updated');
  }

  /**
   * Trigger deployment
   */
  async triggerDeployment() {
    console.log('🚀 Triggering deployment...');
    
    try {
      // Try to use Vercel CLI if available
      await execAsync('vercel --version');
      console.log('✅ Vercel CLI found, triggering deployment...');
      
      const { stdout } = await execAsync('vercel --prod --yes', {
        timeout: 300000 // 5 minute timeout
      });
      
      const deploymentUrl = this.extractDeploymentUrl(stdout);
      console.log(`✅ Deployment triggered: ${deploymentUrl || 'URL not found in output'}`);
      
      return {
        method: 'vercel-cli',
        success: true,
        output: stdout,
        url: deploymentUrl
      };
      
    } catch (cliError) {
      console.log('⚠️ Vercel CLI not available or failed:', cliError.message);
      
      // Fallback: deployment should happen automatically via Git push
      console.log('📡 Relying on Git-based auto-deployment...');
      return {
        method: 'git-auto',
        success: true,
        message: 'Deployment will be triggered automatically by Git push'
      };
    }
  }

  /**
   * Extract deployment URL from Vercel output
   */
  extractDeploymentUrl(output) {
    const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app/);
    return urlMatch ? urlMatch[0] : null;
  }

  /**
   * Connect domain to Vercel project
   */
  async connectDomainToProject(domain) {
    console.log(`🔗 Connecting domain ${domain} to project...`);
    
    try {
      // Check if domain exists in Vercel
      try {
        await execAsync(`vercel domains inspect ${domain}`);
        console.log(`✅ Domain ${domain} exists in Vercel`);
      } catch (inspectError) {
        if (inspectError.message.includes('not found')) {
          console.log(`📋 Domain ${domain} not found in Vercel, adding it...`);
          // Add domain to Vercel account first
          await execAsync(`vercel domains buy ${domain} --confirm || vercel domains add ${domain} --external`);
          console.log(`✅ Domain ${domain} added to Vercel account`);
        } else {
          throw inspectError;
        }
      }
      
      // Add domain to current project
      const { stdout } = await execAsync(`vercel domains add ${domain}`);
      console.log(`✅ Domain ${domain} connected to project`);
      
      return {
        success: true,
        domain,
        message: 'Domain connected successfully'
      };
      
    } catch (error) {
      if (error.message.includes('already assigned')) {
        console.log(`✅ Domain ${domain} already connected to project`);
        return {
          success: true,
          domain,
          message: 'Domain already connected'
        };
      } else if (error.message.includes('not found')) {
        console.log(`⚠️ Domain ${domain} not found in Vercel - skipping connection`);
        console.log(`💡 Add domain manually: vercel domains add ${domain}`);
        return {
          success: false,
          domain,
          message: 'Domain not found in Vercel'
        };
      } else {
        console.error(`❌ Failed to connect domain ${domain}:`, error.message);
        return {
          success: false,
          domain,
          message: error.message
        };
      }
    }
  }

  /**
   * Monitor deployment progress
   */
  async monitorDeployment(deploymentResult, store, maxWaitTime = 300000) {
    console.log('📊 Monitoring deployment progress...');
    
    if (deploymentResult.method === 'vercel-cli' && deploymentResult.url) {
      // Monitor specific deployment
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime) {
        try {
          const fetch = await import('node-fetch').then(mod => mod.default);
          const response = await fetch(deploymentResult.url, {
            method: 'HEAD',
            timeout: 10000
          });
          
          if (response.ok) {
            console.log('✅ Deployment is responding');
            break;
          }
          
        } catch (error) {
          // Continue monitoring
        }
        
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      }
    }
    
    // Wait a bit for DNS propagation
    console.log('⏳ Waiting for DNS propagation...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
  }

  /**
   * Verify domain is live and accessible
   */
  async verifyDomainLive(domain, maxAttempts = 15, delayMs = 10000) {
    console.log(`🔍 Verifying domain https://${domain} is live...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Verification attempt ${attempt}/${maxAttempts}...`);
        
        const fetch = await import('node-fetch').then(mod => mod.default);
        const response = await fetch(`https://${domain}`, {
          method: 'HEAD',
          timeout: 15000,
          headers: {
            'User-Agent': 'Store-Deployment-Verifier/1.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          redirect: 'follow'
        });
        
        if (response.ok) {
          console.log(`✅ Domain is LIVE! Status: ${response.status}`);
          console.log(`🌍 Successfully verified: https://${domain}`);
          return true;
        } else {
          console.log(`⚠️ Domain responded with status: ${response.status}`);
        }
        
      } catch (error) {
        console.log(`⏳ Attempt ${attempt}: ${error.message}`);
        
        // Special handling for common deployment states
        if (error.message.includes('ENOTFOUND')) {
          console.log('📡 DNS not yet propagated...');
        } else if (error.message.includes('timeout')) {
          console.log('⏱️ Request timeout - server may be starting...');
        }
      }
      
      // Wait before next attempt (except on last attempt)
      if (attempt < maxAttempts) {
        console.log(`⏰ Waiting ${delayMs/1000}s before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.log(`⚠️ Domain verification timeout after ${maxAttempts} attempts`);
    console.log('💡 The domain may still be propagating or Vercel may need additional configuration');
    return false;
  }

  /**
   * Get deployment status
   */
  getDeploymentStatus(deploymentId) {
    return {
      isActive: this.activeDeployments.has(deploymentId),
      queuePosition: this.deploymentQueue.has(deploymentId) ? 
        Array.from(this.deploymentQueue.keys()).indexOf(deploymentId) + 1 : null
    };
  }

  /**
   * Cancel deployment
   */
  cancelDeployment(deploymentId) {
    this.activeDeployments.delete(deploymentId);
    this.deploymentQueue.delete(deploymentId);
    console.log(`❌ Deployment ${deploymentId} cancelled`);
  }
}

module.exports = DeploymentAutomation;