/**
 * Transform Service
 * ISO 27001 A.14.2 - Secure Development
 * Safe transformation DSL for request/response manipulation
 */

import { z } from 'zod';

/**
 * Transform operation types (safe subset)
 */
export enum TransformOperationType {
  SET = 'set', // Set value
  REMOVE = 'remove', // Remove field
  RENAME = 'rename', // Rename field
  MAP = 'map', // Map array
  DEFAULT = 'default', // Set default if missing
}

/**
 * Transform operation schema
 */
const transformOperationSchema = z.object({
  type: z.nativeEnum(TransformOperationType),
  path: z.string(), // JSONPath-like, e.g., "body.user.name"
  value: z.any().optional(), // For SET, DEFAULT
  newPath: z.string().optional(), // For RENAME
  mapField: z.string().optional(), // For MAP
});

/**
 * Transform configuration schema
 */
const transformConfigSchema = z.array(transformOperationSchema);

export type TransformOperation = z.infer<typeof transformOperationSchema>;
export type TransformConfig = z.infer<typeof transformConfigSchema>;

/**
 * Transform Service
 * Safely transform request/response data
 * 
 * Security:
 * - No eval or code execution
 * - Limited operations (allowlist)
 * - Path validation
 * - No prototype pollution
 * 
 * @class TransformService
 */
export class TransformService {
  /**
   * Validate transform configuration
   * 
   * @param config - Transform config to validate
   * @throws Error if invalid
   */
  validateConfig(config: any): TransformConfig {
    try {
      return transformConfigSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new Error(`Invalid transform config: ${messages.join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Apply transformations to data
   * 
   * @param data - Data to transform
   * @param config - Transform configuration
   * @returns Transformed data
   */
  apply(data: any, config: TransformConfig | null | undefined): any {
    if (!config || config.length === 0) {
      return data;
    }

    // Validate config
    const validated = this.validateConfig(config);

    // Clone data to avoid mutations
    let result = this.deepClone(data);

    // Apply each operation
    for (const operation of validated) {
      result = this.applyOperation(result, operation);
    }

    return result;
  }

  /**
   * Apply single transformation operation
   * 
   * @param data - Data to transform
   * @param operation - Transform operation
   * @returns Transformed data
   */
  private applyOperation(data: any, operation: TransformOperation): any {
    switch (operation.type) {
      case TransformOperationType.SET:
        return this.setValueAtPath(data, operation.path, operation.value);
      
      case TransformOperationType.REMOVE:
        return this.removeValueAtPath(data, operation.path);
      
      case TransformOperationType.RENAME:
        if (!operation.newPath) {
          throw new Error('RENAME operation requires newPath');
        }
        return this.renameField(data, operation.path, operation.newPath);
      
      case TransformOperationType.DEFAULT:
        return this.setDefaultAtPath(data, operation.path, operation.value);
      
      case TransformOperationType.MAP:
        if (!operation.mapField) {
          throw new Error('MAP operation requires mapField');
        }
        return this.mapArray(data, operation.path, operation.mapField);
      
      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }
  }

  /**
   * Set value at path
   * 
   * @param data - Data object
   * @param path - Dot-notation path
   * @param value - Value to set
   * @returns Modified data
   */
  private setValueAtPath(data: any, path: string, value: any): any {
    const parts = this.parsePath(path);
    let current = data;

    // Navigate to parent
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!(part in current)) {
        // Create intermediate objects
        current[part] = {};
      }
      
      current = current[part];
    }

    // Set value
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;

    return data;
  }

  /**
   * Remove value at path
   * 
   * @param data - Data object
   * @param path - Dot-notation path
   * @returns Modified data
   */
  private removeValueAtPath(data: any, path: string): any {
    const parts = this.parsePath(path);
    let current = data;

    // Navigate to parent
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      if (!(part in current)) {
        return data; // Path doesn't exist
      }
      
      current = current[part];
    }

    // Remove value
    const lastPart = parts[parts.length - 1];
    delete current[lastPart];

    return data;
  }

  /**
   * Rename field
   * 
   * @param data - Data object
   * @param oldPath - Old path
   * @param newPath - New path
   * @returns Modified data
   */
  private renameField(data: any, oldPath: string, newPath: string): any {
    const value = this.getValueAtPath(data, oldPath);
    
    if (value !== undefined) {
      data = this.setValueAtPath(data, newPath, value);
      data = this.removeValueAtPath(data, oldPath);
    }

    return data;
  }

  /**
   * Set default value if path doesn't exist
   * 
   * @param data - Data object
   * @param path - Dot-notation path
   * @param defaultValue - Default value
   * @returns Modified data
   */
  private setDefaultAtPath(data: any, path: string, defaultValue: any): any {
    const value = this.getValueAtPath(data, path);
    
    if (value === undefined) {
      return this.setValueAtPath(data, path, defaultValue);
    }

    return data;
  }

  /**
   * Map array to extract field
   * 
   * @param data - Data object
   * @param arrayPath - Path to array
   * @param mapField - Field to extract
   * @returns Modified data
   */
  private mapArray(data: any, arrayPath: string, mapField: string): any {
    const array = this.getValueAtPath(data, arrayPath);
    
    if (Array.isArray(array)) {
      const mapped = array.map((item: any) => {
        if (typeof item === 'object' && item !== null) {
          return item[mapField];
        }
        return item;
      });
      
      return this.setValueAtPath(data, arrayPath, mapped);
    }

    return data;
  }

  /**
   * Get value at path
   * 
   * @param data - Data object
   * @param path - Dot-notation path
   * @returns Value or undefined
   */
  private getValueAtPath(data: any, path: string): any {
    const parts = this.parsePath(path);
    let current = data;

    for (const part of parts) {
      if (typeof current !== 'object' || current === null || !(part in current)) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Parse path string into parts
   * Validates against prototype pollution
   * 
   * @param path - Dot-notation path
   * @returns Path parts
   */
  private parsePath(path: string): string[] {
    if (!path || typeof path !== 'string') {
      throw new Error('Invalid path');
    }

    const parts = path.split('.');

    // Prevent prototype pollution
    for (const part of parts) {
      if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
        throw new Error(`Dangerous path segment: ${part}`);
      }
    }

    return parts;
  }

  /**
   * Deep clone object (safe)
   * 
   * @param obj - Object to clone
   * @returns Cloned object
   */
  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }

    const cloned: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }
}

/**
 * Singleton instance
 */
export const transformService = new TransformService();
