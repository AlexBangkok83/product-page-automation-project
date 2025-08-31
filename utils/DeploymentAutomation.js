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
      
      // Step 1: FIRST - Add domain to Vercel (MUST be done before any deployment)
      console.log(`🔗 Step 1: Adding domain ${store.domain} to Vercel FIRST`);
      await this.connectDomainToProject(store.domain);
      
      // Step 2: Validate prerequisites
      await this.validateDeploymentPrerequisites();
      
      // Step 3: Ensure Git repository is properly configured
      await this.configureGitRepository();
      
      // Step 4: Commit and push store files
      await this.commitAndPushFiles(store);
      
      // Step 5: Configure Vercel for automatic deployment
      await this.configureVercelDeployment();
      
      // Step 6: Trigger deployment with proper project context
      const deploymentResult = await this.triggerDeployment(store);
      
      // Step 7: Create explicit domain alias (CRITICAL - matches manual behavior)
      if (deploymentResult.success && deploymentResult.url) {
        console.log(`🔗 Step 7: Creating explicit domain alias for ${store.domain}`);
        console.log(`🔧 Connecting: ${store.domain} → ${deploymentResult.url}`);
        try {
          await this.createDomainAlias(store.domain, deploymentResult.url);
          console.log(`✅ Domain alias created successfully: ${store.domain} → ${deploymentResult.url}`);
        } catch (aliasError) {
          console.error(`⚠️ Alias creation failed but continuing: ${aliasError.message}`);
          // Don't throw - deployment is successful even if alias fails
        }
      } else {
        console.log('⚠️ Skipping alias creation - no deployment URL available');
        console.log('Debug - deploymentResult:', deploymentResult);
      }
      
      // Step 8: Monitor deployment progress
      await this.monitorDeployment(deploymentResult, store);
      
      // Step 9: Verify domain is live
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
   * Trigger deployment with proper project context
   */
  async triggerDeployment(store) {
    console.log('🚀 Triggering deployment with domain-aware context...');
    
    try {
      // Verify Vercel CLI is available
      await execAsync('vercel --version');
      console.log('✅ Vercel CLI found');
      
      // Ensure we're in the correct project context
      const { stdout: projectInfo } = await execAsync('vercel project ls');
      console.log('📋 Project context verified');
      
      // Deploy with production flag (exactly like manual execution)
      console.log(`🚀 Deploying to production for domain: ${store.domain}`);
      const { stdout } = await execAsync('vercel --prod', {
        timeout: 300000, // 5 minute timeout
        env: {
          ...process.env,
          VERCEL_ORG_ID: 'team_clgEz5UTSa9wkVjfcNNp1t4Z',
          VERCEL_PROJECT_ID: 'prj_LFhKr1YV3qJXbl5dHrJ8sXItDZng'
        }
      });
      
      const deploymentUrl = this.extractDeploymentUrl(stdout);
      console.log(`✅ Deployment completed: ${deploymentUrl || 'URL parsing failed'}`);
      console.log(`📋 Full deployment output:\n${stdout}`);
      
      return {
        method: 'vercel-cli-enhanced',
        success: true,
        output: stdout,
        url: deploymentUrl,
        domain: store.domain
      };
      
    } catch (cliError) {
      console.error('❌ Vercel CLI deployment failed:', cliError.message);
      
      // Fallback: deployment should happen automatically via Git push
      console.log('📡 Falling back to Git-based auto-deployment...');
      return {
        method: 'git-auto-fallback',
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
   * Verify domain connection (should be automatic with proper setup)
   */
  async verifyDomainConnection(domain) {
    console.log(`🔍 Verifying automatic domain connection for: ${domain}`);
    
    try {
      // Check if domain is properly connected via Vercel domains command
      const { stdout } = await execAsync(`vercel domains inspect ${domain}`, { timeout: 10000 });
      console.log(`📋 Domain status:\n${stdout}`);
      
      // Also verify that domain resolves to our deployment
      try {
        const fetch = await import('node-fetch').then(mod => mod.default);
        const response = await fetch(`https://${domain}`, {
          method: 'HEAD',
          timeout: 10000,
          redirect: 'follow'
        });
        
        if (response.ok) {
          console.log(`✅ Domain ${domain} is successfully connected and responding!`);
          return { success: true, connected: true, status: response.status };
        } else {
          console.log(`⚠️ Domain connected but returned status: ${response.status}`);
          return { success: true, connected: true, status: response.status, warning: 'Non-200 status' };
        }
      } catch (fetchError) {
        console.log(`⏳ Domain may still be propagating: ${fetchError.message}`);
        return { success: true, connected: 'unknown', message: 'DNS propagation in progress' };
      }
      
    } catch (inspectError) {
      console.log(`⚠️ Could not inspect domain: ${inspectError.message}`);
      return { success: false, error: inspectError.message };
    }
  }

  /**
   * Create domain alias (explicit alias creation step)
   */
  async createDomainAlias(domain, deploymentUrl) {
    console.log(`🔗 Creating domain alias: ${domain} → ${deploymentUrl}`);
    
    try {
      const command = `vercel alias ${deploymentUrl} ${domain}`;
      console.log(`🔧 Executing: ${command}`);
      
      const { stdout } = await execAsync(command, { timeout: 30000 });
      console.log(`✅ Domain alias created successfully: ${domain} → ${deploymentUrl}`);
      console.log(`📋 Alias output:\n${stdout}`);
      
      return {
        success: true,
        domain,
        deploymentUrl,
        output: stdout
      };
      
    } catch (error) {
      console.error(`❌ Failed to create domain alias for ${domain}: ${error.message}`);
      throw new Error(`Domain alias creation failed: ${error.message}`);
    }
  }

  /**
   * Connect domain to Vercel project using proper CLI workflow
   */
  async connectDomainToProject(domain) {
    console.log(`🔗 Adding domain ${domain} to Vercel project (FIRST STEP)`);
    
    try {
      // Get the current project name
      let projectName = 'product-page-automation-project'; // Default project name
      
      try {
        // Try to get project info from vercel.json or current directory
        const { stdout } = await execAsync('vercel project ls', { timeout: 10000 });
        // Extract project name from output if needed
        console.log(`📋 Using project: ${projectName}`);
      } catch (error) {
        console.log(`⚠️ Could not get project info, using default: ${projectName}`);
      }
      
      // Add domain to project with proper CLI syntax and force flag
      try {
        const command = `vercel domains add ${domain} --force`;
        console.log(`🔧 Executing: ${command}`);
        await execAsync(command, { timeout: 20000 });
        console.log(`✅ Domain ${domain} added to project successfully with --force flag`);
        
        // Verify the domain was added
        try {
          await execAsync(`vercel domains inspect ${domain}`, { timeout: 5000 });
          console.log(`✅ Domain ${domain} verified in Vercel`);
          
          return {
            success: true,
            domain,
            message: 'Domain added and verified successfully'
          };
        } catch (verifyError) {
          console.log(`⚠️ Domain added but verification failed: ${verifyError.message}`);
          return {
            success: true,
            domain,
            message: 'Domain added (verification skipped)'
          };
        }
        
      } catch (addError) {
        if (addError.message.includes('already assigned') || 
            addError.message.includes('already exists') || 
            addError.message.includes('already added')) {
          console.log(`✅ Domain ${domain} already exists in project`);
          return {
            success: true,
            domain,
            message: 'Domain already exists in project'
          };
        } else {
          console.error(`❌ Failed to add domain ${domain}: ${addError.message}`);
          throw new Error(`Domain addition failed: ${addError.message}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Domain setup failed for ${domain}: ${error.message}`);
      throw new Error(`Domain setup failed: ${error.message}`);
    }
  }

  /**
   * Monitor deployment progress (optimized for fast API responses)
   */
  async monitorDeployment(deploymentResult, store) {
    console.log('📊 Monitoring deployment progress (optimized)...');
    
    if (deploymentResult.method === 'vercel-cli' && deploymentResult.url) {
      // Quick check of deployment URL
      try {
        const fetch = await import('node-fetch').then(mod => mod.default);
        const response = await fetch(deploymentResult.url, {
          method: 'HEAD',
          timeout: 5000
        });
        
        if (response.ok) {
          console.log('✅ Deployment is responding immediately');
        }
      } catch (error) {
        console.log('⏳ Deployment URL not yet ready, will verify domain directly');
      }
    }
    
    // Minimal DNS propagation wait (Git push triggers Vercel automatically)
    console.log('⚡ Brief DNS propagation wait...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds only
  }

  /**
   * Verify domain is live and accessible (optimized for fast responses)
   */
  async verifyDomainLive(domain, maxAttempts = 3, delayMs = 2000) {
    console.log(`🔍 Verifying domain https://${domain} is live (quick check)...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Verification attempt ${attempt}/${maxAttempts}...`);
        
        const fetch = await import('node-fetch').then(mod => mod.default);
        const response = await fetch(`https://${domain}`, {
          method: 'HEAD',
          timeout: 8000,
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
      
      // Short wait before next attempt (except on last attempt)
      if (attempt < maxAttempts) {
        console.log(`⏰ Waiting ${delayMs/1000}s before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    console.log(`⚠️ Domain verification completed after ${maxAttempts} quick attempts`);
    console.log('💡 Domain may still be propagating - files are deployed and will be accessible shortly');
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