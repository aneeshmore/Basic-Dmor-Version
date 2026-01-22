import { InventoryRepository } from './repository.js';
import { NotificationsRepository } from '../notifications/repository.js';
import { ProductDTO, StockLedgerDTO } from './dto.js';
import { AppError } from '../../utils/AppError.js';
import logger from '../../config/logger.js';
import db from '../../db/index.js';
import { products, inventoryTransactions } from '../../db/schema/index.js';
import { eq } from 'drizzle-orm';

export class InventoryService {
  constructor() {
    this.repository = new InventoryRepository();
    this.notificationsRepository = new NotificationsRepository();
  }

  /**
   * Reserve inventory by quantity or weight
   * For finished goods (FG): Reserve by weight
   * For raw materials (RM): Reserve by quantity
   */
  async reserveInventory(productId, quantity, weightKg = null) {
    logger.info('Reserving inventory', { productId, quantity, weightKg });

    const [product] = await db.select().from(products).where(eq(products.productId, productId));

    if (!product) {
      throw new AppError(`Product ${productId} not found`, 404);
    }

    const currentReserved = parseFloat(product.reservedQuantity || 0);
    const currentAvailable = parseFloat(product.availableQuantity || 0);
    const currentReservedWeight = parseFloat(product.reservedWeightKg || 0);
    const currentAvailableWeight = parseFloat(product.availableWeightKg || 0);

    // Check availability
    if (currentAvailable < quantity) {
      throw new AppError(
        `Insufficient quantity for ${product.productName}. Required: ${quantity}, Available: ${currentAvailable}`,
        400
      );
    }

    // For products with weight tracking, also check weight availability
    if (weightKg && weightKg > 0) {
      if (currentAvailableWeight < weightKg) {
        throw new AppError(
          `Insufficient weight for ${product.productName}. Required: ${weightKg}kg, Available: ${currentAvailableWeight}kg`,
          400
        );
      }
    }

    // Update product with reserved quantities and weight
    await db
      .update(products)
      .set({
        reservedQuantity: String(currentReserved + quantity),
        reservedWeightKg:
          weightKg && weightKg > 0 ? String(currentReservedWeight + weightKg) : undefined,
      })
      .where(eq(products.productId, productId));

    logger.info('Inventory reserved successfully', {
      productId,
      quantity,
      weightKg,
    });

    return {
      productId,
      reservedQuantity: currentReserved + quantity,
      reservedWeightKg: weightKg ? currentReservedWeight + weightKg : currentReservedWeight,
    };
  }

  /**
   * Release reserved inventory by quantity or weight
   * Returns reserved items to available without affecting total inventory
   */
  async releaseReservedInventory(productId, quantity, weightKg = null) {
    logger.info('Releasing reserved inventory', { productId, quantity, weightKg });

    const [product] = await db.select().from(products).where(eq(products.productId, productId));

    if (!product) {
      throw new AppError(`Product ${productId} not found`, 404);
    }

    const currentReserved = parseFloat(product.reservedQuantity || 0);
    const currentReservedWeight = parseFloat(product.reservedWeightKg || 0);

    // Validate sufficient reserved amount
    if (currentReserved < quantity) {
      logger.warn(
        `Cannot release more than reserved. Reserved: ${currentReserved}, Requested: ${quantity}`
      );
      quantity = Math.min(quantity, currentReserved);
    }

    if (weightKg && currentReservedWeight < weightKg) {
      logger.warn(
        `Cannot release more weight than reserved. Reserved: ${currentReservedWeight}kg, Requested: ${weightKg}kg`
      );
      weightKg = Math.min(weightKg, currentReservedWeight);
    }

    // Update product with reduced reserved amounts
    await db
      .update(products)
      .set({
        reservedQuantity: String(Math.max(0, currentReserved - quantity)),
        reservedWeightKg:
          weightKg && weightKg > 0
            ? String(Math.max(0, currentReservedWeight - weightKg))
            : undefined,
      })
      .where(eq(products.productId, productId));

    logger.info('Reserved inventory released', {
      productId,
      releasedQuantity: quantity,
      releasedWeightKg: weightKg,
    });

    return {
      productId,
      remainingReserved: Math.max(0, currentReserved - quantity),
      remainingReservedWeight: weightKg
        ? Math.max(0, currentReservedWeight - weightKg)
        : currentReservedWeight,
    };
  }

