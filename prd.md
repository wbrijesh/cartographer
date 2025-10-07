## **Cartographer PRD**

### **1\. Goal**

The primary goal is to generate a visual dependency map of a Go service using the **Cartographer** tool to simplify comprehension, analysis, and refactoring planning. The map must detail the **call relationships between individual functions and methods**.

### **2\. Core Features (MVP)**

| Feature | Description |
| :---- | :---- |
| **F1: Fine-Grained Nodes** | Identify and represent every defined **Function** and **Method** in the codebase as a graph node. Methods must be labeled with their receiver type (e.g., UserService.Create). |
| **F2: Dependency Edges** | Draw a directed edge from a **calling function/method** to a **called function/method** for every internal invocation detected. |
| **F3: Filtering** | Automatically exclude boilerplate (e.g., vendor, \_test.go files) to focus the graph on core application logic. |
| **F4: Graph Output** | Output the resulting structure as a **Graphviz DOT file** to standard output (stdout), allowing for visualization with external tools (e.g., dot \-Tpng). |

### **3\. Technical Specifications (MVP)**

| Spec | Requirement |
| :---- | :---- |
| **Language/Tooling** | Go (Golang) |
| **Parsing Engine** | Utilize Go standard library packages: **go/parser** and **go/ast** (Abstract Syntax Tree). *Explicitly avoid implementing a full gopls LSP client for this MVP.* |
| **Input** | Target directory (defaulting to current directory .). |
| **Performance** | Must process the repository and generate the DOT output in a matter of seconds (under 2s). |

