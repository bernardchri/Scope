import { useState, useEffect, useCallback } from "react";
import { addEdge, applyEdgeChanges, applyNodeChanges, Background, Controls, ReactFlow, ReactFlowProvider, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'n2', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];

const initialEdges = [{ id: 'n1-n2', source: 'n1', target: 'n2' }];



export default function FlowEditor() {

  
    const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
 
  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  // Ajouter un node
  const addNode = () => {
    setNodes((nds : any) => [
      ...nds,
      {
        id: (nds.length + 1).toString(),
        data: {
          label: "Nouveau Node",
   
        },
        position: { x: Math.random() * 10, y: Math.random() * 10 }
      }
    ]);
  };


  return (
    <div className="flex w-full h-screen">
      <ReactFlowProvider>
         <div style={{ width: '100vw', height: '100vh' }}>
        <ReactFlow
        draggable={true}
        nodes={nodes}
       onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        minZoom={0.2}
        >
               <Controls />
          <Background />
        </ReactFlow>
        </div>
      </ReactFlowProvider>
     
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 50,
            display: "flex",
            gap: "0.5rem",
            zIndex: 10,
          }}
        >
          <button onClick={addNode} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Ajouter Node
          </button>
        </div>
      </div> 

  );
}