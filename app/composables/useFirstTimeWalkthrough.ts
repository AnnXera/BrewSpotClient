// app/composables/useFirstTimeWalkthrough.ts
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '~/stores/auth'

export interface DashboardFeature {
  id: string
  name: string
  location: string
  icon: string
  color: string
  badge: string
  summary: string
  details: string
  tips: string
}

export interface MissionStep {
  title: string
  instruction: string
  proTip: string
  targetHint: string
  targetSelector: string
  visualType?: string
  // Optional page for this step when it differs from the mission route.
  // A plain path, or the token 'owner-first-branch' (optionally with a query,
  // e.g. 'owner-first-branch?tab=employees') resolved at runtime (see resolveStepRoute).
  route?: string
}

export interface SetupMission {
  id: string
  title: string
  subtitle: string
  route: string
  badge: string
  icon: string
  priority: 'High' | 'Essential' | 'Recommended'
  actionText: string
  description: string
  steps: string[]
  detailedSteps: MissionStep[]
  proTip: string
}

// 1. THE 7 CORE OWNER SETUP MISSIONS (Starting with 1. Cafe Management)
export const OWNER_SETUP_MISSIONS: SetupMission[] = [
  {
    id: 'mission-branch',
    title: '1. Cafe Management & Branch Setup',
    subtitle: 'Manage cafe branches, operating hours, and create new branches',
    route: '/owner/cafes',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:building-storefront',
    actionText: 'Open Cafe Management',
    description: 'Start in Cafe Management to set your daily opening and closing hours, review branch summary cards, and add/create new cafe branches (requires an active paid subscription with Multi-Branch access; Trial Plan is not allowed to add extra branches). Then open a branch to inspect its details, employees, and floor plans.',
    steps: [
      'Click Cafe Operating Hours to set weekly schedule',
      'Review Branch KPI Summary Cards',
      'Search branches & Filter status toolbar',
      'Click "+ Add Branch" to create a branch (Paid Subscription required; Trial Plan not allowed)',
      'Open a branch from the list',
      'Branch Details tab: info, BIR document, POS registers',
      'Employees tab: staff assigned to the branch',
      'Floor Plans tab: dining layout built by the manager'
    ],
    detailedSteps: [
      {
        title: 'Cafe Operating Hours Button',
        instruction: 'Click here to open and customize your store\'s weekly schedule (Monday through Sunday) and mark rest days.',
        proTip: 'Your live Open/Closed status in the top header is calculated directly from these hours.',
        targetHint: 'Operating Hours Panel Button',
        targetSelector: '[data-walkthrough="cafe-hours-btn"]'
      },
      {
        title: 'Branch KPI Summary Cards',
        instruction: 'Overview cards showing total branches, active cafe locations, and pending counter hardware registrations.',
        proTip: 'Multi-store owners can track all locations from this single dashboard row.',
        targetHint: 'KPI Metrics Grid',
        targetSelector: '[data-walkthrough="cafe-kpis"]'
      },
      {
        title: 'Branch Search & Status Filter Bar',
        instruction: 'Search branches by name or filter by Active, Pending, or Inactive status.',
        proTip: 'Store phone numbers and addresses entered here print on all POS customer receipts.',
        targetHint: 'Filter & Search Bar',
        targetSelector: '[data-walkthrough="cafe-filter-bar"]'
      },
      {
        title: 'Add Branch Button (Paid Subscription)',
        instruction: 'Click "+ Add Branch" to create and register a new cafe branch. Note: Trial Plan accounts are not allowed to add extra branches—an active paid subscription with Multi-Branch access is required!',
        proTip: 'Once this 1st mission finishes, we will guide you to create/add a branch right away if you have an active subscription.',
        targetHint: 'Add Branch Button',
        targetSelector: '[data-walkthrough="cafe-add-branch-btn"], [data-walkthrough="cafe-filter-bar"]'
      },
      {
        title: 'Open a Branch',
        instruction: 'Click any branch in this list to open its details page. Press Next Step and the tour will open your first branch for you.',
        proTip: 'Each branch has its own details, employees, and floor plans.',
        targetHint: 'Branch list',
        targetSelector: '[data-walkthrough="cafe-branch-list"]'
      },
      {
        title: 'Branch Details Tab',
        instruction: 'The Branch Details tab shows the branch name, address, email, and phone number, the BIR document with its TIN and VAT type, and the POS Registers connected to this branch.',
        proTip: 'The POS Registers card shows which counter devices are registered and who is signed in on each.',
        targetHint: 'Branch Details tab',
        targetSelector: '[data-walkthrough="branch-tab-details"]',
        route: 'owner-first-branch?tab=details'
      },
      {
        title: 'Employees Tab',
        instruction: 'The Employees tab lists every manager and cashier assigned to this branch. Click an employee to see their full details.',
        proTip: 'Check this list before a shift so every cashier on duty can sign in to the register.',
        targetHint: 'Employees tab',
        targetSelector: '[data-walkthrough="cafe-employees-tab"]',
        route: 'owner-first-branch?tab=employees'
      },
      {
        title: 'Floor Plans Tab',
        instruction: 'The Floor Plans tab shows the dining layouts your branch manager has built: tables, seats, and fixtures. Owners can view them here; managers edit them in their Floor Plan page.',
        proTip: 'Saved floor plans appear on the POS so cashiers can assign dine-in orders to tables.',
        targetHint: 'Floor Plans tab',
        targetSelector: '[data-walkthrough="branch-tab-floor-plans"]',
        route: 'owner-first-branch?tab=floor-plans'
      }
    ],
    proTip: 'After completing this 1st mission, you can immediately create/add a branch if you have a paid subscription (Trial Plan is limited to 1 main branch).'
  },
  {
    id: 'mission-menu',
    title: '2. Menu Management & Pricing',
    subtitle: 'Create food & drinks, sizes, and temperature pricing',
    route: '/owner/menu-management',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:book-open',
    actionText: 'Open Menu Management',
    description: 'Build your coffee and food catalog. Add categories (Espresso, Cold Brew, Pastries), define cup sizes (Small, Medium, Large), and set separate prices for hot vs. iced drinks so cashiers can ring up orders with 1 tap.',
    steps: [
      'Click "Add Category" or select an existing category',
      'Use the Search Bar to find drinks or food items',
      'Sort categories alphabetically or by popularity',
      'Monitor live Cafe Operating Hours & status'
    ],
    detailedSteps: [
      {
        title: 'Add Category Button',
        instruction: 'This "+ Add Category" button creates new drink & food categories (Espresso, Cold Brew, Pastries) to organize items for 1-tap POS filtering. (Locked during demo; clickable once tour completes!)',
        proTip: 'Limit main categories to 6 or fewer to keep counter ordering fast on tablet registers.',
        targetHint: 'Top toolbar "+ Add Category" button',
        targetSelector: '[data-walkthrough="menu-add-btn"], button:has-text("Add Category")'
      },
      {
        title: 'Menu Search Input',
        instruction: 'Use this search bar to instantly find any beverage or food item in your catalog to update recipes, modify sizes, or edit descriptions.',
        proTip: 'Search matches drink names, categories, and ingredients simultaneously.',
        targetHint: 'Menu Search Bar',
        targetSelector: '[data-walkthrough="menu-search"], input[placeholder*="Search"]'
      },
      {
        title: 'Category Sort Dropdown',
        instruction: 'Click here to sort categories alphabetically (A to Z or Z to A). This dictates the order cashiers and customers see categories.',
        proTip: 'Sort by popular items first so baristas spend less time browsing during rush hour.',
        targetHint: 'Sort Dropdown',
        targetSelector: '[data-walkthrough="menu-sort"]'
      },
      {
        title: 'Cafe Operating Hours Badge',
        instruction: 'This live badge displays your cafe\'s daily operating schedule and indicates whether the branch is currently Open or Closed.',
        proTip: 'Status updates live automatically based on your weekly hours in Cafe Management.',
        targetHint: 'Operating Hours Status Badge',
        targetSelector: '[data-walkthrough="menu-operating-hours"]'
      }
    ],
    proTip: 'Items marked with hot & iced prices allow cashiers to seamlessly switch temperatures on the POS screen with automatic price adjustments.'
  },
  {
    id: 'mission-ingredients',
    title: '3. Raw Ingredients & Recipe Auto-Deductions',
    subtitle: 'Set up stock units and link recipe consumption',
    route: '/owner/menu-management/ingredients',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:clipboard-document-list',
    actionText: 'Open Ingredients & Recipes',
    description: 'Define raw ingredients (coffee beans, whole milk, syrups, cups) with exact units (g, ml, pumps, shots). When linked to menu recipes, the POS automatically deducts inventory upon every checkout.',
    steps: [
      'Click "Add Ingredient" to create raw stock items',
      'Use the Search Bar to locate stock materials',
      'Sort ingredients by usage or alphabetically',
      'Monitor stock levels on ingredient cards'
    ],
    detailedSteps: [
      {
        title: 'Add Ingredient Button',
        instruction: 'This "+ Add Ingredient" button adds raw stock materials: Espresso Beans (g), Whole Milk (ml), and Syrups (pumps) for automatic inventory deduction. (Locked during demo; clickable once tour completes!)',
        proTip: 'Using standard metric units (grams, milliliters) gives you exact recipe deduction tracking.',
        targetHint: 'Top toolbar "+ Add Ingredient" button',
        targetSelector: '[data-walkthrough="menu-add-btn"], button:has-text("Add Ingredient")'
      },
      {
        title: 'Ingredient Search Bar',
        instruction: 'Quickly filter raw materials by name to inspect current stock levels or check supplier reorder thresholds.',
        proTip: 'Type "beans" or "milk" to jump directly to key coffee bar supplies.',
        targetHint: 'Ingredient Search Input',
        targetSelector: '[data-walkthrough="menu-search"], input[placeholder*="Search"]'
      },
      {
        title: 'Sort Ingredients Dropdown',
        instruction: 'Sort by "Most Used" or alphabetically to see which raw ingredients are consumed fastest during daily service.',
        proTip: 'High-usage items like espresso beans and whole milk should be restocked daily.',
        targetHint: 'Sort Dropdown',
        targetSelector: '[data-walkthrough="menu-sort"]'
      },
      {
        title: 'Ingredient Inventory Cards',
        instruction: 'Each card shows your current stock on hand and minimum alert thresholds. Once linked to cup sizes, inventory deducts automatically upon checkout!',
        proTip: 'Never count inventory by hand again—the POS deducts grams and milliliters automatically.',
        targetHint: 'Ingredient cards grid',
        targetSelector: '[data-walkthrough="ingredients-grid"], .grid, main'
      }
    ],
    proTip: 'Linking recipes to cup sizes eliminates manual inventory counting and prevents running out of beans or syrups during peak morning rushes.'
  },
  {
    id: 'mission-analytics',
    title: '4. Business Analytics & Performance',
    subtitle: 'Revenue charts, top-selling drinks, and Excel export reports',
    route: '/owner/analytics',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:chart-bar',
    actionText: 'Open Analytics',
    description: 'Deep-dive into your financial performance. Filter revenue trajectories by custom date ranges or individual branches, rank top-selling beverages, and export official Excel reports for accounting.',
    steps: [
      'Filter performance by 7 days, 30 days, or custom dates',
      'Switch between Sales, Menu, and Branch tabs',
      'Export official Excel spreadsheets for accounting',
      'Compare multi-branch gross revenues'
    ],
    detailedSteps: [
      {
        title: 'Date Range & Branch Filters',
        instruction: 'Use this bar to toggle presets (Today, 7D, 30D, Custom) or isolate an individual branch location to compare revenues. (Locked during demo; clickable once tour completes!)',
        proTip: 'Compare multiple branch revenues to identify your highest-performing coffee locations.',
        targetHint: 'Analytics Filter Bar',
        targetSelector: '[data-walkthrough="analytics-filters"], .tabstrip [role="radiogroup"], .analytics header + div, select'
      },
      {
        title: 'Analytics Section Tabs',
        instruction: 'Switch between Sales revenue curves, Menu item profitability, Branch comparisons, and Operations audit logs. (Locked during demo; clickable once tour completes!)',
        proTip: 'The Menu tab ranks drinks by revenue share to reveal your most profitable beverages.',
        targetHint: 'Analytics Section Tabs',
        targetSelector: '[role="tablist"], .tabstrip, button[id*="analytics-tab"]'
      },
      {
        title: 'Export Excel Report Button',
        instruction: 'Generate and download official Excel spreadsheets of the open analytics tab for accounting, tax filings, or investor review. (Locked during demo; clickable once tour completes!)',
        proTip: 'Excel reports include breakdown data per day and per store branch.',
        targetHint: 'Excel Export Button',
        targetSelector: 'button:has-text("Export"), [data-walkthrough="analytics-export"], header button'
      }
    ],
    proTip: 'Export monthly Excel reports at the end of each cycle to simplify tax filings and accountant reconciliation.'
  },
  {
    id: 'mission-subscription',
    title: '5. Plan Tiers & Billing Invoices',
    subtitle: 'Manage active plan, browse tier upgrades, and view receipts',
    route: '/owner/subscription',
    badge: 'Recommended',
    priority: 'Recommended',
    icon: 'heroicons:credit-card',
    actionText: 'Open Subscription Settings',
    description: 'Manage your BrewSpot subscription plan, explore tier upgrades as you open new branches, and access past billing receipts with downloadable VAT invoices.',
    steps: [
      'Check active plan tier and next renewal date',
      'Browse Starter, Pro, and Enterprise tiers',
      'Review billing receipts and payment logs',
      'Manage store terminal & branch quotas'
    ],
    detailedSteps: [
      {
        title: 'Current Plan Status & Renewal',
        instruction: 'Check your active subscription tier, next renewal date, and terminal allocations in one place. (Locked during demo; clickable once tour completes!)',
        proTip: 'Annual billing saves up to 20% compared to monthly subscriptions.',
        targetHint: 'Current Plan Card',
        targetSelector: '[data-walkthrough="sub-current-card"], .grid, main section, h1 + div'
      },
      {
        title: 'Browse Plan Tiers Button',
        instruction: 'Compare features between Starter, Pro, and Enterprise tiers as your business scales with more branches. (Locked during demo; clickable once tour completes!)',
        proTip: 'Higher plans increase counter terminal limits and unlock multi-branch analytics.',
        targetHint: 'Browse Plans Toggle',
        targetSelector: 'button:has-text("Browse"), [data-walkthrough="sub-browse-btn"], main nav button, button:has-text("Plans")'
      },
      {
        title: 'Billing & Payment Receipts',
        instruction: 'Access transparent records of every subscription renewal with printable invoice receipts. (Locked during demo; clickable once tour completes!)',
        proTip: 'Download official payment receipts for store expense accounting and tax write-offs.',
        targetHint: 'Payment History Table',
        targetSelector: 'table, [data-walkthrough="sub-history-table"], .overflow-x-auto, main section:last-child'
      }
    ],
    proTip: 'You can upgrade your subscription tier anytime—new features and terminal limits activate immediately upon confirmation.'
  },
  {
    id: 'mission-dashboard',
    title: '6. Executive Command Dashboard',
    subtitle: 'Real-time KPIs, revenue trend chart, and transaction logs',
    route: '/owner/dashboard',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:squares-2x2',
    actionText: 'Open Dashboard',
    description: 'Your central command center. Monitor real-time gross revenue, customer order volume, live branch rankings, and transaction audit logs across all stores.',
    steps: [
      'Monitor real-time gross revenue & order counts',
      'Analyze peak rush hours on the revenue chart',
      'Inspect trending beverages & best sellers',
      'Search live customer transactions & receipts'
    ],
    detailedSteps: [
      {
        title: 'Executive KPI Metric Cards',
        instruction: 'Monitor gross revenue, order counts, and active branch terminals at a glance with zero screen reload latency. (Locked during demo; clickable once tour completes!)',
        proTip: 'Figures update in real-time as sales are rung up across all counter terminals.',
        targetHint: 'KPI Metrics Grid',
        targetSelector: '[data-walkthrough="feat-totals"], .grid, main section, h1 + div'
      },
      {
        title: 'Interactive Revenue Trajectory Chart',
        instruction: 'Track sales trajectory over Daily, Weekly, or Monthly periods to spot peak rush hours and high-volume days. (Locked during demo; clickable once tour completes!)',
        proTip: 'Hovering over any individual bar displays exact pesos earned and completed order counts.',
        targetHint: 'Revenue Chart',
        targetSelector: '[data-walkthrough="feat-chart"], canvas, svg, .chart, .lg\\:col-span-12'
      },
      {
        title: 'Transaction Audit Log Table',
        instruction: 'Searchable ledger of all customer receipts, payment methods, cashier names, and approved manager overrides. (Locked during demo; clickable once tour completes!)',
        proTip: 'Search receipt numbers directly to assist customer inquiries or audit cashier register shifts.',
        targetHint: 'Transaction Log Table',
        targetSelector: '[data-walkthrough="feat-transactions"], table, main .overflow-x-auto, .scroll-reveal:last-child'
      }
    ],
    proTip: 'Use the top-right refresh button during rush periods to pull the latest sales numbers instantly without refreshing the page.'
  },
  {
    id: 'mission-pos-install',
    title: '7. Download & Install BrewSpot POS (A2HS)',
    subtitle: 'Where to get the POS app and how to add it to your device',
    route: '/owner/cafes',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:arrow-down-tray',
    actionText: 'Open Branches',
    description: 'BrewSpot POS is installed straight from your browser using Add to Home Screen (A2HS). There is no app store download. Open a branch from Cafe Management, find the POS Registers card, and click "Install POS App" on the counter device you want to use as a register.',
    steps: [
      'Open a branch from Cafe Management',
      'Click "Install POS App" in the POS Registers card',
      'Install on Android, Windows, or Mac (Chrome / Edge / Brave)',
      'Install on iPad or iPhone (Safari)',
      'Launch the app and register the device'
    ],
    detailedSteps: [
      {
        title: 'Where to Download: Open a Branch',
        instruction: 'Click any branch in this list to open its details page. The POS Registers card on that page holds the "Install POS App" download button. Press Next Step and the tour will open your first branch for you.',
        proTip: 'Do this on the actual counter tablet or computer you will use as a register, not on your personal phone.',
        targetHint: 'Branch list in Cafe Management',
        targetSelector: '[data-walkthrough="cafe-branch-list"]'
      },
      {
        title: 'Click "Install POS App"',
        instruction: 'This "Install POS App" button in the POS Registers card is where you download BrewSpot POS. Every branch details page has one. You can also open /pos/setup on the device and click "Install POS to Home Screen (A2HS)".',
        proTip: 'If the button says "POS App Ready", the app is already installed on this device.',
        targetHint: 'POS Registers card > Install POS App button',
        targetSelector: '[data-walkthrough="pos-install-btn"]',
        route: 'owner-first-branch?tab=details'
      },
      {
        title: 'Install on Android, Windows, or Mac',
        instruction: 'In Chrome, Edge, or Brave, confirm the install prompt that appears. If no prompt shows, click the Install icon at the right end of the address bar, or open the browser menu (three dots) and choose "Install BrewSpot POS".',
        proTip: 'Firefox does not support installing web apps. Use Chrome, Edge, or Brave.',
        targetHint: 'Browser install prompt',
        targetSelector: '[data-walkthrough="pos-install-btn"]',
        route: 'owner-first-branch?tab=details'
      },
      {
        title: 'Install on iPad or iPhone',
        instruction: 'Open BrewSpot in Safari, tap the Share button in the toolbar, choose "Add to Home Screen", then tap "Add".',
        proTip: 'On iOS, only Safari can add BrewSpot POS to the home screen.',
        targetHint: 'Safari Share menu',
        targetSelector: '[data-walkthrough="pos-install-btn"]',
        route: 'owner-first-branch?tab=details'
      },
      {
        title: 'Launch & Register the Device',
        instruction: 'Open the new BrewSpot POS icon on the home screen or desktop. It opens straight to /pos. On first launch, pick the branch, name the register (e.g. Front Counter 1), and click "Register Device".',
        proTip: 'Registering logs your account out on that device so cashiers can sign in with their PIN.',
        targetHint: 'BrewSpot POS app icon',
        targetSelector: '[data-walkthrough="pos-install-btn"]',
        route: 'owner-first-branch?tab=details'
      }
    ],
    proTip: 'Install the POS on every counter device once. After that, staff open it from the home screen icon like a normal app.'
  }
]

