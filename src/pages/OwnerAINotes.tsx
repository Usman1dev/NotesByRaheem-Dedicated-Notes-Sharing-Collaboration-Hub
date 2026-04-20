import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardSidebar from '@/components/DashboardSidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAiNoteUpload } from '@/hooks/useAiNotes';
import { validateAiNoteContent, getAllCourses } from '@/services/aiNotesService';
import { AiNoteContent, InsertAiNote, ValidationResult } from '@/types/ai-notes';
import { AlertCircle, CheckCircle, Upload, FileText, Code, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/courses', icon: '📚', label: 'Courses' },
  { href: '/bookmarks', icon: '🔖', label: 'Bookmarks' },
  { href: '/upload', icon: '⬆', label: 'Upload Note' },
  { href: '/chatroom', icon: '💬', label: 'Chatroom' },
  { href: '/admin', icon: '⚙', label: 'Admin Panel' },
  { href: '/admin/pending', icon: '⏳', label: 'Pending Notes' },
  { href: '/admin/courses', icon: '🎓', label: 'Manage Courses' },
  { href: '/owner', icon: '👑', label: 'Owner Panel' },
  { href: '/owner/users', icon: '👥', label: 'Manage Users' },
  { href: '/owner/notes', icon: '📄', label: 'All Notes' },
  { href: '/owner/ai-notes', icon: '🤖', label: 'Upload AI Notes' },
];

const exampleJson = `{
  "title": "Introduction to React Hooks",
  "course": "CS101",
  "lecture": "React Fundamentals",
  "week_number": 1,
  "description": "Learn about React hooks and their usage in functional components.",
  "sections": [
    {
      "title": "What are Hooks?",
      "blocks": [
        {
          "type": "text",
          "content": "Hooks are functions that let you use state and other React features without writing a class."
        },
        {
          "type": "definition",
          "term": "useState",
          "definition": "A Hook that lets you add React state to function components."
        },
        {
          "type": "examTip",
          "tip": "Remember that hooks can only be called at the top level of your component, not inside loops, conditions, or nested functions."
        },
        {
          "type": "callout",
          "variant": "info",
          "title": "Important",
          "content": "Hooks don't work inside classes, but you can use them instead of writing classes."
        },
        {
          "type": "compare",
          "title": "Class vs Functional Components",
          "items": [
            {
              "title": "Class Components",
              "description": "Use this.setState and lifecycle methods"
            },
            {
              "title": "Functional Components with Hooks",
              "description": "Use useState, useEffect, and other hooks"
            }
          ]
        },
        {
          "type": "list",
          "items": [
            "useState - for state management",
            "useEffect - for side effects",
            "useContext - for context consumption",
            "useReducer - for complex state logic"
          ],
          "ordered": false
        }
      ]
    }
  ]
}`;

