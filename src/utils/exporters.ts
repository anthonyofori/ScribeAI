import { TranscriptRecord, TranscriptSegment } from '../types';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { jsPDF } from 'jspdf';

// Helper to convert MM:SS or HH:MM:SS string to milliseconds
function timecodeToMs(tc: string): number {
  if (!tc) return 0;
  const parts = tc.split(':').map(Number);
  if (parts.length === 2) {
    // MM:SS
    const [m, s] = parts;
    return (m * 60 + s) * 1000;
  }
  if (parts.length === 3) {
    // HH:MM:SS
    const [h, m, s] = parts;
    return (h * 3600 + m * 60 + s) * 1000;
  }
  return 0;
}

// Format milliseconds into SRT format: HH:MM:SS,mmm
function formatSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

// Format milliseconds into VTT format: HH:MM:SS.mmm
function formatVttTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -----------------------------------------------------------
// 1. TXT Export
// -----------------------------------------------------------
export function exportToTxt(record: TranscriptRecord) {
  const lines: string[] = [];
  lines.push(`========================================================`);
  lines.push(`Transcripta AI Transcript: ${record.title}`);
  lines.push(`Date: ${new Date(record.createdAt).toLocaleDateString()}`);
  lines.push(`Duration: ${record.duration} | Language: ${record.language}`);
  lines.push(`========================================================\n`);

  lines.push(`--- TRANSCRIPT ---`);
  record.segments.forEach((seg) => {
    lines.push(`[${seg.start} - ${seg.end}] ${seg.speaker ? `${seg.speaker}: ` : ''}${seg.text}`);
  });

  if (record.notes && record.notes.trim()) {
    lines.push(`\n\n--- SUMMARY / NOTES ---`);
    lines.push(record.notes);
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const filename = `${record.title.replace(/[^a-z0-9_-]/gi, '_')}.txt`;
  triggerDownload(blob, filename);
}

// -----------------------------------------------------------
// 2. SRT Export (SubRip)
// -----------------------------------------------------------
export function exportToSrt(record: TranscriptRecord) {
  const lines: string[] = [];
  let currentStartMs = 0;

  record.segments.forEach((seg, index) => {
    let startMs = timecodeToMs(seg.start);
    let endMs = timecodeToMs(seg.end);

    // If end time is not provided or <= start, default to 3-5 seconds after start
    if (endMs <= startMs) {
      endMs = startMs + 3500;
    }
    // Prevent overlapping if previous ended later
    if (startMs < currentStartMs) {
      startMs = currentStartMs;
      endMs = Math.max(endMs, startMs + 2000);
    }
    currentStartMs = endMs;

    lines.push(String(index + 1));
    lines.push(`${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}`);
    lines.push(`${seg.speaker ? `${seg.speaker}: ` : ''}${seg.text}`);
    lines.push(''); // Blank separator line
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const filename = `${record.title.replace(/[^a-z0-9_-]/gi, '_')}.srt`;
  triggerDownload(blob, filename);
}

// -----------------------------------------------------------
// 3. VTT Export (WebVTT)
// -----------------------------------------------------------
export function exportToVtt(record: TranscriptRecord) {
  const lines: string[] = [];
  lines.push('WEBVTT');
  lines.push(`NOTE Title: ${record.title}`);
  lines.push('');

  let currentStartMs = 0;
  record.segments.forEach((seg) => {
    let startMs = timecodeToMs(seg.start);
    let endMs = timecodeToMs(seg.end);

    if (endMs <= startMs) {
      endMs = startMs + 3500;
    }
    if (startMs < currentStartMs) {
      startMs = currentStartMs;
      endMs = Math.max(endMs, startMs + 2000);
    }
    currentStartMs = endMs;

    lines.push(`${formatVttTime(startMs)} --> ${formatVttTime(endMs)}`);
    if (seg.speaker) {
      lines.push(`<v ${seg.speaker}>${seg.text}</v>`);
    } else {
      lines.push(seg.text);
    }
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/vtt;charset=utf-8' });
  const filename = `${record.title.replace(/[^a-z0-9_-]/gi, '_')}.vtt`;
  triggerDownload(blob, filename);
}

// -----------------------------------------------------------
// 4. DOCX Export
// -----------------------------------------------------------
export async function exportToDocx(record: TranscriptRecord) {
  const paragraphs: Paragraph[] = [];

  // Title
  paragraphs.push(
    new Paragraph({
      text: record.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  // Metadata line
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Date: ${new Date(record.createdAt).toLocaleDateString()} | Duration: ${record.duration} | Language: ${record.language}`,
          italics: true,
          color: '64748B',
          size: 20, // 10pt
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Section: Transcript
  paragraphs.push(
    new Paragraph({
      text: 'Transcript',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 200 },
    })
  );

  record.segments.forEach((seg) => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `[${seg.start}] `,
            bold: true,
            color: '0891B2', // Cyan-600
            size: 20,
          }),
          new TextRun({
            text: seg.speaker ? `${seg.speaker}: ` : '',
            bold: true,
            color: '1E293B',
            size: 22,
          }),
          new TextRun({
            text: seg.text,
            size: 22,
          }),
        ],
        spacing: { after: 140 },
      })
    );
  });

  // Section: Notes if present
  if (record.notes && record.notes.trim()) {
    paragraphs.push(
      new Paragraph({
        text: 'Summary & Notes',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 500, after: 200 },
      })
    );

    const noteLines = record.notes.split('\n');
    noteLines.forEach((nline) => {
      const cleanLine = nline.trim();
      if (!cleanLine) {
        paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      } else if (cleanLine.startsWith('### ')) {
        paragraphs.push(
          new Paragraph({
            text: cleanLine.replace('### ', ''),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (cleanLine.startsWith('- ') || cleanLine.startsWith('* ')) {
        paragraphs.push(
          new Paragraph({
            text: cleanLine.replace(/^[-*]\s+/, ''),
            bullet: { level: 0 },
            spacing: { after: 80 },
          })
        );
      } else {
        paragraphs.push(
          new Paragraph({
            text: cleanLine,
            spacing: { after: 120 },
          })
        );
      }
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const filename = `${record.title.replace(/[^a-z0-9_-]/gi, '_')}.docx`;
  triggerDownload(blob, filename);
}

// -----------------------------------------------------------
// 5. PDF Export
// -----------------------------------------------------------
export function exportToPdf(record: TranscriptRecord) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  }

  // Header Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(15, 23, 42); // slate-900
  const titleLines = pdf.splitTextToSize(record.title, contentWidth);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 22;

  // Metadata
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 116, 139); // slate-500
  const metaText = `Generated by Transcripta AI  |  Date: ${new Date(record.createdAt).toLocaleDateString()}  |  Duration: ${record.duration}  |  Language: ${record.language}`;
  pdf.text(metaText, margin, y);
  y += 20;

  // Hairline divider
  pdf.setDrawColor(226, 232, 240); // slate-200
  pdf.setLineWidth(1);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 20;

  // Section Header: Transcript
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(6, 182, 212); // cyan-500
  pdf.text('TRANSCRIPT', margin, y);
  y += 18;

  // Segments
  record.segments.forEach((seg) => {
    checkPageBreak(36);

    // Timestamp & speaker header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(8, 145, 178); // cyan-600
    const timeTag = `[${seg.start} - ${seg.end}]`;
    pdf.text(timeTag, margin, y);

    const timeTagWidth = pdf.getTextWidth(timeTag) + 8;
    if (seg.speaker) {
      pdf.setTextColor(30, 41, 59); // slate-800
      pdf.text(seg.speaker, margin + timeTagWidth, y);
    }
    y += 13;

    // Segment text
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(51, 65, 85); // slate-700
    const textLines = pdf.splitTextToSize(seg.text, contentWidth);

    checkPageBreak(textLines.length * 13 + 8);
    pdf.text(textLines, margin, y);
    y += textLines.length * 13 + 10;
  });

  // Notes Section if exists
  if (record.notes && record.notes.trim()) {
    checkPageBreak(60);
    y += 15;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(6, 182, 212);
    pdf.text('SUMMARY & NOTES', margin, y);
    y += 18;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(51, 65, 85);
    const cleanNotes = record.notes.replace(/###\s*/g, '').replace(/[*_]/g, '');
    const noteLines = pdf.splitTextToSize(cleanNotes, contentWidth);

    for (let i = 0; i < noteLines.length; i++) {
      checkPageBreak(14);
      pdf.text(noteLines[i], margin, y);
      y += 14;
    }
  }

  const filename = `${record.title.replace(/[^a-z0-9_-]/gi, '_')}.pdf`;
  pdf.save(filename);
}
