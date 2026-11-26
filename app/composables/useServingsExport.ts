// app/composables/useServingsExport.ts
// "Export today" on Servings Management (owners and managers): today's servings for one
// branch as an Excel file, in the same style as the Analytics reports. Everything is
// fetched fresh on click, every page of it, so the file doesn't depend on what the
// screen happens to show (search, sort, current page).
import type { ExcelSheet } from '~/composables/useExcelExport'
import type { CategoryServingItem, ServingCategorySummary, ServingLogEntry, ServingService } from '~/services/ServingService'
import { spoilageItemLabel, spoilageReasonLabels, type SpoilageLog } from '~/services/PosService'

const PER_PAGE = 50 // the servings API's maximum
const MAX_PAGES = 40 // safety stop: 2,000 rows per list

type ItemRow = CategoryServingItem & { category: string }

const ITEM_STATUS: Record<CategoryServingItem['status'], string> = {
  available: 'Available',
  sold_out: 'Sold out',
  unavailable: 'Off today',
  branch_unavailable: 'Off at this branch',
}

// Same wording as the category cards on screen.
function categoryStatus(c: ServingCategorySummary) {
  if (!c.expected_servings || c.expected_servings <= 0) return 'Not set'
  if (c.status === 'sold_out' || c.remaining === 0) return 'Sold out'
  return c.is_low_stock ? 'Low stock' : 'Available'
}

// Every page of a paginated list.
async function allPages<T>(fetchPage: (page: number) => Promise<{ data: T[]; last_page: number }>): Promise<T[]> {
  const rows: T[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetchPage(page)
    rows.push(...res.data)
    if (page >= res.last_page) break
  }
  return rows
}

const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : null

export function useServingsExport(service: ServingService) {
  const { exporting, download } = useExcelExport()

  async function exportToday(branchUuid: string, branchName: string) {
    const [categories, ingredientsRes, log, spoilage] = await Promise.all([
      allPages(page => service.categories(branchUuid, { per_page: PER_PAGE, page }).then(r => r.categories)),
      service.ingredientsUsed(branchUuid),
      allPages(page => service.log(branchUuid, { per_page: PER_PAGE, page }).then(r => r.log)),
      service.spoilage(branchUuid),
    ])

    const items: ItemRow[] = (await Promise.all(categories.map(c =>
      allPages(page => service.categoryItems(branchUuid, c.uuid ?? 'uncategorized', { per_page: PER_PAGE, page }).then(r => r.items))
        .then(list => list.map(i => ({ ...i, category: c.name }))),
    ))).flat()

    const date = ingredientsRes.date
    const sum = <R>(rows: R[], f: (r: R) => number) => rows.reduce((a, r) => a + f(r), 0)

    const categorySheet: ExcelSheet<ServingCategorySummary & { total?: boolean }> = {
      name: 'Categories',
      columns: [
        { header: 'Category', value: r => r.total ? 'Total' : r.name },
        { header: 'Items', value: r => r.items, format: 'count' },
        { header: 'Daily limit', value: r => r.expected_servings, format: 'count' },
        { header: 'Sold', value: r => r.servings_sold, format: 'count' },
        { header: 'Left', value: r => r.remaining, format: 'count' },
        { header: 'Status', value: r => r.total ? null : categoryStatus(r) },
      ],
      rows: categories,
      totals: {
        total: true, uuid: null, name: '', picture: null, status: 'available',
        items: sum(categories, c => c.items),
        expected_servings: sum(categories, c => c.expected_servings),
        servings_sold: sum(categories, c => c.servings_sold),
        remaining: sum(categories, c => c.remaining),
      },
    }

    const itemSheet: ExcelSheet<ItemRow> = {
      name: 'Items',
      columns: [
        { header: 'Item', value: r => r.menu_name },
        { header: 'Category', value: r => r.category },
        { header: 'Daily limit', value: r => r.daily_limit || null, format: 'count' },
        { header: 'Sold', value: r => r.servings_sold, format: 'count' },
        { header: 'Left', value: r => r.daily_limit ? r.available_stock : null, format: 'count' },
        { header: 'Status', value: r => ITEM_STATUS[r.status] ?? r.status },
        { header: 'Low stock', value: r => r.is_low_stock ? 'Yes' : null },
      ],
      rows: items,
    }

    const logSheet: ExcelSheet<ServingLogEntry> = {
      name: 'Serving log',
      columns: [
        { header: 'Time', value: r => time(r.sold_at) },
        { header: 'Order #', value: r => r.order_number },
        { header: 'Item', value: r => r.menu_name ?? 'Removed item' },
        { header: 'Quantity', value: r => r.quantity, format: 'count' },
      ],
      rows: log,
    }

    const ingredientSheet: ExcelSheet<(typeof ingredientsRes.ingredients)[number]> = {
      name: 'Ingredients used',
      columns: [
        { header: 'Ingredient', value: r => r.name },
        { header: 'Quantity', value: r => r.quantity, format: 'decimal' },
        { header: 'Unit', value: r => r.unit },
      ],
      rows: ingredientsRes.ingredients,
    }

    const spoilageSheet: ExcelSheet<SpoilageLog> = {
      name: 'Spoilage',
      columns: [
        { header: 'Time', value: r => time(r.created_at) },
        { header: 'Item', value: r => spoilageItemLabel(r) },
        { header: 'Servings', value: r => r.quantity, format: 'count' },
        { header: 'Value per serving', value: r => r.unit_value, format: 'peso' },
        { header: 'Reason', value: r => r.reason ? spoilageReasonLabels[r.reason] : null },
        { header: 'Logged by', value: r => r.logged_by },
        { header: 'Approved by', value: r => r.approved_by ?? null },
        { header: 'Register', value: r => r.device_name },
        { header: 'Voided', value: r => r.voided_at ? `${time(r.voided_at)}${r.voided_by ? ` by ${r.voided_by}` : ''}` : null },
      ],
      rows: spoilage.logs,
    }

    await download({
      title: 'Servings report',
      cafe: null,
      from: date,
      to: date,
      scope: branchName,
      sheets: [categorySheet, itemSheet, logSheet, ingredientSheet, spoilageSheet],
    })
  }

  return { exporting, exportToday }
}
