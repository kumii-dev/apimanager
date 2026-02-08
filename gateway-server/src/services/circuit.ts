/**
 * Circuit Breaker Service
 * ISO 27001 A.17.2 - Continuity and Recovery
 * Implements circuit breaker pattern for resilience
 */

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  enabled: boolean;
  failureThreshold: number; // Number of failures before opening
  successThreshold?: number; // Successes in half-open before closing
  resetTimeoutMs: number; // Time before trying half-open
}

/**
 * Circuit breaker statistics
 */
export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure?: Date;
  lastSuccess?: Date;
  nextRetry?: Date;
}

/**
 * Circuit Breaker implementation
 * Protects against cascading failures
 * 
 * @class CircuitBreaker
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextRetryTime?: Date;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig
  ) {
    if (!config.enabled) {
      // Always closed if disabled
      this.state = CircuitState.CLOSED;
    }
  }

  /**
   * Execute function with circuit breaker protection
   * 
   * @param fn - Function to execute
   * @returns Promise with result
   * @throws Error if circuit is open
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return fn();
    }

    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      // Check if we should try half-open
      if (this.nextRetryTime && new Date() >= this.nextRetryTime) {
        this.state = CircuitState.HALF_OPEN;
        this.successes = 0;
      } else {
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.lastSuccessTime = new Date();
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      const threshold = this.config.successThreshold || 2;
      
      if (this.successes >= threshold) {
        // Recovered, close circuit
        this.state = CircuitState.CLOSED;
        this.successes = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.lastFailureTime = new Date();
    this.failures++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed while testing, reopen circuit
      this.openCircuit();
    } else if (this.failures >= this.config.failureThreshold) {
      // Threshold reached, open circuit
      this.openCircuit();
    }
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    this.state = CircuitState.OPEN;
    this.nextRetryTime = new Date(Date.now() + this.config.resetTimeoutMs);
    this.successes = 0;
  }

  /**
   * Get circuit statistics
   */
  getStats(): CircuitStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailureTime,
      lastSuccess: this.lastSuccessTime,
      nextRetry: this.nextRetryTime,
    };
  }

  /**
   * Check if circuit is allowing requests
   */
  isAvailable(): boolean {
    if (!this.config.enabled) {
      return true;
    }

    if (this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN) {
      return true;
    }

    // Check if we should try half-open
    if (this.nextRetryTime && new Date() >= this.nextRetryTime) {
      return true;
    }

    return false;
  }

  /**
   * Reset circuit breaker (admin action)
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextRetryTime = undefined;
  }

  /**
   * Get circuit name
   */
  getName(): string {
    return this.name;
  }
}

/**
 * Circuit Breaker Registry
 * Manages circuit breakers for multiple connectors
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Get or create circuit breaker for connector
   * 
   * @param connectorId - Connector ID
   * @param config - Circuit breaker config
   * @returns Circuit breaker instance
   */
  getBreaker(connectorId: string, config: CircuitBreakerConfig): CircuitBreaker {
    let breaker = this.breakers.get(connectorId);
    
    if (!breaker) {
      breaker = new CircuitBreaker(connectorId, config);
      this.breakers.set(connectorId, breaker);
    }
    
    return breaker;
  }

  /**
   * Get all circuit breakers
   */
  getAllBreakers(): Map<string, CircuitBreaker> {
    return this.breakers;
  }

  /**
   * Get stats for all breakers
   */
  getAllStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};
    
    for (const [id, breaker] of this.breakers.entries()) {
      stats[id] = breaker.getStats();
    }
    
    return stats;
  }

  /**
   * Reset specific breaker
   */
  resetBreaker(connectorId: string): boolean {
    const breaker = this.breakers.get(connectorId);
    if (breaker) {
      breaker.reset();
      return true;
    }
    return false;
  }

  /**
   * Reset all breakers (emergency action)
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }
}

/**
 * Singleton registry
 */
export const circuitBreakerRegistry = new CircuitBreakerRegistry();
