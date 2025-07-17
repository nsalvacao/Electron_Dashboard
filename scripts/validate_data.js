const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
require('ajv-formats')(ajv);
const fs = require('fs').promises;
const path = require('path');
const { URL } = require('url');

// --- JSON SCHEMAS ---
const APP_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    required: ["name", "path", "tags"],
    properties: {
      name: { type: "string", minLength: 1 },
      path: { type: "string", minLength: 1 },
      version: { type: "string", nullable: true },
      publisher: { type: "string", nullable: true },
      tags: { type: "array", items: { type: "string" } },
      category: { type: "string", nullable: true },
      lastModified: { type: "string", format: "date-time", nullable: true },
      fileSize: { type: "number", minimum: 0, nullable: true }
    },
    additionalProperties: false
  }
};

const BOOKMARK_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    required: ["name", "url", "browser"],
    properties: {
      name: { type: "string", minLength: 1 },
      url: { type: "string", format: "uri" },
      category: { type: "string", nullable: true },
      tags: { type: "array", items: { type: "string" } },
      favicon: { type: "string", nullable: true }, // Base64 or path
      browser: { type: "string", minLength: 1 },
      dateAdded: { type: "string", format: "date-time", nullable: true },
      lastVisited: { type: "string", format: "date-time", nullable: true }
    },
    additionalProperties: false
  }
};

// Custom apps can be simpler, as they are manually managed
const CUSTOM_APP_SCHEMA = {
  type: "array",
  items: {
    type: "object",
    required: ["name", "path"],
    properties: {
      name: { type: "string", minLength: 1 },
      path: { type: "string", minLength: 1 },
      icon: { type: "string", nullable: true }, // Path to custom icon
      tags: { type: "array", items: { type: "string" } },
      category: { type: "string", nullable: true }
    },
    additionalProperties: false
  }
};

class DataValidator {
  constructor() {
    this.validators = {
      apps: ajv.compile(APP_SCHEMA),
      bookmarks: ajv.compile(BOOKMARK_SCHEMA),
      customApps: ajv.compile(CUSTOM_APP_SCHEMA)
    };
  }

  _log(level, message) {
    console.log(`[${new Date().toISOString()}] [${level}] - ${message}`);
  }

  async _checkFileExists(filePath) {
    try {
      await fs.access(filePath, fs.constants.F_OK);
      return true;
    } catch (e) {
      return false;
    }
  }

  _isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  async validate(data, type) {
    const validateFn = this.validators[type];
    if (!validateFn) {
      throw new Error(`No validator found for type: ${type}`);
    }

    const isValid = validateFn(data);
    const errors = isValid ? [] : validateFn.errors;
    const warnings = [];

    // --- Advanced Validation ---
    const uniqueChecker = new Set();

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // Path Validation (for apps and customApps)
      if (type === 'apps' || type === 'customApps') {
        if (item.path && !(await this._checkFileExists(item.path))) {
          warnings.push({ message: `Path does not exist: ${item.path}`, itemIndex: i, field: 'path' });
        }
        // Normalize path separators for consistency
        if (item.path) {
          item.path = item.path.replace(/\\/g, '/');
        }
      }

      // URL Validation (for bookmarks)
      if (type === 'bookmarks') {
        if (item.url && !this._isValidUrl(item.url)) {
          warnings.push({ message: `Invalid URL format: ${item.url}`, itemIndex: i, field: 'url' });
        }
      }

      // Duplicate Detection
      const uniqueKey = type === 'apps' || type === 'customApps' ? item.path : item.url;
      if (uniqueKey) {
        if (uniqueChecker.has(uniqueKey)) {
          warnings.push({ message: `Duplicate entry detected: ${uniqueKey}`, itemIndex: i, field: 'duplicate' });
        } else {
          uniqueChecker.add(uniqueKey);
        }
      }

      // Check for empty tags array
      if (item.tags && item.tags.length === 0) {
        warnings.push({ message: `Empty tags array for item: ${item.name}`, itemIndex: i, field: 'tags' });
      }
    }

