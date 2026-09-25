import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Group = {
  region: string;
  odd: number[];
  even: number[];
  total: number;
};

type PdfDoc = InstanceType<typeof PDFDocument>;

const OUTPUT_DIR = path.join(__dirname, 'generated-pdfs');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

function drawCell(
  doc: PdfDoc,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  options: Record<string, unknown> = {}
): void {
  doc.rect(x, y, w, h).stroke();
  const defaultText = {
    align: 'center',
    width: w - 8,
    height: h
  };
  doc.text(String(text), x + 4, y + h / 2 - 7, {
    align: 'center',
    width: w - 8,
    height: h
  });
}

function buildGroup(region: string, middleCount: number): Group {
  const odd: number[] = [];
  const even: number[] = [];

  for (let i = 0; i < middleCount; i++) {
    odd.push(randInt(100, 9999));
    even.push(randFloat(100.1, 9999.99, 2));
  }

  const total = odd.reduce((sum: number, n: number) => sum + n, 0);

  return {
    region,
    odd,
    even,
    total
  };
}

function drawGroup(
  doc: PdfDoc,
  group: Group,
  x: number,
  y: number,
  leftWidth: number,
  middleWidth: number,
  rightWidth: number
): void {
  const rowHeight = 24;
  const groupHeight = rowHeight * 2;
  const middleCount = group.odd.length;

  doc.rect(x, y, leftWidth, groupHeight).stroke();
  doc.text(group.region, x + 4, y + groupHeight / 2 - 8, {
    width: leftWidth - 8,
    align: 'center'
  });

  for (let i = 0; i < middleCount; i++) {
    const offsetX = x + leftWidth + i * middleWidth;

    doc.rect(offsetX, y, middleWidth, rowHeight).stroke();
    doc.text(String(group.odd[i]), offsetX + 4, y + 6, {
      width: middleWidth - 8,
      align: 'center'
    });

    doc.rect(offsetX, y + rowHeight, middleWidth, rowHeight).stroke();
    doc.text(String(group.even[i]), offsetX + 4, y + rowHeight + 6, {
      width: middleWidth - 8,
      align: 'center'
    });
  }

  const totalX = x + leftWidth + middleCount * middleWidth;
  doc.rect(totalX, y, rightWidth, groupHeight).stroke();
  doc.text(String(group.total), totalX + 4, y + groupHeight / 2 - 8, {
    width: rightWidth - 8,
    align: 'center'
  });
}

function createPdf(fileIndex: number): string {
  const doc = new PDFDocument({ size: 'A4', margin: 36 });
  const filename = `test${String(fileIndex + 1).padStart(2, '0')}.pdf`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  doc.pipe(fs.createWriteStream(outputPath));

  doc.fontSize(18).text('Sales Report', { align: 'center' });
  doc.moveDown(1.2);

  const middleCount = randInt(1, 5);
  const groups: Group[] = Array.from({ length: randInt(6, 12) }, (_, idx) => {
    const region = `Region ${idx + 1}`;
    return buildGroup(region, middleCount);
  });

  const leftWidth = 90;
  const rightWidth = 80;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const middleWidth = (pageWidth - leftWidth - rightWidth) / middleCount;

  let y = 90;

  doc.rect(50, y, leftWidth, 26).stroke();
  doc.text('Region', 54, y + 7, { width: leftWidth - 8, align: 'center' });

  for (let i = 0; i < middleCount; i++) {
    const x = 50 + leftWidth + i * middleWidth;
    doc.rect(x, y, middleWidth, 26).stroke();
    doc.text(`M${i + 1}`, x + 4, y + 7, {
      width: middleWidth - 8,
      align: 'center'
    });
  }

  const lastX = 50 + leftWidth + middleCount * middleWidth;
  doc.rect(lastX, y, rightWidth, 26).stroke();
  doc.text('Total', lastX + 4, y + 7, {
    width: rightWidth - 8,
    align: 'center'
  });

  y += 30;

  for (const group of groups) {
    drawGroup(doc, group, 50, y, leftWidth, middleWidth, rightWidth);
    y += 52;
    if (y > 720) {
      doc.addPage();
      y = 60;
    }
  }

  doc.end();
  return outputPath;
}

(async (): Promise<void> => {
  for (let i = 0; i < 10; i++) {
    const file = createPdf(i);
    console.log(`Created: ${file}`);
  }
})();