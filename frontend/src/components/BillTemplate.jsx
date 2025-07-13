import React from 'react';

const BillTemplate = {
  // Generate HTML for printing
  generatePrintHTML: (billData, options = {}) => {
    const {
      showCompanyHeader = true,
      showCustomerInfo = true,
      showPaymentInfo = true,
      companyName = 'Ruhunu Tyre House',
      companyContact = '📞 Support: 077-123-4567',
      companyEmail = '📧 info@ruhunutyre.lk',
      title = 'Sales Receipt'
    } = options;

    const saleDate = new Date(billData.createdAt || billData.saleDate || Date.now()).toLocaleString();
    const billNumber = billData.billNumber || billData._id || 'N/A';
    const customerName = billData.customerName || 'Walk-in Customer';
    const cashierName = billData.cashier?.name || billData.cashierName || 'System';
    const paymentMethod = billData.paymentMethod || 'cash';
    const items = billData.items || [];
    
    // Calculate totals
    const subtotal = billData.subtotal || items.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalDiscount = billData.discount || (subtotal - (billData.total || billData.totalAmount || subtotal));
    const netTotal = billData.total || billData.totalAmount || subtotal;
    const amountPaid = billData.amountPaid || netTotal;
    const balance = billData.balance || billData.change || (amountPaid - netTotal);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title} - ${billNumber}</title>
          <style>
                         body { 
               font-family: 'Courier New', monospace; 
               padding: 5px; 
               max-width: 300px; 
               margin: 0 auto; 
               font-size: 12px;
               line-height: 1.2;
               color: #000;
               background: #fff;
             }
                         .header { 
               text-align: center; 
               margin-bottom: 10px; 
               border-bottom: 1px solid #000; 
               padding-bottom: 5px; 
             }
                         .company-name { 
               font-size: 16px; 
               font-weight: bold; 
               margin-bottom: 3px; 
             }
             .contact-info { 
               font-size: 10px; 
               color: #000; 
               margin-bottom: 3px;
             }
                         .bill-details { 
               margin: 10px 0; 
               font-size: 11px;
             }
             .bill-details p {
               margin: 2px 0;
             }
                         .items-table { 
               width: 100%; 
               border-collapse: collapse; 
               margin: 10px 0; 
               font-size: 10px;
             }
             .items-table th, .items-table td { 
               border-bottom: 1px dashed #000; 
               padding: 3px 2px; 
               text-align: left; 
             }
             .items-table th { 
               background-color: #fff; 
               font-weight: bold;
               border-bottom: 1px solid #000;
             }
            .items-table .text-right { 
              text-align: right; 
            }
            .items-table .text-center { 
              text-align: center; 
            }
                         .total-section { 
               border-top: 1px solid #000; 
               padding-top: 5px; 
               margin-top: 5px; 
             }
             .total-section table {
               width: 100%;
               font-size: 11px;
             }
             .total-section td {
               padding: 1px 0;
             }
             .total-section .grand-total {
               font-weight: bold;
               font-size: 12px;
               border-top: 1px dashed #000;
               padding-top: 3px;
             }
                         .footer { 
               text-align: center; 
               margin-top: 15px; 
               font-size: 10px; 
               border-top: 1px dashed #000; 
               padding-top: 5px; 
             }
            .no-print { 
              text-align: center; 
              margin-top: 20px; 
            }
            .print-button {
              padding: 10px 20px; 
              background: #4CAF50; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer;
              font-size: 14px;
            }
            .print-button:hover {
              background: #45a049;
            }
                         @media print { 
               body { 
                 padding: 0; 
                 font-size: 10px;
                 max-width: 280px;
               } 
               .no-print { 
                 display: none; 
               }
               .header {
                 margin-bottom: 5px;
               }
               .items-table {
                 font-size: 9px;
               }
               .footer {
                 margin-top: 10px;
                 font-size: 9px;
               }
             }
          </style>
        </head>
        <body>
          ${showCompanyHeader ? `
            <div class="header">
              <div class="company-name">${companyName}</div>
              <div class="contact-info">${companyContact}</div>
              <div class="contact-info">${companyEmail}</div>
            </div>
          ` : ''}
          
          <div class="bill-details">
            <p><strong>Receipt #:</strong> ${billNumber}</p>
            <p><strong>Date:</strong> ${saleDate}</p>
            <p><strong>Cashier:</strong> ${cashierName}</p>
            ${showCustomerInfo ? `
              <p><strong>Customer:</strong> ${customerName}</p>
              ${billData.customerNic || billData.customerNIC ? `<p><strong>NIC:</strong> ${billData.customerNic || billData.customerNIC}</p>` : ''}
            ` : ''}
            ${showPaymentInfo ? `<p><strong>Payment:</strong> ${paymentMethod.toUpperCase()}</p>` : ''}
          </div>

                     <table class="items-table">
             <thead>
               <tr>
                 <th>Item</th>
                 <th class="text-center">Qty</th>
                 <th class="text-right">Price</th>
                 <th class="text-right">Total</th>
               </tr>
             </thead>
             <tbody>
               ${items.map(item => `
                 <tr>
                   <td>
                     ${item.name}<br/>
                     <small style="color: #000; font-size: 9px;">${item.itemCode || item.code || ''}</small>
                     ${(item.discount || item.discountPercent || 0) > 0 ? `<br/><small style="color: #000; font-size: 9px;">Disc: ${(item.discount || item.discountPercent || 0).toFixed(1)}%</small>` : ''}
                   </td>
                   <td class="text-center">${item.quantity}</td>
                   <td class="text-right">${(item.price || 0).toFixed(2)}</td>
                   <td class="text-right">${(item.total || item.lineTotal || 0).toFixed(2)}</td>
                 </tr>
               `).join('')}
             </tbody>
           </table>

                     <div class="total-section">
             <table>
               <tr>
                 <td>Subtotal:</td>
                 <td class="text-right">${subtotal.toFixed(2)}</td>
               </tr>
               ${totalDiscount > 0 ? `
                 <tr>
                   <td>Discount:</td>
                   <td class="text-right">${totalDiscount.toFixed(2)}</td>
                 </tr>
               ` : ''}
               <tr class="grand-total">
                 <td>TOTAL:</td>
                 <td class="text-right">${netTotal.toFixed(2)}</td>
               </tr>
               ${showPaymentInfo ? `
                 <tr>
                   <td>Paid:</td>
                   <td class="text-right">${amountPaid.toFixed(2)}</td>
                 </tr>
                 <tr>
                   <td>${balance >= 0 ? 'Change:' : 'Due:'}</td>
                   <td class="text-right">${Math.abs(balance).toFixed(2)}</td>
                 </tr>
               ` : ''}
             </table>
           </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Please visit us again</p>
            <p style="margin-top: 10px;">--- Goods once sold are not returnable ---</p>
          </div>

          <div class="no-print">
            <button onclick="window.print()" class="print-button">
              Print Receipt
            </button>
          </div>
        </body>
      </html>
    `;
  },

  // Print function that opens a new window and prints
  printBill: (billData, options = {}) => {
    const printWindow = window.open('', '_blank');
    const htmlContent = BillTemplate.generatePrintHTML(billData, options);
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto-focus the print window
    printWindow.focus();
    
    return printWindow;
  },

  // Thermal printer optimized version
  printThermalBill: (billData, options = {}) => {
    const thermalOptions = {
      ...options,
      showCompanyHeader: true,
      showCustomerInfo: true,
      showPaymentInfo: true,
      companyName: 'RUHUNU TYRE HOUSE',
      companyContact: 'Tel: 077-123-4567',
      companyEmail: 'info@ruhunutyre.lk',
      title: 'RECEIPT'
    };
    
    return BillTemplate.printBill(billData, thermalOptions);
  }
};

export default BillTemplate; 