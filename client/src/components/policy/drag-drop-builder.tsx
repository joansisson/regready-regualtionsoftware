import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  FileText, 
  Shield, 
  Users, 
  Database, 
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  BookOpen
} from "lucide-react";

interface PolicySection {
  id: string;
  type: 'header' | 'paragraph' | 'list' | 'table' | 'requirement' | 'definition';
  title: string;
  content: string;
  items?: string[];
  priority?: 'low' | 'medium' | 'high' | 'critical';
  framework?: string[];
}

interface DragDropBuilderProps {
  onPolicyGenerate: (sections: PolicySection[]) => void;
  initialSections?: PolicySection[];
}

const sectionTemplates = [
  {
    type: 'header' as const,
    icon: FileText,
    title: 'Section Header',
    description: 'Main section divider with title',
    template: {
      id: '',
      type: 'header' as const,
      title: 'New Section',
      content: '',
    }
  },
  {
    type: 'paragraph' as const,
    icon: BookOpen,
    title: 'Text Content',
    description: 'General policy text and descriptions',
    template: {
      id: '',
      type: 'paragraph' as const,
      title: 'Policy Statement',
      content: 'Enter your policy content here...',
    }
  },
  {
    type: 'requirement' as const,
    icon: Shield,
    title: 'Compliance Requirement',
    description: 'Specific compliance rules and requirements',
    template: {
      id: '',
      type: 'requirement' as const,
      title: 'Requirement',
      content: 'This requirement ensures...',
      priority: 'medium' as const,
      framework: ['gdpr']
    }
  },
  {
    type: 'list' as const,
    icon: CheckCircle,
    title: 'Bullet List',
    description: 'Organized list of items or procedures',
    template: {
      id: '',
      type: 'list' as const,
      title: 'Procedures',
      content: '',
      items: ['First procedure', 'Second procedure', 'Third procedure']
    }
  },
  {
    type: 'definition' as const,
    icon: Database,
    title: 'Definition',
    description: 'Key terms and definitions',
    template: {
      id: '',
      type: 'definition' as const,
      title: 'Term Definition',
      content: 'Definition of the term...',
    }
  },
  {
    type: 'table' as const,
    icon: Settings,
    title: 'Data Table',
    description: 'Structured data in table format',
    template: {
      id: '',
      type: 'table' as const,
      title: 'Data Classification',
      content: 'Category | Description | Security Level\nPublic | Non-sensitive data | Low\nInternal | Company data | Medium\nConfidential | Sensitive data | High',
    }
  }
];