  /**
   * Deduct inventory for consumption/sales
   * Removes from both reserved and available quantities/weights
   */
  async deductInventory(
    productId,
    quantity,
    transactionType = 'Consumption',
    referenceId = null,
    weightKg = null,
    notes = null
  ) {
    logger.info('Deducting inventory', {
      productId,
      quantity,
      transactionType,
      weightKg,
      referenceId,
    });

    const [product] = await db.select().from(products).where(eq(products.productId, productId));

    if (!product) {
      throw new AppError(`Product ${productId} not found`, 404);
    }

    const currentAvailable = parseFloat(product.availableQuantity || 0);
    const currentAvailableWeight = parseFloat(product.availableWeightKg || 0);

    // Validate sufficient inventory
    if (currentAvailable < quantity) {
      throw new AppError(
        `Insufficient inventory for ${product.productName}. Required: ${quantity}, Available: ${currentAvailable}`,
        400
      );
    }

    if (weightKg && weightKg > 0 && currentAvailableWeight < weightKg) {
      throw new AppError(
        `Insufficient weight for ${product.productName}. Required: ${weightKg}kg, Available: ${currentAvailableWeight}kg`,
        400
      );
    }

    // Update inventory
    await db
      .update(products)
      .set({
        availableQuantity: String(currentAvailable - quantity),
        availableWeightKg:
          weightKg && weightKg > 0 ? String(currentAvailableWeight - weightKg) : undefined,
      })
      .where(eq(products.productId, productId));

    // Create transaction record
    try {
      await db.insert(inventoryTransactions).values({
        productId,
        masterProductId: product.masterProductId,
        transactionType,
        quantity: String(-quantity), // Negative for deduction
        weightKg: weightKg ? String(weightKg) : null,
        referenceType: transactionType === 'Production Consumption' ? 'Batch' : 'Order',
        referenceId,
        notes,
        createdBy: 'System',
      });
      logger.debug('Transaction recorded', { productId, transactionType });
    } catch (txError) {
      logger.warn('Failed to record transaction:', txError);
      // Continue even if transaction record fails
    }

    logger.info('Inventory deducted successfully', {
      productId,
      deductedQuantity: quantity,
      deductedWeightKg: weightKg,
    });

    return {
      productId,
      remainingQuantity: currentAvailable - quantity,
      remainingWeightKg: weightKg ? currentAvailableWeight - weightKg : currentAvailableWeight,
    };
  }

  /**
   * Add inventory from production or inward
   * Increases available quantities and optionally weights
   */
  async addInventory(
    productId,
    quantity,
    transactionType = 'Inward',
    referenceId = null,
    weightKg = null,
    densityKgPerL = null,
    notes = null
  ) {
    logger.info('Adding inventory', {
      productId,
      quantity,
      transactionType,
      weightKg,
      densityKgPerL,
    });

    const [product] = await db.select().from(products).where(eq(products.productId, productId));

    if (!product) {
      throw new AppError(`Product ${productId} not found`, 404);
    }

    const currentAvailable = parseFloat(product.availableQuantity || 0);
    const currentAvailableWeight = parseFloat(product.availableWeightKg || 0);

    // Update inventory
    await db
      .update(products)
      .set({
        availableQuantity: String(currentAvailable + quantity),
        availableWeightKg:
          weightKg && weightKg > 0 ? String(currentAvailableWeight + weightKg) : undefined,
      })
      .where(eq(products.productId, productId));

    // Create transaction record
    try {
      await db.insert(inventoryTransactions).values({
        productId,
        masterProductId: product.masterProductId,
        transactionType,
        quantity: String(quantity),
        weightKg: weightKg ? String(weightKg) : null,
        densityKgPerL: densityKgPerL ? String(densityKgPerL) : null,
        referenceType: transactionType === 'Production Output' ? 'Batch' : 'Inward',
        referenceId,
        notes,
        createdBy: 'System',
      });
      logger.debug('Transaction recorded', { productId, transactionType });
    } catch (txError) {
      logger.warn('Failed to record transaction:', txError);
      // Continue even if transaction record fails
    }

    logger.info('Inventory added successfully', {
      productId,
      addedQuantity: quantity,
      addedWeightKg: weightKg,
    });

    // Automatically resolve any material shortage alerts for this product
    try {
      await this.notificationsRepository.deleteByMaterialId(productId);
      logger.info(`Resolved material shortage alerts for product ${productId}`);
    } catch (notifError) {
      logger.error('Failed to clear notifications:', notifError);
      // Don't throw error here, as inventory update was successful
    }

    return {
      productId,
      newTotalQuantity: currentAvailable + quantity,
      newTotalWeightKg: weightKg ? currentAvailableWeight + weightKg : currentAvailableWeight,
    };
  }

  async getAllProducts(filters) {
    const products = await this.repository.findAllProducts(filters);
    return products.map(p => new ProductDTO(p));
  }

  async getProductById(productId) {
    const product = await this.repository.findProductById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    return new ProductDTO(product);
  }

  /**
   * Get product with weight information
   * Useful for checking weight availability
   */
  async getProductWithWeight(productId) {
    const product = await this.repository.findProductById(productId);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return {
      ...new ProductDTO(product),
      availableWeightKg: parseFloat(product.availableWeightKg || 0),
      reservedWeightKg: parseFloat(product.reservedWeightKg || 0),
      freeWeightKg: Math.max(
        0,
        parseFloat(product.availableWeightKg || 0) - parseFloat(product.reservedWeightKg || 0)
      ),
    };
  }

  async createProduct(productData) {
    const product = await this.repository.createProduct(productData);
    return new ProductDTO(product);
  }

  async updateProduct(productId, updateData) {
    const existing = await this.repository.findProductById(productId);
    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    const updated = await this.repository.updateProduct(productId, updateData);
    return new ProductDTO(updated);
  }

  async deleteProduct(productId) {
    const existing = await this.repository.findProductById(productId);
    if (!existing) {
      throw new AppError('Product not found', 404);
    }

    await this.repository.deleteProduct(productId);
  }

  async getStockLedger(productId, limit) {
    const ledger = await this.repository.getStockLedger(productId, limit);
    return ledger.map(l => new StockLedgerDTO(l));
  }

  async getLowStockProducts() {
    const products = await this.repository.getLowStockProducts();
    return products.map(p => new ProductDTO(p));
  }

  async updateStock(productId, quantity, details) {
    return await this.repository.updateStock(productId, quantity, details);
  }
}
