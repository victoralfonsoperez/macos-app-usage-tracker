const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

class Database {
  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'usage_tracking.db');
    this.db = new sqlite3.Database(dbPath);
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create usage_logs table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            app_name TEXT NOT NULL,
            duration_seconds INTEGER NOT NULL,
            logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            date TEXT NOT NULL
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database initialized successfully');
            resolve();
          }
        });
      });
    });
  }

  async logUsage(appName, durationSeconds) {
    return new Promise((resolve, reject) => {
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      this.db.run(
        `INSERT INTO usage_logs (app_name, duration_seconds, date) VALUES (?, ?, ?)`,
        [appName, durationSeconds, date],
        function(err) {
          if (err) {
            reject(err);
          } else {
            console.log(`Logged ${durationSeconds}s for ${appName}`);
            resolve(this.lastID);
          }
        }
      );
    });
  }

  async getUsageStats(period = 'today') {
    return new Promise((resolve, reject) => {
      let query;
      let params = [];

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      switch (period) {
        case 'today':
          query = `
            SELECT app_name, SUM(duration_seconds) as total_seconds, COUNT(*) as session_count
            FROM usage_logs 
            WHERE date = ?
            GROUP BY app_name 
            ORDER BY total_seconds DESC
          `;
          params = [today];
          break;
        
        case 'yesterday':
          query = `
            SELECT app_name, SUM(duration_seconds) as total_seconds, COUNT(*) as session_count
            FROM usage_logs 
            WHERE date = ?
            GROUP BY app_name 
            ORDER BY total_seconds DESC
          `;
          params = [yesterday];
          break;
        
        case 'week':
          query = `
            SELECT app_name, SUM(duration_seconds) as total_seconds, COUNT(*) as session_count
            FROM usage_logs 
            WHERE date >= ?
            GROUP BY app_name 
            ORDER BY total_seconds DESC
          `;
          params = [weekAgo];
          break;
        
        case 'all':
          query = `
            SELECT app_name, SUM(duration_seconds) as total_seconds, COUNT(*) as session_count
            FROM usage_logs 
            GROUP BY app_name 
            ORDER BY total_seconds DESC
          `;
          break;
        
        default:
          query = `
            SELECT app_name, SUM(duration_seconds) as total_seconds, COUNT(*) as session_count
            FROM usage_logs 
            WHERE date = ?
            GROUP BY app_name 
            ORDER BY total_seconds DESC
          `;
          params = [today];
      }

      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Convert seconds to more readable format and add percentages
          const totalTime = rows.reduce((sum, row) => sum + row.total_seconds, 0);
          
          const formattedRows = rows.map(row => ({
            appName: row.app_name,
            totalSeconds: row.total_seconds,
            sessionCount: row.session_count,
            totalTime: this.formatDuration(row.total_seconds),
            percentage: totalTime > 0 ? Math.round((row.total_seconds / totalTime) * 100) : 0
          }));

          resolve({
            apps: formattedRows,
            totalTime: this.formatDuration(totalTime),
            totalSeconds: totalTime,
            period: period
          });
        }
      });
    });
  }

  async getDailyStats(days = 7) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT date, SUM(duration_seconds) as total_seconds
        FROM usage_logs 
        WHERE date >= date('now', '-${days} days')
        GROUP BY date 
        ORDER BY date DESC
      `;

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const formattedRows = rows.map(row => ({
            date: row.date,
            totalSeconds: row.total_seconds,
            totalTime: this.formatDuration(row.total_seconds)
          }));
          resolve(formattedRows);
        }
      });
    });
  }

  async clearAllData() {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM usage_logs', [], (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('All usage data cleared');
          resolve();
        }
      });
    });
  }

  formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }

  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

module.exports = Database;