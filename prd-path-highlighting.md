## **Cartographer Feature Extension PRD: Path Highlighting**

### **Phase IV: Flow Analysis and Visualization**

This phase introduces core analytical features to the Cartographer UI, allowing developers to trace execution paths instantly.  
---

### **1\. New Goals (Unchanged)**

| Metric | Goal | Rationale |
| :---- | :---- | :---- |
| **G11. Traceability** | Allow users to instantly visualize all upstream and downstream dependencies of a selected node. | Critical for impact analysis and understanding complex dependency injection flows. |
| **G12. Clarity** | Use highly distinct visual cues (colors) to separate the two types of call relationships. | Essential for quickly distinguishing between code that *depends on* a node vs. code that a node *depends on*. |

---

### **2\. New Core Features**

| Feature ID | Feature Name | Description |
| :---- | :---- | :---- |
| **F10** | **Upstream Path Highlighting** | Upon node selection in Highlight Mode, all nodes and edges that lead **to** the selected node (i.e., its callers) must be highlighted. |
| **F11** | **Downstream Path Highlighting** | Upon node selection in Highlight Mode, all nodes and edges that are called **by** the selected node (i.e., its callees) must be highlighted. |
| **F12** | **"Highlight Mode" Toggle** | Implement a persistent **toggleable button** in the main navigation bar that activates/deactivates the path analysis functionality. |

---

### **3\. Updated Technical Specifications**

#### **3.1. Frontend Logic (T14, T15)**

| Spec ID | Requirement | Detail |
| :---- | :---- | :---- |
| **T21** | **Data Indexing** | The frontend parser (T15) must create a secondary, inverted map of the graph (**Reverse Call Graph Index**) to quickly look up all immediate callers for every node. |
| **T22** | **Path Computation** | The path highlighting function must perform two distinct graph traversals when a node is clicked: A. A **Reverse Traversal** (Callers). B. A **Forward Traversal** (Callees). |
| **T23** | **Traversal Depth** | The initial implementation should target highlighting only **immediate neighbors** (direct callers and direct callees). Traversal to show the full call stack (e.g., three levels deep) is a future enhancement. |
| **T27** | **Activation State** | The application must maintain a global state (e.g., isHighlightModeActive). Node clicks should **only** trigger path analysis if this state is **true**. |

#### **3.2. Visual Requirements (G12)**

| Spec ID | Requirement | Detail |
| :---- | :---- | :---- |
| **T24** | **Upstream Color** | All nodes and edges in the **Upstream Path (Callers)** must be highlighted using a primary color (e.g., **Green/Blue**). |
| **T25** | **Downstream Color** | All nodes and edges in the **Downstream Path (Callees)** must be highlighted using a distinct secondary color (e.g., **Red/Orange**). |
| **T26** | **Edge Styling** | Highlighted edges must be visually distinct (e.g., thicker line stroke, solid color) compared to unhighlighted edges. |

---

### **Next Steps**

The next development task is to implement the **T27** state management and integrate the logic for **T22** and the associated **T24/T25** visual styling into the React component's node click handler.