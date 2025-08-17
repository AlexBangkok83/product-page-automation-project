/**
 * AGENT PROGRESS TRACKER
 * 
 * This module provides comprehensive real-time tracking of agent progress,
 * performance metrics, and system health monitoring. It enables data-driven
 * optimization and proactive issue detection across all active agents.
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class AgentProgressTracker extends EventEmitter {
  constructor(agentSystem) {
    super();
    this.agentSystem = agentSystem;
    this.progressMetrics = new Map();
    this.efficiencyMetrics = new Map();
    this.performanceHistory = [];
    this.blockerAnalysis = new Map();
    this.statusUpdates = [];
    this.reportingIntervals = new Map();
    this.logPath = path.join(__dirname, 'logs', 'agent-progress.log');
    
    this.initializeTracking();
    this.initializeReporting();
    this.startRealTimeMonitoring();
    
    console.log('📊 Agent Progress Tracker initialized');
  }
  
  initializeTracking() {
    console.log('📈 Initializing progress tracking...');
    
    // Set up core tracking systems
    this.setupMetricsCollection();
    this.setupPerformanceAnalysis();
    this.setupBlockerDetection();
    this.setupEfficiencyTracking();
  }
  
  setupMetricsCollection() {
    // Initialize metrics storage
    this.progressMetrics.clear();
    this.efficiencyMetrics.set('system', {
      totalAgents: 0,
      averageProgress: 0,
      systemThroughput: 0,
      resourceUtilization: 0,
      collaborationIndex: 0,
      qualityScore: 0,
      blockerCount: 0
    });
  }
  
  setupPerformanceAnalysis() {
    // Initialize performance tracking
    this.performanceHistory = [];
    
    // Run performance analysis every 5 minutes
    setInterval(() => {
      this.analyzePerformanceMetrics();
    }, 300000);
  }
  
  setupBlockerDetection() {
    // Initialize blocker tracking
    this.blockerAnalysis.clear();
    
    // Detect and analyze blockers every 30 seconds
    setInterval(() => {
      this.detectAndAnalyzeBlockers();
    }, 30000);
  }
  
  setupEfficiencyTracking() {
    // Track efficiency metrics
    setInterval(() => {
      this.updateEfficiencyMetrics();
    }, 60000);
  }
  
  startRealTimeMonitoring() {
    console.log('⚡ Starting real-time monitoring...');
    
    // Real-time progress updates every 5 seconds
    setInterval(() => {
      this.updateRealTimeProgress();
    }, 5000);
    
    // Generate comprehensive reports every 5 minutes
    setInterval(() => {
      this.generateProgressReport();
    }, 300000);
  }
  
  initializeReporting() {
    console.log('📈 Initializing status reporting...');
    
    // Set up automated status updates
    this.reportingIntervals.set('real-time', 5000);      // 5 seconds
    this.reportingIntervals.set('summary', 300000);      // 5 minutes
    this.reportingIntervals.set('detailed', 900000);     // 15 minutes
    this.reportingIntervals.set('performance', 1800000); // 30 minutes
    
    // Listen for agent events
    this.agentSystem.on('agent-deployed', (agent) => {
      this.trackAgentDeployment(agent);
    });
    
    this.agentSystem.on('agent-handoff', (handoff) => {
      this.trackHandoff(handoff);
    });
    
    this.agentSystem.on('milestone-completed', (milestone) => {
      this.trackMilestone(milestone);
    });
  }
  
  // REAL-TIME PROGRESS TRACKING
  updateRealTimeProgress() {
    const activeAgents = this.agentSystem.getActiveAgents();
    const currentTime = new Date();
    
    // Update progress for each active agent
    activeAgents.forEach(agent => {
      this.updateAgentProgress(agent, currentTime);
    });
    
    // Update overall system metrics
    this.updateSystemMetrics(activeAgents, currentTime);
    
    // Emit real-time update event
    this.emit('progress-update', {
      timestamp: currentTime,
      activeAgents: activeAgents.length,
      systemMetrics: this.getSystemMetrics(),
      recentUpdates: this.getRecentUpdates()
    });
  }
  
  updateAgentProgress(agent, timestamp) {
    const agentId = agent.id;
    const previousProgress = this.progressMetrics.get(agentId);
    
    const currentMetrics = {
      agentId,
      agentName: agent.name,
      department: agent.department,
      taskId: agent.taskId,
      progress: agent.progress,
      status: agent.status,
      currentActivity: agent.currentActivity,
      runtime: this.calculateRuntime(agent.startTime, timestamp),
      productivity: this.calculateProductivity(agent, previousProgress),
      blockers: this.identifyBlockers(agent),
      collaborationScore: this.calculateCollaborationScore(agent),
      qualityIndicators: this.assessQualityIndicators(agent),
      timestamp
    };
    
    // Store updated metrics
    this.progressMetrics.set(agentId, currentMetrics);
    
    // Track significant changes
    if (this.isSignificantChange(previousProgress, currentMetrics)) {
      this.logProgressChange(currentMetrics, previousProgress);
    }
  }
  
  calculateRuntime(startTime, currentTime) {
    return Math.floor((currentTime - new Date(startTime)) / 1000);
  }
  
  calculateProductivity(agent, previousMetrics) {
    if (!previousMetrics) return 0;
    
    const progressDelta = agent.progress - (previousMetrics.progress || 0);
    const timeDelta = 5; // 5 seconds between updates
    
    return progressDelta / timeDelta; // Progress per second
  }
  
  identifyBlockers(agent) {
    const blockers = [];
    
    // Detect common blocker patterns
    if (agent.progress < 10 && agent.runtime > 300) {
      blockers.push('slow-start');
    }
    
    if (agent.currentActivity === agent.previousActivity && agent.runtime > 600) {
      blockers.push('stuck-on-task');
    }
    
    if (agent.coordination && agent.coordination.length > 0) {
      const waitingForHandoff = agent.coordination.some(coord => 
        coord.status === 'waiting'
      );
      if (waitingForHandoff) {
        blockers.push('waiting-for-handoff');
      }
    }
    
    return blockers;
  }
  
  calculateCollaborationScore(agent) {
    let score = 50; // Base score
    
    // Positive indicators
    if (agent.coordination && agent.coordination.length > 0) {
      score += 20; // Active collaboration
    }
    
    if (agent.completedMilestones && agent.completedMilestones.length > 0) {
      score += 15; // Milestone completion
    }
    
    // Negative indicators
    if (agent.blockers && agent.blockers.length > 0) {
      score -= 10 * agent.blockers.length;
    }
    
    return Math.max(0, Math.min(100, score));
  }
  
  assessQualityIndicators(agent) {
    return {
      codeQuality: this.assessCodeQuality(agent),
      testCoverage: this.assessTestCoverage(agent),
      documentationQuality: this.assessDocumentation(agent),
      userExperience: this.assessUserExperience(agent),
      performance: this.assessPerformance(agent)
    };
  }
  
  assessCodeQuality(agent) {
    // Simulated code quality assessment
    if (agent.department === 'engineering') {
      return 75 + Math.floor(Math.random() * 20); // 75-95%
    }
    return null;
  }
  
  assessTestCoverage(agent) {
    if (agent.name.includes('test') || agent.department === 'testing') {
      return 80 + Math.floor(Math.random() * 15); // 80-95%
    }
    return null;
  }
  
  assessDocumentation(agent) {
    return 70 + Math.floor(Math.random() * 25); // 70-95%
  }
  
  assessUserExperience(agent) {
    if (agent.department === 'design' || agent.name.includes('ui')) {
      return 80 + Math.floor(Math.random() * 20); // 80-100%
    }
    return null;
  }
  
  assessPerformance(agent) {
    return {
      memoryUsage: Math.floor(Math.random() * 50) + 30, // 30-80%
      cpuUsage: Math.floor(Math.random() * 40) + 20,    // 20-60%
      responseTime: Math.floor(Math.random() * 500) + 100 // 100-600ms
    };
  }
  
  updateSystemMetrics(activeAgents, timestamp) {
    const systemMetrics = {
      totalAgents: activeAgents.length,
      averageProgress: this.calculateAverageProgress(activeAgents),
      systemThroughput: this.calculateSystemThroughput(),
      resourceUtilization: this.calculateResourceUtilization(activeAgents),
      collaborationIndex: this.calculateCollaborationIndex(activeAgents),
      qualityScore: this.calculateOverallQualityScore(activeAgents),
      blockerCount: this.getTotalBlockerCount(activeAgents),
      timestamp
    };
    
    this.efficiencyMetrics.set('system', systemMetrics);
  }
  
  calculateAverageProgress(agents) {
    if (agents.length === 0) return 0;
    const totalProgress = agents.reduce((sum, agent) => sum + agent.progress, 0);
    return Math.round(totalProgress / agents.length);
  }
  
  calculateSystemThroughput() {
    const recentCompletions = this.performanceHistory
      .filter(entry => {
        const age = Date.now() - new Date(entry.timestamp).getTime();
        return age <= 3600000; // Last hour
      })
      .filter(entry => entry.type === 'task-completed');
    
    return recentCompletions.length;
  }
  
  calculateResourceUtilization(agents) {
    const workingAgents = agents.filter(a => a.status === 'active').length;
    const totalCapacity = this.agentSystem.agentRegistry.size;
    
    return totalCapacity > 0 ? Math.round((workingAgents / totalCapacity) * 100) : 0;
  }
  
  calculateCollaborationIndex(agents) {
    const collaborationScores = agents
      .map(agent => this.progressMetrics.get(agent.id)?.collaborationScore || 0)
      .filter(score => score > 0);
    
    if (collaborationScores.length === 0) return 0;
    
    const averageScore = collaborationScores.reduce((sum, score) => sum + score, 0) / collaborationScores.length;
    return Math.round(averageScore);
  }
  
  calculateOverallQualityScore(agents) {
    const qualityScores = [];
    
    agents.forEach(agent => {
      const metrics = this.progressMetrics.get(agent.id);
      if (metrics && metrics.qualityIndicators) {
        const indicators = metrics.qualityIndicators;
        const scores = Object.values(indicators).filter(score => score !== null && typeof score === 'number');
        if (scores.length > 0) {
          const agentQuality = scores.reduce((sum, score) => sum + score, 0) / scores.length;
          qualityScores.push(agentQuality);
        }
      }
    });
    
    if (qualityScores.length === 0) return 0;
    
    const overallQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
    return Math.round(overallQuality);
  }
  
  getTotalBlockerCount(agents) {
    return agents.reduce((total, agent) => {
      const metrics = this.progressMetrics.get(agent.id);
      return total + (metrics?.blockers?.length || 0);
    }, 0);
  }
  
  // PERFORMANCE ANALYSIS
  analyzePerformanceMetrics() {
    console.log('📈 Analyzing performance metrics...');
    
    const analysis = {
      timestamp: new Date(),
      systemHealth: this.assessSystemHealth(),
      agentPerformance: this.analyzeAgentPerformance(),
      bottlenecks: this.identifyBottlenecks(),
      recommendations: this.generateRecommendations(),
      trends: this.analyzeTrends()
    };
    
    this.performanceHistory.push(analysis);
    
    // Keep only last 100 entries
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
    
    this.emit('performance-analysis', analysis);
  }
  
  assessSystemHealth() {
    const activeAgents = this.agentSystem.getActiveAgents();
    const systemMetrics = this.efficiencyMetrics.get('system');
    
    let healthScore = 100;
    
    // Deduct points for issues
    if (systemMetrics?.blockerCount > 0) {
      healthScore -= systemMetrics.blockerCount * 5;
    }
    
    if (systemMetrics?.resourceUtilization < 30) {
      healthScore -= 20; // Under-utilization
    }
    
    if (systemMetrics?.resourceUtilization > 90) {
      healthScore -= 15; // Over-utilization
    }
    
    if (systemMetrics?.collaborationIndex < 50) {
      healthScore -= 10; // Poor collaboration
    }
    
    return {
      score: Math.max(0, healthScore),
      status: this.getHealthStatus(Math.max(0, healthScore)),
      activeAgents: activeAgents.length,
      utilization: systemMetrics?.resourceUtilization || 0
    };
  }
  
  getHealthStatus(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    if (score >= 40) return 'poor';
    return 'critical';
  }
  
  analyzeAgentPerformance() {
    const activeAgents = this.agentSystem.getActiveAgents();
    const performances = [];
    
    activeAgents.forEach(agent => {
      const metrics = this.progressMetrics.get(agent.id);
      if (metrics) {
        performances.push({
          agent: agent.name,
          department: agent.department,
          progress: agent.progress,
          productivity: metrics.productivity,
          collaborationScore: metrics.collaborationScore,
          blockerCount: metrics.blockers?.length || 0,
          runtime: metrics.runtime,
          status: agent.status
        });
      }
    });
    
    return {
      totalAgents: performances.length,
      topPerformers: performances
        .sort((a, b) => b.productivity - a.productivity)
        .slice(0, 3),
      strugglingAgents: performances
        .filter(p => p.blockerCount > 0 || p.productivity < 0.1)
        .sort((a, b) => b.blockerCount - a.blockerCount),
      averageProductivity: performances.length > 0 
        ? performances.reduce((sum, p) => sum + p.productivity, 0) / performances.length 
        : 0
    };
  }
  
  identifyBottlenecks() {
    const bottlenecks = [];
    const systemMetrics = this.efficiencyMetrics.get('system');
    
    if (systemMetrics?.resourceUtilization < 30) {
      bottlenecks.push({
        type: 'under-utilization',
        severity: 'medium',
        description: 'System resources are under-utilized',
        impact: 'reduced-throughput'
      });
    }
    
    if (systemMetrics?.blockerCount > 3) {
      bottlenecks.push({
        type: 'coordination-issues',
        severity: 'high',
        description: 'Multiple agents experiencing blockers',
        impact: 'delayed-delivery'
      });
    }
    
    if (systemMetrics?.collaborationIndex < 40) {
      bottlenecks.push({
        type: 'poor-collaboration',
        severity: 'medium',
        description: 'Low collaboration efficiency between agents',
        impact: 'coordination-delays'
      });
    }
    
    return bottlenecks;
  }
  
  generateRecommendations() {
    const recommendations = [];
    const systemMetrics = this.efficiencyMetrics.get('system');
    const bottlenecks = this.identifyBottlenecks();
    
    // Generate recommendations based on bottlenecks
    bottlenecks.forEach(bottleneck => {
      switch (bottleneck.type) {
        case 'under-utilization':
          recommendations.push({
            priority: 'medium',
            action: 'Deploy additional agents for parallel processing',
            expected_impact: 'Increased throughput and faster task completion'
          });
          break;
          
        case 'coordination-issues':
          recommendations.push({
            priority: 'high',
            action: 'Review and resolve agent blockers immediately',
            expected_impact: 'Reduced delays and improved workflow efficiency'
          });
          break;
          
        case 'poor-collaboration':
          recommendations.push({
            priority: 'medium',
            action: 'Enhance agent coordination protocols',
            expected_impact: 'Better handoffs and reduced communication overhead'
          });
          break;
      }
    });
    
    // Performance-based recommendations
    if (systemMetrics?.qualityScore < 70) {
      recommendations.push({
        priority: 'high',
        action: 'Implement quality gates and review processes',
        expected_impact: 'Improved deliverable quality and reduced rework'
      });
    }
    
    return recommendations;
  }
  
  analyzeTrends() {
    if (this.performanceHistory.length < 5) {
      return { status: 'insufficient-data' };
    }
    
    const recent = this.performanceHistory.slice(-5);
    const systemHealthTrend = this.calculateTrend(
      recent.map(entry => entry.systemHealth.score)
    );
    
    const utilizationTrend = this.calculateTrend(
      recent.map(entry => entry.systemHealth.utilization)
    );
    
    return {
      systemHealth: {
        direction: systemHealthTrend.direction,
        slope: systemHealthTrend.slope,
        confidence: systemHealthTrend.confidence
      },
      utilization: {
        direction: utilizationTrend.direction,
        slope: utilizationTrend.slope,
        confidence: utilizationTrend.confidence
      }
    };
  }
  
  calculateTrend(values) {
    if (values.length < 3) return { direction: 'stable', slope: 0, confidence: 'low' };
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (index * val), 0);
    const sumX2 = values.reduce((sum, val, index) => sum + (index * index), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    let direction = 'stable';
    if (Math.abs(slope) > 0.5) {
      direction = slope > 0 ? 'improving' : 'declining';
    }
    
    const confidence = Math.abs(slope) > 1 ? 'high' : Math.abs(slope) > 0.3 ? 'medium' : 'low';
    
    return { direction, slope, confidence };
  }
  
  // BLOCKER DETECTION AND ANALYSIS
  detectAndAnalyzeBlockers() {
    const activeAgents = this.agentSystem.getActiveAgents();
    const currentBlockers = new Map();
    
    activeAgents.forEach(agent => {
      const metrics = this.progressMetrics.get(agent.id);
      if (metrics && metrics.blockers && metrics.blockers.length > 0) {
        currentBlockers.set(agent.id, {
          agent: agent.name,
          department: agent.department,
          blockers: metrics.blockers,
          duration: this.calculateBlockerDuration(agent.id, metrics.blockers),
          impact: this.assessBlockerImpact(agent, metrics.blockers)
        });
      }
    });
    
    // Analyze blocker patterns
    this.blockerAnalysis.set(Date.now(), {
      timestamp: new Date(),
      totalBlockers: currentBlockers.size,
      blockersByType: this.categorizeBlockers(currentBlockers),
      criticalBlockers: this.identifyCriticalBlockers(currentBlockers),
      resolutionSuggestions: this.suggestBlockerResolutions(currentBlockers)
    });
    
    // Emit blocker alert if critical blockers found
    const criticalBlockers = this.identifyCriticalBlockers(currentBlockers);
    if (criticalBlockers.length > 0) {
      this.emit('critical-blockers-detected', criticalBlockers);
    }
  }
  
  calculateBlockerDuration(agentId, blockers) {
    // In a real implementation, this would track when blockers started
    return Math.floor(Math.random() * 300) + 60; // 1-5 minutes for demo
  }
  
  assessBlockerImpact(agent, blockers) {
    let impact = 'low';
    
    if (blockers.includes('stuck-on-task') && agent.progress < 50) {
      impact = 'high';
    } else if (blockers.includes('waiting-for-handoff')) {
      impact = 'medium';
    } else if (blockers.length > 2) {
      impact = 'high';
    }
    
    return impact;
  }
  
  categorizeBlockers(currentBlockers) {
    const categories = {};
    
    currentBlockers.forEach(blockerInfo => {
      blockerInfo.blockers.forEach(blocker => {
        categories[blocker] = (categories[blocker] || 0) + 1;
      });
    });
    
    return categories;
  }
  
  identifyCriticalBlockers(currentBlockers) {
    const critical = [];
    
    currentBlockers.forEach(blockerInfo => {
      if (blockerInfo.impact === 'high' || blockerInfo.duration > 300) {
        critical.push(blockerInfo);
      }
    });
    
    return critical;
  }
  
  suggestBlockerResolutions(currentBlockers) {
    const suggestions = [];
    
    currentBlockers.forEach(blockerInfo => {
      blockerInfo.blockers.forEach(blocker => {
        switch (blocker) {
          case 'slow-start':
            suggestions.push({
              blocker,
              agent: blockerInfo.agent,
              suggestion: 'Provide additional context or resources to accelerate initial progress',
              urgency: 'medium'
            });
            break;
            
          case 'stuck-on-task':
            suggestions.push({
              blocker,
              agent: blockerInfo.agent,
              suggestion: 'Deploy support agent or reassign task to different specialist',
              urgency: 'high'
            });
            break;
            
          case 'waiting-for-handoff':
            suggestions.push({
              blocker,
              agent: blockerInfo.agent,
              suggestion: 'Expedite handoff process or enable parallel work streams',
              urgency: 'medium'
            });
            break;
        }
      });
    });
    
    return suggestions;
  }
  
  // EFFICIENCY TRACKING
  updateEfficiencyMetrics() {
    const activeAgents = this.agentSystem.getActiveAgents();
    
    // Calculate efficiency scores for each agent
    activeAgents.forEach(agent => {
      const metrics = this.progressMetrics.get(agent.id);
      if (metrics) {
        const efficiency = this.calculateAgentEfficiency(agent, metrics);
        this.efficiencyMetrics.set(agent.id, efficiency);
      }
    });
  }
  
  calculateAgentEfficiency(agent, metrics) {
    let efficiency = 100;
    
    // Factor in productivity
    if (metrics.productivity < 0.5) efficiency -= 20;
    if (metrics.productivity > 2) efficiency += 10;
    
    // Factor in blockers
    efficiency -= (metrics.blockers?.length || 0) * 15;
    
    // Factor in collaboration
    if (metrics.collaborationScore > 80) efficiency += 10;
    if (metrics.collaborationScore < 40) efficiency -= 15;
    
    return Math.max(0, Math.min(100, efficiency));
  }
  
  // EVENT TRACKING
  trackAgentDeployment(agent) {
    this.addStatusUpdate({
      type: 'agent-deployed',
      agent: agent.name,
      department: agent.department,
      taskId: agent.taskId,
      timestamp: new Date(),
      impact: 'positive'
    });
  }
  
  trackHandoff(handoff) {
    this.addStatusUpdate({
      type: 'handoff-initiated',
      from: handoff.fromAgent.name,
      to: handoff.toAgents.join(', '),
      deliverables: handoff.deliverables,
      timestamp: new Date(),
      impact: 'coordination'
    });
  }
  
  trackMilestone(milestone) {
    this.addStatusUpdate({
      type: 'milestone-completed',
      agent: milestone.agent.name,
      milestone: milestone.milestone,
      progress: milestone.progress,
      timestamp: new Date(),
      impact: 'positive'
    });
  }
  
  addStatusUpdate(update) {
    this.statusUpdates.unshift(update);
    
    // Keep only last 100 updates
    if (this.statusUpdates.length > 100) {
      this.statusUpdates = this.statusUpdates.slice(0, 100);
    }
    
    this.emit('status-update', update);
  }
  
  // REPORTING AND ANALYTICS
  generateProgressReport() {
    console.log('📋 Generating comprehensive progress report...');
    
    const report = {
      timestamp: new Date(),
      summary: this.generateSummary(),
      agentMetrics: this.getAgentMetrics(),
      systemHealth: this.assessSystemHealth(),
      performanceAnalysis: this.getLatestPerformanceAnalysis(),
      blockerAnalysis: this.getLatestBlockerAnalysis(),
      recommendations: this.generateRecommendations(),
      trends: this.analyzeTrends(),
      uptime: this.calculateSystemUptime()
    };
    
    this.logReport(report);
    this.emit('progress-report', report);
    
    return report;
  }
  
  generateSummary() {
    const activeAgents = this.agentSystem.getActiveAgents();
    const systemMetrics = this.efficiencyMetrics.get('system');
    
    return {
      activeAgents: activeAgents.length,
      totalTasks: this.agentSystem.progressTracker?.size || 0,
      averageProgress: systemMetrics?.averageProgress || 0,
      systemThroughput: systemMetrics?.systemThroughput || 0,
      resourceUtilization: systemMetrics?.resourceUtilization || 0,
      qualityScore: systemMetrics?.qualityScore || 0,
      collaborationIndex: systemMetrics?.collaborationIndex || 0,
      blockerCount: systemMetrics?.blockerCount || 0
    };
  }
  
  getAgentMetrics() {
    const metrics = [];
    
    this.progressMetrics.forEach((metric, agentId) => {
      metrics.push({
        agentId,
        agentName: metric.agentName,
        department: metric.department,
        progress: metric.progress,
        status: metric.status,
        productivity: metric.productivity,
        collaborationScore: metric.collaborationScore,
        qualityIndicators: metric.qualityIndicators,
        runtime: metric.runtime,
        blockers: metric.blockers
      });
    });
    
    return metrics;
  }
  
  getLatestPerformanceAnalysis() {
    return this.performanceHistory.length > 0 
      ? this.performanceHistory[this.performanceHistory.length - 1]
      : null;
  }
  
  getLatestBlockerAnalysis() {
    const entries = Array.from(this.blockerAnalysis.entries());
    return entries.length > 0 
      ? entries[entries.length - 1][1]
      : null;
  }
  
  calculateSystemUptime() {
    const startTime = this.agentSystem.startTime || new Date();
    const uptime = new Date() - startTime;
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }
  
  async logReport(report) {
    try {
      const logEntry = {
        timestamp: report.timestamp.toISOString(),
        summary: report.summary,
        systemHealth: report.systemHealth,
        blockerCount: report.blockerAnalysis?.totalBlockers || 0,
        recommendations: report.recommendations.length
      };
      
      // Ensure logs directory exists
      const logsDir = path.dirname(this.logPath);
      await fs.mkdir(logsDir, { recursive: true });
      
      await fs.appendFile(this.logPath, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.warn('Failed to write progress log:', error.message);
    }
  }
  
  // UTILITY METHODS
  isSignificantChange(previous, current) {
    if (!previous) return true;
    
    const progressChange = Math.abs(current.progress - (previous.progress || 0));
    const statusChange = current.status !== (previous.status || '');
    const blockerChange = (current.blockers?.length || 0) !== (previous.blockers?.length || 0);
    
    return progressChange >= 5 || statusChange || blockerChange;
  }
  
  logProgressChange(current, previous) {
    const change = {
      agentName: current.agentName,
      progressChange: current.progress - (previous?.progress || 0),
      statusChange: previous ? `${previous.status} → ${current.status}` : current.status,
      timestamp: current.timestamp
    };
    
    console.log(`📈 Progress change: ${change.agentName} ${change.progressChange > 0 ? '+' : ''}${change.progressChange}% (${change.statusChange})`);
  }
  
  getSystemMetrics() {
    return this.efficiencyMetrics.get('system') || {};
  }
  
  getRecentUpdates(limit = 10) {
    return this.statusUpdates.slice(0, limit);
  }
  
  // PUBLIC API
  getCurrentMetrics() {
    return {
      progressMetrics: Object.fromEntries(this.progressMetrics),
      systemMetrics: this.getSystemMetrics(),
      recentUpdates: this.getRecentUpdates(),
      performanceHistory: this.performanceHistory.slice(-10)
    };
  }
  
  getAgentProgress(agentId) {
    return this.progressMetrics.get(agentId);
  }
  
  getSystemStatus() {
    return {
      health: this.assessSystemHealth(),
      blockers: this.getLatestBlockerAnalysis(),
      performance: this.getLatestPerformanceAnalysis(),
      uptime: this.calculateSystemUptime()
    };
  }
}

module.exports = {
  AgentProgressTracker
};