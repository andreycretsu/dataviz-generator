// Sankey Diagram Generator
class SankeyDiagramGenerator {
    constructor() {
        this.data = this.getDefaultData();
        this.config = {
            width: 1200,
            height: 800,
            nodeWidth: 15,
            nodePadding: 20,
            nodeSpacing: 40,
            backgroundColor: '#ffffff',
            renderMode: 'svg'
        };

        this.nodeColors = {};
        this.colorPalette = [
            '#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3',
            '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd',
            '#ccebc5', '#ffed6f', '#a6cee3', '#1f78b4', '#b2df8a'
        ];
        this.colorIndex = 0;

        this.init();
    }

    getDefaultData() {
        return [
            { from: 'New', to: 'Sourcing', amount: 70, amountComparison: '' },
            { from: 'Sourcing', to: 'Screening', amount: 40, amountComparison: 45 },
            { from: 'Sourcing', to: 'Rejected', amount: 15, amountComparison: 15 },
            { from: 'Screening', to: 'Interviewing', amount: 25, amountComparison: 30 },
            { from: 'Screening', to: 'Shortlisted (SKIP)', amount: 8, amountComparison: 5 },
            { from: 'Screening', to: 'Rejected', amount: 7, amountComparison: 10 },
            { from: 'Interviewing', to: 'Shortlisted', amount: 20, amountComparison: 22 },
            { from: 'Interviewing', to: 'Offer Extended (SKIP)', amount: 4, amountComparison: 2 },
            { from: 'Interviewing', to: 'Interviewing (SKIP)', amount: 1, amountComparison: 6 },
            { from: 'Shortlisted', to: 'Offer Extended', amount: 18, amountComparison: 15 },
            { from: 'Offer Extended', to: 'Hired', amount: 5, amountComparison: 4 },
            { from: 'Offer Extended', to: 'Withdrew', amount: 13, amountComparison: 11 },
            { from: 'Interviewing (SKIP)', to: 'Hired (SKIP)', amount: 1, amountComparison: 1 }
        ];
    }

