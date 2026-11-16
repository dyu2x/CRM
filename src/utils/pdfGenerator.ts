import { jsPDF } from 'jspdf';

export function generateInstallationProcedurePdf(): Blob {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 45;

  // Header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 60, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('MESINA FARMS CRM', 40, 36);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Ubuntu Docker Deployment & PostgreSQL Operations Manual', 40, 50);

  y = 85;

  const addHeading = (title: string) => {
    if (y > 740) {
      doc.addPage();
      y = 40;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 40, y);
    y += 6;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(40, y, pageWidth - 40, y);
    y += 16;
  };

  const addParagraph = (text: string) => {
    if (y > 740) {
      doc.addPage();
      y = 40;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    const splitText = doc.splitTextToSize(text, pageWidth - 80);
    doc.text(splitText, 40, y);
    y += splitText.length * 13 + 6;
  };

  const addCodeBlock = (codeLines: string[]) => {
    const textHeight = codeLines.length * 13 + 14;
    if (y + textHeight > 750) {
      doc.addPage();
      y = 40;
    }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.rect(40, y, pageWidth - 80, textHeight, 'FD');
    doc.setFont('courier', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);

    codeLines.forEach((line, index) => {
      doc.text(line, 48, y + 14 + index * 13);
    });
    y += textHeight + 12;
  };

  // Section 1
  addHeading('1. System Architecture & Prerequisites');
  addParagraph(
    'This guide details the complete deployment procedure for Mesina Farms CRM on Ubuntu 20.04, 22.04, or 24.04 LTS with Docker & Docker Compose. The environment includes an isolated PostgreSQL 16 database container with persistent data volumes and healthcheck probes, paired with the responsive Node.js full-stack CRM application.'
  );
  addParagraph('Minimum Server Requirements: 2 CPU Cores, 2GB RAM, 20GB SSD, Ubuntu LTS 64-bit with root or sudo permissions.');

  // Section 2
  addHeading('2. Docker & Compose Installation on Ubuntu');
  addParagraph('Execute the following standard commands to install the latest official Docker engine:');
  addCodeBlock([
    '# Update packages and install prerequisites',
    'sudo apt update && sudo apt install -y ca-certificates curl gnupg lsb-release',
    '',
    '# Install Docker GPG key and repository',
    'sudo mkdir -p /etc/apt/keyrings',
    'curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg',
    'echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null',
    '',
    '# Install Docker Engine and Docker Compose Plugin',
    'sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin',
    'sudo usermod -aG docker $USER'
  ]);

  // Section 3
  addHeading('3. Project Directory Setup & Configuration');
  addParagraph('Extract Mesina-Farms-CRM-Fresh-Install.zip onto your Ubuntu server (e.g., in /opt/mesina_crm), then enter the CRM project folder:');
  addCodeBlock([
    'sudo mkdir -p /opt/mesina_crm && cd /opt/mesina_crm',
    'unzip Mesina-Farms-CRM-Fresh-Install.zip',
    'cd CRM-AIO-main',
    'cp .env.example .env',
    'nano .env',
    'chmod 600 .env',
    '',
    '# Verify directory structure',
    'ls -la',
    '# Should display: docker-compose.yml, Dockerfile, .env.example, scripts/, src/, docs/'
  ]);

  // Section 4
  addHeading('4. Fresh Database Initialization');
  addParagraph('The database container automatically initializes a fresh database from scripts/postgresql_crm.sql on first startup. Set a unique POSTGRES_PASSWORD, JWT_SECRET and ADMIN_INITIAL_PASSWORD in .env before launch. ADMIN_INITIAL_PASSWORD must be at least 12 characters. To launch the stack:');
  addCodeBlock([
    '# Start services in background mode',
    'docker compose up -d --build',
    '',
    '# Inspect service status and health',
    'docker compose ps',
    '',
    '# Verify service health',
    'docker compose ps'
  ]);

  // Section 5
  addHeading('5. First Administrator Account & Security Hardening');
  addParagraph('On first startup, the server provisions the administrator account with username admin and the private ADMIN_INITIAL_PASSWORD value configured in .env. No shared default password or demo agent accounts are created. Keep .env private and change the password from My Profile after first sign-in if it was shared during setup.');
  addCodeBlock([
    'cp .env.example .env',
    'nano .env  # set POSTGRES_PASSWORD, JWT_SECRET and ADMIN_INITIAL_PASSWORD',
    'chmod 600 .env',
    '',
    'ADMIN_INITIAL_PASSWORD must contain at least 12 characters.'
  ]);

  // Section 6
  addHeading('6. Database Backup & Restore Procedures');
  addParagraph('Regular database backups can be taken via automated pg_dump or the Admin UI export button:');
  addCodeBlock([
    '# Take automated live database snapshot',
    'docker exec -t mesina_crm_postgres pg_dump -U crm_user mesina_crm > backup_$(date +%Y%m%d_%H%M%S).sql',
    '',
    '# Restore database from backup file',
    'cat backup_file.sql | docker exec -i mesina_crm_postgres psql -U crm_user -d mesina_crm'
  ]);

  // Section 7
  addHeading('7. Production Nginx & SSL (Optional)');
  addParagraph('To expose your CRM on standard HTTPS port 443 with Let\'s Encrypt SSL, configure Nginx to proxy port 3000:');
  addCodeBlock([
    'server {',
    '    server_name crm.mesinafarms.ph;',
    '    location / {',
    '        proxy_pass http://localhost:3000;',
    '        proxy_set_header Host $host;',
    '        proxy_set_header X-Real-IP $remote_addr;',
    '    }',
    '}'
  ]);

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Mesina Farms CRM - Ubuntu Deployment Guide | Page ${i} of ${totalPages}`, 40, 815);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 140, 815);
  }

  return doc.output('blob');
}
