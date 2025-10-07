package main

import (
	"bytes"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"go/ast"
	"go/format"
	"go/parser"
	"go/token"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type Function struct {
	Name        string
	Receiver    string
	Package     string
	SourceCode  string
	Hash        string
	Explanation string
}

type CallGraph struct {
	Functions map[string]*Function
	Calls     map[string][]string
}

type Cache struct {
	db *sql.DB
}

type LLMRequest struct {
	Messages []Message `json:"messages"`
	Model    string    `json:"model"`
	Temperature float64 `json:"temperature"`
	MaxTokens int      `json:"max_completion_tokens"`
	TopP     float64   `json:"top_p"`
	Stream   bool      `json:"stream"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type LLMResponse struct {
	Choices []Choice `json:"choices"`
}

type Choice struct {
	Message Message `json:"message"`
}

var (
	batchSize = 16
	batchDelay = time.Second
)

func main() {
	var dir string
	flag.StringVar(&dir, "dir", ".", "directory to analyze")
	flag.Parse()

	cg := &CallGraph{
		Functions: make(map[string]*Function),
		Calls:     make(map[string][]string),
	}

	cache, err := initCache(dir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Cache init error: %v\n", err)
		os.Exit(1)
	}
	defer cache.Close()

	err = analyzeDirectory(dir, cg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	err = generateExplanations(cg, cache)
	if err != nil {
		fmt.Fprintf(os.Stderr, "AI error: %v\n", err)
		os.Exit(1)
	}

	outputDOT(cg)
}

func initCache(dir string) (*Cache, error) {
	dbPath := filepath.Join(dir, ".cartographer_cache.db")
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS explanations (
			hash TEXT PRIMARY KEY,
			explanation TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return nil, err
	}

	return &Cache{db: db}, nil
}

func (c *Cache) Get(hash string) (string, bool) {
	var explanation string
	err := c.db.QueryRow("SELECT explanation FROM explanations WHERE hash = ?", hash).Scan(&explanation)
	if err != nil {
		return "", false
	}
	return explanation, true
}

func (c *Cache) Set(hash, explanation string) error {
	_, err := c.db.Exec("INSERT OR REPLACE INTO explanations (hash, explanation) VALUES (?, ?)", hash, explanation)
	return err
}

func (c *Cache) Close() error {
	return c.db.Close()
}

func hashSourceCode(code string) string {
	h := sha256.Sum256([]byte(code))
	return hex.EncodeToString(h[:])
}

func analyzeDirectory(dir string, cg *CallGraph) error {
	return filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !strings.HasSuffix(path, ".go") ||
			strings.HasSuffix(path, "_test.go") ||
			strings.Contains(path, "vendor/") {
			return nil
		}

		return analyzeFile(path, cg)
	})
}

func analyzeFile(filename string, cg *CallGraph) error {
	fset := token.NewFileSet()
	node, err := parser.ParseFile(fset, filename, nil, parser.ParseComments)
	if err != nil {
		return err
	}

	visitor := &astVisitor{
		cg:          cg,
		pkg:         node.Name.Name,
		current:     "",
		currentType: "",
		fset:        fset,
		src:         nil,
	}

	// Read source file for extracting raw code
	src, err := os.ReadFile(filename)
	if err != nil {
		return err
	}
	visitor.src = src

	ast.Walk(visitor, node)
	return nil
}

type astVisitor struct {
	cg          *CallGraph
	pkg         string
	current     string
	currentType string
	fset        *token.FileSet
	src         []byte
}

func (v *astVisitor) Visit(node ast.Node) ast.Visitor {
	switch n := node.(type) {
	case *ast.FuncDecl:
		funcName := v.getFunctionName(n)
		receiver := v.getReceiver(n)
		
		// Extract raw source code
		sourceCode := v.extractSourceCode(n)
		hash := hashSourceCode(sourceCode)

		v.cg.Functions[funcName] = &Function{
			Name:        n.Name.Name,
			Receiver:    receiver,
			Package:     v.pkg,
			SourceCode:  sourceCode,
			Hash:        hash,
			Explanation: "",
		}
		v.current = funcName
		v.currentType = receiver
		return v

	case *ast.CallExpr:
		if v.current != "" {
			if callee := v.getCallTarget(n); callee != "" {
				v.cg.Calls[v.current] = append(v.cg.Calls[v.current], callee)
			}
		}
		return v
	}
	return v
}

func (v *astVisitor) extractSourceCode(fn *ast.FuncDecl) string {
	start := v.fset.Position(fn.Pos()).Offset
	end := v.fset.Position(fn.End()).Offset
	
	if start >= 0 && end <= len(v.src) && start < end {
		return string(v.src[start:end])
	}
	
	// Fallback: use go/format
	var buf bytes.Buffer
	format.Node(&buf, v.fset, fn)
	return buf.String()
}

func (v *astVisitor) getFunctionName(fn *ast.FuncDecl) string {
	if fn.Recv != nil && len(fn.Recv.List) > 0 {
		receiver := v.getReceiver(fn)
		return receiver + "." + fn.Name.Name
	}
	return v.pkg + "." + fn.Name.Name
}

func (v *astVisitor) getReceiver(fn *ast.FuncDecl) string {
	if fn.Recv == nil || len(fn.Recv.List) == 0 {
		return ""
	}

	field := fn.Recv.List[0]
	switch t := field.Type.(type) {
	case *ast.StarExpr:
		if ident, ok := t.X.(*ast.Ident); ok {
			return ident.Name
		}
	case *ast.Ident:
		return t.Name
	}
	return ""
}

func (v *astVisitor) getCallTarget(call *ast.CallExpr) string {
	switch fun := call.Fun.(type) {
	case *ast.Ident:
		return v.pkg + "." + fun.Name
	case *ast.SelectorExpr:
		switch x := fun.X.(type) {
		case *ast.Ident:
			if v.currentType != "" && (x.Name == "u" || x.Name == "d" || x.Name == "s" || len(x.Name) == 1) {
				return v.currentType + "." + fun.Sel.Name
			}
			// Method call on variable (e.g., cache.Get, db.Save)
			// Try to infer type from variable name
			varType := inferTypeFromVarName(x.Name)
			if varType != "" {
				return varType + "." + fun.Sel.Name
			}
			return x.Name + "." + fun.Sel.Name
		case *ast.SelectorExpr:
			if ident, ok := x.X.(*ast.Ident); ok {
				if v.currentType != "" && (ident.Name == "u" || ident.Name == "d" || ident.Name == "s" || len(ident.Name) == 1) {
					fieldType := strings.Title(x.Sel.Name)
					return fieldType + "." + fun.Sel.Name
				}
			}
		}
	}
	return ""
}

func inferTypeFromVarName(varName string) string {
	// Simple heuristics to infer type from variable name
	typeMap := map[string]string{
		"cache":   "Cache",
		"db":      "Database",
		"client":  "HTTPClient",
		"service": "Service",
		"repo":    "Repository",
		"fset":    "FileSet",
		"visitor": "astVisitor",
	}
	
	if t, exists := typeMap[varName]; exists {
		return t
	}
	
	// Capitalize first letter as fallback
	if len(varName) > 0 {
		return strings.Title(varName)
	}
	
	return ""
}

func generateExplanations(cg *CallGraph, cache *Cache) error {
	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		fmt.Fprintf(os.Stderr, "Warning: GROQ_API_KEY not set, skipping AI explanations\n")
		return nil
	}

	// Collect functions that need explanations
	var functionsToProcess []*Function
	for _, fn := range cg.Functions {
		if explanation, found := cache.Get(fn.Hash); found {
			fn.Explanation = explanation
		} else {
			functionsToProcess = append(functionsToProcess, fn)
		}
	}

	if len(functionsToProcess) == 0 {
		return nil
	}

	// Process in batches with rate limiting
	for i := 0; i < len(functionsToProcess); i += batchSize {
		batchStart := time.Now()
		end := i + batchSize
		if end > len(functionsToProcess) {
			end = len(functionsToProcess)
		}
		
		batch := functionsToProcess[i:end]
		var wg sync.WaitGroup
		
		for _, fn := range batch {
			wg.Add(1)
			go func(fn *Function) {
				defer wg.Done()
				
				explanation, err := callLLM(apiKey, fn.SourceCode)
				if err != nil {
					fmt.Fprintf(os.Stderr, "LLM error for %s: %v\n", fn.Name, err)
					fn.Explanation = ""
					return
				}
				
				fn.Explanation = explanation
				cache.Set(fn.Hash, explanation)
			}(fn)
		}
		
		wg.Wait()
		
		// Wait for 1 second from batch start before next batch
		elapsed := time.Since(batchStart)
		if elapsed < batchDelay {
			time.Sleep(batchDelay - elapsed)
		}
	}

	return nil
}

func callLLM(apiKey, sourceCode string) (string, error) {
	systemPrompt := `You are an expert Go developer and documentation specialist. Your primary task is to analyze raw Go function or method source code provided by the user and produce a single, concise, professional summary of its purpose and logic.

Strict Rules:
1. The output MUST be a single, flat paragraph of text.
2. DO NOT use any markdown formatting (e.g., #, **, *, lists).
3. DO NOT include any introductory or concluding phrases (e.g., "This function...", "In summary," or "Here is the explanation:").
4. The output must focus solely on the logic and side effects, and be within the range of 1 to a few sentences`

	userPrompt := fmt.Sprintf("Analyze the following code:\n\n%s", sourceCode)

	req := LLMRequest{
		Messages: []Message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Model:       "llama-3.1-8b-instant",
		Temperature: 1,
		MaxTokens:   1024,
		TopP:        1,
		Stream:      false,
	}

	jsonData, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	httpReq, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("API error %d: %s", resp.StatusCode, string(body))
	}

	var llmResp LLMResponse
	err = json.Unmarshal(body, &llmResp)
	if err != nil {
		return "", err
	}

	if len(llmResp.Choices) == 0 {
		return "", fmt.Errorf("no response from LLM")
	}

	return strings.TrimSpace(llmResp.Choices[0].Message.Content), nil
}

func outputDOT(cg *CallGraph) {
	fmt.Println("digraph G {")
	fmt.Println("  rankdir=LR;")
	fmt.Println("  node [shape=box];")

	// Output nodes with tooltips
	for name, fn := range cg.Functions {
		tooltip := strings.ReplaceAll(fn.Explanation, "\"", "\\\"")
		if tooltip != "" {
			fmt.Printf("  \"%s\" [tooltip=\"%s\"];\n", name, tooltip)
		} else {
			fmt.Printf("  \"%s\";\n", name)
		}
	}

	// Output edges
	for caller, callees := range cg.Calls {
		for _, callee := range callees {
			if _, exists := cg.Functions[callee]; exists {
				fmt.Printf("  \"%s\" -> \"%s\";\n", caller, callee)
			}
		}
	}

	fmt.Println("}")
}
