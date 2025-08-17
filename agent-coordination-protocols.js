/**
 * AGENT COORDINATION PROTOCOLS
 * 
 * This module handles automatic handoffs between agents, ensuring seamless 
 * collaboration and preventing work conflicts. It implements sophisticated
 * coordination patterns for complex multi-agent workflows.
 */

const EventEmitter = require('events');

class AgentCoordinationProtocols extends EventEmitter {
  constructor(agentSystem) {
    super();
    this.agentSystem = agentSystem;
    this.handoffRules = new Map();
    this.coordinationQueues = new Map();
    this.blockingDependencies = new Map();
    this.workflowTemplates = new Map();
    this.activeHandoffs = new Map();
    
    this.setupHandoffRules();
    this.setupWorkflowTemplates();
    this.startCoordinationEngine();
    
    console.log('🤝 Agent Coordination Protocols initialized');
  }
  
  setupHandoffRules() {
    console.log('📋 Setting up automatic handoff rules...');
    
    // Define when agents should hand off work to other agents
    this.handoffRules = new Map([
      // Design → Development handoff
      ['ui-designer', {
        triggers: ['design-complete', 'mockup-ready', 'component-designed'],
        handoffTo: ['frontend-developer'],
        deliverables: ['design-specs', 'asset-files', 'style-guide'],
        conditions: { progress: '>= 80' },
        blockUntil: ['design-approved']
      }],
      
      // Frontend → Backend handoff
      ['frontend-developer', {
        triggers: ['api-requirements-identified', 'data-structure-needed'],
        handoffTo: ['backend-architect'],
        deliverables: ['api-specs', 'data-models', 'integration-points'],
        conditions: { progress: '>= 50' },
        coordination: 'parallel' // Can work in parallel
      }],
      
      // Backend → DevOps handoff
      ['backend-architect', {
        triggers: ['api-complete', 'database-ready', 'deployment-needed'],
        handoffTo: ['devops-automator'],
        deliverables: ['deployment-config', 'environment-vars', 'scaling-requirements'],
        conditions: { progress: '>= 70' },
        blockUntil: ['backend-tested']
      }],
      
      // Development → Testing handoff
      ['frontend-developer', {
        triggers: ['feature-implemented', 'component-built'],
        handoffTo: ['test-writer-fixer'],
        deliverables: ['test-cases', 'component-specs', 'user-stories'],
        conditions: { progress: '>= 60' },
        coordination: 'parallel'
      }],
      
      ['backend-architect', {
        triggers: ['api-implemented', 'endpoints-ready'],
        handoffTo: ['api-tester'],
        deliverables: ['api-documentation', 'test-scenarios', 'data-samples'],
        conditions: { progress: '>= 60' },
        coordination: 'parallel'
      }],
      
      // Testing → Performance handoff
      ['test-writer-fixer', {
        triggers: ['tests-passing', 'quality-verified'],
        handoffTo: ['performance-benchmarker'],
        deliverables: ['performance-baseline', 'bottleneck-analysis'],
        conditions: { testsPass: true },
        coordination: 'sequential'
      }],
      
      // Product → Engineering handoff
      ['sprint-prioritizer', {
        triggers: ['requirements-defined', 'user-stories-ready'],
        handoffTo: ['rapid-prototyper', 'backend-architect'],
        deliverables: ['feature-specs', 'acceptance-criteria', 'wireframes'],
        conditions: { approval: 'stakeholder-approved' },
        coordination: 'parallel'
      }],
      
      // Rapid Prototyping → Development handoff
      ['rapid-prototyper', {
        triggers: ['prototype-validated', 'mvp-approved'],
        handoffTo: ['frontend-developer', 'backend-architect'],
        deliverables: ['prototype-code', 'architecture-decisions', 'tech-stack'],
        conditions: { validation: 'user-tested' },
        coordination: 'parallel'
      }],
      
      // UX Research → Design handoff
      ['ux-researcher', {
        triggers: ['research-complete', 'user-insights-ready'],
        handoffTo: ['ui-designer', 'whimsy-injector'],
        deliverables: ['user-personas', 'journey-maps', 'pain-points'],
        conditions: { sampleSize: '>= 20' },
        coordination: 'parallel'
      }],
      
      // Content → Marketing handoff
      ['content-creator', {
        triggers: ['content-ready', 'copy-approved'],
        handoffTo: ['growth-hacker', 'instagram-curator'],
        deliverables: ['content-calendar', 'asset-library', 'messaging-guide'],
        conditions: { brandCheck: 'brand-guardian-approved' },
        coordination: 'parallel'
      }],
      
      // Analytics → Product handoff
      ['analytics-reporter', {
        triggers: ['insights-ready', 'data-analyzed'],
        handoffTo: ['feedback-synthesizer', 'sprint-prioritizer'],
        deliverables: ['user-behavior-analysis', 'performance-metrics', 'recommendations'],
        conditions: { dataQuality: 'validated' },
        coordination: 'parallel'
      }],
      
      // Infrastructure → Development handoff
      ['infrastructure-maintainer', {
        triggers: ['environment-ready', 'scaling-configured'],
        handoffTo: ['devops-automator', 'backend-architect'],
        deliverables: ['infrastructure-docs', 'deployment-pipeline', 'monitoring-setup'],
        conditions: { uptime: '>= 99%' },
        coordination: 'parallel'
      }]
    ]);
    
    console.log(`✅ Configured ${this.handoffRules.size} automatic handoff rules`);
  }
  
