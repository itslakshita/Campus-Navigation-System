import React, { useState } from 'react';
import { campusNavigatorJavaSource } from '../CampusNavigatorJavaCode';
import { Check, Copy, Download, Terminal } from 'lucide-react';

export const JavaCodeViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(campusNavigatorJavaSource);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([campusNavigatorJavaSource], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = 'CampusNavigator.java';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
        <div>
          <div className="font-bold text-slate-900 text-sm">
            CampusNavigator.java
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Single-file Java Swing application. No external libraries needed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Copy Code
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download .java
          </button>
        </div>
      </div>

      {/* Terminal Command box */}
      <div className="p-3 bg-slate-900 rounded-xl text-slate-200 font-mono text-xs border border-slate-800 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-400 font-semibold mb-1">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>How to run in terminal:</span>
        </div>
        <div className="text-emerald-400 select-all">$ javac CampusNavigator.java</div>
        <div className="text-emerald-400 select-all">$ java CampusNavigator</div>
      </div>

      {/* Code Text Area */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <pre className="p-4 text-xs font-mono text-slate-800 bg-slate-50/70 overflow-x-auto max-h-[500px] leading-relaxed">
          {campusNavigatorJavaSource}
        </pre>
      </div>
    </div>
  );
};
