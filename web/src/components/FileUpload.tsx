import { useState, ChangeEvent, DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface FileUploadProps {
  onFileContent: (content: string) => void;
}

export default function FileUpload({ onFileContent }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [textInput, setTextInput] = useState('');

  const handleFile = (file: File) => {
    if (file && file.name.endsWith('.dot')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          onFileContent(result);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      onFileContent(textInput);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardContent className="p-8">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="text-muted-foreground">
                <p className="text-lg font-medium">Upload DOT File</p>
                <p className="text-sm">Drag and drop your .dot file here, or click to browse</p>
              </div>
              <input
                type="file"
                accept=".dot"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <Button asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  Choose File
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Text Input */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <Label htmlFor="dot-content" className="text-lg font-medium">
            Or Paste DOT Content
          </Label>
          <Textarea
            id="dot-content"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Paste your DOT file content here..."
            className="min-h-32"
          />
          <Button 
            onClick={handleTextSubmit}
            disabled={!textInput.trim()}
            className="w-full"
            variant="secondary"
          >
            Load Graph
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