  setupWorkflowTemplates() {
    console.log('🔄 Setting up workflow templates...');
    
    // Define common workflow patterns
    this.workflowTemplates = new Map([
      // Full-stack feature development
      ['feature-development', {
        stages: [
          { name: 'planning', agents: ['sprint-prioritizer', 'ux-researcher'] },
          { name: 'design', agents: ['ui-designer', 'brand-guardian'] },
          { name: 'development', agents: ['frontend-developer', 'backend-architect'] },
          { name: 'testing', agents: ['test-writer-fixer', 'api-tester'] },
          { name: 'optimization', agents: ['performance-benchmarker'] },
          { name: 'deployment', agents: ['devops-automator'] }
        ],
        handoffs: [
          { from: 'planning', to: 'design', trigger: 'requirements-complete' },
          { from: 'design', to: 'development', trigger: 'design-approved' },
          { from: 'development', to: 'testing', trigger: 'implementation-complete' },
          { from: 'testing', to: 'optimization', trigger: 'tests-passing' },
          { from: 'optimization', to: 'deployment', trigger: 'performance-approved' }
        ]
      }],
      
      // Store creation workflow
      ['store-creation', {
        stages: [
          { name: 'setup', agents: ['backend-architect', 'infrastructure-maintainer'] },
          { name: 'integration', agents: ['api-tester', 'devops-automator'] },
          { name: 'content', agents: ['content-creator', 'ui-designer'] },
          { name: 'testing', agents: ['test-writer-fixer', 'performance-benchmarker'] },
          { name: 'launch', agents: ['devops-automator', 'analytics-reporter'] }
        ],
        handoffs: [
          { from: 'setup', to: 'integration', trigger: 'infrastructure-ready' },
          { from: 'integration', to: 'content', trigger: 'apis-connected' },
          { from: 'content', to: 'testing', trigger: 'content-populated' },
          { from: 'testing', to: 'launch', trigger: 'quality-verified' }
        ]
      }],
      
      // Performance optimization workflow
      ['performance-optimization', {
        stages: [
          { name: 'analysis', agents: ['performance-benchmarker', 'analytics-reporter'] },
          { name: 'backend-optimization', agents: ['backend-architect', 'infrastructure-maintainer'] },
          { name: 'frontend-optimization', agents: ['frontend-developer', 'workflow-optimizer'] },
          { name: 'testing', agents: ['performance-benchmarker', 'api-tester'] },
          { name: 'monitoring', agents: ['analytics-reporter'] }
        ],
        handoffs: [
          { from: 'analysis', to: 'backend-optimization', trigger: 'bottlenecks-identified' },
          { from: 'analysis', to: 'frontend-optimization', trigger: 'ui-issues-found' },
          { from: 'backend-optimization', to: 'testing', trigger: 'server-optimized' },
          { from: 'frontend-optimization', to: 'testing', trigger: 'ui-optimized' },
          { from: 'testing', to: 'monitoring', trigger: 'performance-improved' }
        ]
      }],
      
      // Bug fix workflow
      ['bug-fix', {
        stages: [
          { name: 'diagnosis', agents: ['test-results-analyzer', 'api-tester'] },
          { name: 'fix', agents: ['backend-architect', 'frontend-developer'] },
          { name: 'verification', agents: ['test-writer-fixer'] },
          { name: 'deployment', agents: ['devops-automator'] }
        ],
        handoffs: [
          { from: 'diagnosis', to: 'fix', trigger: 'root-cause-identified' },
          { from: 'fix', to: 'verification', trigger: 'fix-implemented' },
          { from: 'verification', to: 'deployment', trigger: 'fix-verified' }
        ]
      }]
    ]);
    
    console.log(`✅ Configured ${this.workflowTemplates.size} workflow templates`);
  }
  