export const CORE_SETUP_MISSIONS: SetupMission[] = OWNER_SETUP_MISSIONS

// 2. MANAGER SETUP MISSIONS (Dashboard, Cafe Details, Floor Plan, Reservations, Servings)
export const MANAGER_SETUP_MISSIONS: SetupMission[] = [
  {
    id: 'mgr-dashboard',
    title: '1. Manager Operations Dashboard',
    subtitle: 'Monitor branch revenue, order totals, and live transactions',
    route: '/manager/dashboard',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:squares-2x2',
    actionText: 'Open Manager Dashboard',
    description: 'Track your branch operations in real time. Review sales totals, guest reservations, peak rush hours, and recent cashier transactions.',
    steps: [
      'Inspect Branch Performance & Sales Totals',
      'Track Peak Rush Hours on Income Chart',
      'Audit Recent Cashier Transactions & Receipts'
    ],
    detailedSteps: [
      {
        title: 'Branch Sales Totals Cards',
        instruction: 'Review live gross sales, order volume, and active terminal counts for your managed branch.',
        proTip: 'Totals update automatically as cashiers ring up sales.',
        targetHint: 'Manager KPI Metric Cards',
        targetSelector: '[data-walkthrough="feat-totals"], .totals, section[aria-label="Branch totals"], main section'
      },
      {
        title: 'Sales & Income Trajectory Chart',
        instruction: 'Track hourly sales velocity over Daily, Weekly, or Monthly ranges to optimize barista staffing during rush periods.',
        proTip: 'Hover over bars to see breakdown per hour.',
        targetHint: 'Income Trajectory Chart',
        targetSelector: '[data-walkthrough="feat-chart"], section[aria-labelledby="income-heading"], canvas, svg, .chart'
      },
      {
        title: 'Transaction Audit Log Table',
        instruction: 'Searchable ledger of all customer receipts, payment methods, cashier names, and approved manager overrides.',
        proTip: 'Search receipt numbers directly to assist customer inquiries.',
        targetHint: 'Transaction Log Table',
        targetSelector: '[data-walkthrough="feat-transactions"], section[aria-labelledby="transactions-heading"], table, main .overflow-x-auto'
      }
    ],
    proTip: 'Check the income chart at mid-day to gauge peak customer arrival patterns.'
  },
  {
    id: 'mgr-cafe',
    title: '2. Branch Profile & Employee Roster',
    subtitle: 'Verify cafe contact details, tax info, and assigned branch staff',
    route: '/manager/cafe',
    badge: 'High',
    priority: 'High',
    icon: 'heroicons:building-storefront',
    actionText: 'Open Branch Settings',
    description: 'Ensure your store profile, customer contact number, and branch staff roster are up-to-date for your shift.',
    steps: [
      'Review Branch Contact Details & Address',
      'Check BIR Tax & Store Documents',
      'Inspect Assigned Shift Employees'
    ],
    detailedSteps: [
      {
        title: 'Branch Information & Contacts',
        instruction: 'Verify your store address, customer contact telephone, email, and live open status badge.',
        proTip: 'Contact numbers shown here appear on customer printed receipts and invoices.',
        targetHint: 'Branch Details Card',
        targetSelector: '[data-walkthrough="cafe-details-card"], section.bg-white, main section'
      },
      {
        title: 'Branch Employees & Shift Roster',
        instruction: 'Click the Employees tab to inspect all cashiers, baristas, and staff members assigned to this branch location.',
        proTip: 'Review employee accounts before shifts to ensure all counter staff can log in to registers.',
        targetHint: 'Employees Tab',
        targetSelector: '[data-walkthrough="cafe-employees-tab"], button:has-text("Employees"), .relative flex items-center button:last-child'
      }
    ],
    proTip: 'Verify staff coverage at the start of each morning shift to keep counter ordering fast.'
  },
  {
    id: 'mgr-floorplan',
    title: '3. Dining Tables & Floor Plan Layout',
    subtitle: 'Arrange seating layout, table numbers, and chair capacities',
    route: '/manager/floor-plan',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:map',
    actionText: 'Open Floor Plan',
    description: 'Manage dining room layouts, table numbers, and seating capacities to facilitate smooth dine-in customer flow.',
    steps: [
      'Create and Open Floor Plan Layout',
      'Select Dining Tables & Fixtures Library',
      'Save Layout to Publish to Registers'
    ],
    detailedSteps: [
      {
        title: 'Floor Plan Canvas Workspace',
        instruction: 'Your floor plan layout workspace. Create custom floor plans (e.g., Indoor or Patio) and define room dimensions.',
        proTip: 'Set dimensions matching your actual cafe layout for accurate walkway spacing.',
        targetHint: 'Floor Plan Workspace',
        targetSelector: '[data-walkthrough="floorplan-workspace"], main section[data-walkthrough="floorplan-workspace"]'
      },
      {
        title: 'Tables & Fixture Objects Library',
        instruction: 'Select square, round, or long dining tables and fixtures to add customer seating and define table capacities.',
        proTip: 'Assign distinct table numbers and seat counts so baristas deliver orders to the right guests.',
        targetHint: 'Objects Sidebar Panel',
        targetSelector: '[data-walkthrough="floorplan-objects"], #fp-panel-objects, #fp-tab-objects, main aside[data-walkthrough="floorplan-objects"]'
      },
      {
        title: 'Save Layout & Publish to Register',
        instruction: 'Click "Save layout" to save your dining floor plan. Active layouts automatically appear on POS registers for table service!',
        proTip: 'Once saved, tables can be reserved in the Reservations module and assigned during checkout.',
        targetHint: 'Save Layout Button',
        targetSelector: '[data-walkthrough="floorplan-save-btn"], main button[data-walkthrough="floorplan-save-btn"]'
      }
    ],
    proTip: 'Arrange floor tables with clear walkways so baristas can deliver hot drinks safely.'
  },
  {
    id: 'mgr-reservations',
    title: '4. Guest Reservations & Bookings',
    subtitle: 'Track advance table bookings, arrival times, and waitlist',
    route: '/manager/reservations',
    badge: 'Recommended',
    priority: 'Recommended',
    icon: 'heroicons:calendar-days',
    actionText: 'Open Reservations',
    description: 'Manage upcoming table reservations, confirm guest party sizes, and ensure tables are prepared before customer arrival.',
    steps: [
      'Select Booking Date & Arrival Time Strip',
      'Manage Guest Waitlist & Table Assignment'
    ],
    detailedSteps: [
      {
        title: 'Reservation Date & Time Selector',
        instruction: 'Select reservation dates and 30-minute arrival time slots to inspect table availability for morning and evening rushes.',
        proTip: 'Navigate forward in the date strip to plan ahead for large weekend bookings.',
        targetHint: 'Date & Time Selection Strip',
        targetSelector: '[data-walkthrough="reservations-date-strip"], section[aria-label="Reservation date and time"]'
      },
      {
        title: 'Guest Waitlist & Booking Confirmation',
        instruction: 'Inspect upcoming guest party sizes, contact phone numbers, special requests, and assign dining tables.',
        proTip: 'Mark bookings as "Seated" when guests arrive to keep the floor plan status accurate.',
        targetHint: 'Waitlist Button & Booking Panel',
        targetSelector: '[data-walkthrough="reservations-waitlist-btn"], main header button'
      }
    ],
    proTip: 'Review daily bookings before the morning shift begins to pre-assign high-capacity tables.'
  },
  {
    id: 'mgr-servings',
    title: '5. Daily Servings & Portion Limits',
    subtitle: 'Set daily item limits, track ingredient usage, and toggle availability',
    route: '/manager/servings',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:cake',
    actionText: 'Open Servings Management',
    description: 'Control how many portions can be sold today for each menu item to prevent selling out unexpectedly. Track live raw ingredient deductions and review serving logs.',
    steps: [
      'Inspect Category Portion Counters & Availability',
      'Monitor Live Raw Ingredient Deductions'
    ],
    detailedSteps: [
      {
        title: 'Menu Category Portion Cards',
        instruction: 'Inspect available portions remaining for Espresso, Cold Brew, Pastries, and Food items. Cards warn when items near depletion.',
        proTip: 'Items reaching 0 portions are automatically greyed out on cashier registers.',
        targetHint: 'Category Servings Cards',
        targetSelector: '[data-walkthrough="servings-categories"], main section.scroll-reveal, main section'
      },
      {
        title: 'Ingredients Usage & Deductions Panel',
        instruction: 'Monitor exact quantities of milk, beans, and syrups deducted from counter sales today during your branch shift.',
        proTip: 'Detect recipe over-pouring or spillage by auditing daily ingredient depletion.',
        targetHint: 'Ingredients Usage Panel',
        targetSelector: '[data-walkthrough="servings-usage"], main .grid.grid-cols-1.xl\\:grid-cols-2, main section:last-child'
      }
    ],
    proTip: 'Review item portion limits at the start of every shift so kitchen prep matches customer volume.'
  },
  {
    id: 'mgr-pos-install',
    title: '6. Download & Install BrewSpot POS (A2HS)',
    subtitle: 'Where to get the POS app and how to add it to your counter devices',
    route: '/manager/cafe',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:arrow-down-tray',
    actionText: 'Open Branch Settings',
    description: 'BrewSpot POS is installed straight from your browser using Add to Home Screen (A2HS). There is no app store download. On the counter device, open Cafe Management, find the POS Registers card, and click "Install POS App".',
    steps: [
      'Click "Install POS App" in the POS Registers card',
      'Install on Android, Windows, or Mac (Chrome / Edge / Brave)',
      'Install on iPad or iPhone (Safari)',
      'Launch the app and register the device'
    ],
    detailedSteps: [
      {
        title: 'Where to Download: Install POS App',
        instruction: 'This "Install POS App" button in the POS Registers card is where you download BrewSpot POS. Click it on the counter tablet or computer you want to turn into a register. You can also open /pos/setup and click "Install POS to Home Screen (A2HS)".',
        proTip: 'If the button says "POS App Ready", the app is already installed on this device.',
        targetHint: 'POS Registers card > Install POS App button',
        targetSelector: '[data-walkthrough="pos-install-btn"]'
      },
      {
        title: 'Install on Android, Windows, or Mac',
        instruction: 'In Chrome, Edge, or Brave, confirm the install prompt that appears. If no prompt shows, click the Install icon at the right end of the address bar, or open the browser menu (three dots) and choose "Install BrewSpot POS".',
        proTip: 'Firefox does not support installing web apps. Use Chrome, Edge, or Brave.',
        targetHint: 'Browser install prompt',
        targetSelector: '[data-walkthrough="pos-install-btn"]'
      },
      {
        title: 'Install on iPad or iPhone',
        instruction: 'Open BrewSpot in Safari, tap the Share button in the toolbar, choose "Add to Home Screen", then tap "Add".',
        proTip: 'On iOS, only Safari can add BrewSpot POS to the home screen.',
        targetHint: 'Safari Share menu',
        targetSelector: '[data-walkthrough="pos-install-btn"]'
      },
      {
        title: 'Launch & Register the Device',
        instruction: 'Open the new BrewSpot POS icon on the home screen or desktop. It opens straight to /pos. On first launch, pick your branch, name the register (e.g. Front Counter 1), and click "Register Device".',
        proTip: 'Registering logs your manager account out on that device so cashiers can sign in with their PIN.',
        targetHint: 'BrewSpot POS app icon',
        targetSelector: '[data-walkthrough="pos-install-btn"]'
      }
    ],
    proTip: 'Install the POS once on every counter device. After that, staff open it from the home screen icon like a normal app.'
  }
]

