import type { PaymentTransaction } from '~/components/common/PaymentHistoryTable.vue'

export function exportToExcel(transactions: PaymentTransaction[], selectedStatusLabel = 'All', ownerName?: string) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const titleText = ownerName 
    ? `BREWSPOT SYSTEM - ${ownerName.toUpperCase()}'S PAYMENT & BILLING REPORT`
    : `BREWSPOT SYSTEM - OFFICIAL PAYMENT & BILLING REPORT`

  const fileName = ownerName
    ? `BrewSpot_Payment_Report_${ownerName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xls`
    : `BrewSpot_Payment_Report_${new Date().toISOString().slice(0, 10)}.xls`

  // Calculate summary metrics
  const totalTransactions = transactions.length
  const totalRevenue = transactions.reduce((acc, t) => {
    const val = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount).replace(/[^0-9.]/g, ''))
    return acc + (isNaN(val) ? 0 : val)
  }, 0)

  // Build professional Excel SpreadsheetML document (Opens natively in MS Excel with rich styling)
  const excelXml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>BrewSpot Admin</Author>
  <Created>${new Date().toISOString()}</Created>
  <Company>BrewSpot Cafe Management System</Company>
 </DocumentProperties>
 <Styles>
  <!-- Normal Default Font -->
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>

  <!-- Title Banner -->
  <Style ss:ID="sTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#FFF0D1"/>
   <Interior ss:Color="#7D5A50" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#3D2B24"/>
   </Borders>
  </Style>

  <!-- Subtitle Info -->
  <Style ss:ID="sSubTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Italic="1" ss:Color="#8B6656"/>
  </Style>

  <!-- Summary Label Style -->
  <Style ss:ID="sSummaryLabel">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#9E7060"/>
   <Interior ss:Color="#FFF0D1" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEDFC4"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEDFC4"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEDFC4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEDFC4"/>
   </Borders>
  </Style>

  <!-- Summary Value Style -->
  <Style ss:ID="sSummaryVal">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#3B1F0E"/>
   <Interior ss:Color="#FFFDF9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEDFC4"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEDFC4"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEDFC4"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#EEDFC4"/>
   </Borders>
  </Style>

  <!-- Table Header Style -->
  <Style ss:ID="sHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFF0D1"/>
   <Interior ss:Color="#7D5A50" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#3D2B24"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#3D2B24"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#684940"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#684940"/>
   </Borders>
  </Style>

  <!-- Normal Row Style -->
  <Style ss:ID="sCellNormal">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
   </Borders>
  </Style>

  <!-- Alternate Row Style -->
  <Style ss:ID="sCellAlt">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Interior ss:Color="#FFFDF9" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
   </Borders>
  </Style>

  <!-- Currency Style -->
  <Style ss:ID="sCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#3B1F0E"/>
   <NumberFormat ss:Format="₱#,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
   </Borders>
  </Style>

  <!-- Currency Alt Style -->
  <Style ss:ID="sCurrencyAlt">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#3B1F0E"/>
   <Interior ss:Color="#FFFDF9" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="₱#,##0.00"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F3E7D2"/>
   </Borders>
  </Style>

  <!-- Status Success Pill Style -->
  <Style ss:ID="sStatusSuccess">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#155724"/>
   <Interior ss:Color="#D4EDDA" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C3E6CB"/>
   </Borders>
  </Style>

  <!-- Status Pending Pill Style -->
  <Style ss:ID="sStatusPending">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#856404"/>
   <Interior ss:Color="#FFF3CD" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#FFEEBA"/>
   </Borders>
  </Style>

  <!-- Status Failed Pill Style -->
  <Style ss:ID="sStatusFailed">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#721C24"/>
   <Interior ss:Color="#F8D7DA" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#F5C6CB"/>
   </Borders>
  </Style>

  <!-- Total Row Label Style -->
  <Style ss:ID="sTotalRow">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#3B1F0E"/>
   <Interior ss:Color="#FFF0D1" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#7D5A50"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#7D5A50"/>
   </Borders>
  </Style>

  <!-- Total Currency Style -->
  <Style ss:ID="sTotalCurrency">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="12" ss:Bold="1" ss:Color="#28A745"/>
   <Interior ss:Color="#FFF0D1" ss:Pattern="Solid"/>
   <NumberFormat ss:Format="₱#,##0.00"/>
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#7D5A50"/>
    <Border ss:Position="Bottom" ss:LineStyle="Double" ss:Weight="3" ss:Color="#7D5A50"/>
   </Borders>
  </Style>
 </Styles>

 <Worksheet ss:Name="Payment History">
  <Table ss:ExpandedColumnCount="6" ss:ExpandedRowCount="${transactions.length + 20}" x:FullColumns="1" x:FullRows="1">
   <!-- Professional Column Widths -->
   <Column ss:Width="140"/> <!-- Transaction ID -->
   <Column ss:Width="110"/> <!-- Date -->
   <Column ss:Width="220"/> <!-- Activity / Plan Type -->
   <Column ss:Width="180"/> <!-- Owner / Email -->
   <Column ss:Width="120"/> <!-- Amount -->
   <Column ss:Width="110"/> <!-- Payment Status -->

   <!-- Row 1: Brand Title Banner -->
   <Row ss:Height="36">
    <Cell ss:MergeAcross="5" ss:StyleID="sTitle">
     <Data ss:Type="String">   ${escapeXml(titleText)}</Data>
    </Cell>
   </Row>

   <!-- Row 2: Metadata -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="5" ss:StyleID="sSubTitle">
     <Data ss:Type="String">   Report Generated: ${currentDate}   |   Status Filter: ${selectedStatusLabel}</Data>
    </Cell>
   </Row>

   <Row ss:Height="12"/>

   <!-- Row 4: Summary Cards Headers -->
   <Row ss:Height="22">
    <Cell ss:MergeAcross="1" ss:StyleID="sSummaryLabel"><Data ss:Type="String">TOTAL TRANSACTIONS</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="sSummaryLabel"><Data ss:Type="String">TOTAL REVENUE</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="sSummaryLabel"><Data ss:Type="String">STATUS FILTER</Data></Cell>
   </Row>

   <!-- Row 5: Summary Card Values -->
   <Row ss:Height="26">
    <Cell ss:MergeAcross="1" ss:StyleID="sSummaryVal"><Data ss:Type="Number">${totalTransactions}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="sSummaryVal"><Data ss:Type="String">₱${totalRevenue.toFixed(2)}</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="sSummaryVal"><Data ss:Type="String">${escapeXml(selectedStatusLabel)}</Data></Cell>
   </Row>

   <Row ss:Height="16"/>

   <!-- Row 7: Data Table Headers -->
   <Row ss:Height="28">
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Transaction ID</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Activity / Plan Type</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Owner / Email</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Amount (₱)</Data></Cell>
    <Cell ss:StyleID="sHeader"><Data ss:Type="String">Payment Status</Data></Cell>
   </Row>

   <!-- Data Rows -->
   ${transactions
     .map((t, index) => {
       const isAlt = index % 2 === 1
       const cellStyle = isAlt ? 'sCellAlt' : 'sCellNormal'
       const currStyle = isAlt ? 'sCurrencyAlt' : 'sCurrency'

       const rawAmt = typeof t.amount === 'number' ? t.amount : parseFloat(String(t.amount).replace(/[^0-9.]/g, ''))
       const amtVal = isNaN(rawAmt) ? 0 : rawAmt

       const st = (t.status || '').toLowerCase()
       let statusStyle = 'sStatusSuccess'
       let statusLabel = 'Success'

       if (['active', 'succeeded', 'success', 'paid', 'approved'].includes(st)) {
         statusStyle = 'sStatusSuccess'
         statusLabel = 'Success'
       } else if (['pending', 'pending_approval'].includes(st)) {
         statusStyle = 'sStatusPending'
         statusLabel = 'Pending'
       } else {
         statusStyle = 'sStatusFailed'
         statusLabel = st.charAt(0).toUpperCase() + st.slice(1)
       }

       const txnId = t.transaction_id.startsWith('TXN-')
         ? t.transaction_id
         : `TXN-${t.transaction_id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7)}`

       const formattedDate = t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'
       const owner = t.owner_name ? `${t.owner_name}${t.owner_email ? ` (${t.owner_email})` : ''}` : 'N/A'

       return `
   <Row ss:Height="22">
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(txnId)}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(formattedDate)}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(t.description)}</Data></Cell>
    <Cell ss:StyleID="${cellStyle}"><Data ss:Type="String">${escapeXml(owner)}</Data></Cell>
    <Cell ss:StyleID="${currStyle}"><Data ss:Type="Number">${amtVal.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${escapeXml(statusLabel)}</Data></Cell>
   </Row>`
     })
     .join('')}

   <!-- Total Summary Row -->
   <Row ss:Height="28">
    <Cell ss:MergeAcross="3" ss:StyleID="sTotalRow"><Data ss:Type="String">TOTAL REVENUE: </Data></Cell>
    <Cell ss:StyleID="sTotalCurrency"><Data ss:Type="Number">${totalRevenue.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="sTotalRow"><Data ss:Type="String"></Data></Cell>
   </Row>

  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Header x:Margin="0.3"/>
    <Footer x:Margin="0.3"/>
    <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>
   </PageSetup>
   <Selected/>
   <Panes>
    <Pane>
     <Number>3</Number>
     <ActiveRow>1</ActiveRow>
    </Pane>
   </Panes>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`

  // Download directly as an Excel Spreadsheet file (.xls / .xlsx)
  const blob = new Blob([excelXml], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
