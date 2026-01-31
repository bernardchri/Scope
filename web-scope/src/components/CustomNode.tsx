import { Handle, Position } from "reactflow";

export default function CustomNode({ data }) {
  return (
    <div className="px-4 py-2 bg-white rounded" >
      {/* Handle gauche = input */}
      <Handle type="target" position={Position.Left} />

      <div className="text-sm">{data.label}</div>

      {/* Handle droite = output */}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}