const priorityConfig = {
  low: { color: 'bg-blue-100 text-blue-800', icon: Clock },
  medium: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  high: { color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
  critical: { color: 'bg-red-100 text-red-800', icon: AlertTriangle }
};

const frameworkColors = {
  gdpr: 'bg-blue-100 text-blue-800',
  soc2: 'bg-green-100 text-green-800',
  'eu-ai-act': 'bg-purple-100 text-purple-800'
};

export default function DragDropBuilder({ onPolicyGenerate, initialSections = [] }: DragDropBuilderProps) {
  const [sections, setSections] = useState<PolicySection[]>(initialSections);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const generateId = () => `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addSection = useCallback((template: typeof sectionTemplates[0]) => {
    const newSection: PolicySection = {
      ...template.template,
      id: generateId()
    };
    setSections(prev => [...prev, newSection]);
  }, []);

  const updateSection = useCallback((id: string, updates: Partial<PolicySection>) => {
    setSections(prev => prev.map(section => 
      section.id === id ? { ...section, ...updates } : section
    ));
  }, []);

  const removeSection = useCallback((id: string) => {
    setSections(prev => prev.filter(section => section.id !== id));
  }, []);

  const moveSection = useCallback((fromIndex: number, toIndex: number) => {
    setSections(prev => {
      const newSections = [...prev];
      const [movedSection] = newSections.splice(fromIndex, 1);
      newSections.splice(toIndex, 0, movedSection);
      return newSections;
    });
  }, []);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      moveSection(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const addListItem = (sectionId: string) => {
    updateSection(sectionId, {
      items: [...(sections.find(s => s.id === sectionId)?.items || []), 'New item']
    });
  };

  const updateListItem = (sectionId: string, itemIndex: number, value: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (section?.items) {
      const newItems = [...section.items];
      newItems[itemIndex] = value;
      updateSection(sectionId, { items: newItems });
    }
  };

  const removeListItem = (sectionId: string, itemIndex: number) => {
    const section = sections.find(s => s.id === sectionId);
    if (section?.items) {
      const newItems = section.items.filter((_, i) => i !== itemIndex);
      updateSection(sectionId, { items: newItems });
    }
  };

  const generatePolicy = () => {
    onPolicyGenerate(sections);
  };

  const renderSectionEditor = (section: PolicySection) => {
    const PriorityIcon = section.priority ? priorityConfig[section.priority].icon : Clock;

    return (
      <Card
        key={section.id}
        className="mb-4 border-2 border-gray-200 bg-white text-black hover:border-blue-300 transition-all duration-200"
        data-testid={`section-${section.type}-${section.id}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="cursor-grab active:cursor-grabbing p-1 hover:bg-neutral-100 rounded"
                draggable
                onDragStart={() => handleDragStart(sections.findIndex(s => s.id === section.id))}
                onDragEnd={handleDragEnd}
                data-testid={`drag-handle-${section.id}`}
              >
                <GripVertical className="h-4 w-4 text-neutral-400" />
              </div>
              <Input
                value={section.title}
                onChange={(e) => updateSection(section.id, { title: e.target.value })}
                className="font-semibold border-none p-0 h-auto bg-transparent text-black focus-visible:ring-0 placeholder:text-gray-500"
                placeholder="Section title..."
                data-testid={`section-title-${section.id}`}
              />
            </div>
            <div className="flex items-center gap-2">
              {section.priority && (
                <Badge className={priorityConfig[section.priority].color}>
                  <PriorityIcon className="w-3 h-3 mr-1" />
                  {section.priority}
                </Badge>
              )}
              {section.framework?.map(fw => (
                <Badge key={fw} className={frameworkColors[fw as keyof typeof frameworkColors] || 'bg-neutral-100'}>
                  {fw.toUpperCase()}
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSection(section.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                data-testid={`remove-section-${section.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {section.type === 'list' ? (
            <div className="space-y-2">
              {section.items?.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-neutral-500">•</span>
                  <Input
                    value={item}
                    onChange={(e) => updateListItem(section.id, index, e.target.value)}
                    className="flex-1 bg-white text-black border-gray-300 placeholder:text-gray-500 focus-visible:ring-black"
                    placeholder="List item..."
                    data-testid={`list-item-${section.id}-${index}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeListItem(section.id, index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => addListItem(section.id)}
                className="mt-2"
                data-testid={`add-list-item-${section.id}`}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            </div>
          ) : (
            <Textarea
              value={section.content}
              onChange={(e) => updateSection(section.id, { content: e.target.value })}
              placeholder={`Enter ${section.type} content...`}
              className="min-h-[100px] resize-y bg-white text-black border-gray-300 placeholder:text-gray-500 focus-visible:ring-black"
              data-testid={`section-content-${section.id}`}
            />
          )}
          
          {section.type === 'requirement' && (
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Priority Level</label>
                <Select
                  value={section.priority || 'medium'}
                  onValueChange={(value) => updateSection(section.id, { priority: value as any })}
                >
                  <SelectTrigger data-testid={`priority-select-${section.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Compliance Framework</label>
                <Select
                  value={section.framework?.[0] || 'gdpr'}
                  onValueChange={(value) => updateSection(section.id, { framework: [value] })}
                >
                  <SelectTrigger data-testid={`framework-select-${section.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gdpr">GDPR</SelectItem>
                    <SelectItem value="soc2">SOC 2</SelectItem>
                    <SelectItem value="eu-ai-act">EU AI Act</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Section Templates Palette */}
        <Card className="bg-white text-black border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-black">
            <Plus className="h-5 w-5" />
            Policy Components
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {sectionTemplates.map((template) => {
              const Icon = template.icon;
              return (
                <Button
                  key={template.type}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start gap-2 hover:border-blue-300 hover:bg-blue-50"
                  onClick={() => addSection(template)}
                  data-testid={`add-${template.type}-section`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">{template.title}</span>
                  </div>
                  <p className="text-xs text-neutral-600 text-left">{template.description}</p>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Policy Builder Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Policy Structure</h3>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-sm">
              {sections.length} sections
            </Badge>
            <Button
              onClick={generatePolicy}
              disabled={sections.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="generate-policy-button"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Policy
            </Button>
          </div>
        </div>

        {sections.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-300 bg-white text-black">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-neutral-400 mb-4" />
              <h3 className="text-lg font-medium text-neutral-600 mb-2">Start Building Your Policy</h3>
              <p className="text-neutral-500 mb-4">Add sections from the components above to create your compliance document</p>
              <Button
                variant="outline"
                onClick={() => addSection(sectionTemplates[0])}
                data-testid="add-first-section"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Section
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div 
            className="space-y-4"
            onDragOver={(e) => e.preventDefault()}
          >
            {sections.map((section, index) => (
              <div
                key={section.id}
                onDragOver={(e) => handleDragOver(e, index)}
                className={`transition-all duration-200 ${
                  draggedIndex === index ? 'opacity-50 scale-95' : ''
                }`}
              >
                {renderSectionEditor(section)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
