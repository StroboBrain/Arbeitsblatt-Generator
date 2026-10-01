/**
 * Browser PDF adapter. The preview already contains the final page plan.
 * css/print.css removes the app shell and enforces each planned A4 page break.
 * The browser's print dialog provides destination, PDF filename, and download.
 */
export class PdfExporter {
  constructor(browserWindow = window, pageDocument = document) {
    this.window = browserWindow;
    this.document = pageDocument;
    this.busy = false;
  }

  async export(worksheet) {
    if (this.busy || !worksheet?.sections.length) return;
    this.busy = true;
    const previousTitle = this.document.title;
    const restore = () => { this.document.title = previousTitle; };
    try {
      await this.document.fonts.ready;
      this.document.title = worksheet.title;
      this.window.addEventListener("afterprint", restore, { once: true });
      this.window.print();
    } finally {
      restore();
      this.window.removeEventListener("afterprint", restore);
      this.busy = false;
    }
  }
}
