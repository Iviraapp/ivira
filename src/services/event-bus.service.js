import { EventEmitter } from 'events';

class GymEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(500); // Support many concurrent SSE connections
  }

  publish(gymId, eventType, data) {
    this.emit(`gym:${gymId}`, { type: eventType, data, timestamp: new Date().toISOString() });
    this.emit('global', { gymId, type: eventType, data, timestamp: new Date().toISOString() });
  }

  subscribeGym(gymId, callback) {
    this.on(`gym:${gymId}`, callback);
    return () => this.off(`gym:${gymId}`, callback);
  }

  subscribeGlobal(callback) {
    this.on('global', callback);
    return () => this.off('global', callback);
  }
}

const eventBus = new GymEventBus();
export default eventBus;
