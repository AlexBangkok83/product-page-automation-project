const DeploymentAutomation = require('../../utils/DeploymentAutomation');
const { exec } = require('child_process');
const fs = require('fs');
const util = require('util');

jest.mock('child_process');
jest.mock('fs');
jest.mock('util');

// Mock node-fetch
const mockFetch = jest.fn();
jest.mock('node-fetch', () => mockFetch);

describe('DeploymentAutomation', () => {
  let deployment;
  let mockStore;
  let mockExecAsync;

  beforeEach(() => {
    deployment = new DeploymentAutomation();
    mockStore = createMockStore({
      name: 'Test Store',
      domain: 'test.com',
      selected_pages: 'home,products'
    });

    // Setup exec mock
    mockExecAsync = jest.fn();
    util.promisify = jest.fn().mockReturnValue(mockExecAsync);
    
    // Default successful command responses
    mockExecAsync.mockImplementation((command) => {
      if (command.includes('--version')) return Promise.resolve({ stdout: 'v1.0.0' });
      if (command.includes('git rev-parse')) return Promise.resolve({ stdout: 'main' });
      if (command.includes('git config')) return Promise.resolve({ stdout: 'user@example.com' });
      if (command.includes('vercel project ls')) return Promise.resolve({ stdout: 'project-list' });
      if (command.includes('vercel --prod')) return Promise.resolve({ 
        stdout: 'Deployment complete\nhttps://project-abc123.vercel.app' 
      });
      return Promise.resolve({ stdout: 'success' });
    });

    // Setup fs mocks
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.writeFileSync = jest.fn();
    fs.readFileSync = jest.fn().mockReturnValue('{}');
    fs.mkdirSync = jest.fn();

    // Setup fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200
    });

    // Clear active deployments
    deployment.activeDeployments.clear();
    deployment.deploymentQueue.clear();
  });

  describe('Constructor', () => {
    test('should initialize with empty queues', () => {
      const newDeployment = new DeploymentAutomation();
      
      expect(newDeployment.deploymentQueue).toBeInstanceOf(Map);
      expect(newDeployment.activeDeployments).toBeInstanceOf(Set);
      expect(newDeployment.deploymentQueue.size).toBe(0);
      expect(newDeployment.activeDeployments.size).toBe(0);
    });
  });

  describe('validateDeploymentPrerequisites', () => {
    test('should validate all prerequisites successfully', async () => {
      process.cwd = jest.fn().mockReturnValue('/project');
      
      await expect(deployment.validateDeploymentPrerequisites()).resolves.toBeUndefined();
      
      expect(mockExecAsync).toHaveBeenCalledWith('node --version');
      expect(mockExecAsync).toHaveBeenCalledWith('git config --get user.name');
      expect(mockExecAsync).toHaveBeenCalledWith('git config --get user.email');
    });

    test('should create stores directory if missing', async () => {
      fs.existsSync.mockImplementation((path) => {
        return path !== 'stores'; // stores directory doesn't exist
      });

      await deployment.validateDeploymentPrerequisites();

      expect(fs.mkdirSync).toHaveBeenCalledWith('stores', { recursive: true });
    });

    test('should set default git config when not configured', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command.includes('git config --get')) {
          throw new Error('Not configured');
        }
        return Promise.resolve({ stdout: 'success' });
      });

      await deployment.validateDeploymentPrerequisites();

      expect(mockExecAsync).toHaveBeenCalledWith('git config user.name "Store Automation"');
      expect(mockExecAsync).toHaveBeenCalledWith('git config user.email "automation@stores.dev"');
    });

    test('should throw error when Node.js not found', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command.includes('node --version')) {
          throw new Error('Node not found');
        }
        return Promise.resolve({ stdout: 'success' });
      });

      await expect(deployment.validateDeploymentPrerequisites())
        .rejects.toThrow('Prerequisites not met: Node.js not found');
    });

    test('should throw error when no package.json found', async () => {
      fs.existsSync.mockImplementation((path) => path !== 'package.json');

      await expect(deployment.validateDeploymentPrerequisites())
        .rejects.toThrow('Prerequisites not met: No package.json found');
    });
  });

  describe('configureGitRepository', () => {
    test('should work with existing git repository', async () => {
      await deployment.configureGitRepository();

      expect(mockExecAsync).toHaveBeenCalledWith('git rev-parse --git-dir');
      expect(mockExecAsync).toHaveBeenCalledWith('git checkout main');
    });

    test('should initialize new git repository when needed', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git rev-parse --git-dir') {
          throw new Error('Not a git repository');
        }
        if (command === 'git rev-parse HEAD') {
          throw new Error('No commits yet');
        }
        return Promise.resolve({ stdout: 'success' });
      });

      fs.existsSync.mockReturnValue(false); // No README or .gitignore
      
      const createInitialCommitSpy = jest.spyOn(deployment, 'createInitialCommit')
        .mockResolvedValue();

      await deployment.configureGitRepository();

      expect(mockExecAsync).toHaveBeenCalledWith('git init');
      expect(createInitialCommitSpy).toHaveBeenCalled();
    });

    test('should create main branch when it does not exist', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git checkout main') {
          throw new Error('Branch does not exist');
        }
        return Promise.resolve({ stdout: 'success' });
      });

      await deployment.configureGitRepository();

      expect(mockExecAsync).toHaveBeenCalledWith('git checkout -b main');
    });
  });

  describe('createInitialCommit', () => {
    test('should create README and .gitignore files', async () => {
      fs.existsSync.mockReturnValue(false);

      await deployment.createInitialCommit();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        'README.md',
        expect.stringContaining('Multi-Store E-commerce Platform')
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '.gitignore',
        expect.stringContaining('node_modules/')
      );
      expect(mockExecAsync).toHaveBeenCalledWith('git add README.md .gitignore');
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('git commit -m')
      );
    });

    test('should skip file creation when files already exist', async () => {
      fs.existsSync.mockReturnValue(true);

      await deployment.createInitialCommit();

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('commitAndPushFiles', () => {
    test('should commit and push store files', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: 'stores/test.com/index.html' });
        }
        return Promise.resolve({ stdout: 'success' });
      });

      await deployment.commitAndPushFiles(mockStore);

      expect(mockExecAsync).toHaveBeenCalledWith('git add stores/');
      expect(mockExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('git commit -m')
      );
      expect(mockExecAsync).toHaveBeenCalledWith('git push origin main');
    });

    test('should skip commit when no changes staged', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git diff --cached --name-only') {
          return Promise.resolve({ stdout: '' }); // No changes
        }
        return Promise.resolve({ stdout: 'success' });
      });

      await deployment.commitAndPushFiles(mockStore);

      expect(mockExecAsync).toHaveBeenCalledWith('git add stores/');
      expect(mockExecAsync).not.toHaveBeenCalledWith(
        expect.stringContaining('git commit')
      );
    });

    test('should handle push failure with upstream fallback', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'git push origin main') {
          throw new Error('No upstream branch');
        }
        if (command === 'git push --set-upstream origin main') {
          return Promise.resolve({ stdout: 'success' });
        }
        return Promise.resolve({ stdout: 'success' });
      });

      await deployment.commitAndPushFiles(mockStore);

      expect(mockExecAsync).toHaveBeenCalledWith('git push --set-upstream origin main');
    });
  });

  describe('connectDomainToProject', () => {
    test('should add domain to Vercel project', async () => {
      await deployment.connectDomainToProject('test.com');

      expect(mockExecAsync).toHaveBeenCalledWith('vercel project ls', { timeout: 10000 });
      expect(mockExecAsync).toHaveBeenCalledWith('vercel domains add test.com --force', { timeout: 20000 });
      expect(mockExecAsync).toHaveBeenCalledWith('vercel domains inspect test.com', { timeout: 5000 });
    });

    test('should handle domain already exists scenario', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command.includes('vercel domains add')) {
          throw new Error('Domain already assigned to project');
        }
        return Promise.resolve({ stdout: 'success' });
      });

      const result = await deployment.connectDomainToProject('test.com');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Domain already exists in project');
    });

    test('should throw error for actual domain addition failures', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command.includes('vercel domains add')) {
          throw new Error('Invalid domain format');
        }
        return Promise.resolve({ stdout: 'success' });
      });

      await expect(deployment.connectDomainToProject('invalid-domain'))
        .rejects.toThrow('Domain addition failed: Invalid domain format');
    });
  });

  describe('triggerDeployment', () => {
    test('should execute Vercel deployment successfully', async () => {
      const result = await deployment.triggerDeployment(mockStore);

      expect(result.success).toBe(true);
      expect(result.method).toBe('vercel-cli-enhanced');
      expect(result.url).toBe('https://project-abc123.vercel.app');
      expect(result.domain).toBe('test.com');
    });

    test('should fallback to git-auto when CLI fails', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command.includes('vercel --prod')) {
          throw new Error('CLI deployment failed');
        }
        return Promise.resolve({ stdout: 'success' });
      });

      const result = await deployment.triggerDeployment(mockStore);

      expect(result.success).toBe(true);
      expect(result.method).toBe('git-auto-fallback');
      expect(result.message).toContain('automatically by Git push');
    });
  });

  describe('extractDeploymentUrl', () => {
    test('should extract URL from Vercel output', () => {
      const output = `
        Deploying project...
        https://project-abc123.vercel.app
        Deployment complete
      `;

      const url = deployment.extractDeploymentUrl(output);

      expect(url).toBe('https://project-abc123.vercel.app');
    });

    test('should return null when no URL found', () => {
      const output = 'Deployment failed - no URL';

      const url = deployment.extractDeploymentUrl(output);

      expect(url).toBeNull();
    });
  });

  describe('verifyDomainLive', () => {
    test('should verify domain is live on first attempt', async () => {
      const fetch = await import('node-fetch').then(mod => mod.default);
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      const isLive = await deployment.verifyDomainLive('test.com', 3, 1000);

      expect(isLive).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://test.com', {
        method: 'HEAD',
        timeout: 8000,
        headers: expect.objectContaining({
          'User-Agent': 'Store-Deployment-Verifier/1.0'
        }),
        redirect: 'follow'
      });
    });

    test('should retry verification on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('ENOTFOUND'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const isLive = await deployment.verifyDomainLive('test.com', 3, 100);

      expect(isLive).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    test('should return false after max attempts', async () => {
      mockFetch.mockRejectedValue(new Error('ENOTFOUND'));

      const isLive = await deployment.verifyDomainLive('test.com', 2, 100);

      expect(isLive).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    test('should handle non-200 responses gracefully', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404 });

      const isLive = await deployment.verifyDomainLive('test.com', 1, 100);

      expect(isLive).toBe(false);
    });
  });

  describe('configureVercelDeployment', () => {
    test('should create vercel.json with correct configuration', async () => {
      const expectedConfig = {
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

      await deployment.configureVercelDeployment();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('vercel.json'),
        JSON.stringify(expectedConfig, null, 2)
      );
    });

    test('should merge with existing vercel.json', async () => {
      const existingConfig = { version: 2, customField: 'value' };
      fs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));

      await deployment.configureVercelDeployment();

      const writtenConfig = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
      expect(writtenConfig.customField).toBe('value');
      expect(writtenConfig.git.deploymentEnabled.main).toBe(true);
    });
  });

  describe('executeCompleteDeployment', () => {
    test('should execute all deployment steps in order', async () => {
      const mockConnectDomain = jest.spyOn(deployment, 'connectDomainToProject').mockResolvedValue();
      const mockValidatePrereq = jest.spyOn(deployment, 'validateDeploymentPrerequisites').mockResolvedValue();
      const mockConfigureGit = jest.spyOn(deployment, 'configureGitRepository').mockResolvedValue();
      const mockCommitPush = jest.spyOn(deployment, 'commitAndPushFiles').mockResolvedValue();
      const mockConfigureVercel = jest.spyOn(deployment, 'configureVercelDeployment').mockResolvedValue();
      const mockTriggerDeploy = jest.spyOn(deployment, 'triggerDeployment').mockResolvedValue({
        success: true,
        url: 'https://test-deploy.vercel.app'
      });
      const mockCreateAlias = jest.spyOn(deployment, 'createDomainAlias').mockResolvedValue();
      const mockMonitor = jest.spyOn(deployment, 'monitorDeployment').mockResolvedValue();
      const mockVerifyLive = jest.spyOn(deployment, 'verifyDomainLive').mockResolvedValue(true);

      const result = await deployment.executeCompleteDeployment(mockStore);

      expect(result.success).toBe(true);
      expect(result.isLive).toBe(true);
      
      // Verify all functions were called
      expect(mockConnectDomain).toHaveBeenCalled();
      expect(mockValidatePrereq).toHaveBeenCalled();
      expect(mockConfigureGit).toHaveBeenCalled();
      expect(mockCommitPush).toHaveBeenCalled();
      expect(mockConfigureVercel).toHaveBeenCalled();
      expect(mockTriggerDeploy).toHaveBeenCalled();
    });

    test('should handle deployment failures and cleanup', async () => {
      jest.spyOn(deployment, 'connectDomainToProject').mockRejectedValue(
        new Error('Domain connection failed')
      );

      await expect(deployment.executeCompleteDeployment(mockStore))
        .rejects.toThrow('Domain connection failed');

      expect(deployment.activeDeployments.size).toBe(0); // Cleaned up
    });

    test('should track active deployments', async () => {
      const deploymentPromise = deployment.executeCompleteDeployment(mockStore);
      
      // Check that deployment is tracked while active
      expect(deployment.activeDeployments.size).toBe(1);
      
      await deploymentPromise;
      
      // Check that deployment is cleaned up after completion
      expect(deployment.activeDeployments.size).toBe(0);
    });
  });

  describe('monitorDeployment', () => {
    test('should verify deployment URL when available', async () => {
      const deploymentResult = {
        method: 'vercel-cli',
        url: 'https://test-deploy.vercel.app'
      };

      await deployment.monitorDeployment(deploymentResult, mockStore);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-deploy.vercel.app',
        expect.objectContaining({
          method: 'HEAD',
          timeout: 5000
        })
      );
    });

    test('should handle monitoring failures gracefully', async () => {
      const deploymentResult = {
        method: 'vercel-cli',
        url: 'https://test-deploy.vercel.app'
      };
      
      mockFetch.mockRejectedValue(new Error('Connection failed'));

      await expect(deployment.monitorDeployment(deploymentResult, mockStore))
        .resolves.toBeUndefined();
    });
  });

  describe('Deployment Status Management', () => {
    test('should track deployment status correctly', () => {
      const deploymentId = 'test-deployment-123';
      deployment.activeDeployments.add(deploymentId);

      const status = deployment.getDeploymentStatus(deploymentId);

      expect(status.isActive).toBe(true);
      expect(status.queuePosition).toBeNull();
    });

    test('should cancel deployment and cleanup', () => {
      const deploymentId = 'test-deployment-123';
      deployment.activeDeployments.add(deploymentId);
      deployment.deploymentQueue.set(deploymentId, {});

      deployment.cancelDeployment(deploymentId);

      expect(deployment.activeDeployments.has(deploymentId)).toBe(false);
      expect(deployment.deploymentQueue.has(deploymentId)).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    test('should handle Vercel CLI not available', async () => {
      mockExecAsync.mockImplementation((command) => {
        if (command === 'vercel --version') {
          throw new Error('Command not found: vercel');
        }
        return Promise.resolve({ stdout: 'success' });
      });

      const result = await deployment.triggerDeployment(mockStore);

      expect(result.method).toBe('git-auto-fallback');
      expect(result.success).toBe(true);
    });

    test('should handle network timeouts during verification', async () => {
      mockFetch.mockImplementation(() => {
        const error = new Error('timeout');
        error.code = 'ETIMEDOUT';
        throw error;
      });

      const isLive = await deployment.verifyDomainLive('test.com', 1, 100);

      expect(isLive).toBe(false);
    });

    test('should handle DNS resolution failures', async () => {
      mockFetch.mockImplementation(() => {
        const error = new Error('getaddrinfo ENOTFOUND');
        error.code = 'ENOTFOUND';
        throw error;
      });

      const isLive = await deployment.verifyDomainLive('test.com', 1, 100);

      expect(isLive).toBe(false);
    });
  });
});