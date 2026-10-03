import * as XLSX from 'xlsx';
import { File, Paths, EncodingType } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Transaction } from '../context/AppContext';

export interface CategorySummary {
  category: string;
  amount: number;
  percentage: number;
}

export interface MonthlyBreakdown {
  month: string;
  total: number;
}

export interface ExportReportOptions {
  reportType: 'monthly' | 'yearly';
  periodLabel: string;
  totalSpent: number;
  monthlyBudgetLimit?: number;
  remainingBudget?: number;
  categories: CategorySummary[];
  transactions: Transaction[];
  monthlyBreakdown?: MonthlyBreakdown[];
}

export async function exportReportToExcel(options: ExportReportOptions): Promise<boolean> {
  try {
    const {
      reportType,
      periodLabel,
      totalSpent,
      monthlyBudgetLimit,
      remainingBudget,
      categories,
      transactions,
      monthlyBreakdown,
    } = options;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData: (string | number)[][] = [
      ['SpendSnap Financial Report', ''],
      ['Generated On', new Date().toLocaleDateString('en-GB')],
      ['Period', periodLabel],
      ['Total Spent (₹)', totalSpent],
      ['Monthly Budget (₹)', monthlyBudgetLimit ?? 'N/A'],
      ['Remaining Budget (₹)', remainingBudget ?? 'N/A'],
      ['Transaction Count', transactions.length],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: Category Breakdown
    const categoryData: (string | number)[][] = [
      ['Category', 'Amount (₹)', 'Percentage (%)'],
      ...categories.map(c => [c.category, c.amount, `${c.percentage}%`]),
    ];
    const wsCategory = XLSX.utils.aoa_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(wb, wsCategory, 'Category Breakdown');

    // Sheet 3: Transactions
    const txData: (string | number)[][] = [
      ['Date', 'Merchant', 'Category', 'Subcategory / Item', 'Amount (₹)'],
      ...transactions.map(t => [
        t.date,
        t.merchant,
        t.category,
        t.items?.[0]?.name || t.category,
        t.amount,
      ]),
    ];
    const wsTx = XLSX.utils.aoa_to_sheet(txData);
    XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions');

    // Sheet 4: Monthly Breakdown (for Yearly)
    if (reportType === 'yearly' && monthlyBreakdown && monthlyBreakdown.length > 0) {
      const monthData: (string | number)[][] = [
        ['Month', 'Total Spent (₹)'],
        ...monthlyBreakdown.map(m => [m.month, m.total]),
      ];
      const wsMonth = XLSX.utils.aoa_to_sheet(monthData);
      XLSX.utils.book_append_sheet(wb, wsMonth, 'Monthly Breakdown');
    }

    const year = new Date().getFullYear();
    const filename = reportType === 'monthly'
      ? `SpendSnap_${new Date().toLocaleDateString('en-US', { month: 'long' })}_${year}.xlsx`
      : `SpendSnap_${year}_Report.xlsx`;

    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, filename);
      return true;
    }

    const base64Data = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const file = new File(Paths.cache, filename);
    if (!file.exists) {
      file.create();
    }
    file.write(base64Data, { encoding: EncodingType.Base64 });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export SpendSnap Report',
        UTI: 'com.microsoft.excel.xlsx',
      });
    }

    return true;
  } catch (err) {
    console.error('Excel Export Error:', err);
    return false;
  }
}
