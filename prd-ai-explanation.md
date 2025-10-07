## **Cartographer Feature Extension PRD: AI Explanation & Caching**

### **Phase II: Intelligence and Efficiency**

This document defines the requirements for integrating AI-powered code summaries and a persistent caching layer into the Cartographer tool.

### **1\. New Goals**

| Metric | Goal | Rationale |
| :---- | :---- | :---- |
| **G4. Utility** | Generate explanations that are deemed "actionable" and "confident" by a senior developer (i.e., successfully summarizes business logic and error handling). | Ensures the feature meets the core user requirement for deep code understanding. |
| **G5. Cost-Efficiency** | Achieve a **95% cache hit rate** when running Cartographer consecutively on an **unchanged** codebase. | Directly addresses cost concerns by minimizing redundant LLM API calls. |
| **G6. Output Quality** | Successfully embed the complete AI summary into the Graphviz DOT output file for visualization as a tooltip. | Ensures the explanation is available directly on the map. |

### **2\. New Core Features**

| Feature ID | Feature Name | Description |
| :---- | :---- | :---- |
| **F5** | **AI Logic Summarization** | Use an LLM (Llama 3.1 8B Instant 128k) to generate a concise, detailed explanation of the logic, business rules, and error handling for every detected Function/Method node. |
| **F6** | **Persistent Caching Layer** | Implement a local SQLite database to store generated summaries, indexed by the code's cryptographic hash, ensuring explanations are only generated once per code change. (we will create separate sqlite db for separate projects) |

### **3\. Updated Technical Specifications**

#### **3.1. Caching Implementation (F6)**

| Spec ID | Requirement | Detail |
| :---- | :---- | :---- |
| **T4** | **Database Engine** | Use **SQLite** for local, file-based persistence. |
| **T5** | **Database Location** | The cache file must be scoped to the repository: .cartographer\_cache.db located in the analysis root directory. |
| **T6** | **Cache Keying** | The cache key for retrieval/storage must be the **SHA-256 hash** of the function's entire raw source code (signature \+ body). This ensures any change, even whitespace, invalidates the cache. |
| **T7** | **Caching Workflow** | **A.** Calculate hash  **B.** Check SQLite for hash match  **C.** Use cached explanation (HIT) or Call LLM (MISS)  **D.** Store new explanation/hash in SQLite. |

#### **3.2. AI Integration (F5)**

| Spec ID | Requirement | Detail |
| :---- | :---- | :---- |
| **T8** | **LLM Model** | Use the Llama 3.1 8B Instant 128k model for its cost-efficiency and suitability for summarization tasks. |
| **T9** | **Prompt Engineering** | The prompt must contain a strong **System Instruction** defining the LLM persona as an "Expert Go Documentation Writer." The User Prompt must include the raw source code and instructions to focus specifically on: 1\) Business Logic, 2\) Input Validation, and 3\) Error/Context Handling. |
| **T10** | **API Key Management** | The API key must be read from an environment variable (e.g., LLAMA\_API\_KEY). |
| **T11** | **Concurrency** | LLM calls must be performed concurrently (using Go Goroutines) to minimize latency impact on the overall runtime. |

#### **3.3. Output Requirement Update (F4/G6)**

| Spec ID | Requirement | Detail |
| :---- | :---- | :---- |
| **T12** | **DOT Enhancement** | The AI-generated explanation must be embedded as the tooltip attribute on the corresponding node definition in the generated DOT file. |

### 

To experiment with the AI outputs let limit it to do this for 100 nodes total and for rest of the nodes set the explanation as empty string

This is what a AI request would look like  
curl "https://api.groq.com/openai/v1/chat/completions" \\  
  \-X POST \\  
  \-H "Content-Type: application/json" \\  
  \-H "Authorization: Bearer ${GROQ\_API\_KEY}" \\  
  \-d '{  
         "messages": \[  
           {  
             "role": "system",  
             "content": "You are an expert Go developer and documentation specialist. Your primary task is to analyze raw Go function or method source code provided by the user and produce a single, concise, professional summary of its purpose and logic.\\n\\nStrict Rules:\\n1. The output MUST be a single, flat paragraph of text.\\n2. DO NOT use any markdown formatting (e.g., \#, \*\*, \*, lists).\\n3. DO NOT include any introductory or concluding phrases (e.g., \\"This function...\\", \\"In summary,\\" or \\"Here is the explanation:\\").\\n4. The output must focus solely on the logic and side effects, and be within the range of 1 to a few sentences"  
           },  
           {  
             "role": "user",  
             "content": "Analyze the following code:\\n\\nfunc greet(name string) string {\\n\\treturn \\"Hello, \\" \+ name \+ \\"\!\\"\\n}"  
           }  
         \],  
         "model": "llama-3.1-8b-instant",  
         "temperature": 1,  
         "max\_completion\_tokens": 1024,  
         "top\_p": 1,  
         "stream": true,  
         "stop": null  
       }'  
  

### **Next Steps**

The plan is clear. The immediate next development tasks are:

1. Refine the AST parsing to reliably extract and hash the **raw source code** for every function/method.  
2. Implement the SQLite cache (T4, T5, T6, T7).  
3. Implement the concurrent LLM client wrapper (T8, T10, T11) with the required prompt engineering (T9).  
4. Tie the caching and LLM logic together and update the DOT output (T12).