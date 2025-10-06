import type jsPDF from 'jspdf';

export function addIndentedParagraph(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  indent: number
): number {
  const pageHeight = pdf.internal.pageSize.getHeight();
  const indentString = '　'.repeat(Math.max(0, indent));
  const indentWidth = pdf.getTextWidth(indentString);
  const lines = pdf.splitTextToSize(text, maxWidth - indentWidth) as string[];
  lines.forEach((line: string, index) => {
    if (y + lineHeight > pageHeight - 20) {
      pdf.addPage();
      y = 20;
    }
    const isFirstLine = index === 0;
    const textX = isFirstLine ? x + indentWidth : x;
    pdf.text(line, textX, y, {
      align: 'justify',
      maxWidth: maxWidth - (isFirstLine ? indentWidth : 0),
    });
    y += lineHeight;
  });
  return y;
}