  startCoordinationEngine() {
    console.log('⚙️ Starting coordination engine...');
    
    // Check for handoff opportunities every 30 seconds
    setInterval(() => {
      this.checkHandoffOpportunities();
    }, 30000);
    
    // Process coordination queues every 10 seconds
    setInterval(() => {
      this.processCoordinationQueues();
    }, 10000);
    
    // Resolve blocking dependencies every 60 seconds
    setInterval(() => {
      this.resolveBlockingDependencies();
    }, 60000);
  }
  
  // AUTOMATIC HANDOFF DETECTION
  checkHandoffOpportunities() {
    try {
      if (!this.agentSystem || this.agentSystem.emergencyShutdown) {
        return;
      }
      
      const activeAgents = this.agentSystem.getActiveAgents() || [];
      
      for (const agent of activeAgents) {
        if (!agent || !agent.name) continue;
        
        const handoffRule = this.handoffRules.get(agent.name);
        
        if (handoffRule && this.shouldTriggerHandoff(agent, handoffRule)) {
          this.initiateHandoff(agent, handoffRule);
        }
      }
    } catch (error) {
      console.error('❌ Error checking handoff opportunities:', error.message);
    }
  }
  
  shouldTriggerHandoff(agent, rule) {
    // Check if conditions are met for handoff
    if (rule.conditions) {
      if (rule.conditions.progress && agent.progress < this.parseCondition(rule.conditions.progress)) {
        return false;
      }
      
      if (rule.conditions.testsPass && !agent.testsPass) {
        return false;
      }
      
      if (rule.conditions.approval && !agent.approvals?.includes(rule.conditions.approval)) {
        return false;
      }
    }
    
    // Check if blocking conditions are resolved
    if (rule.blockUntil) {
      const blockers = Array.isArray(rule.blockUntil) ? rule.blockUntil : [rule.blockUntil];
      for (const blocker of blockers) {
        if (!agent.completedMilestones?.includes(blocker)) {
          return false;
        }
      }
    }
    
    // Check if handoff hasn't already been initiated
    const handoffKey = `${agent.id}-${rule.handoffTo.join(',')}`;
    if (this.activeHandoffs.has(handoffKey)) {
      return false;
    }
    
    return true;
  }
  
  parseCondition(condition) {
    if (typeof condition === 'string' && condition.includes('>=')) {
      return parseInt(condition.split('>=')[1].trim());
    }
    return condition;
  }
  
  async initiateHandoff(fromAgent, rule) {
    console.log(`🤝 Initiating handoff from ${fromAgent.name} to ${rule.handoffTo.join(', ')}`);
    
    const handoffId = this.generateHandoffId();
    const handoffKey = `${fromAgent.id}-${rule.handoffTo.join(',')}`;
    
    const handoff = {
      id: handoffId,
      fromAgent: fromAgent,
      toAgents: rule.handoffTo,
      deliverables: rule.deliverables || [],
      coordination: rule.coordination || 'sequential',
      status: 'initiated',
      timestamp: new Date(),
      taskId: fromAgent.taskId
    };
    
    this.activeHandoffs.set(handoffKey, handoff);
    
    // Deploy target agents if they're not already active
    for (const targetAgentName of rule.handoffTo) {
      await this.ensureAgentDeployed(targetAgentName, fromAgent.taskId, handoff);
    }
    
    // Create coordination queue entry
    if (!this.coordinationQueues.has(fromAgent.taskId)) {
      this.coordinationQueues.set(fromAgent.taskId, []);
    }
    this.coordinationQueues.get(fromAgent.taskId).push(handoff);
    
    // Emit handoff event
    this.emit('handoff-initiated', handoff);
    
    console.log(`✅ Handoff ${handoffId} initiated successfully`);
    
    return handoff;
  }
  