// 3. CASHIER SETUP MISSIONS (POS Register: Catalog, Cart, Tender & Checkout)
export const CASHIER_SETUP_MISSIONS: SetupMission[] = [
  {
    id: 'pos-catalog',
    title: '1. Menu Browsing & Item Customization',
    subtitle: 'Filter categories, select drinks, and customize modifiers',
    route: '/pos',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:book-open',
    actionText: 'Open POS Register',
    description: 'Learn how to filter beverage categories, customize cup sizes, select hot vs iced temperatures, and add syrup modifiers with 1 tap.',
    steps: [
      'Select Category Tabs (Espresso, Cold Brew, Pastries)',
      'Tap Item Card to open Customization Modal',
      'Select Cup Size & Hot/Iced Temperature'
    ],
    detailedSteps: [
      {
        title: 'Menu Category Navigation Tabs',
        instruction: 'Tap category pills at the top to instantly filter between Coffee, Non-Coffee, and Food items. (Locked during demo; clickable once tour completes!)',
        proTip: 'Use search or category pills for rapid item discovery.',
        targetHint: 'Category Tabs Bar',
        targetSelector: '[data-walkthrough="pos-categories"], nav, .category-tabs, header + div'
      },
      {
        title: 'Item Cards & Modifiers',
        instruction: 'Tap any beverage card to select size (12oz, 16oz) and hot/iced temperature before adding to the active cart. (Locked during demo; clickable once tour completes!)',
        proTip: 'Pricing recalculates automatically based on chosen modifiers.',
        targetHint: 'Menu Items Grid',
        targetSelector: '[data-walkthrough="pos-items-grid"], .grid, main'
      }
    ],
    proTip: 'Confirm cup size and temperature with the customer before adding to the cart.'
  },
  {
    id: 'pos-cart',
    title: '2. Active Order Cart & Dining Type',
    subtitle: 'Manage dine-in vs takeout and adjust item quantities',
    route: '/pos',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:shopping-bag',
    actionText: 'Open Cart Review',
    description: 'Review the current customer order list, switch between Dine-In and Takeout, and input table numbers for table-service dining.',
    steps: [
      'Review Active Items & Add-ons in Cart',
      'Toggle Dine-In vs Take-Out Mode',
      'Assign Customer Dining Table Number'
    ],
    detailedSteps: [
      {
        title: 'Current Order Cart Summary',
        instruction: 'Displays all selected drinks, quantity adjustments (+/-), and customer notes. (Locked during demo; clickable once tour completes!)',
        proTip: 'Swipe or click delete to remove an accidental item.',
        targetHint: 'Order Cart Panel',
        targetSelector: '[data-walkthrough="pos-cart"], aside, .cart-panel'
      },
      {
        title: 'Dine-In / Take-Out Switch',
        instruction: 'Select whether the customer is dining in the cafe or taking their order to go. (Locked during demo; clickable once tour completes!)',
        proTip: 'Dine-In orders prompt for table selection to help baristas deliver drinks.',
        targetHint: 'Dining Type Toggle',
        targetSelector: '[data-walkthrough="pos-dining-toggle"], button'
      }
    ],
    proTip: 'Always verify dine-in vs take-out so baristas use ceramic mugs or disposable to-go cups.'
  },
  {
    id: 'pos-checkout',
    title: '3. Payment Tender & Receipt Printing',
    subtitle: 'Process cash or QR e-wallet payments and issue receipt',
    route: '/pos',
    badge: 'Essential',
    priority: 'Essential',
    icon: 'heroicons:banknotes',
    actionText: 'Open Payment Tender',
    description: 'Complete customer transactions by tendering cash with change calculation, or selecting Maya/GCash digital QR payment.',
    steps: [
      'Click the Green "Checkout" Button',
      'Select Payment Method (Cash, GCash, Card)',
      'Input Cash Tender & Print Receipt'
    ],
    detailedSteps: [
      {
        title: 'Tender & Checkout Button',
        instruction: 'Calculates the order grand total with applicable VAT and discounts before launching payment tender. (Locked during demo; clickable once tour completes!)',
        proTip: 'Shortcut keys allow fast checkout during long counter queues.',
        targetHint: 'Checkout Button',
        targetSelector: '[data-walkthrough="pos-checkout-btn"], button:has-text("Checkout"), button:has-text("Pay")'
      },
      {
        title: 'Payment Method & Change Calculator',
        instruction: 'Input the cash received from the customer to see the exact change owed, or select digital e-wallet. (Locked during demo; clickable once tour completes!)',
        proTip: 'Once payment confirms, the thermal receipt prints automatically.',
        targetHint: 'Payment Modal',
        targetSelector: '.modal, [role="dialog"], button'
      }
    ],
    proTip: 'Count change twice before handing it to the customer along with their printed receipt.'
  }
]

