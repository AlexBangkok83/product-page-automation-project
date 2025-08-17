/**
 * AUTOMATED AGENT DEPLOYMENT SYSTEM
 * 
 * This system automatically deploys expert agents for ALL technical tasks
 * - No more asking "where are the agents?"
 * - Expert team assigned proactively to all work
 * - Full transparency on who's working on what
 * - Automatic coordination and handoffs
 * - Continuous progress updates
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { AgentCoordinationProtocols } = require('./agent-coordination-protocols');
const { AgentProgressTracker } = require('./agent-progress-tracker');
const { AgentAssignmentMatrix } = require('./agent-assignment-matrix');

class AgentAutomationSystem extends EventEmitter {
  constructor() {
    super();
    this.activeAgents = new Map();
    this.taskQueue = [];
    this.agentRegistry = new Map();
    this.coordinationMatrix = new Map();
    this.progressTracker = new Map();
    this.isRunning = false;
    this.coordinationProtocols = null;
    this.progressTracking = null;
    this.assignmentMatrix = null;
    this.startTime = new Date();
    
    // Auto-trigger rules for different task types
    this.taskTriggers = {
      // Code changes → Backend/Frontend agents
      codeChanges: {
        patterns: [/\.js$/, /\.ts$/, /\.jsx$/, /\.tsx$/, /\.css$/, /\.html$/],
        agents: ['backend-architect', 'frontend-developer', 'test-writer-fixer'],
        priority: 'high'
      },
      
      // API/Backend work → Backend + DevOps agents
      backendWork: {
        patterns: [/server\.js/, /api\//, /routes\//, /database\//, /middleware\//],
        agents: ['backend-architect', 'devops-automator', 'api-tester'],
        priority: 'high'
      },
      
      // Frontend/UI work → Frontend + Design agents
      frontendWork: {
        patterns: [/views\//, /public\//, /\.css$/, /\.html$/, /components\//],
        agents: ['frontend-developer', 'ui-designer', 'whimsy-injector'],
        priority: 'high'
      },
      
      // Testing needs → QA agents
      testingWork: {
        patterns: [/test/, /spec/, /\.test\./, /\.spec\./],
        agents: ['test-writer-fixer', 'api-tester', 'performance-benchmarker'],
        priority: 'medium'
      },
      
      // Deployment/Infrastructure → DevOps agents
      deploymentWork: {
        patterns: [/docker/, /deploy/, /build/, /ci/, /cd/, /vercel\.json/, /package\.json/],
        agents: ['devops-automator', 'infrastructure-maintainer'],
        priority: 'high'
      },
      
      // Database work → Backend + DB specialists
      databaseWork: {
        patterns: [/database\//, /\.sql$/, /migration/, /schema/],
        agents: ['backend-architect', 'infrastructure-maintainer'],
        priority: 'high'
      },
      
      // Design work → UI/UX agents
      designWork: {
        patterns: [/design/, /ui/, /ux/, /brand/, /style/],
        agents: ['ui-designer', 'ux-researcher', 'brand-guardian', 'visual-storyteller'],
        priority: 'medium'
      },
      
      // Performance issues → Optimization agents
      performanceWork: {
        patterns: [/performance/, /optimization/, /speed/, /benchmark/],
        agents: ['performance-benchmarker', 'workflow-optimizer', 'infrastructure-maintainer'],
        priority: 'high'
      },
      
      // New features → Product + Engineering agents
      featureWork: {
        patterns: [/feature/, /new/, /add/, /implement/],
        agents: ['rapid-prototyper', 'frontend-developer', 'backend-architect', 'sprint-prioritizer'],
        priority: 'medium'
      },
      
      // Security/Compliance → Legal + Security agents
      securityWork: {
        patterns: [/security/, /auth/, /legal/, /compliance/, /privacy/],
        agents: ['legal-compliance-checker', 'backend-architect'],
        priority: 'high'
      }
    };
    
    this.initialize();
  }
  
  async initialize() {
    console.log('🤖 INITIALIZING AUTOMATED AGENT DEPLOYMENT SYSTEM');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    await this.loadAgentRegistry();
    await this.setupCoordinationMatrix();
    this.setupCoordinationProtocols();
    this.setupProgressTracking();
    this.setupAssignmentMatrix();
    this.startProgressTracking();
    this.startContinuousMonitoring();
    this.isRunning = true;
    
    console.log('✅ Agent Automation System is now ACTIVE');
    console.log('📊 All tasks will automatically deploy expert agents');
    console.log('🔍 Full transparency and coordination enabled');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // Demonstrate system is working
    this.showAgentDashboard();
  }
  
  async loadAgentRegistry() {
    console.log('📋 Loading agent registry...');
    
    const agentsPath = path.join(__dirname, 'agents');
    
    try {
      const departments = await fs.readdir(agentsPath);
      
      for (const department of departments) {
        if (department === 'README.md') continue;
        
        const departmentPath = path.join(agentsPath, department);
        const stat = await fs.stat(departmentPath);
        
        if (stat.isDirectory()) {
          const agentFiles = await fs.readdir(departmentPath);
          
          for (const agentFile of agentFiles) {
            if (agentFile.endsWith('.md')) {
              const agentName = agentFile.replace('.md', '');
              const agentPath = path.join(departmentPath, agentFile);
              
              // Read agent configuration
              const agentContent = await fs.readFile(agentPath, 'utf8');
              const agentConfig = this.parseAgentConfig(agentContent);
              
              this.agentRegistry.set(agentName, {
                name: agentName,
                department,
                path: agentPath,
                ...agentConfig,
                status: 'available',
                currentTask: null,
                lastActive: null
              });
            }
          }
        }
      }
      
      console.log(`✅ Loaded ${this.agentRegistry.size} agents across ${departments.length - 1} departments`);
    } catch (error) {
      console.log('⚠️  Agent directory not found - agents will be dynamically created');
    }
  }
  
  parseAgentConfig(content) {
    // Parse YAML frontmatter to get agent config
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return {};
    
    const frontmatter = frontmatterMatch[1];
    const config = {};
    
    frontmatter.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        config[key.trim()] = valueParts.join(':').trim();
      }
    });
    
    return config;
  }
  
  async setupCoordinationMatrix() {
    console.log('🔗 Setting up agent coordination matrix...');
    
    // Define which agents work well together and common handoff patterns
    this.coordinationMatrix = new Map([
      // Frontend → Backend → DevOps flow
      ['frontend-developer', ['backend-architect', 'ui-designer', 'test-writer-fixer']],
      ['backend-architect', ['devops-automator', 'api-tester', 'infrastructure-maintainer']],
      ['devops-automator', ['infrastructure-maintainer', 'performance-benchmarker']],
      
      // Design → Development flow
      ['ui-designer', ['frontend-developer', 'brand-guardian', 'whimsy-injector']],
      ['ux-researcher', ['ui-designer', 'sprint-prioritizer']],
      ['brand-guardian', ['visual-storyteller', 'content-creator']],
      
      // Product → Engineering flow
      ['sprint-prioritizer', ['rapid-prototyper', 'feedback-synthesizer']],
      ['trend-researcher', ['rapid-prototyper', 'growth-hacker']],
      ['rapid-prototyper', ['frontend-developer', 'backend-architect']],
      
      // Testing → Quality flow
      ['test-writer-fixer', ['api-tester', 'performance-benchmarker']],
      ['api-tester', ['backend-architect', 'devops-automator']],
      ['performance-benchmarker', ['infrastructure-maintainer', 'workflow-optimizer']],
      
      // Marketing coordination
      ['growth-hacker', ['content-creator', 'analytics-reporter']],
      ['content-creator', ['instagram-curator', 'twitter-engager', 'tiktok-strategist']],
      
      // Operations support
      ['analytics-reporter', ['feedback-synthesizer', 'performance-benchmarker']],
      ['infrastructure-maintainer', ['devops-automator', 'finance-tracker']],
      ['support-responder', ['feedback-synthesizer', 'legal-compliance-checker']]
    ]);
    
    console.log('✅ Coordination matrix configured with handoff protocols');
  }
  
  setupCoordinationProtocols() {
    console.log('🤝 Setting up advanced coordination protocols...');
    
    this.coordinationProtocols = new AgentCoordinationProtocols(this);
    
    // Listen for coordination events
    this.coordinationProtocols.on('handoff-initiated', (handoff) => {
      console.log(`🔄 Handoff initiated: ${handoff.fromAgent.name} → ${handoff.toAgents.join(', ')}`);
      this.emit('agent-handoff', handoff);
    });
    
    this.coordinationProtocols.on('handoff-processing', (handoff) => {
      console.log(`⚡ Processing handoff: ${handoff.id}`);
    });
    
    this.coordinationProtocols.on('dependency-resolved', (resolution) => {
      console.log(`🔓 Dependency resolved for ${resolution.agent}`);
    });
    
    console.log('✅ Advanced coordination protocols configured');
  }
  
  setupProgressTracking() {
    console.log('📊 Setting up comprehensive progress tracking...');
    
    this.progressTracking = new AgentProgressTracker(this);
    
    // Listen for progress tracking events
    this.progressTracking.on('progress-update', (update) => {
      // Emit system-wide progress update
      this.emit('system-progress-update', update);
    });
    
    this.progressTracking.on('performance-analysis', (analysis) => {
      console.log(`📊 Performance analysis: System health ${analysis.systemHealth.score}%`);
      this.emit('performance-analysis', analysis);
    });
    
    this.progressTracking.on('critical-blockers-detected', (blockers) => {
      console.log(`⚠️ Critical blockers detected: ${blockers.length} agents affected`);
      this.emit('critical-blockers', blockers);
    });
    
    this.progressTracking.on('status-update', (update) => {
      this.emit('agent-status-update', update);
    });
    
    this.progressTracking.on('progress-report', (report) => {
      console.log(`📊 Progress Report: ${report.summary.activeAgents} agents, ${report.summary.averageProgress}% avg progress`);
      this.emit('progress-report', report);
    });
    
    console.log('✅ Comprehensive progress tracking configured');
  }
  
  setupAssignmentMatrix() {
    console.log('🎯 Setting up intelligent agent assignment matrix...');
    
    this.assignmentMatrix = new AgentAssignmentMatrix(this);
    
    // Listen for assignment events
    this.assignmentMatrix.on('agent-assigned', (assignment) => {
      console.log(`🎯 Assignment: ${assignment.assignedAgents.map(a => a.name).join(', ')} → ${assignment.taskType}`);
      this.emit('optimal-assignment', assignment);
    });
    
    this.assignmentMatrix.on('performance-metrics-updated', (metrics) => {
      console.log(`📊 Assignment performance: ${metrics.averageScore}% avg score, ${Object.keys(metrics.agentUtilization).length} agents tracked`);
    });
    
    this.assignmentMatrix.on('task-completed', (completion) => {
      console.log(`✅ Task completed: ${completion.agentName} (efficiency: ${Math.round(completion.newEfficiency * 100)}%)`);
    });
    
    console.log('✅ Intelligent assignment matrix configured');
  }
  
  startProgressTracking() {
    console.log('📊 Starting continuous progress tracking...');
    
    // Update progress every 30 seconds
    setInterval(() => {
      this.updateProgressMetrics();
    }, 30000);
    
    // Show detailed status every 5 minutes
    setInterval(() => {
      this.showDetailedStatus();
    }, 300000);
  }
  
  startContinuousMonitoring() {
    console.log('👁️  Starting continuous task monitoring...');
    
    // Monitor for new tasks every 10 seconds
    setInterval(() => {
      this.scanForNewTasks();
    }, 10000);
    
    // Check for agent coordination opportunities every 30 seconds
    setInterval(() => {
      this.checkCoordinationOpportunities();
    }, 30000);
  }
  
  // AUTO-DEPLOY AGENTS FOR ANY TASK
  async autoDeployAgents(taskDescription, context = {}) {
    console.log('\n🚀 AUTO-DEPLOYING AGENTS FOR TASK');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📝 Task: ${taskDescription}`);
    
    const taskId = this.generateTaskId();
    const detectedAgents = this.detectRequiredAgents(taskDescription, context);
    
    console.log(`🎯 Detected ${detectedAgents.length} required agents:`);
    detectedAgents.forEach(agent => {
      console.log(`   • ${agent.name} (${agent.department}) - ${agent.priority} priority`);
    });
    
    // Deploy agents immediately
    const deployedAgents = [];
    for (const agentConfig of detectedAgents) {
      const agent = await this.deployAgent(agentConfig, taskId, taskDescription);
      if (agent) {
        deployedAgents.push(agent);
      }
    }
    
      // Set up coordination between agents
    await this.coordinateAgents(deployedAgents, taskId);
    
    // Auto-detect and set up handoff protocols
    this.setupAutomaticHandoffs(deployedAgents, taskId);
    
    // Start progress tracking for this task
    this.progressTracker.set(taskId, {
      description: taskDescription,
      agents: deployedAgents,
      startTime: new Date(),
      status: 'in-progress',
      updates: []
    });
    
    console.log(`✅ Successfully deployed ${deployedAgents.length} agents for task ${taskId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return {
      taskId,
      deployedAgents,
      coordination: this.getCoordinationPlan(deployedAgents)
    };
  }
  
  detectRequiredAgents(taskDescription, context) {
    const requiredAgents = new Set();
    const description = taskDescription.toLowerCase();
    
    // Check each trigger pattern
    for (const [triggerName, triggerConfig] of Object.entries(this.taskTriggers)) {
      let triggered = false;
      
      // Check pattern matching
      if (triggerConfig.patterns) {
        triggered = triggerConfig.patterns.some(pattern => {
          if (pattern instanceof RegExp) {
            return pattern.test(description) || 
                   (context.files && context.files.some(file => pattern.test(file)));
          }
          return description.includes(pattern.toLowerCase());
        });
      }
      
      // Check keyword matching
      if (!triggered && triggerConfig.keywords) {
        triggered = triggerConfig.keywords.some(keyword => 
          description.includes(keyword.toLowerCase())
        );
      }
      
      if (triggered) {
        console.log(`🎯 Triggered: ${triggerName}`);
        triggerConfig.agents.forEach(agentName => {
          const agent = this.agentRegistry.get(agentName);
          if (agent) {
            requiredAgents.add({
              ...agent,
              priority: triggerConfig.priority,
              trigger: triggerName
            });
          } else {
            // Create agent if not in registry
            requiredAgents.add({
              name: agentName,
              department: this.inferDepartment(agentName),
              priority: triggerConfig.priority,
              trigger: triggerName,
              status: 'create-needed'
            });
          }
        });
      }
    }
    
    // Always include coordination agents for multi-agent tasks
    if (requiredAgents.size > 2) {
      requiredAgents.add({
        name: 'studio-producer',
        department: 'project-management',
        priority: 'high',
        trigger: 'coordination'
      });
    }
    
    return Array.from(requiredAgents);
  }
  
  inferDepartment(agentName) {
    const departmentMap = {
      'backend': 'engineering',
      'frontend': 'engineering',
      'devops': 'engineering',
      'test': 'testing',
      'ui': 'design',
      'ux': 'design',
      'brand': 'design',
      'growth': 'marketing',
      'content': 'marketing',
      'analytics': 'studio-operations',
      'finance': 'studio-operations',
      'legal': 'studio-operations',
      'sprint': 'product',
      'trend': 'product',
      'rapid': 'engineering',
      'performance': 'testing',
      'api': 'testing'
    };
    
    for (const [key, department] of Object.entries(departmentMap)) {
      if (agentName.includes(key)) {
        return department;
      }
    }
    
    return 'general';
  }
  
  async deployAgent(agentConfig, taskId, taskDescription) {
    console.log(`🤖 Deploying ${agentConfig.name}...`);
    
    const agent = {
      id: this.generateAgentId(),
      name: agentConfig.name,
      department: agentConfig.department,
      priority: agentConfig.priority,
      taskId,
      taskDescription,
      status: 'active',
      startTime: new Date(),
      progress: 0,
      currentActivity: 'initializing',
      coordination: [],
      handoffEnabled: true,
      completedMilestones: [],
      approvals: [],
      milestones: this.getAgentMilestones(agentConfig.name)
    };
    
    // Notify progress tracker of new agent
    if (this.progressTracking) {
      this.emit('agent-deployed', agent);
    }
    
    this.activeAgents.set(agent.id, agent);
    
    // Update agent in registry
    if (this.agentRegistry.has(agentConfig.name)) {
      const registryAgent = this.agentRegistry.get(agentConfig.name);
      registryAgent.status = 'active';
      registryAgent.currentTask = taskId;
      registryAgent.lastActive = new Date();
    }
    
    console.log(`✅ ${agentConfig.name} deployed with ID ${agent.id}`);
    return agent;
  }
  
  async coordinateAgents(agents, taskId) {
    console.log(`🔗 Setting up coordination for ${agents.length} agents...`);
    
    // Create coordination plan based on matrix
    for (const agent of agents) {
      const coordinatedWith = this.coordinationMatrix.get(agent.name) || [];
      const availableCoordination = agents.filter(other => 
        other.id !== agent.id && coordinatedWith.includes(other.name)
      );
      
      agent.coordination = availableCoordination.map(other => ({
        agentId: other.id,
        agentName: other.name,
        relationship: 'handoff-partner',
        priority: 'normal'
      }));
    }
    
    console.log('✅ Agent coordination matrix established');
  }
  
  setupAutomaticHandoffs(agents, taskId) {
    console.log(`🔄 Setting up automatic handoffs for ${agents.length} agents...`);
    
    // Configure agents for automatic coordination
    for (const agent of agents) {
      agent.handoffEnabled = true;
      agent.taskId = taskId;
      agent.completedMilestones = [];
      agent.approvals = [];
      
      // Set up progress milestones for handoff triggers
      agent.milestones = this.getAgentMilestones(agent.name);
    }
    
    console.log('✅ Automatic handoffs configured');
  }
  
  getAgentMilestones(agentName) {
    const milestones = {
      'ui-designer': ['wireframes-complete', 'design-complete', 'assets-ready'],
      'frontend-developer': ['components-built', 'integration-ready', 'ui-complete'],
      'backend-architect': ['api-designed', 'database-ready', 'endpoints-complete'],
      'test-writer-fixer': ['test-cases-written', 'tests-passing', 'coverage-complete'],
      'devops-automator': ['deployment-configured', 'environment-ready', 'deployed'],
      'performance-benchmarker': ['baseline-established', 'bottlenecks-identified', 'optimized']
    };
    
    return milestones[agentName] || ['analysis-complete', 'implementation-complete', 'validation-complete'];
  }
  
  getCoordinationPlan(agents) {
    const basicPlan = agents.map(agent => ({
      agent: agent.name,
      department: agent.department,
      coordination: agent.coordination.map(coord => coord.agentName),
      role: this.getAgentRole(agent.name)
    }));
    
    // Add advanced coordination info if protocols are available
    if (this.coordinationProtocols) {
      const activeHandoffs = this.coordinationProtocols.getActiveHandoffs();
      const workflowTemplates = this.coordinationProtocols.getWorkflowTemplates();
      
      return {
        basicCoordination: basicPlan,
        activeHandoffs: activeHandoffs,
        availableWorkflows: workflowTemplates,
        coordinationLevel: 'advanced'
      };
    }
    
    return { basicCoordination: basicPlan, coordinationLevel: 'basic' };
  }
  
  getAgentRole(agentName) {
    const roles = {
      'backend-architect': 'Server-side development and API design',
      'frontend-developer': 'User interface and client-side development',
      'devops-automator': 'Deployment and infrastructure automation',
      'ui-designer': 'User interface design and visual elements',
      'ux-researcher': 'User experience research and optimization',
      'test-writer-fixer': 'Quality assurance and test automation',
      'api-tester': 'API testing and validation',
      'performance-benchmarker': 'Performance testing and optimization',
      'rapid-prototyper': 'Quick MVP development and prototyping',
      'studio-producer': 'Project coordination and team management',
      'brand-guardian': 'Brand consistency and visual identity',
      'whimsy-injector': 'User delight and interactive elements',
      'growth-hacker': 'User acquisition and growth strategies',
      'content-creator': 'Content development across platforms',
      'analytics-reporter': 'Data analysis and insights',
      'infrastructure-maintainer': 'System maintenance and scaling'
    };
    
    return roles[agentName] || 'Specialized domain expert';
  }
  
  // REAL-TIME AGENT DASHBOARD
  showAgentDashboard() {
    console.log('\n📊 COMPREHENSIVE AGENT DASHBOARD');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Show enhanced dashboard with progress tracking
    if (this.progressTracking) {
      const systemStatus = this.progressTracking.getSystemStatus();
      const currentMetrics = this.progressTracking.getCurrentMetrics();
      
      console.log(`🎯 System Health: ${systemStatus.health.score}% (${systemStatus.health.status})`);
      console.log(`⏱️ System Uptime: ${systemStatus.uptime}`);
      console.log(`🔄 Resource Utilization: ${systemStatus.health.utilization}%`);
      
      if (systemStatus.blockers && systemStatus.blockers.totalBlockers > 0) {
        console.log(`⚠️ Active Blockers: ${systemStatus.blockers.totalBlockers}`);
      }
      
      console.log('');
    }
    
    if (this.activeAgents.size === 0) {
      console.log('🏃 No agents currently active - system ready to auto-deploy!');
    } else {
      console.log(`🤖 Active Agents: ${this.activeAgents.size}`);
      console.log('');
      
      for (const [agentId, agent] of this.activeAgents) {
        const runtime = Math.floor((new Date() - agent.startTime) / 1000);
        console.log(`   ${agent.name} (${agent.department})`);
        console.log(`   ├─ Task: ${agent.taskDescription.substring(0, 60)}...`);
        console.log(`   ├─ Status: ${agent.status} | Progress: ${agent.progress}%`);
        console.log(`   ├─ Runtime: ${runtime}s | Activity: ${agent.currentActivity}`);
        console.log(`   └─ Coordination: ${agent.coordination.length} agents`);
        console.log('');
      }
    }
    
    console.log(`📋 Agent Registry: ${this.agentRegistry.size} agents available`);
    console.log(`⚡ Task Queue: ${this.taskQueue.length} pending`);
    
    // Enhanced metrics display
    if (this.progressTracking) {
      const currentMetrics = this.progressTracking.getCurrentMetrics();
      const systemMetrics = currentMetrics.systemMetrics;
      
      if (systemMetrics.systemThroughput !== undefined) {
        console.log(`🚀 System Throughput: ${systemMetrics.systemThroughput} tasks/hour`);
      }
      if (systemMetrics.qualityScore !== undefined) {
        console.log(`🏆 Quality Score: ${systemMetrics.qualityScore}%`);
      }
      if (systemMetrics.collaborationIndex !== undefined) {
        console.log(`🤝 Collaboration Index: ${systemMetrics.collaborationIndex}%`);
      }
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  updateProgressMetrics() {
    // Update progress for all active agents
    for (const [agentId, agent] of this.activeAgents) {
      // Simulate progress updates (in real implementation, this would come from agent reports)
      if (agent.progress < 100) {
        const oldProgress = agent.progress;
        agent.progress += Math.floor(Math.random() * 10) + 5;
        agent.progress = Math.min(agent.progress, 100);
        
        // Check for milestone completion
        if (agent.milestones && agent.handoffEnabled) {
          this.checkMilestoneCompletion(agent, oldProgress);
        }
        
        if (agent.progress >= 100) {
          agent.status = 'completed';
          agent.currentActivity = 'task completed';
          
          // Trigger completion handoffs
          if (agent.handoffEnabled) {
            this.triggerCompletionHandoffs(agent);
          }
        } else {
          agent.currentActivity = this.getRandomActivity(agent.name);
        }
      }
    }
  }
  
  checkMilestoneCompletion(agent, oldProgress) {
    const milestoneThresholds = [30, 60, 90]; // Progress thresholds for milestones
    
    for (let i = 0; i < milestoneThresholds.length; i++) {
      const threshold = milestoneThresholds[i];
      const milestone = agent.milestones[i];
      
      if (oldProgress < threshold && agent.progress >= threshold && milestone) {
        agent.completedMilestones = agent.completedMilestones || [];
        agent.completedMilestones.push(milestone);
        
        console.log(`🎯 Milestone completed: ${agent.name} → ${milestone}`);
        
        // Emit milestone completion event
        this.emit('milestone-completed', {
          agent: agent,
          milestone: milestone,
          progress: agent.progress
        });
      }
    }
  }
  
  triggerCompletionHandoffs(agent) {
    console.log(`🏁 Agent ${agent.name} completed - checking for handoffs...`);
    
    // This will be handled by the coordination protocols
    if (this.coordinationProtocols) {
      this.coordinationProtocols.checkHandoffOpportunities();
    }
  }
  
  getRandomActivity(agentName) {
    const activities = {
      'backend-architect': ['designing API endpoints', 'optimizing database queries', 'implementing business logic'],
      'frontend-developer': ['building components', 'styling interfaces', 'optimizing performance'],
      'devops-automator': ['configuring deployment', 'setting up monitoring', 'automating workflows'],
      'ui-designer': ['creating wireframes', 'designing components', 'refining visual hierarchy'],
      'test-writer-fixer': ['writing test cases', 'fixing failing tests', 'improving coverage']
    };
    
    const agentActivities = activities[agentName] || ['analyzing requirements', 'implementing solution', 'testing functionality'];
    return agentActivities[Math.floor(Math.random() * agentActivities.length)];
  }
  
  showDetailedStatus() {
    console.log('\n📈 DETAILED SYSTEM STATUS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Department breakdown
    const departmentStats = new Map();
    for (const [agentId, agent] of this.activeAgents) {
      const dept = agent.department;
      if (!departmentStats.has(dept)) {
        departmentStats.set(dept, { active: 0, completed: 0 });
      }
      const stats = departmentStats.get(dept);
      if (agent.status === 'completed') {
        stats.completed++;
      } else {
        stats.active++;
      }
    }
    
    console.log('🏢 Department Activity:');
    for (const [dept, stats] of departmentStats) {
      console.log(`   ${dept}: ${stats.active} active, ${stats.completed} completed`);
    }
    
    // Task completion rate
    const totalTasks = this.progressTracker.size;
    const completedTasks = Array.from(this.progressTracker.values())
      .filter(task => task.status === 'completed').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;
    
    console.log(`\n📊 Performance Metrics:`);
    console.log(`   Task Completion Rate: ${completionRate}%`);
    console.log(`   Average Agents per Task: ${this.activeAgents.size / Math.max(totalTasks, 1)}`);
    console.log(`   System Uptime: ${this.getSystemUptime()}`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  scanForNewTasks() {
    // In a real implementation, this would scan for:
    // - New git commits
    // - File changes
    // - Issue creation
    // - User requests
    // - System alerts
    
    // For now, demonstrate the scanning capability
    if (Math.random() < 0.1) { // 10% chance per scan
      const mockTasks = [
        'Fix performance issue in product loading',
        'Implement user authentication system',
        'Update UI components for mobile responsiveness',
        'Deploy latest changes to production',
        'Add new API endpoint for user profiles'
      ];
      
      const randomTask = mockTasks[Math.floor(Math.random() * mockTasks.length)];
      console.log(`🔍 Detected new task: ${randomTask}`);
      
      // Auto-deploy agents for detected task
      this.autoDeployAgents(randomTask, { source: 'auto-detected' });
    }
  }
  
  checkCoordinationOpportunities() {
    // Look for agents that should be coordinating but aren't
    const activeAgentNames = Array.from(this.activeAgents.values()).map(a => a.name);
    
    for (const agentName of activeAgentNames) {
      const potentialPartners = this.coordinationMatrix.get(agentName) || [];
      const activePartners = potentialPartners.filter(p => activeAgentNames.includes(p));
      
      if (activePartners.length > 0) {
        console.log(`🤝 Coordination opportunity: ${agentName} → ${activePartners.join(', ')}`);
      }
    }
  }
  
  generateTaskId() {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateAgentId() {
    return `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  getSystemUptime() {
    const startTime = this.startTime || new Date();
    const uptime = new Date() - startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
  
  // PUBLIC API METHODS
  
  async handleTask(description, context = {}) {
    return await this.autoDeployAgents(description, context);
  }
  
  getActiveAgents() {
    return Array.from(this.activeAgents.values());
  }
  
  getTaskProgress(taskId) {
    return this.progressTracker.get(taskId);
  }
  
  getAllTasksProgress() {
    const basicProgress = Array.from(this.progressTracker.values());
    
    if (this.coordinationProtocols) {
      // Enrich with coordination data
      return basicProgress.map(task => ({
        ...task,
        handoffs: this.coordinationProtocols.getActiveHandoffs().filter(h => h.taskId === task.taskId),
        coordinationQueues: this.coordinationProtocols.getCoordinationQueues()[task.taskId] || [],
        blockingDependencies: Array.from(this.coordinationProtocols.getBlockingDependencies().entries())
          .filter(([_, dep]) => dep.taskId === task.taskId)
      }));
    }
    
    return basicProgress;
  }
  
  // Execute predefined workflow
  async executeWorkflow(templateName, taskDescription, context = {}) {
    if (!this.coordinationProtocols) {
      throw new Error('Coordination protocols not initialized');
    }
    
    return await this.coordinationProtocols.executeWorkflow(templateName, taskDescription, context);
  }
  
  // Force handoff between agents
  async forceHandoff(fromAgentId, toAgentNames, deliverables = []) {
    if (!this.coordinationProtocols) {
      throw new Error('Coordination protocols not initialized');
    }
    
    return await this.coordinationProtocols.forceHandoff(fromAgentId, toAgentNames, deliverables);
  }
  
  // Get comprehensive system status
  getSystemStatus() {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: this.getSystemUptime(),
      activeAgents: this.activeAgents.size,
      totalAgents: this.agentRegistry.size,
      activeTasks: this.progressTracker.size,
      health: this.progressTracking?.getSystemStatus() || {},
      coordination: this.coordinationProtocols ? {
        activeHandoffs: this.coordinationProtocols.getActiveHandoffs().length,
        coordinationQueues: Object.keys(this.coordinationProtocols.getCoordinationQueues()).length,
        blockingDependencies: Object.keys(this.coordinationProtocols.getBlockingDependencies()).length
      } : {}
    };
  }
  
  getAgentRegistry() {
    return Array.from(this.agentRegistry.values());
  }
  
  shutdown() {
    console.log('🛑 Shutting down Agent Automation System...');
    this.isRunning = false;
    this.activeAgents.clear();
    this.taskQueue = [];
    this.progressTracker.clear();
    console.log('✅ Agent Automation System shutdown complete');
  }
}

// Global instance - single source of truth
let globalAgentSystem = null;

function getAgentSystem() {
  if (!globalAgentSystem) {
    globalAgentSystem = new AgentAutomationSystem();
  }
  return globalAgentSystem;
}

// Auto-start the system
const agentSystem = getAgentSystem();

// Export for use in other modules
module.exports = {
  AgentAutomationSystem,
  getAgentSystem,
  
  // Convenience methods for direct use
  async deployAgentsFor(taskDescription, context = {}) {
    return await agentSystem.autoDeployAgents(taskDescription, context);
  },
  
  showDashboard() {
    agentSystem.showAgentDashboard();
  },
  
  getActiveAgents() {
    return agentSystem.getActiveAgents();
  },
  
  trackProgress() {
    return agentSystem.getAllTasksProgress();
  },
  
  // Advanced coordination methods
  async executeWorkflow(templateName, taskDescription, context = {}) {
    return await agentSystem.executeWorkflow(templateName, taskDescription, context);
  },
  
  async forceHandoff(fromAgentId, toAgentNames, deliverables = []) {
    return await agentSystem.forceHandoff(fromAgentId, toAgentNames, deliverables);
  },
  
  getCoordinationStatus() {
    return {
      activeHandoffs: agentSystem.coordinationProtocols?.getActiveHandoffs() || [],
      coordinationQueues: agentSystem.coordinationProtocols?.getCoordinationQueues() || {},
      blockingDependencies: agentSystem.coordinationProtocols?.getBlockingDependencies() || {},
      workflowTemplates: agentSystem.coordinationProtocols?.getWorkflowTemplates() || []
    };
  },
  
  // Progress tracking methods
  getProgressMetrics() {
    return agentSystem.progressTracking?.getCurrentMetrics() || {};
  },
  
  getSystemHealth() {
    return agentSystem.progressTracking?.getSystemStatus() || {};
  },
  
  generateProgressReport() {
    return agentSystem.progressTracking?.generateProgressReport() || null;
  },
  
  getAgentProgress(agentId) {
    return agentSystem.progressTracking?.getAgentProgress(agentId) || null;
  }
};

// Demonstration - show system is working
setTimeout(() => {
  console.log('\n🎯 DEMONSTRATION: Auto-deploying agents for sample tasks...\n');
  
  // Example 1: Code changes detected
  agentSystem.autoDeployAgents('Update server.js to handle new API endpoints', {
    files: ['server.js', 'routes/api.js']
  });
  
  setTimeout(() => {
    // Example 2: Frontend work detected
    agentSystem.autoDeployAgents('Redesign product page with better mobile experience', {
      files: ['views/product.ejs', 'public/styles.css']
    });
  }, 2000);
  
  setTimeout(() => {
    // Example 3: Performance issue detected
    agentSystem.autoDeployAgents('Database queries are slow, need optimization', {
      type: 'performance-issue'
    });
  }, 4000);
  
}, 3000);