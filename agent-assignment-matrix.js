/**
 * AGENT ASSIGNMENT MATRIX
 * 
 * This module provides intelligent agent assignment based on task analysis,
 * workload balancing, skill matching, and real-time availability. It ensures
 * optimal agent selection for maximum efficiency and quality outcomes.
 */

const EventEmitter = require('events');

class AgentAssignmentMatrix extends EventEmitter {
  constructor(agentSystem) {
    super();
    this.agentSystem = agentSystem;
    this.assignmentRules = new Map();
    this.skillMatrix = new Map();
    this.workloadBalancer = new Map();
    this.assignmentHistory = [];
    this.performanceMetrics = new Map();
    this.exclusivityRules = new Map();
    this.prerequisiteChains = new Map();
    
    this.setupAssignmentMatrix();
    this.initializeSkillMapping();
    this.configureWorkloadBalancing();
    this.startPerformanceTracking();
    
    console.log('🎯 Agent Assignment Matrix initialized');
  }
  
  setupAssignmentMatrix() {
    console.log('📋 Setting up assignment matrix...');
    
    // Define task types and their optimal agent assignments
    this.assignmentRules = new Map([
      // DEVELOPMENT TASKS
      ['frontend-development', {
        primaryAgents: ['frontend-developer'],
        supportAgents: ['ui-designer', 'whimsy-injector'],
        requiredSkills: ['javascript', 'react', 'css', 'html'],
        optionalSkills: ['typescript', 'webpack', 'testing'],
        complexity: {
          simple: { agents: 1, timeEstimate: '2-4 hours' },
          medium: { agents: 2, timeEstimate: '1-2 days' },
          complex: { agents: 3, timeEstimate: '3-5 days' }
        },
        dependencies: ['ui-designer'],
        handoffTo: ['test-writer-fixer'],
        qualityGates: ['code-review', 'testing', 'accessibility-check']
      }],
      
      ['backend-development', {
        primaryAgents: ['backend-architect'],
        supportAgents: ['api-tester', 'infrastructure-maintainer'],
        requiredSkills: ['nodejs', 'databases', 'api-design'],
        optionalSkills: ['microservices', 'caching', 'security'],
        complexity: {
          simple: { agents: 1, timeEstimate: '3-6 hours' },
          medium: { agents: 2, timeEstimate: '1-3 days' },
          complex: { agents: 3, timeEstimate: '4-7 days' }
        },
        dependencies: [],
        handoffTo: ['api-tester', 'devops-automator'],
        qualityGates: ['unit-tests', 'integration-tests', 'security-scan']
      }],
      
      ['fullstack-feature', {
        primaryAgents: ['frontend-developer', 'backend-architect'],
        supportAgents: ['ui-designer', 'api-tester', 'devops-automator'],
        requiredSkills: ['fullstack', 'system-design'],
        optionalSkills: ['performance-optimization', 'security'],
        complexity: {
          simple: { agents: 2, timeEstimate: '1-2 days' },
          medium: { agents: 4, timeEstimate: '3-5 days' },
          complex: { agents: 6, timeEstimate: '1-2 weeks' }
        },
        coordination: 'parallel-with-sync-points',
        dependencies: ['ui-designer'],
        handoffTo: ['test-writer-fixer', 'performance-benchmarker'],
        qualityGates: ['design-review', 'api-documentation', 'e2e-tests']
      }],
      
      // DESIGN TASKS
      ['ui-design', {
        primaryAgents: ['ui-designer'],
        supportAgents: ['brand-guardian', 'ux-researcher'],
        requiredSkills: ['figma', 'design-systems', 'user-interface'],
        optionalSkills: ['prototyping', 'animation', 'accessibility'],
        complexity: {
          simple: { agents: 1, timeEstimate: '2-4 hours' },
          medium: { agents: 2, timeEstimate: '1-2 days' },
          complex: { agents: 3, timeEstimate: '3-4 days' }
        },
        dependencies: ['ux-researcher'],
        handoffTo: ['frontend-developer'],
        qualityGates: ['brand-consistency', 'accessibility-compliance', 'stakeholder-approval']
      }],
      
      ['ux-research', {
        primaryAgents: ['ux-researcher'],
        supportAgents: ['analytics-reporter', 'feedback-synthesizer'],
        requiredSkills: ['user-research', 'data-analysis', 'personas'],
        optionalSkills: ['a-b-testing', 'surveys', 'interviews'],
        complexity: {
          simple: { agents: 1, timeEstimate: '1-2 days' },
          medium: { agents: 2, timeEstimate: '3-5 days' },
          complex: { agents: 3, timeEstimate: '1-2 weeks' }
        },
        dependencies: [],
        handoffTo: ['ui-designer', 'sprint-prioritizer'],
        qualityGates: ['sample-size-validation', 'statistical-significance', 'actionable-insights']
      }],
      
      ['brand-design', {
        primaryAgents: ['brand-guardian'],
        supportAgents: ['visual-storyteller', 'content-creator'],
        requiredSkills: ['brand-design', 'visual-identity', 'guidelines'],
        optionalSkills: ['illustration', 'photography', 'video'],
        complexity: {
          simple: { agents: 1, timeEstimate: '1-2 days' },
          medium: { agents: 2, timeEstimate: '3-5 days' },
          complex: { agents: 3, timeEstimate: '1-2 weeks' }
        },
        dependencies: [],
        handoffTo: ['ui-designer', 'content-creator'],
        qualityGates: ['brand-guidelines-compliance', 'stakeholder-approval', 'consistency-check']
      }],
      
      // TESTING AND QA
      ['automated-testing', {
        primaryAgents: ['test-writer-fixer'],
        supportAgents: ['api-tester', 'performance-benchmarker'],
        requiredSkills: ['test-automation', 'testing-frameworks', 'ci-cd'],
        optionalSkills: ['load-testing', 'security-testing', 'mobile-testing'],
        complexity: {
          simple: { agents: 1, timeEstimate: '4-8 hours' },
          medium: { agents: 2, timeEstimate: '1-3 days' },
          complex: { agents: 3, timeEstimate: '4-6 days' }
        },
        dependencies: ['frontend-developer', 'backend-architect'],
        handoffTo: ['devops-automator'],
        qualityGates: ['test-coverage', 'test-reliability', 'performance-benchmarks']
      }],
      
      ['performance-optimization', {
        primaryAgents: ['performance-benchmarker'],
        supportAgents: ['backend-architect', 'frontend-developer', 'infrastructure-maintainer'],
        requiredSkills: ['performance-analysis', 'optimization', 'profiling'],
        optionalSkills: ['caching', 'cdn', 'database-optimization'],
        complexity: {
          simple: { agents: 1, timeEstimate: '4-8 hours' },
          medium: { agents: 2, timeEstimate: '2-3 days' },
          complex: { agents: 4, timeEstimate: '1-2 weeks' }
        },
        dependencies: ['test-writer-fixer'],
        handoffTo: ['infrastructure-maintainer'],
        qualityGates: ['performance-benchmarks', 'load-testing', 'scalability-tests']
      }],
      
      // DEVOPS AND INFRASTRUCTURE
      ['deployment-automation', {
        primaryAgents: ['devops-automator'],
        supportAgents: ['infrastructure-maintainer', 'backend-architect'],
        requiredSkills: ['ci-cd', 'docker', 'cloud-platforms'],
        optionalSkills: ['kubernetes', 'terraform', 'monitoring'],
        complexity: {
          simple: { agents: 1, timeEstimate: '4-8 hours' },
          medium: { agents: 2, timeEstimate: '1-2 days' },
          complex: { agents: 3, timeEstimate: '3-5 days' }
        },
        dependencies: ['backend-architect'],
        handoffTo: ['infrastructure-maintainer'],
        qualityGates: ['deployment-verification', 'rollback-testing', 'monitoring-setup']
      }],
      
      ['infrastructure-scaling', {
        primaryAgents: ['infrastructure-maintainer'],
        supportAgents: ['devops-automator', 'performance-benchmarker'],
        requiredSkills: ['cloud-infrastructure', 'scaling', 'monitoring'],
        optionalSkills: ['cost-optimization', 'multi-region', 'disaster-recovery'],
        complexity: {
          simple: { agents: 1, timeEstimate: '1-2 days' },
          medium: { agents: 2, timeEstimate: '3-5 days' },
          complex: { agents: 3, timeEstimate: '1-2 weeks' }
        },
        dependencies: ['performance-benchmarker'],
        handoffTo: ['analytics-reporter'],
        qualityGates: ['capacity-planning', 'cost-analysis', 'monitoring-alerts']
      }],
      
      // PRODUCT AND PROJECT MANAGEMENT
      ['feature-planning', {
        primaryAgents: ['sprint-prioritizer'],
        supportAgents: ['trend-researcher', 'feedback-synthesizer'],
        requiredSkills: ['product-management', 'roadmapping', 'prioritization'],
        optionalSkills: ['market-research', 'competitive-analysis', 'metrics'],
        complexity: {
          simple: { agents: 1, timeEstimate: '1-2 days' },
          medium: { agents: 2, timeEstimate: '3-5 days' },
          complex: { agents: 3, timeEstimate: '1-2 weeks' }
        },
        dependencies: ['trend-researcher', 'feedback-synthesizer'],
        handoffTo: ['rapid-prototyper', 'ui-designer'],
        qualityGates: ['stakeholder-alignment', 'feasibility-analysis', 'success-metrics']
      }],
      
      ['rapid-prototyping', {
        primaryAgents: ['rapid-prototyper'],
        supportAgents: ['ui-designer', 'frontend-developer'],
        requiredSkills: ['prototyping', 'mvp-development', 'user-validation'],
        optionalSkills: ['no-code-tools', 'rapid-testing', 'iteration'],
        complexity: {
          simple: { agents: 1, timeEstimate: '1-2 days' },
          medium: { agents: 2, timeEstimate: '3-5 days' },
          complex: { agents: 3, timeEstimate: '1-2 weeks' }
        },
        dependencies: ['sprint-prioritizer'],
        handoffTo: ['frontend-developer', 'backend-architect'],
        qualityGates: ['user-validation', 'technical-feasibility', 'business-value']
      }],
      
      // MARKETING AND GROWTH
      ['growth-strategy', {
        primaryAgents: ['growth-hacker'],
        supportAgents: ['analytics-reporter', 'content-creator'],
        requiredSkills: ['growth-marketing', 'analytics', 'experimentation'],
        optionalSkills: ['seo', 'social-media', 'email-marketing'],
        complexity: {
          simple: { agents: 1, timeEstimate: '2-3 days' },
          medium: { agents: 2, timeEstimate: '1-2 weeks' },
          complex: { agents: 3, timeEstimate: '3-4 weeks' }
        },
        dependencies: ['analytics-reporter'],
        handoffTo: ['content-creator', 'tiktok-strategist'],
        qualityGates: ['metrics-tracking', 'a-b-testing', 'roi-analysis']
      }],
      
      ['content-creation', {
        primaryAgents: ['content-creator'],
        supportAgents: ['brand-guardian', 'visual-storyteller'],
        requiredSkills: ['content-strategy', 'copywriting', 'storytelling'],
        optionalSkills: ['video-editing', 'graphic-design', 'seo-writing'],
        complexity: {
          simple: { agents: 1, timeEstimate: '1-2 days' },
          medium: { agents: 2, timeEstimate: '3-5 days' },
          complex: { agents: 3, timeEstimate: '1-2 weeks' }
        },
        dependencies: ['brand-guardian'],
        handoffTo: ['instagram-curator', 'twitter-engager'],
        qualityGates: ['brand-alignment', 'audience-relevance', 'engagement-metrics']
      }]
    ]);
    
    console.log(`✅ Configured ${this.assignmentRules.size} assignment rules`);
  }
  