// 4. DETAILED EXPLANATION OF EVERY BUTTON & FEATURE ON THE DASHBOARD
export const DASHBOARD_FEATURES: DashboardFeature[] = [
  {
    id: 'feat-cafe-management',
    name: 'Cafe Management & Add Branch Control',
    location: 'Left Navigation: Cafe Management',
    icon: 'heroicons:building-storefront',
    color: 'text-amber-800 bg-amber-50 border-amber-200',
    badge: 'Store & Branch Setup',
    summary: 'Manage your cafe locations, configure weekly operating hours, inspect branch details, and add new branches.',
    details: 'Central hub for configuring cafe-wide opening hours, viewing active/inactive branches, inspecting BIR documents, managing branch employees, and creating new branches (requires a paid subscription with Multi-Branch access; Trial Plan is limited to 1 main branch).',
    tips: 'Complete the 1st Setup Mission (Cafe Management) first—if you have a paid subscription, you can immediately add a new branch right after the mission!'
  },
  {
    id: 'feat-refresh',
    name: 'Refresh Button',
    location: 'Top Right Header',
    icon: 'heroicons:arrow-path',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badge: 'Real-Time Sync',
    summary: 'Instantly pulls the newest sales, orders, and inventory data from all active POS terminals without reloading the entire page.',
    details: 'When clicked, the spinning animation indicates an active background fetch to the Laravel API. It updates revenue, order totals, and transaction logs with zero screen flicker.',
    tips: 'Use this during high-volume rush periods to check newly rung up sales and table turnarounds in real time.'
  },
  {
    id: 'feat-ticker',
    name: 'Operating Status & Date Ticker',
    location: 'Top Left Header',
    icon: 'heroicons:clock',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badge: 'Dynamic Display',
    summary: 'A smooth text ticker that automatically alternates every 5 seconds between the current date and your cafe\'s real-time Open/Closed status.',
    details: 'The green glowing indicator ("Open now") or red indicator ("Closed now") is calculated live by matching the current clock against your branch operating hours schedule in Cafe Management.',
    tips: 'If the ticker displays "Closed now" during business hours, check your branch opening hours in Cafe Management.'
  },
  {
    id: 'feat-ranges',
    name: 'Time Range Filter Buttons (Daily / Weekly / Monthly / Yearly)',
    location: 'Revenue Chart Header',
    icon: 'heroicons:calendar',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    badge: 'Interactive Range',
    summary: 'Toggles the aggregation window of the revenue chart and period statistics between Daily, Weekly, Monthly, and Yearly views.',
    details: 'Clicking any range recalculates total gross income, order count, average order value, and percentage growth compared to the prior period.',
    tips: 'Use "Daily" to analyze morning vs. afternoon rush hours, and "Monthly" to compare overall growth month-over-month.'
  },
  {
    id: 'feat-totals',
    name: 'Summary KPI Cards (Revenue, Branches, Categories, Menu Items)',
    location: 'Top Dashboard Row',
    icon: 'heroicons:banknotes',
    color: 'text-green-700 bg-green-50 border-green-200',
    badge: 'Executive KPIs',
    summary: 'High-level metric cards summarizing total gross earnings, total active branch count, total categories, and live menu item count.',
    details: 'Each card provides an instant glance at the size and scale of your business. Figures update automatically upon receipt of new register sales.',
    tips: 'Keeping your menu categories and items organized keeps cashier navigation fast and uncluttered.'
  },
  {
    id: 'feat-chart',
    name: 'Interactive Revenue Bar Chart & Hover Tooltips',
    location: 'Main Dashboard Center',
    icon: 'heroicons:chart-bar',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    badge: 'Visual Insights',
    summary: 'A responsive bar chart showing revenue distribution over the selected period.',
    details: 'Hovering over any individual bar displays a dynamic tooltip showing exact pesos earned, number of orders completed, and the exact date or hour of that bar.',
    tips: 'The tallest bars highlight your peak revenue days, helping you schedule enough baristas and stock supplies.'
  },
  {
    id: 'feat-branches',
    name: 'Branch Performance Breakdown',
    location: 'Right Column beside Chart',
    icon: 'heroicons:building-storefront',
    color: 'text-purple-700 bg-purple-50 border-purple-200',
    badge: 'Branch Ranking',
    summary: 'Ranks all cafe branches by gross revenue contribution and percentage share of total cafe sales.',
    details: 'Allows multi-store owners to immediately recognize which branch leads sales and which locations require operational or promotional support.',
    tips: 'Clicking a branch name navigates directly to that branch’s detailed management and settings page.'
  },
  {
    id: 'feat-trending',
    name: 'Trending Items & Best Sellers',
    location: 'Lower Dashboard Grid',
    icon: 'heroicons:fire',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    badge: 'Top Sellers',
    summary: 'Displays your cafe\'s most popular beverages and food items ranked by total units sold and revenue generated.',
    details: 'Helps identify crowd favorites (e.g. Caramel Macchiato, Spanish Latte) to ensure you maintain sufficient raw ingredients in stock.',
    tips: 'Pair your trending drinks with complementary pastries for higher average order value.'
  },
  {
    id: 'feat-categories',
    name: 'Top Categories Breakdown',
    location: 'Lower Dashboard Grid',
    icon: 'heroicons:tag',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    badge: 'Category Share',
    summary: 'Shows the revenue percentage generated by each category (Espresso, Cold Brew, Pastries, Non-Coffee).',
    details: 'Provides a visual breakdown of customer preferences so you know which product lines drive the bulk of your sales.',
    tips: 'Use this data to decide which new beverage or food recipes to develop next.'
  },
  {
    id: 'feat-transactions',
    name: 'Transaction Audit Log Table',
    location: 'Bottom Dashboard Section',
    icon: 'heroicons:document-text',
    color: 'text-slate-700 bg-slate-50 border-slate-200',
    badge: 'Audit Trail',
    summary: 'A comprehensive, searchable log of every single order, receipt number, cashier name, payment method, and order status.',
    details: 'Includes transparent records of order voids and refunded sales, along with the name of the manager who approved the override.',
    tips: 'Use the search box to quickly look up a customer receipt number when resolving customer questions or refunds.'
  },
  {
    id: 'feat-sidebar',
    name: 'Navigation Sidebar & Profile Menu',
    location: 'Left Screen Sidebar',
    icon: 'heroicons:bars-3',
    color: 'text-[#7D5A50] bg-[#FFF0D1] border-[#EDD8CC]',
    badge: 'Main Navigation',
    summary: 'Your permanent sidebar linking to Dashboard, Cafe Management, Menu Management, Analytics, Subscriptions, and User Profile.',
    details: 'On mobile, it collapses into a sleek slide-out drawer accessible via the top-left hamburger menu. The profile dropdown at the bottom includes quick logout and "System Tour" replay.',
    tips: 'You can replay this entire guide and walkthrough anytime by clicking your profile avatar and selecting "System Tour".'
  }
]

