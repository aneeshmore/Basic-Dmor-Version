import { eq, desc, and } from 'drizzle-orm';
import db from '../../db/index.js';
import { productionBatch, products, employees } from '../../db/schema/index.js';

export class ProductionRepository {
    async findAll(filters = {}) {
        let query = db
            .select()
            .from(productionBatch)
            .leftJoin(products, eq(productionBatch.productId, products.productId))
            .leftJoin(employees, eq(productionBatch.supervisorId, employees.employeeId));

        if (filters.status) {
            query = query.where(eq(productionBatch.status, filters.status));
        }

        return await query.orderBy(desc(productionBatch.createdAt));
    }

    async findById(batchId) {
        const result = await db
            .select()
            .from(productionBatch)
            .leftJoin(products, eq(productionBatch.productId, products.productId))
            .leftJoin(employees, eq(productionBatch.supervisorId, employees.employeeId))
            .where(eq(productionBatch.batchId, batchId))
            .limit(1);

        return result[0] || null;
    }

    async create(batchData) {
        const result = await db
            .insert(productionBatch)
            .values(batchData)
            .returning();

        return result[0];
    }

    async update(batchId, updateData) {
        const result = await db
            .update(productionBatch)
            .set({ ...updateData, updatedAt: new Date() })
            .where(eq(productionBatch.batchId, batchId))
            .returning();

        return result[0];
    }

    async delete(batchId) {
        await db
            .delete(productionBatch)
            .where(eq(productionBatch.batchId, batchId));
    }

    async getBatchMaterials(batchId) {
        return await db.query.batchMaterials.findMany({
            where: (batchMaterials, { eq }) => eq(batchMaterials.batchId, batchId),
            with: {
                material: true
            }
        });
    }
}
