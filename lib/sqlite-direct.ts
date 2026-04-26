// Acceso directo a SQLite sin Prisma
import Database from 'better-sqlite3';

const dbPath = './prisma/dev.db';

export interface Tenant {
  id: string;
  businessName: string;
  businessRTN: string;
  businessEmail: string;
  businessAddress: string;
  tenantCode: string;
  phoneNumber: string | null;
  subscriptionPlan: string;
  maxUsers: number;
  monthlyCost: number;
  modules: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export class SQLiteDirect {
  private static db: Database | null = null;

  static getDatabase(): Database {
    if (!this.db) {
      this.db = new Database(dbPath);
    }
    return this.db;
  }

  static async getAllTenants(): Promise<Tenant[]> {
    const db = this.getDatabase();
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM Tenant ORDER BY createdAt DESC`,
        (err: any, rows: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows as Tenant[]);
          }
        }
      );
    });
  }

  static async createTenant(data: any): Promise<Tenant> {
    const db = this.getDatabase();
    return new Promise((resolve, reject) => {
      const stmt = db.prepare(`
        INSERT INTO Tenant (
          businessName, businessEmail, businessRTN, businessAddress, 
          tenantCode, phoneNumber, subscriptionPlan, maxUsers, 
          monthlyCost, modules, isActive, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const now = new Date().toISOString();
      stmt.run(
        data.businessName,
        data.businessEmail,
        data.businessRTN,
        data.businessAddress,
        data.tenantCode || `TC${Date.now()}`,
        data.phoneNumber || null,
        JSON.stringify(data.subscriptionPlans || []),
        data.maxUsers || 5,
        data.monthlyCost || 0,
        data.modules ? data.modules.join(',') : null,
        true,
        now,
        now
      );

      const lastID = (stmt as any).lastID;
      stmt.finalize();

      // Obtener el tenant recién creado
      db.get(
        'SELECT * FROM Tenant WHERE rowid = ?',
        [lastID],
        (err: any, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(row as Tenant);
          }
        }
      );
    });
  }

  static async getTenantById(id: string): Promise<Tenant | null> {
    const db = this.getDatabase();
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM Tenant WHERE id = ?',
        [id],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row as Tenant | null);
          }
        }
      );
    });
  }

  static async deleteTenant(id: string): Promise<boolean> {
    const db = this.getDatabase();
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM Tenant WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes > 0);
          }
        }
      );
    });
  }
}
