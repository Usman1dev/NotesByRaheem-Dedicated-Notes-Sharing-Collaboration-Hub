# AI Notes JSON Generation Prompt

## Purpose
This prompt is designed to help AI tools (like ChatGPT, Claude, etc.) generate valid JSON for the AI Notes system. The JSON must pass strict validation in the OwnerAINotes page. Use this prompt when converting lecture notes, PPTX, or PDF files into structured JSON format.

## JSON Structure Requirements

### Top-Level Structure
```json
{
  "title": "string (required)",
  "lecture": "string (required) - Use format like 'Week 1', 'Week 2', etc.",
  "course": "string (required) - Must match an existing course code from the database",
  "sections": [
    {
      "id": "string (optional, auto-generated if missing)",
      "title": "string (required)",
      "blocks": [
        // Array of block objects (see below)
      ]
    }
  ]
}
```

### Block Types and Their Structures

#### 1. Text Block
```json
{
  "type": "text",
  "content": "string (required)"
}
```

#### 2. Definition Block
```json
{
  "type": "definition",
  "term": "string (required)",
  "definition": "string (required)"
}
```

#### 3. Exam Tip Block
```json
{
  "type": "examTip",
  "content": "string (required)"  // Can also use "tip" field
}
```

#### 4. Callout Block
```json
{
  "type": "callout",
  "variant": "string (required) - Must be one of: 'info', 'warn', 'success', 'danger'",
  "title": "string (optional)",
  "content": "string (required)"
}
```

#### 5. Compare Block (Two Formats Accepted)

**Format A: Items Array (Recommended for comparing multiple items)**
```json
{
  "type": "compare",
  "items": [
    {
      "title": "string (required)",
      "description": "string (required)"
    }
  ]
}
```

**Format B: Left/Right Comparison**
```json
{
  "type": "compare",
  "left": {
    "title": "string (required)",
    "content": "string or array of strings (required)"
  },
  "right": {
    "title": "string (required)",
    "content": "string or array of strings (required)"
  }
}
```

#### 6. List Block
```json
{
  "type": "list",
  "ordered": "boolean (optional, default: false)",
  "items": [
    "string (required)",
    "string (required)",
    // ... more strings
  ]
}
```

#### 7. Table Block
```json
{
  "type": "table",
  "headers": [
    "string (required)",
    "string (required)",
    // ... more strings
  ],
  "rows": [
    [
      "string (required)",
      "string (required)",
      // ... same number of items as headers
    ]
  ]
}
```

#### 8. Steps Block (Two Formats Accepted)

**Format A: Simple Steps (Array of strings)**
```json
{
  "type": "steps",
  "items": [
    "string (required)",
    "string (required)",
    // ... more strings
  ]
}
```

**Format B: Detailed Steps (Array of objects)**
```json
{
  "type": "steps",
  "steps": [
    {
      "title": "string (required)",
      "content": "string (required)"
    }
  ]
}
```

## Validation Rules (CRITICAL - Must Pass All)

### 1. Required Fields
- `title` (string) - Must be present at root level
- `lecture` (string) - Must be present at root level (use "Week X" format)
- `course` (string) - Must be present at root level
- `sections` (array) - Must be present at root level

### 2. Sections Validation
- Each section must have a `title` (string)
- Each section must have a `blocks` array
- Each block must have a `type` (string) from the valid types list

### 3. IMPORTANT: Valid Block Types
**ONLY these 8 block types are valid:**
1. `text` - For regular text content
2. `definition` - For term-definition pairs
3. `examTip` - For exam tips and important notes
4. `callout` - For highlighted information boxes
5. `compare` - For comparison tables or side-by-side content
6. `list` - For ordered or unordered lists
7. `table` - For tabular data
8. `steps` - For step-by-step instructions

**CRITICAL WARNING: `code` is NOT a valid block type!**
- If you have code examples, use `text` blocks with the code inside
- Format code within `text` blocks using markdown-style code fences or plain text
- Example: Use `"content": "; Carry Flag Example\nMOV AL, 0FFH   ; 255 in AL\nADD AL, 01H    ; Result = 0, Carry = 1"` in a `text` block

### 3. Block Type-Specific Rules

#### Text Block:
- Must have `content` (string)

#### Definition Block:
- Must have `term` (string)
- Must have `definition` (string)

#### Exam Tip Block:
- Must have either `content` or `tip` (string)

#### Callout Block:
- Must have `variant` (string) - one of: "info", "warn", "success", "danger"
- Must have `content` (string)

