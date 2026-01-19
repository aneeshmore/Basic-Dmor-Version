import { eq } from 'drizzle-orm';
import db from '../../db/index.js';
import { company } from '../../db/schema/index.js';

export class CompanyRepository {
    async getCompany() {
        // We assume there is only one company record for now.
        const result = await db.select().from(company).limit(1);
        return result[0] || null;
    }

    async create(data) {
        const result = await db.insert(company).values(data).returning();
        return result[0];
    }

    async update(id, data) {
        const result = await db
            .update(company)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(company.companyId, id))
            .returning();
        return result[0];
    }

    // Helper to ensure at least one record exists or update the first one
    async upsert(data) {
        const existing = await this.getCompany();
        if (existing) {
            return this.update(existing.companyId, data);
        }
        return this.create(data);
    }
}