    return {
      valid: isValid && warnings.length === 0,
      schemaErrors: errors,
      integrityWarnings: warnings,
      repairedData: null // Will be set by repairData
    };
  }

  async validateApps(data) { return this.validate(data, 'apps'); }
  async validateBookmarks(data) { return this.validate(data, 'bookmarks'); }
  async validateCustomApps(data) { return this.validate(data, 'customApps'); }

  async repairData(data, type) {
    this._log('INFO', `Attempting to repair data for type: ${type}`);
    const repairedData = JSON.parse(JSON.stringify(data)); // Deep copy
    const repairReport = [];

    const uniqueChecker = new Set();
    const toRemoveIndices = new Set();

    for (let i = 0; i < repairedData.length; i++) {
      const item = repairedData[i];

      // Path Normalization (for apps and customApps)
      if (type === 'apps' || type === 'customApps') {
        if (item.path) {
          const originalPath = item.path;
          item.path = item.path.replace(/\\/g, '/');
          if (originalPath !== item.path) {
            repairReport.push({ message: `Normalized path for ${item.name}: ${originalPath} -> ${item.path}`, itemIndex: i, field: 'path' });
          }
        }
        // Remove if path does not exist
        if (item.path && !(await this._checkFileExists(item.path))) {
          toRemoveIndices.add(i);
          repairReport.push({ message: `Removed item due to non-existent path: ${item.name} (${item.path})`, itemIndex: i, field: 'path' });
        }
      }

      // URL Normalization (for bookmarks)
      if (type === 'bookmarks') {
        if (item.url && !this._isValidUrl(item.url)) {
          toRemoveIndices.add(i);
          repairReport.push({ message: `Removed item due to invalid URL: ${item.name} (${item.url})`, itemIndex: i, field: 'url' });
        }
      }

      // Duplicate Removal
      const uniqueKey = type === 'apps' || type === 'customApps' ? item.path : item.url;
      if (uniqueKey) {
        if (uniqueChecker.has(uniqueKey)) {
          toRemoveIndices.add(i);
          repairReport.push({ message: `Removed duplicate entry: ${item.name} (${uniqueKey})`, itemIndex: i, field: 'duplicate' });
        } else {
          uniqueChecker.add(uniqueKey);
        }
      }

      // Repair missing name property
      if (item.name === undefined || item.name === null || (typeof item.name === 'string' && item.name.trim() === '')) {
        if (item.path) {
          item.name = path.basename(item.path, path.extname(item.path));
          repairReport.push({ message: `Repaired missing/empty name for item with path: ${item.path}. New name: ${item.name}`, itemIndex: i, field: 'name' });
        } else {
          item.name = 'Unnamed App';
          repairReport.push({ message: `Repaired missing/empty name for item. New name: ${item.name}`, itemIndex: i, field: 'name' });
        }
      }

      // Ensure tags is an array (even if empty)
      if (!Array.isArray(item.tags)) {
        item.tags = [];
        repairReport.push({ message: `Converted tags to empty array for ${item.name}`, itemIndex: i, field: 'tags' });
      }

      // Fill empty tags array with 'General' if it's an app
      if ((type === 'apps' || type === 'customApps') && Array.isArray(item.tags) && item.tags.length === 0) {
        item.tags.push('General');
        repairReport.push({ message: `Added 'General' tag to empty tags array for ${item.name}`, itemIndex: i, field: 'tags' });
      }
    }

    // Filter out removed items
    const finalRepairedData = repairedData.filter((_, index) => !toRemoveIndices.has(index));

    this._log('INFO', `Repair completed for type: ${type}. ${repairReport.length} issues repaired.`);
    return { repairedData: finalRepairedData, repairReport };
  }

  async generateReport(validationResult) {
    let report = `--- Data Validation Report ---\n`;
    report += `Timestamp: ${new Date().toISOString()}\n`;
    report += `Overall Validity: ${validationResult.valid ? 'VALID' : 'INVALID'}\n\n`;

    if (validationResult.schemaErrors && validationResult.schemaErrors.length > 0) {
      report += `Schema Errors (${validationResult.schemaErrors.length}):\n`;
      validationResult.schemaErrors.forEach(err => {
        report += `- ${err.instancePath}: ${err.message} (Value: ${JSON.stringify(err.data)})\n`;
      });
      report += `\n`;
    }

    if (validationResult.integrityWarnings && validationResult.integrityWarnings.length > 0) {
      report += `Integrity Warnings (${validationResult.integrityWarnings.length}):\n`;
      validationResult.integrityWarnings.forEach(warn => {
        report += `- [${warn.field}] ${warn.message} (Item Index: ${warn.itemIndex})\n`;
      });
      report += `\n`;
    }

    if (validationResult.repairedData) {
      report += `Repair Attempted: YES\n`;
      if (validationResult.repairReport && validationResult.repairReport.length > 0) {
        report += `Repair Report (${validationResult.repairReport.length} issues):\n`;
        validationResult.repairReport.forEach(rep => {
          report += `- [${rep.field}] ${rep.message} (Item Index: ${rep.itemIndex})\n`;
        });
      } else {
        report += `No specific repairs were needed or performed.\n`;
      }
      report += `\n`;
    }

    return report;
  }

  async backupCorrupted(data, type, outputPath = 'C:\\GitHub\\Nexo_Dashboard\\data') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${type}_corrupted_backup_${timestamp}.json`;
    const backupPath = path.join(outputPath, backupFileName);
    try {
      await fs.writeFile(backupPath, JSON.stringify(data, null, 2), 'utf8');
      this._log('INFO', `Corrupted data for ${type} backed up to: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this._log('ERROR', `Failed to backup corrupted data for ${type}: ${error.message}`);
      return null;
    }
  }
}

module.exports = DataValidator;
