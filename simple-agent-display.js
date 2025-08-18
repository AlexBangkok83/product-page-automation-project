/**
 * Simple Agent Display System
 * Shows clean agent badges in chat without complex automation
 */

class SimpleAgentDisplay {
  constructor() {
    this.currentAgent = null;
    this.agentColors = {
      'studio-producer': 'green',
      'studio-coach': 'red', 
      'backend-architect': 'purple',
      'frontend-developer': 'blue',
      'ui-designer': 'cyan',
      'test-writer-fixer': 'yellow',
      'devops-automator': 'orange',
      'rapid-prototyper': 'magenta',
      'whimsy-injector': 'pink',
      'brand-guardian': 'indigo',
      'legal-compliance-checker': 'gray'
    };
  }

  // Set which agent is currently working
  setAgent(agentName, task = '') {
    this.currentAgent = {
      name: agentName,
      task: task,
      color: this.agentColors[agentName] || 'blue',
      startTime: new Date()
    };
    
    this.displayAgent();
  }

  // Display the current agent badge
  displayAgent() {
    if (!this.currentAgent) return;
    
    const badge = this.createBadge(
      this.currentAgent.name, 
      this.currentAgent.color
    );
    
    const taskText = this.currentAgent.task ? 
      ` - ${this.currentAgent.task}` : '';
    
    console.log(`${badge}${taskText}`);
  }

  // Create colored badge for agent
  createBadge(agentName, color) {
    const colors = {
      'red': '\x1b[41m\x1b[37m',
      'green': '\x1b[42m\x1b[37m', 
      'blue': '\x1b[44m\x1b[37m',
      'purple': '\x1b[45m\x1b[37m',
      'cyan': '\x1b[46m\x1b[30m',
      'yellow': '\x1b[43m\x1b[30m',
      'orange': '\x1b[48;5;208m\x1b[37m',
      'magenta': '\x1b[105m\x1b[37m',
      'pink': '\x1b[48;5;213m\x1b[37m',
      'indigo': '\x1b[48;5;54m\x1b[37m',
      'gray': '\x1b[100m\x1b[37m'
    };
    
    const colorCode = colors[color] || colors['blue'];
    const reset = '\x1b[0m';
    
    return `${colorCode} ${agentName} ${reset}`;
  }

  // Mark task as completed
  completeTask(summary = '') {
    if (!this.currentAgent) return;
    
    const duration = Math.round((new Date() - this.currentAgent.startTime) / 1000);
    const badge = this.createBadge(this.currentAgent.name, this.currentAgent.color);
    
    console.log(`${badge} ✅ Done (${duration}s)${summary ? ` - ${summary}` : ''}`);
    this.currentAgent = null;
  }

  // Get current agent info
  getCurrentAgent() {
    return this.currentAgent;
  }
}

// Export singleton instance
const agentDisplay = new SimpleAgentDisplay();

module.exports = {
  SimpleAgentDisplay,
  agentDisplay,
  
  // Convenience functions
  setAgent: (name, task) => agentDisplay.setAgent(name, task),
  completeTask: (summary) => agentDisplay.completeTask(summary),
  getCurrentAgent: () => agentDisplay.getCurrentAgent()
};