/**
 * Deployment Queue System
 * Prevents concurrent deployment conflicts and manages deployment state
 */

class DeploymentQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.activeDeployments = new Map();
    this.maxConcurrent = 1; // Only one deployment at a time to prevent conflicts
  }

  /**
   * Add deployment to queue
   */
  async enqueue(deploymentTask) {
    return new Promise((resolve, reject) => {
      const queueItem = {
        id: `deployment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        task: deploymentTask,
        resolve,
        reject,
        createdAt: new Date(),
        status: 'queued'
      };
      
      this.queue.push(queueItem);
      console.log(`🔄 Deployment queued: ${queueItem.id}`);
      
      this.processQueue();
    });
  }

  /**
   * Process deployment queue
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    while (this.queue.length > 0 && this.activeDeployments.size < this.maxConcurrent) {
      const queueItem = this.queue.shift();
      this.executeDeployment(queueItem);
    }
    
    this.processing = false;
  }

  /**
   * Execute individual deployment
   */
  async executeDeployment(queueItem) {
    try {
      console.log(`🚀 Starting deployment: ${queueItem.id}`);
      
      queueItem.status = 'processing';
      this.activeDeployments.set(queueItem.id, queueItem);
      
      // Execute the deployment task
      const result = await queueItem.task();
      
      console.log(`✅ Deployment completed: ${queueItem.id}`);
      queueItem.resolve(result);
      
    } catch (error) {
      console.error(`❌ Deployment failed: ${queueItem.id}`, error);
      queueItem.reject(error);
      
    } finally {
      // Clean up
      this.activeDeployments.delete(queueItem.id);
      
      // Process next item in queue
      setTimeout(() => this.processQueue(), 1000); // 1 second delay between deployments
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queued: this.queue.length,
      active: this.activeDeployments.size,
      processing: this.processing
    };
  }

  /**
   * Clear failed deployments
   */
  clearQueue() {
    this.queue.length = 0;
    this.activeDeployments.clear();
    this.processing = false;
  }
}

// Singleton instance
const deploymentQueue = new DeploymentQueue();

module.exports = deploymentQueue;