import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'premise' | 'step' | 'conclusion';
  validity: 'valid' | 'invalid' | 'circular' | 'missing';
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

interface ProofGraphProps {
  nodes: Node[];
  links: Link[];
}

export default function ProofGraph({ nodes, links }: ProofGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clone data to avoid mutating props
    const simulationNodes = nodes.map(d => ({ ...d }));
    const simulationLinks = links.map(d => ({ ...d }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // Define arrow markers
    const defs = svg.append("defs");
    
    defs.append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25) // Position at end of line, accounting for node radius
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#94a3b8");

    const simulation = d3.forceSimulation(simulationNodes)
      .force("link", d3.forceLink(simulationLinks).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(40));

    const link = svg.append("g")
      .selectAll("line")
      .data(simulationLinks)
      .enter().append("line")
      .attr("stroke", d => {
        // If target is missing, make link dashed
        const targetNode = d.target as Node;
        return targetNode.validity === 'missing' ? '#94a3b8' : '#475569';
      })
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", d => {
        const targetNode = d.target as Node;
        return targetNode.validity === 'missing' ? "4 2" : "0";
      })
      .attr("marker-end", "url(#arrowhead)");

    const node = svg.append("g")
      .selectAll("g")
      .data(simulationNodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, any>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Node circles
    node.append("circle")
      .attr("r", 20)
      .attr("fill", d => {
        if (d.validity === 'circular') return '#ef4444'; // red-500
        if (d.validity === 'invalid') return '#f59e0b'; // amber-500
        if (d.validity === 'missing') return 'transparent';
        switch (d.type) {
          case 'premise': return '#3b82f6'; // blue-500
          case 'conclusion': return '#10b981'; // emerald-500
          default: return '#8b5cf6'; // violet-500
        }
      })
      .attr("stroke", d => {
        if (d.validity === 'circular') return '#ef4444';
        if (d.validity === 'invalid') return '#f59e0b';
        if (d.validity === 'missing') return '#94a3b8'; // slate-400
        return '#1e293b'; // slate-800
      })
      .attr("stroke-width", d => d.validity === 'missing' ? 2 : 2)
      .attr("stroke-dasharray", d => d.validity === 'missing' ? "4 2" : "0");

    // Node labels (ID)
    node.append("text")
      .text(d => d.id)
      .attr("x", 0)
      .attr("y", 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", d => d.validity === 'missing' ? '#94a3b8' : "white")
      .attr("font-family", "monospace")
      .attr("pointer-events", "none");

    // Tooltip logic (simple title for now)
    node.append("title")
      .text(d => `${d.type.toUpperCase()}: ${d.label} ${d.validity !== 'valid' ? `(${d.validity.toUpperCase()})` : ''}`);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      node
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links]);

  return (
    <div className="w-full h-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative group">
      <svg ref={svgRef} className="w-full h-full" />
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-blue-500"></div> Premise</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-violet-500"></div> Step</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Conclusion</div>
        <div className="flex items-center gap-2 mb-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Error/Circular</div>
        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full border border-slate-400 border-dashed"></div> Missing</div>
      </div>
    </div>
  );
}
