import { useState, useEffect, useRef } from 'react';
import { FileDown } from 'lucide-react';
import { formatDateIST } from '@/utils/formatters';
import { productionManagerApi } from '../api/productionManagerApi';
import { showToast } from '@/utils/toast';
import { Button, Modal } from '@/components/ui';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { companyApi } from '@/features/company/api/companyApi';
import { CompanyInfo } from '@/features/company/types';

interface BatchReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: number;
  batchNo: string;
  reportType: 'batch-chart' | 'completion-chart';
}

export default function BatchReportModal({
  isOpen,
  onClose,
  batchId,
  batchNo,
  reportType,
}: BatchReportModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [batchData, setBatchData] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [relatedSkus, setRelatedSkus] = useState<any[]>([]); // All SKUs for this master product
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const reportPreviewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !batchId) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await productionManagerApi.getBatchDetails(batchId);
        setBatchData(data.batch);
        setMaterials(data.materials || []);
        setOrders(data.orders || []);
        setRelatedSkus(data.relatedSkus || []); // Get ALL SKUs for this master product
        console.log('BatchReportModal: relatedSkus fetched:', data.relatedSkus);
      } catch (error) {
        console.error('Failed to fetch batch data:', error);
        showToast.error('Failed to load batch details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Fetch Company Info
    const fetchCompanyInfo = async () => {
      try {
        const res = await companyApi.get();
        if (res.data) {
          setCompanyInfo((res.data as any).data || res.data);
        }
      } catch (err) {
        console.error('Failed to fetch company info', err);
      }
    };
    fetchCompanyInfo();
  }, [isOpen, batchId]);

  // Duration Calculation Helper
  const calculateDuration = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return '-';
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs <= 0) return '-';

    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const mins = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (mins > 0 || parts.length === 0) parts.push(`${mins}m`);

    return parts.join(' ');
  };

  // Sort materials by sequence first
  const sortedMaterials = [...materials].sort(
    (a: any, b: any) => (a.batchMaterial?.sequence || 0) - (b.batchMaterial?.sequence || 0)
  );

  // Get the highest sequence number from raw materials
  const maxRawMaterialSequence = sortedMaterials.reduce(
    (max: number, m: any) => Math.max(max, m.batchMaterial?.sequence || 0),
    0
  );

  // Extract packaging materials from orders
  const packagingMaterials = orders
    .filter((o: any) => o.packagingMasterProductName) // Only if packaging exists
    .map((o: any, idx: number) => {
      // Use the flattened fields from backend
      const unitPrice = parseFloat(o.packagingPurchaseCost || 0);
      const qty = Number(o.batchProduct?.plannedUnits) || 0;
      return {
        isPackaging: true,
        sequence: maxRawMaterialSequence + idx + 1,
        materialName: o.packagingMasterProductName,
        requiredQuantity: qty,
        unitPrice: unitPrice,
        total: unitPrice * qty,
        waitingTime: 0,
        isAdditional: false,
      };
    });

  // Keep raw materials separate from packaging
  const rawMaterialsOnly = sortedMaterials.map((m: any) => ({
    isPackaging: false,
    sequence: m.batchMaterial?.sequence || 0,
    materialName: m.masterProduct?.masterProductName || m.material?.productName || 'Unknown',
    requiredQuantity: parseFloat(m.batchMaterial?.requiredQuantity) || 0,
    waitingTime: parseInt(m.batchMaterial?.waitingTime) || 0,
    isAdditional: m.isAdditional === true || m.batchMaterial?.isAdditional === true,
    batchMaterial: m.batchMaterial,
    masterProduct: m.masterProduct,
    material: m.material,
  }));

  // For backward compatibility, keep allMaterials for totals
  const allMaterials = [...rawMaterialsOnly, ...packagingMaterials];

  const totalPackages = orders.reduce(
    (sum: number, o: any) => sum + (Number(o.batchProduct?.plannedUnits) || 0),
    0
  );

  const totalPlannedRawMaterials = rawMaterialsOnly.reduce(
    (sum: number, m: any) => sum + (m.requiredQuantity || 0),
    0
  );
  const totalWait = rawMaterialsOnly.reduce((sum: number, m: any) => sum + (m.waitingTime || 0), 0);
  const totalPackagingCost = packagingMaterials.reduce(
    (sum: number, m: any) => sum + (m.total || 0),
    0
  );

  const totalActualQty = orders.reduce(
    (sum: number, o: any) => sum + (Number(o.batchProduct?.producedUnits) || 0),
    0
  );

  // Calculate screen totals for product table
  let screenTotalLtr = 0;
  let screenTotalKg = 0;

  if (batchData?.status === 'Completed' && orders.length > 0) {
    orders.forEach((o: any) => {
      const capacityLtr = parseFloat(o.packagingCapacity || '0');
      const fillingDensity =
        parseFloat(o.product?.fillingDensity || '0') || parseFloat(batchData.fgDensity || '0');
      const actualQty = parseFloat(o.batchProduct?.producedUnits || '0');
      const plannedQty = parseFloat(o.batchProduct?.plannedUnits || '0');
      const effQty = actualQty > 0 ? actualQty : plannedQty;

      const ltr = effQty * capacityLtr;
      const kg = ltr * fillingDensity;
      screenTotalLtr += ltr;
      screenTotalKg += kg;
    });
  } else {
    // For scheduled/in-progress batches
    const ordersMapScreen = new Map<string, any>();
    orders.forEach((o: any) => {
      const productId = o.batchProduct?.productId || o.product?.productId;
      if (productId) ordersMapScreen.set(String(productId), o);
    });

    const skusToShow =
      relatedSkus.length > 0
        ? relatedSkus
        : orders.map((o: any) => ({
            productId: o.product?.productId,
            productName: o.product?.productName || 'Unknown',
          }));

    skusToShow.forEach((sku: any) => {
      const order = ordersMapScreen.get(String(sku.productId));
      const capacityLtr = parseFloat(order?.packagingCapacity || '0');
      const fillingDensity =
        parseFloat(order?.product?.fillingDensity || '0') ||
        parseFloat(batchData?.fgDensity || '0');
      const plannedQty = parseFloat(order?.batchProduct?.plannedUnits || '0');
      const actualQty = parseFloat(order?.batchProduct?.producedUnits || '0');
      const effQty = actualQty > 0 ? actualQty : plannedQty;

      const ltr = effQty * capacityLtr;
      const kg = ltr * fillingDensity;
      screenTotalLtr += ltr;
      screenTotalKg += kg;
    });
  }

  // Export to PDF (exact visual replica of preview)
  const handleExportPDF = async () => {
    if (!batchData || !reportPreviewRef.current) return;
    const previewEl = reportPreviewRef.current;
    const styleMutations: Array<{ el: HTMLElement; previous: Record<string, string> }> = [];
    const touchedElements = new Set<HTMLElement>();

    const applyTemporaryStyles = (el: HTMLElement, styles: Record<string, string>) => {
      if (touchedElements.has(el)) return;
      touchedElements.add(el);

      const previous: Record<string, string> = {};
      Object.keys(styles).forEach(key => {
        previous[key] = el.style.getPropertyValue(key);
      });
      styleMutations.push({ el, previous });

      Object.entries(styles).forEach(([key, value]) => {
        el.style.setProperty(key, value);
      });
    };

    try {
      showToast.loading('Preparing PDF...', 'batch-report-pdf');

      // Download-only styling: remove scroll containers/limits while capturing.
      applyTemporaryStyles(previewEl, {
        overflow: 'visible',
        'overflow-x': 'visible',
        'overflow-y': 'visible',
        'max-height': 'none',
        height: 'auto',
      });

      previewEl
        .querySelectorAll<HTMLElement>(
          '.overflow-auto, .overflow-x-auto, .overflow-y-auto, [style*="overflow"], [style*="max-height"]'
        )
        .forEach(el => {
          applyTemporaryStyles(el, {
            overflow: 'visible',
            'overflow-x': 'visible',
            'overflow-y': 'visible',
            'max-height': 'none',
            height: 'auto',
          });
        });

      previewEl.querySelectorAll<HTMLElement>('table').forEach(table => {
        applyTemporaryStyles(table, {
          width: '100%',
          'border-collapse': 'collapse',
        });
      });

      const dataUrl = await toPng(previewEl, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: node => {
          if (node instanceof HTMLElement && node.classList.contains('no-print')) {
            return false;
          }
          return true;
        },
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      let heightLeft = imgHeight;
      let yPosition = 0;

      pdf.addImage(dataUrl, 'PNG', 0, yPosition, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        yPosition = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, yPosition, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName =
        reportType === 'batch-chart'
          ? `Batch_${batchData.batchNo}.pdf`
          : `Completion_${batchData.batchNo}.pdf`;

      pdf.save(fileName);
      showToast.success('PDF Downloaded!', 'batch-report-pdf');
    } catch (error) {
      console.error('Failed to export batch PDF preview:', error);
      showToast.error('Failed to generate PDF', 'batch-report-pdf');
    } finally {
      // Restore UI exactly as before capture.
      for (let i = styleMutations.length - 1; i >= 0; i -= 1) {
        const { el, previous } = styleMutations[i];
        Object.entries(previous).forEach(([key, value]) => {
          if (value) {
            el.style.setProperty(key, value);
          } else {
            el.style.removeProperty(key);
          }
        });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${reportType === 'batch-chart' ? 'Batch Chart' : 'Completion Report'} - ${batchNo}`}
      size="lg"
    >
      <div className="bg-white p-4 md:p-8 rounded-lg shadow-sm border border-gray-200 w-full mx-auto printable-content text-black">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--primary)]"></div>
          </div>
        ) : batchData ? (
          <div
            ref={reportPreviewRef}
            className="border-2 border-gray-800 p-4 md:p-6 min-h-[600px] bg-white text-black text-xs md:text-sm"
          >
            {/* Header */}
            <div className="text-center mb-4">
              <h1 className="text-2xl font-bold">{companyInfo?.companyName || 'DMOR PAINTS'}</h1>
              <div className="border-b-2 border-gray-800 mt-2"></div>
            </div>

            {/* Batch Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
              <div>
                <p>
                  <span className="font-semibold">Batch No:</span> {batchData.batchNo}
                </p>
                <p>
                  <span className="font-semibold">Product Name:</span>{' '}
                  {batchData.masterProductName || 'N/A'}
                </p>
                <p>
                  <span className="font-semibold">Supervisor:</span> Mr.{' '}
                  {batchData.supervisorName || 'N/A'}
                </p>
                <p>
                  <span className="font-semibold">Labours:</span> {batchData.labourNames || 'N/A'}
                </p>
                <p>
                  <span className="font-semibold">Standard Density:</span>{' '}
                  {batchData.density ? Number(batchData.density).toFixed(3) : '-'}
                </p>
                <p>
                  <span className="font-semibold">Water %:</span>{' '}
                  {batchData.waterPercentage || '0.00'}
                </p>
                <p>
                  <span className="font-semibold">Production Qty:</span> {batchData.plannedQuantity}
                </p>
              </div>
              <div>
                <p>
                  <span className="font-semibold">Date:</span>{' '}
                  {formatDateIST(batchData.scheduledDate)}
                </p>
                {reportType === 'batch-chart' ? (
                  <>
                    <p>
                      <span className="font-semibold">Actual Density:</span>{' '}
                    </p>
                    <p>
                      <span className="font-semibold">Product Viscosity:</span>{' '}
                    </p>
                    <p>
                      <span className="font-semibold">Mill Based Viscosity:</span>{' '}
                    </p>
                    <p>
                      <span className="font-semibold">Standard Viscosity :</span>{' '}
                      {batchData.viscosity ? Number(batchData.viscosity).toFixed(0) : '-'}
                    </p>

                    <div className="flex items-center gap-2 py-1 whitespace-nowrap">
                      <span className="font-semibold">Hegman gauge:</span>
                      <div className="flex gap-1.5">
                        {[6, 7, 8].map(num => (
                          <div
                            key={num}
                            className="w-5 h-5 border border-black rounded-full flex items-center justify-center text-[10px] leading-none"
                          >
                            {num}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p>
                      <span className="font-semibold">Total Time:</span>{' '}
                      {calculateDuration(batchData.startedAt, batchData.completedAt)}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              {reportType === 'batch-chart' ? (
                <></>
              ) : (
                /* Quality & Variance Analysis Table for Completion Chart */
                <div className="text-left">
                  <h4 className="font-bold text-xs mb-1 text-gray-700">
                    Quality & Variance Analysis
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-600 text-xs">
                      <thead>
                        <tr>
                          <th className="border border-gray-600 px-1 py-0.5">Parameter</th>
                          <th className="border border-gray-600 px-1 py-0.5">Input</th>
                          <th className="border border-gray-600 px-1 py-0.5">Output</th>
                          <th className="border border-gray-600 px-1 py-0.5">Variance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const stdDensity = batchData.fgDensity
                            ? parseFloat(batchData.fgDensity)
                            : batchData.density
                              ? parseFloat(batchData.density)
                              : 0;
                          const actDensity = batchData.actualDensity
                            ? parseFloat(batchData.actualDensity)
                            : 0;
                          const densityVariance = actDensity - stdDensity;

                          const stdViscosity = batchData.viscosity
                            ? parseFloat(batchData.viscosity)
                            : 0;
                          const actViscosity = batchData.actualViscosity
                            ? parseFloat(batchData.actualViscosity)
                            : 0;
                          const viscosityVariance = actViscosity - stdViscosity;

                          const actualQty = batchData.actualQuantity
                            ? parseFloat(batchData.actualQuantity)
                            : 0;
                          const stdTotalWeight = rawMaterialsOnly.reduce(
                            (sum: number, m: any) => sum + (m.requiredQuantity || 0),
                            0
                          );

                          const totalLtrForActWeight = orders.reduce((s: number, o: any) => {
                            const actualQty = parseFloat(o.batchProduct?.producedUnits || '0');
                            const capacityLtr = parseFloat(o.packagingCapacity || '0');
                            return s + actualQty * capacityLtr;
                          }, 0);

                          const actTotalWeight = totalLtrForActWeight * actDensity;
                          const totalWeightVariance = actTotalWeight - stdTotalWeight;

                          return (
                            <>
                              <tr>
                                <td className="border border-gray-600 px-1 py-0.5">
                                  Standard Density
                                </td>
                                <td className="border border-gray-600 px-1 py-0.5 text-right">
                                  {stdDensity.toFixed(2)}
                                </td>
                                <td className="border border-gray-600 px-1 py-0.5 text-right">
                                  {actDensity.toFixed(2)}
                                </td>
                                <td className="border border-gray-600 px-1 py-0.5 text-right">
                                  {densityVariance.toFixed(2)}
                                </td>
                              </tr>
                              <tr>
                                <td className="border border-gray-600 px-1 py-0.5">Viscosity</td>
                                <td className="border border-gray-600 px-1 py-0.5 text-right">
                                  {stdViscosity > 0 ? stdViscosity : '-'}
                                </td>
                                <td className="border border-gray-600 px-1 py-0.5 text-right">
                                  {actViscosity > 0 ? actViscosity : '-'}
                                </td>
                                <td className="border border-gray-600 px-1 py-0.5 text-right">
                                  {viscosityVariance.toFixed(2)}
                                </td>
                              </tr>
                              <tr>
                                <td className="border border-gray-600 px-1 py-0.5">
                                  Total Weight (Kg)
                                </td>
                                <td className="border border-gray-600 px-1 py-0.5 text-right">
                                  {stdTotalWeight.toFixed(2)}
                                </td>
                                <td className="border border-gray-600 px-1 py-0.5 text-right">
                                  {screenTotalKg > 0 ? screenTotalKg.toFixed(3) : '-'}
                                </td>
                                <td className="border border-gray-600 px-1 py-0.5 text-right">
                                  {(screenTotalKg - stdTotalWeight).toFixed(2)}
                                </td>
                              </tr>
                            </>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Main Content Areas: Side-by-Side Tables */}
            <div className="flex flex-col md:flex-row gap-4 items-start">
              {/* Left Side: Materials Table */}
              <div className="flex-1 w-full overflow-x-auto">
                <table className="w-full border-collapse border border-gray-800 text-sm mb-4">
                  <thead>
                    <tr>
                      <th className="border border-gray-800 px-2 py-1 w-8">Seq</th>
                      <th className="border border-gray-800 px-2 py-1">Product</th>
                      <th className="border border-gray-800 px-2 py-1 w-12">Wait</th>
                      <th className="border border-gray-800 px-2 py-1 w-16">
                        {reportType === 'batch-chart' ? 'UseQty' : 'Planned'}
                      </th>
                      <th className="border border-gray-800 px-2 py-1 w-16">
                        {reportType === 'batch-chart' ? 'Check' : 'Actual'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {/* Regular materials first */}
                    {rawMaterialsOnly
                      .filter(
                        (m: any) =>
                          !m.isAdditional &&
                          !m.batchMaterial?.isAdditional &&
                          parseFloat(m.requiredQuantity || '0') > 0
                      )
                      .map((m: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[var(--surface-hover)]">
                          <td className="px-2 py-1 text-xs border border-gray-800 text-center">
                            {m.sequence || idx + 1}
                          </td>
                          <td className="px-2 py-1 text-xs border border-gray-800">
                            {m.materialName}
                          </td>
                          <td className="px-2 py-1 text-xs border border-gray-800 text-center">
                            {m.waitingTime ? `${m.waitingTime}m` : ''}
                          </td>
                          <td className="px-2 py-1 text-xs border border-gray-800 text-right">
                            {m.requiredQuantity.toFixed(3)}
                          </td>
                          <td className="px-2 py-1 text-xs border border-gray-800 text-right"></td>
                        </tr>
                      ))}
                    {/* Additional materials at bottom in bold */}
                    {rawMaterialsOnly
                      .filter(
                        (m: any) =>
                          m.isAdditional ||
                          m.batchMaterial?.isAdditional ||
                          parseFloat(m.requiredQuantity || '0') <= 0
                      )
                      .map((m: any, idx: number) => {
                        const regularCount = rawMaterialsOnly.filter(
                          (rm: any) =>
                            !rm.isAdditional &&
                            !rm.batchMaterial?.isAdditional &&
                            parseFloat(rm.requiredQuantity || '0') > 0
                        ).length;
                        return (
                          <tr key={`extra-${idx}`} className="hover:bg-[var(--surface-hover)]">
                            <td className="px-2 py-1 text-xs border border-gray-800 text-center font-bold">
                              {regularCount + idx + 1}
                            </td>
                            <td className="px-2 py-1 text-xs border border-gray-800 font-bold">
                              {m.materialName}
                            </td>
                            <td className="px-2 py-1 text-xs border border-gray-800 text-center font-bold"></td>
                            <td className="px-2 py-1 text-xs border border-gray-800 text-right font-bold">
                              {m.requiredQuantity.toFixed(3)}
                            </td>
                            <td className="px-2 py-1 text-xs border border-gray-800 text-right font-bold"></td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-white text-black font-bold">
                      <td colSpan={2} className="border border-gray-800 px-2 py-1 text-right">
                        Total
                      </td>
                      <td className="border border-gray-800 px-2 py-1 text-center">{totalWait}m</td>
                      <td className="border border-gray-800 px-2 py-1 text-right">
                        {totalPlannedRawMaterials.toFixed(3)}
                      </td>
                      <td className="border border-gray-800 px-2 py-1"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Right Side: Products (SKUs) Table */}
              <div className="flex-1 w-full overflow-x-auto">
                <table className="w-full border-collapse border border-gray-800 text-sm mb-4">
                  <thead>
                    <tr>
                      <th className="border border-gray-800 px-2 py-1">Shade</th>
                      <th className="border border-gray-800 px-2 py-1 w-12">QTY</th>
                      <th className="border border-gray-800 px-2 py-1 w-16">ACT QTY</th>
                      <th className="border border-gray-800 px-2 py-1 w-12">LTR</th>
                      <th className="border border-gray-800 px-2 py-1 w-16">KG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // For completed batches, use orders directly (they have actual production data with product names)
                      // For scheduled/in-progress batches, use relatedSkus to show all possible SKUs
                      if (batchData.status === 'Completed' && orders.length > 0) {
                        // Use orders directly for completed batches - this has the actual SKU data
                        return orders.map((o: any, idx: number) => {
                          const productName = o.product?.productName || 'Unknown';
                          const capacityLtr = parseFloat(o.packagingCapacity || '0');
                          const fillingDensity =
                            parseFloat(o.product?.fillingDensity || '0') ||
                            parseFloat(batchData.fgDensity || '0');

                          const plannedQty = parseFloat(o.batchProduct?.plannedUnits || '0');
                          const actualQty = parseFloat(o.batchProduct?.producedUnits || '0');
                          const effQty = actualQty > 0 ? actualQty : plannedQty;
                          const ltr = effQty * capacityLtr;
                          const kg = ltr * fillingDensity;

                          return (
                            <tr key={idx}>
                              <td className="border border-gray-800 px-2 py-1">{productName}</td>
                              <td className="border border-gray-800 px-2 py-1 text-center">
                                {plannedQty > 0 ? plannedQty : 0}
                              </td>
                              <td className="border border-gray-800 px-2 py-1 text-center">
                                {actualQty > 0 ? actualQty : ''}
                              </td>
                              <td className="border border-gray-800 px-2 py-1 text-right">
                                {ltr > 0 ? ltr.toFixed(3) : ''}
                              </td>
                              <td className="border border-gray-800 px-2 py-1 text-right">
                                {kg > 0 ? kg.toFixed(3) : ''}
                              </td>
                            </tr>
                          );
                        });
                      }

                      const ordersMapScreen = new Map<string, any>();
                      orders.forEach((o: any) => {
                        const productId = o.batchProduct?.productId || o.product?.productId;
                        if (productId) ordersMapScreen.set(String(productId), o);
                      });

                      const skusToShow =
                        relatedSkus.length > 0
                          ? relatedSkus
                          : orders.map((o: any) => ({
                              productId: o.product?.productId,
                              productName: o.product?.productName || 'Unknown',
                            }));

                      return skusToShow.map((sku: any, idx: number) => {
                        const order = ordersMapScreen.get(String(sku.productId));
                        const capacityLtr = parseFloat(order?.packagingCapacity || '0');
                        const fillingDensity =
                          parseFloat(order?.product?.fillingDensity || '0') ||
                          parseFloat(batchData.fgDensity || '0');

                        const plannedQty = parseFloat(order?.batchProduct?.plannedUnits || '0');
                        const actualQty = parseFloat(order?.batchProduct?.producedUnits || '0');

                        const effQty = actualQty > 0 ? actualQty : plannedQty;
                        const ltr = effQty * capacityLtr;
                        const kg = ltr * fillingDensity;

                        return (
                          <tr key={idx}>
                            <td className="border border-gray-800 px-2 py-1">
                              {sku.productName || 'Unknown'}
                            </td>
                            <td className="border border-gray-800 px-2 py-1 text-center">
                              {plannedQty > 0 ? plannedQty : 0}
                            </td>
                            <td className="border border-gray-800 px-2 py-1 text-center">
                              {actualQty > 0 ? actualQty : ''}
                            </td>
                            <td className="border border-gray-800 px-2 py-1 text-right">
                              {ltr > 0 ? ltr.toFixed(3) : ''}
                            </td>
                            <td className="border border-gray-800 px-2 py-1 text-right">
                              {kg > 0 ? kg.toFixed(3) : ''}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                  <tfoot>
                    <tr className="bg-white text-black font-bold">
                      <td className="border border-gray-800 px-2 py-1 text-right" colSpan={1}>
                        Total
                      </td>
                      <td className="border border-gray-800 px-2 py-1 text-center">
                        {totalPackages}
                      </td>
                      <td className="border border-gray-800 px-2 py-1 text-center"></td>
                      <td className="border border-gray-800 px-2 py-1 text-right">
                        {(
                          orders.reduce((s: number, o: any) => {
                            const actualQty = parseFloat(o.batchProduct?.producedUnits || '0');
                            const capacityLtr = parseFloat(o.packagingCapacity || '0');
                            return s + actualQty * capacityLtr;
                          }, 0) || 0
                        ).toFixed(3)}
                      </td>
                      <td className="border border-gray-800 px-2 py-1 text-right font-bold">
                        {screenTotalKg > 0 ? screenTotalKg.toFixed(3) : ''}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Additional Materials - Removed as separate table, now merged */}
            {/* {additionalMaterials.length > 0 && ( ... )} */}

            {/* Production Summary Table */}
            {relatedSkus.length > 0 && (
              <div className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-800 text-sm">
                    <thead>
                      <tr>
                        <th className="border border-gray-800 px-2 py-1 text-left">Product</th>
                        <th className="border border-gray-800 px-2 py-1 w-16 text-center">
                          APP QTY
                        </th>
                        <th className="border border-gray-800 px-2 py-1 w-20 text-center">
                          BATCH QTY
                        </th>
                        <th className="border border-gray-800 px-2 py-1 w-24 text-center">
                          DISPATCH QTY
                        </th>
                        <th className="border border-gray-800 px-2 py-1 w-16 text-center">TOTAL</th>
                        <th className="border border-gray-800 px-2 py-1 w-20 text-center">
                          ACTUAL QTY
                        </th>
                        <th className="border border-gray-800 px-2 py-1 w-20 text-center">
                          DIFFERENCE
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Build orders map for quick lookup
                        const ordersMapScreen = new Map<string, any>();
                        orders.forEach((o: any) => {
                          const productId = o.batchProduct?.productId || o.product?.productId;
                          if (productId) ordersMapScreen.set(String(productId), o);
                        });

                        return relatedSkus.map((sku: any, idx: number) => {
                          const order = ordersMapScreen.get(String(sku.productId));
                          const appQty = parseFloat(sku.availableQuantity || '0');
                          const batchQty = parseFloat(order?.batchProduct?.plannedUnits || '0');

                          return (
                            <tr key={idx} className="hover:bg-[var(--surface-hover)]">
                              <td className="border border-gray-800 px-2 py-1">
                                {sku.productName || 'Unknown'}
                              </td>
                              <td className="border border-gray-800 px-2 py-1 text-center">
                                {appQty > 0 ? appQty.toFixed(2) : '0.00'}
                              </td>
                              <td className="border border-gray-800 px-2 py-1 text-center"></td>
                              <td className="border border-gray-800 px-2 py-1 text-center"></td>
                              <td className="border border-gray-800 px-2 py-1 text-center"></td>
                              <td className="border border-gray-800 px-2 py-1 text-center"></td>
                              <td className="border border-gray-800 px-2 py-1 text-center"></td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Production Remarks */}
            <div className="border-t-2 border-gray-800 pt-4 mt-4">
              <p className="font-semibold">Production Remark:</p>
              {reportType === 'completion-chart' && batchData.productionRemarks && (
                <p className="mt-1">{batchData.productionRemarks}</p>
              )}
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div>
                <p className="font-semibold">Labours Sign:</p>
                <p className="mt-2">{batchData.labourNames || ''}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">Supervisor Sign:</p>
                <p className="mt-2">Mr. {batchData.supervisorName || ''}</p>
              </div>
            </div>

            {/* Download PDF Button */}
            <div className="mt-8 flex justify-center no-print">
              <Button
                variant="primary"
                onClick={handleExportPDF}
                disabled={isLoading || !batchData}
                leftIcon={<FileDown size={18} />}
              >
                Download PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-10">Failed to load batch data</div>
        )}
      </div>
    </Modal>
  );
}
