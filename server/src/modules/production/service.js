import { ProductionRepository } from './repository.js';
import { ProductionBatchDTO } from './dto.js';
import { AppError } from '../../utils/AppError.js';

import { InventoryService } from '../inventory/service.js';
import { NotificationsService } from '../notifications/service.js';

export class ProductionService {
  constructor() {
    this.repository = new ProductionRepository();
    this.inventoryService = new InventoryService();
    this.notificationsService = new NotificationsService();
  }

  async getAllBatches(filters) {
    const batches = await this.repository.findAll(filters);
    return batches.map(b => new ProductionBatchDTO(b.production_batch));
  }

  async getBatchById(batchId) {
    const batch = await this.repository.findById(batchId);
    if (!batch) {
      throw new AppError('Production batch not found', 404);
    }
    return new ProductionBatchDTO(batch.production_batch);
  }

  async createBatch(batchData) {
    const batch = await this.repository.create({
      ...batchData,
      status: 'Planned',
      actualProductionQty: 0,
    });
    return new ProductionBatchDTO(batch);
  }

  async updateBatch(batchId, updateData) {
    const existing = await this.repository.findById(batchId);
    if (!existing) {
      throw new AppError('Production batch not found', 404);
    }

    const updated = await this.repository.update(batchId, updateData);
    return new ProductionBatchDTO(updated);
  }

  async completeBatch(batchId, actualProductionQty) {
    const batch = await this.repository.findById(batchId);
    if (!batch) {
      throw new AppError('Production batch not found', 404);
    }

    if (batch.production_batch.status === 'Completed') {
      throw new AppError('Batch is already completed', 400);
    }

    // Update batch status
    const updatedBatch = await this.repository.update(batchId, {
      status: 'Completed',
      actualProductionQty,
      endDate: new Date(),
    });

    // Add to inventory (Logs to inventoryTransactions for Reports)
    await this.inventoryService.addInventory(
      batch.production_batch.productId,
      actualProductionQty,
      'Production Output',
      batchId, // referenceId
      null, // weightKg (optional/calculated elsewhere)
      null, // densityKgPerL
      `Production Batch: ${batchId}`
    );

    // CONSUMPTION LOGIC: Deduct Raw Materials & Packaging Materials
    try {
      const batchMaterials = await this.repository.getBatchMaterials(batchId);

      // Calculate consumption ratio based on actual vs planned output
      // If planned is 0 (shouldn't happen), assume ratio 1
      const plannedQty = parseFloat(batch.production_batch.plannedQuantity || 0);
      const actualQty = parseFloat(actualProductionQty || 0);
      const ratio = plannedQty > 0 ? (actualQty / plannedQty) : 1;

      console.log(`[Production] Completing Batch ${batchId}. Planned: ${plannedQty}, Actual: ${actualQty}, Ratio: ${ratio}`);

      for (const bm of batchMaterials) {
        const requiredQty = parseFloat(bm.requiredQuantity || 0);

        // Calculate actual consumption
        // We use the ratio to determine how much *should* have been used given the output
        const consumedQty = requiredQty * ratio;

        if (consumedQty > 0) {
          await this.inventoryService.deductInventory(
            bm.materialId,
            consumedQty, // This writes to inventory_transactions
            'Production Consumption',
            batchId,
            null, // weightKg - TODO: calculate if needed
            `Auto-deduction for Batch ${batchId} (Ratio: ${ratio.toFixed(4)})`
          );
        }
      }
    } catch (error) {
      // Log error but don't fail the batch completion, as the main output is already recorded
      // In a strict system, we might want to throw or rollback
      console.error('Failed to record material consumption for batch:', batchId, error);
    }

    // Notify about completion
    try {
      await this.notificationsService.createBatchCompletionNotification(
        batchId,
        batch.product?.productName || 'Product',
        actualProductionQty,
        batch.production_batch.batchCode || batchId
      );
    } catch (err) {
      console.error('Failed to send production completion notification:', err);
    }

    return new ProductionBatchDTO(updatedBatch);
  }

  async deleteBatch(batchId) {
    const existing = await this.repository.findById(batchId);
    if (!existing) {
      throw new AppError('Production batch not found', 404);
    }

    await this.repository.delete(batchId);
  }
}
