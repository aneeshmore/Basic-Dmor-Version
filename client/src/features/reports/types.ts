// ============================================
// REPORTS TYPES
// ============================================

import { LucideIcon } from 'lucide-react';

export interface ReportStats {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color: string;
}

export interface ProductInfo {
  productId: number;
  productName: string;
  productType: string;
  masterProductName: string;
  availableQuantity: number;
  availableWeightKg?: string | number;
  minStockLevel: number;
  fgDetails?: {
    fgDensity: string;
  };
  rmDetails?: {
    rmDensity: string;
  };
  pmDetails?: {
    capacity: string;
  };
}

export interface BOMItem {
  rawMaterialName: string;
  percentage: number;
  notes: string | null;
}

export interface ReportCategory {
  id: string;
  name: string;
  description: string;
}

export interface Report {
  id: string;
  title: string;
  category: string;
  generatedDate: string;
  status: 'Pending' | 'Completed' | 'Failed';
}

export interface BatchSubProductReportItem {
  subProductId: number;
  productName: string;
  batchQty: string | null;
  actualQty: string | null;
  capacity?: string | number | null;
  fillingDensity?: string | number | null;
}

export interface RawMaterialReportItem {
  bomId: string;
  rawMaterialId: number;
  rawMaterialName: string;
  productType?: string;
  percentage: string;
  actualQty?: string;
  unitPrice?: number;
  notes: string | null;
  isAdditional?: boolean;
}

export interface BatchProductionReportItem {
  batchId: number;
  batchNo: string;
  productName: string | null;
  productType?: 'FG' | 'RM' | 'PM';
  batchType?: 'MAKE_TO_ORDER' | 'MAKE_TO_STOCK'; // Added batch type
  scheduledDate: string | null;
  status: string;
  plannedQuantity: string;
  actualQuantity: string | null;
  actualWeightKg: string | null;
  startedAt: string | null;
  completedAt: string | null;
  timeRequired: string;
  supervisor: string | null;
  labourNames: string | null;
  qualityStatus: string | null;
  subProducts: BatchSubProductReportItem[];
  rawMaterials?: RawMaterialReportItem[];
  packagingMaterials?: {
    packagingId: number;
    packagingName: string;
    plannedQty: number;
    actualQty: number;
  }[];
  density?: string | null;
  actualDensity?: string | null;
  packingDensity?: string | null;
  viscosity?: string | null;
  actualViscosity?: string | null;
  actualTimeHours?: string | null;
  actualWaterPercentage?: string | null;
  productionRemarks?: string | null;
}

export interface DailyConsumptionReportItem {
  masterProductId: number;
  masterProductName: string;
  productType: string;
  openingQty: number;
  consumption: number;
  closingQty: number;
}

export interface MaterialInwardReportItem {
  inwardId: number;
  inwardDate: string;
  productName: string;
  productType?: 'FG' | 'RM' | 'PM';
  supplierName: string | null;
  billNo: string | null;
  quantity: string;
  unitPrice: string | null;
  totalCost: string | null;
  notes: string | null;
  totalQty?: number;
}

export interface StockReportItem {
  productId: number;
  productName: string;
  masterProductName: string;
  productType: string;
  availableQuantity: number;
  reservedQuantity: number;
  availableWeightKg: string;
  reservedWeightKg: string;
  minStockLevel: number;
  sellingPrice: string;
  packageQuantity: number;
  packageCapacityKg: string | null;
  incentiveAmount?: string;
  isActive: boolean;
  updatedAt: string;
  totalInward?: number;
  totalOutward?: number;
  latestTransType?: string;
}

export interface ProductWiseReportItem {
  transactionId: number;
  productName: string;
  date: string;
  type: string; // Supplier name or customer name or batch info
  cr: number; // Credit (Inward)
  dr: number; // Debit (Outward)
  balance: number; // Running balance
  stockBefore?: number; // Opening balance for this transaction
  transactionType: string;
  productCategory?: string;
}
