import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle2, Building2, Phone, Mail, Receipt as ReceiptIcon } from 'lucide-react';
import { ReceiptData, numberToWordsRupees } from '../utils/receiptUtils';
import { formatCurrency, formatUTCDate } from '../utils/formatting';

interface ReceiptModalProps {
    receipt: ReceiptData | null;
    onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ receipt, onClose }) => {
    const printRef = useRef<HTMLDivElement>(null);

    if (!receipt) return null;

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank', 'width=800,height=900');
        if (!printWindow) {
            window.print();
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Receipt_${receipt.receiptNo}</title>
                    <style>
                        @page {
                            size: A4;
                            margin: 15mm;
                        }
                        body {
                            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            color: #0f172a;
                            margin: 0;
                            padding: 20px;
                            background: #ffffff;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        .receipt-card {
                            max-width: 700px;
                            margin: 0 auto;
                            border: 2px solid #e2e8f0;
                            border-radius: 12px;
                            padding: 32px;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            text-align: center;
                            border-bottom: 2px border #cbd5e1;
                            padding-bottom: 20px;
                            margin-bottom: 24px;
                        }
                        .org-title {
                            font-size: 24px;
                            font-weight: 800;
                            color: #1e3a8a;
                            letter-spacing: 0.5px;
                            margin: 0;
                            text-transform: uppercase;
                        }
                        .subtitle {
                            font-size: 13px;
                            color: #64748b;
                            margin-top: 4px;
                            font-weight: 500;
                        }
                        .meta-bar {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            background-color: #f8fafc;
                            border: 1px solid #e2e8f0;
                            padding: 12px 20px;
                            border-radius: 8px;
                            margin-bottom: 24px;
                        }
                        .receipt-no {
                            font-size: 16px;
                            font-weight: 700;
                            color: #0f172a;
                            font-family: monospace;
                        }
                        .badge {
                            display: inline-block;
                            padding: 4px 12px;
                            border-radius: 9999px;
                            font-size: 12px;
                            font-weight: 700;
                            background-color: #dcfce7;
                            color: #166534;
                            border: 1px solid #bbf7d0;
                        }
                        .grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 20px;
                            margin-bottom: 24px;
                        }
                        .section-box {
                            background: #ffffff;
                            border: 1px solid #f1f5f9;
                            padding: 14px;
                            border-radius: 8px;
                        }
                        .label {
                            font-size: 11px;
                            font-weight: 700;
                            text-transform: uppercase;
                            color: #64748b;
                            margin-bottom: 4px;
                            letter-spacing: 0.5px;
                        }
                        .value {
                            font-size: 15px;
                            font-weight: 600;
                            color: #0f172a;
                        }
                        .sub-value {
                            font-size: 13px;
                            color: #475569;
                            margin-top: 2px;
                        }
                        .amount-box {
                            background: #eff6ff;
                            border: 1px solid #bfdbfe;
                            padding: 20px;
                            border-radius: 12px;
                            text-align: center;
                            margin-bottom: 24px;
                        }
                        .amount-num {
                            font-size: 32px;
                            font-weight: 900;
                            color: #1e40af;
                        }
                        .amount-words {
                            font-size: 13px;
                            font-weight: 600;
                            color: #1e3a8a;
                            margin-top: 6px;
                            font-style: italic;
                        }
                        .details-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 24px;
                        }
                        .details-table th {
                            background: #f8fafc;
                            text-align: left;
                            padding: 10px 14px;
                            font-size: 12px;
                            font-weight: 700;
                            color: #475569;
                            border-bottom: 1px solid #e2e8f0;
                        }
                        .details-table td {
                            padding: 10px 14px;
                            font-size: 13px;
                            color: #0f172a;
                            border-bottom: 1px solid #f1f5f9;
                        }
                        .footer {
                            border-top: 1px dashed #cbd5e1;
                            padding-top: 16px;
                            text-align: center;
                            font-size: 11px;
                            color: #94a3b8;
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt-card">
                        <div class="header">
                            <h1 class="org-title">Gold Towers Mitra Mandal Trust</h1>
                            <div class="subtitle">Official Payment Receipt & Confirmation</div>
                        </div>

                        <div class="meta-bar">
                            <div>
                                <div class="label">Receipt Number</div>
                                <div class="receipt-no">${receipt.receiptNo}</div>
                            </div>
                            <div style="text-align: right;">
                                <div class="label">Date</div>
                                <div class="value" style="font-size: 13px;">${formatUTCDate(receipt.date)}</div>
                            </div>
                            <div>
                                <span class="badge">✓ ${receipt.status}</span>
                            </div>
                        </div>

                        <div class="amount-box">
                            <div class="label" style="color: #1e40af;">Total Amount Received</div>
                            <div class="amount-num">${formatCurrency(receipt.amount)}</div>
                            <div class="amount-words">${numberToWordsRupees(receipt.amount)}</div>
                        </div>

                        <div class="grid">
                            <div class="section-box">
                                <div class="label">Received From</div>
                                <div class="value">${receipt.payerName}</div>
                                ${(receipt.towerNumber || receipt.flatNumber) ? `<div class="sub-value">Tower ${receipt.towerNumber || 'N/A'}, Flat ${receipt.flatNumber || 'N/A'}</div>` : ''}
                                ${receipt.payerPhone ? `<div class="sub-value">Phone: ${receipt.payerPhone}</div>` : ''}
                                ${receipt.payerEmail ? `<div class="sub-value">Email: ${receipt.payerEmail}</div>` : ''}
                            </div>

                            <div class="section-box">
                                <div class="label">Payment Purpose & Category</div>
                                <div class="value">${receipt.title}</div>
                                ${receipt.festivalOrCampaign ? `<div class="sub-value">Campaign / Festival: <strong>${receipt.festivalOrCampaign}</strong></div>` : ''}
                                ${receipt.paymentMode ? `<div class="sub-value">Payment Mode: <strong>${receipt.paymentMode}</strong></div>` : ''}
                            </div>
                        </div>

                        ${receipt.details && receipt.details.length > 0 ? `
                            <table class="details-table">
                                <thead>
                                    <tr>
                                        <th>Particular / Description</th>
                                        <th style="text-align: right;">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${receipt.details.map(d => `
                                        <tr>
                                            <td><strong>${d.label}</strong></td>
                                            <td style="text-align: right;">${d.value}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : ''}

                        <div class="footer">
                            <p>Thank you for your valuable support and contribution!</p>
                            <p>This is a computer-generated official receipt. Generated on ${new Date().toLocaleString()}</p>
                        </div>
                    </div>
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative my-8 animate-in fade-in zoom-in duration-150">
                
                {/* Modal Action Header */}
                <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-600/30 rounded-lg border border-blue-400/30 text-blue-300">
                            <ReceiptIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-base tracking-tight text-white">Official Receipt</h3>
                            <p className="text-xs text-slate-400 font-mono">{receipt.receiptNo}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                            title="Print or Save as PDF"
                        >
                            <Printer className="w-4 h-4" /> Print / Download PDF
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Printable Receipt Card Body */}
                <div className="p-6 md:p-8 bg-slate-50/50" ref={printRef}>
                    <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
                        
                        {/* Header Branding */}
                        <div className="text-center pb-4 border-b border-slate-200">
                            <h2 className="text-2xl font-black text-blue-900 uppercase tracking-wide">Gold Towers Mitra Mandal Trust</h2>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Official Payment Receipt & Confirmation</p>
                        </div>

                        {/* Top Meta Bar */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap justify-between items-center gap-4">
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Receipt Number</span>
                                <span className="text-base font-bold font-mono text-slate-900">{receipt.receiptNo}</span>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Date</span>
                                <span className="text-sm font-semibold text-slate-800">{formatUTCDate(receipt.date)}</span>
                            </div>
                            <div>
                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> {receipt.status}
                                </span>
                            </div>
                        </div>

                        {/* Total Amount Box */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 text-center shadow-inner">
                            <span className="text-xs font-bold uppercase tracking-widest text-blue-700 block mb-1">Total Amount Received</span>
                            <div className="text-3xl md:text-4xl font-black text-blue-900">{formatCurrency(receipt.amount)}</div>
                            <div className="text-xs font-medium text-blue-800 italic mt-2 bg-white/60 px-3 py-1 rounded-lg inline-block border border-blue-100">
                                {numberToWordsRupees(receipt.amount)}
                            </div>
                        </div>

                        {/* Grid Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Received From</span>
                                <p className="font-bold text-slate-900 text-base">{receipt.payerName}</p>
                                
                                {(receipt.towerNumber || receipt.flatNumber) && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>Tower {receipt.towerNumber || 'N/A'}, Flat {receipt.flatNumber || 'N/A'}</span>
                                    </div>
                                )}
                                {receipt.payerPhone && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>{receipt.payerPhone}</span>
                                    </div>
                                )}
                                {receipt.payerEmail && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span>{receipt.payerEmail}</span>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Payment Details</span>
                                <p className="font-semibold text-slate-800 text-sm">{receipt.title}</p>
                                
                                {receipt.festivalOrCampaign && (
                                    <p className="text-xs text-slate-600">
                                        Campaign / Festival: <strong className="text-slate-800">{receipt.festivalOrCampaign}</strong>
                                    </p>
                                )}
                                {receipt.paymentMode && (
                                    <p className="text-xs text-slate-600">
                                        Payment Mode: <strong className="text-slate-800">{receipt.paymentMode}</strong>
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Extra Details Breakdown Table */}
                        {receipt.details && receipt.details.length > 0 && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase">
                                        <tr>
                                            <th className="px-4 py-2.5">Description</th>
                                            <th className="px-4 py-2.5 text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                        {receipt.details.map((d, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2.5 font-semibold text-slate-700">{d.label}</td>
                                                <td className="px-4 py-2.5 text-right font-medium text-slate-900">{d.value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Footer Disclaimer */}
                        <div className="text-center pt-4 border-t border-dashed border-slate-200 text-xs text-slate-400 space-y-1">
                            <p className="font-medium text-slate-600">Thank you for your generous contribution and support!</p>
                            <p>This is an automated official system receipt. No signature is required.</p>
                        </div>
                    </div>
                </div>

                {/* Bottom Footer Actions */}
                <div className="bg-slate-100 px-6 py-4 flex justify-between items-center border-t border-slate-200">
                    <span className="text-xs text-slate-500 font-medium">Official Document • Verification Status: Valid</span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all"
                        >
                            <Printer className="w-4 h-4" /> Print / Download PDF
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
