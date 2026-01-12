import { eq, desc, and, gte, lte, lt, inArray, notInArray, sql, isNotNull } from 'drizzle-orm';
import db from '../../db/index.js';
import {
  materialInward,
  products,
  masterProducts,
  masterProductFG,
  masterProductRM,
  masterProductPM,
  orders,
  orderDetails,
  customers,
  productBom,
  inventoryTransactions,
  suppliers,
  batchMaterials,
  productionBatch,
  batchProducts,
  materialDiscard,
} from '../../db/schema/index.js';

export class ReportsService {
  async getBatchProductionReport(status, startDate, endDate) {
    try {
      const conditions = [];

      if (status && status !== 'All') {
        conditions.push(eq(productionBatch.status, status));
      }

      // Context-aware date filtering based on status
      let dateField = productionBatch.scheduledDate; // Default to scheduledDate

      if (status === 'Completed') {
        dateField = productionBatch.completedAt;
      } else if (status === 'In Progress') {
        dateField = productionBatch.startedAt;
      }

      if (startDate) {
        conditions.push(gte(dateField, startDate));
      }

      if (endDate) {
        // For timestamp fields (startedAt, completedAt), ensure we include the whole end day
        if (status === 'Completed' || status === 'In Progress') {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          conditions.push(lte(dateField, end));
        } else {
          // For date-only field (scheduledDate)
          conditions.push(lte(dateField, endDate));
        }
      }

      const batches = await db.query.productionBatch.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        with: {
          masterProduct: {
            with: {
              fgDetails: true,
            },
          },
          supervisor: true,
          batchProducts: {
            with: {
              product: {
                with: {
                  masterProduct: true,
                  packaging: {
                    with: {
                      pmDetails: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: (productionBatch, { desc }) => [desc(productionBatch.scheduledDate)],
      });

      // NO need for in-memory filtering anymore as it's handled in the DB query
      const filteredBatches = batches;

      // Debug: Log batchProducts data
      console.log('Reports: Fetched batches count:', filteredBatches.length);
      filteredBatches.forEach(b => {
        console.log(
          `Batch ${b.batchNo}: batchProducts count =`,
          (b.batchProducts || []).length,
          'batchProducts:',
          b.batchProducts
        );
      });

      // Fetch BOM data for all batches
      const batchesWithBom = await Promise.all(
        filteredBatches.map(async batch => {
          const startTime = batch.startedAt ? new Date(batch.startedAt).getTime() : null;
          const endTime = batch.completedAt ? new Date(batch.completedAt).getTime() : null;
          // Calculate Time Required using actualTimeHours if available
          let timeRequired = 'N/A';
          if (batch.actualTimeHours) {
            timeRequired = `${batch.actualTimeHours} Hrs`;
          } else if (startTime && endTime) {
            const diffMs = endTime - startTime;
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
            timeRequired = `${diffHrs}h ${diffMins}m`;
          }

          // Fetch reference product for BOM
          let referenceProductId = batch.productId;

          // If batch only has masterProductId, find a child product to get BOM
          if (!referenceProductId && batch.masterProductId) {
            const refProduct = await db.query.products.findFirst({
              where: (products, { eq }) => eq(products.masterProductId, batch.masterProductId),
            });
            if (refProduct) {
              referenceProductId = refProduct.productId;
            }
          }

          // Fetch raw materials (Actuals) for this batch from batch_materials table
          const batchMaterialsData = await db
            .select({
              batchMaterialId: batchMaterials.batchMaterialId,
              materialId: batchMaterials.materialId,
              materialName: masterProducts.masterProductName,
              productType: masterProducts.productType,
              requiredQuantity: batchMaterials.requiredQuantity,
              plannedQuantity: batchMaterials.requiredQuantity,
              // actualQuantity: batchMaterials.actualQuantity, // Column removed from schema
              sequence: batchMaterials.sequence,
              isAdditional: batchMaterials.isAdditional,
              percentage: batchMaterials.requiredUsePer,
            })
            .from(batchMaterials)
            .leftJoin(masterProducts, eq(batchMaterials.materialId, masterProducts.masterProductId))
            .where(eq(batchMaterials.batchId, batch.batchId))
            .orderBy(batchMaterials.sequence);

          // Merge BOM and Actuals - REFACTORED for Historical Accuracy
          // We now rely ONLY on batch_materials which is a snapshot of the recipe at batch creation time.
          // This prevents current recipe changes from altering historical reports.

          const rawMaterials = batchMaterialsData.map(bm => {
            // Determine if it's "additional"
            // 1. Explicitly flagged in DB
            // 2. Name contains "Water" (legacy fallback)
            // 3. No percentage/requiredUsePer was stored (implies added later)
            const isWater = (bm.materialName || '').toLowerCase().includes('water');
            const hasPercentage = bm.percentage != null && parseFloat(bm.percentage) > 0;

            // If it's explicitly additional, or water, or has no planned percentage, treat as additional
            const isAdditional = bm.isAdditional || isWater || !hasPercentage;

            return {
              bomId: bm.batchMaterialId,
              rawMaterialId: bm.materialId,
              rawMaterialName: bm.materialName || 'Unknown',
              productType: bm.productType,
              // Use stored percentage from snapshot, or 0 if not present
              percentage: bm.percentage || 0,
              // Since we don't track variance for regular items anymore, Actual = Planned (Required)
              // For additional items, Actual = Required (which stores the added amount)
              actualQty: bm.requiredQuantity,
              isAdditional,
            };
          });

          // Sort: Regular materials first, then Additional/Water
          rawMaterials.sort((a, b) => {
            // If one is additional and the other isn't
            if (a.isAdditional !== b.isAdditional) {
              return a.isAdditional ? 1 : -1; // Regular (false) first
            }
            // Maintain original sequence from DB if both are same type
            return 0;
          });

          // Calculate Packaging Materials based on Batch Products (SKUs)
          const packagingMap = new Map();

          if (batch.batchProducts) {
            batch.batchProducts.forEach(sp => {
              const packaging = sp.product?.packaging;
              if (packaging) {
                const existing = packagingMap.get(packaging.masterProductId) || {
                  packagingId: packaging.masterProductId,
                  packagingName: packaging.masterProductName,
                  plannedQty: 0,
                  actualQty: 0,
                };

                // Add quantities (Assuming 1 SKU unit uses 1 Packaging unit)
                // If packageQuantity is involved, logic might need adjustment, but usually 1 Unit = 1 Package
                existing.plannedQty += parseFloat(sp.plannedUnits || '0');

                // For actual, use producedUnits if available, else 0
                existing.actualQty += parseFloat(sp.producedUnits || '0');

                packagingMap.set(packaging.masterProductId, existing);
              }
            });
          }

          const calculatedPackagingMaterials = Array.from(packagingMap.values());

          return {
            batchId: batch.batchId,
            batchNo: batch.batchNo,
            productId: referenceProductId, // Use the resolved ID
            masterProductId: batch.masterProductId,
            productName: batch.masterProduct?.masterProductName || 'Unknown Product',
            productType: batch.masterProduct?.productType,
            batchType:
              batch.batchType ||
              (batch.batchProducts?.some(sp => sp.orderId) ? 'MAKE_TO_ORDER' : 'MAKE_TO_STOCK'),
            scheduledDate: batch.scheduledDate,
            status: batch.status,
            plannedQuantity: batch.plannedQuantity,
            actualQuantity: batch.actualQuantity,
            actualWeightKg: batch.actualWeightKg,
            startedAt: batch.startedAt,
            completedAt: batch.completedAt,
            timeRequired,
            // productionManager: ... // Removed as per request
            supervisor: batch.supervisor
              ? `${batch.supervisor.firstName} ${batch.supervisor.lastName}`
              : null,
            // SNAPSHOT: Use batch-stored values first (captured at batch creation time)
            // Fallback to FG Master for backward compatibility with old batches
            density: batch.density || batch.masterProduct?.fgDetails?.fgDensity, // Standard Density (snapshotted or FG Master fallback)
            actualDensity: batch.actualDensity, // Lab Density
            packingDensity:
              batch.actualWeightKg && batch.actualQuantity && parseFloat(batch.actualQuantity) > 0
                ? (parseFloat(batch.actualWeightKg) / parseFloat(batch.actualQuantity)).toFixed(4)
                : batch.actualDensity, // Calculated or Fallback
            viscosity: batch.viscosity || batch.masterProduct?.fgDetails?.viscosity, // Standard Viscosity (snapshotted or FG Master fallback)
            actualViscosity: batch.actualViscosity,
            waterPercentage:
              batch.waterPercentage || batch.masterProduct?.fgDetails?.waterPercentage, // Standard Water % (snapshotted or FG Master fallback)
            actualWaterPercentage: batch.actualWaterPercentage,
            productionRemarks: batch.productionRemarks,
            labourNames: batch.labourNames,
            qualityStatus: batch.qualityStatus,
            subProducts: (batch.batchProducts || []).map((sp, _, arr) => {
              const capacity =
                sp.product?.packaging?.pmDetails?.capacity || sp.product?.packageCapacityKg || 0;

              console.log(
                `Report Debug - Batch ${batch.batchNo} SKU ${sp.product?.productName}: Produced=${sp.producedUnits}, Planned=${sp.plannedUnits}, Capacity=${capacity}`
              );

              let actualQty = '-';
              if (sp.producedUnits !== null && sp.producedUnits !== undefined) {
                actualQty = sp.producedUnits;
              } else if (batch.status === 'Completed') {
                const planned = parseInt(sp.plannedUnits || 0);
                if (planned > 0) {
                  actualQty = planned;
                } else if (
                  batch.actualQuantity &&
                  parseFloat(batch.actualQuantity) > 0 &&
                  parseFloat(capacity) > 0 &&
                  arr.length === 1
                ) {
                  // Legacy MTS Fix: Calculate units from total if single-SKU
                  actualQty = Math.round(parseFloat(batch.actualQuantity) / parseFloat(capacity));
                } else {
                  actualQty = 0; // Show 0 if 0 planned and can't calculate
                }
              }

              return {
                subProductId: sp.batchProductId,
                // Use SKU product name first, fallback to master product name
                productName:
                  sp.product?.productName ||
                  sp.product?.masterProduct?.masterProductName ||
                  'Unknown',
                batchQty: sp.plannedUnits || 0,
                actualQty,
                capacity: capacity || null,
                fillingDensity: sp.product?.fillingDensity || null,
              };
            }),
            rawMaterials: rawMaterials.filter(rm => rm.productType !== 'PM'), // Remove PM from rawMaterials
            packagingMaterials: calculatedPackagingMaterials, // Add calculated PMs
          };
        })
      );

      return batchesWithBom;
    } catch (error) {
      console.error('Error fetching batch production report:', error);
      throw error;
    }
  }

  async getDailyConsumptionReport(date) {
    try {
      if (!date) {
        throw new Error('Date is required');
      }

      const queryDate = new Date(date);
      const startOfDay = new Date(queryDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(queryDate);
      endOfDay.setHours(23, 59, 59, 999);

      // 1. Fetch all Active RM and PM Master Products
      const materials = await db
        .select({
          masterProductId: masterProducts.masterProductId,
          masterProductName: masterProducts.masterProductName,
          productType: masterProducts.productType,
        })
        .from(masterProducts)
        .where(
          and(
            inArray(masterProducts.productType, ['RM', 'PM']),
            eq(masterProducts.isActive, true)
          )
        );

      // 2. Calculate Opening Stock based on Inventory Transactions (Ledger)
      // This remains the "Ledger View" of what was in stock at start of day
      const openingStockMap = new Map();

      const openingStockData = await db
        .select({
          masterProductId: sql`COALESCE(${inventoryTransactions.masterProductId}, ${products.masterProductId})`,
          totalQty: sql`SUM(${inventoryTransactions.quantity})`,
        })
        .from(inventoryTransactions)
        .leftJoin(products, eq(inventoryTransactions.productId, products.productId))
        .where(
          and(
            lt(inventoryTransactions.createdAt, startOfDay)
          )
        )
        .groupBy(sql`COALESCE(${inventoryTransactions.masterProductId}, ${products.masterProductId})`);

      openingStockData.forEach(item => {
        if (item.masterProductId) {
          openingStockMap.set(item.masterProductId, parseFloat(item.totalQty || '0'));
        }
      });

      // 3. Calculate Consumption based on COMPLETED BATCHES for the day
      // Instead of ledger transactions, we look at what was "Used" in batches finished today.
      const consumptionMap = new Map();

      // Find batches completed today
      const completedBatches = await db
        .select({
          batchId: productionBatch.batchId,
        })
        .from(productionBatch)
        .where(
          and(
            eq(productionBatch.status, 'Completed'),
            gte(productionBatch.completedAt, startOfDay),
            lte(productionBatch.completedAt, endOfDay)
          )
        );

      const completedBatchIds = completedBatches.map(b => b.batchId);

      if (completedBatchIds.length > 0) {
        // 3a. Calculate RM Consumption (from batchMaterials)
        const batchConsumptionData = await db
          .select({
            materialId: batchMaterials.materialId,
            totalConsumption: sql`SUM(${batchMaterials.requiredQuantity})`,
          })
          .from(batchMaterials)
          .where(inArray(batchMaterials.batchId, completedBatchIds))
          .groupBy(batchMaterials.materialId);

        batchConsumptionData.forEach(item => {
          consumptionMap.set(item.materialId, parseFloat(item.totalConsumption || '0'));
        });

        // 3b. Calculate PM Consumption (from batchProducts -> products -> packagingId)
        // We look at the products produced in these batches, find their packaging (PM),
        // and sum the units produced (1 Unit produced = 1 PM consumed usually)
        const pmConsumptionData = await db
          .select({
            packagingId: products.packagingId,
            totalProduced: sql`SUM(COALESCE(${batchProducts.producedUnits}, ${batchProducts.plannedUnits}, 0))`,
          })
          .from(batchProducts)
          .innerJoin(products, eq(batchProducts.productId, products.productId))
          .where(
            and(
              inArray(batchProducts.batchId, completedBatchIds),
              isNotNull(products.packagingId)
            )
          )
          .groupBy(products.packagingId);

        pmConsumptionData.forEach(item => {
          if (item.packagingId) {
            const current = consumptionMap.get(item.packagingId) || 0;
            // Assuming 1 Unit Product = 1 Unit Packaging
            consumptionMap.set(item.packagingId, current + parseFloat(item.totalProduced || '0'));
          }
        });
      }

      // 4. Merge Data
      const reportData = materials.map(material => {
        const openingQty = openingStockMap.get(material.masterProductId) || 0;
        const consumption = consumptionMap.get(material.masterProductId) || 0;
        // Closing Stock is Opening - Consumption (Production View)
        // Note: This might diverge from Ledger Stock if there were Inwards/Other transactions today
        const closingQty = openingQty - consumption;

        return {
          masterProductId: material.masterProductId,
          masterProductName: material.masterProductName,
          productType: material.productType,
          openingQty,
          consumption,
          closingQty,
        };
      });

      // Filter to show only materials that were consumed on the selected day
      const filteredReportData = reportData.filter(item => item.consumption > 0);

      // Sort by Name
      filteredReportData.sort((a, b) => a.masterProductName.localeCompare(b.masterProductName));

      return filteredReportData;

    } catch (error) {
      console.error('Error fetching daily consumption report:', error);
      throw error;
    }
  }

  async getMaterialInwardReport(type, startDate, endDate) {
    try {
      // Validate type
      const validTypes = ['FG', 'RM', 'PM', 'All'];
      if (type && !validTypes.includes(type)) {
        throw new Error(`Invalid product type: ${type}`);
      }

      const conditions = [];
      if (type && type !== 'All') {
        conditions.push(eq(masterProducts.productType, type));
      }

      if (startDate) {
        conditions.push(gte(materialInward.inwardDate, new Date(startDate)));
      }
      if (endDate) {
        // Set end date to end of day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(materialInward.inwardDate, end));
      }

      const results = await db
        .select({
          inwardId: materialInward.inwardId,
          inwardDate: materialInward.inwardDate,
          productName: masterProducts.masterProductName,
          supplierName: suppliers.supplierName,
          billNo: materialInward.billNo,
          quantity: materialInward.quantity,
          unitPrice: materialInward.unitPrice,
          totalCost: materialInward.totalCost,
          notes: materialInward.notes,
          productType: masterProducts.productType,
        })
        .from(materialInward)
        .innerJoin(
          masterProducts,
          eq(materialInward.masterProductId, masterProducts.masterProductId)
        )
        .leftJoin(suppliers, eq(materialInward.supplierId, suppliers.supplierId))
        .where(and(...conditions))
        .orderBy(desc(materialInward.inwardDate));

      return results;
    } catch (error) {
      console.error('Error fetching material inward report:', error);
      throw error;
    }
  }

  async getStockReport(type, productId, startDate, endDate) {
    try {
      // Validate type
      const validTypes = ['FG', 'RM', 'PM', 'All', 'Sub-Product'];
      if (type && !validTypes.includes(type)) {
        throw new Error(`Invalid product type: ${type}`);
      }

      // Default to current month if dates not provided
      const start = startDate
        ? new Date(startDate)
        : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const end = endDate
        ? new Date(endDate)
        : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

      end.setHours(23, 59, 59, 999);

      const results = [];

      // Fetch FG products (from products table)
      if (!type || type === 'All' || type === 'FG' || type === 'Sub-Product') {
        const fgConditions = [eq(masterProducts.productType, 'FG')];
        if (type === 'Sub-Product') {
          fgConditions.push(eq(masterProductFG.subcategory, 'Sub-Product'));
        }
        if (productId) {
          fgConditions.push(eq(products.productId, parseInt(productId)));
        }

        const fgResults = await db
          .select({
            productId: products.productId,
            productName: products.productName,
            masterProductName: masterProducts.masterProductName,
            productType: masterProducts.productType,
            availableQuantity: products.availableQuantity,
            availableWeightKg: products.availableWeightKg,
            reservedQuantity: products.reservedQuantity,
            minStockLevel: masterProducts.minStockLevel,
            sellingPrice: products.sellingPrice,
            packageCapacityKg: products.packageCapacityKg,
            isActive: products.isActive,
            updatedAt: products.updatedAt,
            totalInward: sql`COALESCE(SUM(CASE WHEN ${inventoryTransactions.quantity} > 0 AND ${inventoryTransactions.createdAt} >= ${start.toISOString()} AND ${inventoryTransactions.createdAt} <= ${end.toISOString()} THEN ${inventoryTransactions.quantity} ELSE 0 END), 0)`,
            totalOutward: sql`COALESCE(SUM(CASE WHEN ${inventoryTransactions.quantity} < 0 AND ${inventoryTransactions.createdAt} >= ${start.toISOString()} AND ${inventoryTransactions.createdAt} <= ${end.toISOString()} THEN ABS(${inventoryTransactions.quantity}) ELSE 0 END), 0)`,
          })
          .from(products)
          .innerJoin(masterProducts, eq(products.masterProductId, masterProducts.masterProductId))
          .leftJoin(
            masterProductFG,
            eq(masterProducts.masterProductId, masterProductFG.masterProductId)
          )
          .leftJoin(inventoryTransactions, eq(products.productId, inventoryTransactions.productId))
          .where(and(...fgConditions))
          .groupBy(
            products.productId,
            products.productName,
            products.availableQuantity,
            products.availableWeightKg,
            products.reservedQuantity,
            products.sellingPrice,
            products.packageCapacityKg,
            products.isActive,
            products.updatedAt,
            masterProducts.masterProductName,
            masterProducts.productType,
            masterProducts.minStockLevel
          )
          .orderBy(products.productName);

        results.push(...fgResults);
      }

      // Fetch RM products (from master_product_rm table)
      if (!type || type === 'All' || type === 'RM') {
        const rmConditions = [eq(masterProducts.productType, 'RM')];
        if (productId) {
          rmConditions.push(eq(masterProducts.masterProductId, parseInt(productId)));
        }

        const rmResults = await db
          .select({
            productId: masterProducts.masterProductId,
            productName: masterProducts.masterProductName,
            masterProductName: masterProducts.masterProductName,
            productType: masterProducts.productType,
            availableQuantity: masterProductRM.availableQty,
            availableWeightKg: sql`0`, // RM doesn't track weight separately
            reservedQuantity: sql`0`,
            minStockLevel: masterProducts.minStockLevel,
            sellingPrice: masterProductRM.purchaseCost, // Show purchase cost for RM
            packageCapacityKg: sql`0`,
            isActive: masterProducts.isActive,
            updatedAt: masterProducts.updatedAt,
            totalInward: sql`0`, // TODO: Calculate from inventory transactions if needed
            totalOutward: sql`0`,
          })
          .from(masterProducts)
          .innerJoin(
            masterProductRM,
            eq(masterProducts.masterProductId, masterProductRM.masterProductId)
          )
          .where(and(...rmConditions))
          .orderBy(masterProducts.masterProductName);

        results.push(...rmResults);
      }

      // Fetch PM products (from master_product_pm table)
      if (!type || type === 'All' || type === 'PM') {
        const pmConditions = [eq(masterProducts.productType, 'PM')];
        if (productId) {
          pmConditions.push(eq(masterProducts.masterProductId, parseInt(productId)));
        }

        const pmResults = await db
          .select({
            productId: masterProducts.masterProductId,
            productName: masterProducts.masterProductName,
            masterProductName: masterProducts.masterProductName,
            productType: masterProducts.productType,
            availableQuantity: masterProductPM.availableQty,
            availableWeightKg: sql`0`, // PM doesn't track weight
            reservedQuantity: sql`0`,
            minStockLevel: masterProducts.minStockLevel,
            sellingPrice: masterProductPM.purchaseCost, // Show purchase cost for PM
            packageCapacityKg: masterProductPM.capacity,
            isActive: masterProducts.isActive,
            updatedAt: masterProducts.updatedAt,
            totalInward: sql`0`, // TODO: Calculate from inventory transactions if needed
            totalOutward: sql`0`,
          })
          .from(masterProducts)
          .innerJoin(
            masterProductPM,
            eq(masterProducts.masterProductId, masterProductPM.masterProductId)
          )
          .where(and(...pmConditions))
          .orderBy(masterProducts.masterProductName);

        results.push(...pmResults);
      }

      // Sort all results by product name
      results.sort((a, b) => {
        const nameA = a.productName || a.masterProductName || '';
        const nameB = b.productName || b.masterProductName || '';
        return nameA.localeCompare(nameB);
      });

      return results.map(item => ({
        ...item,
        availableQuantity: parseFloat(item.availableQuantity || 0),
        availableWeightKg: parseFloat(item.availableWeightKg || 0),
        minStockLevel: parseFloat(item.minStockLevel || 0),
        sellingPrice: parseFloat(item.sellingPrice || 0),
        totalInward: parseFloat(item.totalInward || 0),
        totalOutward: parseFloat(item.totalOutward || 0),
      }));
    } catch (error) {
      console.error('Error fetching stock report:', error);
      throw error;
    }
  }

  async getProfitLossReport(startDate, endDate) {
    try {
      const conditions = [];

      if (startDate) {
        conditions.push(gte(orders.orderDate, new Date(startDate)));
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(orders.orderDate, end));
      }

      conditions.push(notInArray(orders.status, ['Cancelled', 'Rejected', 'Returned']));

      const orderItems = await db
        .select({
          masterProductId: masterProducts.masterProductId,
          masterProductName: masterProducts.masterProductName,
          productId: products.productId,
          productName: products.productName,
          quantity: orderDetails.quantity,
          unitPrice: orderDetails.unitPrice,
          discount: orderDetails.discount,
          productionCost: masterProductFG.productionCost,
          packageCapacityKg: products.packageCapacityKg,
        })
        .from(orderDetails)
        .innerJoin(orders, eq(orderDetails.orderId, orders.orderId))
        .innerJoin(products, eq(orderDetails.productId, products.productId))
        .innerJoin(masterProducts, eq(products.masterProductId, masterProducts.masterProductId))
        .leftJoin(
          masterProductFG,
          eq(masterProducts.masterProductId, masterProductFG.masterProductId)
        )
        .where(and(...conditions));

      const grouped = {};

      for (const item of orderItems) {
        if (!grouped[item.masterProductId]) {
          grouped[item.masterProductId] = {
            masterProductId: item.masterProductId,
            masterProductName: item.masterProductName,
            products: {},
          };
        }

        if (!grouped[item.masterProductId].products[item.productId]) {
          const prodCostRate = parseFloat(item.productionCost || '0');
          let size = parseFloat(item.packageCapacityKg || '0');

          // Fallback: Parse size from Product Name if packageCapacityKg is 0
          if (size <= 0 && item.productName) {
            const match = item.productName.match(/(\d+(\.\d+)?)\s*(L|LTR|KG|ML|GM|G)\b/i);
            if (match) {
              let value = parseFloat(match[1]);
              const unit = match[3].toUpperCase();

              // Normalize to L/Kg
              if (unit === 'ML' || unit === 'GM' || unit === 'G') {
                value = value / 1000;
              }
              size = value;
            }
          }

          let unitProductionCost = 0;
          if (size > 0 && prodCostRate > 0) {
            unitProductionCost = prodCostRate * size;
          }

          grouped[item.masterProductId].products[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            orderQty: 0,
            unitProductionCost,
            totalProductionCost: 0,
            totalSellingPrice: 0,
            grossProfit: 0,
          };
        }

        const prodGroup = grouped[item.masterProductId].products[item.productId];
        prodGroup.orderQty += item.quantity;

        // Calculate total price manually to avoid generated column issues
        const price = parseFloat(item.unitPrice || '0');
        const qty = item.quantity;
        const disc = parseFloat(item.discount || '0');
        const total = price * qty * (1 - disc / 100);

        prodGroup.totalSellingPrice += total;
        prodGroup.totalProductionCost += prodGroup.unitProductionCost * item.quantity;
      }

      const result = Object.values(grouped).map(master => {
        const productList = Object.values(master.products).map(p => {
          p.grossProfit = p.totalSellingPrice - p.totalProductionCost;
          return p;
        });

        productList.sort((a, b) => a.productName.localeCompare(b.productName));

        const masterTotalProfit = productList.reduce((sum, p) => sum + p.grossProfit, 0);
        const masterTotalSales = productList.reduce((sum, p) => sum + p.totalSellingPrice, 0);

        return {
          ...master,
          products: productList,
          totalGrossProfit: masterTotalProfit,
          totalSales: masterTotalSales,
        };
      });

      result.sort((a, b) => a.masterProductName.localeCompare(b.masterProductName));

      return result;
    } catch (error) {
      console.error('Error fetching profit loss report:', error);
      throw error;
    }
  }

  // Fetches detailed product transaction history directly from inventory_transactions table (Ledger View)
  async getProductWiseReport(productId, startDate, endDate, productType) {
    try {
      const productIdNum = productId ? parseInt(productId) : null;

      let product = null;
      let bom = [];
      let isMasterProduct = false; // Flag to track if we're dealing with a master product (RM/PM)

      if (productIdNum) {
        // For RM/PM types, the productId is actually a masterProductId, so check master products first
        if (productType === 'RM' || productType === 'PM') {
          const masterProductData = await db.query.masterProducts.findFirst({
            where: (masterProducts, { eq }) => eq(masterProducts.masterProductId, productIdNum),
            with: {
              fgDetails: true,
              rmDetails: true,
              pmDetails: true,
            },
          });

          if (masterProductData) {
            isMasterProduct = true;
            // Transform master product to product-like structure
            product = {
              productId: masterProductData.masterProductId,
              productName: masterProductData.masterProductName,
              masterProductId: masterProductData.masterProductId,
              masterProduct: masterProductData,
              availableQuantity:
                masterProductData.productType === 'RM'
                  ? masterProductData.rmDetails?.availableQty || 0
                  : masterProductData.pmDetails?.availableQty || 0,
              availableWeightKg:
                masterProductData.productType === 'RM'
                  ? masterProductData.rmDetails?.availableWeightKg || 0
                  : null,
            };
          }
        } else {
          // For FG or unknown types, try to find as a SKU (product) first
          product = await db.query.products.findFirst({
            where: (products, { eq }) => eq(products.productId, productIdNum),
            with: {
              masterProduct: {
                with: {
                  fgDetails: true,
                  rmDetails: true,
                  pmDetails: true,
                },
              },
            },
          });

          // If not found as SKU, try to find as master product (fallback for RM/PM)
          if (!product) {
            const masterProductData = await db.query.masterProducts.findFirst({
              where: (masterProducts, { eq }) => eq(masterProducts.masterProductId, productIdNum),
              with: {
                fgDetails: true,
                rmDetails: true,
                pmDetails: true,
              },
            });

            if (masterProductData) {
              isMasterProduct = true;
              // Transform master product to product-like structure
              product = {
                productId: masterProductData.masterProductId,
                productName: masterProductData.masterProductName,
                masterProductId: masterProductData.masterProductId,
                masterProduct: masterProductData,
                availableQuantity:
                  masterProductData.productType === 'RM'
                    ? masterProductData.rmDetails?.availableQty || 0
                    : masterProductData.pmDetails?.availableQty || 0,
                availableWeightKg:
                  masterProductData.productType === 'RM'
                    ? masterProductData.rmDetails?.availableWeightKg || 0
                    : null,
              };
            }
          }
        }

        if (product && product.masterProduct?.productType === 'FG') {
          bom = await db.query.productBom.findMany({
            where: eq(productBom.finishedGoodId, productIdNum),
            with: {
              rawMaterial: {
                with: {
                  masterProduct: true,
                },
              },
            },
          });
        }
      }

      // Build where conditions for inventory transactions
      const conditions = [];
      if (productIdNum) {
        if (isMasterProduct) {
          // For master products (RM/PM), filter by masterProductId directly in inventory_transactions
          conditions.push(eq(inventoryTransactions.masterProductId, productIdNum));
        } else {
          conditions.push(eq(inventoryTransactions.productId, productIdNum));
        }
      } else if (productType && productType !== 'All') {
        if (productType === 'Sub-Product') {
          conditions.push(eq(masterProductFG.subcategory, 'Sub-Product'));
        } else {
          conditions.push(eq(masterProducts.productType, productType));
        }
      }

      if (startDate) {
        conditions.push(gte(inventoryTransactions.createdAt, new Date(startDate)));
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        conditions.push(lte(inventoryTransactions.createdAt, end));
      }

      // Fetch inventory transactions with enriched references
      // For FG: join via products.masterProductId
      // For RM/PM: join directly via inventoryTransactions.masterProductId
      const query = db
        .select({
          tx: inventoryTransactions,
          inward: materialInward,
          order: orders,
          customer: customers,
          batch: productionBatch,
          discard: materialDiscard,
          p: products,
          mp: masterProducts,
          supplier: suppliers,
          fg: masterProductFG,
        })
        .from(inventoryTransactions)
        .leftJoin(products, eq(inventoryTransactions.productId, products.productId))
        // Join masterProducts: use products.masterProductId for FG, or inventoryTransactions.masterProductId for RM/PM
        .leftJoin(
          masterProducts,
          sql`COALESCE(${products.masterProductId}, ${inventoryTransactions.masterProductId}) = ${masterProducts.masterProductId}`
        )
        .leftJoin(
          masterProductFG,
          eq(masterProducts.masterProductId, masterProductFG.masterProductId)
        )
        .leftJoin(
          materialInward,
          and(
            eq(inventoryTransactions.referenceId, sql`CAST(${materialInward.inwardId} AS INTEGER)`),
            eq(inventoryTransactions.referenceType, 'Inward')
          )
        )
        .leftJoin(suppliers, eq(materialInward.supplierId, suppliers.supplierId))
        .leftJoin(
          orders,
          and(
            eq(inventoryTransactions.referenceId, orders.orderId),
            inArray(inventoryTransactions.referenceType, ['Order', 'Dispatch'])
          )
        )
        .leftJoin(customers, eq(orders.customerId, customers.customerId))
        .leftJoin(
          productionBatch,
          and(
            eq(inventoryTransactions.referenceId, productionBatch.batchId),
            eq(inventoryTransactions.referenceType, 'Batch')
          )
        )
        .leftJoin(
          materialDiscard,
          and(
            eq(inventoryTransactions.referenceId, materialDiscard.discardId),
            eq(inventoryTransactions.referenceType, 'Discard')
          )
        )
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(inventoryTransactions.createdAt), desc(inventoryTransactions.transactionId));

      const transactions = await query;

      const formattedTransactions = transactions.map(
        ({ tx, inward, order, customer, batch, discard, p, mp, supplier, fg }) => {
          const quantity = Number(tx.quantity);
          const isInward = quantity > 0;
          const isOutward = quantity < 0;

          // Prioritize SKU product name (sub-product) over master product name
          const currentProductName = p?.productName || mp?.masterProductName || 'Unknown Product';

          // Determine a more descriptive "type" (Details) based on available reference data
          // For FG: customer name for dispatch, batch no for production output
          // For RM: supplier name for inward, batch no for production consumption
          let referenceInfo = '-';

          if (
            tx.transactionType === 'Dispatch' ||
            tx.referenceType === 'Dispatch' ||
            tx.referenceType === 'Order'
          ) {
            // Dispatch/Order - show customer name
            referenceInfo =
              customer?.companyName || (order ? `Order: ${order.orderNumber}` : tx.notes || '-');
          } else if (tx.transactionType === 'Production Consumption') {
            // Production Consumption (RM being used) - show batch number AND Date
            const dateStr = batch?.scheduledDate
              ? new Date(batch.scheduledDate).toLocaleDateString()
              : '';
            referenceInfo = batch?.batchNo
              ? `${batch.batchNo}${dateStr ? ` (${dateStr})` : ''}`
              : tx.notes || '-';
          } else if (tx.transactionType === 'Production Output' || tx.referenceType === 'Batch') {
            // Production Output (FG being created) - show batch number AND Date
            const dateStr = batch?.scheduledDate
              ? new Date(batch.scheduledDate).toLocaleDateString()
              : '';
            referenceInfo = batch?.batchNo
              ? `${batch.batchNo}${dateStr ? ` (${dateStr})` : ''}`
              : tx.notes || '-';
          } else if (tx.transactionType === 'Inward' || tx.referenceType === 'Inward') {
            // Inward (material received) - show supplier name
            referenceInfo = supplier?.supplierName || (inward ? inward.billNo : tx.notes || '-');
          } else if (tx.transactionType === 'Initial Stock') {
            // Initial stock entry
            referenceInfo = tx.notes || 'Initial Stock';
          } else if (tx.transactionType === 'Discard' || tx.referenceType === 'Discard') {
            // Discarded material - show reason
            referenceInfo = discard?.reason || tx.notes || 'Material Discarded';
          } else if (tx.transactionType === 'Adjustment') {
            // Manual adjustment
            referenceInfo = tx.notes || 'Adjustment';
          } else {
            // Fallback
            referenceInfo = tx.notes || tx.referenceType || tx.transactionType || '-';
          }

          // Use the actual transaction type from the database
          const transitionType = tx.transactionType;

          let category = mp?.productType || 'Unknown';
          if (fg?.subcategory === 'Sub-Product') {
            category = 'Sub-Product';
          }

          const preTransactionStock = (tx.balanceAfter || 0) - (isInward ? quantity : -Math.abs(quantity));

          return {
            transactionId: Number(tx.transactionId),
            productName: currentProductName,
            date: tx.createdAt ? new Date(tx.createdAt).toISOString() : '-', // Return full ISO string for time display
            type: referenceInfo,
            batchType: batch?.batchType, // Return batch type (MTS/MTO)
            cr: isInward ? quantity : 0,
            dr: isOutward ? Math.abs(quantity) : 0,
            balance: tx.balanceAfter || 0,
            stockBefore: preTransactionStock, // Initially set to individual pre-tx stock
            transactionType: transitionType,
            productCategory: category,
            notes: tx.notes || '',
          };
        }
      );

      // Post-processing: "Available Stock" should be the Stock at Start of Day (Opening Balance)
      // Since formattedTransactions is ordered by DESC (Latest -> Earliest),
      // we can iterate through it. The *last* transaction we encounter for a given Product+Date
      // is effectively the *first* transaction of that day.
      // Its 'stockBefore' (individual pre-tx stock) represents the Day's Opening Balance.

      const dayOpeningBalances = new Map(); // Key: "ProductName_YYYY-MM-DD", Value: OpeningBalance

      // Pass 1: find the opening balance for each Product+Date
      formattedTransactions.forEach(item => {
        if (item.date === '-') return;
        const dateKey = item.date.split('T')[0];
        const key = `${item.productName}_${dateKey}`;

        // Since we iterate DESC, we overwrite the value.
        // The last overwrite will be from the earliest transaction of the day.
        dayOpeningBalances.set(key, item.stockBefore);
      });

      // Pass 2: apply the day's opening balance to all items
      const finalTransactions = formattedTransactions.map(item => {
        if (item.date === '-') return item;
        const dateKey = item.date.split('T')[0];
        const key = `${item.productName}_${dateKey}`;

        if (dayOpeningBalances.has(key)) {
          return {
            ...item,
            stockBefore: dayOpeningBalances.get(key),
          };
        }
        return item;
      });

      return {
        product: product
          ? {
            ...product,
            masterProductName: product.masterProduct?.masterProductName,
            productType: product.masterProduct?.productType,
            fgDetails: product.masterProduct?.fgDetails,
            rmDetails: product.masterProduct?.rmDetails,
            pmDetails: product.masterProduct?.pmDetails,
          }
          : null,
        transactions: finalTransactions,
        bom: bom.map(b => ({
          rawMaterialName:
            b.rawMaterial?.masterProduct?.masterProductName || b.rawMaterial?.productName,
          percentage: Number(b.percentage),
          notes: b.notes,
        })),
      };
    } catch (error) {
      console.error('Error fetching product wise report:', error);
      throw error;
    }
  }

  async getOrderCountsByMonth() {
    try {
      const result = await db.execute(sql`
        SELECT 
            EXTRACT(YEAR FROM order_date)::integer as "year",
            EXTRACT(MONTH FROM order_date)::integer as "month",
            COUNT(*)::integer as "count"
        FROM app.orders
        GROUP BY 1, 2
    `);
      return result.rows;
    } catch (error) {
      console.error('Error in getOrderCountsByMonth service', error);
      throw error;
    }
  }

  async getCancelledOrders(year, month) {
    try {
      // Use both order_date (placed date) and updated_at (approx. cancellation date)
      // to ensure highly recently cancelled items appear in the current filter.
      let whereClause = sql`LOWER(COALESCE(o.status, '')) IN ('cancelled', 'rejected', 'returned', 'cancel', 'reject')`;

      if (year) {
        const yearInt = parseInt(year);
        whereClause = sql`${whereClause} AND (
          EXTRACT(YEAR FROM o.order_date) = ${yearInt} 
          OR EXTRACT(YEAR FROM o.updated_at) = ${yearInt}
        )`;
      }

      if (month && month !== '') {
        const monthInt = parseInt(month) + 1; // Frontend is 0-indexed, DB 1-indexed
        whereClause = sql`${whereClause} AND (
          EXTRACT(MONTH FROM o.order_date) = ${monthInt} 
          OR EXTRACT(MONTH FROM o.updated_at) = ${monthInt}
        )`;
      }

      const result = await db.execute(sql`
          SELECT
              o.order_id as "OrderID",
              c.company_name as "CompanyName",
              CONCAT(e.first_name, ' ', e.last_name) AS "SalesPerson",
              o.order_date as "OrderCreatedDate",
              c.location as "Location",
              COALESCE(a.remarks, o.notes) as "Remark",
              o.total_amount as "Amount",
              o.status as "Status",
              o.updated_at as "UpdatedAt"
          FROM app.orders o
          JOIN app.customers c ON o.customer_id = c.customer_id
          LEFT JOIN app.employees e ON o.salesperson_id = e.employee_id
          LEFT JOIN app.accounts a ON o.order_id = a.order_id
          WHERE ${whereClause}
          ORDER BY GREATEST(o.order_date, o.updated_at) DESC
      `);

      return result.rows;
    } catch (error) {
      console.error('Error in getCancelledOrders service', error);
      throw error;
    }
  }
}