export default function OwnerAINotes() {
  const { user } = useAuth();
  const { uploadNote, uploadProgress, uploadStatus, loading, error, resetUpload } = useAiNoteUpload();
  
  const [jsonInput, setJsonInput] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [availableCourses, setAvailableCourses] = useState<{code: string, name: string}[]>([]);
  const [manualFields, setManualFields] = useState({
    title: '',
    course: '',
    lecture: '',
    week_number: 1,
    chapter_title: '',
    description: '',
  });

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Fetch courses from the courses table using the service function
        const courses = await getAllCourses();
        
        if (courses && courses.length > 0) {
          setAvailableCourses(courses);
        } else {
          // courses table exists but is empty
          toast.info('No courses found in the courses table. You can still upload notes by typing course name manually.');
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        toast.error('Failed to load courses from courses table');
      }
    };
    
    fetchCourses();
  }, []);

  const handleJsonChange = (value: string) => {
    setJsonInput(value);
    setValidationResult(null);
    setParsedJson(null);
  };

  const validateJson = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      
      // Basic top-level validation
      const missingFields = [];
      if (!parsed.title) missingFields.push('title');
      if (!parsed.course) missingFields.push('course');
      if (!parsed.lecture) missingFields.push('lecture');
      if (!parsed.sections) missingFields.push('sections');
      // week_number is optional but recommended
      if (parsed.week_number === undefined) {
        toast.info('Week number not specified. Defaulting to week 1.');
      }
      
      if (missingFields.length > 0) {
        setValidationResult({
          isValid: false,
          errors: [`Missing required fields: ${missingFields.join(', ')}`]
        });
        toast.error(`Missing required fields: ${missingFields.join(', ')}`);
        return;
      }
      
      // Validate content structure using service validation
      const contentValidation = validateAiNoteContent({
        title: parsed.title,
        description: parsed.description || '',
        sections: parsed.sections
      });
      
      if (!contentValidation.isValid) {
        setValidationResult({
          isValid: false,
          errors: contentValidation.errors
        });
        toast.error('Content validation failed');
        return;
      }
      
      setParsedJson(parsed);
      setValidationResult({
        isValid: true,
        errors: []
      });
      
      // Update manual fields for reference
      setManualFields({
        title: parsed.title || '',
        course: parsed.course || '',
        lecture: parsed.lecture || '',
        week_number: parsed.week_number || 1,
        chapter_title: parsed.lecture || '', // Use lecture as chapter_title by default
        description: parsed.description || '',
      });
      
      toast.success('JSON validated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      let userFriendlyMessage = `Invalid JSON: ${errorMessage}`;
      
      // Provide more user-friendly error messages for common JSON errors
      if (errorMessage.includes('Unexpected token')) {
        userFriendlyMessage = 'Invalid JSON syntax. Check for missing commas, brackets, or quotes.';
      } else if (errorMessage.includes('Unexpected end of JSON input')) {
        userFriendlyMessage = 'Incomplete JSON. The JSON appears to be cut off or missing closing brackets.';
      } else if (errorMessage.includes('property')) {
        userFriendlyMessage = `JSON structure error: ${errorMessage}`;
      }
      
      setValidationResult({
        isValid: false,
        errors: [userFriendlyMessage]
      });
      toast.error('Invalid JSON format');
    }
  };

  const handleUpload = async () => {
    if (!parsedJson) {
      toast.error('Please validate JSON first');
      return;
    }

    try {
      // Use manual fields to override JSON fields (title, course, week, lecture, description)
      // Manual fields are populated from JSON on validation, but user can edit them
      const title = manualFields.title.trim() || parsedJson.title;
      const course = manualFields.course.trim() || parsedJson.course;
      const lecture = manualFields.lecture.trim() || parsedJson.lecture;
      const week_number = manualFields.week_number || parsedJson.week_number || 1;
      const description = manualFields.description.trim() || parsedJson.description || '';
      
      // Validate that we have required fields
      if (!title || !course || !lecture) {
        toast.error('Title, course, and lecture are required');
        return;
      }

      // Convert to InsertAiNote structure
      const noteData: InsertAiNote = {
        title,
        lecture,
        course,
        week_number,
        chapter_title: lecture, // Use lecture as chapter_title
        content: {
          title,
          description,
          sections: parsedJson.sections // Sections always come from JSON
        }
      };

      const result = await uploadNote(noteData);
      if (result) {
        toast.success('AI Note uploaded successfully!');
        // Reset form
        setJsonInput('');
        setParsedJson(null);
        setValidationResult(null);
        resetUpload();
        setManualFields({
          title: '',
          course: '',
          lecture: '',
          week_number: 1,
          chapter_title: '',
          description: '',
        });
      }
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const loadExample = () => {
    setJsonInput(exampleJson);
    setValidationResult(null);
    setParsedJson(null);
  };

  const clearForm = () => {
    setJsonInput('');
    setValidationResult(null);
    setParsedJson(null);
    resetUpload();
    setManualFields({
      title: '',
      course: '',
      lecture: '',
      week_number: 1,
      chapter_title: '',
      description: '',
    });
  };

  return (
    <div className="flex min-h-screen bg-background relative z-[1]">
      <DashboardSidebar items={navItems} />
      
      <main className="flex-1 lg:ml-60 p-4 sm:p-8 pt-16 lg:pt-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Upload AI Notes</h1>
            <p className="text-muted-foreground mt-2">
              Upload structured AI-generated notes in JSON format. These notes will be available to all users.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left column: JSON input and validation */}
            <div className="lg:w-2/3 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    JSON Input
                  </CardTitle>
                  <CardDescription>
                    Paste your structured AI notes in JSON format. Use the example below as a reference.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="json-input">JSON Content</Label>
                    <Textarea
                      id="json-input"
                      placeholder="Paste your JSON here..."
                      value={jsonInput}
                      onChange={(e) => handleJsonChange(e.target.value)}
                      className="font-mono min-h-[200px] md:min-h-[300px]"
                      disabled={loading || uploadStatus === 'uploading'}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={validateJson} disabled={!jsonInput.trim() || loading || uploadStatus === 'uploading'}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Validate JSON
                    </Button>
                    <Button variant="outline" onClick={loadExample} disabled={loading || uploadStatus === 'uploading'}>
                      <FileText className="h-4 w-4 mr-2" />
                      Load Example
                    </Button>
                    <Button variant="outline" onClick={clearForm} disabled={loading || uploadStatus === 'uploading'}>
                      Clear
                    </Button>
                  </div>

                  {validationResult && (
                    <Alert variant={validationResult.isValid ? "default" : "destructive"}>
                      {validationResult.isValid ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertTitle>
                        {validationResult.isValid ? 'Valid JSON' : 'Validation Failed'}
                      </AlertTitle>
                      <AlertDescription>
                        {validationResult.isValid ? (
                          'Your JSON structure is valid and ready for upload.'
                        ) : (
                          <ul className="list-disc pl-4 mt-1">
                            {validationResult.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {(loading || uploadStatus === 'uploading') && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} />
                    </div>
                  )}

                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Upload Error</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    JSON Structure Reference
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Required Fields:</h4>
                      <ul className="list-disc pl-4 space-y-1 text-sm">
                        <li><code className="bg-muted px-1 rounded">title</code> - Note title</li>
                        <li><code className="bg-muted px-1 rounded">course</code> - Course code (e.g., CS101)</li>
                        <li><code className="bg-muted px-1 rounded">lecture</code> - Lecture/chapter name</li>
                        <li><code className="bg-muted px-1 rounded">week_number</code> - Week number (e.g., 1, 2, 3)</li>
                        <li><code className="bg-muted px-1 rounded">sections</code> - Array of sections with blocks</li>
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Block Types:</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <Badge variant="outline" className="justify-center text-xs py-1">text</Badge>
                        <Badge variant="outline" className="justify-center text-xs py-1">definition</Badge>
                        <Badge variant="outline" className="justify-center text-xs py-1">examTip</Badge>
                        <Badge variant="outline" className="justify-center text-xs py-1">callout</Badge>
                        <Badge variant="outline" className="justify-center text-xs py-1">compare</Badge>
                        <Badge variant="outline" className="justify-center text-xs py-1">list</Badge>
                        <Badge variant="outline" className="justify-center text-xs py-1">table</Badge>
                        <Badge variant="outline" className="justify-center text-xs py-1">steps</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right column: Preview and upload */}
            <div className="lg:w-1/3 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Note Preview</CardTitle>
                  <CardDescription>
                    Preview of the note that will be uploaded (manual fields override JSON)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {parsedJson ? (
                    <>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium">Title</Label>
                          <p className="text-sm mt-1 font-medium">
                            {manualFields.title.trim() || parsedJson.title}
                            {manualFields.title.trim() && manualFields.title.trim() !== parsedJson.title && (
                              <span className="ml-2 text-xs text-muted-foreground">(overridden)</span>
                            )}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Course</Label>
                            <p className="text-sm mt-1">
                              {manualFields.course.trim() || parsedJson.course}
                              {manualFields.course.trim() && manualFields.course.trim() !== parsedJson.course && (
                                <span className="ml-2 text-xs text-muted-foreground">(overridden)</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Lecture/Week Title</Label>
                            <p className="text-sm mt-1">
                              {manualFields.lecture.trim() || parsedJson.lecture}
                              {manualFields.lecture.trim() && manualFields.lecture.trim() !== parsedJson.lecture && (
                                <span className="ml-2 text-xs text-muted-foreground">(overridden)</span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Week Number</Label>
                            <p className="text-sm mt-1">
                              {manualFields.week_number || parsedJson.week_number || 1}
                              {(manualFields.week_number !== (parsedJson.week_number || 1)) && (
                                <span className="ml-2 text-xs text-muted-foreground">(overridden)</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Description</Label>
                            <p className="text-sm mt-1 text-muted-foreground">
                              {(manualFields.description.trim() || parsedJson.description || 'No description')}
                              {manualFields.description.trim() && manualFields.description.trim() !== (parsedJson.description || '') && (
                                <span className="ml-2 text-xs text-muted-foreground">(overridden)</span>
                              )}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Sections</Label>
                          <p className="text-sm mt-1">
                            {parsedJson.sections.length} section(s) with{' '}
                            {parsedJson.sections.reduce((total: number, section: any) => total + (section.blocks?.length || 0), 0)} blocks
                          </p>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        onClick={handleUpload}
                        disabled={loading || uploadStatus === 'uploading' || !validationResult?.isValid}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {loading || uploadStatus === 'uploading' ? 'Uploading...' : 'Upload AI Note'}
                      </Button>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Validate JSON to see preview</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Manual Fields</CardTitle>
                  <CardDescription>
                    Edit fields manually (updates JSON)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={manualFields.title}
                        onChange={(e) => setManualFields({...manualFields, title: e.target.value})}
                        placeholder="Note title"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="course">Course</Label>
                        <Select
                          value={manualFields.course}
                          onValueChange={(value) => setManualFields({...manualFields, course: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCourses.map((course) => (
                              <SelectItem key={course.code} value={course.code}>
                                {course.name} ({course.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="week_number">Week Number</Label>
                        <Input
                          id="week_number"
                          type="number"
                          min="1"
                          value={manualFields.week_number}
                          onChange={(e) => setManualFields({...manualFields, week_number: parseInt(e.target.value) || 1})}
                          placeholder="1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lecture">Lecture/Title</Label>
                      <Input
                        id="lecture"
                        value={manualFields.lecture}
                        onChange={(e) => setManualFields({...manualFields, lecture: e.target.value})}
                        placeholder="React Fundamentals"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={manualFields.description}
                        onChange={(e) => setManualFields({...manualFields, description: e.target.value})}
                        placeholder="Optional description"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Note</AlertTitle>
                <AlertDescription className="text-sm">
                  AI Notes are immediately available to all authenticated users after upload. 
                  Use the structured format for optimal rendering.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}