  async ensureAgentDeployed(agentName, taskId, handoffContext) {
    // Critical: Add safety checks and prevent infinite recursion
    if (!this.agentSystem || !handoffContext || !handoffContext.fromAgent) {
      console.log(`⚠️ Invalid handoff context for ${agentName} - skipping deployment`);
      return null;
    }
    
    // Check for emergency shutdown
    if (this.agentSystem.emergencyShutdown) {
      console.log(`⚠️ Emergency shutdown active - blocking deployment of ${agentName}`);
      return null;
    }
    
    // Prevent handoff loops by checking if this is a recursive handoff
    const handoffKey = `${handoffContext.fromAgent.name}-${agentName}-${taskId}`;
    if (!this.handoffCooldown) {
      this.handoffCooldown = new Map();
    }
    
    const now = Date.now();
    const lastHandoff = this.handoffCooldown.get(handoffKey);
    
    // Minimum 30 seconds between same handoffs to prevent infinite loops
    if (lastHandoff && (now - lastHandoff) < 30000) {
      console.log(`⚠️ Handoff cooldown active for ${agentName} - skipping deployment`);
      return null;
    }
    
    try {
      const activeAgents = this.agentSystem.getActiveAgents() || [];
      const existingAgent = activeAgents.find(a => a.name === agentName && a.taskId === taskId);
      
      if (!existingAgent) {
        // Set cooldown before attempting deployment
        this.handoffCooldown.set(handoffKey, now);
        
        console.log(`🚀 Auto-deploying ${agentName} for handoff coordination`);
        
        const deployment = await this.agentSystem.autoDeployAgents(
          `Handoff coordination: ${handoffContext.fromAgent.taskDescription}`,
          {
            type: 'handoff-coordination',
            fromAgent: handoffContext.fromAgent.name,
            deliverables: handoffContext.deliverables,
            parentTaskId: taskId
          }
        );
        
        return deployment?.deployedAgents?.find(a => a.name === agentName) || null;
      }
      
      return existingAgent;
    } catch (error) {
      console.error(`❌ Error deploying agent ${agentName}:`, error.message);
      return null;
    }
  }
  
