// Simple event emitter for cross-component communication
type EventType = 
  | 'scanUpdated' 
  | 'reportDeleted' 
  | 'reportCreated'
  | 'dashboardRefreshNeeded'
  | 'dataChanged';

type EventCallback = (data?: any) => void;

class EventEmitter {
  private events: Map<EventType, EventCallback[]> = new Map();

  on(event: EventType, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: EventType, callback: EventCallback): void {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event: EventType, data?: any): void {
    const listeners = this.events.get(event);
    if (listeners) {
      // Copy array to avoid issues if callbacks modify the array
      [...listeners].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  once(event: EventType, callback: EventCallback): void {
    const onceCallback: EventCallback = (data) => {
      this.off(event, onceCallback);
      callback(data);
    };
    this.on(event, onceCallback);
  }

  // Clear all listeners for an event
  clear(event: EventType): void {
    this.events.delete(event);
  }

  // Clear all events
  clearAll(): void {
    this.events.clear();
  }
}

// Global event emitter instance
export const events = new EventEmitter();

// Predefined event types for common actions
export const EventTypes = {
  SCAN_UPDATED: 'scanUpdated' as EventType,
  REPORT_DELETED: 'reportDeleted' as EventType,
  REPORT_CREATED: 'reportCreated' as EventType,
  DASHBOARD_REFRESH: 'dashboardRefreshNeeded' as EventType,
  DATA_CHANGED: 'dataChanged' as EventType,
};

// Helper function to emit dashboard refresh
export const triggerDashboardRefresh = (): void => {
  events.emit(EventTypes.DASHBOARD_REFRESH);
  events.emit(EventTypes.DATA_CHANGED, { source: 'dashboard', timestamp: new Date() });
};