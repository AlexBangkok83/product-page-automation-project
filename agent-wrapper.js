/**
 * Agent Wrapper - Integrates simple agent display into Claude Code workflow
 */

const { setAgent, completeTask } = require('./simple-agent-display.js');

class AgentWrapper {
  constructor() {
    this.activeAgent = null;
    this.taskStartTime = null;
  }

  // Start working as a specific agent
  startWork(agentName, taskDescription) {
    this.activeAgent = agentName;
    this.taskStartTime = new Date();
    setAgent(agentName, taskDescription);
    return this;
  }

  // Complete current task
  finishWork(summary = '') {
    if (this.activeAgent) {
      completeTask(summary);
      this.activeAgent = null;
      this.taskStartTime = null;
    }
    return this;
  }

  // Switch to different agent mid-task
  handoff(newAgentName, newTaskDescription) {
    if (this.activeAgent) {
      completeTask(`Handing off to ${newAgentName}`);
    }
    return this.startWork(newAgentName, newTaskDescription);
  }
}

// Global instance for easy access
const agentWrapper = new AgentWrapper();

module.exports = {
  AgentWrapper,
  agentWrapper,
  
  // Convenience functions for immediate use
  startWork: (agent, task) => agentWrapper.startWork(agent, task),
  finishWork: (summary) => agentWrapper.finishWork(summary),
  handoff: (agent, task) => agentWrapper.handoff(agent, task)
};