  initializeSkillMapping() {
    console.log('🎨 Initializing skill mapping...');
    
    // Define skills for each agent type
    this.skillMatrix = new Map([
      // Engineering agents
      ['frontend-developer', {
        primary: ['javascript', 'react', 'css', 'html', 'typescript'],
        secondary: ['vue', 'angular', 'webpack', 'testing', 'accessibility'],
        proficiency: 'expert',
        specializations: ['responsive-design', 'performance-optimization', 'user-experience']
      }],
      
      ['backend-architect', {
        primary: ['nodejs', 'databases', 'api-design', 'microservices', 'security'],
        secondary: ['python', 'java', 'docker', 'redis', 'mongodb'],
        proficiency: 'expert',
        specializations: ['system-architecture', 'scalability', 'data-modeling']
      }],
      
      ['devops-automator', {
        primary: ['ci-cd', 'docker', 'kubernetes', 'cloud-platforms', 'monitoring'],
        secondary: ['terraform', 'ansible', 'jenkins', 'prometheus', 'grafana'],
        proficiency: 'expert',
        specializations: ['automation', 'infrastructure-as-code', 'deployment-strategies']
      }],
      
      ['rapid-prototyper', {
        primary: ['prototyping', 'mvp-development', 'user-validation', 'iteration'],
        secondary: ['no-code-tools', 'figma', 'javascript', 'rapid-testing'],
        proficiency: 'advanced',
        specializations: ['rapid-development', 'user-feedback', 'market-validation']
      }],
      
      // Design agents
      ['ui-designer', {
        primary: ['figma', 'design-systems', 'user-interface', 'prototyping'],
        secondary: ['sketch', 'adobe-creative', 'animation', 'accessibility'],
        proficiency: 'expert',
        specializations: ['visual-design', 'interaction-design', 'design-systems']
      }],
      
      ['ux-researcher', {
        primary: ['user-research', 'data-analysis', 'personas', 'usability-testing'],
        secondary: ['a-b-testing', 'surveys', 'interviews', 'analytics'],
        proficiency: 'expert',
        specializations: ['user-psychology', 'research-methods', 'data-interpretation']
      }],
      
      ['brand-guardian', {
        primary: ['brand-design', 'visual-identity', 'guidelines', 'consistency'],
        secondary: ['illustration', 'photography', 'video', 'brand-strategy'],
        proficiency: 'expert',
        specializations: ['brand-identity', 'visual-consistency', 'brand-guidelines']
      }],
      
      ['visual-storyteller', {
        primary: ['storytelling', 'visual-narrative', 'infographics', 'presentations'],
        secondary: ['illustration', 'animation', 'video-editing', 'data-visualization'],
        proficiency: 'advanced',
        specializations: ['visual-communication', 'narrative-design', 'data-storytelling']
      }],
      
      ['whimsy-injector', {
        primary: ['user-delight', 'interactive-elements', 'micro-interactions', 'gamification'],
        secondary: ['animation', 'sound-design', 'easter-eggs', 'personality'],
        proficiency: 'advanced',
        specializations: ['user-engagement', 'delight-design', 'personality-injection']
      }],
      
      // Testing agents
      ['test-writer-fixer', {
        primary: ['test-automation', 'testing-frameworks', 'quality-assurance', 'debugging'],
        secondary: ['performance-testing', 'security-testing', 'mobile-testing'],
        proficiency: 'expert',
        specializations: ['test-strategy', 'automation-frameworks', 'quality-metrics']
      }],
      
      ['api-tester', {
        primary: ['api-testing', 'integration-testing', 'postman', 'rest-apis'],
        secondary: ['graphql', 'performance-testing', 'security-testing'],
        proficiency: 'expert',
        specializations: ['api-validation', 'contract-testing', 'load-testing']
      }],
      
      ['performance-benchmarker', {
        primary: ['performance-analysis', 'optimization', 'profiling', 'benchmarking'],
        secondary: ['load-testing', 'stress-testing', 'monitoring', 'metrics'],
        proficiency: 'expert',
        specializations: ['performance-optimization', 'scalability-testing', 'bottleneck-analysis']
      }],
      
      // Product agents
      ['sprint-prioritizer', {
        primary: ['product-management', 'roadmapping', 'prioritization', 'stakeholder-management'],
        secondary: ['agile', 'scrum', 'metrics', 'user-stories'],
        proficiency: 'expert',
        specializations: ['feature-prioritization', 'roadmap-planning', 'stakeholder-alignment']
      }],
      
      ['trend-researcher', {
        primary: ['market-research', 'trend-analysis', 'competitive-analysis', 'data-analysis'],
        secondary: ['social-listening', 'consumer-behavior', 'market-validation'],
        proficiency: 'advanced',
        specializations: ['trend-identification', 'market-intelligence', 'opportunity-analysis']
      }],
      
      ['feedback-synthesizer', {
        primary: ['user-feedback', 'data-analysis', 'sentiment-analysis', 'insight-generation'],
        secondary: ['survey-design', 'interview-analysis', 'categorization'],
        proficiency: 'advanced',
        specializations: ['feedback-analysis', 'user-insights', 'actionable-recommendations']
      }],
      
      // Marketing agents
      ['growth-hacker', {
        primary: ['growth-marketing', 'analytics', 'experimentation', 'optimization'],
        secondary: ['seo', 'social-media', 'email-marketing', 'conversion-optimization'],
        proficiency: 'expert',
        specializations: ['growth-strategies', 'viral-mechanics', 'user-acquisition']
      }],
      
      ['content-creator', {
        primary: ['content-strategy', 'copywriting', 'storytelling', 'content-planning'],
        secondary: ['video-editing', 'graphic-design', 'seo-writing', 'social-media'],
        proficiency: 'advanced',
        specializations: ['content-marketing', 'brand-voice', 'engagement-content']
      }],
      
      ['tiktok-strategist', {
        primary: ['tiktok-marketing', 'viral-content', 'social-trends', 'influencer-collaboration'],
        secondary: ['video-editing', 'trend-analysis', 'community-management'],
        proficiency: 'advanced',
        specializations: ['viral-mechanics', 'platform-optimization', 'trend-leveraging']
      }],
      
      // Operations agents
      ['analytics-reporter', {
        primary: ['data-analysis', 'reporting', 'metrics', 'business-intelligence'],
        secondary: ['sql', 'visualization', 'statistics', 'predictive-analysis'],
        proficiency: 'expert',
        specializations: ['data-insights', 'performance-metrics', 'business-analytics']
      }],
      
      ['infrastructure-maintainer', {
        primary: ['cloud-infrastructure', 'scaling', 'monitoring', 'maintenance'],
        secondary: ['cost-optimization', 'security', 'backup-recovery', 'performance'],
        proficiency: 'expert',
        specializations: ['infrastructure-optimization', 'system-reliability', 'cost-management']
      }],
      
      ['legal-compliance-checker', {
        primary: ['legal-compliance', 'privacy-laws', 'terms-of-service', 'risk-assessment'],
        secondary: ['gdpr', 'ccpa', 'data-protection', 'regulatory-compliance'],
        proficiency: 'expert',
        specializations: ['regulatory-compliance', 'privacy-protection', 'legal-risk-mitigation']
      }]
    ]);
    
    console.log(`✅ Configured skills for ${this.skillMatrix.size} agent types`);
  }
  
