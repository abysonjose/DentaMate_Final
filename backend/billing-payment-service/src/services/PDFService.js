const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class PDFService {
  constructor() {
    this.storagePath = process.env.INVOICE_STORAGE_PATH || './storage/invoices';
    this.templatePath = process.env.PDF_TEMPLATE_PATH || './templates';
    
    // Ensure storage directory exists
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoice, bill) {
    try {
      const fileName = `invoice_${invoice.invoiceNumber}.pdf`;
      const filePath = path.join(this.storagePath, fileName);

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      
      // Pipe to file
      doc.pipe(fs.createWriteStream(filePath));

      // Add content
      this.addInvoiceHeader(doc, invoice);
      this.addInvoiceDetails(doc, invoice);
      this.addBillItems(doc, bill);
      this.addInvoiceSummary(doc, invoice);
      this.addInvoiceFooter(doc, invoice);

      // Finalize PDF
      doc.end();

      // Wait for file to be written
      await new Promise((resolve, reject) => {
        doc.on('end', resolve);
        doc.on('error', reject);
      });

      logger.info('Invoice PDF generated', {
        invoiceId: invoice.invoiceId,
        fileName,
        filePath
      });

      return filePath;
    } catch (error) {
      logger.error('Error generating invoice PDF:', error);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Add invoice header
   */
  addInvoiceHeader(doc, invoice) {
    // Clinic details
    doc.fontSize(20)
       .text(invoice.clinicDetails.name, 50, 50)
       .fontSize(12)
       .text(invoice.clinicDetails.address, 50, 80);

    if (invoice.clinicDetails.phone) {
      doc.text(`Phone: ${invoice.clinicDetails.phone}`, 50, 100);
    }

    if (invoice.clinicDetails.email) {
      doc.text(`Email: ${invoice.clinicDetails.email}`, 50, 115);
    }

    if (invoice.clinicDetails.gstNumber) {
      doc.text(`GST: ${invoice.clinicDetails.gstNumber}`, 50, 130);
    }

    // Invoice title
    doc.fontSize(24)
       .text('INVOICE', 400, 50, { align: 'right' });

    // Invoice number and date
    doc.fontSize(12)
       .text(`Invoice #: ${invoice.formattedInvoiceNumber}`, 400, 80, { align: 'right' })
       .text(`Date: ${invoice.createdAt.toLocaleDateString()}`, 400, 95, { align: 'right' })
       .text(`Due Date: ${invoice.dueDate.toLocaleDateString()}`, 400, 110, { align: 'right' });

    // Add line
    doc.moveTo(50, 160)
       .lineTo(550, 160)
       .stroke();
  }

  /**
   * Add invoice details
   */
  addInvoiceDetails(doc, invoice) {
    let yPosition = 180;

    // Patient details
    doc.fontSize(14)
       .text('Bill To:', 50, yPosition)
       .fontSize(12)
       .text(invoice.patientDetails.name, 50, yPosition + 20);

    if (invoice.patientDetails.address) {
      doc.text(invoice.patientDetails.address, 50, yPosition + 35);
      yPosition += 15;
    }

    if (invoice.patientDetails.phone) {
      doc.text(`Phone: ${invoice.patientDetails.phone}`, 50, yPosition + 35);
      yPosition += 15;
    }

    if (invoice.patientDetails.email) {
      doc.text(`Email: ${invoice.patientDetails.email}`, 50, yPosition + 35);
    }

    // Payment terms
    doc.fontSize(12)
       .text('Payment Terms:', 400, 180, { align: 'right' })
       .text(invoice.paymentTerms, 400, 195, { align: 'right' });

    return yPosition + 60;
  }

  /**
   * Add bill items table
   */
  addBillItems(doc, bill) {
    let yPosition = 280;

    // Table header
    doc.fontSize(12)
       .text('Description', 50, yPosition)
       .text('Qty', 300, yPosition)
       .text('Unit Price', 350, yPosition)
       .text('Discount', 420, yPosition)
       .text('Total', 480, yPosition);

    // Header line
    yPosition += 20;
    doc.moveTo(50, yPosition)
       .lineTo(550, yPosition)
       .stroke();

    yPosition += 10;

    // Items
    bill.items.forEach(item => {
      doc.fontSize(10)
         .text(item.description, 50, yPosition, { width: 240 })
         .text(item.quantity.toString(), 300, yPosition)
         .text(`₹${item.unitPrice.toFixed(2)}`, 350, yPosition)
         .text(`₹${item.discountAmount.toFixed(2)}`, 420, yPosition)
         .text(`₹${item.totalPrice.toFixed(2)}`, 480, yPosition);

      yPosition += 25;

      // Add new page if needed
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }
    });

    // Bottom line
    doc.moveTo(50, yPosition)
       .lineTo(550, yPosition)
       .stroke();

    return yPosition + 20;
  }

  /**
   * Add invoice summary
   */
  addInvoiceSummary(doc, invoice) {
    let yPosition = 600;

    // Summary box
    const summaryX = 350;
    const summaryWidth = 200;

    doc.fontSize(12)
       .text('Subtotal:', summaryX, yPosition)
       .text(`₹${(invoice.totalAmount).toFixed(2)}`, summaryX + 100, yPosition, { align: 'right', width: 100 });

    yPosition += 20;

    if (invoice.totalDiscount > 0) {
      doc.text('Discount:', summaryX, yPosition)
         .text(`-₹${invoice.totalDiscount.toFixed(2)}`, summaryX + 100, yPosition, { align: 'right', width: 100 });
      yPosition += 20;
    }

    if (invoice.totalTax > 0) {
      doc.text('Tax:', summaryX, yPosition)
         .text(`₹${invoice.totalTax.toFixed(2)}`, summaryX + 100, yPosition, { align: 'right', width: 100 });
      yPosition += 20;
    }

    // Total line
    doc.moveTo(summaryX, yPosition)
       .lineTo(summaryX + summaryWidth, yPosition)
       .stroke();

    yPosition += 10;

    // Total amount
    doc.fontSize(14)
       .text('Total Amount:', summaryX, yPosition)
       .text(`₹${invoice.totalAmount.toFixed(2)}`, summaryX + 100, yPosition, { align: 'right', width: 100 });

    yPosition += 25;

    // Amount paid
    if (invoice.paidAmount > 0) {
      doc.fontSize(12)
         .text('Amount Paid:', summaryX, yPosition)
         .text(`₹${invoice.paidAmount.toFixed(2)}`, summaryX + 100, yPosition, { align: 'right', width: 100 });
      yPosition += 20;
    }

    // Balance due
    if (invoice.balanceAmount > 0) {
      doc.fontSize(14)
         .fillColor('red')
         .text('Balance Due:', summaryX, yPosition)
         .text(`₹${invoice.balanceAmount.toFixed(2)}`, summaryX + 100, yPosition, { align: 'right', width: 100 })
         .fillColor('black');
    }

    return yPosition + 40;
  }

  /**
   * Add invoice footer
   */
  addInvoiceFooter(doc, invoice) {
    const footerY = 720;

    // Notes
    if (invoice.notes) {
      doc.fontSize(10)
         .text('Notes:', 50, footerY)
         .text(invoice.notes, 50, footerY + 15, { width: 500 });
    }

    // Footer line
    doc.moveTo(50, footerY + 50)
       .lineTo(550, footerY + 50)
       .stroke();

    // Footer text
    doc.fontSize(8)
       .text('Thank you for your business!', 50, footerY + 60)
       .text(`Generated on ${new Date().toLocaleString()}`, 400, footerY + 60, { align: 'right' });
  }

  /**
   * Generate payment receipt PDF
   */
  async generatePaymentReceiptPDF(payment, invoice) {
    try {
      const fileName = `receipt_${payment.paymentNumber}.pdf`;
      const filePath = path.join(this.storagePath, fileName);

      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      
      // Pipe to file
      doc.pipe(fs.createWriteStream(filePath));

      // Add content
      this.addReceiptHeader(doc, payment, invoice);
      this.addReceiptDetails(doc, payment, invoice);
      this.addReceiptFooter(doc, payment);

      // Finalize PDF
      doc.end();

      // Wait for file to be written
      await new Promise((resolve, reject) => {
        doc.on('end', resolve);
        doc.on('error', reject);
      });

      logger.info('Payment receipt PDF generated', {
        paymentId: payment.paymentId,
        fileName,
        filePath
      });

      return filePath;
    } catch (error) {
      logger.error('Error generating receipt PDF:', error);
      throw new Error(`Failed to generate receipt PDF: ${error.message}`);
    }
  }

  /**
   * Add receipt header
   */
  addReceiptHeader(doc, payment, invoice) {
    // Clinic details
    doc.fontSize(20)
       .text(invoice.clinicDetails.name, 50, 50)
       .fontSize(12)
       .text(invoice.clinicDetails.address, 50, 80);

    // Receipt title
    doc.fontSize(24)
       .text('PAYMENT RECEIPT', 300, 50, { align: 'right' });

    // Receipt details
    doc.fontSize(12)
       .text(`Receipt #: ${payment.formattedPaymentNumber}`, 300, 80, { align: 'right' })
       .text(`Date: ${payment.createdAt.toLocaleDateString()}`, 300, 95, { align: 'right' })
       .text(`Invoice #: ${invoice.formattedInvoiceNumber}`, 300, 110, { align: 'right' });

    // Add line
    doc.moveTo(50, 140)
       .lineTo(550, 140)
       .stroke();
  }

  /**
   * Add receipt details
   */
  addReceiptDetails(doc, payment, invoice) {
    let yPosition = 160;

    // Patient details
    doc.fontSize(14)
       .text('Received From:', 50, yPosition)
       .fontSize(12)
       .text(invoice.patientDetails.name, 50, yPosition + 20);

    yPosition += 60;

    // Payment details
    doc.fontSize(12)
       .text('Payment Method:', 50, yPosition)
       .text(payment.paymentMethodDisplay, 200, yPosition)
       .text('Amount Paid:', 50, yPosition + 20)
       .text(`₹${payment.amount.toFixed(2)}`, 200, yPosition + 20)
       .text('Transaction ID:', 50, yPosition + 40)
       .text(payment.transactionId || 'N/A', 200, yPosition + 40);

    yPosition += 80;

    // Invoice summary
    doc.fontSize(14)
       .text('Invoice Summary:', 50, yPosition);

    yPosition += 25;

    doc.fontSize(12)
       .text('Invoice Total:', 50, yPosition)
       .text(`₹${invoice.totalAmount.toFixed(2)}`, 200, yPosition)
       .text('Total Paid:', 50, yPosition + 20)
       .text(`₹${invoice.paidAmount.toFixed(2)}`, 200, yPosition + 20)
       .text('Balance Due:', 50, yPosition + 40)
       .text(`₹${invoice.balanceAmount.toFixed(2)}`, 200, yPosition + 40);
  }

  /**
   * Add receipt footer
   */
  addReceiptFooter(doc, payment) {
    const footerY = 500;

    // Thank you message
    doc.fontSize(14)
       .text('Thank you for your payment!', 50, footerY, { align: 'center', width: 500 });

    // Footer line
    doc.moveTo(50, footerY + 40)
       .lineTo(550, footerY + 40)
       .stroke();

    // Footer text
    doc.fontSize(8)
       .text(`Generated on ${new Date().toLocaleString()}`, 50, footerY + 50, { align: 'center', width: 500 });
  }

  /**
   * Get PDF file
   */
  async getPDFFile(fileName) {
    try {
      const filePath = path.join(this.storagePath, fileName);
      
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          message: 'PDF file not found'
        };
      }

      return {
        success: true,
        data: {
          filePath,
          fileName,
          mimeType: 'application/pdf'
        }
      };
    } catch (error) {
      logger.error('Error getting PDF file:', error);
      throw new Error(`Failed to get PDF file: ${error.message}`);
    }
  }

  /**
   * Delete PDF file
   */
  async deletePDFFile(fileName) {
    try {
      const filePath = path.join(this.storagePath, fileName);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info('PDF file deleted', { fileName, filePath });
      }

      return {
        success: true,
        message: 'PDF file deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting PDF file:', error);
      throw new Error(`Failed to delete PDF file: ${error.message}`);
    }
  }
}

module.exports = PDFService;