    init() {
        this.setupEventListeners();
        this.renderDataTable();
        this.renderDiagram();
        this.updateBalanceTable();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                const tab = e.target.dataset.tab;
                const layoutPanel = document.getElementById('layout-panel');
                layoutPanel.style.display = tab === 'layout' ? 'block' : 'none';
            });
        });

        // Layout controls
        document.getElementById('canvas-width').addEventListener('change', (e) => {
            this.config.width = parseInt(e.target.value);
            this.renderDiagram();
        });

        document.getElementById('canvas-height').addEventListener('change', (e) => {
            this.config.height = parseInt(e.target.value);
            this.renderDiagram();
        });

        document.getElementById('size-preset').addEventListener('change', (e) => {
            if (e.target.value !== 'custom') {
                const [width, height] = e.target.value.split('x').map(Number);
                this.config.width = width;
                this.config.height = height;
                document.getElementById('canvas-width').value = width;
                document.getElementById('canvas-height').value = height;
                this.renderDiagram();
            }
        });

        document.getElementById('render-mode').addEventListener('change', (e) => {
            this.config.renderMode = e.target.value;
            this.renderDiagram();
        });

        document.getElementById('node-width').addEventListener('input', (e) => {
            this.config.nodeWidth = parseInt(e.target.value);
            document.getElementById('node-width-value').textContent = e.target.value;
            this.renderDiagram();
        });

        document.getElementById('node-height').addEventListener('input', (e) => {
            this.config.nodePadding = parseInt(e.target.value);
            document.getElementById('node-height-value').textContent = e.target.value;
            this.renderDiagram();
        });

        document.getElementById('node-spacing').addEventListener('input', (e) => {
            this.config.nodeSpacing = parseInt(e.target.value);
            document.getElementById('node-spacing-value').textContent = e.target.value;
            this.renderDiagram();
        });

        document.getElementById('bg-color').addEventListener('change', (e) => {
            this.config.backgroundColor = e.target.value;
            document.querySelector('.diagram-container').style.backgroundColor = e.target.value;
        });

        // Data table controls
        document.getElementById('add-row-btn').addEventListener('click', () => {
            const count = parseInt(document.getElementById('rows-to-add').value) || 1;
            for (let i = 0; i < count; i++) {
                this.data.push({ from: '', to: '', amount: 0, amountComparison: '' });
            }
            this.renderDataTable();
        });

        // Export buttons
        document.getElementById('export-svg-btn').addEventListener('click', () => this.exportSVG());
        document.getElementById('export-png-btn').addEventListener('click', () => this.exportPNG());
        document.getElementById('save-btn').addEventListener('click', () => this.saveData());
    }

    renderDataTable() {
        const tbody = document.getElementById('data-tbody');
        tbody.innerHTML = '';

        this.data.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" value="${row.from}" data-index="${index}" data-field="from"></td>
                <td><input type="text" value="${row.to}" data-index="${index}" data-field="to"></td>
                <td><input type="number" value="${row.amount}" data-index="${index}" data-field="amount" min="0"></td>
                <td><input type="number" value="${row.amountComparison || ''}" data-index="${index}" data-field="amountComparison" min="0"></td>
                <td><button class="delete-btn" data-index="${index}">×</button></td>
            `;
            tbody.appendChild(tr);
        });

        // Add event listeners to inputs
        tbody.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', (e) => {
                const index = parseInt(e.target.dataset.index);
                const field = e.target.dataset.field;
                let value = e.target.value;

                if (field === 'amount' || field === 'amountComparison') {
                    value = value ? parseFloat(value) : (field === 'amount' ? 0 : '');
                }

                this.data[index][field] = value;
                this.renderDiagram();
                this.updateBalanceTable();
            });
        });

        // Add event listeners to delete buttons
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.data.splice(index, 1);
                this.renderDataTable();
                this.renderDiagram();
                this.updateBalanceTable();
            });
        });
    }

    prepareGraphData() {
        const nodes = new Map();
        const links = [];

        // Filter out empty rows
        const validData = this.data.filter(d => d.from && d.to && d.amount > 0);

        validData.forEach(d => {
            if (!nodes.has(d.from)) {
                nodes.set(d.from, { name: d.from });
            }
            if (!nodes.has(d.to)) {
                nodes.set(d.to, { name: d.to });
            }

            links.push({
                source: d.from,
                target: d.to,
                value: d.amount
            });
        });

        return {
            nodes: Array.from(nodes.values()),
            links: links
        };
    }

    getNodeColor(nodeName) {
        if (!this.nodeColors[nodeName]) {
            this.nodeColors[nodeName] = this.colorPalette[this.colorIndex % this.colorPalette.length];
            this.colorIndex++;
        }
        return this.nodeColors[nodeName];
    }

    renderDiagram() {
        if (this.config.renderMode === 'svg') {
            this.renderSVG();
        } else {
            this.renderCanvas();
        }
    }

    renderSVG() {
        const container = document.getElementById('sankey-diagram');
        const canvas = document.getElementById('sankey-canvas');

        container.style.display = 'block';
        canvas.style.display = 'none';
        container.innerHTML = '';

        const graphData = this.prepareGraphData();
        if (graphData.nodes.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Add data to see the diagram</p>';
            return;
        }

        const margin = { top: 20, right: 150, bottom: 20, left: 150 };
        const width = this.config.width - margin.left - margin.right;
        const height = this.config.height - margin.top - margin.bottom;

        const svg = d3.select(container)
            .append('svg')
            .attr('width', this.config.width)
            .attr('height', this.config.height)
            .style('background', this.config.backgroundColor)
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.1)');

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Create sankey generator
        const sankey = d3.sankey()
            .nodeId(d => d.name)
            .nodeWidth(this.config.nodeWidth)
            .nodePadding(this.config.nodePadding)
            .nodeAlign(d3.sankeyLeft)
            .extent([[0, 0], [width, height]]);

        const { nodes, links } = sankey({
            nodes: graphData.nodes.map(d => Object.assign({}, d)),
            links: graphData.links.map(d => Object.assign({}, d))
        });

        // Draw links
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('path')
            .data(links)
            .enter()
            .append('path')
            .attr('d', d3.sankeyLinkHorizontal())
            .attr('stroke', d => {
                const sourceColor = this.getNodeColor(d.source.name);
                return d3.color(sourceColor).copy({ opacity: 0.4 });
            })
            .attr('stroke-width', d => Math.max(1, d.width))
            .attr('fill', 'none')
            .style('cursor', 'pointer')
            .on('mouseover', function() {
                d3.select(this).attr('stroke-opacity', 0.7);
            })
            .on('mouseout', function() {
                d3.select(this).attr('stroke-opacity', 0.4);
            });

        link.append('title')
            .text(d => `${d.source.name} → ${d.target.name}\n${d.value}`);

        // Draw nodes
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(nodes)
            .enter()
            .append('g')
            .attr('class', 'node');

        node.append('rect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('height', d => d.y1 - d.y0)
            .attr('width', d => d.x1 - d.x0)
            .attr('fill', d => this.getNodeColor(d.name))
            .attr('stroke', '#000')
            .attr('stroke-width', 0.5)
            .style('cursor', 'pointer')
            .on('mouseover', function() {
                d3.select(this).attr('fill-opacity', 1);
            })
            .on('mouseout', function() {
                d3.select(this).attr('fill-opacity', 0.9);
            });

        // Add node labels
        node.append('text')
            .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr('y', d => (d.y1 + d.y0) / 2)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
            .text(d => d.name)
            .style('font-size', '12px')
            .style('font-weight', '500');

        // Add node values
        node.append('text')
            .attr('x', d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
            .attr('y', d => (d.y1 + d.y0) / 2 + 14)
            .attr('dy', '0.35em')
            .attr('text-anchor', d => d.x0 < width / 2 ? 'start' : 'end')
            .text(d => d.value)
            .style('font-size', '10px')
            .style('fill', '#666');
    }

    renderCanvas() {
        const container = document.getElementById('sankey-diagram');
        const canvas = document.getElementById('sankey-canvas');

        container.style.display = 'none';
        canvas.style.display = 'block';

        canvas.width = this.config.width;
        canvas.height = this.config.height;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Fill background
        ctx.fillStyle = this.config.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const graphData = this.prepareGraphData();
        if (graphData.nodes.length === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Add data to see the diagram', canvas.width / 2, canvas.height / 2);
            return;
        }

        const margin = { top: 20, right: 150, bottom: 20, left: 150 };
        const width = this.config.width - margin.left - margin.right;
        const height = this.config.height - margin.top - margin.bottom;

        // Create sankey generator
        const sankey = d3.sankey()
            .nodeId(d => d.name)
            .nodeWidth(this.config.nodeWidth)
            .nodePadding(this.config.nodePadding)
            .nodeAlign(d3.sankeyLeft)
            .extent([[0, 0], [width, height]]);

        const { nodes, links } = sankey({
            nodes: graphData.nodes.map(d => Object.assign({}, d)),
            links: graphData.links.map(d => Object.assign({}, d))
        });

        ctx.save();
        ctx.translate(margin.left, margin.top);

        // Draw links
        links.forEach(link => {
            const path = d3.sankeyLinkHorizontal()(link);
            const sourceColor = this.getNodeColor(link.source.name);

            ctx.strokeStyle = d3.color(sourceColor).copy({ opacity: 0.4 }).toString();
            ctx.lineWidth = Math.max(1, link.width);
            ctx.stroke(new Path2D(path));
        });

        // Draw nodes
        nodes.forEach(node => {
            ctx.fillStyle = this.getNodeColor(node.name);
            ctx.fillRect(node.x0, node.y0, node.x1 - node.x0, node.y1 - node.y0);

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(node.x0, node.y0, node.x1 - node.x0, node.y1 - node.y0);

            // Draw text
            ctx.fillStyle = '#000';
            ctx.font = '500 12px sans-serif';
            ctx.textAlign = node.x0 < width / 2 ? 'left' : 'right';
            const textX = node.x0 < width / 2 ? node.x1 + 6 : node.x0 - 6;
            const textY = (node.y1 + node.y0) / 2;
            ctx.fillText(node.name, textX, textY);

            // Draw value
            ctx.fillStyle = '#666';
            ctx.font = '10px sans-serif';
            ctx.fillText(node.value, textX, textY + 14);
        });

        ctx.restore();
    }

    updateBalanceTable() {
        const balances = new Map();

        // Calculate totals
        this.data.forEach(d => {
            if (d.from && d.to && d.amount > 0) {
                // Outflow
                if (!balances.has(d.from)) {
                    balances.set(d.from, { in: 0, out: 0 });
                }
                balances.get(d.from).out += d.amount;

                // Inflow
                if (!balances.has(d.to)) {
                    balances.set(d.to, { in: 0, out: 0 });
                }
                balances.get(d.to).in += d.amount;
            }
        });

        // Find unbalanced nodes
        const unbalanced = [];
        balances.forEach((value, key) => {
            const diff = value.in - value.out;
            if (Math.abs(diff) > 0.01 && value.in > 0 && value.out > 0) {
                unbalanced.push({ node: key, ...value, diff });
            }
        });

        // Update warning
        const warning = document.getElementById('balance-warning');
        if (unbalanced.length > 0) {
            warning.style.display = 'flex';
        } else {
            warning.style.display = 'none';
        }

        // Update table
        const tbody = document.getElementById('balance-tbody');
        tbody.innerHTML = '';

        unbalanced.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 500;">${item.node}</td>
                <td>${item.in.toFixed(0)}</td>
                <td>${item.out.toFixed(0)}</td>
                <td style="color: ${item.diff > 0 ? '#28a745' : '#dc3545'}; font-weight: 500;">
                    ${item.diff > 0 ? '+' : ''}${item.diff.toFixed(0)}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    exportSVG() {
        const svgElement = document.querySelector('#sankey-diagram svg');
        if (!svgElement) {
            alert('Please switch to SVG rendering mode to export SVG');
            return;
        }

        const serializer = new XMLSerializer();
        const svgString = serializer.serializeToString(svgElement);
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'sankey-diagram.svg';
        a.click();
        URL.revokeObjectURL(url);
    }

    exportPNG() {
        const svgElement = document.querySelector('#sankey-diagram svg');
        const canvasElement = document.getElementById('sankey-canvas');

        if (this.config.renderMode === 'canvas') {
            // Export canvas directly
            canvasElement.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'sankey-diagram.png';
                a.click();
                URL.revokeObjectURL(url);
            });
        } else if (svgElement) {
            // Convert SVG to PNG
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = this.config.width;
                canvas.height = this.config.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'sankey-diagram.png';
                    a.click();
                    URL.revokeObjectURL(url);
                });
            };

            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            img.src = url;
        }
    }

    saveData() {
        const dataStr = JSON.stringify({
            title: document.getElementById('diagram-title').value,
            data: this.data,
            config: this.config,
            notes: document.getElementById('data-notes').value
        }, null, 2);

        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'sankey-data.json';
        a.click();
        URL.revokeObjectURL(url);

        // Visual feedback
        const btn = document.getElementById('save-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Saved ✓';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.sankeyApp = new SankeyDiagramGenerator();
});