  configureWorkloadBalancing() {
    console.log('⚖️ Configuring workload balancing...');
    
    // Initialize workload tracking for each agent type
    this.skillMatrix.forEach((skills, agentName) => {
      this.workloadBalancer.set(agentName, {
        currentLoad: 0,
        maxCapacity: 100,
        activeAssignments: [],
        efficiency: 100,
        availabilityScore: 100,
        averageTaskDuration: 0,
        completedTasks: 0,
        successRate: 100,
        lastAssigned: null,
        skillUtilization: new Map(),
        workloadHistory: []
      });
    });
    
    console.log(`✅ Configured workload tracking for ${this.workloadBalancer.size} agents`);
  }
  
  startPerformanceTracking() {
    console.log('📊 Starting performance tracking...');
    
    // Track performance metrics every 2 minutes
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 120000);
    
    // Generate assignment analytics every 10 minutes
    setInterval(() => {
      this.generateAssignmentAnalytics();
    }, 600000);
  }
  
  updatePerformanceMetrics() {
    const metrics = {
      timestamp: new Date(),
      totalAssignments: this.assignmentHistory.length,
      activeAssignments: this.getActiveAssignmentCount(),
      averageResponseTime: this.calculateAverageResponseTime(),
      successRate: this.calculateOverallSuccessRate(),
      workloadDistribution: this.getWorkloadDistribution(),
      topPerformers: this.getTopPerformers(),
      bottlenecks: this.identifyBottlenecks(),
      recommendations: this.generateOptimizationRecommendations()
    };
    
    this.performanceMetrics.set(Date.now(), metrics);
    
    // Keep only last 100 entries
    const entries = Array.from(this.performanceMetrics.entries());
    if (entries.length > 100) {
      const recent = entries.slice(-100);
      this.performanceMetrics.clear();
      recent.forEach(([key, value]) => this.performanceMetrics.set(key, value));
    }
    
    this.emit('performance-metrics-updated', metrics);
  }
  
  // CORE ASSIGNMENT LOGIC
  assignOptimalAgents(taskType, taskDescription, complexity = 'medium', constraints = {}) {
    console.log(`🎯 Finding optimal agents for: ${taskType} (${complexity})`);
    
    const rule = this.assignmentRules.get(taskType);
    if (!rule) {
      throw new Error(`Unknown task type: ${taskType}`);
    }
    
    const complexityConfig = rule.complexity[complexity];
    if (!complexityConfig) {
      throw new Error(`Unknown complexity level: ${complexity} for task type: ${taskType}`);
    }
    
    // Step 1: Get required number of agents
    const requiredAgentCount = Math.max(complexityConfig.agents, constraints.minAgents || 1);
    
    // Step 2: Score and rank available agents
    const candidateAgents = this.scoreAndRankAgents(rule, constraints);
    
    // Step 3: Select optimal combination
    const selectedAgents = this.selectOptimalCombination(
      candidateAgents,
      requiredAgentCount,
      rule,
      constraints
    );
    
    // Step 4: Create assignment record
    const assignment = {
      id: this.generateAssignmentId(),
      taskType,
      taskDescription,
      complexity,
      assignedAgents: selectedAgents,
      timeEstimate: complexityConfig.timeEstimate,
      qualityGates: rule.qualityGates,
      handoffTo: rule.handoffTo,
      dependencies: rule.dependencies,
      timestamp: new Date(),
      status: 'assigned'
    };
    
    // Step 5: Update workloads and track assignment
    this.updateAgentWorkloads(selectedAgents, assignment);
    this.assignmentHistory.push(assignment);
    
    console.log(`✅ Assigned ${selectedAgents.length} agents: ${selectedAgents.map(a => a.name).join(', ')}`);
    
    this.emit('agent-assigned', assignment);
    
    return assignment;
  }
  
  scoreAndRankAgents(rule, constraints) {
    const candidates = [];
    
    // Consider primary agents first
    rule.primaryAgents.forEach(agentName => {
      const score = this.calculateAgentScore(agentName, rule, constraints, 'primary');
      if (score > 0) {
        candidates.push({
          name: agentName,
          role: 'primary',
          score,
          workload: this.workloadBalancer.get(agentName)
        });
      }
    });
    
    // Then consider support agents
    rule.supportAgents.forEach(agentName => {
      const score = this.calculateAgentScore(agentName, rule, constraints, 'support');
      if (score > 0) {
        candidates.push({
          name: agentName,
          role: 'support',
          score,
          workload: this.workloadBalancer.get(agentName)
        });
      }
    });
    
    // Sort by score (highest first)
    return candidates.sort((a, b) => b.score - a.score);
  }
  
  calculateAgentScore(agentName, rule, constraints, role) {
    let score = 0;
    
    const skills = this.skillMatrix.get(agentName);
    const workload = this.workloadBalancer.get(agentName);
    
    if (!skills || !workload) return 0;
    
    // Base score for role
    score += role === 'primary' ? 100 : 70;
    
    // Skill matching (30% of total score)
    const skillMatch = this.calculateSkillMatch(skills, rule.requiredSkills, rule.optionalSkills || []);
    score += skillMatch * 0.3;
    
    // Availability (25% of total score)
    const availabilityScore = this.calculateAvailabilityScore(workload);
    score += availabilityScore * 0.25;
    
    // Performance history (20% of total score)
    const performanceScore = this.calculatePerformanceScore(workload);
    score += performanceScore * 0.2;
    
    // Specialization bonus (15% of total score)
    const specializationScore = this.calculateSpecializationScore(skills, rule);
    score += specializationScore * 0.15;
    
    // Efficiency (10% of total score)
    score += workload.efficiency * 0.1;
    
    // Apply constraints
    if (constraints.excludeAgents && constraints.excludeAgents.includes(agentName)) {
      score = 0;
    }
    
    if (constraints.preferredAgents && constraints.preferredAgents.includes(agentName)) {
      score *= 1.2; // 20% bonus for preferred agents
    }
    
    // Workload balancing penalty
    if (workload.currentLoad > 80) {
      score *= 0.7; // 30% penalty for overloaded agents
    }
    
    return Math.max(0, score);
  }
  
  calculateSkillMatch(agentSkills, requiredSkills, optionalSkills) {
    let matchScore = 0;
    const allAgentSkills = [...agentSkills.primary, ...agentSkills.secondary];
    
    // Required skills (75% weight)
    const requiredMatches = requiredSkills.filter(skill => 
      allAgentSkills.includes(skill)
    ).length;
    const requiredScore = (requiredMatches / requiredSkills.length) * 75;
    
    // Optional skills (25% weight)
    const optionalMatches = optionalSkills.filter(skill => 
      allAgentSkills.includes(skill)
    ).length;
    const optionalScore = optionalSkills.length > 0 
      ? (optionalMatches / optionalSkills.length) * 25 
      : 25; // Full bonus if no optional skills specified
    
    matchScore = requiredScore + optionalScore;
    
    // Proficiency bonus
    if (agentSkills.proficiency === 'expert') {
      matchScore *= 1.1;
    } else if (agentSkills.proficiency === 'advanced') {
      matchScore *= 1.05;
    }
    
    return Math.min(100, matchScore);
  }
  
  calculateAvailabilityScore(workload) {
    const loadFactor = Math.max(0, 100 - workload.currentLoad);
    const recentActivityPenalty = workload.lastAssigned 
      ? Math.max(0, 10 - (Date.now() - new Date(workload.lastAssigned).getTime()) / (1000 * 60 * 60)) // Hours since last assignment
      : 0;
    
    return Math.max(0, loadFactor - recentActivityPenalty);
  }
  
  calculatePerformanceScore(workload) {
    let score = workload.successRate;
    
    // Bonus for completed tasks
    if (workload.completedTasks > 10) {
      score *= 1.1;
    } else if (workload.completedTasks > 5) {
      score *= 1.05;
    }
    
    // Penalty for poor efficiency
    if (workload.efficiency < 70) {
      score *= 0.8;
    }
    
    return Math.min(100, score);
  }
  
  calculateSpecializationScore(skills, rule) {
    let score = 0;
    
    // Check if agent's specializations align with task requirements
    const taskContext = rule.requiredSkills.concat(rule.optionalSkills || []);
    
    skills.specializations.forEach(specialization => {
      if (taskContext.some(skill => skill.includes(specialization) || specialization.includes(skill))) {
        score += 20; // Bonus for relevant specialization
      }
    });
    
    return Math.min(100, score);
  }
  
  selectOptimalCombination(candidates, requiredCount, rule, constraints) {
    const selected = [];
    const used = new Set();
    
    // First, ensure we have at least one primary agent
    const primaryCandidates = candidates.filter(c => c.role === 'primary');
    if (primaryCandidates.length > 0) {
      const bestPrimary = primaryCandidates[0];
      selected.push(bestPrimary);
      used.add(bestPrimary.name);
    }
    
    // Fill remaining slots with best available agents
    for (const candidate of candidates) {
      if (selected.length >= requiredCount) break;
      if (used.has(candidate.name)) continue;
      
      // Check for team compatibility
      if (this.isTeamCompatible(selected, candidate, rule)) {
        selected.push(candidate);
        used.add(candidate.name);
      }
    }
    
    // If we don't have enough agents, relax constraints and try again
    if (selected.length < requiredCount) {
      for (const candidate of candidates) {
        if (selected.length >= requiredCount) break;
        if (used.has(candidate.name)) continue;
        
        selected.push(candidate);
        used.add(candidate.name);
      }
    }
    
    return selected;
  }
  
  isTeamCompatible(existingTeam, newCandidate, rule) {
    // Check for skill overlap and complementarity
    const existingSkills = new Set();
    existingTeam.forEach(member => {
      const skills = this.skillMatrix.get(member.name);
      if (skills) {
        skills.primary.forEach(skill => existingSkills.add(skill));
      }
    });
    
    const candidateSkills = this.skillMatrix.get(newCandidate.name);
    if (!candidateSkills) return false;
    
    // Prefer agents that bring new skills to the team
    const newSkills = candidateSkills.primary.filter(skill => !existingSkills.has(skill));
    
    // Good team compatibility if agent brings at least one new relevant skill
    return newSkills.length > 0 || existingTeam.length === 0;
  }
  
  updateAgentWorkloads(selectedAgents, assignment) {
    selectedAgents.forEach(agent => {
      const workload = this.workloadBalancer.get(agent.name);
      if (workload) {
        // Estimate load based on complexity and role
        const loadIncrease = this.calculateLoadIncrease(assignment.complexity, agent.role);
        
        workload.currentLoad = Math.min(100, workload.currentLoad + loadIncrease);
        workload.activeAssignments.push(assignment.id);
        workload.lastAssigned = new Date();
        
        // Track skill utilization
        const skills = this.skillMatrix.get(agent.name);
        if (skills) {
          const rule = this.assignmentRules.get(assignment.taskType);
          rule.requiredSkills.forEach(skill => {
            if (skills.primary.includes(skill) || skills.secondary.includes(skill)) {
              const current = workload.skillUtilization.get(skill) || 0;
              workload.skillUtilization.set(skill, current + 1);
            }
          });
        }
      }
    });
  }
  
  calculateLoadIncrease(complexity, role) {
    const baseLoad = {
      simple: 15,
      medium: 25,
      complex: 40
    };
    
    const roleMultiplier = role === 'primary' ? 1.0 : 0.7;
    return Math.round(baseLoad[complexity] * roleMultiplier);
  }
  
  // ANALYTICS AND OPTIMIZATION
  generateAssignmentAnalytics() {
    console.log('📊 Generating assignment analytics...');
    
    const analytics = {
      timestamp: new Date(),
      totalAssignments: this.assignmentHistory.length,
      successfulAssignments: this.assignmentHistory.filter(a => a.status === 'completed').length,
      averageTeamSize: this.calculateAverageTeamSize(),
      mostRequestedSkills: this.getMostRequestedSkills(),
      agentUtilization: this.getAgentUtilization(),
      bottlenecks: this.identifyBottlenecks(),
      recommendations: this.generateOptimizationRecommendations()
    };
    
    this.performanceMetrics.set('analytics', analytics);
    this.emit('assignment-analytics', analytics);
  }
  
  calculateAverageTeamSize() {
    if (this.assignmentHistory.length === 0) return 0;
    
    const totalAgents = this.assignmentHistory.reduce((sum, assignment) => 
      sum + assignment.assignedAgents.length, 0
    );
    
    return (totalAgents / this.assignmentHistory.length).toFixed(2);
  }
  
  getMostRequestedSkills() {
    const skillCounts = new Map();
    
    this.assignmentHistory.forEach(assignment => {
      const rule = this.assignmentRules.get(assignment.taskType);
      if (rule) {
        rule.requiredSkills.forEach(skill => {
          skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
        });
      }
    });
    
    return Array.from(skillCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([skill, count]) => ({ skill, count }));
  }
  
  getAgentUtilization() {
    const utilization = new Map();
    
    this.workloadBalancer.forEach((workload, agentName) => {
      utilization.set(agentName, {
        currentLoad: workload.currentLoad,
        completedTasks: workload.completedTasks,
        successRate: workload.successRate,
        efficiency: workload.efficiency,
        averageTaskDuration: workload.averageTaskDuration
      });
    });
    
    return Object.fromEntries(utilization);
  }
  
  getActiveAssignmentCount() {
    return this.assignmentHistory.filter(a => a.status === 'assigned' || a.status === 'in-progress').length;
  }
  
  calculateAverageResponseTime() {
    // In a real implementation, this would track actual response times
    return Math.floor(Math.random() * 300) + 60; // 1-5 minutes for demo
  }
  
  calculateOverallSuccessRate() {
    if (this.assignmentHistory.length === 0) return 100;
    
    const completedAssignments = this.assignmentHistory.filter(a => 
      a.status === 'completed' || a.status === 'failed'
    );
    
    if (completedAssignments.length === 0) return 100;
    
    const successfulAssignments = completedAssignments.filter(a => a.status === 'completed');
    return Math.round((successfulAssignments.length / completedAssignments.length) * 100);
  }
  
  getWorkloadDistribution() {
    const distribution = [];
    
    this.workloadBalancer.forEach((workload, agentName) => {
      distribution.push({
        agent: agentName,
        currentLoad: workload.currentLoad,
        activeAssignments: workload.activeAssignments.length,
        efficiency: workload.efficiency
      });
    });
    
    return distribution.sort((a, b) => b.currentLoad - a.currentLoad);
  }
  
  getTopPerformers() {
    const performers = [];
    
    this.workloadBalancer.forEach((workload, agentName) => {
      performers.push({
        agent: agentName,
        score: (workload.successRate * 0.4) + (workload.efficiency * 0.3) + ((100 - workload.currentLoad) * 0.3),
        successRate: workload.successRate,
        efficiency: workload.efficiency,
        completedTasks: workload.completedTasks
      });
    });
    
    return performers.sort((a, b) => b.score - a.score).slice(0, 5);
  }
  
  identifyBottlenecks() {
    const bottlenecks = [];
    
    // Check for overloaded agents
    this.workloadBalancer.forEach((workload, agentName) => {
      if (workload.currentLoad > 85) {
        bottlenecks.push({
          type: 'overload',
          agent: agentName,
          severity: workload.currentLoad > 95 ? 'critical' : 'high',
          description: `Agent ${agentName} is overloaded (${workload.currentLoad}% capacity)`
        });
      }
    });
    
    // Check for skill gaps
    const skillDemand = this.getMostRequestedSkills();
    skillDemand.forEach(({ skill, count }) => {
      const availableAgents = Array.from(this.skillMatrix.entries())
        .filter(([agentName, skills]) => 
          skills.primary.includes(skill) || skills.secondary.includes(skill)
        ).length;
      
      if (availableAgents < 2 && count > 5) {
        bottlenecks.push({
          type: 'skill-gap',
          skill,
          severity: 'medium',
          description: `Limited agents available for skill: ${skill} (${availableAgents} agents, ${count} requests)`
        });
      }
    });
    
    return bottlenecks;
  }
  
  generateOptimizationRecommendations() {
    const recommendations = [];
    const bottlenecks = this.identifyBottlenecks();
    const utilization = this.getWorkloadDistribution();
    
    // Workload balancing recommendations
    const overloadedAgents = utilization.filter(u => u.currentLoad > 80);
    const underutilizedAgents = utilization.filter(u => u.currentLoad < 30);
    
    if (overloadedAgents.length > 0 && underutilizedAgents.length > 0) {
      recommendations.push({
        type: 'workload-rebalancing',
        priority: 'high',
        description: 'Consider redistributing tasks from overloaded to underutilized agents',
        details: {
          overloaded: overloadedAgents.map(a => a.agent),
          underutilized: underutilizedAgents.map(a => a.agent)
        }
      });
    }
    
    // Skill development recommendations
    bottlenecks.filter(b => b.type === 'skill-gap').forEach(bottleneck => {
      recommendations.push({
        type: 'skill-development',
        priority: 'medium',
        description: `Consider training additional agents in: ${bottleneck.skill}`,
        skill: bottleneck.skill
      });
    });
    
    // Capacity planning recommendations
    const totalUtilization = utilization.reduce((sum, u) => sum + u.currentLoad, 0) / utilization.length;
    if (totalUtilization > 75) {
      recommendations.push({
        type: 'capacity-expansion',
        priority: 'high',
        description: 'Consider adding more agents to handle increasing workload',
        currentUtilization: Math.round(totalUtilization)
      });
    }
    
    return recommendations;
  }
  
  // TASK COMPLETION TRACKING
  completeTask(agentName, taskType, success = true, duration = null) {
    const workload = this.workloadBalancer.get(agentName);
    if (!workload) return;
    
    // Update workload
    workload.completedTasks++;
    workload.currentLoad = Math.max(0, workload.currentLoad - this.calculateLoadDecrease(taskType));
    
    // Update success rate
    const totalTasks = workload.completedTasks;
    const previousSuccesses = Math.round((workload.successRate / 100) * (totalTasks - 1));
    const newSuccesses = previousSuccesses + (success ? 1 : 0);
    workload.successRate = Math.round((newSuccesses / totalTasks) * 100);
    
    // Update efficiency based on duration
    if (duration && workload.averageTaskDuration > 0) {
      const expectedDuration = workload.averageTaskDuration;
      const efficiencyFactor = expectedDuration / Math.max(duration, 1);
      workload.efficiency = Math.min(100, Math.max(20, workload.efficiency * 0.9 + efficiencyFactor * 10));
    }
    
    // Update average task duration if provided
    if (duration) {
      if (workload.averageTaskDuration === 0) {
        workload.averageTaskDuration = duration;
      } else {
        workload.averageTaskDuration = (workload.averageTaskDuration + duration) / 2;
      }
    }
    
    console.log(`✅ Task completed: ${agentName} - ${taskType} (${success ? 'success' : 'failed'})`);
    
    this.emit('task-completed', {
      agentName,
      taskType,
      success,
      duration,
      newEfficiency: workload.efficiency
    });
  }
  
  calculateLoadDecrease(taskType) {
    const rule = this.assignmentRules.get(taskType);
    if (!rule) return 20; // Default decrease
    
    // Estimate based on typical complexity
    return 25; // Average load decrease per completed task
  }
  
  // UTILITY METHODS
  generateAssignmentId() {
    return `assignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // PUBLIC API METHODS
  getAssignmentRecommendation(taskType, complexity = 'medium', constraints = {}) {
    try {
      return this.assignOptimalAgents(taskType, 'Task analysis', complexity, constraints);
    } catch (error) {
      console.error('Assignment recommendation error:', error);
      return null;
    }
  }
  
  getAgentWorkload(agentName) {
    return this.workloadBalancer.get(agentName) || null;
  }
  
  getAllWorkloads() {
    return Object.fromEntries(this.workloadBalancer);
  }
  
  getAssignmentHistory(limit = 20) {
    return this.assignmentHistory.slice(-limit);
  }
  
  getPerformanceMetrics() {
    const entries = Array.from(this.performanceMetrics.entries());
    return entries.length > 0 ? entries[entries.length - 1][1] : null;
  }
  
  getAvailableTaskTypes() {
    return Array.from(this.assignmentRules.keys());
  }
  
  getTaskTypeDetails(taskType) {
    return this.assignmentRules.get(taskType) || null;
  }
  
  // UTILITY METHODS
  getSystemLoad() {
    let totalLoad = 0;
    let totalCapacity = 0;
    
    this.workloadBalancer.forEach(workload => {
      totalLoad += workload.currentLoad;
      totalCapacity += workload.maxCapacity;
    });
    
    return {
      utilization: totalCapacity > 0 ? Math.round((totalLoad / totalCapacity) * 100) : 0,
      totalLoad,
      totalCapacity,
      availableCapacity: totalCapacity - totalLoad
    };
  }
  
  getAgentRecommendationsForSkills(requiredSkills) {
    const recommendations = [];
    
    this.skillMatrix.forEach((skills, agentName) => {
      const matchScore = this.calculateSkillMatch(skills, requiredSkills, []);
      const workload = this.workloadBalancer.get(agentName);
      
      if (matchScore > 50) { // Only recommend agents with 50%+ skill match
        recommendations.push({
          agentName,
          skillMatch: Math.round(matchScore),
          availability: this.calculateAvailabilityScore(workload),
          skills: skills.primary.filter(skill => requiredSkills.includes(skill))
        });
      }
    });
    
    return recommendations.sort((a, b) => b.skillMatch - a.skillMatch);
  }
}

module.exports = {
  AgentAssignmentMatrix
};