// 5. DETAILED EXPLANATION OF EVERY BUTTON & FEATURE ON THE MANAGER DASHBOARD
export const MANAGER_DASHBOARD_FEATURES: DashboardFeature[] = [
  {
    id: 'mgr-feat-totals',
    name: 'Branch Sales & Order Metrics',
    location: 'Top Overview Cards',
    icon: 'heroicons:chart-bar',
    color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badge: 'Real-time KPIs',
    summary: 'Monitors daily gross sales, order volume, and registered POS terminals for your branch.',
    details: 'Displays real-time revenue and transaction velocity as cashiers ring up sales at the counter. Keeps managers informed on daily shift goals.',
    tips: 'Compare today’s volume against your target daily quota to pace counter staffing.'
  },
  {
    id: 'mgr-feat-income',
    name: 'Sales & Income Trajectory Chart',
    location: 'Main Chart Area',
    icon: 'heroicons:presentation-chart-line',
    color: 'text-blue-700 bg-blue-50 border-blue-200',
    badge: 'Sales Velocity',
    summary: 'Visualizes sales income over Daily, Weekly, and Monthly intervals.',
    details: 'Interactive trajectory chart allowing managers to switch between today, past 7 days, and past 30 days to review branch financial performance.',
    tips: 'Hover over bars on the chart to inspect hourly or daily sales spikes.'
  },
  {
    id: 'mgr-feat-peakhours',
    name: 'Peak Customer Rush Hours',
    location: 'Beside Income Chart',
    icon: 'heroicons:clock',
    color: 'text-amber-700 bg-amber-50 border-amber-200',
    badge: 'Shift Planning',
    summary: 'Identifies the busiest dining and coffee bar hours across the week.',
    details: 'Calculates historical foot traffic trends so managers know exactly when morning coffee rushes and afternoon dine-in crowds arrive.',
    tips: 'Schedule senior baristas and extra kitchen prep staff during peak rush blocks.'
  },
  {
    id: 'mgr-feat-reservations',
    name: 'Upcoming Guest Table Reservations',
    location: 'Middle Section Cards',
    icon: 'heroicons:calendar-days',
    color: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    badge: 'Dining Bookings',
    summary: 'Lists advance guest reservations, party sizes, booking times, and table allocations.',
    details: 'Displays upcoming guest bookings for today. Allows managers to quickly confirm bookings, assign dining tables, and mark parties as seated.',
    tips: 'Check this card 30 minutes before meal rush to pre-set dining tables for large groups.'
  },
  {
    id: 'mgr-feat-employees',
    name: 'Active Staff On Duty',
    location: 'Middle Section Cards',
    icon: 'heroicons:user-group',
    color: 'text-teal-700 bg-teal-50 border-teal-200',
    badge: 'Shift Roster',
    summary: 'Monitors staff currently clocked in and assigned to your branch.',
    details: 'Roster of cashiers, baristas, and kitchen staff on duty today, including their shift hours, role badges, and active operational status.',
    tips: 'Quickly verify who is running the register before reviewing transaction voids.'
  },
  {
    id: 'mgr-feat-trending',
    name: 'Trending Items & Best Sellers',
    location: 'Lower Dashboard Grid',
    icon: 'heroicons:fire',
    color: 'text-orange-700 bg-orange-50 border-orange-200',
    badge: 'Top Sellers',
    summary: 'Lists your branch\'s best-selling beverages and food items by volume and revenue.',
    details: 'Ranks top products sold during the selected range so managers know which drinks are in high demand and require fresh ingredients.',
    tips: 'Ensure milk, espresso beans, and signature syrups are prepped before rush hour.'
  },
  {
    id: 'mgr-feat-categories',
    name: 'Top Categories Sales Share',
    location: 'Lower Dashboard Grid',
    icon: 'heroicons:tag',
    color: 'text-rose-700 bg-rose-50 border-rose-200',
    badge: 'Product Mix',
    summary: 'Visual breakdown of revenue generated by Espresso, Cold Brew, Pastries, and Food.',
    details: 'Reveals customer purchasing preferences across your product lines to guide counter upselling strategies.',
    tips: 'Train cashiers to suggest pastry pairings with top beverage categories.'
  },
  {
    id: 'mgr-feat-transactions',
    name: 'Transaction Audit Log Table',
    location: 'Bottom Section',
    icon: 'heroicons:document-text',
    color: 'text-slate-700 bg-slate-50 border-slate-200',
    badge: 'Audit Trail',
    summary: 'Comprehensive ledger of all customer orders, receipts, payments, and manager approvals.',
    details: 'Searchable transaction log showing receipt number, cashier name, payment method, order total, and manager override authorizations.',
    tips: 'Click any transaction to open the full digital receipt with itemized breakdown.'
  },
  {
    id: 'mgr-feat-servings',
    name: 'Kitchen & Barista Servings Queue',
    location: 'Left Navigation: Servings',
    icon: 'heroicons:cake',
    color: 'text-pink-700 bg-pink-50 border-pink-200',
    badge: 'Order Fulfillment',
    summary: 'Real-time order prep tracking from register order entry to customer pickup.',
    details: 'Digital kanban queue showing pending, in-prep, and ready-to-serve orders to ensure swift table and counter fulfillment.',
    tips: 'Keep order preparation times under 4 minutes for maximum customer satisfaction.'
  },
  {
    id: 'mgr-feat-floorplan',
    name: 'Dining Floor Plan & Table Layout',
    location: 'Left Navigation: Floor Plan',
    icon: 'heroicons:map',
    color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
    badge: 'Dining Space',
    summary: 'Visual floor plan with customizable table arrangements and live seating occupancy.',
    details: 'Drag-and-drop table layout tool that allows managers to reconfigure dining furniture, assign table numbers, and monitor table availability.',
    tips: 'Combine tables on the floor plan before large private party arrivals.'
  },
  {
    id: 'mgr-feat-cafe',
    name: 'Branch Operating Hours & Store Info',
    location: 'Left Navigation: Cafe Management',
    icon: 'heroicons:building-storefront',
    color: 'text-amber-800 bg-amber-50 border-amber-200',
    badge: 'Store Operations',
    summary: 'View and manage your store operating schedule, contact phone, and store status.',
    details: 'Configures daily opening and closing hours for your branch and updates the live Open/Closed ticker displayed across the system.',
    tips: 'Ensure operating hours reflect special holiday or weekend hours.'
  },
  {
    id: 'mgr-feat-sidebar',
    name: 'Manager Navigation & Profile Menu',
    location: 'Left Screen Sidebar',
    icon: 'heroicons:bars-3',
    color: 'text-[#7D5A50] bg-[#FFF0D1] border-[#EDD8CC]',
    badge: 'Main Navigation',
    summary: 'Your permanent sidebar linking to Dashboard, Cafe Management, Servings, Reservations, and Floor Plan.',
    details: 'Quickly navigate between your daily management responsibilities. Profile menu at the bottom allows instant System Tour replay anytime.',
    tips: 'Click your profile avatar at any time and select "System Tour" to replay this guide.'
  }
]