#### Compare Block:
- Must have either `items` array OR `left` and `right` objects
- If using `items` array: each item must have `title` and `description` (strings)
- If using `left`/`right`: each must have `title` (string) and `content` (string or array of strings)

#### List Block:
- Must have `items` array (non-empty)
- Each item must be a string

#### Table Block:
- Must have `headers` array (non-empty, all strings)
- Must have `rows` array
- Each row must be an array with same length as headers
- Each cell must be a string

#### Steps Block:
- Must have either `steps` array of objects OR `items` array of strings
- If using `steps` array: each step must have `title` and `content` (strings)
- If using `items` array: each item must be a string

## Common Validation Errors to Avoid

1. **Missing required fields**: Ensure all required fields are present
2. **Wrong data types**: Strings must be strings, arrays must be arrays
3. **Empty arrays**: Some arrays cannot be empty (items, headers, rows)
4. **Invalid variant values**: Callout variant must be one of: "info", "warn", "success", "danger"
5. **Mismatched array lengths**: Table rows must match headers length
6. **Unknown block types**: Only use the 8 valid block types: `text`, `definition`, `examTip`, `callout`, `compare`, `list`, `table`, `steps`
   - **CRITICAL**: `code` is NOT a valid block type! Use `text` blocks for code examples
7. **Missing content in blocks**: Each block type has specific content requirements

## Best Practices for AI Generation

### 1. Structure Lecture Content
- Break content into logical sections (each with a clear title)
- Use appropriate block types for different content:
  - Definitions → `definition` blocks
  - Important tips → `examTip` blocks
  - Warnings/notes → `callout` blocks
  - Comparisons → `compare` blocks
  - Lists → `list` blocks
  - Step-by-step instructions → `steps` blocks
  - Tables → `table` blocks
  - Regular text and code examples → `text` blocks
    - **Important**: Code examples should be placed in `text` blocks, NOT in `code` blocks
    - Format code within `text` blocks using plain text or markdown-style code fences

### 2. Course and Lecture Fields
- For `course`: Use the exact course code from the database (e.g., "CS101", "MATH201")
- For `lecture`: Use "Week X" format (e.g., "Week 1", "Week 2") for week-based organization

### 3. Section Organization
- Start with a course information section
- Group related concepts together in sections
- Use clear, descriptive section titles
- Include 3-10 blocks per section (not too many, not too few)

### 4. Content Quality
- Keep text concise but informative
- Use proper formatting within strings (line breaks, bullet points as needed)
- Ensure definitions are accurate and complete
- Make exam tips actionable and relevant

## Example JSON (Minimal Valid Structure)

```json
{
  "title": "Introduction to Computer Science",
  "lecture": "Week 1",
  "course": "CS101",
  "sections": [
    {
      "id": "course-overview",
      "title": "Course Overview",
      "blocks": [
        {
          "type": "text",
          "content": "Welcome to Computer Science 101. This course covers fundamental concepts."
        },
        {
          "type": "definition",
          "term": "Algorithm",
          "definition": "A step-by-step procedure for solving a problem or accomplishing a task."
        },
        {
          "type": "examTip",
          "content": "Focus on understanding algorithms rather than memorizing code syntax."
        }
      ]
    }
  ]
}
```

## Instructions for AI Tool

When given lecture notes, PPTX, or PDF content:

1. **Analyze the content** and identify the main topics/sections
2. **Extract the course name** and match it to a database course code
3. **Determine the week number** from the content or context
4. **Structure the content** into sections with appropriate titles
5. **Convert content elements** to the appropriate block types
6. **Validate the JSON** against the rules above before outputting
7. **Output only the JSON** without additional commentary

## Testing the Generated JSON

After generating JSON, test it by:
1. Pasting into the OwnerAINotes page JSON input field
2. Clicking "Validate JSON" button
3. Ensuring no validation errors appear
4. If errors appear, fix them based on the error messages

## Troubleshooting Common Issues

If validation fails:

1. **"Content must have a title string"** → Add a `title` field at root level
2. **"Section X must have a title string"** → Add `title` to each section
3. **"Block must have a type string"** → Ensure each block has a `type` field
4. **"Unknown block type"** → Check spelling of block type (must be lowercase)
5. **"Must have content string"** → Add `content` field to the block
6. **"Array cannot be empty"** → Ensure arrays have at least one item
7. **"Variant must be one of: info, warn, success, danger"** → Fix callout variant value

By following this prompt carefully, you should generate JSON that passes all validation checks and can be successfully uploaded to the AI Notes system.