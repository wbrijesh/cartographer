## **Cartographer Feature Extension PRD: Interactive Web Visualization**

### **Phase III: User Experience and Visualization**

This document defines the requirements for creating an interactive web front-end for the Cartographer tool, transforming the static DOT output into a dynamic and searchable graph visualization.  
---

### **1\. New Goals**

| Metric | Goal | Rationale |
| :---- | :---- | :---- |
| **G7. Interactivity** | Provide developers with an ability to zoom, pan, and rearrange the graph layout. | Static DOT images quickly become unwieldy for large graphs; interactivity is essential for usability. |
| **G8. Data Access** | Present the AI-generated explanations instantly upon interaction (e.g., hover). | Maximizes the utility of the AI features (F5) by integrating the summary directly into the visualization context (T12). |
| **G9. Accessibility** | Ensure the UI is responsive and usable on standard desktop and laptop screens, supporting complex graph viewing. | The primary user base will be viewing this on development screens. |
| **G10. Ease of Input** | Provide a file upload mechanism for DOT files, simplifying the input process compared to copy/pasting large text blocks. | Improves user experience for handling the output of the Cartographer CLI tool. |

---

### **2\. New Core Features**

| Feature ID | Feature Name | Description |
| :---- | :---- | :---- |
| **F7** | **Interactive Graph Renderer** | A web interface capable of loading the DOT file content and rendering its nodes and edges into an interactive, pan-and-zoom environment. |
| **F8** | **Tooltip Explanation Display** | Implement a custom node renderer where the AI explanation text (sourced from the DOT tooltip attribute) is displayed instantly when the user hovers the mouse cursor over a function/method node. |
| **F9** | **DOT File Input Interface** | A clear, dedicated interface supporting **text pasting** *and* a **file upload option** for .dot files, reading the content client-side. |

---

### **3\. Updated Technical Specifications**

#### **3.1. Front-End Architecture (F7, F9)**

| Spec ID | Requirement | Detail |
| :---- | :---- | :---- |
| **T13** | **Technology Stack** | Implement the front-end using **React** (targeting a Next.js project structure). |
| **T14** | **Visualization Library** | Use a dedicated graph visualization library (e.g., **React Flow**) capable of handling large, complex, directed graphs with custom node and edge styling. |
| **T15** | **Input Processing** | **All logic** for converting DOT  React Flow JSON (nodes, edges) must be performed **client-side**. There is no server-side dependency on the Go tool. |
| **T20** | **File Upload Handler** | Implement an input handler that accepts a .dot file, reads the file contents as a string, and automatically feeds the content to the client-side parser (T15). |
| **T16** | **Styling** | Use Tailwind CSS for rapid, responsive UI development, ensuring a clean, modern aesthetic appropriate for a developer tool. |

#### **3.2. Interaction Details (F8)**

| Spec ID | Requirement | Detail |
| :---- | :---- | :---- |
| **T17** | **Explanation Trigger** | The AI explanation display must be triggered on the standard onMouseEnter event on the graph node. |
| **T18** | **Explanation Content** | The tooltip must use the text stored in the DOT file's tooltip attribute (which contains the Llama 3.1 summary, as per **T12**). |
| **T19** | **Design** | The tooltip must be visually distinct (e.g., dark background, high-contrast text) and must not obstruct neighboring nodes or links. |

---

### **Next Steps**

The next development task is to implement the Next.js application, focusing on the file upload and client-side DOT parsing to successfully render the interactive graph using React Flow.