// Global state
const isGuideModalOpen = ref(false)
const activeTab = ref<'missions' | 'features'>('missions')
const completedMissionIds = ref<string[]>([])

// Persistent Interactive Mission Tour State (stays with user across pages and teaches step-by-step!)
const isMissionGuideActive = ref(false)
const activeMissionIndex = ref(0)
const activeStepIndex = ref(0)
const isCompanionMinimized = ref(false)
const isMissionCheckpointOpen = ref(false)
const isPracticeMode = ref(false)
const lastCompletedMission = ref<SetupMission | null>(null)
const missionCelebration = ref<{ show: boolean; title: string; subtitle: string } | null>(null)
const isGrandFinaleOpen = ref(false)

// Cached uuid of the owner's first branch, used by steps that need the branch details page
const ownerFirstBranchUuid = ref<string | null>(null)

export function useFirstTimeWalkthrough() {
  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  const role = computed(() => authStore.role)
  const isOwner = computed(() => role.value === 'Cafe Owner')
  const isManager = computed(() => role.value === 'Manager')
  const isCashier = computed(() => role.value === 'Cashier' || route.path.startsWith('/pos'))
  
  // Eligible for Cafe Owner and Manager
  const isEligible = computed(() => {
    if (!authStore.isAuthenticated) return false
    return isOwner.value || isManager.value
  })

  // Dynamic role-specific setup missions (Owner vs Manager)
  const currentRoleMissions = computed<SetupMission[]>(() => {
    if (isManager.value) {
      return MANAGER_SETUP_MISSIONS
    }
    return OWNER_SETUP_MISSIONS
  })

  // Dynamic role-specific dashboard features (Owner vs Manager)
  const currentRoleFeatures = computed<DashboardFeature[]>(() => {
    if (isManager.value) {
      return MANAGER_DASHBOARD_FEATURES
    }
    return DASHBOARD_FEATURES
  })

  // First time owner/manager: specifically during their initial onboarding/setup
  const isFirstTimeOwner = computed(() => {
    if (!isOwner.value && !isManager.value) return false
    if (authStore.user && typeof authStore.user.welcome_pending === 'boolean') {
      if (!authStore.user.welcome_pending) return false
    }
    if (isAllMissionsCompleted.value) return false
    return true
  })

  const storageKey = computed(() => {
    const userIdentifier = authStore.user?.uuid || authStore.user?.email || role.value || 'guest'
    return `brewspot_missions_progress_${userIdentifier}`
  })

  const walkthroughSeenKey = computed(() => {
    const userIdentifier = authStore.user?.uuid || authStore.user?.email || role.value || 'guest'
    return `brewspot_walkthrough_seen_${userIdentifier}`
  })

  // Load mission progress from localStorage
  const loadProgress = () => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(storageKey.value)
      if (saved) {
        completedMissionIds.value = JSON.parse(saved)
      } else {
        completedMissionIds.value = []
      }
    } catch (e) {
      console.warn('Failed to read missions from localStorage', e)
    }
  }

  // Save mission progress to localStorage
  const saveProgress = () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(storageKey.value, JSON.stringify(completedMissionIds.value))
    } catch (e) {
      console.warn('Failed to save missions to localStorage', e)
    }
  }

  const toggleMission = (id: string) => {
    if (completedMissionIds.value.includes(id)) {
      completedMissionIds.value = completedMissionIds.value.filter(m => m !== id)
    } else {
      completedMissionIds.value = [...completedMissionIds.value, id]
    }
    saveProgress()
  }

  const markMissionComplete = (id: string) => {
    if (!completedMissionIds.value.includes(id)) {
      completedMissionIds.value = [...completedMissionIds.value, id]
      saveProgress()
    }
  }

  const resetProgress = () => {
    completedMissionIds.value = []
    isMissionGuideActive.value = false
    isMissionCheckpointOpen.value = false
    isPracticeMode.value = false
    lastCompletedMission.value = null
    activeMissionIndex.value = 0
    activeStepIndex.value = 0
    isGrandFinaleOpen.value = false
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey.value)
      localStorage.removeItem(walkthroughSeenKey.value)
    }
  }

  // Auto-launch on first login (for first-time owner on /owner or manager on /manager)
  const checkAndAutoLaunch = () => {
    if (typeof window === 'undefined') return
    if (!isEligible.value) return
    if (!route.path.startsWith('/owner') && !route.path.startsWith('/manager')) return
    if (isMissionGuideActive.value) return
    if (!isFirstTimeOwner.value) return
    if (isAllMissionsCompleted.value) return

    try {
      const hasSeen = localStorage.getItem(walkthroughSeenKey.value)
      if (!hasSeen) {
        isGuideModalOpen.value = true
        activeTab.value = 'missions'
      }
    } catch (e) {
      console.warn('Failed to check walkthrough state in localStorage', e)
    }
  }

  const dismissGuide = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(walkthroughSeenKey.value, 'true')
      } catch (e) {
        console.warn('Failed to save walkthrough state in localStorage', e)
      }
    }
    isGuideModalOpen.value = false
  }

  const openGuide = (tab: 'missions' | 'features' = 'missions') => {
    activeTab.value = tab
    isGuideModalOpen.value = true
  }

  // Total and count
  const totalMissions = computed(() => currentRoleMissions.value.length)
  const completedMissionsCount = computed(() => {
    return currentRoleMissions.value.filter(m => completedMissionIds.value.includes(m.id)).length
  })
  const remainingMissionsCount = computed(() => Math.max(0, totalMissions.value - completedMissionsCount.value))
  const missionsProgressPercent = computed(() => {
    if (totalMissions.value === 0) return 0
    return Math.round((completedMissionsCount.value / totalMissions.value) * 100)
  })
  const isAllMissionsCompleted = computed(() => totalMissions.value > 0 && completedMissionsCount.value >= totalMissions.value)

  // Current active mission during guided walkthrough
  const currentActiveMission = computed(() => {
    return currentRoleMissions.value[activeMissionIndex.value] || currentRoleMissions.value[0]
  })

  // Current active step within the active mission
  const currentActiveStep = computed(() => {
    const steps = currentActiveMission.value?.detailedSteps || []
    return steps[activeStepIndex.value] || steps[0]
  })

  const totalStepsInActiveMission = computed(() => {
    return currentActiveMission.value?.detailedSteps?.length || 4
  })

  const isLastStepOfMission = computed(() => {
    return activeStepIndex.value >= totalStepsInActiveMission.value - 1
  })

  const isFirstStepOfMission = computed(() => {
    return activeStepIndex.value === 0
  })

  const isLastMission = computed(() => activeMissionIndex.value >= totalMissions.value - 1)
  const isFirstMission = computed(() => activeMissionIndex.value === 0)

  // Next Mission Object Preview
  const nextMissionObject = computed(() => {
    if (isLastMission.value) return null
    return currentRoleMissions.value[activeMissionIndex.value + 1] || null
  })

  // Start guided mission tour at specific mission and step: actively stays on screen and navigates with the user!
  const startMission = (mission: SetupMission, stepIdx: number = 0) => {
    const idx = currentRoleMissions.value.findIndex(m => m.id === mission.id)
    activeMissionIndex.value = idx >= 0 ? idx : 0
    activeStepIndex.value = stepIdx
    isGuideModalOpen.value = false
    isMissionCheckpointOpen.value = false
    isPracticeMode.value = false
    isMissionGuideActive.value = true
    isCompanionMinimized.value = false

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(walkthroughSeenKey.value, 'true')
      } catch (e) {
        console.warn('Failed to save walkthrough state in localStorage', e)
      }
    }

    if (route.path !== mission.route) {
      router.push(mission.route)
    }
  }

  // Start Full Tour from the first incomplete mission
  const startFullTour = () => {
    const firstIncompleteIdx = currentRoleMissions.value.findIndex(m => !completedMissionIds.value.includes(m.id))
    const targetIdx = firstIncompleteIdx >= 0 ? firstIncompleteIdx : 0
    const targetMission = currentRoleMissions.value[targetIdx] || currentRoleMissions.value[0]
    if (targetMission) {
      startMission(targetMission, 0)
    }
  }

  // Stop / Pause tour after Mission 1 (or any mission) so the user can try setting up their account freely
  const pauseToPractice = (markCurrentDone: boolean = true) => {
    const current = currentActiveMission.value
    if (markCurrentDone && current) {
      markMissionComplete(current.id)
      lastCompletedMission.value = current
    }
    isMissionGuideActive.value = false
    isMissionCheckpointOpen.value = false
    isCompanionMinimized.value = false
    isPracticeMode.value = true

    missionCelebration.value = {
      show: true,
      title: 'Practice Mode Unlocked!',
      subtitle: 'Buttons are now unlocked—try setting up your account right here. Click "Continue Tour" at the bottom-right anytime.'
    }
    setTimeout(() => {
      if (missionCelebration.value) {
        missionCelebration.value.show = false
      }
    }, 4200)
  }

  // Continue from checkpoint or practice mode to the next mission
  const continueToNextMission = () => {
    isMissionCheckpointOpen.value = false
    isPracticeMode.value = false

    if (activeMissionIndex.value < totalMissions.value - 1) {
      activeMissionIndex.value++
      activeStepIndex.value = 0
      const nextMissionObj = currentRoleMissions.value[activeMissionIndex.value]
      if (!nextMissionObj) return

      isMissionGuideActive.value = true
      isCompanionMinimized.value = false

      missionCelebration.value = {
        show: true,
        title: `Starting Mission ${activeMissionIndex.value + 1}`,
        subtitle: `Navigating to: ${nextMissionObj.title}...`
      }
      setTimeout(() => {
        if (missionCelebration.value) {
          missionCelebration.value.show = false
        }
      }, 3500)

      if (route.path !== nextMissionObj.route) {
        router.push(nextMissionObj.route)
      }
    } else {
      finishAllMissions()
    }
  }

  // Step progression: Next Step
  const nextStep = () => {
    const stepsCount = totalStepsInActiveMission.value
    if (activeStepIndex.value < stepsCount - 1) {
      // Advance to next button in current mission!
      activeStepIndex.value++
    } else {
      // Completed all buttons of this mission!
      const completedMission = currentActiveMission.value
      if (completedMission) {
        markMissionComplete(completedMission.id)
        lastCompletedMission.value = completedMission
      }

      if (activeMissionIndex.value < totalMissions.value - 1) {
        // Pause & show Emil Kowalski Mission Checkpoint so the user can stop and try setting up their account after Mission 1 (or any mission), or continue!
        isMissionGuideActive.value = false
        isMissionCheckpointOpen.value = true
      } else {
        // Last step of the final mission! All missions completed!
        finishAllMissions()
      }
    }
  }

  // Step progression: Previous Step
  const prevStep = () => {
    if (activeStepIndex.value > 0) {
      activeStepIndex.value--
    } else if (activeMissionIndex.value > 0) {
      // Go back to previous mission's last button
      activeMissionIndex.value--
      const prevMissionObj = currentRoleMissions.value[activeMissionIndex.value]
      const prevStepsCount = prevMissionObj?.detailedSteps?.length || 4
      activeStepIndex.value = prevStepsCount - 1

      if (prevMissionObj && route.path !== prevMissionObj.route) {
        router.push(prevMissionObj.route)
      }
    }
  }

  // Skip straight to the next mission
  const skipToNextMission = () => {
    const completedMission = currentActiveMission.value
    if (completedMission) {
      markMissionComplete(completedMission.id)
    }

    if (activeMissionIndex.value < totalMissions.value - 1) {
      activeMissionIndex.value++
      activeStepIndex.value = 0
      const nextMissionObj = currentRoleMissions.value[activeMissionIndex.value]

      if (!nextMissionObj) return

      missionCelebration.value = {
        show: true,
        title: `Skipping to Mission ${activeMissionIndex.value + 1}`,
        subtitle: `Navigating to: ${nextMissionObj.title}...`
      }
      setTimeout(() => {
        if (missionCelebration.value) {
          missionCelebration.value.show = false
        }
      }, 3000)

      if (route.path !== nextMissionObj.route) {
        router.push(nextMissionObj.route)
      }
    } else {
      finishAllMissions()
    }
  }

  // Go to specific step directly
  const goToStep = (stepIdx: number) => {
    if (stepIdx >= 0 && stepIdx < totalStepsInActiveMission.value) {
      activeStepIndex.value = stepIdx
    }
  }

  const finishAllMissions = () => {
    currentRoleMissions.value.forEach(m => markMissionComplete(m.id))
    isMissionGuideActive.value = false
    isMissionCheckpointOpen.value = false
    isPracticeMode.value = false
    isGrandFinaleOpen.value = true
    dismissGuide()
  }

  const exitMissionGuide = () => {
    isMissionGuideActive.value = false
    isMissionCheckpointOpen.value = false
  }

  // Resolve the page a step lives on. Falls back to the mission route when a
  // dynamic route cannot be resolved (e.g. owner has no branches yet).
  const resolveStepRoute = async (mission: SetupMission, step: MissionStep | undefined): Promise<string> => {
    if (!step?.route) return mission.route
    const [base, query] = step.route.split('?')
    if (base !== 'owner-first-branch') return step.route

    if (!ownerFirstBranchUuid.value) {
      try {
        const res = await useOwnerProfileService().getBranches(1, 1)
        ownerFirstBranchUuid.value = res.success ? res.branches?.data?.[0]?.uuid ?? null : null
      } catch (e) {
        console.warn('Failed to resolve branch for walkthrough step', e)
      }
    }
    if (!ownerFirstBranchUuid.value) return mission.route
    return `/owner/branches/${ownerFirstBranchUuid.value}${query ? `?${query}` : ''}`
  }

  // Keep the browser on the page the active step belongs to
  const syncRouteToActiveStep = async () => {
    if (!isMissionGuideActive.value) return
    const mission = currentActiveMission.value
    // Only missions that define per-step routes are driven here; others keep mission-level navigation
    if (!mission || !mission.detailedSteps.some(s => s.route)) return
    const missionIdx = activeMissionIndex.value
    const stepIdx = activeStepIndex.value
    const target = await resolveStepRoute(mission, currentActiveStep.value)
    // Ignore stale results if the user moved on while resolving
    if (missionIdx !== activeMissionIndex.value || stepIdx !== activeStepIndex.value) return
    // fullPath so tab changes (?tab=...) on the same page also navigate
    if (route.fullPath !== target) {
      router.push(target)
    }
  }

  // Initial load
  if (typeof window !== 'undefined') {
    loadProgress()
  }

  onMounted(() => {
    loadProgress()
    checkAndAutoLaunch()
  })

  watch(role, (newRole) => {
    if (newRole) {
      nextTick(() => {
        loadProgress()
        checkAndAutoLaunch()
      })
    }
  })

  // Ensure auto-launch only triggers on initial entry to /owner/dashboard or /manager/dashboard
  watch(() => route.path, (newPath, oldPath) => {
    const isEnteringDashboard =
      (newPath === '/owner/dashboard' && (!oldPath || !oldPath.startsWith('/owner'))) ||
      (newPath === '/manager/dashboard' && (!oldPath || !oldPath.startsWith('/manager')))
    if (isEnteringDashboard) {
      checkAndAutoLaunch()
    }
  })

  return {
    isGuideModalOpen,
    activeTab,
    isEligible,
    isFirstTimeOwner,
    isOwner,
    isManager,
    isCashier,
    role,
    missions: currentRoleMissions,
    completedMissionIds,
    dashboardFeatures: currentRoleFeatures,
    totalMissions,
    completedMissionsCount,
    remainingMissionsCount,
    missionsProgressPercent,
    isAllMissionsCompleted,
    isMissionGuideActive,
    activeMissionIndex,
    activeStepIndex,
    currentActiveMission,
    currentActiveStep,
    totalStepsInActiveMission,
    isLastStepOfMission,
    isFirstStepOfMission,
    isLastMission,
    isFirstMission,
    nextMissionObject,
    isCompanionMinimized,
    isMissionCheckpointOpen,
    isPracticeMode,
    lastCompletedMission,
    missionCelebration,
    isGrandFinaleOpen,
    toggleMission,
    markMissionComplete,
    resetProgress,
    dismissGuide,
    openGuide,
    startMission,
    startFullTour,
    pauseToPractice,
    continueToNextMission,
    nextStep,
    prevStep,
    skipToNextMission,
    goToStep,
    finishAllMissions,
    exitMissionGuide,
    syncRouteToActiveStep,
  }
}
