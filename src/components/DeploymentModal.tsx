import React, { useState } from 'react';
import { X, Download, FileText, Server, Copy, Check, Terminal, Database, CheckCircle2 } from 'lucide-react';
import { createDeploymentZip } from '../utils/dockerPackage';
import { generateInstallationProcedurePdf } from '../utils/pdfGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zipBlob = await createDeploymentZip();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mesina_farms_crm_ubuntu_docker.zip';
      a.click();
      URL.revokeObjectURL(url);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to create zip bundle:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleDownloadPdf = () => {
    const pdfBlob = generateInstallationProcedurePdf();
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Mesina_Farms_CRM_Deployment_Guide.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCommand = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const terminalSteps = [
    {
      title: '1. Prepare Ubuntu Directory',
      cmd: 'sudo mkdir -p /opt/mesina_crm && cd /opt/mesina_crm',
    },
    {
      title: '2. Unzip Deployment Bundle',
      cmd: 'unzip mesina_farms_crm_ubuntu_docker.zip',
    },
    {
      title: '3. Build & Start Docker Stack',
      cmd: 'cd /opt/mesina_crm/crm-main && cp .env.example .env && nano .env && docker compose up -d --build',
    },
    {
      title: '4. Verify services and health',
      cmd: 'docker compose ps && curl http://localhost:3000/api/health',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-2xl border border-neutral-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-neutral-800 text-white rounded-md">
              <Server className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-white">
                Ubuntu Docker Deployment Bundle
              </h3>
              <p className="text-xs text-neutral-400">
                Complete V2.07 source, Docker Compose, PostgreSQL schema, secure environment template & install guide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-neutral-800">
          {/* Main Action Banner */}
          <div className="p-5 rounded-lg border border-neutral-200 bg-neutral-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-bold text-sm text-neutral-900">
                Official Production Release Bundle (.zip)
              </div>
              <p className="text-xs text-neutral-600 mt-1">
                Includes <code className="bg-neutral-200 px-1 py-0.5 rounded text-[11px]">docker-compose.yml</code>,{' '}
                <code className="bg-neutral-200 px-1 py-0.5 rounded text-[11px]">.env.example</code>,{' '}
                <code className="bg-neutral-200 px-1 py-0.5 rounded text-[11px]">scripts/postgresql_crm.sql</code>,{' '}
                all application source files, the fresh PostgreSQL schema, and the installation guide.
              </p>
            </div>
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-4 py-2.5 bg-black hover:bg-neutral-800 text-white text-xs font-semibold rounded-md shadow-xs transition shrink-0 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isZipping ? 'Generating Zip...' : 'Download Bundle (.zip)'}</span>
            </button>
          </div>

          {downloadSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Deployment bundle downloaded successfully! Check your downloads folder.</span>
            </div>
          )}

          {/* Individual file downloads */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2.5">
              Individual File Downloads
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleDownloadPdf}
                className="flex items-center gap-3 p-3 border border-neutral-200 rounded-md hover:border-black hover:bg-neutral-50 text-left transition"
              >
                <div className="p-2 bg-red-50 text-red-600 rounded">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-900">
                    Steps Procedure (PDF)
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Formatted installation manual with diagrams
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/scripts/postgresql_crm.sql';
                  link.download = 'postgresql_crm.sql';
                  link.click();
                }}
                className="flex items-center gap-3 p-3 border border-neutral-200 rounded-md hover:border-black hover:bg-neutral-50 text-left transition"
              >
                <div className="p-2 bg-blue-50 text-blue-600 rounded">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-900">
                    PostgreSQL Script (.sql)
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Full DDL schema, relationships, & seeds
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Ubuntu Terminal Setup */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <Terminal className="w-4 h-4 text-neutral-700" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Quick Setup Commands (Ubuntu Server)
              </h4>
            </div>

            <div className="space-y-2.5">
              {terminalSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-900 rounded p-2.5 text-xs font-mono text-neutral-200 flex items-center justify-between gap-3"
                >
                  <div className="overflow-x-auto">
                    <span className="text-neutral-500 select-none mr-2"># {step.title}</span>
                    <br />
                    <span className="text-emerald-400 select-none mr-2">$</span>
                    <span>{step.cmd}</span>
                  </div>
                  <button
                    onClick={() => copyCommand(step.cmd, idx)}
                    className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition shrink-0"
                    title="Copy command"
                  >
                    {copiedIndex === idx ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Credentials Info */}
          <div className="text-xs text-neutral-600 bg-neutral-100 p-3 rounded border border-neutral-200 space-y-1">
            <div className="font-semibold text-neutral-900">First administrator sign-in</div>
            <div>Username: <code className="bg-white px-1.5 py-0.5 rounded font-mono text-neutral-800">admin</code></div>
            <div>Password: the unique <code className="bg-white px-1.5 py-0.5 rounded font-mono text-neutral-800">ADMIN_INITIAL_PASSWORD</code> value you set in your private <code>.env</code> file.</div>
            <div className="text-[11px] text-neutral-500">No default or demo passwords are included in the release. The initial password is only used when provisioning a new database.</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 text-neutral-700 text-xs font-medium rounded hover:bg-neutral-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