  processCoordinationQueues() {
    try {
      if (!this.coordinationQueues || this.agentSystem?.emergencyShutdown) {
        return;
      }
      
      for (const [taskId, handoffs] of this.coordinationQueues) {
        if (!Array.isArray(handoffs)) continue;
        
        for (const handoff of handoffs) {
          if (handoff && handoff.status === 'initiated') {
            this.processHandoff(handoff);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing coordination queues:', error.message);
    }
  }
  
  processHandoff(handoff) {
    console.log(`🔄 Processing handoff ${handoff.id}`);
    
    // Update handoff status
    handoff.status = 'in-progress';
    
    // Coordinate agents based on coordination type
    if (handoff.coordination === 'parallel') {
      this.coordinateParallelWork(handoff);
    } else {
      this.coordinateSequentialWork(handoff);
    }
    
    // Emit processing event
    this.emit('handoff-processing', handoff);
  }
  
  coordinateParallelWork(handoff) {
    console.log(`⚡ Coordinating parallel work for handoff ${handoff.id}`);
    
    // All target agents can work simultaneously
    // Set up shared context and communication channels
    const sharedContext = {
      handoffId: handoff.id,
      deliverables: handoff.deliverables,
      coordination: 'parallel',
      peers: handoff.toAgents
    };
    
    this.setupSharedContext(handoff.taskId, sharedContext);
  }
  
  coordinateSequentialWork(handoff) {
    console.log(`🔄 Coordinating sequential work for handoff ${handoff.id}`);
    
    // Agents work in sequence, create dependency chain
    for (let i = 0; i < handoff.toAgents.length; i++) {
      const agentName = handoff.toAgents[i];
      const dependencies = i > 0 ? [handoff.toAgents[i - 1]] : [];
      
      if (dependencies.length > 0) {
        this.blockingDependencies.set(agentName, {
          blockedBy: dependencies,
          handoffId: handoff.id,
          deliverables: handoff.deliverables
        });
      }
    }
  }
  
  setupSharedContext(taskId, context) {
    // Create shared workspace for coordinating agents
    const sharedWorkspace = {
      taskId,
      context,
      communicationChannel: `handoff-${context.handoffId}`,
      deliverables: new Map(),
      updates: [],
      status: 'active'
    };
    
    // Store shared workspace (in real implementation, this would be persisted)
    console.log(`📋 Set up shared workspace for task ${taskId}`);
  }
  
  resolveBlockingDependencies() {
    try {
      if (!this.blockingDependencies || this.agentSystem?.emergencyShutdown) {
        return;
      }
      
      for (const [blockedAgent, dependency] of this.blockingDependencies) {
        if (!blockedAgent || !dependency) continue;
        
        if (this.areDependenciesResolved(dependency)) {
          console.log(`🔓 Resolving blocking dependency for ${blockedAgent}`);
          
          // Remove the blocking dependency
          this.blockingDependencies.delete(blockedAgent);
          
          // Notify agent that it can proceed
          this.emit('dependency-resolved', {
            agent: blockedAgent,
            handoffId: dependency.handoffId,
            deliverables: dependency.deliverables
          });
        }
      }
    } catch (error) {
      console.error('❌ Error resolving blocking dependencies:', error.message);
    }
  }
  
  areDependenciesResolved(dependency) {
    // Check if all blocking agents have completed their work
    const activeAgents = this.agentSystem.getActiveAgents();
    
    for (const blockingAgent of dependency.blockedBy) {
      const agent = activeAgents.find(a => a.name === blockingAgent);
      if (!agent || agent.status !== 'completed') {
        return false;
      }
    }
    
    return true;
  }
  
  // WORKFLOW TEMPLATE EXECUTION
  async executeWorkflow(templateName, taskDescription, context = {}) {
    const template = this.workflowTemplates.get(templateName);
    if (!template) {
      throw new Error(`Workflow template '${templateName}' not found`);
    }
    
    console.log(`🔄 Executing workflow: ${templateName}`);
    
    const workflowId = this.generateWorkflowId();
    const workflow = {
      id: workflowId,
      template: templateName,
      description: taskDescription,
      context,
      stages: template.stages.map(stage => ({...stage, status: 'pending'})),
      currentStage: 0,
      status: 'running',
      startTime: new Date(),
      deployedAgents: []
    };
    
    // Start with first stage
    await this.executeWorkflowStage(workflow, 0);
    
    return workflow;
  }
  
  async executeWorkflowStage(workflow, stageIndex) {
    if (stageIndex >= workflow.stages.length) {
      workflow.status = 'completed';
      console.log(`✅ Workflow ${workflow.id} completed successfully`);
      return;
    }
    
    const stage = workflow.stages[stageIndex];
    stage.status = 'running';
    workflow.currentStage = stageIndex;
    
    console.log(`🎬 Executing stage: ${stage.name}`);
    
    // Deploy agents for this stage
    for (const agentName of stage.agents) {
      const deployment = await this.agentSystem.autoDeployAgents(
        `Workflow stage: ${stage.name} - ${workflow.description}`,
        {
          type: 'workflow-execution',
          workflow: workflow.id,
          stage: stage.name,
          template: workflow.template
        }
      );
      
      workflow.deployedAgents.push(...deployment.deployedAgents);
    }
    
    // Set up stage completion monitoring
    this.monitorStageCompletion(workflow, stageIndex);
  }
  
  monitorStageCompletion(workflow, stageIndex) {
    const checkCompletion = () => {
      const stage = workflow.stages[stageIndex];
      const stageAgents = workflow.deployedAgents.filter(a => 
        stage.agents.includes(a.name)
      );
      
      const allCompleted = stageAgents.every(a => a.status === 'completed');
      
      if (allCompleted) {
        stage.status = 'completed';
        console.log(`✅ Stage ${stage.name} completed`);
        
        // Move to next stage
        this.executeWorkflowStage(workflow, stageIndex + 1);
      } else {
        // Check again in 30 seconds
        setTimeout(checkCompletion, 30000);
      }
    };
    
    setTimeout(checkCompletion, 30000);
  }
  
  // COORDINATION UTILITIES
  generateHandoffId() {
    return `handoff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateWorkflowId() {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // PUBLIC API
  getActiveHandoffs() {
    return Array.from(this.activeHandoffs.values());
  }
  
  getCoordinationQueues() {
    return Object.fromEntries(this.coordinationQueues);
  }
  
  getBlockingDependencies() {
    try {
      if (!this.blockingDependencies || !(this.blockingDependencies instanceof Map)) {
        return {};
      }
      return Object.fromEntries(this.blockingDependencies);
    } catch (error) {
      console.error('❌ Error getting blocking dependencies:', error.message);
      return {};
    }
  }
  
  getWorkflowTemplates() {
    return Array.from(this.workflowTemplates.keys());
  }
  
  // Force handoff (manual override)
  async forceHandoff(fromAgentId, toAgentNames, deliverables = []) {
    const activeAgents = this.agentSystem.getActiveAgents();
    const fromAgent = activeAgents.find(a => a.id === fromAgentId);
    
    if (!fromAgent) {
      throw new Error('Source agent not found');
    }
    
    const handoffRule = {
      handoffTo: toAgentNames,
      deliverables,
      coordination: 'parallel',
      triggers: ['manual-override']
    };
    
    return await this.initiateHandoff(fromAgent, handoffRule);
  }
}

module.exports = {
  AgentCoordinationProtocols
};